use crate::sync::traits::{SyncProvider, SyncResult};
use base64::{engine::general_purpose, Engine as _};
use chrono::Utc;
use hmac::{Hmac, Mac};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha1::Sha1;
use std::collections::HashMap;

type HmacSha1 = Hmac<Sha1>;

/// OSS 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OssConfig {
    pub provider: String,        // "aliyun" 或 "tencent"
    pub endpoint: String,        // OSS endpoint
    pub bucket: String,          // 存储桶名称
    pub access_key_id: String,   // AccessKey ID
    pub access_key_secret: String, // AccessKey Secret
    pub region: Option<String>,  // 区域（可选）
    pub path: String,           // 存储路径，如 "2pass/data.json"
}

/// OSS 同步提供者
pub struct OssSyncProvider {
    client: Client,
}

impl OssSyncProvider {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    /// 解析配置
    fn parse_config(&self, config_json: &str) -> Result<OssConfig, String> {
        serde_json::from_str(config_json)
            .map_err(|e| format!("Failed to parse OSS config: {}", e))
    }

    /// 生成 OSS 签名（阿里云）
    fn generate_aliyun_signature(
        &self,
        method: &str,
        bucket: &str,
        path: &str,
        access_key_secret: &str,
        headers: &HashMap<String, String>,
    ) -> String {
        let date = Utc::now().format("%a, %d %b %Y %H:%M:%S GMT").to_string();
        let content_md5 = "";
        let content_type = "application/json";

        // 构建 CanonicalizedResource
        let canonicalized_resource = format!("/{}/{}", bucket, path);

        // 构建 CanonicalizedHeaders
        let mut canonicalized_headers = String::new();
        let mut sorted_headers: Vec<_> = headers.iter().collect();
        sorted_headers.sort_by_key(|(k, _)| k.to_lowercase());
        for (key, value) in sorted_headers {
            let key_lower = key.to_lowercase();
            if key_lower.starts_with("x-oss-") {
                canonicalized_headers.push_str(&format!("{}:{}\n", key_lower, value.trim()));
            }
        }

        // 构建 StringToSign
        let string_to_sign = format!(
            "{}\n{}\n{}\n{}\n{}{}",
            method, date, content_md5, content_type, canonicalized_headers, canonicalized_resource
        );

        // 计算签名
        let mut mac = HmacSha1::new_from_slice(access_key_secret.as_bytes())
            .expect("HMAC can take key of any size");
        mac.update(string_to_sign.as_bytes());
        let signature = general_purpose::STANDARD.encode(mac.finalize().into_bytes());

        format!("OSS {}:{}", "", signature)
    }

    /// 上传到阿里云 OSS
    async fn upload_to_aliyun(
        &self,
        data: &[u8],
        config: &OssConfig,
    ) -> Result<SyncResult, String> {
        let url = if config.endpoint.starts_with("http") {
            format!("{}/{}/{}", config.endpoint, config.bucket, config.path)
        } else {
            format!("https://{}.{}/{}", config.bucket, config.endpoint, config.path)
        };

        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        let date = Utc::now().format("%a, %d %b %Y %H:%M:%S GMT").to_string();
        headers.insert("Date".to_string(), date.clone());

        let authorization = self.generate_aliyun_signature(
            "PUT",
            &config.bucket,
            &config.path,
            &config.access_key_secret,
            &headers,
        );

        let response = self
            .client
            .put(&url)
            .header("Authorization", authorization)
            .header("Date", date)
            .header("Content-Type", "application/json")
            .body(data.to_vec())
            .send()
            .await
            .map_err(|e| format!("Upload failed: {}", e))?;

        if response.status().is_success() {
            let version = Utc::now().timestamp();
            Ok(SyncResult {
                success: true,
                message: "Upload successful".to_string(),
                version: Some(version),
                timestamp: Some(version),
            })
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            Err(format!("Upload failed: {} - {}", status, error_text))
        }
    }

