import { useTranslation } from "react-i18next";
import { version } from "../../package.json";
import Icon from "./Icon";
import VaultMark from "./VaultMark";
import ToolPage, { useToolText } from "./ToolPage";
import "../styles/About.css";

export default function About() {
  const { t } = useTranslation();
  const label = useToolText();
  return (
    <ToolPage title={label("关于 2Pass", "About 2Pass")} code="PRODUCT INFORMATION">
      <article className="about-sheet">
        <header className="about-profile">
          <div className="about-sign"><VaultMark width={43} height={43}/></div>
          <div><h2>2Pass</h2><p>{label("本地密码管理器", "Local password manager")}</p></div>
          <span className="about-version">v{version}</span>
        </header>
        <p className="about-intro">{label("2Pass 将账号、密码和动态验证码保存在设备上的加密保险库中。桌面应用无需注册，也无需连接云服务。", "The 2Pass desktop app keeps accounts, passwords, and verification codes in an encrypted vault on your device. No account or cloud service is required.")}</p>
        <dl className="about-specs">
          <div><dt>{label("保险库加密", "Vault encryption")}</dt><dd>AES-256-GCM</dd></div>
          <div><dt>{label("主密码派生", "Key derivation")}</dt><dd>Argon2id</dd></div>
          <div><dt>{label("动态验证码", "Verification codes")}</dt><dd>TOTP</dd></div>
          <div><dt>{label("开源许可", "License")}</dt><dd>{t("about.license")}</dd></div>
        </dl>
        <footer><Icon name="shield" size={18} /><p>{label("请妥善保管主密码，并在设置中定期导出加密备份。", "Keep your master password safe and regularly export an encrypted backup from Settings.")}</p></footer>
      </article>
    </ToolPage>
  );
}
