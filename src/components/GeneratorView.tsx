import { useState } from "react";
import PasswordGenerator from "./PasswordGenerator";
import "../styles/GeneratorView.css";

function GeneratorView() {
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = (password: string) => {
    setGeneratedPassword(password);
    setCopied(false);
  };

  const copyPassword = async () => {
    if (generatedPassword) {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="generator-view-container">
      <div className="generator-view-header">
        <h1>🎲 密码生成器</h1>
        <p>生成安全的随机密码</p>
      </div>

      <div className="generator-view-content">
        <div className="generator-card">
          <PasswordGenerator onGenerate={handleGenerate} />
        </div>

        {generatedPassword && (
          <div className="result-card">
            <h2>生成的密码</h2>
            <div className="password-result">
              <code className="result-password">{generatedPassword}</code>
              <button onClick={copyPassword} className="copy-result-btn">
                {copied ? "✓ 已复制" : "📋 复制"}
              </button>
            </div>
            <p className="result-hint">
              💡 你也可以在添加密码时使用密码生成器
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GeneratorView;

