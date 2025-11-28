use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub db_path: Option<String>,
    pub theme: Option<String>,
    pub language: Option<String>,
    pub auto_lock_timeout: Option<u64>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            db_path: None,
            theme: Some("default".to_string()),
            language: Some("zh-CN".to_string()),
            auto_lock_timeout: Some(0),
        }
    }
}

pub struct ConfigManager {
    config_path: PathBuf,
}

impl ConfigManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        let config_dir = app_handle
            .path()
            .app_config_dir()
            .unwrap_or_else(|_| std::env::temp_dir().join("2pass"));

        if let Err(e) = fs::create_dir_all(&config_dir) {
            eprintln!("Failed to create config directory: {}", e);
        }

        let config_path = config_dir.join("config.json");
        Self { config_path }
    }

    pub fn load_config(&self) -> AppConfig {
        if self.config_path.exists() {
            match fs::read_to_string(&self.config_path) {
                Ok(content) => match serde_json::from_str(&content) {
                    Ok(config) => return config,
                    Err(e) => eprintln!("Failed to parse config: {}", e),
                },
                Err(e) => eprintln!("Failed to read config file: {}", e),
            }
        }

        // Return default if not exists or error
        AppConfig::default()
    }

    pub fn save_config(&self, config: &AppConfig) -> Result<(), String> {
        let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
        fs::write(&self.config_path, content).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_config_path(&self) -> PathBuf {
        self.config_path.clone()
    }
}
