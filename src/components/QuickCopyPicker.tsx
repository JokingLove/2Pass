import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { getQuickCopyLabel, quickCopyActions, type CombineFormat, type QuickCopyAction } from "../utils/quickCopy";
import Icon from "./Icon";
import "../styles/QuickCopyPicker.css";

interface QuickCopyPickerProps {
  actions: readonly QuickCopyAction[];
  label?: string;
  format?: CombineFormat;
  onChange: (next: QuickCopyAction[]) => void;
  available?: (action: QuickCopyAction) => boolean;
}

export default function QuickCopyPicker({ actions, label, format, onChange, available }: QuickCopyPickerProps) {
  const { i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const hintId = useId();
  const [announcement, setAnnouncement] = useState("");
  const selected = actions.filter(action => !available || available(action));
  const options = quickCopyActions.filter(action => !available || available(action));
  const items = [...selected, ...options.filter(action => !selected.includes(action))];

  function move(index: number, step: -1 | 1) {
    const position = index + step;
    if (position < 0 || position >= selected.length) return;
    const updated = [...selected];
    const [action] = updated.splice(index, 1);
    updated.splice(position, 0, action);
    onChange(updated);
    const name = getQuickCopyLabel(action, zh, format);
    setAnnouncement(zh ? `${name}已移至第 ${position + 1} 位` : `${name} moved to position ${position + 1}`);
  }

  function toggle(action: QuickCopyAction) {
    setAnnouncement("");
    if (selected.includes(action)) {
      onChange(selected.filter(item => item !== action));
    } else if (selected.length < 4) {
      onChange([...selected, action]);
    }
  }

  return (
    <fieldset className="quick-picker" aria-describedby={hintId}>
      <legend>{label ?? (zh ? "显示的快捷操作" : "Visible shortcuts")}</legend>
      <p id={hintId} className="quick-picker-hint">
        {zh ? "最多选择四项，可用箭头调整顺序。取消全部即可隐藏。" : "Choose up to four and use the arrows to reorder. Uncheck all to hide shortcuts."}
      </p>
      <ul className="quick-picker-items">
        {items.map((action, index) => {
          const checked = index < selected.length;
          const disabled = !checked && selected.length >= 4;
          const name = getQuickCopyLabel(action, zh, format);
          const up = zh ? `上移：${name}` : `Move ${name} up`;
          const down = zh ? `下移：${name}` : `Move ${name} down`;
          return (
            <li key={action} className="quick-picker-row">
              <label className={disabled ? "quick-picker-choice is-disabled" : "quick-picker-choice"}>
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(action)} />
                <span>{name}</span>
              </label>
              {checked && (
                <div className="quick-picker-order">
                  <button type="button" title={up} aria-label={up} disabled={index === 0} onClick={() => move(index, -1)}>
                    <Icon name="arrow-up" size={14} />
                  </button>
                  <button type="button" title={down} aria-label={down} disabled={index + 1 === selected.length} onClick={() => move(index, 1)}>
                    <Icon name="arrow-down" size={14} />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <span role="status" className="vault-sr">{announcement}</span>
    </fieldset>
  );
}
