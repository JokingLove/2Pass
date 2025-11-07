import { useEffect } from 'react';

interface KeyboardShortcuts {
  onNew?: () => void;
  onSearch?: () => void;
  onLock?: () => void;
  onToggleSidebar?: () => void;
  onEscape?: () => void;
}

export const useKeyboard = (shortcuts: KeyboardShortcuts) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + N - 新建密码
      if (modKey && e.key === 'n' && shortcuts.onNew) {
        e.preventDefault();
        shortcuts.onNew();
      }

      // Cmd/Ctrl + F - 搜索
      if (modKey && e.key === 'f' && shortcuts.onSearch) {
        e.preventDefault();
        shortcuts.onSearch();
      }

      // Cmd/Ctrl + L - 锁定
      if (modKey && e.key === 'l' && shortcuts.onLock) {
        e.preventDefault();
        shortcuts.onLock();
      }

      // Cmd/Ctrl + B - 切换侧边栏
      if (modKey && e.key === 'b' && shortcuts.onToggleSidebar) {
        e.preventDefault();
        shortcuts.onToggleSidebar();
      }

      // Esc - 关闭弹窗
      if (e.key === 'Escape' && shortcuts.onEscape) {
        shortcuts.onEscape();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [shortcuts]);
};
