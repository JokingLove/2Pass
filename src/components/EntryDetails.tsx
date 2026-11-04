import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PasswordEntry, PasswordGroup } from "../types";
import { useCopy } from "../hooks/useCopy";
import { canQuickCopy, getQuickCopyLabel, quickCopyActions, type CombineFormat, type QuickCopyAction } from "../utils/quickCopy";
import QuickCopyPicker from "./QuickCopyPicker";
import GaFormatEditor from "./GaFormatEditor";
import TotpDisplay from "./TotpDisplay";
import PasswordHistory from "./PasswordHistory";
import ServiceMark from "./ServiceMark";
import IdentityTag from "./IdentityTag";
import EntryGroupSelect from "./EntryGroupSelect";
import Icon from "./Icon";

interface EntryDetailsProps {
  entry: PasswordEntry;
  groups: PasswordGroup[];
  quickActions: QuickCopyAction[];
  hasCustomActions: boolean;
  onChangeQuickActions: (actions: QuickCopyAction[] | null) => void;
  combineFormat: CombineFormat;
  hasCustomFormat: boolean;
  onChangeCombineFormat: (format: CombineFormat | null) => void;
  openQuickConfig?: boolean;
  onConfigureGa?: () => void;
  onMove?: (id: string, groupId: string | null) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}
