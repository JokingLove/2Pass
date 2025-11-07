import { useState, useEffect, useRef } from "react";
import "../styles/Sidebar.css";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  entryCount: number;
  onLock: () => void;
}

const MIN_WIDTH = 180; // 最小宽度
const MAX_WIDTH = 400; // 最大宽度
const DEFAULT_WIDTH = 260; // 默认宽度
const COLLAPSE_THRESHOLD = 150; // 低于此宽度自动折叠

function Sidebar({ currentView, onViewChange, entryCount, onLock }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 从 localStorage 加载保存的宽度
  useEffect(() => {
    const savedWidth = localStorage.getItem("sidebarWidth");
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) {
        setSidebarWidth(width);
      }
    }
  }, []);

  // 保存宽度到 localStorage
  useEffect(() => {
    if (!isCollapsed) {
      localStorage.setItem("sidebarWidth", sidebarWidth.toString());
    }
  }, [sidebarWidth, isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;

      // 检查是否低于最小宽度阈值，自动折叠
      if (newWidth < COLLAPSE_THRESHOLD) {
        setIsCollapsed(true);
        setIsResizing(false);
        return;
      }

      // 如果已折叠且拖动到足够宽，展开
      if (isCollapsed && newWidth >= MIN_WIDTH) {
        setIsCollapsed(false);
      }

      // 限制在最小和最大宽度之间
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      } else if (newWidth > MAX_WIDTH) {
        setSidebarWidth(MAX_WIDTH);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, isCollapsed]);

  const menuItems = [
    {
      id: "passwords",
      icon: "🔐",
      label: "密码管理",
      badge: entryCount,
    },
    {
      id: "generator",
      icon: "🎲",
      label: "密码生成器",
    },
    {
      id: "settings",
      icon: "⚙️",
      label: "设置",
    },
    {
      id: "about",
      icon: "ℹ️",
      label: "关于",
    },
  ];

  return (
    <div
      ref={sidebarRef}
      className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isResizing ? "resizing" : ""}`}
      style={{ width: isCollapsed ? "70px" : `${sidebarWidth}px` }}
    >
      <div className="sidebar-header">
        {!isCollapsed && (
          <div className="sidebar-logo">
            <span className="logo-icon">🔐</span>
            <span className="logo-text">2Pass</span>
          </div>
        )}
        <button onClick={toggleSidebar} className="toggle-btn" title={isCollapsed ? "展开" : "折叠"}>
          {isCollapsed ? "▶" : "◀"}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? "active" : ""}`}
            onClick={() => onViewChange(item.id)}
            title={isCollapsed ? item.label : ""}
          >
            <span className="nav-icon">{item.icon}</span>
            {!isCollapsed && (
              <>
                <span className="nav-label">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!isCollapsed ? (
          <>
            <div className="user-info">
              <div className="user-icon">👤</div>
              <div className="user-details">
                <div className="user-name">主密码已解锁</div>
                <div className="user-status">安全存储中</div>
              </div>
            </div>
            <button onClick={onLock} className="lock-btn" title="锁定应用">
              🔒 锁定
            </button>
          </>
        ) : (
          <button onClick={onLock} className="lock-btn-collapsed" title="锁定应用">
            🔒
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div
          className="resize-handle"
          onMouseDown={handleMouseDown}
          title="拖动调整宽度"
        >
          <div className="resize-handle-line" />
        </div>
      )}
    </div>
  );
}

export default Sidebar;

