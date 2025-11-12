import { useEffect } from "react";
import "../styles/Toast.css";

export interface ToastProps {
  id: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  duration?: number;
  onClose: (id: string) => void;
}

function Toast({ id, message, type = "info", duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✓";
      case "warning":
        return "⚠";
      case "error":
        return "✕";
      default:
        return "ℹ";
    }
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={() => onClose(id)}>
        ✕
      </button>
    </div>
  );
}

export default Toast;
