import { FormEvent, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";
import { appearanceThemes, type ThemeId } from "../utils/appearance";
import ImportDialog from "./ImportDialog";
import ToolPage, { ToolDialog, useToolText } from "./ToolPage";
import "../styles/Settings.css";

interface SettingsProps {
  autoLockTimeout: number;
  onAutoLockChange: (minutes: number) => void;
  onLock: () => void;
  theme: string;
  onThemeChange: (theme: ThemeId) => void;
  onRefresh: () => void;
  demo?: boolean;
}

function ChangePassword({ onClose, onLock }: { onClose: () => void; onLock: () => void }) {
  const { t } = useTranslation();
  const label = useToolText();
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (newPassword !== confirm) return setError(t("changeMasterPassword.passwordMismatch"));
    setBusy(true);
    try {
      await invoke("change_master_password", { oldPassword, newPassword });
      onLock();
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  };
  return (
    <ToolDialog title={t("settings.changeMasterPassword")} onClose={onClose} busy={busy}>
      <p className="tool-note">{label("更改后，请使用新主密码重新解锁保险库。", "After this change, unlock the vault with your new master password.")}</p>
      <form onSubmit={submit}>
        <label className="tool-input-label">{t("changeMasterPassword.currentPassword")}<input type="password" required autoFocus autoComplete="current-password" value={oldPassword} onChange={e => setOld(e.target.value)} /></label>
        <label className="tool-input-label">{t("changeMasterPassword.newPassword")}<input type="password" required minLength={8} autoComplete="new-password" placeholder={label("至少 8 个字符", "At least 8 characters")} value={newPassword} onChange={e => setNew(e.target.value)} /></label>
        <label className="tool-input-label">{t("changeMasterPassword.confirmPassword")}<input type="password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        {error && <p role="alert" className="tool-notice">{error}</p>}
        <div className="tool-dialog-footer">
          <button className="tool-btn" type="button" disabled={busy} onClick={onClose}>{t("forms.cancel")}</button>
          <button className="tool-btn tool-accent" disabled={busy} type="submit">{busy ? t("common.loading") : t("changeMasterPassword.confirmChange")}</button>
        </div>
      </form>
    </ToolDialog>
  );
}

export default function Settings({ autoLockTimeout, onAutoLockChange, onLock, theme, onThemeChange, onRefresh, demo = false }: SettingsProps) {
  const { t, i18n } = useTranslation();
  const label = useToolText();
  const [section, setSection] = useState<"appearance" | "security" | "dataManagement">("appearance");
  const [dialog, setDialog] = useState<"password" | "import" | null>(null);
  const [notice, setNotice] = useState<{ error?: boolean; text: string }>();
  const [exporting, setExporting] = useState(false);
  const desktopOnly = label("演示模式仅供体验。请在桌面应用中管理真实密码和备份。", "This is a demo. Manage real passwords and backups in the desktop app.");
  const exportData = async () => {
    if (demo || exporting) return;
    setExporting(true);
    setNotice(undefined);
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({ defaultPath: '2pass-backup-' + new Date().toISOString().slice(0, 10) + '.json', filters: [{ name: "JSON", extensions: ["json"] }] });
      if (!path) return;
      const data = await invoke<string>("export_data");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      await writeTextFile(path, data);
      setNotice({ text: label("加密备份已保存。", "Encrypted backup saved.") });
    } catch (err) {
      setNotice({ error: true, text: label("导出失败：", "Export failed: ") + String(err) });
    } finally {
      setExporting(false);
    }
  };
  return (
    <ToolPage title={t("settings.title")} code="PREFERENCES">
      <nav aria-label={t("settings.title")} className="prefs-nav">
        {(["appearance", "security", "dataManagement"] as const).map(key => (
          <button type="button" key={key} onClick={() => setSection(key)} aria-current={section === key ? "page" : undefined}>{t("settings." + key)}</button>
        ))}
      </nav>
      <section aria-label={t("settings." + section)} className="prefs-content">
        {section === "appearance" && <>
          <h2>{label("界面主题", "Interface theme")}</h2>
          <div className="prefs-themes">
            {appearanceThemes.map(option => {
              const selected = theme === option.id;
              return (
                <button
                  type="button"
                  key={option.id}
                  className="prefs-theme"
                  aria-pressed={selected}
                  onClick={() => onThemeChange(option.id)}
                >
                  <span className="prefs-theme-art" data-theme-preview={option.id} aria-hidden="true">
                    <span className="prefs-art-rail"><i /><i /><i /></span>
                    <span className="prefs-art-stack"><i /><i /><i /></span>
                  </span>
                  <span className="prefs-theme-name">
                    {label(option.zh, option.en)}
                    {selected && <Icon name="check" size={15} />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="prefs-row"><label htmlFor="prefs-language">{t("settings.language")}</label>
            <select id="prefs-language" className="tool-select" value={i18n.language} onChange={e => {
              const language = e.target.value;
              void i18n.changeLanguage(language);
              localStorage.setItem("language", language);
              document.documentElement.lang = language;
            }}>
              <option value="zh-CN">简体中文</option><option value="en-US">English</option>
            </select>
          </div>
        </>}
        {section === "security" && <>
          <div className="prefs-row"><div><label htmlFor="prefs-lock">{t("settings.autoLock")}</label><p>{label("无操作一段时间后锁定保险库。", "Lock the vault after a period of inactivity.")}</p></div>
            <select id="prefs-lock" className="tool-select" value={autoLockTimeout} onChange={e => onAutoLockChange(Number(e.target.value))}>
              {[0,1,5,10,15,30,60].map(n => <option key={n} value={n}>{t("settings.autoLockOptions." + (n === 0 ? "disabled" : n === 60 ? "1hour" : n + "min"))}</option>)}
            </select>
          </div>
          <div className="prefs-row"><div><h2>{t("settings.masterPassword")}</h2><p>{t("settings.masterPasswordDescription")}</p></div>
            <button className="tool-btn" type="button" disabled={demo} onClick={() => setDialog("password")}><Icon name="key" size={15}/>{t("settings.changeMasterPassword")}</button>
          </div>
        </>}
        {section === "dataManagement" && <>
          <div className="prefs-row"><div><h2>{t("settings.importData")}</h2><p>{t("settings.importDataDescription")}</p></div>
            <button className="tool-btn" type="button" disabled={demo} onClick={() => { setNotice(undefined); setDialog("import"); }}><Icon name="download" size={16}/>{t("settings.import")}</button></div>
          <div className="prefs-row"><div><h2>{t("settings.exportData")}</h2><p>{t("settings.exportDataDescription")}</p></div>
            <button className="tool-btn" type="button" disabled={demo || exporting} onClick={exportData}><Icon name="upload" size={16}/>{exporting ? t("common.loading") : t("settings.export")}</button></div>
          {notice && <p className="tool-notice" role={notice.error ? "alert" : "status"}>{notice.text}</p>}
        </>}
        {demo && section !== "appearance" && <p className="prefs-demo-note"><Icon name="lock" size={14}/>{desktopOnly}</p>}
      </section>
      {dialog === "password" && !demo && <ChangePassword onClose={() => setDialog(null)} onLock={onLock}/>}
      {dialog === "import" && !demo && <ImportDialog onSuccess={(count: number) => { onRefresh(); setNotice({ text: t("import.successMessage", { count }) }); }} onClose={() => setDialog(null)}/>}
    </ToolPage>
  );
}
