import { useState } from "react";
import { useTranslation } from "react-i18next";
import "../styles/PasswordGenerator.css";

interface PasswordGeneratorProps {
  onGenerate: (password: string) => void;
}

function PasswordGenerator({  }: PasswordGeneratorProps) {
  const { t } = useTranslation();
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    let charset = "";
    if (includeUppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (includeLowercase) charset += "abcdefghijklmnopqrstuvwxyz";
    if (includeNumbers) charset += "0123456789";
    if (includeSymbols) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";

    if (charset === "") {
      alert("请至少选择一种字符类型");
      return;
    }

    let password = "";
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }

    setGeneratedPassword(password);
    setCopied(false);
  };

  const copyToClipboard = async () => {
    if (generatedPassword) {
      try {
        await navigator.clipboard.writeText(generatedPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error(t("generator.copy") + " " + t("common.error") + ":", err);
      }
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { label: "", color: "" };
    
    let strength = 0;
    if (password.length >= 12) strength++;
    if (password.length >= 16) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { label: t("generator.strength.weak"), color: "#ff4444" };
    if (strength <= 4) return { label: t("generator.strength.fair"), color: "#ffaa00" };
    return { label: t("generator.strength.strong"), color: "#00aa00" };
  };

  const strength = getPasswordStrength(generatedPassword);

  return (
    <div className="password-generator">
      <h3>🎲 {t("generator.title")}</h3>

      <div className="generator-options">
        <div className="option-group">
          <label>
            {t("generator.length")}: {length}
            <input
              type="range"
              min="8"
              max="32"
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="option-checkboxes">
          <label>
            <input
              type="checkbox"
              checked={includeUppercase}
              onChange={(e) => setIncludeUppercase(e.target.checked)}
            />
            {t("generator.includeUppercase")} (A-Z)
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeLowercase}
              onChange={(e) => setIncludeLowercase(e.target.checked)}
            />
            {t("generator.includeLowercase")} (a-z)
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeNumbers}
              onChange={(e) => setIncludeNumbers(e.target.checked)}
            />
            {t("generator.includeNumbers")} (0-9)
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeSymbols}
              onChange={(e) => setIncludeSymbols(e.target.checked)}
            />
            {t("generator.includeSymbols")} (!@#$...)
          </label>
        </div>
      </div>

      <div className="generator-actions">
        <button
          type="button"
          onClick={generatePassword}
          className="generate-button"
        >
          {t("generator.generate")}
        </button>
      </div>

      {generatedPassword && (
        <div className="generated-result">
          <div className="password-display">
            <div className="password-row">
              <code className="password-code">{generatedPassword}</code>
              <button
                type="button"
                onClick={copyToClipboard}
                className="copy-button"
                title={t("generator.copy")}
              >
                {copied ? "✓ " + t("generator.passwordCopied") : "📋 " + t("generator.copy")}
              </button>
            </div>
            {strength.label && (
              <span
                className="strength-indicator"
                style={{ color: strength.color }}
              >
                {t("generator.strength.label")}: {strength.label}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PasswordGenerator;

