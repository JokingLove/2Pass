import { useState } from "react";
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
        {/* 全部密码 */}
        <div
          className={`group-item ${selectedGroupId === null ? "active" : ""}`}
          onClick={() => onSelectGroup(null)}
        >
          <span className="group-icon">📋</span>
          <span className="group-name">全部密码</span>
          <span className="group-count">{totalCount}</span>
        </div>

        {/* 用户分组 */}
        {groups.map((group) => (
          <div
            key={group.id}
            className={`group-item ${selectedGroupId === group.id ? "active" : ""}`}
            onClick={() => onSelectGroup(group.id)}
            onContextMenu={(e) => handleContextMenu(e, group)}
          >
            <span className="group-icon">{group.icon}</span>
            <span className="group-name">{group.name}</span>
            <span className="group-count">{entryCountByGroup[group.id] || 0}</span>
          </div>
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
