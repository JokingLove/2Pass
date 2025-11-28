import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
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
import { useResponsive } from "./hooks/useResponsive";
import "./App.css";
import "./styles/responsive/index.css";

function App() {
  const { t } = useTranslation();
  const { isMobile } = useResponsive(); // 响应式状态
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
  const [isLoadingData, setIsLoadingData] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // 加载主题设置
    const savedTheme = localStorage.getItem("theme") || "default";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    // 设置 HTML lang 属性
    const savedLanguage = localStorage.getItem("language") || "zh-CN";
    document.documentElement.setAttribute("lang", savedLanguage);
  }, []);



  // 自动锁定逻辑
  useEffect(() => {
    if (!isAuthenticated || autoLockTimeout === 0) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        console.log(t("common.autoLockTriggered"));
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

  // 监听认证状态，一旦认证通过就开始加载数据
  useEffect(() => {
    if (isAuthenticated) {
      const loadData = async () => {
        setIsLoadingData(true);
        try {
          await Promise.all([loadEntries(), loadGroups()]);
        } catch (error) {
          console.error("Failed to load data:", error);
          toast.error(t("common.loadDataFailed"));
        } finally {
          setIsLoadingData(false);
        }
      };
      loadData();
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    // 立即进入主界面，数据在后台加载
    try {
      // 加载自动锁定设置
      const savedTimeout = localStorage.getItem("autoLockTimeout");
      if (savedTimeout) {
        setAutoLockTimeout(parseInt(savedTimeout, 10));
      }

      // 立即设置为已认证
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
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
      toast.success(editingEntry ? t("passwords.passwordUpdated") : t("passwords.passwordAdded"));
    } catch (error) {
      console.error("Failed to save entry:", error);
      toast.error(t("passwords.saveFailed") + "：" + error);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await invoke("delete_entry", { id });
      await loadEntries();
      toast.success(t("passwords.passwordDeleted"));
    } catch (error) {
      console.error("Failed to delete entry:", error);
      toast.error(t("passwords.deleteFailed") + "：" + error);
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
      toast.error(t("passwords.updateOrderFailed") + "：" + error);
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
      toast.success(editingGroup ? t("groups.groupUpdated") : t("groups.groupAdded"));
    } catch (error) {
      console.error("Failed to save group:", error);
      toast.error(t("groups.saveGroupFailed") + "：" + error);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await invoke("delete_group", { id: groupId });
      await loadGroups();
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
      }
      toast.success(t("groups.groupDeleted"));
    } catch (error) {
      console.error("Failed to delete group:", error);
      toast.error(t("groups.deleteGroupFailed") + "：" + error);
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
      toast.error(t("groups.updateGroupOrderFailed") + "：" + error);
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
        ? groups.find(g => g.id === targetGroupId)?.name || t("groups.title")
        : t("passwords.allPasswords");
      toast.success(t("passwords.movedToGroup", { groupName }));
    } catch (error) {
      console.error("Failed to move entry:", error);
      toast.error(t("passwords.moveFailed") + "：" + error);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case "passwords":
        return (
          <div className="three-column-layout">
            {/* 分组列表 - 桌面端显示，移动端隐藏 */}
            {!isMobile && (
              <GroupList
                groups={groups}
                selectedGroupId={selectedGroupId}
                onSelectGroup={setSelectedGroupId}
                onAddGroup={handleAddGroup}
                onEditGroup={handleEditGroup}
                onDeleteGroup={handleDeleteGroup}
                onUpdateGroupOrder={handleUpdateGroupOrder}
                entryCountByGroup={entryCountByGroup}
              />
            )}
            {/* 密码列表 - 始终显示 */}
            <PasswordList
              entries={filteredEntries}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
              onAdd={handleAddEntry}
              onUpdateOrder={handleUpdateOrder}
              onMoveToGroup={handleMoveToGroup}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              loading={isLoadingData}
            />
          </div>
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
          <div className="three-column-layout">
            {/* 分组列表 - 桌面端显示，移动端隐藏 */}
            {!isMobile && (
              <GroupList
                groups={groups}
                selectedGroupId={selectedGroupId}
                onSelectGroup={setSelectedGroupId}
                onAddGroup={handleAddGroup}
                onEditGroup={handleEditGroup}
                onDeleteGroup={handleDeleteGroup}
                onUpdateGroupOrder={handleUpdateGroupOrder}
                entryCountByGroup={entryCountByGroup}
              />
            )}
            {/* 密码列表 - 始终显示 */}
            <PasswordList
              entries={filteredEntries}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
              onAdd={handleAddEntry}
              onUpdateOrder={handleUpdateOrder}
              onMoveToGroup={handleMoveToGroup}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              loading={isLoadingData}
            />
          </div>
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
        <nav className="header-nav">
          <button
            className={`nav-btn ${currentView === "passwords" ? "active" : ""}`}
            onClick={() => handleViewChange("passwords")}
          >
            🔐 {t("nav.passwords")}
          </button>
          <button
            className={`nav-btn ${currentView === "generator" ? "active" : ""}`}
            onClick={() => handleViewChange("generator")}
          >
            🎲 {t("nav.generator")}
          </button>
          <button
            className={`nav-btn ${currentView === "settings" ? "active" : ""}`}
            onClick={() => handleViewChange("settings")}
          >
            ⚙️ {t("nav.settings")}
          </button>
          <button
            className={`nav-btn ${currentView === "about" ? "active" : ""}`}
            onClick={() => handleViewChange("about")}
          >
            ℹ️ {t("nav.about")}
          </button>
        </nav>
        <div className="header-right">
          <button onClick={handleLock} className="lock-btn" title={t("nav.lock")}>
            🔒 {t("nav.lock")}
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
