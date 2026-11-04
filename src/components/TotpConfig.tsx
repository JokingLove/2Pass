import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { invoke } from "../utils/commands";
import { useCopy } from "../hooks/useCopy";
import Modal from "./Modal";
import Icon from "./Icon";
import "../styles/TotpConfig.css";

interface TotpConfigProps {
  currentSecret?:string; accountName:string; onSave:(secret:string)=>void|Promise<void>; onRemove:()=>void|Promise<void>; onClose:()=>void;
}
export default function TotpConfig({currentSecret,accountName,onSave,onRemove,onClose}:TotpConfigProps) {
  const {t,i18n} = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const [secret,setSecret] = useState(currentSecret || "");
  const [draft,setDraft] = useState("");
  const [qr,setQr] = useState("");
  const [code,setCode] = useState("");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const {copyToClipboard,isCopied} = useCopy();
  useEffect(()=>{
    if(!secret) return;
    let active = true;
    setQr("");
    invoke<string>("get_totp_qr_url",{secret,accountName,issuer:"2Pass"})
      .then(url=>{if(active) setQr(url);}).catch(()=>{if(active) setError(t("totp.configError"));});
    return ()=>{active=false;};
  },[secret,accountName,t]);
  useEffect(()=>{
    if(!code) return;
    const timer=window.setTimeout(()=>setCode(""),30000 - Date.now()%30000);
    return ()=>window.clearTimeout(timer);
  },[code]);
  const preview = async (newKey:boolean) => {
    setError("");setBusy(true);
    try {
      const key = newKey ? await invoke<string>("generate_totp_secret") : draft.replace(/\s/g,"").toUpperCase();
      if(!/^[A-Z2-7]+={0,6}$/.test(key) || key.length > 256) throw new Error();
      const result = await invoke<string>("generate_totp",{secret:key});
      setSecret(key);setCode(result);setDraft("");
    } catch { setError(zh ? "密钥无效，请检查 Base32 字符后重试。" : "Invalid key. Check the Base32 characters and try again."); }
    finally {setBusy(false);}
  };
  async function commit(remove: boolean) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (remove) await onRemove();
      else await onSave(secret);
    } catch {
      setError(zh ? "GA 配置未保存，请重试。" : "Could not save the GA settings. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return <Modal title={zh ? "配置 Google 验证码（GA）" : "Set up Google Authenticator (GA)"} icon="clock" busy={busy} onClose={onClose}>
    <div className="vm-fields">
      {!secret ? <>
        <label className="vm-field">{zh ? "输入服务提供的设置密钥" : "Enter the setup key from your service"}<input autoCapitalize="characters" autoComplete="off" spellCheck={false} autoFocus value={draft} onChange={e=>setDraft(e.target.value)} placeholder={t("totp.enterBase32Key")}/></label>
        <div className="totp-setup-actions"><button className="vm-button is-primary" disabled={!draft.trim() || busy} onClick={()=>preview(false)}>{t("totp.apply")}</button><button className="vm-button" disabled={busy} onClick={()=>preview(true)}>{t("totp.generateSecret")}</button></div>
      </> : <>
        <div className="totp-setup-card">
          {qr && <div aria-label={t("totp.scanQRCode")} className="totp-setup-qr"><QRCodeSVG value={qr} size={132} marginSize={4}/></div>}
          <div><b>{accountName}</b><p className="vm-muted">{t("totp.scanQRCodeHint")}</p></div>
        </div>
        <div className="vm-field"><span>{t("totp.secretInfo")}</span><div className="vm-row"><code className="totp-setup-key">{secret.match(/.{1,4}/g)?.join(" ")}</code><button type="button" className="vm-icon" aria-label={t("generator.copy")} onClick={()=>copyToClipboard(secret,"setup").catch(()=>setError(t("totp.copyFailed")))}><Icon name={isCopied("setup")?"check":"copy"} size={16}/></button></div></div>
        <div className="totp-setup-actions"><button className="vm-button" onClick={async()=>{try{setCode(await invoke<string>("generate_totp",{secret}));}catch{setError(t("totp.configError"));}}}>{t("totp.testCode")}</button>
        {code && <code className="totp-setup-code">{code}</code>}</div>
      </>}
      {error && <p role="alert" className="vm-error">{error}</p>}
    </div>
    <div className="vm-actions">{currentSecret && <button className="vm-button is-danger totp-remove" disabled={busy} onClick={()=>commit(true)}>{t("forms.delete")}</button>}
      <button className="vm-button" disabled={busy} onClick={onClose}>{t("forms.cancel")}</button>
      {secret && <button className="vm-button is-primary" disabled={busy} onClick={()=>commit(false)}>{t("totp.saveConfig")}</button>}
    </div>
  </Modal>;
}
