import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import type { PasswordEntry, PasswordGroup } from "../types";
import { highlightText } from "../utils/clipboard";
import { getQuickCopyLabel, type CombineFormat, type QuickCopyAction } from "../utils/quickCopy";
import { identityTone } from "../utils/identityColors";
import IdentityTag from "./IdentityTag";
import GroupSymbol from "./GroupSymbol";
import ServiceMark from "./ServiceMark";
import InlineGaCopy from "./InlineGaCopy";
import Icon from "./Icon";

const actionIcons: Record<QuickCopyAction, string> = {
  username: "user",
  password: "key",
  totp: "shield",
  combined: "lock",
  url: "globe",
  notes: "copy",
};

function websiteHost(value: string) {
  const candidate = value.trim();
  if (!candidate || /\s/.test(candidate)) return "";
  try {
    const hasScheme = /^[a-z][a-z\d+.\-]*:/i.test(candidate) && !/^[^/?#:]+:\d+(?:[/?#]|$)/.test(candidate);
    const url = new URL(hasScheme ? candidate : "https://" + candidate.replace(/^\/\//, ""));
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.host.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

export function identifyEntry(entry: PasswordEntry, showDomain: boolean, zh: boolean) {
  const site = (entry.url ?? []).map(websiteHost).find(Boolean) || "";
  const username = entry.username.trim();
  const title = entry.title.trim() || site || username || (zh ? "未命名条目" : "Untitled item");
  const lowerTitle = title.toLocaleLowerCase();
  const account = username.toLocaleLowerCase() === lowerTitle ? "" : username;
  const repeatsTitle = websiteHost(title) === site;
  const domain = showDomain && !repeatsTitle && site !== account.toLocaleLowerCase() ? site : "";
  return { title, account, domain };
}

interface RowProps {
  entry: PasswordEntry;
  identity: ReturnType<typeof identifyEntry>;
  duplicate?: string;
  group?: PasswordGroup;
  showGroup: boolean;
  showUpdated: boolean;
  showActions: boolean;
  showGaDigits: boolean;
  combineFormat: CombineFormat;
  actions: QuickCopyAction[];
  tags: string[];
  dateFormat: Intl.DateTimeFormat;
  term: string;
  checked: boolean;
  manage: boolean;
  canSort: boolean;
  copied: string | null;
  onOpen: () => void;
  onCustomize: () => void;
  onSelect: () => void;
  onCopy: (action: QuickCopyAction) => void;
}

export default function VaultEntryRow({
  entry, identity, duplicate, group, showGroup, showUpdated, showActions,
  actions, tags, dateFormat, term, checked, manage, canSort, copied, onOpen, onSelect, onCopy,
  showGaDigits, combineFormat, onCustomize,
}: RowProps) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const { title, account, domain } = identity;
  const { setNodeRef, setActivatorNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({
    id: entry.id, disabled: !canSort,
  });
  const updated = new Date(entry.updated_at);
  const validDate = Number.isFinite(updated.getTime()) && entry.updated_at > 0;
  const date = validDate ? dateFormat.format(updated) : "";
  const rowLabel = [title, duplicate, account, domain].filter(Boolean).join(" · ");
  const groupLabel = showGroup ? group?.name : undefined;
  const tone = group ? identityTone(group.id, group.color) : undefined;
  const rowClass = ["vault-row", manage && "is-managing", checked && "is-checked", isDragging && "is-dragging"].filter(Boolean).join(" ");

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 2 : undefined }} className={rowClass}>
      {manage && <input className="vault-checkbox" type="checkbox" aria-label={(zh ? "选择 " : "Select ") + rowLabel} checked={checked} onChange={onSelect} />}
      <button type="button" className="vault-row-main" onClick={manage ? onSelect : onOpen}
        title={rowLabel}
        aria-label={(manage ? (zh ? "切换选择 " : "Toggle selection for ") : (zh ? "查看 " : "View ")) + rowLabel}>
        <ServiceMark entry={entry} />
        <span className="vault-item-text">
          <span className="vault-title-line">
            <strong>{highlightText(title, term)}</strong>
            {duplicate && <small className="vault-duplicate">{duplicate}</small>}
          </span>
          {(account || domain) && <span className="vault-identifiers">
            {account && <span className="vault-account">{highlightText(account, term)}</span>}
            {account && domain && <span aria-hidden="true" className="vault-meta-dot">·</span>}
            {domain && <span className="vault-domain">{highlightText(domain, term)}</span>}
          </span>}
          {tags.length > 0 && <span className="vault-row-tags">
            {tags.slice(0, 2).map(tag => <IdentityTag key={tag} tag={tag} />)}
            {tags.length > 2 && <small className="vault-extra-tags" title={tags.slice(2).join(" · ")}>+{tags.length - 2}</small>}
          </span>}
          {(groupLabel || (showUpdated && date)) && <span className="vault-mobile-meta">
            {groupLabel && <span className="vault-mini-group" data-identity-tone={tone}><GroupSymbol value={group!.icon} size={11} />{groupLabel}</span>}
            {showUpdated && date && <span><Icon name="clock" size={11} />{date}</span>}
          </span>}
        </span>
      </button>
      {showGroup && <div className="vault-row-group">{groupLabel && <span className="vault-group-pill" data-identity-tone={tone} title={groupLabel}><GroupSymbol value={group!.icon} size={12} />{groupLabel}</span>}</div>}
      {showUpdated && <div className="vault-row-date">{date && <time dateTime={updated.toISOString()}>{date}</time>}</div>}
      {manage && canSort && (
        <button type="button" className="vault-icon vault-grip" ref={setActivatorNodeRef} {...attributes} {...listeners}
          title={t("passwords.dragToSort")} aria-label={t("passwords.dragToSort") + " · " + rowLabel}><Icon name="grip" size={17} /></button>
      )}
      {!manage && showActions && (
        <div className="vault-row-actions" data-count={actions.length} data-caption={zh ? "复制" : "Copy"}>
          {actions.map(action => {
            const label = getQuickCopyLabel(action, zh, combineFormat);
            const didCopy = copied === action + "-" + entry.id;
            const copyLabel = zh ? "复制" + label : "Copy " + label;
            if (action === "totp" && showGaDigits && entry.totp_secret) {
              return <InlineGaCopy key={action} secret={entry.totp_secret} label={copyLabel + " · " + rowLabel}
                copied={didCopy} onCopy={() => onCopy(action)} zh={zh} />;
            }
            return (
              <button type="button" className={"vault-quick" + (didCopy ? " is-copied" : "")} key={action}
                title={copyLabel} aria-label={copyLabel + " · " + rowLabel} onClick={() => onCopy(action)}>
                <Icon name={didCopy ? "check" : actionIcons[action]} size={14} /><span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
      {!manage && <button type="button" className="vault-customize" onClick={onCustomize}
        aria-label={(zh ? "自定义快捷复制" : "Customize quick copy") + " · " + rowLabel}
        title={zh ? "自定义快捷复制" : "Customize quick copy"}>
        <Icon name="settings" size={14} /><span>{zh ? "自定义" : "Customize"}</span>
      </button>}
    </li>
  );
}
