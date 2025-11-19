import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { LoginProps } from "../types";
import "../styles/Login.css";

function Login({ onLogin }: LoginProps) {
  const { t } = useTranslation();
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkMasterPassword();
  }, []);

  const checkMasterPassword = async () => {
    const exists = await invoke<boolean>("check_master_password_exists");
    setIsCreating(!exists);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isCreating) {
        if (masterPassword !== confirmPassword) {
          setError(t("changeMasterPassword.passwordMismatch"));
          setLoading(false);
          return;
        }
        if (masterPassword.length < 8) {
          setError(t("changeMasterPassword.passwordTooShort"));
          setLoading(false);
          return;
        }
        await invoke("create_master_password", { masterPassword });
        // 等待数据加载完成
        await onLogin();
      } else {
        const valid = await invoke<boolean>("verify_master_password", {
          masterPassword,
        });
        if (valid) {
          // 等待数据加载完成
          await onLogin();
        } else {
          setError(t("login.wrongPassword"));
          setLoading(false);
        }
      }
    } catch (err) {
      setError(t("login.loginFailed") + ": " + err);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🔐 2Pass</h1>
          <p>{isCreating ? t("login.createMasterPassword") : t("login.title")}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="master-password">{t("login.masterPassword")}</label>
            <input
              id="master-password"
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder={t("changeMasterPassword.currentPasswordPlaceholder")}
              autoFocus
              required
            />
          </div>

          {isCreating && (
            <div className="form-group">
              <label htmlFor="confirm-password">{t("changeMasterPassword.confirmPassword")}</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("changeMasterPassword.confirmPasswordPlaceholder")}
                required
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className={`login-button ${loading ? 'loading' : ''}`}>
            {loading && <span className="button-spinner"></span>}
            <span>{loading ? t("common.loading") : isCreating ? t("forms.add") : t("login.unlock")}</span>
          </button>
        </form>

        {isCreating && (
          <div className="info-box">
            <p>⚠️ {t("login.rememberPassword")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;

