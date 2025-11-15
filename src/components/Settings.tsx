import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import ImportDialog from "./ImportDialog";
import SyncConfig from "./SyncConfig";
import "../styles/Settings.css";

interface SettingsProps {
  autoLockTimeout: number;
  onAutoLockChange: (minutes: number) => void;
  onLock: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  onRefresh: () => void;
}

function Settings({ autoLockTimeout, onAutoLockChange, onLock, theme, onThemeChange, onRefresh }: SettingsProps) {
  const { t, i18n } = useTranslation();
  const [showChangeMasterPassword, setShowChangeMasterPassword] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSyncConfig, setShowSyncConfig] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const autoLockOptions = [
    { value: 0, label: t("settings.autoLockOptions.disabled") },
    { value: 1, label: t("settings.autoLockOptions.1min") },
    { value: 5, label: t("settings.autoLockOptions.5min") },
    { value: 10, label: t("settings.autoLockOptions.10min") },
    { value: 15, label: t("settings.autoLockOptions.15min") },
    { value: 30, label: t("settings.autoLockOptions.30min") },
    { value: 60, label: t("settings.autoLockOptions.1hour") },
  ];

  const themeOptions = [
    { value: "default", label: t("settings.themes.default"), preview: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { value: "sky-blue", label: t("settings.themes.skyBlue"), preview: "linear-gradient(135deg, #93c5fd 0%, #7dd3fc 100%)" },
    { value: "purple-pink", label: t("settings.themes.purplePink"), preview: "linear-gradient(135deg, #c4b5fd 0%, #f9a8d4 100%)" },
    { value: "turquoise", label: t("settings.themes.turquoise"), preview: "linear-gradient(135deg, #5eead4 0%, #6ee7b7 100%)" },
    { value: "bulma", label: t("settings.themes.bulma"), preview: "linear-gradient(135deg, #5eead4 0%, #34d399 100%)" },
    { value: "glass", label: t("settings.themes.glass"), preview: "linear-gradient(135deg, #a5b4fc 0%, #93c5fd 100%)" },
  ];

  const languageOptions = [
    { value: "zh-CN", label: t("settings.languages.zh-CN") },
    { value: "en-US", label: t("settings.languages.en-US") },
  ];

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await invoke<any>("get_sync_status");
      setSyncStatus(status);
    } catch (err) {
      console.error("Failed to load sync status:", err);
    }
  };

  const handleSync = async (direction: "upload" | "download") => {
    if (!syncStatus?.enabled || !syncStatus?.provider) {
      alert(t("settings.sync.pleaseConfigSync"));
      return;
    }

    setIsSyncing(true);
    try {
      const config = await invoke<any>("get_sync_config");
      if (!config) {
        throw new Error(t("settings.sync.pleaseConfigSync"));
      }

      if (direction === "upload") {
        await invoke("sync_upload", {
          provider: syncStatus.provider,
          configJson: config.config_data,
        });
        alert(t("settings.sync.uploadSuccess"));
      } else {
        const password = prompt(t("login.masterPassword") + ":");
        if (!password) return;
        
        await invoke("sync_download", {
          provider: syncStatus.provider,
          configJson: config.config_data,
          masterPassword: password,
        });
        alert(t("settings.sync.downloadSuccess"));
        onRefresh();
      }
      await loadSyncStatus();
    } catch (err: any) {
      alert(t("settings.sync.syncFailed", { error: err }));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportData = async () => {
    try {
      // 导入 Tauri 的文件对话框和文件系统 API
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      // 获取导出数据
      const data = await invoke<string>("export_data");

      // 生成默认文件名
      const defaultFileName = `2pass-backup-${new Date().toISOString().split("T")[0]}.json`;

      // 打开保存对话框
      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [{
          name: "JSON",
          extensions: ["json"]
        }]
      });

      // 如果用户取消了，filePath 为 null
      if (!filePath) {
        return;
      }

      // 写入文件
      await writeTextFile(filePath, data);

      alert("✓ " + t("settings.exportData") + " " + t("common.success") + "！" + t("common.info") + "：\n" + filePath);
    } catch (err) {
      console.error(t("settings.exportData") + " " + t("common.error") + ":", err);
      alert(t("settings.exportData") + " " + t("common.error") + "：" + err);
    }
  };

  const handleImportSuccess = () => {
    // 导入成功后的回调，可以刷新数据
    onRefresh();
    // alert("✓ 导入成功！请刷新页面查看导入的密码");
  };

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
  };

  const handleChangeMasterPassword = async () => {
    setError("");
    setSuccess("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError(t("changeMasterPassword.allFieldsRequired"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("changeMasterPassword.passwordMismatch"));
      return;
    }

    if (newPassword.length < 8) {
      setError(t("changeMasterPassword.passwordTooShort"));
      return;
    }

    try {
      await invoke("change_master_password", {
        oldPassword: oldPassword,
        newPassword: newPassword,
      });
      setSuccess(t("changeMasterPassword.success"));
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowChangeMasterPassword(false);
        onLock();
      }, 2000);
    } catch (err) {
      setError(String(err));
    }
  };
  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>⚙️ {t("settings.title")}</h1>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h2>🎨 {t("settings.appearance")}</h2>

          {/* 语言选择  */}
          <div className="setting-item full-width">
            <div className="setting-info">
              <h3>{t("settings.language")}</h3>
              <p>{t("settings.languageDescription")}</p>
            </div>
            <div className="language-selector">
              {languageOptions.map((option) => (
                <button
                  key={option.value}
                  className={`language-option ${i18n.language === option.value ? "active" : ""}`}
                  onClick={() => handleLanguageChange(option.value)}
                >
                  <span className="language-label">{option.label}</span>
                  {i18n.language === option.value && <span className="language-check">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* 主题选择 */}
          <div className="setting-item full-width">
            <div className="setting-info">
              <h3>{t("settings.theme")}</h3>
              <p>{t("settings.themeDescription")}</p>
            </div>
            <div className="theme-selector">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  className={`theme-option ${theme === option.value ? "active" : ""}`}
                  onClick={() => onThemeChange(option.value)}
                >
                  <div className="theme-preview" style={{ background: option.preview }} />
                  <span className="theme-label">{option.label}</span>
                  {theme === option.value && <span className="theme-check">✓</span>}
                </button>
              ))}
            </div>
          </div>

        </div>

        <div className="settings-section">
          <h2>🔒 {t("settings.security")}</h2>
          <div className="setting-item">
            <div className="setting-info">
              <h3>{t("settings.masterPassword")}</h3>
              <p>{t("settings.masterPasswordDescription")}</p>
            </div>
            <button
              className="setting-action-btn"
              onClick={() => setShowChangeMasterPassword(true)}
            >
              {t("settings.changeMasterPassword")}
            </button>
          </div>

          <div className="setting-item full-width">
            <div className="setting-info">
              <h3>{t("settings.autoLock")}</h3>
              <p>{t("settings.autoLockDescription")}</p>
            </div>
            <div className="time-selector">
              {autoLockOptions.map((option) => (
                <button
                  key={option.value}
                  className={`time-option ${autoLockTimeout === option.value ? "active" : ""}`}
                  onClick={() => onAutoLockChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>


        <div className="settings-section">
          <h2>💾 {t("settings.dataManagement")}</h2>
          <div className="setting-item">
            <div className="setting-info">
              <h3>{t("settings.exportData")}</h3>
              <p>{t("settings.exportDataDescription")}</p>
            </div>
            <button className="setting-action-btn" onClick={handleExportData}>
              📤 {t("settings.export")}
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>{t("settings.importData")}</h3>
              <p>{t("settings.importDataDescription")}</p>
            </div>
            <button
              className="setting-action-btn"
              onClick={() => setShowImportDialog(true)}
            >
              📥 {t("settings.import")}
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h2>☁️ {t("settings.sync.title")}</h2>
          <div className="setting-item">
            <div className="setting-info">
              <h3>{t("settings.sync.configSync")}</h3>
              <p>
                {syncStatus?.enabled
                  ? t("settings.sync.syncEnabled", { 
                      provider: syncStatus.provider || ""
                    }) + (syncStatus.last_sync_time ? t("settings.sync.lastSync", { time: new Date(syncStatus.last_sync_time * 1000).toLocaleString() }) : "")
                  : t("settings.sync.syncDescription")}
              </p>
            </div>
            <button
              className="setting-action-btn"
              onClick={() => setShowSyncConfig(true)}
            >
              ⚙️ {t("settings.sync.configSync")}
            </button>
          </div>

          {syncStatus?.enabled && (
            <>
              <div className="setting-item">
                <div className="setting-info">
                  <h3>{t("settings.sync.uploadToCloud")}</h3>
                  <p>{t("settings.sync.uploadDescription")}</p>
                </div>
                <button
                  className="setting-action-btn"
                  onClick={() => handleSync("upload")}
                  disabled={isSyncing}
                >
                  {isSyncing ? `⏳ ${t("settings.sync.uploading")}` : `📤 ${t("settings.sync.uploadNow")}`}
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h3>{t("settings.sync.downloadFromCloud")}</h3>
                  <p>{t("settings.sync.downloadDescription")}</p>
                </div>
                <button
                  className="setting-action-btn"
                  onClick={() => handleSync("download")}
                  disabled={isSyncing}
                >
                  {isSyncing ? `⏳ ${t("settings.sync.downloading")}` : `📥 ${t("settings.sync.downloadNow")}`}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="settings-section danger-section">
          <h2>⚠️ {t("settings.dangerZone")}</h2>
          <div className="setting-item">
            <div className="setting-info">
              <h3>{t("settings.clearAllData")}</h3>
              <p>{t("settings.clearAllDataDescription")}</p>
            </div>
            <button className="setting-action-btn danger-btn" disabled>
              {t("settings.clear")}
            </button>
          </div>
        </div>
      </div>

      {showChangeMasterPassword && (
        <div className="change-password-overlay">
          <div className="change-password-dialog">
            <div className="dialog-header">
              <h2>🔑 {t("changeMasterPassword.title")}</h2>
              <button
                onClick={() => {
                  setShowChangeMasterPassword(false);
                  setError("");
                  setSuccess("");
                  setOldPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <div className="dialog-content">
              {error && <div className="error-box">{error}</div>}
              {success && <div className="success-box">{success}</div>}

              <div className="form-group">
                <label>{t("changeMasterPassword.currentPassword")}</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder={t("changeMasterPassword.currentPasswordPlaceholder")}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>{t("changeMasterPassword.newPassword")}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("changeMasterPassword.newPasswordPlaceholder")}
                />
              </div>

              <div className="form-group">
                <label>{t("changeMasterPassword.confirmPassword")}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("changeMasterPassword.confirmPasswordPlaceholder")}
                />
              </div>
            </div>

            <div className="dialog-actions">
              <button
                onClick={() => setShowChangeMasterPassword(false)}
                className="cancel-btn"
              >
                {t("forms.cancel")}
              </button>
              <button onClick={handleChangeMasterPassword} className="confirm-btn">
                {t("changeMasterPassword.confirmChange")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportDialog && (
        <ImportDialog
          onClose={() => setShowImportDialog(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {showSyncConfig && (
        <SyncConfig
          onClose={() => setShowSyncConfig(false)}
          onSave={() => {
            loadSyncStatus();
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

export default Settings;