    /// 从阿里云 OSS 下载
    async fn download_from_aliyun(
        &self,
        config: &OssConfig,
    ) -> Result<Vec<u8>, String> {
        let url = if config.endpoint.starts_with("http") {
            format!("{}/{}/{}", config.endpoint, config.bucket, config.path)
        } else {
            format!("https://{}.{}/{}", config.bucket, config.endpoint, config.path)
        };

        let mut headers = HashMap::new();
        let date = Utc::now().format("%a, %d %b %Y %H:%M:%S GMT").to_string();
        headers.insert("Date".to_string(), date.clone());

        let authorization = self.generate_aliyun_signature(
            "GET",
            &config.bucket,
            &config.path,
            &config.access_key_secret,
            &headers,
        );

        let response = self
            .client
            .get(&url)
            .header("Authorization", authorization)
            .header("Date", date)
            .send()
            .await
            .map_err(|e| format!("Download failed: {}", e))?;

        if response.status().is_success() {
            response
                .bytes()
                .await
                .map(|b| b.to_vec())
                .map_err(|e| format!("Failed to read response: {}", e))
        } else if response.status() == 404 {
            Err("File not found on server".to_string())
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            Err(format!("Download failed: {} - {}", status, error_text))
        }
    }

    /// 生成腾讯云 COS 签名
    fn generate_tencent_signature(
        &self,
        method: &str,
        path: &str,
        access_key_secret: &str,
        secret_id: &str,
    ) -> String {
        // 腾讯云 COS 使用更简单的签名方式
        // 这里使用 HMAC-SHA1
        let date = Utc::now().timestamp();
        let expire_time = date + 3600; // 1小时过期

        let sign_string = format!("{}/{}/{}", method, path, expire_time);
        let mut mac = HmacSha1::new_from_slice(access_key_secret.as_bytes())
            .expect("HMAC can take key of any size");
        mac.update(sign_string.as_bytes());
        let signature = general_purpose::STANDARD.encode(mac.finalize().into_bytes());

        format!("q-sign-algorithm=sha1&q-ak={}&q-sign-time={};{}&q-key-time={};{}&q-header-list=&q-url-param-list=&q-signature={}",
            secret_id, date, expire_time, date, expire_time, signature)
    }

    /// 上传到腾讯云 COS
    async fn upload_to_tencent(
        &self,
        data: &[u8],
        config: &OssConfig,
    ) -> Result<SyncResult, String> {
        let url = format!("https://{}.cos.{}.myqcloud.com/{}", 
            config.bucket, 
            config.region.as_deref().unwrap_or("ap-beijing"),
            config.path
        );

        let authorization = self.generate_tencent_signature(
            "put",
            &config.path,
            &config.access_key_secret,
            &config.access_key_id,
        );

        let response = self
            .client
            .put(&url)
            .header("Authorization", authorization)
            .header("Content-Type", "application/json")
            .body(data.to_vec())
            .send()
            .await
            .map_err(|e| format!("Upload failed: {}", e))?;

        if response.status().is_success() {
            let version = Utc::now().timestamp();
            Ok(SyncResult {
                success: true,
                message: "Upload successful".to_string(),
                version: Some(version),
                timestamp: Some(version),
            })
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            Err(format!("Upload failed: {} - {}", status, error_text))
        }
    }

    /// 从腾讯云 COS 下载
    async fn download_from_tencent(
        &self,
        config: &OssConfig,
    ) -> Result<Vec<u8>, String> {
        let url = format!("https://{}.cos.{}.myqcloud.com/{}", 
            config.bucket, 
            config.region.as_deref().unwrap_or("ap-beijing"),
            config.path
        );

        let authorization = self.generate_tencent_signature(
            "get",
            &config.path,
            &config.access_key_secret,
            &config.access_key_id,
        );

        let response = self
            .client
            .get(&url)
            .header("Authorization", authorization)
            .send()
            .await
            .map_err(|e| format!("Download failed: {}", e))?;

        if response.status().is_success() {
            response
                .bytes()
                .await
                .map(|b| b.to_vec())
                .map_err(|e| format!("Failed to read response: {}", e))
        } else if response.status() == 404 {
            Err("File not found on server".to_string())
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            Err(format!("Download failed: {} - {}", status, error_text))
        }
    }

    /// 测试阿里云 OSS 连接
    async fn test_aliyun_connection(&self, config: &OssConfig) -> Result<(), String> {
        let url = if config.endpoint.starts_with("http") {
            format!("{}/{}/{}", config.endpoint, config.bucket, config.path)
        } else {
            format!("https://{}.{}/{}", config.bucket, config.endpoint, config.path)
        };

        let mut headers = HashMap::new();
        let date = Utc::now().format("%a, %d %b %Y %H:%M:%S GMT").to_string();
        headers.insert("Date".to_string(), date.clone());

        let authorization = self.generate_aliyun_signature(
            "HEAD",
            &config.bucket,
            &config.path,
            &config.access_key_secret,
            &headers,
        );

        let response = self
            .client
            .head(&url)
            .header("Authorization", authorization)
            .header("Date", date)
            .send()
            .await
            .map_err(|e| format!("连接失败: {}", e))?;

        if response.status().is_success() || response.status() == 404 {
            // 404 也表示连接成功，只是文件不存在
            Ok(())
        } else {
            Err(format!("连接失败: HTTP {}", response.status()))
        }
    }

