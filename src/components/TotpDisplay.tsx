import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "../styles/TotpDisplay.css";

interface TotpDisplayProps {
  secret: string;
  password: string; // 添加密码参数以显示组合密码
  onCopy?: (code: string) => void;
}

function TotpDisplay({ secret, password, onCopy }: TotpDisplayProps) {
  const [code, setCode] = useState("------");
  const [timeLeft, setTimeLeft] = useState(30);
  const [copied, setCopied] = useState(false);
  const [copiedCombined, setCopiedCombined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCombined, setShowCombined] = useState(false);

  useEffect(() => {
    const generateCode = async () => {
      try {
        const newCode = await invoke<string>("generate_totp", { secret });
        setCode(newCode);
        setError(null);
      } catch (err) {
        console.error("Failed to generate TOTP:", err);
        setCode("ERROR");
        setError(String(err));
      }
    };

    // Generate code immediately
    generateCode();

    // Calculate time until next 30-second interval
    const now = Math.floor(Date.now() / 1000);
    const secondsInPeriod = now % 30;
    const initialTimeLeft = 30 - secondsInPeriod;
    setTimeLeft(initialTimeLeft);

    // Set up interval to generate new code every 30 seconds
    const codeInterval = setInterval(generateCode, 30000);

    // Set up interval to update countdown every second
    const countdownInterval = setInterval(() => {
      const currentTime = Math.floor(Date.now() / 1000);
      const remaining = 30 - (currentTime % 30);
      setTimeLeft(remaining);
    }, 1000);

    return () => {
      clearInterval(codeInterval);
      clearInterval(countdownInterval);
    };
  }, [secret]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    onCopy?.(code);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCombined = async () => {
    const combinedPassword = password + code;
    await navigator.clipboard.writeText(combinedPassword);
    setCopiedCombined(true);
    setTimeout(() => setCopiedCombined(false), 2000);
  };

  const getProgressColor = () => {
    if (timeLeft > 20) return "#00aa00";
    if (timeLeft > 10) return "#ffaa00";
    return "#ff4444";
  };

  const progressPercentage = (timeLeft / 30) * 100;
  const combinedPassword = password + code;

  if (error) {
    return (
      <div className="totp-display totp-error">
        <div className="error-icon">⚠️</div>
        <div className="error-message">
          <strong>TOTP 配置错误</strong>
          <p>{error}</p>
          <small>请重新配置 TOTP 或检查密钥格式是否正确（需要 Base32 编码）</small>
        </div>
      </div>
    );
  }

  return (
    <div className="totp-display">
      <div className="totp-section-header">
        <span className="section-label">TOTP 验证码</span>
      </div>
      
      <div className="totp-code-container">
        <span className="totp-code">{code}</span>
        <button
          onClick={handleCopy}
          className="totp-copy-btn"
          title="仅复制验证码"
        >
          {copied ? "✓" : "📋"}
        </button>
      </div>
      
      <div className="totp-timer">
        <div
          className="timer-progress"
          style={{
            width: `${progressPercentage}%`,
            backgroundColor: getProgressColor(),
          }}
        />
        <span className="timer-text">{timeLeft}s</span>
      </div>

      <div className="combined-password-preview">
        <div className="combined-label">🔗 组合密码（密码+验证码）</div>
        <div className="combined-password-row">
          <code className="combined-code">
            {showCombined ? combinedPassword : "••••••••••••••"}
          </code>
          <div className="combined-actions">
            <button
              onClick={() => setShowCombined(!showCombined)}
              className="combined-action-btn"
              title={showCombined ? "隐藏" : "显示"}
            >
              {showCombined ? "🙈" : "👁️"}
            </button>
            <button
              onClick={handleCopyCombined}
              className="combined-action-btn"
              title="复制组合密码"
            >
              {copiedCombined ? "✓" : "📋"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TotpDisplay;

