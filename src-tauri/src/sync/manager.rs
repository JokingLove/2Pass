use crate::sync::oss::OssSyncProvider;
use crate::sync::traits::{SyncProvider, SyncResult};
use std::collections::HashMap;
use std::sync::Arc;

/// 同步管理器 - 管理所有同步提供者
pub struct SyncManager {
    providers: HashMap<String, Arc<dyn SyncProvider>>,
}

impl SyncManager {
    pub fn new() -> Self {
        let mut providers: HashMap<String, Arc<dyn SyncProvider>> = HashMap::new();
        
        // 注册 OSS 同步提供者
        providers.insert("oss".to_string(), Arc::new(OssSyncProvider::new()));
        
        // 未来可以在这里注册更多提供者：
        // providers.insert("github".to_string(), Arc::new(GithubSyncProvider::new()));
        // providers.insert("webdav".to_string(), Arc::new(WebDavSyncProvider::new()));

        Self { providers }
    }

    /// 获取同步提供者
    pub fn get_provider(&self, name: &str) -> Option<&Arc<dyn SyncProvider>> {
        self.providers.get(name)
    }

    /// 列出所有可用的同步提供者
    pub fn list_providers(&self) -> Vec<String> {
        self.providers.keys().cloned().collect()
    }

    /// 测试连接
    pub fn test_connection(&self, provider_name: &str, config: &str) -> Result<(), String> {
        let provider = self
            .get_provider(provider_name)
            .ok_or_else(|| format!("Provider '{}' not found", provider_name))?;
        provider.test_connection(config)
    }

    /// 上传数据
    pub fn upload(&self, provider_name: &str, data: &[u8], config: &str) -> Result<SyncResult, String> {
        let provider = self
            .get_provider(provider_name)
            .ok_or_else(|| format!("Provider '{}' not found", provider_name))?;
        provider.upload(data, config)
    }

    /// 下载数据
    pub fn download(&self, provider_name: &str, config: &str) -> Result<Vec<u8>, String> {
        let provider = self
            .get_provider(provider_name)
            .ok_or_else(|| format!("Provider '{}' not found", provider_name))?;
        provider.download(config)
    }

    /// 检查更新
    pub fn check_update(&self, provider_name: &str, local_version: i64, config: &str) -> Result<bool, String> {
        let provider = self
            .get_provider(provider_name)
            .ok_or_else(|| format!("Provider '{}' not found", provider_name))?;
        provider.check_update(local_version, config)
    }

    /// 获取远程版本
    pub fn get_remote_version(&self, provider_name: &str, config: &str) -> Result<Option<i64>, String> {
        let provider = self
            .get_provider(provider_name)
            .ok_or_else(|| format!("Provider '{}' not found", provider_name))?;
        provider.get_remote_version(config)
    }
}

impl Default for SyncManager {
    fn default() -> Self {
        Self::new()
    }
}

