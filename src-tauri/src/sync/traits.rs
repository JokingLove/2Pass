use serde::{Deserialize, Serialize};

/// 同步结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub success: bool,
    pub message: String,
    pub version: Option<i64>,
    pub timestamp: Option<i64>,
}

/// 同步状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SyncStatus {
    Idle,           // 空闲
    Syncing,        // 同步中
    Success,        // 成功
    Error(String),  // 错误
    Conflict,       // 冲突
}

/// 同步配置（加密存储）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConfig {
    pub provider: String,  // "oss", "github", "webdav"
    pub enabled: bool,
    pub config_data: String, // JSON 字符串，包含具体配置（已加密）
}

/// 同步提供者 Trait - 插件化接口
pub trait SyncProvider: Send + Sync {
    /// 获取提供者名称
    fn name(&self) -> &str;

    /// 测试连接
    fn test_connection(&self, config: &str) -> Result<(), String>;

    /// 上传数据
    fn upload(&self, data: &[u8], config: &str) -> Result<SyncResult, String>;

    /// 下载数据
    fn download(&self, config: &str) -> Result<Vec<u8>, String>;

    /// 获取远程版本号
    fn get_remote_version(&self, config: &str) -> Result<Option<i64>, String>;

    /// 检查是否有更新
    fn check_update(&self, local_version: i64, config: &str) -> Result<bool, String>;
}

