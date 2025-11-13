import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { useTranslation } from "react-i18next";
import "../styles/About.css";

function About() {
  const { t } = useTranslation();
  const [version, setVersion] = useState(t("about.loading"));

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion(t("about.unknown")));
  }, [t]);

  return (
    <div className="about-container">
      <div className="about-header">
        <div className="about-logo">🔐</div>
        <h1>{t("about.title")}</h1>
        <p className="version">{t("about.version")} {version}</p>
      </div>

      <div className="about-content">
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>{t("about.features.encryption")}</h3>
            <p>{t("about.features.encryptionDesc")}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔑</div>
            <h3>{t("about.features.keyDerivation")}</h3>
            <p>{t("about.features.keyDerivationDesc")}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⏱️</div>
            <h3>{t("about.features.totp")}</h3>
            <p>{t("about.features.totpDesc")}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💾</div>
            <h3>{t("about.features.localStorage")}</h3>
            <p>{t("about.features.localStorageDesc")}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎲</div>
            <h3>{t("about.features.generator")}</h3>
            <p>{t("about.features.generatorDesc")}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>{t("about.features.search")}</h3>
            <p>{t("about.features.searchDesc")}</p>
          </div>
        </div>

        <div className="security-info">
          <h2>🔐 {t("about.security.title")}</h2>
          <ul>
            {(t("about.security.items", { returnObjects: true }) as string[]).map((item: string, index: number) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="footer-info">
          <p>{t("about.footer")}</p>
          <p className="license">{t("about.license")}</p>
        </div>
      </div>
    </div>
  );
}

export default About;

