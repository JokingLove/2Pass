import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";
import "../styles/Toast.css";

export interface ToastProps {
  id: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  duration?: number;
  onClose: (id: string) => void;
}

function Toast({ id, message, type = "info", duration = 3000, onClose }: ToastProps) {
  const { t } = useTranslation();
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <div className={`toast toast-${type}`} role={type === "error" ? "alert" : "status"}>
      <div className="toast-icon"><Icon name={type === "success" ? "check" : "info"} size={14}/></div>
      <div className="toast-message">{message}</div>
      <button aria-label={t("forms.close")} className="toast-close" onClick={() => onClose(id)}>
        <Icon name="x" size={14}/>
      </button>
    </div>
  );
}

export default Toast;
