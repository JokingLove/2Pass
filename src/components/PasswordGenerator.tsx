import { useState } from "react";
import "../styles/PasswordGenerator.css";

interface PasswordGeneratorProps {
  onGenerate: (password: string) => void;
}

function PasswordGenerator({  }: PasswordGeneratorProps) {
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState("");

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
  };

  const copyToClipboard = async () => {
    if (generatedPassword) {
      try {
        await navigator.clipboard.writeText(generatedPassword);
        // 可以添加一个提示，但这里简化处理
      } catch (err) {
        console.error("复制失败:", err);
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

    if (strength <= 2) return { label: "弱", color: "#ff4444" };
    if (strength <= 4) return { label: "中", color: "#ffaa00" };
    return { label: "强", color: "#00aa00" };
  };

  const strength = getPasswordStrength(generatedPassword);

  return (
    <div className="password-generator">
      <h3>🎲 密码生成器</h3>

      <div className="generator-options">
        <div className="option-group">
          <label>
            长度: {length}
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
            大写字母 (A-Z)
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeLowercase}
              onChange={(e) => setIncludeLowercase(e.target.checked)}
            />
            小写字母 (a-z)
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeNumbers}
              onChange={(e) => setIncludeNumbers(e.target.checked)}
            />
            数字 (0-9)
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeSymbols}
              onChange={(e) => setIncludeSymbols(e.target.checked)}
            />
            符号 (!@#$...)
          </label>
        </div>
      </div>

      <div className="generator-actions">
        <button
          type="button"
          onClick={generatePassword}
          className="generate-button"
        >
          生成密码
        </button>
        {generatedPassword && (
          <button
            type="button"
            onClick={copyToClipboard}
            className="copy-button"
            title="复制到剪贴板"
          >
            📋 复制
          </button>
        )}
      </div>

      {generatedPassword && (
        <div className="generated-result">
          <div className="password-display">
            <code>{generatedPassword}</code>
            {strength.label && (
              <span
                className="strength-indicator"
                style={{ color: strength.color }}
              >
                强度: {strength.label}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PasswordGenerator;

