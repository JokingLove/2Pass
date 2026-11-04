import { useCallback, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DndContext, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PasswordGroup } from "../types";
import ConfirmDialog from "./ConfirmDialog";
import FolderActionMenu, { type FolderAction } from "./FolderActionMenu";
import { identityTone } from "../utils/identityColors";
import Icon from "./Icon";
import GroupSymbol from "./GroupSymbol";
import "../styles/GroupList.css";

interface GroupListProps {
  groups: PasswordGroup[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onAddGroup: () => void;
  onEditGroup: (group: PasswordGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onUpdateGroupOrder: (groups: PasswordGroup[]) => void;
  entryCountByGroup: Record<string, number>;
  hideAll?: boolean;
}

type OpenMenu = { groupId: string; anchor: HTMLButtonElement; initialFocus: "first" | "last" };
interface GroupRowProps {
  group: PasswordGroup;
  count: number;
  active: boolean;
  menuId: string;
  open: boolean;
  select: () => void;
  toggleMenu: (menu: OpenMenu) => void;
}

function GroupRow({ group, count, active, menuId, open, select, toggleMenu }: GroupRowProps) {
  const { i18n } = useTranslation();
  const label = (i18n.language.startsWith("zh") ? "管理分组" : "Manage group") + " · " + group.name;
  const { setNodeRef, setActivatorNodeRef, transform, transition, listeners, isDragging } = useSortable({ id: group.id, disabled: open });
  const tone = identityTone(group.id, group.color);
  const rowClass = ["vault-folder-row", active && "is-active", open && "menu-open", isDragging && "is-dragging"].filter(Boolean).join(" ");

  return (
    <div ref={setNodeRef} className={rowClass} data-identity-tone={tone}
      style={{ transform: CSS.Transform.toString(transform), transition }}>
      <button className="vault-folder-select" type="button" aria-current={active ? "page" : undefined}
        ref={setActivatorNodeRef} {...listeners} onClick={select} title={group.name}>
        <span className="vault-folder-chip" data-identity-tone={tone}><GroupSymbol value={group.icon} size={15} /></span>
        <span className="vault-folder-name">{group.name}</span>
        <small className="vault-folder-count">{count}</small>
      </button>
      <button className="vault-folder-more" type="button" aria-haspopup="menu" aria-expanded={open}
        aria-controls={open ? menuId : undefined} title={label} aria-label={label}
        onClick={event => toggleMenu({ groupId: group.id, anchor: event.currentTarget, initialFocus: "first" })}
        onKeyDown={event => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          toggleMenu({ groupId: group.id, anchor: event.currentTarget, initialFocus: event.key === "ArrowUp" ? "last" : "first" });
        }}>
        <Icon name="more-horizontal" size={16} />
      </button>
    </div>
  );
}

export default function GroupList({
  groups, selectedGroupId, onSelectGroup, onAddGroup, onEditGroup, onDeleteGroup, onUpdateGroupOrder, entryCountByGroup, hideAll = false,
}: GroupListProps) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const [expanded, setExpanded] = useState(true);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const [confirm, setConfirm] = useState<PasswordGroup | null>(null);
  const sectionToggle = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const menuId = useId();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 7 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 7 } }),
  );

  const closeMenu = useCallback((restore: boolean) => {
    if (restore) menu?.anchor.focus({ preventScroll: true });
    setMenu(null);
  }, [menu]);
  const toggleMenu = (next: OpenMenu) => { if (menu?.groupId === next.groupId) closeMenu(true); else setMenu(next); };
  const reorder = (from: number, to: number) => {
    if (from < 0 || to < 0 || to >= groups.length || from === to) return;
    onUpdateGroupOrder(arrayMove(groups, from, to).map((group, index) => ({ ...group, sort_order: index })));
  };
  const index = menu ? groups.findIndex(group => group.id === menu.groupId) : -1;
  const menuGroup = groups[index];
  const groupAction = (action: FolderAction) => {
    if (!menuGroup || !menu) return;
    const trigger = menu.anchor;
    closeMenu(true);
    if (action === "edit") onEditGroup(menuGroup);
    else if (action === "delete") setConfirm(menuGroup);
    else {
      reorder(index, index + (action === "up" ? -1 : 1));
      requestAnimationFrame(() => { if (document.activeElement === document.body) trigger.focus({ preventScroll: true }); });
    }
  };
  const hasEntries = !!(confirm && entryCountByGroup[confirm.id]);
  const deleteOrDismiss = async () => {
    const target = confirm;
    setConfirm(null);
    if (!target || hasEntries) return;
    await onDeleteGroup(target.id);
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) sectionToggle.current?.focus({ preventScroll: true });
    });
  };
  const addGroup = () => { setExpanded(true); onAddGroup(); };

  return (
    <section className="vault-folders" aria-label={t("groups.title")}>
      <header className="vault-folders-head">
        <h2>
          <button ref={sectionToggle} type="button" className="vault-folders-toggle" aria-expanded={expanded} aria-controls={listId}
            onClick={() => { setExpanded(!expanded); closeMenu(false); }}>
            <Icon name="chevron-right" size={12} /><span>{zh ? "我的分组" : "My folders"}</span>
            <small>{groups.length}</small>
          </button>
        </h2>
        <button type="button" className="vault-folder-add" aria-label={t("groups.addGroup")} title={t("groups.addGroup")} onClick={addGroup}>
          <Icon name="plus" size={16} />
        </button>
      </header>
      <div id={listId} className="vault-folder-list" hidden={!expanded}>
        {!hideAll && <div className={"vault-folder-row" + (!selectedGroupId ? " is-active" : "")}>
          <button type="button" className="vault-folder-select" onClick={() => onSelectGroup(null)} aria-current={!selectedGroupId ? "page" : undefined}>
            <span className="vault-folder-chip"><Icon name="vault" size={15} /></span>
            <span className="vault-folder-name">{t("passwords.allPasswords")}</span>
            <small className="vault-folder-count">{Object.values(entryCountByGroup).reduce((a, n) => a + n, 0)}</small>
          </button>
        </div>}
        {!groups.length ? <button className="vault-folder-new" onClick={addGroup}><Icon name="folder" size={15} />{zh ? "创建第一个分组" : "Create a folder"}</button> : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
            if (over) reorder(groups.findIndex(g => g.id === active.id), groups.findIndex(g => g.id === over.id));
          }}>
            <SortableContext items={groups.map(group => group.id)} strategy={verticalListSortingStrategy}>
              {groups.map(group => <GroupRow key={group.id} group={group} count={entryCountByGroup[group.id] || 0}
                active={selectedGroupId === group.id} open={menu?.groupId === group.id} menuId={menuId}
                select={() => onSelectGroup(group.id)} toggleMenu={toggleMenu} />)}
            </SortableContext>
          </DndContext>
        )}
      </div>
      {expanded && menu && menuGroup && <FolderActionMenu id={menuId} groupName={menuGroup.name} anchor={menu.anchor}
        initialFocus={menu.initialFocus} first={index === 0} last={index === groups.length - 1}
        onAction={groupAction} onDismiss={closeMenu} />}
      {confirm && <ConfirmDialog title={t(hasEntries ? "groups.cannotDeleteGroup" : "groups.deleteGroup")}
        message={t(hasEntries ? "groups.groupHasPasswords" : "groups.confirmDeleteGroup", { groupName: confirm.name, count: entryCountByGroup[confirm.id] })}
        type={hasEntries ? "warning" : "danger"} confirmText={t(hasEntries ? "common.understood" : "forms.delete")}
        cancelText={hasEntries ? "" : t("forms.cancel")} onConfirm={deleteOrDismiss} onCancel={() => setConfirm(null)} />}
    </section>
  );
}
