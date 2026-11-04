import { useTranslation } from "react-i18next";
import type { useVaultListPreferences } from "../hooks/useVaultListPreferences";
import Modal from "./Modal";
import QuickCopyPicker from "./QuickCopyPicker";
import GaFormatEditor from "./GaFormatEditor";
import Icon from "./Icon";

type Preferences = ReturnType<typeof useVaultListPreferences>["preferences"];

interface VaultListDisplayProps {
  preferences: Preferences;
  onChange: (preferences: Preferences) => void;
  onClose: () => void;
}

export default function VaultListDisplay({ preferences, onChange, onClose }: VaultListDisplayProps) {
  const { i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const fields = [
    { key: "showDomain", label: zh ? "网站域名" : "Website domain", icon: "globe" },
    { key: "showGroup", label: zh ? "分组" : "Group", icon: "folder" },
    { key: "showTags", label: zh ? "标签" : "Tags", icon: "tag" },
    { key: "showGaDigits", label: zh ? "行内 GA 验证码" : "GA digits in rows", icon: "shield" },
    { key: "showUpdated", label: zh ? "更新时间" : "Updated date", icon: "clock" },
  ] as const;

  return (
    <Modal title={zh ? "列表显示" : "List display"} icon="settings" onClose={onClose} narrow>
      <div className="vault-display-body">
        <fieldset>
          <legend>{zh ? "显示字段" : "Visible fields"}</legend>
          <div className="vault-display-fields">
            {fields.map(field => (
              <label key={field.key}>
                <Icon name={field.icon} size={14} />
                {field.label}
                <input type="checkbox" checked={preferences[field.key]} onChange={event => onChange({ ...preferences, [field.key]: event.target.checked })} />
              </label>
            ))}
          </div>
        </fieldset>
        <QuickCopyPicker label={zh ? "默认快捷复制" : "Default quick copy"} actions={preferences.actions} format={preferences.combineFormat} onChange={actions => onChange({ ...preferences, actions })} />
        <details className="ga-display-format">
          <summary>{zh ? "默认 GA 拼接格式" : "Default GA combination format"}</summary>
          <GaFormatEditor format={preferences.combineFormat} onChange={combineFormat => onChange({ ...preferences, combineFormat })} />
        </details>
      </div>
      <footer className="vm-actions">
        <span className="vault-display-saved">{zh ? "自动保存到此设备" : "Saved on this device"}</span>
        <button type="button" className="vm-button is-primary" onClick={onClose}>{zh ? "完成" : "Done"}</button>
      </footer>
    </Modal>
  );
}
