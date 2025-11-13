import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { copyToClipboardWithTimeout } from "../utils/clipboard";
import "../styles/TotpDisplay.css";

interface TotpDisplayProps {
  secret: string;
  password: string; // 添加密码参数以显示组合密码
  onCopy?: (code: string) => void;
}

function TotpDisplay({ secret, password, onCopy }: TotpDisplayProps) {
  const { t } = useTranslation();
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
    try {
      await copyToClipboardWithTimeout(code, 30000);
      setCopied(true);
      onCopy?.(code);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error(t("totp.copyFailed") + ":", error);
    }
  };

  const handleCopyCombined = async () => {
    try {
      const combinedPassword = password + code;
      await copyToClipboardWithTimeout(combinedPassword, 30000);
      setCopiedCombined(true);
      setTimeout(() => setCopiedCombined(false), 2000);
    } catch (error) {
      console.error(t("totp.copyCombinedFailed") + ":", error);
    }
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
          <strong>{t("totp.configError")}</strong>
          <p>{error}</p>
          <small>{t("totp.configErrorHint")}</small>
        </div>
      </div>
    );
  }

  return (
    <div className="totp-display">
      <div className="totp-section-header">
        <span className="section-label">{t("totp.title")}</span>
      </div>
      
      <div className="totp-code-container">
        <span className="totp-code">{code}</span>
        <button
          onClick={handleCopy}
          className="totp-copy-btn"
          title={t("totp.copyCodeOnly")}
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
        <div className="combined-label">🔗 {t("totp.combinedPassword")}</div>
        <div className="combined-password-row">
          <code className="combined-code">
            {showCombined ? combinedPassword : "••••••••••••••"}
          </code>
          <div className="combined-actions">
            <button
              onClick={() => setShowCombined(!showCombined)}
              className="combined-action-btn"
              title={showCombined ? t("passwords.hidePassword") : t("passwords.showPassword")}
            >
              {showCombined ? "🙈" : "👁️"}
            </button>
            <button
              onClick={handleCopyCombined}
              className="combined-action-btn"
              title={t("totp.copyCombined")}
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

