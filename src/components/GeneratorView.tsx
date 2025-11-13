import { useState } from "react";
import { useTranslation } from "react-i18next";
import PasswordGenerator from "./PasswordGenerator";
import "../styles/GeneratorView.css";

function GeneratorView() {
  const { t } = useTranslation();
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
        <h1>🎲 {t("generator.title")}</h1>
        <p>{t("about.features.generatorDesc")}</p>
      </div>

      <div className="generator-view-content">
        <div className="generator-card">
          <PasswordGenerator onGenerate={handleGenerate} />
        </div>

        {generatedPassword && (
          <div className="result-card">
            <h2>{t("generator.passwordGenerated")}</h2>
            <div className="password-result">
              <code className="result-password">{generatedPassword}</code>
              <button onClick={copyPassword} className="copy-result-btn">
                {copied ? "✓ " + t("generator.passwordCopied") : "📋 " + t("generator.copy")}
              </button>
            </div>
            <p className="result-hint">
              💡 {t("generator.regenerate")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GeneratorView;

