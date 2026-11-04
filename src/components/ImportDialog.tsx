import { FormEvent, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";
import { ToolDialog, useToolText } from "./ToolPage";
import "../styles/ImportDialog.css";

export default function ImportDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: (count: number) => void }) {
  const { t } = useTranslation();
  const label = useToolText();
  const [source, setSource] = useState<"encrypted" | "chrome">("encrypted");
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const encrypted = source === "encrypted";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !file) return;
    setBusy(true);
    setError("");
    try {
      const contents = await file.text();
      const count = encrypted
        ? await invoke<number>("import_encrypted_data", { encryptedJson: contents, password })
        : await invoke<number>("import_chrome_csv", { csvContent: contents });
      onSuccess(count);
      onClose();
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }
  return (
    <ToolDialog title={t("import.title")} busy={busy} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="tool-input-label">{label("导入来源", "Import from")}
          <select disabled={busy} className="tool-select" value={source} onChange={e => {
            setSource(e.target.value as typeof source);
            setFile(null); setPassword(""); setError("");
          }}>
            <option value="encrypted">{label("2Pass 加密备份 (.json)", "2Pass encrypted backup (.json)")}</option>
            <option value="chrome">{label("Chrome 密码 (.csv)", "Chrome passwords (.csv)")}</option>
          </select>
        </label>
        <p className="tool-note">{encrypted ? t("import.encryptedBackupHint") : t("import.chromeHint")}</p>
        <label className="backup-file-field"><Icon name="upload" size={19} />
          <span>{file?.name ?? (encrypted ? t("import.selectBackupFile") : t("import.selectCsvFile"))}</span>
          <input type="file" key={source} disabled={busy} required accept={encrypted ? ".json" : ".csv"} onChange={e => { setFile(e.target.files?.[0] ?? null); setError(""); }}/>
        </label>
        {encrypted && <label className="tool-input-label">{t("import.backupPassword")}
          <input type="password" required autoComplete="off" placeholder={t("import.backupPasswordPlaceholder")} disabled={busy} value={password} onChange={e => setPassword(e.target.value)}/>
        </label>}
        {error && <p className="tool-notice" role="alert">{error}</p>}
        <div className="tool-dialog-footer">
          <button className="tool-btn" type="button" onClick={onClose} disabled={busy}>{t("forms.cancel")}</button>
          <button className="tool-btn tool-accent" type="submit" disabled={busy || !file || (encrypted && !password)}>{busy ? t("import.importing") : t("import.startImport")}</button>
        </div>
      </form>
    </ToolDialog>
  );
}
