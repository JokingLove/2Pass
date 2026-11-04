import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { PasswordGroup } from "../types";
import { identityPalette, identityTone } from "../utils/identityColors";
import GroupSymbol, { groupSymbols, groupSymbolLabel } from "./GroupSymbol";
import Icon from "./Icon";
import Modal from "./Modal";
import "../styles/GroupForm.css";

interface GroupFormProps {
  group?: PasswordGroup;
  onSave: (group: Partial<PasswordGroup>) => void | Promise<void>;
  onCancel: () => void;
}

export default function GroupForm({ group, onSave, onCancel }: GroupFormProps) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const icons = group?.icon && !groupSymbols.includes(group.icon)
    ? [...groupSymbols, group.icon]
    : groupSymbols;
  const [name, setName] = useState(group?.name ?? "");
  const [icon, setIcon] = useState(group?.icon ?? icons[0]);
  const [color, setColor] = useState(() => identityTone(group?.id ?? crypto.randomUUID(), group?.color));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onSave({ ...group, name: name.trim(), icon, color });
    } catch {
      setError(t("groups.saveGroupFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal narrow title={t(group ? "groups.editGroup" : "groups.addGroup")} onClose={onCancel} busy={busy} icon="folder">
      <form onSubmit={submit}>
        <div className="vm-fields">
          <label className="vm-field">
            {t("groups.groupName")}
            <input autoFocus required value={name} onChange={e => setName(e.target.value)} placeholder={t("groups.groupNamePlaceholder")} />
          </label>
          <div className="vm-field">
            <span>{t("groups.groupIcon")}</span>
            <div className="folder-icons" data-identity-tone={color}>
              {icons.map(value => (
                <button type="button" key={value} aria-pressed={value === icon}
                  aria-label={groupSymbolLabel(value, zh)} title={groupSymbolLabel(value, zh)} onClick={() => setIcon(value)}>
                  <GroupSymbol value={value} size={19}/>
                </button>
              ))}
            </div>
          </div>
          <div className="vm-field" role="group" aria-label={zh ? "分组颜色" : "Group color"}>
            <span>{zh ? "分组颜色" : "Group color"}</span>
            <div className="folder-tones">
              {identityPalette.map(tone => (
                <button type="button" key={tone.id} data-identity-tone={tone.id} aria-pressed={color === tone.id}
                  onClick={() => setColor(tone.id)} title={zh ? tone.zh : tone.en}>
                  {color === tone.id ? <Icon name="check" size={12}/> : <i aria-hidden="true"/>}
                  {zh ? tone.zh : tone.en}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="vm-error" role="alert">{error}</p>}
        </div>
        <div className="vm-actions">
          <button type="button" disabled={busy} className="vm-button" onClick={onCancel}>{t("forms.cancel")}</button>
          <button type="submit" disabled={!name.trim() || busy} className="vm-button is-primary">{t("forms.save")}</button>
        </div>
      </form>
    </Modal>
  );
}
