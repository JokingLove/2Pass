import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import { PasswordGroup } from "../types";
import ConfirmDialog from "./ConfirmDialog";
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
}

// 固定的"全部密码"项
function AllPasswordsItem({ 
  isActive, 
  onClick, 
  totalCount 
}: { 
  isActive: boolean; 
  onClick: () => void;
  totalCount: number;
}) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id: `group-all`,
    data: { groupId: null },
  });

  return (
    <div
      ref={setNodeRef}
      className={`group-item ${isActive ? "active" : ""} ${isOver ? "drop-over" : ""}`}
      onClick={onClick}
    >
      <span className="group-icon">📋</span>
      <span className="group-name">{t("passwords.allPasswords")}</span>
      <span className="group-count">{totalCount}</span>
    </div>
  );
}

// 可排序的分组项
function SortableGroupItem({
  group,
  isActive,
  entryCount,
  onSelect,
  onContextMenu,
}: {
  group: PasswordGroup;
  isActive: boolean;
  entryCount: number;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: group.id,
    data: { type: 'group' }
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `group-${group.id}`,
    data: { groupId: group.id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : (transition || "transform 200ms ease"),
    opacity: isDragging ? 0.5 : 1,
  };

  // 合并两个 ref
  const setRefs = (element: HTMLDivElement | null) => {
    setSortableRef(element);
    setDroppableRef(element);
  };

  return (
    <div
      ref={setRefs}
      style={style}
      className={`group-item ${isActive ? "active" : ""} ${isOver ? "drop-over" : ""} ${isDragging ? "dragging" : ""}`}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      {...attributes}
      {...listeners}
    >
      <span className="group-icon">{group.icon}</span>
      <span className="group-name">{group.name}</span>
      <span className="group-count">{entryCount}</span>
    </div>
  );
}

function GroupList({
  groups,
  selectedGroupId,
  onSelectGroup,
  onAddGroup,
  onEditGroup,
  onDeleteGroup,
  onUpdateGroupOrder,
  entryCountByGroup,
}: GroupListProps) {
  const { t } = useTranslation();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    group: PasswordGroup;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    group: PasswordGroup;
    hasEntries: boolean;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, group: PasswordGroup) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, group });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const totalCount = Object.values(entryCountByGroup).reduce((a, b) => a + b, 0);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveGroupId(event.active.id.toString());
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGroupId(null);

    if (!over || active.id === over.id) {
      return;
    }

    // 只处理分组排序，不处理密码卡片拖到分组
    if (active.data.current?.type !== 'group') {
      return;
    }

    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(groups, oldIndex, newIndex);
      const updatedGroups = reordered.map((group, index) => ({
        ...group,
        sort_order: index,
      }));
      onUpdateGroupOrder(updatedGroups);
    }
  };

  const activeGroup = activeGroupId ? groups.find((g) => g.id === activeGroupId) : null;

  return (
    <div className="group-list" onClick={closeContextMenu}>
      <div className="group-list-header">
        <h3>{t("groups.title")}</h3>
        <button onClick={onAddGroup} className="add-group-btn" title={t("groups.addGroup")}>
          +
        </button>
      </div>

      <div className="group-items">
        {/* 全部密码 - 固定不可拖动 */}
        <AllPasswordsItem
          isActive={selectedGroupId === null}
          onClick={() => onSelectGroup(null)}
          totalCount={totalCount}
        />

        {/* 用户分组 - 可拖动排序 */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            {groups.map((group) => (
              <SortableGroupItem
                key={group.id}
                group={group}
                isActive={selectedGroupId === group.id}
                entryCount={entryCountByGroup[group.id] || 0}
                onSelect={() => onSelectGroup(group.id)}
                onContextMenu={(e) => handleContextMenu(e, group)}
              />
            ))}
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeGroupId && activeGroup ? (
              <div className="group-item" style={{ cursor: 'grabbing', opacity: 0.9 }}>
                <span className="group-icon">{activeGroup.icon}</span>
                <span className="group-name">{activeGroup.name}</span>
                <span className="group-count">{entryCountByGroup[activeGroup.id] || 0}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onEditGroup(contextMenu.group);
              closeContextMenu();
            }}
          >
            ✏️ {t("forms.edit")}
          </button>
          <button
            onClick={() => {
              const count = entryCountByGroup[contextMenu.group.id] || 0;
              setConfirmDelete({
                group: contextMenu.group,
                hasEntries: count > 0,
              });
              closeContextMenu();
            }}
            className="danger"
          >
            🗑️ {t("forms.delete")}
          </button>
        </div>
      )}

      {/* 删除确认对话框 */}
      {confirmDelete && confirmDelete.hasEntries ? (
        <ConfirmDialog
          title={t("groups.cannotDeleteGroup")}
          message={`${t("groups.groupHasPasswords", { groupName: confirmDelete.group.name, count: entryCountByGroup[confirmDelete.group.id] })}`}
          type="warning"
          confirmText={t("common.understood")}
          cancelText=""
          onConfirm={() => setConfirmDelete(null)}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : confirmDelete ? (
        <ConfirmDialog
          title={t("groups.deleteGroup")}
          message={`${t("groups.confirmDeleteGroup", { groupName: confirmDelete.group.name })}`}
          type="danger"
          confirmText={t("forms.delete")}
          cancelText={t("forms.cancel")}
          onConfirm={() => {
            onDeleteGroup(confirmDelete.group.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : null}
    </div>
  );
}

export default GroupList;
