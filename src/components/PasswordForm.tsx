import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { PasswordEntry, PasswordFormProps } from "../types";
import EntryTitleField from "./EntryTitleField";
import EntryGroupSelect from "./EntryGroupSelect";
import IdentityTag from "./IdentityTag";
import PasswordGenerator from "./PasswordGenerator";
import TotpConfig from "./TotpConfig";
import Icon from "./Icon";
import Modal from "./Modal";
import { calculateStrength } from "../utils/passwordStrength";
import "../styles/PasswordForm.css";

export default function PasswordForm({entry, groups, selectedGroupId, onSave, onCancel}: PasswordFormProps) {
  const {t,i18n} = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const [title,setTitle] = useState(entry?.title ?? "");
  const [appearance,setAppearance] = useState<Pick<PasswordEntry, "icon" | "color">>({ icon: entry?.icon, color: entry?.color });
  const [username,setUsername] = useState(entry?.username ?? "");
  const [password,setPassword] = useState(entry?.password ?? "");
  const [group,setGroup] = useState(entry?.group_id ?? selectedGroupId ?? "");
  const [urls,setUrls] = useState(entry?.url?.length ? entry.url : [""]);
  const [notes,setNotes] = useState(entry?.notes ?? "");
  const [tags,setTags] = useState<string[]>(entry?.tags ?? []);
  const [tag,setTag] = useState("");
  const [secret,setSecret] = useState(entry?.totp_secret);
  const [totpOpen,setTotpOpen] = useState(false);
  const [more,setMore] = useState(false);
  const [reveal,setReveal] = useState(false);
  const [generator,setGenerator] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const strength = calculateStrength(password);
  const addTag = () => { if (tag.trim() && !tags.includes(tag.trim())) setTags([...tags,tag.trim()]); setTag(""); };
  const submit = async (event:FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!title.trim() || !username.trim()) {setError(zh ? "请填写名称和用户名。" : "Enter a name and username."); return;}
    setBusy(true); setError("");
    const now = Date.now();
    try {
      await onSave({...entry,id:entry?.id ?? crypto.randomUUID(),title:title.trim(),icon:appearance.icon,color:appearance.color,username:username.trim(),password,notes,
        tags:[...new Set([...tags,tag.trim()].filter(Boolean))],group_id:group || undefined,
        url:urls.map(url => url.trim()).filter(Boolean),totp_secret:secret,created_at:entry?.created_at ?? now,updated_at:now});
    } catch {setError(t("passwords.saveFailed"));} finally {setBusy(false);}
  };
  return <Modal title={entry ? t("passwords.editPassword") : t("passwords.addPassword")} icon="key" busy={busy} onClose={onCancel}>
    <form onSubmit={submit} autoComplete="off">
      <div className="vm-fields">
        <EntryTitleField title={title} urls={urls} appearance={appearance} onTitleChange={setTitle} onAppearanceChange={setAppearance} />
        <label className="vm-field">{t("passwords.username")}<input required value={username} onChange={e=>setUsername(e.target.value)} spellCheck={false} autoCapitalize="none" placeholder={t("passwords.usernamePlaceholder")}/></label>
        <div className="vm-field">
          <div className="pf-password-label"><label htmlFor="entry-password">{t("passwords.password")}</label>
          <button type="button" className="pf-text-action" aria-expanded={generator} onClick={()=>setGenerator(!generator)}><Icon name="generator" size={14}/>{t("generator.generate")}</button></div>
          <div className="vm-row"><input id="entry-password" type={reveal ? "text" : "password"} autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder={t("passwords.passwordPlaceholder")}/>
          <button type="button" className="vm-icon" aria-label={reveal ? t("passwords.hidePassword") : t("passwords.showPassword")} onClick={()=>setReveal(!reveal)}><Icon name={reveal ? "eye-off" : "eye"}/></button></div>
          {password && <div className={`pf-strength ${strength.level}`}><span><i style={{width:strength.percentage+"%"}}/></span>{t("generator.strength.label")} · {t("generator.strength." + (strength.level === "medium" ? "fair" : strength.level))}</div>}
        </div>
        {generator && <PasswordGenerator onGenerate={value=>{setPassword(value); setGenerator(false);}}/>}
        {!!groups.length && <label className="vm-field">{t("passwords.group")}<EntryGroupSelect groups={groups} groupId={group} onChange={setGroup} /></label>}
        <button type="button" aria-expanded={more} className="pf-more" onClick={()=>setMore(!more)}><Icon name="settings" size={16}/><span>{zh ? "更多详情" : "More details"}<small>{zh ? "网址、备注、标签和验证码" : "Websites, notes, tags and verification codes"}</small></span><Icon name={more ? "chevron-down" : "chevron-right"} size={16}/></button>
        {more && <div className="pf-optional">
          <div className="vm-field"><label htmlFor="entry-url-0">{t("passwords.website")}</label>{urls.map((url,i)=><div className="vm-row" key={i}>
            <input id={`entry-url-${i}`} type="url" aria-label={t("passwords.website")+" "+(i+1)} placeholder="https://example.com" value={url} onChange={e=>setUrls(urls.map((v,j)=>j===i?e.target.value:v))}/>
            {urls.length>1 && <button type="button" className="vm-icon" aria-label={t("forms.delete")} onClick={()=>setUrls(urls.filter((_,j)=>j!==i))}><Icon name="x" size={15}/></button>}
          </div>)}<button type="button" className="pf-text-action" onClick={()=>setUrls([...urls,""])}><Icon name="plus" size={14}/>{t("passwords.addWebsite")}</button></div>
          <label className="vm-field">{t("passwords.notes")}<textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder={t("passwords.notesPlaceholder")}/></label>
          <div className="vm-field"><label htmlFor="entry-tag">{t("passwords.tags")}</label><div className="vm-row"><input id="entry-tag" value={tag} onChange={e=>setTag(e.target.value)} onKeyDown={e=>{if(e.key==="Enter" && !e.nativeEvent.isComposing){e.preventDefault();addTag();}}} placeholder={t("passwords.tagPlaceholder")}/>
          <button type="button" className="vm-icon" aria-label={t("forms.add")} disabled={!tag.trim()} onClick={addTag}><Icon name="plus" size={16}/></button></div>
          {!!tags.length && <div className="pf-chips">{tags.map(v=><IdentityTag key={v} tag={v} onRemove={()=>setTags(tags.filter(tag=>tag!==v))} />)}</div>}</div>
          <button type="button" className="vm-button pf-totp" onClick={()=>setTotpOpen(true)}><Icon name="clock" size={15}/>{secret ? t("totp.manage") : t("totp.addTotp")}</button>
        </div>}
        {error && <p role="alert" className="vm-error">{error}</p>}
      </div>
      <div className="vm-actions"><button type="button" disabled={busy} className="vm-button" onClick={onCancel}>{t("forms.cancel")}</button><button className="vm-button is-primary" disabled={busy} type="submit"><Icon name="check" size={15}/>{t("forms.save")}</button></div>
    </form>
    {totpOpen && <TotpConfig currentSecret={secret} accountName={title || t("passwords.account")} onSave={value=>{setSecret(value);setTotpOpen(false);}} onRemove={()=>{setSecret(undefined);setTotpOpen(false);}} onClose={()=>setTotpOpen(false)}/>}
  </Modal>;
}
