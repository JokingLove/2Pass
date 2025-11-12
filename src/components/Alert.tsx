import "../styles/ConfirmDialog.css";

interface AlertProps {
  title: string;
  message: string;
  type?: "info" | "warning" | "danger" | "success";
  buttonText?: string;
  onClose: () => void;
}

function Alert({
  title,
  message,
  type = "info",
  buttonText = "确定",
  onClose,
}: AlertProps) {
  const getIcon = () => {
    switch (type) {
      case "warning":
        return "⚠️";
      case "danger":
        return "❌";
      case "success":
        return "✅";
      default:
        return "ℹ️";
    }
  };

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-icon ${type}`}>{getIcon()}</div>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button onClick={onClose} className={`btn-confirm ${type}`}>
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Alert;
