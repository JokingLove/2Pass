import { useState, useEffect, useCallback, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke, nativeVault, startDemo, endDemo } from "./utils/commands";
import Icon from "./components/Icon";
import VaultMark from "./components/VaultMark";
import { useTranslation } from "react-i18next";
import Login from "./components/Login";
import GroupList from "./components/GroupList";
import GroupForm from "./components/GroupForm";
import PasswordList from "./components/PasswordList";
import PasswordForm from "./components/PasswordForm";
import TotpConfig from "./components/TotpConfig";
import GeneratorView from "./components/GeneratorView";
import Settings from "./components/Settings";
import About from "./components/About";
import ToastContainer from "./components/ToastContainer";
import { PasswordEntry, PasswordGroup } from "./types";
import { useKeyboard } from "./hooks/useKeyboard";
import { useToast } from "./hooks/useToast";
import "./App.css";


function App() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const [drawer, setDrawer] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(() => localStorage.getItem("2pass.sidebar.collapsed") === "true");
  const modifier = /mac/i.test(navigator.platform) ? "⌘" : "Ctrl";
  const drawerToggle = useRef<HTMLButtonElement>(null);
  const desktopRailToggle = useRef<HTMLButtonElement>(null);
  const drawerClose = useRef<HTMLButtonElement>(null);
  const sessionVersion = useRef(0);
  const locking = useRef(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState("passwords");
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [groups, setGroups] = useState<PasswordGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [gaEntryId, setGaEntryId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | undefined>();
  const [editingGroup, setEditingGroup] = useState<PasswordGroup | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [autoLockTimeout, setAutoLockTimeout] = useState<number>(0); // 0 表示禁用，单位：分钟
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "default");
  const toast = useToast();

  useEffect(() => {
    if (!nativeVault) return;
    const dark = getComputedStyle(document.documentElement).colorScheme === "dark";
    // Keep the native title bar in the same light or dark appearance as the vault.
    getCurrentWindow().setTheme(dark ? "dark" : "light").catch(() => {
      // Some mobile platforms manage window appearance themselves.
    });
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.title = t("app.title");
  }, [i18n.language, t]);

  const handleLock = useCallback(async () => {
    if (locking.current) return;
    locking.current = true;
    try {
      if (nativeVault) await invoke("lock_vault");
      else endDemo();
    } catch {
      toast.error(t("workspace.lockFailed"));
      return;
    } finally {
      locking.current = false;
    }
    sessionVersion.current++;
    setIsAuthenticated(false);
    setGaEntryId(null);
    setEntries([]); setGroups([]); setSelectedGroupId(null); setSearchTerm("");
    setShowForm(false); setEditingEntry(undefined); setShowGroupForm(false); setEditingGroup(undefined);
    setDrawer(false); setCurrentView("passwords");
  }, [toast.error, t]);

  useEffect(() => {
    if (!drawer) return;
    drawerClose.current?.focus();
    const media = matchMedia("(min-width: 721px)");
    const closeOnDesktop = () => { if (media.matches) setDrawer(false); };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, [drawer]);

  // 自动锁定逻辑
  useEffect(() => {
    if (!isAuthenticated || autoLockTimeout === 0) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        handleLock();
      }, autoLockTimeout * 60 * 1000); // 转换为毫秒
    };

    // 监听用户活动
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    // 初始化计时器
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, [isAuthenticated, autoLockTimeout, handleLock]);

  const loadEntries = async () => {
    const current = sessionVersion.current;
    const data = await invoke<PasswordEntry[]>("get_all_entries");
    if (current === sessionVersion.current) setEntries(data);
  };

  const loadGroups = async () => {
    const current = sessionVersion.current;
    const data = await invoke<PasswordGroup[]>("get_all_groups");
    if (current === sessionVersion.current) setGroups(data.sort((a, b) => a.sort_order - b.sort_order || a.created_at - b.created_at));
  };

  const handleLogin = async () => {
    // 开始加载数据
    try {
      await Promise.all([loadEntries(), loadGroups()]);

      // 加载自动锁定设置
      const savedTimeout = Number(localStorage.getItem("autoLockTimeout"));
      setAutoLockTimeout(Number.isFinite(savedTimeout) && savedTimeout > 0 ? savedTimeout : 0);

      // 数据加载完成后才设置为已认证
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Failed to load data:", error);
      throw error; // 抛出错误让 Login 组件处理
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
      throw error;
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

  const handleUpdateOrder = async (orderedIds: string[]) => {
    await invoke("reorder_entries", { orderedIds });
    await loadEntries();
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingEntry(undefined);
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    setDrawer(false);
    setShowForm(false);
    setEditingEntry(undefined);
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
          color: groupData.color,
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
      throw error;
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
    await Promise.all([loadEntries(), loadGroups()]);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const closeDrawer = () => {
    setDrawer(false);
    requestAnimationFrame(() => drawerToggle.current?.focus());
  };

  const toggleRail = () => {
    if (document.querySelector("dialog[open]")) return;
    if (matchMedia("(max-width: 720px)").matches) {
      if (drawer) closeDrawer();
      else setDrawer(true);
    } else {
      setRailCollapsed(!railCollapsed);
      localStorage.setItem("2pass.sidebar.collapsed", String(!railCollapsed));
      if (!railCollapsed) requestAnimationFrame(() => desktopRailToggle.current?.focus());
    }
  };

  useKeyboard({
    onLock: isAuthenticated ? handleLock : undefined,
    onToggleSidebar: isAuthenticated ? toggleRail : undefined,
    onEscape: () => {
      if (drawer && !document.querySelector("dialog[open]")) closeDrawer();
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
    // Resolve the current entry before changing its folder.
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    // 如果分组没有变化，不做任何操作
    if ((entry.group_id ?? null) === targetGroupId) return;

    // 更新密码的分组
    const updatedEntry = { ...entry, group_id: targetGroupId };

    try {
      await invoke("update_entry", { entry: updatedEntry });
      await loadEntries();

      const groupName = targetGroupId
        ? groups.find(g => g.id === targetGroupId)?.name || t("groups.title")
        : t("groups.noGroup");
      toast.success(t("passwords.movedToGroup", { groupName }));
    } catch (error) {
      console.error("Failed to move entry:", error);
      toast.error(t("passwords.moveFailed") + "：" + error);
    }
  };

  const gaEntry = gaEntryId ? entries.find(entry => entry.id === gaEntryId) : undefined;
  const saveGaKey = async (secret?: string) => {
    if (!gaEntry) return;
    await invoke("update_entry", { entry: { ...gaEntry, totp_secret: secret, updated_at: Date.now() } });
    await loadEntries();
    setGaEntryId(null);
    toast.success(zh ? "GA 配置已保存" : "GA settings saved");
  };

  const views = [
    { id: "passwords", icon: "vault", label: t("passwords.allPasswords") },
    { id: "generator", icon: "generator", label: t("generator.title") },
    { id: "settings", icon: "settings", label: t("settings.title") },
    { id: "about", icon: "info", label: t("nav.about") },
  ];
  const navigate = (view: string, groupId: string | null = null) => {
    handleViewChange(view); setSelectedGroupId(groupId); setSearchTerm("");
    if (drawer) requestAnimationFrame(() => drawerToggle.current?.focus());
  };
  const navItem = ({ id, icon, label }: typeof views[number]) => {
    const active = currentView === id && (id !== "passwords" || !selectedGroupId);
    return <button type="button" key={id} className={`rail-link ${active ? "is-active" : ""}`}
      aria-current={active ? "page" : undefined} onClick={() => navigate(id)}>
      <Icon name={icon} size={18}/><span>{label}</span>{id === "passwords" && <span className="rail-count">{entries.length}</span>}
    </button>;
  };
  const location = currentView === "passwords" && selectedGroupId
    ? groups.find(group => group.id === selectedGroupId)?.name : views.find(v => v.id === currentView)?.label;

  const railToggleLabel = railCollapsed
    ? (zh ? "展开侧栏" : "Show sidebar")
    : (zh ? "收起侧栏" : "Hide sidebar");

  if (!isAuthenticated) return <Login theme={theme} onThemeChange={handleThemeChange} onLogin={handleLogin} onDemo={nativeVault ? undefined : async () => {
    startDemo(zh); await handleLogin();
  }}/>;

  return (
    <div className={`app-container ${drawer ? "drawer-open" : ""} ${railCollapsed ? "rail-collapsed" : ""}`}>
      {drawer && <div className="rail-backdrop" onClick={closeDrawer}/>}
      <aside id="workspace-navigation" className="workspace-rail" aria-label={zh ? "侧边栏" : "Sidebar"}>
        <header className="rail-brand">
          <VaultMark width={34} height={34}/>
          <div className="rail-brand-text"><b>2Pass</b>
            <span>{nativeVault ? (zh ? "本地保险库" : "Local vault") : (zh ? "演示保险库" : "Demo vault")}</span>
          </div>
          <button className="rail-close icon-btn" ref={drawerClose} aria-label={t("forms.close")} onClick={closeDrawer}><Icon name="x"/></button>
        </header>
        <div className="rail-scroll">
          <nav className="rail-primary-nav" aria-label={zh ? "主导航" : "Workspace"}>{views.slice(0,2).map(navItem)}</nav>
          <GroupList groups={groups} selectedGroupId={currentView === "passwords" ? selectedGroupId : null} hideAll
            onSelectGroup={id => navigate("passwords", id)} onAddGroup={handleAddGroup}
            onEditGroup={handleEditGroup} onDeleteGroup={handleDeleteGroup}
            onUpdateGroupOrder={handleUpdateGroupOrder} entryCountByGroup={entryCountByGroup}/>
        </div>
        <footer className="rail-bottom">
          <nav className="rail-tools" aria-label={zh ? "偏好与帮助" : "Preferences and help"}>{views.slice(2).map(navItem)}</nav>
          <button type="button" className="rail-lock" onClick={handleLock}>
            <Icon name="lock" size={15}/>
            <span>{nativeVault ? (zh ? "锁定保险库" : "Lock vault") : (zh ? "退出演示" : "Exit demo")}</span>
            <kbd aria-hidden="true">{modifier} L</kbd>
          </button>
        </footer>
      </aside>
      <div className="workspace-body" inert={drawer}>
        <header className="workspace-bar">
          <button type="button" ref={drawerToggle} className="rail-toggle icon-btn" aria-controls="workspace-navigation" aria-expanded={drawer} aria-label={zh ? "打开导航" : "Open navigation"} onClick={() => setDrawer(true)}><Icon name="menu"/></button>
          <button type="button" ref={desktopRailToggle} className="rail-desktop-toggle icon-btn" aria-label={railToggleLabel}
            aria-expanded={!railCollapsed} aria-controls="workspace-navigation" title={railToggleLabel + " (" + modifier + " B)"} onClick={toggleRail}>
            <Icon name="panel" size={17}/>
          </button>
          <span className="workspace-crumb">{zh ? "个人保险库" : "Personal vault"}</span><span className="crumb-sep">/</span>
          <strong>{location}</strong>
          <span className="session-badge"><i/>{nativeVault ? (zh ? "本地会话" : "Local session") : (zh ? "演示模式" : "Demo session")}</span>
        </header>
        <main className="app-main" key={currentView}>
          {currentView === "passwords" ? <PasswordList key={selectedGroupId || "all"} entries={filteredEntries}
            allEntries={entries} groups={groups} selectedGroupId={selectedGroupId} onEdit={handleEditEntry} onDelete={handleDeleteEntry} onConfigureGa={entry => setGaEntryId(entry.id)}
            onAdd={handleAddEntry} onUpdateOrder={handleUpdateOrder} onMoveToGroup={handleMoveToGroup}
            searchTerm={searchTerm} onSearchChange={setSearchTerm}/>
          : currentView === "generator" ? <GeneratorView/>
          : currentView === "settings" ? <Settings autoLockTimeout={autoLockTimeout} onAutoLockChange={handleAutoLockChange}
            onLock={handleLock} theme={theme} onThemeChange={handleThemeChange} onRefresh={handleRefresh} demo={!nativeVault}/>
          : <About/>}
        </main>
      </div>

      {gaEntry && <TotpConfig key={gaEntry.id} accountName={gaEntry.title} currentSecret={gaEntry.totp_secret}
        onSave={saveGaKey} onRemove={() => saveGaKey()} onClose={() => setGaEntryId(null)} />}
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
