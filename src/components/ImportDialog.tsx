import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import "../styles/ImportDialog.css";

interface ImportDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

function ImportDialog({ onClose, onSuccess }: ImportDialogProps) {
  const { t } = useTranslation();
  const [importType, setImportType] = useState<"encrypted" | "chrome">("encrypted");
  const [password, setPassword] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setError("");
    setSuccess("");

    if (!fileContent) {
      setError(t("import.pleaseSelectFile"));
      return;
    }

    if (importType === "encrypted" && !password) {
      setError(t("import.pleaseEnterPassword"));
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      // 模拟进度更新（更平滑）
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => {
          if (prev >= 85) return prev;
          return prev + 5;
        });
      }, 150);

      let count: number;
      
      if (importType === "encrypted") {
        count = await invoke<number>("import_encrypted_data", {
          encryptedJson: fileContent,
          password,
        });
      } else {
        count = await invoke<number>("import_chrome_csv", {
          csvContent: fileContent,
        });
      }

      clearInterval(progressInterval);
      setImportProgress(100);

      setSuccess(t("import.successMessage", { count }));
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      setError(String(err));
      setImportProgress(0);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="import-overlay" style={{ pointerEvents: isImporting ? 'none' : 'auto' }}>
      <div className="import-dialog" style={{ pointerEvents: 'auto' }}>
        <div className="import-header">
          <h2>📥 {t("import.title")}</h2>
          <button onClick={onClose} className="close-btn" disabled={isImporting}>✕</button>
        </div>

        <div className="import-content">
          <div className="import-type-selector">
            <button
              className={`type-btn ${importType === "encrypted" ? "active" : ""}`}
              onClick={() => setImportType("encrypted")}
              disabled={isImporting}
            >
              🔒 {t("import.importEncrypted")}
            </button>
            <button
              className={`type-btn ${importType === "chrome" ? "active" : ""}`}
              onClick={() => setImportType("chrome")}
              disabled={isImporting}
            >
              🌐 {t("import.importChrome")}
            </button>
          </div>

          {importType === "encrypted" ? (
            <div className="import-section">
              <h3>{t("import.encryptedBackupTitle")}</h3>
              <p className="import-hint">
                {t("import.encryptedBackupHint")}
              </p>
              
              <div className="file-input-group">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  id="encrypted-file"
                  disabled={isImporting}
                />
                <label htmlFor="encrypted-file" className="file-label" style={{ opacity: isImporting ? 0.5 : 1, cursor: isImporting ? 'not-allowed' : 'pointer' }}>
                  📁 {t("import.selectBackupFile")}
                </label>
              </div>

              {fileContent && (
                <div className="file-selected">
                  ✓ {t("import.fileSelected")} ({(fileContent.length / 1024).toFixed(2)} KB)
                </div>
              )}

              <div className="form-group">
                <label>{t("import.backupPassword")}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("import.backupPasswordPlaceholder")}
                  disabled={isImporting}
                />
              </div>
            </div>
          ) : (
            <div className="import-section">
              <h3>{t("import.chromeTitle")}</h3>
              <p className="import-hint">
                {t("import.chromeHint")}
              </p>
              
              <div className="chrome-steps">
                <ol>
                  <li>{t("import.chromeStep1")}</li>
                  <li>{t("import.chromeStep2")}</li>
                  <li>{t("import.chromeStep3")}</li>
                  <li>{t("import.chromeStep4")}</li>
                  <li>{t("import.chromeStep5")}</li>
                </ol>
              </div>

              <div className="file-input-group">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  id="chrome-file"
                  disabled={isImporting}
                />
                <label htmlFor="chrome-file" className="file-label" style={{ opacity: isImporting ? 0.5 : 1, cursor: isImporting ? 'not-allowed' : 'pointer' }}>
                  📁 {t("import.selectCsvFile")}
                </label>
              </div>

              {fileContent && (
                <div className="file-selected">
                  ✓ {t("import.fileSelected")} ({(fileContent.length / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>
          )}

          {isImporting && (
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <div className="progress-text">{t("import.importing")} {importProgress}%</div>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
          {success && <div className="success-box">{success}</div>}
        </div>

        <div className="import-actions">
          <button onClick={onClose} className="cancel-btn" disabled={isImporting}>
            {t("forms.cancel")}
          </button>
          <button
            onClick={handleImport}
            className={`import-btn ${isImporting ? 'loading' : ''}`}
            disabled={isImporting || !fileContent}
          >
            {isImporting && <span className="button-spinner"></span>}
            <span>{isImporting ? t("import.importing") : t("import.startImport")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportDialog;

