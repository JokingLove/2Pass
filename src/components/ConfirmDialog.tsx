import "../styles/ConfirmDialog.css";

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog">
        <div className="confirm-icon">
          ⚠️
        </div>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirm-actions">
          <button onClick={onCancel} className="confirm-btn cancel-btn">
            取消
          </button>
          <button onClick={onConfirm} className="confirm-btn delete-btn">
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;