    /// 测试腾讯云 COS 连接
    async fn test_tencent_connection(&self, config: &OssConfig) -> Result<(), String> {
        let url = format!("https://{}.cos.{}.myqcloud.com/{}", 
            config.bucket, 
            config.region.as_deref().unwrap_or("ap-beijing"),
            config.path
        );

        let authorization = self.generate_tencent_signature(
            "head",
            &config.path,
            &config.access_key_secret,
            &config.access_key_id,
        );

        let response = self
            .client
            .head(&url)
            .header("Authorization", authorization)
            .send()
            .await
            .map_err(|e| format!("连接失败: {}", e))?;

        if response.status().is_success() || response.status() == 404 {
            // 404 也表示连接成功，只是文件不存在
            Ok(())
        } else {
            Err(format!("连接失败: HTTP {}", response.status()))
        }
    }
}

impl SyncProvider for OssSyncProvider {
    fn name(&self) -> &str {
        "oss"
    }

    fn test_connection(&self, config: &str) -> Result<(), String> {
        // 解析配置
        let oss_config = self.parse_config(config)?;
        
        // 验证必填字段
        if oss_config.endpoint.is_empty() {
            return Err("Endpoint 不能为空".to_string());
        }
        if oss_config.bucket.is_empty() {
            return Err("Bucket 不能为空".to_string());
        }
        if oss_config.access_key_id.is_empty() {
            return Err("AccessKey ID 不能为空".to_string());
        }
        if oss_config.access_key_secret.is_empty() {
            return Err("AccessKey Secret 不能为空".to_string());
        }
        if oss_config.path.is_empty() {
            return Err("存储路径不能为空".to_string());
        }
        
        // 真正测试连接：尝试获取远程版本号（HEAD 请求或尝试下载）
        // 使用 tokio runtime 执行异步操作
        let rt = tokio::runtime::Runtime::new()
            .map_err(|e| format!("Failed to create runtime: {}", e))?;

        // 尝试执行一个轻量级的操作来验证连接
        match oss_config.provider.as_str() {
            "aliyun" => {
                // 尝试 HEAD 请求检查文件是否存在
                rt.block_on(self.test_aliyun_connection(&oss_config))
            }
            "tencent" => {
                // 尝试 HEAD 请求检查文件是否存在
                rt.block_on(self.test_tencent_connection(&oss_config))
            }
            _ => Err("Unsupported OSS provider".to_string()),
        }
    }

    fn upload(&self, data: &[u8], config: &str) -> Result<SyncResult, String> {
        let oss_config = self.parse_config(config)?;
        
        // 使用 tokio runtime 执行异步操作
        let rt = tokio::runtime::Runtime::new()
            .map_err(|e| format!("Failed to create runtime: {}", e))?;

        match oss_config.provider.as_str() {
            "aliyun" => rt.block_on(self.upload_to_aliyun(data, &oss_config)),
            "tencent" => rt.block_on(self.upload_to_tencent(data, &oss_config)),
            _ => Err("Unsupported OSS provider".to_string()),
        }
    }

    fn download(&self, config: &str) -> Result<Vec<u8>, String> {
        let oss_config = self.parse_config(config)?;
        
        let rt = tokio::runtime::Runtime::new()
            .map_err(|e| format!("Failed to create runtime: {}", e))?;

        match oss_config.provider.as_str() {
            "aliyun" => rt.block_on(self.download_from_aliyun(&oss_config)),
            "tencent" => rt.block_on(self.download_from_tencent(&oss_config)),
            _ => Err("Unsupported OSS provider".to_string()),
        }
    }

    fn get_remote_version(&self, config: &str) -> Result<Option<i64>, String> {
        // 简化实现：尝试下载文件，如果成功则返回当前时间戳作为版本
        match self.download(config) {
            Ok(_) => Ok(Some(Utc::now().timestamp())),
            Err(e) if e.contains("not found") => Ok(None),
            Err(e) => Err(e),
        }
    }

    fn check_update(&self, local_version: i64, config: &str) -> Result<bool, String> {
        match self.get_remote_version(config)? {
            Some(remote_version) => Ok(remote_version > local_version),
            None => Ok(false),
        }
    }
}

impl Default for OssSyncProvider {
    fn default() -> Self {
        Self::new()
    }
}

