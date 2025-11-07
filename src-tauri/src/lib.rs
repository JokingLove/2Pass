use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::SaltString;
use base64::{engine::general_purpose, Engine as _};
use data_encoding::{BASE32, BASE32_NOPAD};
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasswordEntry {
    pub id: String,
    pub title: String,
    pub username: String,
    pub password: String,
    pub url: String,
    pub notes: String,
    pub totp_secret: Option<String>, // TOTP secret in base32 format
    pub tags: Option<Vec<String>>, // 标签列表
    pub sort_order: Option<i64>, // 排序顺序
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct StorageData {
    master_password_hash: String,
    encrypted_data: String,
    nonce: String,
}

struct AppState {
    data_file: PathBuf,
    entries: Vec<PasswordEntry>,
    encryption_key: Option<Vec<u8>>,
}

impl AppState {
    fn new() -> Self {
        let data_file = Self::get_data_file_path();
        Self {
            data_file,
            entries: Vec::new(),
            encryption_key: None,
        }
    }

    fn get_data_file_path() -> PathBuf {
        if let Some(proj_dirs) = ProjectDirs::from("com", "2pass", "2pass") {
            let data_dir = proj_dirs.data_dir();
            fs::create_dir_all(data_dir).ok();
            data_dir.join("data.json")
        } else {
            PathBuf::from("data.json")
        }
    }
}

fn derive_key(master_password: &str) -> Vec<u8> {
    let argon2 = Argon2::default();
    let salt = b"2pass_fixed_salt_change_in_prod";
    let mut key = vec![0u8; 32];
    argon2
        .hash_password_into(
            master_password.as_bytes(),
            salt,
            &mut key,
        )
        .unwrap();
    key
}

fn encrypt_data(data: &str, key: &[u8]) -> Result<(String, String), String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let nonce_bytes = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce_bytes, data.as_bytes())
        .map_err(|e| e.to_string())?;

    Ok((
        general_purpose::STANDARD.encode(ciphertext),
        general_purpose::STANDARD.encode(nonce_bytes),
    ))
}

fn decrypt_data(encrypted: &str, nonce_str: &str, key: &[u8]) -> Result<String, String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let ciphertext = general_purpose::STANDARD
        .decode(encrypted)
        .map_err(|e| e.to_string())?;
    let nonce_bytes = general_purpose::STANDARD
        .decode(nonce_str)
        .map_err(|e| e.to_string())?;
    
    if nonce_bytes.len() != 12 {
        return Err("Invalid nonce size".to_string());
    }
    
    #[allow(deprecated)]
    let nonce = Nonce::from_slice(&nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|e| e.to_string())?;

    String::from_utf8(plaintext).map_err(|e| e.to_string())
}

#[tauri::command]
fn check_master_password_exists(state: tauri::State<Mutex<AppState>>) -> bool {
    let app_state = state.lock().unwrap();
    app_state.data_file.exists()
}

#[tauri::command]
fn create_master_password(
    master_password: String,
    state: tauri::State<Mutex<AppState>>,
) -> Result<(), String> {
    let argon2 = Argon2::default();
    let salt = SaltString::generate(&mut OsRng);
    let password_hash = argon2
        .hash_password(master_password.as_bytes(), &salt)
        .map_err(|e| e.to_string())?
        .to_string();

    let key = derive_key(&master_password);
    let empty_entries = serde_json::to_string(&Vec::<PasswordEntry>::new()).unwrap();
    let (encrypted_data, nonce) = encrypt_data(&empty_entries, &key)?;

    let storage_data = StorageData {
        master_password_hash: password_hash,
        encrypted_data,
        nonce,
    };

    let mut app_state = state.lock().unwrap();
    fs::write(
        &app_state.data_file,
        serde_json::to_string(&storage_data).unwrap(),
    )
    .map_err(|e| e.to_string())?;

    app_state.encryption_key = Some(key);
    app_state.entries = Vec::new();

    Ok(())
}

