import { useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import { PasswordListProps, PasswordEntry } from "../types";
import TotpDisplay from "./TotpDisplay";
import PasswordHistory from "./PasswordHistory";
import ConfirmDialog from "./ConfirmDialog";
import { highlightText } from "../utils/clipboard";
import { useKeyboard } from "../hooks/useKeyboard";
import { useCopy } from "../hooks/useCopy";
import "../styles/PasswordList.css";

interface SortableCardProps {
  entry: PasswordEntry;
  showPassword: string | null;
  copiedId: string | null;
  isMultiSelectMode: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  isHistoryExpanded: boolean;
  searchTerm: string;
  onToggleSelect: (id: string) => void;
  onEdit: (entry: PasswordEntry) => void;
  onConfirmDelete: (entry: PasswordEntry) => void;
  onTogglePassword: (id: string) => void;
  onCopyToClipboard: (text: string, id: string) => void;
  onLongPress?: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onToggleHistory: (id: string) => void;
}

function SortablePasswordCard({
  entry,
  showPassword,
  copiedId,
  isMultiSelectMode,
  isSelected,
  isExpanded,
  isHistoryExpanded,
  searchTerm,
  onToggleSelect,
  onEdit,
  onConfirmDelete,
  onTogglePassword,
  onCopyToClipboard,
  onLongPress,
  onToggleExpand,
  onToggleHistory,
}: SortableCardProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  // 添加初始鼠标位置状态，用于区分拖动和长按
  const [initialMousePos, setInitialMousePos] = useState<{ x: number; y: number } | null>(null);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging
      ? "none"
      : (transition || "transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)"),
    zIndex: isDragging ? 999 : 1,
  };

  // 长按事件处理
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isMultiSelectMode) return;

    // 检查是否点击了按钮或其他交互元素
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return; // 忽略按钮、链接和输入框的点击
    }

    // 记录初始鼠标位置
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setInitialMousePos({ x: clientX, y: clientY });

    const timer = setTimeout(() => {
      onLongPress?.(entry.id);
    }, 800);

    setLongPressTimer(timer);
  };

  // 添加鼠标移动事件处理，检测拖动行为
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!initialMousePos || !longPressTimer) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const distance = Math.sqrt(
      Math.pow(clientX - initialMousePos.x, 2) + Math.pow(clientY - initialMousePos.y, 2)
    );

    // 超过8px阈值则判定为拖动，取消长按计时器
    if (distance >= 8) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setInitialMousePos(null);
  };

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setInitialMousePos(null);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`entry-card ${isDragging ? "dragging" : ""} ${isSelected ? "selected" : ""} ${isExpanded ? "expanded" : "collapsed"}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onTouchMove={handleMouseMove}
    >
      {isMultiSelectMode && (
        <div className="select-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(entry.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <div
        className="entry-header"
        onClick={(e) => {
          // 如果点击的不是按钮，则切换展开状态
          if (!(e.target as HTMLElement).closest('button')) {
            onToggleExpand(entry.id);
          }
        }}
      >
        {!isMultiSelectMode && (
          <div className="drag-handle" {...attributes} {...listeners} title={t("passwords.dragToSort")}>
            ⋮⋮
          </div>
        )}
        <div className="entry-title-section">
          <span className="entry-icon">{entry.icon_id || "🔑"}</span>
          <h3>{highlightText(entry.title, searchTerm)}</h3>
          {!isExpanded && (
            <span className="entry-username-preview">{entry.username}</span>
          )}
        </div>
        <div className="entry-actions">
          {/* 快速复制用户名按钮 */}
          <button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await onCopyToClipboard(entry.username, `quick-user-${entry.id}`);
            }}
            className={`action-btn quick-copy-user-btn ${copiedId === `quick-user-${entry.id}` ? 'copied' : ''}`}
            title={t("passwords.copyUsername")}
          >
            {copiedId === `quick-user-${entry.id}` ? "✓" : "👤"}
          </button>
          {/* 快速复制密码按钮 */}
          <button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();

              // 如果有 TOTP，复制组合密码
              if (entry.totp_secret) {
                try {
                  // 立即生成 TOTP 并复制
                  const { invoke } = await import("@tauri-apps/api/core");
                  const totpCode = await invoke<string>("generate_totp", { secret: entry.totp_secret });
                  const combinedPassword = entry.password + totpCode;
                  await onCopyToClipboard(combinedPassword, `quick-${entry.id}`);
                } catch (err) {
                  console.error("❌ Failed to generate TOTP:", err);
                  // 如果生成失败，复制普通密码
                  await onCopyToClipboard(entry.password, `quick-${entry.id}`);
                }
              } else {
                // 没有 TOTP，复制普通密码
                await onCopyToClipboard(entry.password, `quick-${entry.id}`);
              }
            }}
            className={`action-btn quick-copy-btn ${copiedId === `quick-${entry.id}` ? 'copied' : ''}`}
            title={entry.totp_secret ? t("passwords.copyPassword") + " + TOTP" : t("passwords.copyPassword")}
          >
            {copiedId === `quick-${entry.id}` ? "✓" : "🔑"}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(entry);
            }}
            className="action-btn edit-btn"
            title={t("forms.edit")}
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConfirmDelete(entry);
            }}
            className="action-btn delete-btn"
            title={t("forms.delete")}
          >
            🗑️
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="entry-content">
          {/* 网址 */}
          {entry.url && entry.url.length > 0 && (
            <div className="entry-section">
              {entry.url.map((url, index) => (
                url && (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="info-row url-row"
                    title={url}
                  // onClick={(e) => e.stopPropagation()}
                  >
                    <span className="info-label">🌐 {t("passwords.website")}</span>
                    <div className="info-value-group">
                      <span className="info-value">{highlightText(url, searchTerm)}</span>
                      <span className="link-arrow">→</span>
                    </div>
                  </a>
                )
              ))}
            </div>
          )}

          {/* 用户名 */}
          <div className="info-row">
            <span className="info-label">👤 {t("passwords.username")}</span>
            <div className="info-value-group">
              <span className="info-value">{highlightText(entry.username, searchTerm)}</span>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await onCopyToClipboard(entry.username, `user-${entry.id}`);
                }}
                className={`icon-btn ${copiedId === `user-${entry.id}` ? 'copied' : ''}`}
                title={t("passwords.copyUsername")}
              >
                {copiedId === `user-${entry.id}` ? "✓" : "📋"}
              </button>
            </div>
          </div>

          {/* 密码 */}
          <div className="info-row">
            <span className="info-label">🔑 {t("passwords.password")}</span>
            <div className="info-value-group">
              <span className="info-value password-value">
                {showPassword === entry.id ? entry.password : "••••••••"}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePassword(entry.id);
                }}
                className="icon-btn"
                title={showPassword === entry.id ? t("passwords.hidePassword") : t("passwords.showPassword")}
              >
                {showPassword === entry.id ? "🙈" : "👁️"}
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await onCopyToClipboard(entry.password, `pass-${entry.id}`);
                }}
                className={`icon-btn ${copiedId === `pass-${entry.id}` ? 'copied' : ''}`}
                title={t("passwords.copyPassword")}
              >
                {copiedId === `pass-${entry.id}` ? "✓" : "📋"}
              </button>
            </div>
          </div>

          {/* 备注 */}
          {entry.notes && (
            <div className="info-row notes-row">
              <span className="info-label">📝 {t("passwords.notes")}</span>
              <div className="info-value notes-content">
                {highlightText(entry.notes, searchTerm)}
              </div>
            </div>
          )}

          {/* 标签 */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="info-row tags-row">
              <span className="info-label">🏷️ {t("passwords.tags")}</span>
              <div className="entry-tags">
                {entry.tags.map((tag, index) => (
                  <span key={tag} className={`entry-tag tag-color-${index % 6}`}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* TOTP */}
          {entry.totp_secret && (
            <div className="entry-section totp-section">
              <TotpDisplay secret={entry.totp_secret} password={entry.password} />
            </div>
          )}

          {/* 更新历史 */}
          <PasswordHistory
            history={entry.history}
            updatedAt={entry.updated_at}
            isExpanded={isHistoryExpanded}
            onToggle={() => onToggleHistory(entry.id)}
          />
        </div>
      )}
    </div>
  );
}

function PasswordList({
  entries,
  onEdit,
  onDelete,
  onAdd,
  onUpdateOrder,
  onMoveToGroup,
  searchTerm,
  onSearchChange,
  loading = false,
}: PasswordListProps) {
  const { t } = useTranslation();
  const { copiedId, copyToClipboard } = useCopy();
  const [showPassword, setShowPassword] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PasswordEntry | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState<boolean>(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [historyExpandedIds, setHistoryExpandedIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // 按排序顺序排序
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.sort_order !== undefined && b.sort_order !== undefined) {
      return a.sort_order - b.sort_order;
    }
    if (a.sort_order !== undefined) return -1;
    if (b.sort_order !== undefined) return 1;
    return a.created_at - b.created_at;
  });

  // 获取所有唯一标签
  const allTags = Array.from(
    new Set(
      sortedEntries
        .flatMap((entry) => entry.tags || [])
        .filter((tag) => tag)
    )
  ).sort();

  const filteredEntries = sortedEntries.filter((entry) => {
    // 搜索过滤（包含标题、用户名、网址、备注）
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      entry.title.toLowerCase().includes(searchLower) ||
      entry.username.toLowerCase().includes(searchLower) ||
      (entry.url && entry.url.some((url) => url.toLowerCase().includes(searchLower))) ||
      entry.notes.toLowerCase().includes(searchLower);

    // 标签过滤
    const matchesTag =
      !selectedTag || (entry.tags && entry.tags.includes(selectedTag));

    return matchesSearch && matchesTag;
  });

  // copyToClipboard 已通过 useCopy hook 提供

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const toggleHistory = (id: string) => {
    const newHistoryExpanded = new Set(historyExpandedIds);
    if (newHistoryExpanded.has(id)) {
      newHistoryExpanded.delete(id);
    } else {
      newHistoryExpanded.add(id);
    }
    setHistoryExpandedIds(newHistoryExpanded);
  };

  // 快捷键支持
  useKeyboard({
    onNew: onAdd,
    onSearch: () => searchInputRef.current?.focus(),
    onEscape: () => {
      // ESC 键退出选择模式
      if (isMultiSelectMode) {
        setIsMultiSelectMode(false);
        setSelectedIds(new Set());
      }
    },
  });

  const togglePasswordVisibility = (id: string) => {
    setShowPassword(showPassword === id ? null : id);
  };

  const confirmDelete = (entry: PasswordEntry) => {
    setDeleteConfirm(entry);
  };

  const toggleMultiSelect = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedIds(new Set());
  };

  const handleLongPress = (id: string) => {
    // 进入多选模式
    setIsMultiSelectMode(true);
    // 选中长按的条目
    setSelectedIds(new Set([id]));
  };

  const toggleSelectEntry = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set(filteredEntries.map((e) => e.id));
    setSelectedIds(allIds);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    setBatchDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleConfirmBatchDelete = async () => {
    try {
      for (const id of selectedIds) {
        await onDelete(id);
      }
      setSelectedIds(new Set());
      setIsMultiSelectMode(false);
    } catch (error) {
      console.error(t("passwords.deleteFailed") + ":", error);
    } finally {
      setBatchDeleteConfirm(false);
    }
  };

  const handleCancelBatchDelete = () => {
    setBatchDeleteConfirm(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    // 检查是否拖到分组上
    if (over.id.toString().startsWith("group-")) {
      const entryId = active.id.toString();
      const targetGroupId = over.data.current?.groupId;
      onMoveToGroup?.(entryId, targetGroupId);
      return;
    }

    // 原有的排序逻辑
    if (active.id === over.id) {
      return;
    }

    const oldIndex = sortedEntries.findIndex((e) => e.id === active.id);
    const newIndex = sortedEntries.findIndex((e) => e.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(sortedEntries, oldIndex, newIndex);
      const updatedEntries = reordered.map((entry, index) => ({
        ...entry,
        sort_order: index,
        updated_at: Date.now(),
      }));

      setIsSavingOrder(true);
      try {
        await onUpdateOrder(updatedEntries);
      } catch (error) {
        console.error("❌ " + t("passwords.saveFailed") + ":", error);
      } finally {
        setIsSavingOrder(false);
      }
    }
  };

  return (
    <div className="password-list-container">
      <div className="list-header">
        <div className="header-top">
          <h1>🔐 {t("app.title")}</h1>
          <div className="header-actions">
            {isMultiSelectMode ? (
              <>
                <button onClick={selectAll} className="batch-btn select-btn">
                  {t("passwords.selectAll")}
                </button>
                <button onClick={deselectAll} className="batch-btn deselect-btn">
                  {t("forms.cancel")}
                </button>
                <button
                  onClick={batchDelete}
                  className="batch-btn delete-btn"
                  disabled={selectedIds.size === 0}
                >
                  🗑️ {t("forms.delete")} ({selectedIds.size})
                </button>
                <button onClick={toggleMultiSelect} className="batch-btn cancel-btn">
                  {t("passwords.exitBatch")}
                </button>
              </>
            ) : (
              <>
                <button onClick={toggleMultiSelect} className="batch-mode-btn">
                  ☑️ {t("passwords.batchManage")}
                </button>
                <button onClick={onAdd} className="add-button">
                  ➕ {t("passwords.addPassword")}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="search-bar">
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t("passwords.search")}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {allTags.length > 0 && (
          <div className="tag-filter">
            <button
              className={`filter-tag ${!selectedTag ? "active" : ""}`}
              onClick={() => setSelectedTag(null)}
            >
              全部
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`filter-tag ${selectedTag === tag ? "active" : ""}`}
                onClick={() => setSelectedTag(tag)}
              >
                🏷️ {tag}
              </button>
            ))}
          </div>
        )}
        {!searchTerm && entries.length > 1 && !isMultiSelectMode && (
          <div className="drag-hint">
            💡 {t("passwords.dragHint")}
          </div>
        )}
        {isMultiSelectMode && (
          <div className="drag-hint">
            💡 {t("passwords.escHint")}
          </div>
        )}
        {isSavingOrder && (
          <div className="saving-indicator">⏳ 正在保存排序...</div>
        )}
      </div>

      <div className="entries-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>{t("common.loading")}</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="empty-state">
            <p>
              {searchTerm
                ? "😕 " + t("passwords.noMatchingPasswords")
                : "📝 " + t("passwords.noPasswordsYet")}
            </p>
          </div>
        ) : searchTerm ? (
          <div className="entries-grid">
            {filteredEntries.map((entry) => (
              <SortablePasswordCard
                key={entry.id}
                entry={entry}
                showPassword={showPassword}
                copiedId={copiedId}
                isMultiSelectMode={isMultiSelectMode}
                isSelected={selectedIds.has(entry.id)}
                isExpanded={expandedIds.has(entry.id)}
                isHistoryExpanded={historyExpandedIds.has(entry.id)}
                searchTerm={searchTerm}
                onToggleSelect={toggleSelectEntry}
                onEdit={onEdit}
                onConfirmDelete={confirmDelete}
                onTogglePassword={togglePasswordVisibility}
                onCopyToClipboard={copyToClipboard}
                onLongPress={handleLongPress}
                onToggleExpand={toggleExpand}
                onToggleHistory={toggleHistory}
              />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filteredEntries.map((e) => e.id)} strategy={rectSortingStrategy}>
              <div className="entries-grid">
                {filteredEntries.map((entry) => (
                  <SortablePasswordCard
                    key={entry.id}
                    entry={entry}
                    showPassword={showPassword}
                    copiedId={copiedId}
                    isMultiSelectMode={isMultiSelectMode}
                    isSelected={selectedIds.has(entry.id)}
                    isExpanded={expandedIds.has(entry.id)}
                    isHistoryExpanded={historyExpandedIds.has(entry.id)}
                    searchTerm={searchTerm}
                    onToggleSelect={toggleSelectEntry}
                    onEdit={onEdit}
                    onConfirmDelete={confirmDelete}
                    onTogglePassword={togglePasswordVisibility}
                    onCopyToClipboard={copyToClipboard}
                    onLongPress={handleLongPress}
                    onToggleExpand={toggleExpand}
                    onToggleHistory={toggleHistory}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {deleteConfirm && (
        <ConfirmDialog
          title={t("passwords.deletePassword")}
          message={`${t("forms.confirm")} "${deleteConfirm.title}"？`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}

      {batchDeleteConfirm && (
        <ConfirmDialog
          title={t("passwords.deletePassword")}
          message={`${t("forms.confirm")} ${selectedIds.size} ${t("passwords.password")}？`}
          onConfirm={handleConfirmBatchDelete}
          onCancel={handleCancelBatchDelete}
        />
      )}
    </div>
  );
}

export default PasswordList;
