import { useMemo, useRef, useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useTranslation } from "react-i18next";
import type { PasswordListProps, PasswordEntry, PasswordGroup } from "../types";
import { useKeyboard } from "../hooks/useKeyboard";
import { useCopy } from "../hooks/useCopy";
import { useVaultListPreferences } from "../hooks/useVaultListPreferences";
import { canQuickCopy, getQuickCopyLabel, resolveQuickCopy, type QuickCopyAction } from "../utils/quickCopy";
import VaultListDisplay from "./VaultListDisplay";
import VaultEntryRow, { identifyEntry } from "./VaultEntryRow";
import EntryDetails from "./EntryDetails";
import ConfirmDialog from "./ConfirmDialog";
import Icon from "./Icon";
import "../styles/PasswordList.css";

type Sort = "custom" | "name" | "recent";

function byOrder(a: PasswordEntry, b: PasswordEntry) {
  return (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity) || a.created_at - b.created_at;
}

export default function PasswordList({ entries, allEntries = entries, groups = [], selectedGroupId, searchTerm, onSearchChange, onAdd, onEdit, onConfigureGa, onDelete, onMoveToGroup, onUpdateOrder }: PasswordListProps & { onConfigureGa?: (entry: PasswordEntry) => void; allEntries?: PasswordEntry[]; groups?: PasswordGroup[]; selectedGroupId?: string | null }) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const search = useRef<HTMLInputElement>(null);
  const [sort, setSort] = useState<Sort>("custom");
  const [tag, setTag] = useState("");
  const [otpOnly, setOtpOnly] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const { preferences, setPreferences, getActions, hasEntryActions, setEntryActions, getCombineFormat, setEntryFormat, hasEntryFormat } = useVaultListPreferences();
  const [manage, setManage] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [openQuickConfig, setOpenQuickConfig] = useState(false);
  const [deleting, setDeleting] = useState<PasswordEntry[]>([]);
  const [error, setError] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const { copiedId, copyToClipboard } = useCopy();
  const [copiedAction, setCopiedAction] = useState<QuickCopyAction | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const group = groups.find(g => g.id === selectedGroupId);
  const groupMap = new Map(groups.map(g => [g.id, g]));
  const allTags = [...new Set(entries.flatMap(e => e.tags || []))].filter(Boolean).sort();
  const q = searchTerm.trim().toLocaleLowerCase();
  const sortEntries = (a: PasswordEntry, b: PasswordEntry) => sort === "custom" ? byOrder(a, b) : sort === "name" ? a.title.localeCompare(b.title, i18n.language) : b.updated_at - a.updated_at;
  const filtered = entries.filter(e => (!otpOnly || e.totp_secret) && (!tag || e.tags?.includes(tag)) && (!q || [e.title, e.username, e.notes, ...(e.url || []), ...(e.tags || [])].some(v => v?.toLocaleLowerCase().includes(q)))).sort(sortEntries);
  const showGroup = !selectedGroupId && preferences.showGroup && filtered.some(entry => groupMap.has(entry.group_id || ""));
  const showUpdated = preferences.showUpdated && filtered.some(entry => entry.updated_at > 0);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(i18n.language, {
    year: "numeric", month: "short", day: "numeric",
  }), [i18n.language]);
  const identities = useMemo(() => {
    const result = new Map<string, ReturnType<typeof identifyEntry> & { duplicate?: string }>();
    const matching = new Map<string, string[]>();
    for (const entry of entries) {
      const identity = identifyEntry(entry, preferences.showDomain, zh);
      result.set(entry.id, identity);
      const key = JSON.stringify(Object.values(identity).map(value => value.toLocaleLowerCase()));
      const siblings = matching.get(key);
      if (siblings) siblings.push(entry.id);
      else matching.set(key, [entry.id]);
    }
    // Keep identical entries distinguishable, even when a search hides a sibling.
    for (const siblings of matching.values()) {
      if (siblings.length < 2) continue;
      siblings.sort().forEach((id, index) => { result.get(id)!.duplicate = "#" + (index + 1); });
    }
    return result;
  }, [entries, preferences.showDomain, zh]);
  const rows = filtered.map(entry => {
    const group = groupMap.get(entry.group_id || "");
    const tags = preferences.showTags ? [...new Set(entry.tags?.map(tag => tag.trim()).filter(Boolean))] : [];
    const visibleGroupName = (showGroup || selectedGroupId) ? group?.name.trim().toLocaleLowerCase() : undefined;
    const visibleTags = tags.filter(tag => tag.toLocaleLowerCase() !== visibleGroupName);
    return {
      entry,
      group,
      identity: identities.get(entry.id)!,
      actions: getActions(entry.id).filter(action => canQuickCopy(entry, action)),
      tags: visibleTags,
    };
  });
  const maxActions = rows.reduce((max, row) => Math.max(max, row.actions.length), 0);
  const otpCount = entries.filter(e => e.totp_secret).length;
  const detail = entries.find(e => e.id === detailId);
  const canSort = manage && !q && !tag && !otpOnly && sort === "custom" && !savingOrder && entries.length > 1;
  const checked = filtered.filter(e => selected.includes(e.id));
  const toggleManage = () => { setManage(!manage); setSelected([]); setError(""); };
  const reset = () => { setTag(""); setOtpOnly(false); onSearchChange(""); setSelected([]); };
  const reorder = async ({ active, over }: DragEndEvent) => {
    if (!canSort || !over || active.id === over.id) return;
    const a = filtered.findIndex(e => e.id === active.id), b = filtered.findIndex(e => e.id === over.id);
    if (a < 0 || b < 0) return;
    setSavingOrder(true);
    try {
      const inOrder = arrayMove(filtered, a, b);
      // Reorder only the visible subset within the original global slots.
      const members = new Set(inOrder.map(e => e.id));
      let next = 0;
      const ranked = [...allEntries].sort(byOrder).map((e, rank) => {
        const item = members.has(e.id) ? inOrder[next++] : e;
        return item.sort_order === rank ? null : { ...item, sort_order: rank };
      });
      await onUpdateOrder(ranked.filter((e): e is PasswordEntry & { sort_order: number } => e !== null));
    } finally { setSavingOrder(false); }
  };
  const copy = async (entry: PasswordEntry, action: QuickCopyAction) => {
    setError("");
    try {
      const value = await resolveQuickCopy(entry, action, getCombineFormat(entry.id));
      await copyToClipboard(value, action + "-" + entry.id);
      setCopiedAction(action);
    } catch {
      setError(zh ? "未能复制，请打开条目查看详情。" : "Couldn’t copy. Open the item to view its details.");
    }
  };
  const confirmDeletion = async () => {
    const items = deleting;
    setDeleting([]);
    for (const item of items) await onDelete(item.id);
    setSelected([]); setManage(false);
  };
  useKeyboard({
    onNew: () => { if (!detail && !deleting.length && !document.querySelector('[role="dialog"], dialog[open], .modal-overlay, .form-overlay')) onAdd(); },
    onSearch: () => { if (!detail && !deleting.length && !document.querySelector('[role="dialog"], dialog[open], .modal-overlay, .form-overlay')) search.current?.focus(); },
    onEscape: () => { if (deleting.length) setDeleting([]); else if (manage && !detail && !displayOpen && !document.querySelector("dialog[open]")) { setManage(false); setSelected([]); } },
  });
  const selectLabel = zh ? "选择条目" : "Select items";
  const selectedAll = checked.length > 0 && checked.length === filtered.length;
  return <div className="vault-index">
    <header className="vault-heading">
      <div><div className="vault-micro vault-eyebrow"><span />CREDENTIAL INDEX</div><h1>{group?.name || t("passwords.allPasswords")}</h1></div>
      <button type="button" className="vault-button vault-primary" onClick={onAdd}><Icon name="plus" size={17} />{zh ? "新建密码" : "New password"}</button>
    </header>
    <div className="vault-categories" aria-label={zh ? "凭据筛选" : "Item filters"}>
      <button type="button" className={!otpOnly ? "is-active" : ""} aria-pressed={!otpOnly} onClick={() => { setOtpOnly(false); setSelected([]); }}><Icon name="key" size={15} />{zh ? "全部条目" : "All items"}<span>{entries.length}</span></button>
      <button type="button" className={otpOnly ? "is-active" : ""} aria-pressed={otpOnly} onClick={() => { setOtpOnly(true); setSelected([]); }}><Icon name="shield" size={15} />{zh ? "已配置 GA" : "GA-enabled"}<span>{otpCount}</span></button>
    </div>
    <div className="vault-toolbar">
      <div className="vault-search" role="search"><Icon name="search" size={17} /><input ref={search} type="search" value={searchTerm} onChange={e => { onSearchChange(e.target.value); setSelected([]); }} placeholder={zh ? "搜索名称、账户或网站…" : "Search names, accounts or websites…"} aria-label={t("passwords.search")} />{searchTerm ? <button className="vault-icon" type="button" aria-label={zh ? "清除搜索" : "Clear search"} onClick={() => { onSearchChange(""); search.current?.focus(); }}><Icon name="x" size={14} /></button> : <kbd>{/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ F" : "Ctrl F"}</kbd>}</div>
      {!!allTags.length && <label className={"vault-select" + (tag ? " is-filtered" : "")}><Icon name="tag" size={15} /><select value={tag} aria-label={t("passwords.tags")} onChange={e => { setTag(e.target.value); setSelected([]); }}><option value="">{zh ? "所有标签" : "All tags"}</option>{allTags.map(tg => <option key={tg}>{tg}</option>)}</select><Icon name="chevron-down" size={12} /></label>}
      <label className="vault-select vault-sort"><select value={sort} aria-label={zh ? "排序方式" : "Sort order"} onChange={e => setSort(e.target.value as Sort)}><option value="custom">{zh ? "自定义排序" : "Custom order"}</option><option value="name">{zh ? "按名称" : "By name"}</option><option value="recent">{zh ? "最近更新" : "Last updated"}</option></select><Icon name="chevron-down" size={12} /></label>
      {entries.length > 0 && <button type="button" className={"vault-button vault-manage" + (manage ? " is-active" : "")} title={selectLabel} aria-pressed={manage} onClick={toggleManage}><Icon name={manage ? "x" : "list-checks"} size={16} />{manage ? t("forms.cancel") : (zh ? "管理" : "Manage")}</button>}
      <button type="button" className="vault-button vault-display-trigger" aria-haspopup="dialog" onClick={() => setDisplayOpen(true)}>
        <Icon name="settings" size={16} />{zh ? "列表显示" : "List display"}
      </button>
    </div>
    {error && <p className="vault-error" role="alert">{error}</p>}
    {manage && <div className="vault-selection"><label><input className="vault-checkbox" type="checkbox" checked={selectedAll} disabled={!filtered.length} onChange={() => setSelected(selectedAll ? [] : filtered.map(e => e.id))} />{t("passwords.selectAll")}</label><span>{zh ? "已选 " + checked.length + " 项" : checked.length + " selected"}</span><button className="vault-button vault-danger" disabled={!checked.length} onClick={() => setDeleting(checked)}><Icon name="trash" size={14} />{t("forms.delete")}</button></div>}
    {filtered.length ? <div className="vault-table" data-has-group={showGroup} data-has-date={showUpdated}
      data-copies={manage ? 0 : maxActions} data-manage={manage} data-sortable={canSort}>
      <div className="vault-table-head" aria-hidden="true">
        {manage && <span />}
        <span>{zh ? "登录条目" : "Login item"}</span>
        {showGroup && <span className="vault-row-group">{t("passwords.group")}</span>}
        {showUpdated && <span className="vault-row-date">{zh ? "更新时间" : "Updated"}</span>}
        {!manage && maxActions > 0 && <span className="vault-copy-heading">{zh ? "快捷复制" : "Quick copy"}</span>}
        {!manage && <span className="vault-customize-heading">{zh ? "设置" : "Options"}</span>}
        {canSort && <span>{zh ? "排序" : "Order"}</span>}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
        <SortableContext items={filtered.map(e => e.id)} strategy={verticalListSortingStrategy}>
          <ul className="vault-rows">
            {rows.map(({ entry, identity, actions, group, tags }) => (
              <VaultEntryRow key={entry.id} entry={entry} identity={identity} duplicate={identity.duplicate}
                group={group} tags={tags} dateFormat={dateFormat} showGroup={showGroup} showUpdated={showUpdated}
                actions={actions} showActions={maxActions > 0} term={searchTerm.trim()} checked={selected.includes(entry.id)}
                manage={manage} canSort={canSort} copied={copiedId}
                showGaDigits={preferences.showGaDigits} combineFormat={getCombineFormat(entry.id)}
                onOpen={() => { setOpenQuickConfig(false); setDetailId(entry.id); }}
                onCustomize={() => { setOpenQuickConfig(true); setDetailId(entry.id); }}
                onSelect={() => setSelected(ids => ids.includes(entry.id) ? ids.filter(id => id !== entry.id) : [...ids, entry.id])}
                onCopy={action => copy(entry, action)} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <div className="vault-table-foot"><span>{zh ? "共 " + filtered.length + " 条记录" : filtered.length + (filtered.length === 1 ? " record" : " records")}</span>{savingOrder && <span role="status">{zh ? "正在保存…" : "Saving…"}</span>}</div>
    </div> : <div className="vault-empty"><div className="vault-empty-art" aria-hidden="true"><Icon name={entries.length ? "search" : "vault"} size={31} /></div><h2>{entries.length ? t("passwords.noMatchingPasswords") : (zh ? "密码库中还没有条目" : "No entries here yet")}</h2><p>{entries.length ? (zh ? "试试其他关键词，或清除当前筛选。" : "Try another search or clear your filters.") : (zh ? "保存第一个登录条目，就能在这里查找和复制。" : "Save your first login to find and copy it here.")}</p><button className="vault-button" onClick={entries.length ? reset : onAdd}><Icon name={entries.length ? "x" : "plus"} size={15} />{entries.length ? (zh ? "清除筛选" : "Clear filters") : t("passwords.addPassword")}</button></div>}
    <span className="vault-sr" role="status">{copiedId && copiedAction ? (zh ? "已复制" : "Copied ") + getQuickCopyLabel(copiedAction, zh) : ""}</span>
    {displayOpen && <VaultListDisplay preferences={preferences} onChange={setPreferences} onClose={() => setDisplayOpen(false)} />}
    {detail && <EntryDetails key={detail.id} entry={detail} groups={groups}
      openQuickConfig={openQuickConfig} combineFormat={getCombineFormat(detail.id)} hasCustomFormat={hasEntryFormat(detail.id)}
      onChangeCombineFormat={format => setEntryFormat(detail.id, format)}
      onConfigureGa={onConfigureGa ? () => { setDetailId(null); onConfigureGa(detail); } : undefined}
      quickActions={getActions(detail.id)} hasCustomActions={hasEntryActions(detail.id)}
      onChangeQuickActions={actions => setEntryActions(detail.id, actions)} onMove={onMoveToGroup} onClose={() => setDetailId(null)} onEdit={() => { setDetailId(null); onEdit(detail); }} onDelete={() => { setDetailId(null); setDeleting([detail]); }} />}
    {!!deleting.length && <ConfirmDialog title={t("passwords.deletePassword")} message={deleting.length === 1 ? (zh ? "确定删除「" + deleting[0].title + "」？此操作无法撤销。" : "Delete “" + deleting[0].title + "”? This cannot be undone.") : (zh ? "确定删除已选的 " + deleting.length + " 条密码？此操作无法撤销。" : "Delete " + deleting.length + " selected entries? This cannot be undone.")} type="danger" confirmText={t("forms.delete")} cancelText={t("forms.cancel")} onConfirm={confirmDeletion} onCancel={() => setDeleting([])} />}
  </div>;
}
