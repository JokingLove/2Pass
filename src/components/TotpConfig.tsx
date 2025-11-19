import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import "../styles/TotpConfig.css";

interface TotpConfigProps {
  currentSecret?: string;
  accountName: string;
  onSave: (secret: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

function TotpConfig({
  currentSecret,
  accountName,
  onSave,
  onRemove,
  onClose,
}: TotpConfigProps) {
  const { t } = useTranslation();
  const [secret, setSecret] = useState(currentSecret || "");
  const [manualSecret, setManualSecret] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [testCode, setTestCode] = useState("");
  const [testError, setTestError] = useState("");
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);

  useEffect(() => {
    if (currentSecret) {
      setSecret(currentSecret);
      generateQrUrl(currentSecret);
    }
  }, [currentSecret]);

  const validateBase32 = (secret: string): boolean => {
    // Remove spaces and padding
    const clean = secret.replace(/\s/g, '').replace(/=/g, '');
    // Base32 only allows A-Z and 2-7
    const base32Regex = /^[A-Z2-7]+$/;
    return base32Regex.test(clean);
  };

  const generateNewSecret = async () => {
    try {
      const newSecret = await invoke<string>("generate_totp_secret");
      console.log("=== TOTP Secret Generation ===");
      console.log("Generated secret:", newSecret);
      console.log("Secret length:", newSecret.length);
      console.log("Secret type:", typeof newSecret);
      console.log("Is Base32 valid:", validateBase32(newSecret));
      
      // Validate the generated secret
      if (!newSecret || typeof newSecret !== 'string') {
        throw new Error(`Invalid secret type: ${typeof newSecret}`);
      }
      
      if (newSecret.includes('-') || newSecret.includes('_')) {
        throw new Error(`Secret looks like UUID: ${newSecret}`);
      }
      
      if (!validateBase32(newSecret)) {
        throw new Error(`Secret is not valid Base32: ${newSecret}`);
      }
      
      setSecret(newSecret);
      setManualSecret("");
      setShowManualInput(false);
      setTestError("");
      await generateQrUrl(newSecret);
      
      console.log("✓ Secret validated and set successfully");
    } catch (error) {
      console.error("Failed to generate secret:", error);
      setTestError(`${t("totp.generateSecretFailed")}: ${error}`);
    }
  };

  const generateQrUrl = async (secretValue: string) => {
    try {
      const url = await invoke<string>("get_totp_qr_url", {
        secret: secretValue,
        accountName: accountName,
        issuer: "2Pass",
      });
      setQrUrl(url);
    } catch (error) {
      console.error("Failed to generate QR URL:", error);
    }
  };

  const handleManualSecret = () => {
    if (manualSecret.trim()) {
      const cleanSecret = manualSecret.replace(/\s/g, "").toUpperCase();
      setSecret(cleanSecret);
      generateQrUrl(cleanSecret);
      setShowManualInput(false);
    }
  };

  const testTotpCode = async () => {
    if (!secret) {
      setTestError(t("totp.pleaseGenerateSecret"));
      return;
    }
    
    console.log("Testing with secret:", secret);
    console.log("Secret length:", secret.length);
    
    setIsGeneratingTest(true);
    setTestError("");
    setTestCode("");
    
    try {
      const code = await invoke<string>("generate_totp", { secret });
      console.log("Generated code:", code);
      setTestCode(code);
      setTestError("");
      // 30秒后自动清除
      setTimeout(() => {
        setTestCode("");
      }, 30000);
    } catch (error) {
      console.error("Failed to generate TOTP:", error);
      console.error("Secret that failed:", secret);
      setTestError(`${t("totp.generateFailed")}: ${error}`);
      setTestCode("");
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const handleSave = () => {
    if (secret) {
      onSave(secret);
    }
  };

  const formatSecret = (sec: string) => {
    return sec.match(/.{1,4}/g)?.join(" ") || sec;
  };

  return (
    <div className="totp-config-overlay">
      <div className="totp-config-container">
        <div className="totp-config-header">
          <h2>⏱️ {t("totp.configTitle")}</h2>
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>

        <div className="totp-config-content">
          {!currentSecret && (
            <div className="config-section">
              <h3>{t("totp.generateNewSecret")}</h3>
              <button onClick={generateNewSecret} className="generate-btn">
                🔑 {t("totp.generateSecret")}
              </button>
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                className="manual-btn"
              >
                ✍️ {t("totp.manualInput")}
              </button>

              {showManualInput && (
                <div className="manual-input-section">
                  <input
                    type="text"
                    value={manualSecret}
                    onChange={(e) => setManualSecret(e.target.value)}
                    placeholder={t("totp.enterBase32Key")}
                    className="manual-input"
                  />
                  <button onClick={handleManualSecret} className="apply-btn">
                    {t("totp.apply")}
                  </button>
                </div>
              )}
            </div>
          )}

          {secret && (
            <>
              <div className="config-section">
                <h3>{t("totp.secretInfo")}</h3>
                <div className="secret-display">
                  <code>{formatSecret(secret)}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(secret)}
                    className="copy-secret-btn"
                  >
                    📋 {t("generator.copy")}
                  </button>
                </div>
              </div>

              <div className="config-section">
                <h3>{t("totp.scanQRCode")}</h3>
                <p className="info-text">
                  {t("totp.scanQRCodeHint")}
                </p>
                {qrUrl && (
                  <div className="qr-section">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        qrUrl
                      )}`}
                      alt="QR Code"
                      className="qr-code"
                    />
                    <p className="qr-url-text">
                      {t("totp.orManualAccount")}: {accountName}
                    </p>
                  </div>
                )}
              </div>

              <div className="config-section">
                <h3>{t("totp.testCode")}</h3>
                <button 
                  onClick={testTotpCode} 
                  className="test-btn"
                  disabled={isGeneratingTest || !secret}
                >
                  {isGeneratingTest ? "⏳ " + t("totp.generating") : "🧪 " + t("totp.generateTestCode")}
                </button>
                {testCode && (
                  <div className="test-code-display">
                    <span className="test-code">{testCode}</span>
                    <small>{t("totp.codeValidFor30s")}</small>
                  </div>
                )}
                {testError && (
                  <div className="test-error-display">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{testError}</span>
                  </div>
                )}
                {!secret && (
                  <div className="test-hint">
                    💡 {t("totp.testHint")}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="totp-config-actions">
          {currentSecret && (
            <button onClick={onRemove} className="remove-btn">
              🗑️ {t("totp.removeTotp")}
            </button>
          )}
          {secret && (
            <button onClick={handleSave} className="save-btn">
              💾 {t("totp.saveConfig")}
            </button>
          )}
          <button onClick={onClose} className="cancel-btn">
            {t("forms.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TotpConfig;

