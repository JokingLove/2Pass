import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import PasswordList from "./components/PasswordList";
import PasswordForm from "./components/PasswordForm";
import GeneratorView from "./components/GeneratorView";
import Settings from "./components/Settings";
import About from "./components/About";
import { PasswordEntry } from "./types";
import { useKeyboard } from "./hooks/useKeyboard";
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState("passwords");
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [autoLockTimeout, setAutoLockTimeout] = useState<number>(0); // 0 表示禁用，单位：分钟
  const [theme, setTheme] = useState<string>("default");

  useEffect(() => {
    // 加载主题设置
    const savedTheme = localStorage.getItem("theme") || "default";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadEntries();
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
    } catch (error) {
      console.error("Failed to save entry:", error);
      alert("保存失败：" + error);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await invoke("delete_entry", { id });
      await loadEntries();
    } catch (error) {
      console.error("Failed to delete entry:", error);
      alert("删除失败：" + error);
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
      alert("更新顺序失败：" + error);
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
    setCurrentView("passwords");
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

  const renderView = () => {
    switch (currentView) {
      case "passwords":
        return (
          <PasswordList
            entries={entries}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            onAdd={handleAddEntry}
            onUpdateOrder={handleUpdateOrder}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
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
          <PasswordList
            entries={entries}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            onAdd={handleAddEntry}
            onUpdateOrder={handleUpdateOrder}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        );
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        entryCount={entries.length}
        onLock={handleLock}
      />
      <main className="main-content">
        {renderView()}
      </main>
      {showForm && (
        <PasswordForm
          entry={editingEntry}
          onSave={handleSaveEntry}
          onCancel={handleCancelForm}
        />
      )}
    </div>
  );
}

export default App;
