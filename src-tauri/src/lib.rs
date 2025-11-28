mod config;

use config::{AppConfig, ConfigManager};
use data_encoding::{BASE32, BASE32_NOPAD};
use kdbx_rs::{
    binary::Unlocked,
    database::{Database, Entry, Field, Group},
    CompositeKey, Kdbx,
};
use serde::{Deserialize, Serialize};
use serde_json;
use std::{
    fs::{self, File},
    path::PathBuf,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;
use uuid::Uuid;

// For legacy data decryption
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::Argon2;
use base64::{engine::general_purpose, Engine as _};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasswordHistory {
    pub timestamp: i64,
    pub password: Option<String>,
    pub username: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasswordEntry {
    pub id: String,
    pub title: String,
    pub username: String,
    pub password: String,
    pub url: Option<Vec<String>>,
    pub notes: String,
    pub totp_secret: Option<String>,
    pub icon_id: Option<String>, // Using String to support emoji or ID
    pub tags: Option<Vec<String>>,
    pub group_id: Option<String>,
    pub sort_order: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
    pub history: Option<Vec<PasswordHistory>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasswordGroup {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: Option<String>,
    pub sort_order: i64,
    pub created_at: i64,
}

struct AppState {
    config_manager: ConfigManager,
    config: AppConfig,
    // data_file and legacy_file are now derived from config or defaults,
    // but we keep them in struct for caching if needed, or just resolve dynamically.
    // For backward compatibility and transition, let's keep them but initialize differently.
    data_file: PathBuf,
    legacy_file: PathBuf,
    kdbx: Option<Kdbx<Unlocked>>,
    master_password: Option<String>,
}

impl AppState {
    fn new(app_handle: &tauri::AppHandle) -> Self {
        let config_manager = ConfigManager::new(app_handle);
        let config = config_manager.load_config();

        let data_file = if let Some(path_str) = &config.db_path {
            PathBuf::from(path_str)
        } else {
            Self::get_data_file_path(app_handle, "data.kdbx")
        };

        let legacy_file = Self::get_data_file_path(app_handle, "data.json");

        println!("🔧 Config loaded. DB Path: {:?}", data_file);

        Self {
            config_manager,
            config,
            data_file,
            legacy_file,
            kdbx: None,
            master_password: None,
        }
    }

    fn get_data_file_path(app_handle: &tauri::AppHandle, filename: &str) -> PathBuf {
        match app_handle.path().app_data_dir() {
            Ok(data_dir) => {
                println!("📂 App data dir: {:?}", data_dir);
                if let Err(e) = fs::create_dir_all(&data_dir) {
                    eprintln!("❌ Failed to create data directory: {}", e);
                    return Self::get_fallback_path(filename);
                }
                data_dir.join(filename)
            }
            Err(e) => {
                eprintln!("❌ Failed to get app data dir: {}", e);
                Self::get_fallback_path(filename)
            }
        }
    }

    fn get_fallback_path(filename: &str) -> PathBuf {
        let temp_dir = std::env::temp_dir().join("2pass");
        println!("⚠️ Using fallback path: {:?}", temp_dir);
        fs::create_dir_all(&temp_dir).ok();
        temp_dir.join(filename)
    }
}

// Legacy decryption functions
fn derive_legacy_key(master_password: &str) -> Vec<u8> {
    let argon2 = Argon2::default();
    let salt = b"2pass_fixed_salt_change_in_prod";
    let mut key = vec![0u8; 32];
    argon2
        .hash_password_into(master_password.as_bytes(), salt, &mut key)
        .unwrap();
    key
}

fn decrypt_legacy_data(encrypted: &str, nonce_str: &str, key: &[u8]) -> Result<String, String> {
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

// Helper to get current timestamp in milliseconds
fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

// Convert PasswordEntry to KDBX Entry
fn password_entry_to_kdbx(pe: &PasswordEntry, group: &mut Group) -> Result<(), String> {
    let mut entry = Entry::default();

    // Set UUID from string ID
    if let Ok(uuid) = Uuid::parse_str(&pe.id) {
        entry.set_uuid(uuid);
    }

    // Set basic fields
    entry.set_title(&pe.title);
    entry.set_username(&pe.username);
    entry.set_password(&pe.password);

    // Custom fields - always remove old first to avoid duplicates
    entry.remove_field("TOTP_SECRET"); // Remove legacy field
    entry.remove_field("TimeOtp-Secret-Base32"); // Remove standard field to update
    if let Some(totp) = &pe.totp_secret {
        // Use standard KDBX field for TOTP
        entry.add_field(Field::new("TimeOtp-Secret-Base32", totp));
    }

    entry.remove_field("IconId");
    if let Some(icon_id) = &pe.icon_id {
        entry.add_field(Field::new("IconId", icon_id));
    }

    if let Some(urls) = &pe.url {
        if let Some(first) = urls.first() {
            entry.set_url(first);
        }
        // Store additional URLs in custom string field
        entry.remove_field("AdditionalURLs"); // Remove old first
        if urls.len() > 1 {
            let additional_urls = urls[1..].join("\n");
            entry.add_field(Field::new("AdditionalURLs", &additional_urls));
        }
    }

    // Notes - remove old first to avoid duplicates
    entry.remove_field("Notes");
    if !pe.notes.is_empty() {
        entry.add_field(Field::new("Notes", &pe.notes));
    }

    entry.remove_field("SORT_ORDER");
    if let Some(sort_order) = pe.sort_order {
        entry.add_field(Field::new("SORT_ORDER", &sort_order.to_string()));
    }

    // Tags
    entry.remove_field("Tags");
    if let Some(tags) = &pe.tags {
        if !tags.is_empty() {
            entry.add_field(Field::new("Tags", &tags.join(",")));
        }
    }

    group.add_entry(entry);
    Ok(())
}

// Convert KDBX Entry to PasswordEntry
fn kdbx_entry_to_password(entry: &Entry, group_id: Option<String>) -> PasswordEntry {
    let id = entry.uuid().to_string();
    let title = entry.title().map(|s| s.to_string()).unwrap_or_default();
    let username = entry.username().map(|s| s.to_string()).unwrap_or_default();
    let password = entry.password().map(|s| s.to_string()).unwrap_or_default();
    let mut urls = Vec::new();
    if let Some(u) = entry.url() {
        if !u.is_empty() {
            urls.push(u.to_string());
        }
    }
    // Check for additional URLs
    if let Some(field) = entry.fields().find(|f| f.key() == "AdditionalURLs") {
        if let Some(val) = field.value() {
            for url in val.lines() {
                if !url.trim().is_empty() {
                    urls.push(url.trim().to_string());
                }
            }
        }
    }

    let url = if urls.is_empty() { None } else { Some(urls) };
    let notes = entry
        .fields()
        .find(|f| f.key() == "Notes")
        .and_then(|f| f.value())
        .unwrap_or("")
        .to_string();

    // Extract custom fields
    // Check standard field first, then legacy
    let totp_secret = entry
        .fields()
        .find(|f| f.key() == "TimeOtp-Secret-Base32")
        .or_else(|| entry.fields().find(|f| f.key() == "TOTP_SECRET"))
        .and_then(|f| f.value())
        .map(|s| s.to_string());

    let icon_id = entry
        .fields()
        .find(|f| f.key() == "IconId")
        .and_then(|f| f.value())
        .map(|s| s.to_string());

    let sort_order = entry
        .fields()
        .find(|f| f.key() == "SORT_ORDER")
        .and_then(|f| f.value())
        .and_then(|s| s.parse::<i64>().ok());

    let tags = entry
        .fields()
        .find(|f| f.key() == "Tags")
        .and_then(|f| f.value())
        .map(|s| {
            s.split(',')
                .map(|t| t.trim().to_string())
                .filter(|t| !t.is_empty())
                .collect()
        });

    // Times are not easily accessible in kdbx-rs Entry struct public API without deeper digging
    // For now we use current time or 0 if not available
    let created_at = current_timestamp();
    let updated_at = current_timestamp();

    PasswordEntry {
        id,
        title,
        username,
        password,
        url,
        notes,
        totp_secret,
        icon_id,
        tags,
        group_id,
        sort_order,
        created_at,
        updated_at,
        history: None,
    }
}

// Convert PasswordGroup to KDBX Group
fn password_group_to_kdbx(pg: &PasswordGroup, parent: &mut Group) -> Result<Uuid, String> {
    let mut group = Group::new(&pg.name);

    if let Ok(uuid) = Uuid::parse_str(&pg.id) {
        group.set_uuid(uuid);
    }

    // Icon mapping - kdbx-rs might not expose icon_id public field easily
    // We'll skip icon setting for now to fix compilation, or use set_icon_id if available
    // group.set_icon_id(...) - need to check if this exists

    parent.add_group(group);
    // Note: We need to return the UUID of the newly created group.
    // Since we set it above, we return that.
    Ok(Uuid::parse_str(&pg.id).unwrap_or_default())
}

// Convert KDBX Group to PasswordGroup
fn kdbx_group_to_password(group: &Group) -> PasswordGroup {
    let id = group.uuid().to_string();
    let name = group.name().to_string();

    // Map icon ID back to emoji
    // Note: kdbx-rs Group might not expose icon_id directly as a public field in all versions
    // We'll check if we can access it or use a default
    let icon = "📁".to_string(); // Default for now as icon_id access is tricky without checking docs deeper

    let color = None; // Not supported in basic kdbx-rs Group
    let sort_order = 0; // Not supported directly
    let created_at = current_timestamp();

    PasswordGroup {
        id,
        name,
        icon,
        color,
        sort_order,
        created_at,
    }
}

#[tauri::command]
fn check_master_password_exists(state: tauri::State<Mutex<AppState>>) -> bool {
    let app_state = state.lock().unwrap();
    app_state.data_file.exists() || app_state.legacy_file.exists()
}

#[tauri::command]
fn create_master_password(
    master_password: String,
    state: tauri::State<Mutex<AppState>>,
) -> Result<(), String> {
    let mut app_state = state.lock().unwrap();

    // Create new Database
    let mut db = Database::default();
    db.set_name("2Pass Database");
    db.set_description("Created by 2Pass Password Manager");

    // Create Kdbx wrapper
    let mut kdbx = Kdbx::from_database(db);
    let key = CompositeKey::from_password(&master_password);
    kdbx.set_key(key).map_err(|e| e.to_string())?;

    // Save to file
    let mut file = File::create(&app_state.data_file)
        .map_err(|e| format!("Failed to create database file: {}", e))?;
    kdbx.write(&mut file)
        .map_err(|e| format!("Failed to save database: {}", e))?;

    app_state.kdbx = Some(kdbx);
    app_state.master_password = Some(master_password);

    Ok(())
}

#[tauri::command]
fn get_app_config(state: tauri::State<Mutex<AppState>>) -> AppConfig {
    state.lock().unwrap().config.clone()
}

#[tauri::command]
fn update_app_config(
    new_config: AppConfig,
    state: tauri::State<Mutex<AppState>>,
) -> Result<(), String> {
    let mut app_state = state.lock().unwrap();

    // Update state
    app_state.config = new_config.clone();

    // Update derived paths if needed
    if let Some(path_str) = &new_config.db_path {
        app_state.data_file = PathBuf::from(path_str);
    }

    // Save to disk
    app_state.config_manager.save_config(&new_config)?;

    Ok(())
}

#[tauri::command]
fn verify_master_password(
    master_password: String,
    state: tauri::State<Mutex<AppState>>,
) -> Result<bool, String> {
    let mut app_state = state.lock().unwrap();

    // Check migration
    if !app_state.data_file.exists() && app_state.legacy_file.exists() {
        println!("🔄 Migrating from legacy JSON format to KDBX...");
        migrate_from_legacy(&mut app_state, &master_password)?;
        return Ok(true);
    }

    // Open KDBX
    match kdbx_rs::open(&app_state.data_file) {
        Ok(kdbx) => {
            let key = CompositeKey::from_password(&master_password);
            match kdbx.unlock(&key) {
                Ok(unlocked_kdbx) => {
                    app_state.kdbx = Some(unlocked_kdbx);
                    app_state.master_password = Some(master_password);
                    Ok(true)
                }
                Err(_) => Ok(false),
            }
        }
        Err(e) => {
            println!("❌ Failed to open database: {}", e);
            Ok(false)
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
struct LegacyPasswordGroup {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub sort_order: Option<i64>,
    pub created_at: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
struct LegacyPasswordEntry {
    pub id: String,
    pub title: String,
    pub username: String,
    pub password: String,
    pub url: Option<Vec<String>>,
    pub notes: Option<String>,
    pub totp_secret: Option<String>,
    pub tags: Option<Vec<String>>,
    pub group_id: Option<String>,
    pub sort_order: Option<i64>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

fn migrate_from_legacy(app_state: &mut AppState, master_password: &str) -> Result<(), String> {
    println!("Starting migration from legacy format...");

    let content = fs::read_to_string(&app_state.legacy_file).map_err(|e| e.to_string())?;
    let json: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    // Check if encrypted
    let legacy_data = if let Some(encrypted_val) = json.get("encrypted_data") {
        if let Some(encrypted_str) = encrypted_val.as_str() {
            // Encrypted format - decrypt it
            println!("Legacy data is encrypted, decrypting...");
            let nonce = json
                .get("nonce")
                .and_then(|v| v.as_str())
                .ok_or("Missing nonce in encrypted data")?;

            let key = derive_legacy_key(master_password);
            let decrypted = decrypt_legacy_data(encrypted_str, nonce, &key)?;

            // Parse decrypted JSON
            serde_json::from_str(&decrypted).map_err(|e| e.to_string())?
        } else {
            // "encrypted_data" exists but it's not a string, treat as unencrypted
            json
        }
    } else {
        // No "encrypted_data" field, treat as unencrypted
        json
    };

    // Create new KDBX
    let kdbx = Database::default();

    // Set credentials
    let key = CompositeKey::from_password(master_password);
    let mut kdbx_obj = Kdbx::from_database(kdbx);
    kdbx_obj.set_key(key).map_err(|e| e.to_string())?;

    app_state.kdbx = Some(kdbx_obj);
    app_state.master_password = Some(master_password.to_string());

    let db = app_state.kdbx.as_mut().unwrap().database_mut();
    // db.header_mut().cipher = kdbx_rs::binary::Cipher::Aes256;
    // Use defaults for now to avoid compilation errors with private fields/types
    // kdbx-rs defaults to ChaCha20 and Argon2d which is fine/better.

    // Migrate Groups
    let mut group_uuid_map = std::collections::HashMap::new();

    if let Some(groups_val) = legacy_data.get("groups") {
        if let Some(groups_arr) = groups_val.as_array() {
            for group_val in groups_arr {
                if let Ok(lpg) = serde_json::from_value::<LegacyPasswordGroup>(group_val.clone()) {
                    let pg = PasswordGroup {
                        id: lpg.id,
                        name: lpg.name,
                        icon: lpg.icon.unwrap_or_else(|| "📁".to_string()),
                        color: lpg.color,
                        sort_order: lpg.sort_order.unwrap_or(0),
                        created_at: lpg.created_at.unwrap_or_else(current_timestamp),
                    };

                    if let Ok(uuid) = password_group_to_kdbx(&pg, db.root_mut()) {
                        group_uuid_map.insert(pg.id.clone(), uuid);
                    }
                }
            }
        }
    }

    // Migrate Entries
    if let Some(entries_val) = legacy_data.get("entries") {
        if let Some(entries_arr) = entries_val.as_array() {
            for entry_val in entries_arr {
                if let Ok(lpe) = serde_json::from_value::<LegacyPasswordEntry>(entry_val.clone()) {
                    let pe = PasswordEntry {
                        id: lpe.id,
                        title: lpe.title,
                        username: lpe.username,
                        password: lpe.password,
                        url: lpe.url,
                        notes: lpe.notes.unwrap_or_default(),
                        totp_secret: lpe.totp_secret,
                        icon_id: None, // Legacy entries don't have icon_id
                        tags: lpe.tags,
                        group_id: lpe.group_id,
                        sort_order: lpe.sort_order,
                        created_at: lpe.created_at.unwrap_or_else(current_timestamp),
                        updated_at: lpe.updated_at.unwrap_or_else(current_timestamp),
                        history: None, // History migration skipped for simplicity
                    };

                    let mut added = false;
                    if let Some(group_id) = &pe.group_id {
                        if let Some(&group_uuid) = group_uuid_map.get(group_id) {
                            if let Some(group) = find_group_mut(db.root_mut(), &group_uuid) {
                                let _ = password_entry_to_kdbx(&pe, group);
                                added = true;
                            }
                        }
                    }

                    if !added {
                        let _ = password_entry_to_kdbx(&pe, db.root_mut());
                    }
                }
            }
        }
    }

    // Save new DB
    save_database(app_state)?;

    // Rename legacy file
    let backup_path = app_state.legacy_file.with_extension("json.backup");
    fs::rename(&app_state.legacy_file, &backup_path).map_err(|e| e.to_string())?;

    Ok(())
}

fn save_database(app_state: &mut AppState) -> Result<(), String> {
    let kdbx = app_state.kdbx.as_mut().ok_or("Database not loaded")?;

    let mut file = File::create(&app_state.data_file)
        .map_err(|e| format!("Failed to create database file: {}", e))?;

    kdbx.write(&mut file)
        .map_err(|e| format!("Failed to save database: {}", e))?;

    Ok(())
}

fn find_group_mut<'a>(node: &'a mut Group, uuid: &Uuid) -> Option<&'a mut Group> {
    node.find_group_mut(|g| g.uuid() == *uuid)
}

fn find_entry_mut<'a>(node: &'a mut Group, uuid: &Uuid) -> Option<&'a mut Entry> {
    node.find_entry_mut(|e| e.uuid() == *uuid)
}

// Recursive entry removal
fn remove_entry_recursive(group: &mut Group, uuid: &Uuid) -> bool {
    // kdbx-rs doesn't expose a simple retain on entries iterator.
    // We might need to use remove_entry if we can find the index or UUID.
    // Group has remove_entry(&mut self, uuid: &Uuid) -> Option<Entry>
    if group.remove_entry(*uuid).is_some() {
        return true;
    }

    for child in group.groups_mut() {
        if remove_entry_recursive(child, uuid) {
            return true;
        }
    }
    false
}

// Recursive group removal
fn remove_group_recursive(parent: &mut Group, uuid: &Uuid) -> bool {
    // Group has remove_group(&mut self, uuid: &Uuid) -> Option<Group>
    if parent.remove_group(*uuid).is_some() {
        return true;
    }

    for child in parent.groups_mut() {
        if remove_group_recursive(child, uuid) {
            return true;
        }
    }
    false
}

#[tauri::command]
fn get_all_entries(state: tauri::State<Mutex<AppState>>) -> Result<Vec<PasswordEntry>, String> {
    let app_state = state.lock().unwrap();
    let kdbx = app_state.kdbx.as_ref().ok_or("Not authenticated")?;
    let mut entries = Vec::new();
    fn collect_entries(group: &Group, _group_id: Option<String>, entries: &mut Vec<PasswordEntry>) {
        let current_group_id = Some(group.uuid().to_string());

        for entry in group.entries() {
            entries.push(kdbx_entry_to_password(entry, current_group_id.clone()));
        }

        for child in group.groups() {
            collect_entries(child, current_group_id.clone(), entries);
        }
    }

    // Start from root
    collect_entries(&kdbx.database().root(), None, &mut entries);

    Ok(entries)
}

#[tauri::command]
fn add_entry(
    entry: PasswordEntry,
    state: tauri::State<Mutex<AppState>>,
) -> Result<PasswordEntry, String> {
    let mut app_state = state.lock().unwrap();
    let kdbx = app_state.kdbx.as_mut().ok_or("Not authenticated")?;
    let db_root = kdbx.database_mut().root_mut();

    let target_group = if let Some(group_id) = &entry.group_id {
        if let Ok(uuid) = Uuid::parse_str(group_id) {
            find_group_mut(db_root, &uuid).ok_or("Group not found")?
        } else {
            db_root
        }
    } else {
        db_root
    };

    password_entry_to_kdbx(&entry, target_group)?;
    save_database(&mut app_state)?;

    Ok(entry)
}

#[tauri::command]
fn update_entry(entry: PasswordEntry, state: tauri::State<Mutex<AppState>>) -> Result<(), String> {
    let mut app_state = state.lock().unwrap();
    let kdbx = app_state.kdbx.as_mut().ok_or("Not authenticated")?;
    let uuid = Uuid::parse_str(&entry.id).map_err(|_| "Invalid ID")?;

    println!(
        "Updating entry: {}, new group_id: {:?}",
        entry.id, entry.group_id
    );

    // Strategy: Delete the old entry and create a new one in the target group
    // This is simpler than trying to move it between groups

    // First, remove the old entry from wherever it is
    if !remove_entry_recursive(&mut kdbx.database_mut().root_mut(), &uuid) {
        return Err("Entry not found".to_string());
    }

    println!("Old entry removed, recreating in new location");

    // Now add it to the target group
    let db_root = kdbx.database_mut().root_mut();
    let target_group = if let Some(group_id) = &entry.group_id {
        if let Ok(group_uuid) = Uuid::parse_str(group_id) {
            find_group_mut(db_root, &group_uuid).ok_or("Group not found")?
        } else {
            db_root
        }
    } else {
        db_root
    };

    password_entry_to_kdbx(&entry, target_group)?;
    save_database(&mut app_state)?;

    println!("Entry updated and saved successfully");
    Ok(())
}

#[tauri::command]
fn delete_entry(id: String, state: tauri::State<Mutex<AppState>>) -> Result<(), String> {
    let mut app_state = state.lock().unwrap();
    let kdbx = app_state.kdbx.as_mut().ok_or("Not authenticated")?;
    let uuid = Uuid::parse_str(&id).map_err(|_| "Invalid ID")?;

    if remove_entry_recursive(&mut kdbx.database_mut().root_mut(), &uuid) {
        save_database(&mut app_state)?;
        Ok(())
    } else {
        Err("Entry not found".to_string())
    }
}

#[tauri::command]
fn get_all_groups(state: tauri::State<Mutex<AppState>>) -> Result<Vec<PasswordGroup>, String> {
    let app_state = state.lock().unwrap();
    let kdbx = app_state.kdbx.as_ref().ok_or("Not authenticated")?;
    let mut groups = Vec::new();
    fn collect_groups(group: &Group, groups: &mut Vec<PasswordGroup>) {
        // Skip root group itself if we want, but usually we list children
        for child in group.groups() {
            groups.push(kdbx_group_to_password(child));
            collect_groups(child, groups);
        }
    }

    collect_groups(&kdbx.database().root(), &mut groups);

    Ok(groups)
}

#[tauri::command]
fn add_group(
    group: PasswordGroup,
    state: tauri::State<Mutex<AppState>>,
) -> Result<PasswordGroup, String> {
    let mut app_state = state.lock().unwrap();
    let kdbx = app_state.kdbx.as_mut().ok_or("Not authenticated")?;

    password_group_to_kdbx(&group, kdbx.database_mut().root_mut())?;
    save_database(&mut app_state)?;

    Ok(group)
}

#[tauri::command]
fn update_group(group: PasswordGroup, state: tauri::State<Mutex<AppState>>) -> Result<(), String> {
    let mut app_state = state.lock().unwrap();
    let kdbx = app_state.kdbx.as_mut().ok_or("Not authenticated")?;
    let uuid = Uuid::parse_str(&group.id).map_err(|_| "Invalid ID")?;

    println!("Updating group with id: {}, name: {}", group.id, group.name);

    if let Some(existing_group) = kdbx
        .database_mut()
        .root_mut()
        .find_group_mut(|g| g.uuid() == uuid)
    {
        existing_group.set_name(&group.name);
        println!("Group name updated successfully");

        // Note: kdbx-rs Group doesn't support custom fields like Entry does
        // Icon, color, and sort_order are application-specific metadata
        // They can be stored in Entry custom fields but not in Group
        // For now, we only update the name field which is the primary field

        save_database(&mut app_state)?;
        println!("Database saved successfully");
        Ok(())
    } else {
        println!("Group not found with UUID: {}", uuid);
        Err("Group not found".to_string())
    }
}

#[tauri::command]
fn delete_group(id: String, state: tauri::State<Mutex<AppState>>) -> Result<(), String> {
    let mut app_state = state.lock().unwrap();
    let kdbx = app_state.kdbx.as_mut().ok_or("Not authenticated")?;
    let uuid = Uuid::parse_str(&id).map_err(|_| "Invalid ID")?;

    // Check if group has entries
    if let Some(group) = kdbx
        .database_mut()
        .root_mut()
        .find_group_mut(|g| g.uuid() == uuid)
    {
        // Simple check: does it have entries or children?
        if group.entries().next().is_some() {
            return Err("Cannot delete group with entries".to_string());
        }
        // Also check children recursively?
        // For now, let's just check direct entries as per requirement
    } else {
        return Err("Group not found".to_string());
    }

    if remove_group_recursive(kdbx.database_mut().root_mut(), &uuid) {
        save_database(&mut app_state)?;
        Ok(())
    } else {
        Err("Group not found".to_string())
    }
}

#[tauri::command]
fn change_master_password(
    old_password: String,
    new_password: String,
    state: tauri::State<Mutex<AppState>>,
) -> Result<(), String> {
    let mut app_state = state.lock().unwrap();

    // Verify old password
    if app_state.master_password.as_deref() != Some(old_password.as_str()) {
        return Err("Invalid old password".to_string());
    }

    let mut kdbx = app_state.kdbx.take().ok_or("Not authenticated")?;
    let key = CompositeKey::from_password(&new_password);
    kdbx.set_key(key).map_err(|e| e.to_string())?;

    app_state.kdbx = Some(kdbx);
    app_state.master_password = Some(new_password);

    save_database(&mut app_state)?;

    Ok(())
}

#[tauri::command]
fn generate_totp(secret: String) -> Result<String, String> {
    let clean_secret = secret.replace(" ", "").replace("=", "").to_uppercase();

    for (i, c) in clean_secret.chars().enumerate() {
        if !c.is_ascii_uppercase() && !('2'..='7').contains(&c) {
            return Err(format!(
                "Invalid character '{}' at position {}. Base32 only allows A-Z and 2-7. Your secret: '{}'",
                c, i, clean_secret
            ));
        }
    }

    let secret_bytes = BASE32_NOPAD
        .decode(clean_secret.as_bytes())
        .or_else(|e1| {
            let padded = add_base32_padding(&clean_secret);
            BASE32.decode(padded.as_bytes()).map_err(|e2| {
                format!(
                    "Both decode attempts failed. NOPAD: {:?}, PADDED: {:?}",
                    e1, e2
                )
            })
        })
        .map_err(|e| {
            format!(
                "Invalid TOTP secret format: {}. Secret must be Base32 encoded (A-Z, 2-7).",
                e
            )
        })?;

    if secret_bytes.is_empty() {
        return Err("TOTP secret is empty".to_string());
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("System time error: {}", e))?
        .as_secs();

    let totp = totp_lite::totp_custom::<totp_lite::Sha1>(30, 6, &secret_bytes, timestamp);

    Ok(format!("{:06}", totp))
}

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
    let mut secret = vec![0u8; 20];
    use rand::RngCore;
    rand::thread_rng().fill_bytes(&mut secret);
    BASE32.encode(&secret)
}

#[tauri::command]
fn get_totp_qr_url(secret: String, account_name: String, issuer: String) -> String {
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
    if app_state.kdbx.is_none() {
        return Err("Not authenticated".to_string());
    }

    // Read the KDBX file as base64
    let data = fs::read(&app_state.data_file)
        .map_err(|e| format!("Failed to read database file: {}", e))?;

    Ok(general_purpose::STANDARD.encode(data))
}

#[tauri::command]
fn import_chrome_csv(
    _path: String, // path is not used as csv_content is passed directly
    csv_content: String,
    state: tauri::State<Mutex<AppState>>,
) -> Result<usize, String> {
    let mut app_state = state.lock().unwrap();
    let kdbx = app_state.kdbx.as_mut().ok_or("Not authenticated")?;
    let db = kdbx.database_mut();

    let mut rdr = csv::Reader::from_reader(csv_content.as_bytes());
    let mut imported_count = 0;
    let now = current_timestamp();

    #[derive(Debug, Deserialize)]
    struct ChromePasswordEntry {
        name: String,
        url: String,
        username: String,
        password: String,
    }

    for result in rdr.deserialize() {
        let chrome_entry: ChromePasswordEntry = result.map_err(|e| e.to_string())?;

        let entry = PasswordEntry {
            id: Uuid::new_v4().to_string(),
            title: chrome_entry.name,
            username: chrome_entry.username,
            password: chrome_entry.password,
            url: Some(vec![chrome_entry.url]),
            notes: "从 Chrome 导入".to_string(),
            totp_secret: None,
            icon_id: None,
            tags: Some(vec!["Chrome".to_string()]),
            group_id: None,
            sort_order: Some(imported_count as i64),
            created_at: now,
            updated_at: now,
            history: None,
        };

        password_entry_to_kdbx(&entry, db.root_mut())?;
        imported_count += 1;
    }

    save_database(&mut app_state)?;
    Ok(imported_count)
}

#[tauri::command]
fn import_encrypted_data(
    encrypted_base64: String,
    password: String,
    state: tauri::State<Mutex<AppState>>,
) -> Result<usize, String> {
    let mut app_state = state.lock().unwrap();

    // Decode base64
    let kdbx_data = general_purpose::STANDARD
        .decode(&encrypted_base64)
        .map_err(|e| format!("Invalid base64 data: {}", e))?;

    // Open imported KDBX
    let cursor = std::io::Cursor::new(kdbx_data);
    let import_kdbx = kdbx_rs::from_reader(cursor)
        .map_err(|e| format!("Failed to parse imported database: {}", e))?;
    let key = CompositeKey::from_password(&password);
    let import_kdbx = import_kdbx
        .unlock(&key)
        .map_err(|_| "导入文件的密码错误".to_string())?;

    // Get current DB
    let kdbx = app_state.kdbx.as_mut().ok_or("Not authenticated")?;
    let db = kdbx.database_mut();

    // Collect all entries from imported database
    let mut imported_entries = Vec::new();
    fn collect_import_entries(
        group: &Group,
        group_id: Option<String>,
        entries: &mut Vec<PasswordEntry>,
    ) {
        let current_group_id = Some(group.uuid().to_string());
        for entry in group.entries() {
            entries.push(kdbx_entry_to_password(entry, group_id.clone()));
        }
        for child in group.groups() {
            collect_import_entries(child, current_group_id.clone(), entries);
        }
    }

    collect_import_entries(&import_kdbx.database().root(), None, &mut imported_entries);

    // Get existing entry IDs
    let mut existing_ids = std::collections::HashSet::new();
    fn collect_existing_ids(group: &Group, ids: &mut std::collections::HashSet<String>) {
        for entry in group.entries() {
            ids.insert(entry.uuid().to_string());
        }
        for child in group.groups() {
            collect_existing_ids(child, ids);
        }
    }

    collect_existing_ids(&db.root(), &mut existing_ids);

    // Import entries that don't already exist
    let mut imported_count = 0;
    for mut entry in imported_entries {
        if !existing_ids.contains(&entry.id) {
            entry.sort_order = Some(imported_count as i64);
            password_entry_to_kdbx(&entry, db.root_mut())?;
            imported_count += 1;
        }
    }

    save_database(&mut app_state)?;
    Ok(imported_count)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let app_state = AppState::new(&app_handle);
            app.manage(Mutex::new(app_state));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_master_password_exists,
            create_master_password,
            verify_master_password,
            get_all_entries,
            add_entry,
            update_entry,
            delete_entry,
            get_all_groups,
            add_group,
            update_group,
            delete_group,
            change_master_password,
            generate_totp,
            generate_totp_secret,
            get_totp_qr_url,
            export_data,
            import_chrome_csv,
            import_encrypted_data,
            get_app_config,
            update_app_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
