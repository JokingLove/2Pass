import { useState, useEffect } from "react";
import { PasswordGroup } from "../types";
import "../styles/GroupForm.css";

interface GroupFormProps {
  group?: PasswordGroup;
  onSave: (group: Partial<PasswordGroup>) => void;
  onCancel: () => void;
}

const ICON_OPTIONS = ["📁", "💼", "🏦", "🎮", "🛒", "📧", "🔧", "🏠", "🎓", "💳", "🌐", "📱"];

function GroupForm({ group, onSave, onCancel }: GroupFormProps) {
  const [name, setName] = useState(group?.name || "");
  const [icon, setIcon] = useState(group?.icon || "📁");

  useEffect(() => {
    if (group) {
      setName(group.name);
      setIcon(group.icon);
    }
  }, [group]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("请输入分组名称");
      return;
    }

    onSave({
      ...group,
      name: name.trim(),
      icon,
    });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="group-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{group ? "编辑分组" : "新建分组"}</h2>
          <button onClick={onCancel} className="close-btn">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>分组名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：工作、个人、银行"
              autoFocus
              autoCorrect="off"
            />
          </div>

          <div className="form-group">
            <label>图标</label>
            <div className="icon-selector">
              {ICON_OPTIONS.map((iconOption) => (
                <button
                  key={iconOption}
                  type="button"
                  className={`icon-option ${icon === iconOption ? "selected" : ""}`}
                  onClick={() => setIcon(iconOption)}
                >
                  {iconOption}
                </button>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              取消
            </button>
            <button type="submit" className="btn-primary">
              {group ? "保存" : "创建"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GroupForm;