function safeUrl(value: string) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
export default function EntryDetails({
  entry, groups, quickActions, hasCustomActions, onChangeQuickActions, combineFormat, hasCustomFormat,
  onChangeCombineFormat, openQuickConfig = false, onConfigureGa, onMove, onEdit, onDelete, onClose,
}: EntryDetailsProps) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const availableActions = quickCopyActions.filter(action => canQuickCopy(entry, action));
  const visibleActions = quickActions.filter(action => availableActions.includes(action));
  const mode = hasCustomActions ? (zh ? "此条目自定义" : "Customized for this item") : (zh ? "跟随列表默认" : "Using list defaults");
  const actionNames = visibleActions.map(action => getQuickCopyLabel(action, zh, combineFormat)).join(zh ? "、" : ", ");
  const hiddenLabel = quickActions.length
    ? (zh ? "此条目没有匹配的字段" : "No matching fields on this item")
    : (zh ? "已隐藏复制按钮" : "Copy buttons hidden");
  const dialog = useRef<HTMLDialogElement>(null);
  const quickConfig = useRef<HTMLDetailsElement>(null);
  const formatPanel = useRef<HTMLDivElement>(null);
  const [quickOpen, setQuickOpen] = useState(openQuickConfig);
  const [formatRevision, setFormatRevision] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [history, setHistory] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const { copiedId, copyToClipboard } = useCopy();
  const copy = async (value: string, id: string) => {
    setCopyError(false);
    try { await copyToClipboard(value, id); } catch { setCopyError(true); }
  };
  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
    return () => { node?.close(); };
  }, []);
  useEffect(() => {
    if (!openQuickConfig || !quickConfig.current) return;
    const panel = quickConfig.current;
    panel.open = true;
    panel.querySelector("summary")?.focus({ preventScroll: true });
    panel.scrollIntoView({ block: "start" });
  }, [openQuickConfig]);

  function showFormatSettings() {
    if (!quickConfig.current) return;
    quickConfig.current.open = true;
    setQuickOpen(true);
    formatPanel.current?.querySelector("button")?.focus({ preventScroll: true });
    formatPanel.current?.scrollIntoView({ block: "start" });
  }

  const gaSetup = (
    <section className="ga-setup">
      <strong><Icon name="shield" size={15} />{zh ? "GA 验证码" : "GA verification code"}</strong>
      <p>{zh ? "添加服务提供的设置密钥，即可在列表复制 GA 或按格式与密码拼接。" : "Add your service’s setup key to copy a GA code or combine it with the password."}</p>
      <button type="button" className="ga-config-link" onClick={onConfigureGa ?? onEdit}>
        {zh ? "配置 GA 验证码" : "Set up GA code"}
      </button>
    </section>
  );
  const copyButton = (id: string, value: string, title: string) => <button type="button" className="vault-icon" title={title} aria-label={title} onClick={() => copy(value, id)}><Icon name={copiedId === id ? "check" : "copy"} size={16} /></button>;
  return <dialog className="vault-detail" ref={dialog} aria-labelledby="vault-detail-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target !== e.currentTarget) return; const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); }}>
    <div className="vault-detail-inner">
      <header className="vault-detail-bar"><span>{zh ? "条目详情" : "Item details"}</span><button className="vault-icon" onClick={onClose} aria-label={t("forms.close")} title={t("forms.close")} autoFocus><Icon name="x" size={19} /></button></header>
      <div className="vault-detail-body">
        <div className="vault-detail-title"><ServiceMark entry={entry} /><div><div className="vault-micro">LOGIN RECORD</div><h2 id="vault-detail-title">{entry.title}</h2></div></div>
        <div className="vault-detail-fields">
          <div className="vault-field"><div><span>{t("passwords.username")}</span><strong>{entry.username || "—"}</strong></div>{entry.username && copyButton("user", entry.username, t("passwords.copyUsername"))}</div>
          <div className="vault-field"><div><span>{t("passwords.password")}</span><code>{reveal ? entry.password : "••••••••••"}</code></div><button className="vault-icon" onClick={() => setReveal(!reveal)} aria-label={t(reveal ? "passwords.hidePassword" : "passwords.showPassword")} title={t(reveal ? "passwords.hidePassword" : "passwords.showPassword")}><Icon name={reveal ? "eye-off" : "eye"} size={16} /></button>{copyButton("password", entry.password, t("passwords.copyPassword"))}</div>
        </div>
        {entry.totp_secret?.trim()
          ? <TotpDisplay secret={entry.totp_secret} password={entry.password} combineFormat={combineFormat} onConfigureGa={onConfigureGa} onChooseFormat={showFormatSettings} />
          : !quickOpen && gaSetup}
        {!!entry.url?.filter(Boolean).length && <div className="vault-detail-line"><h3>{t("passwords.website")}</h3>{entry.url.filter(Boolean).map((url, i) => safeUrl(url) ? <a key={i} href={safeUrl(url)} target="_blank" rel="noopener noreferrer">{url}<Icon name="external-link" size={13} /></a> : <span key={i}>{url}</span>)}</div>}
        {onMove && (groups.length > 0 || entry.group_id) && <label className="vault-detail-line"><span>{t("passwords.group")}</span><EntryGroupSelect groups={groups} groupId={entry.group_id || ""} onChange={id => onMove(entry.id, id || null)} /></label>}
        {!!entry.tags?.length && <div className="vault-detail-line"><h3>{t("passwords.tags")}</h3><div className="vault-tag-list">{entry.tags.map((tag, i) => <IdentityTag key={i} tag={tag} />)}</div></div>}
        {entry.notes && <div className="vault-detail-line"><h3>{t("passwords.notes")}</h3><p>{entry.notes}</p></div>}
        <details className="entry-quick-config" ref={quickConfig} open={quickOpen} onToggle={event => setQuickOpen(event.currentTarget.open)}>
          <summary>
            <Icon name="settings" size={17} />
            <span className="entry-quick-title">
              <strong>{zh ? "行内快捷复制" : "Row copy shortcuts"}</strong>
              <small>{mode} · {actionNames || hiddenLabel}</small>
            </span>
            <Icon name="chevron-right" size={15} />
          </summary>
          <div className="entry-quick-content">
            <p>{zh ? "在列表中显示此条目的复制按钮。修改仅应用于此条目。" : "Choose the copy buttons shown on this item’s row. Changes apply to this item only."}</p>
            {availableActions.length ? (
              <QuickCopyPicker format={combineFormat} actions={visibleActions} available={action => canQuickCopy(entry, action)} onChange={onChangeQuickActions} />
            ) : (
              <p>{zh ? "先为条目添加要复制的字段。" : "Add a field to this item to enable copy shortcuts."}</p>
            )}
            {!entry.totp_secret?.trim() && quickOpen && gaSetup}
            {hasCustomActions && (
              <button type="button" className="entry-quick-reset" onClick={() => onChangeQuickActions(null)}>
                {zh ? "恢复列表默认设置" : "Restore list defaults"}
              </button>
            )}
            <div ref={formatPanel} className="ga-entry-format">
              <p className="ga-inheritance">
                {hasCustomFormat
                  ? (zh ? "拼接格式：此条目自定义" : "Combination format: customized for this item")
                  : (zh ? "拼接格式：跟随列表默认" : "Combination format: using list defaults")}
              </p>
              <GaFormatEditor key={formatRevision} format={combineFormat} onChange={onChangeCombineFormat} />
              {hasCustomFormat && (
                <button type="button" className="entry-quick-reset" onClick={() => {
                  onChangeCombineFormat(null);
                  setFormatRevision(revision => revision + 1);
                }}>
                  {zh ? "恢复默认拼接格式" : "Restore default combination format"}
                </button>
              )}
            </div>
          </div>
        </details>
        <PasswordHistory history={entry.history} updatedAt={entry.updated_at} isExpanded={history} onToggle={() => setHistory(!history)} />
        <span className="vault-sr" role="status">{copiedId ? t("generator.passwordCopied") : ""}</span>
        {copyError && <p role="alert">{zh ? "未能复制，请重试。" : "Couldn’t copy. Try again."}</p>}
      </div>
      <footer className="vault-detail-footer"><button type="button" className="vault-button vault-danger" onClick={onDelete}><Icon name="trash" size={16} />{t("forms.delete")}</button><button type="button" className="vault-button vault-primary" onClick={onEdit}><Icon name="edit" size={16} />{t("forms.edit")}</button></footer>
    </div>
  </dialog>;
}
