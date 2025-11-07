import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LoginProps } from "../types";
import "../styles/Login.css";

function Login({ onLogin }: LoginProps) {
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
          setError("密码不匹配");
          setLoading(false);
          return;
        }
        if (masterPassword.length < 8) {
          setError("主密码至少需要8个字符");
          setLoading(false);
          return;
        }
        await invoke("create_master_password", { masterPassword });
        onLogin();
      } else {
        const valid = await invoke<boolean>("verify_master_password", {
          masterPassword,
        });
        if (valid) {
          onLogin();
        } else {
          setError("主密码错误");
        }
      }
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🔐 2Pass</h1>
          <p>{isCreating ? "创建主密码" : "解锁密码库"}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="master-password">主密码</label>
            <input
              id="master-password"
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="输入主密码"
              autoFocus
              required
            />
          </div>

          {isCreating && (
            <div className="form-group">
              <label htmlFor="confirm-password">确认密码</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入主密码"
                required
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="login-button">
            {loading ? "处理中..." : isCreating ? "创建" : "解锁"}
          </button>
        </form>

        {isCreating && (
          <div className="info-box">
            <p>⚠️ 请牢记主密码，丢失后无法恢复</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;

