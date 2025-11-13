import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PasswordGroup } from "../types";
import "../styles/GroupForm.css";

interface GroupFormProps {
  group?: PasswordGroup;
  onSave: (group: Partial<PasswordGroup>) => void;
  onCancel: () => void;
}

const ICON_OPTIONS = ["📁", "💼", "🏦", "🎮", "🛒", "📧", "🔧", "🏠", "🎓", "💳", "🌐", "📱"];

function GroupForm({ group, onSave, onCancel }: GroupFormProps) {
  const { t } = useTranslation();
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
      alert(t("groups.pleaseEnterGroupName"));
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
          <h2>{group ? t("groups.editGroup") : t("groups.addGroup")}</h2>
          <button onClick={onCancel} className="close-btn">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t("groups.groupName")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("groups.groupNamePlaceholder")}
              autoFocus
              autoCorrect="off"
            />
          </div>

          <div className="form-group">
            <label>{t("groups.groupIcon")}</label>
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
              {t("forms.cancel")}
            </button>
            <button type="submit" className="btn-primary">
              {group ? t("forms.save") : t("forms.add")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GroupForm;
