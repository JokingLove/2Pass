import { useState } from "react";
import { invoke } from "../utils/commands";
import { useTranslation } from "react-i18next";
import { useCopy } from "../hooks/useCopy";
import { useGaCode } from "../hooks/useGaCode";
import { defaultCombineFormat, formatCombined, getQuickCopyLabel, type CombineFormat } from "../utils/quickCopy";
import Icon from "./Icon";
import "../styles/TotpDisplay.css";

interface TotpDisplayProps {
  secret: string;
  password: string;
  combineFormat?: CombineFormat;
  onConfigureGa?: () => void;
  onChooseFormat?: () => void;
  onCopy?: (code: string) => void;
}

export default function TotpDisplay({ secret, password, onCopy, combineFormat = defaultCombineFormat, onConfigureGa, onChooseFormat }: TotpDisplayProps) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const { copyToClipboard, isCopied } = useCopy();
  const { code, error, secondsLeft: left } = useGaCode(secret);
  const [copyError, setCopyError] = useState(false);
  const [showCombined, setShowCombined] = useState(false);
  const copy = async (combined: boolean) => {
    setCopyError(false);
    try {
      const fresh = await invoke<string>("generate_totp", { secret });
      const value = combined ? formatCombined(password, fresh, combineFormat) : fresh;
      await copyToClipboard(value, combined ? "combined" : "otp");
      if (!combined) onCopy?.(fresh);
    } catch { setCopyError(true); }
  };
  const comboLabel = getQuickCopyLabel("combined", zh, combineFormat);
  const copyCombo = zh ? `复制${comboLabel}` : `Copy ${comboLabel}`;
  const revealCombo = showCombined ? (zh ? "隐藏拼接结果" : "Hide combined value") : (zh ? "查看拼接结果" : "Reveal combined value");
  return <section className="v-otp">
    <div className="v-otp-head"><span><Icon name="shield" size={15} />{zh ? "GA 验证码" : "GA code"}</span><div className="v-otp-utilities">
      {onConfigureGa && <button type="button" className="ga-config-link" onClick={onConfigureGa}>{zh ? "管理" : "Manage"}</button>}
      {!error && <small>{left}s</small>}</div></div>
    {error ? <p role="alert">{t("totp.configErrorHint")}</p> : <>
      <div className="v-otp-code">
        <code>{code ? code.slice(0, 3) + " " + code.slice(3) : "••• •••"}</code>
        <button className="vault-icon" type="button" disabled={!code} aria-label={t("totp.copyCodeOnly")} title={t("totp.copyCodeOnly")} onClick={() => copy(false)}><Icon name={isCopied("otp") ? "check" : "copy"} size={16} /></button>
      </div>
      <div className="v-otp-time"><span style={{ width: left / 30 * 100 + "%" }} /></div>
      {password && <div className="v-otp-combined">
        <span>{comboLabel}</span>
        {onChooseFormat && <button className="ga-config-link" type="button" onClick={onChooseFormat}>{zh ? "拼接格式" : "Format"}</button>}
        <button className="vault-icon" type="button" disabled={!code} aria-label={revealCombo} title={revealCombo} aria-pressed={showCombined} onClick={() => setShowCombined(!showCombined)}><Icon name={showCombined ? "eye-off" : "eye"} size={15} /></button>
        <button className="vault-icon" type="button" disabled={!code} aria-label={copyCombo} title={copyCombo} onClick={() => copy(true)}><Icon name={isCopied("combined") ? "check" : "copy"} size={15} /></button>
      </div>}
      {password && code && showCombined && <code className="v-otp-secret">{formatCombined(password, code, combineFormat)}</code>}
      {copyError && <p role="alert">{zh ? "未能复制，请重试。" : "Couldn’t copy. Try again."}</p>}
    </>}
    <span className="vault-sr" role="status">{isCopied("combined") || isCopied("otp") ? t("generator.passwordCopied") : ""}</span>
  </section>;
}
