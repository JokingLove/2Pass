import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "../styles/ImportDialog.css";

interface ImportDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

function ImportDialog({ onClose, onSuccess }: ImportDialogProps) {
  const [importType, setImportType] = useState<"encrypted" | "chrome">("encrypted");
  const [password, setPassword] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isImporting, setIsImporting] = useState(false);

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
      setError("请先选择文件");
      return;
    }

    if (importType === "encrypted" && !password) {
      setError("请输入导入文件的密码");
      return;
    }

    setIsImporting(true);

    try {
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

      setSuccess(`成功导入 ${count} 条密码！`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="import-overlay">
      <div className="import-dialog">
        <div className="import-header">
          <h2>📥 导入数据</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="import-content">
          <div className="import-type-selector">
            <button
              className={`type-btn ${importType === "encrypted" ? "active" : ""}`}
              onClick={() => setImportType("encrypted")}
            >
              🔒 导入加密备份
            </button>
            <button
              className={`type-btn ${importType === "chrome" ? "active" : ""}`}
              onClick={() => setImportType("chrome")}
            >
              🌐 导入 Chrome 密码
            </button>
          </div>

          {importType === "encrypted" ? (
            <div className="import-section">
              <h3>导入加密备份文件</h3>
              <p className="import-hint">
                导入之前通过"导出数据"功能导出的加密备份文件（.json）
              </p>
              
              <div className="file-input-group">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  id="encrypted-file"
                />
                <label htmlFor="encrypted-file" className="file-label">
                  📁 选择备份文件
                </label>
              </div>

              {fileContent && (
                <div className="file-selected">
                  ✓ 文件已选择（{(fileContent.length / 1024).toFixed(2)} KB）
                </div>
              )}

              <div className="form-group">
                <label>备份文件密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入创建备份时的主密码"
                />
              </div>
            </div>
          ) : (
            <div className="import-section">
              <h3>导入 Chrome 浏览器密码</h3>
              <p className="import-hint">
                从 Chrome 设置 → 密码 → 导出密码，保存为 CSV 文件
              </p>
              
              <div className="chrome-steps">
                <ol>
                  <li>打开 Chrome 浏览器</li>
                  <li>进入 设置 → 密码管理器</li>
                  <li>点击"导出密码"</li>
                  <li>保存 CSV 文件</li>
                  <li>在下方选择该文件</li>
                </ol>
              </div>

              <div className="file-input-group">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  id="chrome-file"
                />
                <label htmlFor="chrome-file" className="file-label">
                  📁 选择 CSV 文件
                </label>
              </div>

              {fileContent && (
                <div className="file-selected">
                  ✓ 文件已选择（{(fileContent.length / 1024).toFixed(2)} KB）
                </div>
              )}
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
          {success && <div className="success-box">{success}</div>}
        </div>

        <div className="import-actions">
          <button onClick={onClose} className="cancel-btn">
            取消
          </button>
          <button
            onClick={handleImport}
            className="import-btn"
            disabled={isImporting || !fileContent}
          >
            {isImporting ? "导入中..." : "开始导入"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportDialog;

