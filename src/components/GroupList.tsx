import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
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
      <span className="group-name">全部密码</span>
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
  entryCountByGroup,
}: GroupListProps) {
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

  return (
    <div className="group-list" onClick={closeContextMenu}>
      <div className="group-list-header">
        <h3>分组</h3>
        <button onClick={onAddGroup} className="add-group-btn" title="新建分组">
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
            ✏️ 编辑
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
            🗑️ 删除
          </button>
        </div>
      )}

      {/* 删除确认对话框 */}
      {confirmDelete && confirmDelete.hasEntries ? (
        <ConfirmDialog
          title="无法删除分组"
          message={`分组"${confirmDelete.group.name}"下还有 ${entryCountByGroup[confirmDelete.group.id]} 个密码。请先删除或移动这些密码。`}
          type="warning"
          confirmText="知道了"
          cancelText=""
          onConfirm={() => setConfirmDelete(null)}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : confirmDelete ? (
        <ConfirmDialog
          title="删除分组"
          message={`确定要删除分组"${confirmDelete.group.name}"吗？此操作无法撤销。`}
          type="danger"
          confirmText="删除"
          cancelText="取消"
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
