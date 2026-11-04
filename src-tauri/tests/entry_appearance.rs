use pass_lib::{PasswordEntry, PasswordGroup};
use serde_json::json;

#[test]
fn appearance_round_trips_without_requiring_it_in_old_vaults() {
    let legacy = json!({
        "id": "one", "title": "Example", "username": "sample", "password": "example",
        "notes": "", "created_at": 1, "updated_at": 2
    });
    let plain: PasswordEntry = serde_json::from_value(legacy.clone()).unwrap();
    assert!(plain.icon.is_none() && plain.color.is_none());

    let mut styled = legacy;
    styled["icon"] = json!("shield");
    styled["color"] = json!("denim");
    let from_ipc: PasswordEntry = serde_json::from_value(styled).unwrap();
    let restored: PasswordEntry = serde_json::from_slice(&serde_json::to_vec(&from_ipc).unwrap()).unwrap();
    assert_eq!(restored.icon.as_deref(), Some("shield"));
    assert_eq!(restored.color.as_deref(), Some("denim"));

    let group: PasswordGroup = serde_json::from_value(json!({
        "id": "folder", "name": "Work", "icon": "📁", "color": "clay", "sort_order": 0, "created_at": 1
    })).unwrap();
    assert_eq!(serde_json::to_value(group).unwrap()["color"], "clay");
}
