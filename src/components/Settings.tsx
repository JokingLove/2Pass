import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import ImportDialog from "./ImportDialog";
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
  const [showChangeMasterPassword, setShowChangeMasterPassword] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const autoLockOptions = [
    { value: 0, label: "禁用" },
    { value: 1, label: "1 分钟" },
    { value: 5, label: "5 分钟" },
    { value: 10, label: "10 分钟" },
    { value: 15, label: "15 分钟" },
    { value: 30, label: "30 分钟" },
    { value: 60, label: "1 小时" },
  ];

  const themeOptions = [
    { value: "default", label: "2Pass 紫蓝", preview: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { value: "sky-blue", label: "晴空万里", preview: "linear-gradient(135deg, #93c5fd 0%, #7dd3fc 100%)" },
    { value: "purple-pink", label: "星空幻境", preview: "linear-gradient(135deg, #c4b5fd 0%, #f9a8d4 100%)" },
    { value: "turquoise", label: "翡翠森林", preview: "linear-gradient(135deg, #5eead4 0%, #6ee7b7 100%)" },
    { value: "bulma", label: "清新薄荷", preview: "linear-gradient(135deg, #5eead4 0%, #34d399 100%)" },
    { value: "glass", label: "毛玻璃", preview: "linear-gradient(135deg, #a5b4fc 0%, #93c5fd 100%)" },
  ];

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
      
      alert("✓ 导出成功！备份文件已保存到：\n" + filePath);
    } catch (err) {
      console.error("导出失败:", err);
      alert("导出失败：" + err);
    }
  };

  const handleImportSuccess = () => {
    // 导入成功后的回调，可以刷新数据
    onRefresh();
    // alert("✓ 导入成功！请刷新页面查看导入的密码");
  };

  const handleChangeMasterPassword = async () => {
    setError("");
    setSuccess("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("请填写所有字段");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("新密码两次输入不一致");
      return;
    }

    if (newPassword.length < 8) {
      setError("新密码至少需要 8 个字符");
      return;
    }

    try {
      await invoke("change_master_password", {
        oldPassword: oldPassword,
        newPassword: newPassword,
      });
      setSuccess("主密码修改成功！2 秒后将自动锁定，请使用新密码重新登录");
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
        <h1>⚙️ 设置</h1>
      </div>


  

      <div className="settings-content">

       <div className="settings-section">
          <h2>🎨 外观设置</h2>
          <div className="setting-item full-width">
            <div className="setting-info">
              <h3>主题</h3>
              <p>选择你喜欢的配色方案</p>
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
          <h2>🔒 安全设置</h2>
          <div className="setting-item">
            <div className="setting-info">
              <h3>主密码</h3>
              <p>用于加密和解密所有密码数据</p>
            </div>
            <button
              className="setting-action-btn"
              onClick={() => setShowChangeMasterPassword(true)}
            >
              更改主密码
            </button>
          </div>

          <div className="setting-item full-width">
            <div className="setting-info">
              <h3>自动锁定</h3>
              <p>一段时间不活动后自动锁定应用（也可以点击侧边栏底部的🔒按钮立即锁定）</p>
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
          <h2>💾 数据管理</h2>
          <div className="setting-item">
            <div className="setting-info">
              <h3>导出数据</h3>
              <p>将所有密码导出为加密备份文件</p>
            </div>
            <button className="setting-action-btn" onClick={handleExportData}>
              📤 导出
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>导入数据</h3>
              <p>从备份文件或 Chrome 导入密码</p>
            </div>
            <button
              className="setting-action-btn"
              onClick={() => setShowImportDialog(true)}
            >
              📥 导入
            </button>
          </div>
        </div>

   

        <div className="settings-section danger-section">
          <h2>⚠️ 危险操作</h2>
          <div className="setting-item">
            <div className="setting-info">
              <h3>清除所有数据</h3>
              <p>删除所有密码和设置，无法恢复</p>
            </div>
            <button className="setting-action-btn danger-btn" disabled>
              清除（即将推出）
            </button>
          </div>
        </div>
      </div>

      {showChangeMasterPassword && (
        <div className="change-password-overlay">
          <div className="change-password-dialog">
            <div className="dialog-header">
              <h2>🔑 更改主密码</h2>
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
                <label>当前主密码</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="输入当前主密码"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>新主密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="至少 8 个字符"
                />
              </div>

              <div className="form-group">
                <label>确认新密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                />
              </div>
            </div>

            <div className="dialog-actions">
              <button
                onClick={() => setShowChangeMasterPassword(false)}
                className="cancel-btn"
              >
                取消
              </button>
              <button onClick={handleChangeMasterPassword} className="confirm-btn">
                确认更改
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
    </div>
  );
}

export default Settings;