#[tauri::command]
fn verify_master_password(
    master_password: String,
    state: tauri::State<Mutex<AppState>>,
) -> Result<bool, String> {
    let mut app_state = state.lock().unwrap();
    
    let data = fs::read_to_string(&app_state.data_file).map_err(|e| e.to_string())?;
    let storage_data: StorageData = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    let parsed_hash =
        PasswordHash::new(&storage_data.master_password_hash).map_err(|e| e.to_string())?;

    let argon2 = Argon2::default();
    if argon2
        .verify_password(master_password.as_bytes(), &parsed_hash)
        .is_ok()
    {
        let key = derive_key(&master_password);
        let decrypted = decrypt_data(&storage_data.encrypted_data, &storage_data.nonce, &key)?;
        let entries: Vec<PasswordEntry> = serde_json::from_str(&decrypted).unwrap_or_default();

        app_state.encryption_key = Some(key);
        app_state.entries = entries;

        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
fn get_all_entries(state: tauri::State<Mutex<AppState>>) -> Result<Vec<PasswordEntry>, String> {
    let app_state = state.lock().unwrap();
    if app_state.encryption_key.is_none() {
        return Err("Not authenticated".to_string());
    }
    Ok(app_state.entries.clone())
}

#[tauri::command]
fn add_entry(
    entry: PasswordEntry,
    state: tauri::State<Mutex<AppState>>,
) -> Result<PasswordEntry, String> {
    let mut app_state = state.lock().unwrap();
    if app_state.encryption_key.is_none() {
        return Err("Not authenticated".to_string());
    }

    app_state.entries.push(entry.clone());
    save_entries(&mut app_state)?;

    Ok(entry)
}

#[tauri::command]
fn update_entry(
    entry: PasswordEntry,
    state: tauri::State<Mutex<AppState>>,
) -> Result<(), String> {
    let mut app_state = state.lock().unwrap();
    if app_state.encryption_key.is_none() {
        return Err("Not authenticated".to_string());
    }

    if let Some(pos) = app_state.entries.iter().position(|e| e.id == entry.id) {
        app_state.entries[pos] = entry;
        save_entries(&mut app_state)?;
        Ok(())
    } else {
        Err("Entry not found".to_string())
    }
}

#[tauri::command]
fn delete_entry(id: String, state: tauri::State<Mutex<AppState>>) -> Result<(), String> {
    let mut app_state = state.lock().unwrap();
    if app_state.encryption_key.is_none() {
        return Err("Not authenticated".to_string());
    }

    app_state.entries.retain(|e| e.id != id);
    save_entries(&mut app_state)?;

    Ok(())
}

#[tauri::command]
fn change_master_password(
    old_password: String,
    new_password: String,
    state: tauri::State<Mutex<AppState>>,
) -> Result<(), String> {
    let mut app_state = state.lock().unwrap();

    // 读取当前存储数据
    let data = fs::read_to_string(&app_state.data_file).map_err(|e| e.to_string())?;
    let storage_data: StorageData = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    // 验证旧密码
    let parsed_hash =
        PasswordHash::new(&storage_data.master_password_hash).map_err(|e| e.to_string())?;
    let argon2 = Argon2::default();
    
    if argon2
        .verify_password(old_password.as_bytes(), &parsed_hash)
        .is_err()
    {
        return Err("旧密码错误".to_string());
    }

    // 用旧密码解密当前数据
    let old_key = derive_key(&old_password);
    let decrypted = decrypt_data(
        &storage_data.encrypted_data,
        &storage_data.nonce,
        &old_key,
    )?;
    let entries: Vec<PasswordEntry> = serde_json::from_str(&decrypted).unwrap_or_default();

    // 生成新密码的哈希
    let salt = SaltString::generate(&mut OsRng);
    let new_password_hash = argon2
        .hash_password(new_password.as_bytes(), &salt)
        .map_err(|e| e.to_string())?
        .to_string();

    // 用新密码重新加密数据
    let new_key = derive_key(&new_password);
    let entries_json = serde_json::to_string(&entries).unwrap();
    let (encrypted_data, nonce) = encrypt_data(&entries_json, &new_key)?;

    // 保存新的数据
    let new_storage_data = StorageData {
        master_password_hash: new_password_hash,
        encrypted_data,
        nonce,
    };

    fs::write(
        &app_state.data_file,
        serde_json::to_string(&new_storage_data).unwrap(),
    )
    .map_err(|e| e.to_string())?;

    // 更新内存中的加密密钥
    app_state.encryption_key = Some(new_key);
    app_state.entries = entries;

    Ok(())
}

fn save_entries(app_state: &mut AppState) -> Result<(), String> {
    let key = app_state
        .encryption_key
        .as_ref()
        .ok_or("No encryption key")?;

    let entries_json = serde_json::to_string(&app_state.entries).unwrap();
    let (encrypted_data, nonce) = encrypt_data(&entries_json, key)?;

    let data = fs::read_to_string(&app_state.data_file).map_err(|e| e.to_string())?;
    let mut storage_data: StorageData = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    storage_data.encrypted_data = encrypted_data;
    storage_data.nonce = nonce;

    fs::write(
        &app_state.data_file,
        serde_json::to_string(&storage_data).unwrap(),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn generate_totp(secret: String) -> Result<String, String> {
    // Log the input for debugging
    println!("TOTP input secret: {:?}", secret);
    println!("Secret length: {}", secret.len());
    
    // Remove any whitespace and padding characters, convert to uppercase
    let clean_secret = secret
        .replace(" ", "")
        .replace("=", "")
        .to_uppercase();
    
    println!("Cleaned secret: {:?}", clean_secret);
    println!("Cleaned length: {}", clean_secret.len());
    
    // Validate Base32 characters
    for (i, c) in clean_secret.chars().enumerate() {
        if !c.is_ascii_uppercase() && !('2'..='7').contains(&c) {
            return Err(format!(
                "Invalid character '{}' at position {}. Base32 only allows A-Z and 2-7. Your secret: '{}'", 
                c, i, clean_secret
            ));
        }
    }
    
    // Try to decode base32 secret
    // First try without padding (most common for TOTP)
    let secret_bytes = BASE32_NOPAD
        .decode(clean_secret.as_bytes())
        .or_else(|e1| {
            println!("NOPAD decode failed: {:?}", e1);
            // If that fails, try adding padding
            let padded = add_base32_padding(&clean_secret);
            println!("Trying with padding: {:?}", padded);
            BASE32.decode(padded.as_bytes())
                .map_err(|e2| format!("Both decode attempts failed. NOPAD: {:?}, PADDED: {:?}", e1, e2))
        })
        .map_err(|e| format!("Invalid TOTP secret format: {}. Secret must be Base32 encoded (A-Z, 2-7).", e))?;

    if secret_bytes.is_empty() {
        return Err("TOTP secret is empty".to_string());
    }

    println!("Successfully decoded {} bytes", secret_bytes.len());

    // Get current timestamp
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("System time error: {}", e))?
        .as_secs();

    // Generate TOTP (6 digits, 30 second period)
    let totp = totp_lite::totp_custom::<totp_lite::Sha1>(30, 6, &secret_bytes, timestamp);

    Ok(format!("{:06}", totp))
}

// Helper function to add Base32 padding if needed
fn add_base32_padding(s: &str) -> String {
    let remainder = s.len() % 8;
    if remainder == 0 {
        s.to_string()
    } else {
        let padding_needed = 8 - remainder;
        format!("{}{}", s, "=".repeat(padding_needed))
    }
}

#[tauri::command]
fn generate_totp_secret() -> String {
    // Generate 20 random bytes (160 bits) for TOTP secret
    let mut secret = vec![0u8; 20];
    use rand::RngCore;
    rand::thread_rng().fill_bytes(&mut secret);
    
    // Encode to base32 with padding (standard format)
    // 20 bytes = 160 bits, Base32 encodes 5 bits per character
    // 160 / 5 = 32 characters, padded to 40 with '='
    let encoded = BASE32.encode(&secret);
    
    // println!("Generated TOTP secret: {:?}", encoded);
    // println!("Secret length: {}", encoded.len());
    
    encoded
}

#[tauri::command]
fn get_totp_qr_url(secret: String, account_name: String, issuer: String) -> String {
    // Remove padding for the QR code URL (standard practice)
    let clean_secret = secret.replace("=", "");
    
    format!(
        "otpauth://totp/{}:{}?secret={}&issuer={}",
        urlencoding::encode(&issuer),
        urlencoding::encode(&account_name),
        clean_secret,
        urlencoding::encode(&issuer)
    )
}

#[tauri::command]
fn export_data(state: tauri::State<Mutex<AppState>>) -> Result<String, String> {
    let app_state = state.lock().unwrap();
    if app_state.encryption_key.is_none() {
        return Err("Not authenticated".to_string());
    }

    // 读取加密的数据文件内容
    let data = fs::read_to_string(&app_state.data_file).map_err(|e| e.to_string())?;
    
    Ok(data)
}

#[derive(Debug, Deserialize)]
struct ChromePasswordEntry {
    name: String,
    url: String,
    username: String,
    password: String,
}

#[tauri::command]
fn import_chrome_csv(csv_content: String, state: tauri::State<Mutex<AppState>>) -> Result<usize, String> {
    let mut app_state = state.lock().unwrap();
    if app_state.encryption_key.is_none() {
        return Err("Not authenticated".to_string());
    }

    let mut reader = csv::Reader::from_reader(csv_content.as_bytes());
    let mut imported_count = 0;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;

    for result in reader.deserialize() {
        let chrome_entry: ChromePasswordEntry = result.map_err(|e| e.to_string())?;
        
        let entry = PasswordEntry {
            id: uuid::Uuid::new_v4().to_string(),
            title: chrome_entry.name,
            username: chrome_entry.username,
            password: chrome_entry.password,
            url: chrome_entry.url,
            notes: String::from("从 Chrome 导入"),
            totp_secret: None,
            tags: Some(vec![String::from("Chrome")]),
            sort_order: Some((app_state.entries.len() + imported_count) as i64),
            created_at: now,
            updated_at: now,
        };

        app_state.entries.push(entry);
        imported_count += 1;
    }

    save_entries(&mut app_state)?;

    Ok(imported_count)
}

#[tauri::command]
fn import_encrypted_data(
    encrypted_json: String,
    password: String,
    state: tauri::State<Mutex<AppState>>,
) -> Result<usize, String> {
    let mut app_state = state.lock().unwrap();
    if app_state.encryption_key.is_none() {
        return Err("Not authenticated".to_string());
    }

    // 解析导入的JSON
    let import_data: StorageData = serde_json::from_str(&encrypted_json)
        .map_err(|e| format!("导入文件格式错误: {}", e))?;

    // 验证密码
    let parsed_hash = PasswordHash::new(&import_data.master_password_hash)
        .map_err(|e| format!("密码哈希无效: {}", e))?;
    
    let argon2 = Argon2::default();
    if argon2.verify_password(password.as_bytes(), &parsed_hash).is_err() {
        return Err("导入文件的密码错误".to_string());
    }

    // 解密数据
    let key = derive_key(&password);
    let decrypted = decrypt_data(&import_data.encrypted_data, &import_data.nonce, &key)?;
    let import_entries: Vec<PasswordEntry> = serde_json::from_str(&decrypted)
        .map_err(|e| format!("数据解密失败: {}", e))?;

    // 合并到现有数据（避免ID冲突）
    let existing_ids: std::collections::HashSet<String> = 
        app_state.entries.iter().map(|e| e.id.clone()).collect();
    
    let mut imported_count = 0;
    for mut entry in import_entries {
        if !existing_ids.contains(&entry.id) {
            entry.sort_order = Some((app_state.entries.len() + imported_count) as i64);
            app_state.entries.push(entry);
            imported_count += 1;
        }
    }

    save_entries(&mut app_state)?;

    Ok(imported_count)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(AppState::new()))
        .invoke_handler(tauri::generate_handler![
            check_master_password_exists,
            create_master_password,
            verify_master_password,
            get_all_entries,
            add_entry,
            update_entry,
            delete_entry,
            change_master_password,
            generate_totp,
            generate_totp_secret,
            get_totp_qr_url,
            export_data,
            import_chrome_csv,
            import_encrypted_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
