import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  DndContext,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Login from "./components/Login";
import GroupList from "./components/GroupList";
import GroupForm from "./components/GroupForm";
import PasswordList from "./components/PasswordList";
import PasswordForm from "./components/PasswordForm";
import GeneratorView from "./components/GeneratorView";
import Settings from "./components/Settings";
import About from "./components/About";
import ToastContainer from "./components/ToastContainer";
import { PasswordEntry, PasswordGroup } from "./types";
import { useKeyboard } from "./hooks/useKeyboard";
import { useToast } from "./hooks/useToast";
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState("passwords");
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [groups, setGroups] = useState<PasswordGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | undefined>();
  const [editingGroup, setEditingGroup] = useState<PasswordGroup | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [autoLockTimeout, setAutoLockTimeout] = useState<number>(0); // 0 表示禁用，单位：分钟
  const [theme, setTheme] = useState<string>("default");
  const toast = useToast();

  useEffect(() => {
    // 加载主题设置
    const savedTheme = localStorage.getItem("theme") || "default";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadEntries();
      loadGroups();
      // 加载自动锁定设置
      const savedTimeout = localStorage.getItem("autoLockTimeout");
      if (savedTimeout) {
        setAutoLockTimeout(parseInt(savedTimeout, 10));
      }
    }
  }, [isAuthenticated]);

  // 自动锁定逻辑
  useEffect(() => {
    if (!isAuthenticated || autoLockTimeout === 0) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        console.log("自动锁定触发");
        setIsAuthenticated(false);
        setEntries([]);
        setCurrentView("passwords");
      }, autoLockTimeout * 60 * 1000); // 转换为毫秒
    };

    // 监听用户活动
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // 初始化计时器
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, autoLockTimeout]);

  const loadEntries = async () => {
    try {
      const data = await invoke<PasswordEntry[]>("get_all_entries");
      setEntries(data);
    } catch (error) {
      console.error("Failed to load entries:", error);
    }
  };

  const loadGroups = async () => {
    try {
      const data = await invoke<PasswordGroup[]>("get_all_groups");
      // 按 sort_order 排序
      const sorted = data.sort((a, b) => {
        if (a.sort_order !== undefined && b.sort_order !== undefined) {
          return a.sort_order - b.sort_order;
        }
        if (a.sort_order !== undefined) return -1;
        if (b.sort_order !== undefined) return 1;
        return a.created_at - b.created_at;
      });
      setGroups(sorted);
    } catch (error) {
      console.error("Failed to load groups:", error);
      // 如果后端还没实现，使用默认分组
      setGroups([]);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleAddEntry = () => {
    setEditingEntry(undefined);
    setShowForm(true);
  };

  const handleEditEntry = (entry: PasswordEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleSaveEntry = async (entry: PasswordEntry) => {
    try {
      if (editingEntry) {
        // 如果是编辑，记录历史
        const history = editingEntry.history || [];
        
        // 检查是否有实质性修改
        const passwordChanged = editingEntry.password !== entry.password;
        const usernameChanged = editingEntry.username !== entry.username;
        const notesChanged = editingEntry.notes !== entry.notes;
        const hasChanges = passwordChanged || usernameChanged || notesChanged;
        
        if (hasChanges) {
          // 创建历史记录对象，只记录发生变化的字段的旧值
          const historyRecord: {
            timestamp: number;
            password?: string;
            username?: string;
            notes?: string;
          } = {
            timestamp: editingEntry.updated_at,
          };
          
          if (passwordChanged) {
            historyRecord.password = editingEntry.password;
          }
          if (usernameChanged) {
            historyRecord.username = editingEntry.username;
          }
          if (notesChanged) {
            historyRecord.notes = editingEntry.notes;
          }
          
          // 添加历史记录（最多保留10条）
          const newHistory = [historyRecord, ...history].slice(0, 10);
          entry.history = newHistory;
        } else {
          // 没有变化，保留原有历史
          entry.history = history;
        }
        
        await invoke("update_entry", { entry });
      } else {
        // 新建条目，初始化空历史
        entry.history = [];
        await invoke("add_entry", { entry });
      }
      await loadEntries();
      setShowForm(false);
      setEditingEntry(undefined);
      toast.success(editingEntry ? "密码已更新" : "密码已添加");
    } catch (error) {
      console.error("Failed to save entry:", error);
      toast.error("保存失败：" + error);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await invoke("delete_entry", { id });
      await loadEntries();
      toast.success("密码已删除");
    } catch (error) {
      console.error("Failed to delete entry:", error);
      toast.error("删除失败：" + error);
    }
  };

  const handleUpdateOrder = async (updatedEntries: PasswordEntry[]) => {
    console.log("App.tsx: handleUpdateOrder 被调用");
    console.log("要更新的条目数量:", updatedEntries.length);
    
    try {
      // 批量更新所有条目
      for (const entry of updatedEntries) {
        console.log(`更新条目: ${entry.title}, sort_order: ${entry.sort_order}`);
        await invoke("update_entry", { entry });
      }
      console.log("批量更新完成，重新加载数据");
      await loadEntries();
      console.log("数据重新加载完成");
    } catch (error) {
      console.error("Failed to update order:", error);
      toast.error("更新顺序失败：" + error);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingEntry(undefined);
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    setShowForm(false);
    setEditingEntry(undefined);
  };

  const handleLock = () => {
    setIsAuthenticated(false);
    setEntries([]);
    setGroups([]);
    setCurrentView("passwords");
  };

  const handleAddGroup = () => {
    setEditingGroup(undefined);
    setShowGroupForm(true);
  };

  const handleEditGroup = (group: PasswordGroup) => {
    setEditingGroup(group);
    setShowGroupForm(true);
  };

  const handleSaveGroup = async (groupData: Partial<PasswordGroup>) => {
    try {
      if (editingGroup) {
        await invoke("update_group", { group: { ...editingGroup, ...groupData } });
      } else {
        const newGroup: PasswordGroup = {
          id: crypto.randomUUID(),
          name: groupData.name!,
          icon: groupData.icon!,
          sort_order: groups.length,
          created_at: Date.now(),
        };
        await invoke("add_group", { group: newGroup });
      }
      await loadGroups();
      setShowGroupForm(false);
      setEditingGroup(undefined);
      toast.success(editingGroup ? "分组已更新" : "分组已创建");
    } catch (error) {
      console.error("Failed to save group:", error);
      toast.error("保存分组失败：" + error);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await invoke("delete_group", { id: groupId });
      await loadGroups();
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
      }
      toast.success("分组已删除");
    } catch (error) {
      console.error("Failed to delete group:", error);
      toast.error("删除分组失败：" + error);
    }
  };

  const handleUpdateGroupOrder = async (updatedGroups: PasswordGroup[]) => {
    // 乐观更新 UI
    setGroups(updatedGroups);
    
    try {
      // 批量更新后端
      for (const group of updatedGroups) {
        await invoke("update_group", { group });
      }
    } catch (error) {
      console.error("Failed to update group order:", error);
      toast.error("更新分组顺序失败：" + error);
      // 失败时重新加载
      await loadGroups();
    }
  };

  const handleAutoLockChange = (minutes: number) => {
    setAutoLockTimeout(minutes);
    localStorage.setItem("autoLockTimeout", minutes.toString());
  };

  const handleRefresh = async () => {
    await loadEntries();
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // 全局快捷键
  useKeyboard({
    onLock: handleLock,
    onEscape: () => {
      if (showForm) {
        handleCancelForm();
      }
    },
  });

  // 计算每个分组的密码数量
  const entryCountByGroup = entries.reduce((acc, entry) => {
    const groupId = entry.group_id || "ungrouped";
    acc[groupId] = (acc[groupId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 根据选中的分组过滤密码
  const filteredEntries = selectedGroupId
    ? entries.filter((entry) => entry.group_id === selectedGroupId)
    : entries;

  const handleMoveToGroup = async (entryId: string, targetGroupId: string | null) => {
    // 找到被拖动的密码条目
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    
    // 如果分组没有变化，不做任何操作
    if (entry.group_id === targetGroupId) return;
    
    // 更新密码的分组
    const updatedEntry = { ...entry, group_id: targetGroupId };
    
    try {
      await invoke("update_entry", { entry: updatedEntry });
      await loadEntries();
      
      const groupName = targetGroupId 
        ? groups.find(g => g.id === targetGroupId)?.name || "分组"
        : "全部密码";
      toast.success(`已移动到"${groupName}"`);
    } catch (error) {
      console.error("Failed to move entry:", error);
      toast.error("移动失败：" + error);
    }
  };

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 拖动8px后才激活，避免误触
      },
    })
  );

  // 处理拖拽悬停事件
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeData = active.data.current;
    const overData = over.data.current;
    
    console.log("拖拽悬停:", { 
      activeId: active.id, 
      activeType: activeData?.type,
      overId: over.id, 
      overGroupId: overData?.groupId 
    });
  }, []);

  // 处理拖拽结束事件
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      console.log("拖拽结束: 没有 over 目标");
      return;
    }
    
    // 判断拖拽的是分组还是密码
    const activeData = active.data.current;
    const overData = over.data.current;
    
    console.log("拖拽结束:", { 
      activeId: active.id, 
      activeType: activeData?.type,
      overId: over.id, 
      overType: overData?.type,
      overGroupId: overData?.groupId 
    });
    
    // 如果是分组拖拽（分组排序）
    if (activeData?.type === 'group' && active.id !== over.id) {
      const oldIndex = groups.findIndex((g) => g.id === active.id);
      const newIndex = groups.findIndex((g) => g.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedGroups = arrayMove(groups, oldIndex, newIndex);
        // 更新 sort_order
        const updatedGroups = reorderedGroups.map((group, index) => ({
          ...group,
          sort_order: index,
        }));
        handleUpdateGroupOrder(updatedGroups);
      }
    }
    // 如果是密码拖拽到分组（移动到分组）
    else if (activeData?.type === 'password' && overData?.groupId !== undefined) {
      console.log("移动密码到分组:", active.id, "->", overData.groupId);
      handleMoveToGroup(active.id as string, overData.groupId);
    }
    // 如果是密码拖拽到密码（密码排序）
    else if (activeData?.type === 'password' && active.id !== over.id) {
      const sortedEntries = [...filteredEntries].sort((a, b) => {
        if (a.sort_order !== undefined && b.sort_order !== undefined) {
          return a.sort_order - b.sort_order;
        }
        if (a.sort_order !== undefined) return -1;
        if (b.sort_order !== undefined) return 1;
        return a.created_at - b.created_at;
      });
      
      const oldIndex = sortedEntries.findIndex((e) => e.id === active.id);
      const newIndex = sortedEntries.findIndex((e) => e.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(sortedEntries, oldIndex, newIndex);
        const updatedEntries = reordered.map((entry, index) => ({
          ...entry,
          sort_order: index,
          updated_at: Date.now(),
        }));
        
        try {
          await handleUpdateOrder(updatedEntries);
        } catch (error) {
          console.error("❌ 保存排序失败:", error);
        }
      }
    }
  }, [groups, filteredEntries, handleUpdateGroupOrder, handleMoveToGroup, handleUpdateOrder]);

  const renderView = () => {
    // 合并所有可拖拽项目的 ID（分组 + 密码）
    const allDraggableIds = [
      ...groups.map((g) => g.id),
      ...filteredEntries.map((e) => e.id)
    ];

    switch (currentView) {
      case "passwords":
        return (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={allDraggableIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="three-column-layout">
                <GroupList
                  groups={groups}
                  selectedGroupId={selectedGroupId}
                  onSelectGroup={setSelectedGroupId}
                  onAddGroup={handleAddGroup}
                  onEditGroup={handleEditGroup}
                  onDeleteGroup={handleDeleteGroup}
                  entryCountByGroup={entryCountByGroup}
                />
                <PasswordList
                  entries={filteredEntries}
                  onEdit={handleEditEntry}
                  onDelete={handleDeleteEntry}
                  onAdd={handleAddEntry}
                  onUpdateOrder={handleUpdateOrder}
                  onMoveToGroup={handleMoveToGroup}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                />
              </div>
            </SortableContext>
          </DndContext>
        );
      case "generator":
        return <GeneratorView />;
      case "settings":
        return (
          <Settings
            autoLockTimeout={autoLockTimeout}
            onAutoLockChange={handleAutoLockChange}
            onLock={handleLock}
            theme={theme}
            onThemeChange={handleThemeChange}
            onRefresh={handleRefresh}
          />
        );
      case "about":
        return <About />;
      default:
        return (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={allDraggableIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="three-column-layout">
                <GroupList
                  groups={groups}
                  selectedGroupId={selectedGroupId}
                  onSelectGroup={setSelectedGroupId}
                  onAddGroup={handleAddGroup}
                  onEditGroup={handleEditGroup}
                  onDeleteGroup={handleDeleteGroup}
                  entryCountByGroup={entryCountByGroup}
                />
                <PasswordList
                  entries={filteredEntries}
                  onEdit={handleEditEntry}
                  onDelete={handleDeleteEntry}
                  onAdd={handleAddEntry}
                  onUpdateOrder={handleUpdateOrder}
                  onMoveToGroup={handleMoveToGroup}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                />
              </div>
            </SortableContext>
          </DndContext>
        );
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {/* 顶部工具栏 */}
      <header className="app-header">
        <div className="header-left">
          <span className="app-logo">🔐</span>
          <span className="app-title">2Pass</span>
        </div>
        <nav className="header-nav">
          <button
            className={`nav-btn ${currentView === "passwords" ? "active" : ""}`}
            onClick={() => handleViewChange("passwords")}
          >
            🔐 密码
          </button>
          <button
            className={`nav-btn ${currentView === "generator" ? "active" : ""}`}
            onClick={() => handleViewChange("generator")}
          >
            🎲 生成器
          </button>
          <button
            className={`nav-btn ${currentView === "settings" ? "active" : ""}`}
            onClick={() => handleViewChange("settings")}
          >
            ⚙️ 设置
          </button>
          <button
            className={`nav-btn ${currentView === "about" ? "active" : ""}`}
            onClick={() => handleViewChange("about")}
          >
            ℹ️ 关于
          </button>
        </nav>
        <div className="header-right">
          <button onClick={handleLock} className="lock-btn" title="锁定应用">
            🔒 锁定
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="app-main">
        {renderView()}
      </main>

      {/* 弹窗 */}
      {showForm && (
        <PasswordForm
          entry={editingEntry}
          groups={groups}
          selectedGroupId={selectedGroupId}
          onSave={handleSaveEntry}
          onCancel={handleCancelForm}
        />
      )}
      {showGroupForm && (
        <GroupForm
          group={editingGroup}
          onSave={handleSaveGroup}
          onCancel={() => {
            setShowGroupForm(false);
            setEditingGroup(undefined);
          }}
        />
      )}

      {/* Toast 通知 */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}

export default App;
