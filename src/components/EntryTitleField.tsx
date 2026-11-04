import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PasswordEntry } from "../types";
import { identityPalette, identityTone, randomIdentityTone } from "../utils/identityColors";
import { entryIcons } from "../utils/entryIcons";
import Icon from "./Icon";
import ServiceMark from "./ServiceMark";

type EntryAppearance = Pick<PasswordEntry, "icon" | "color">;

interface EntryTitleFieldProps {
  title: string;
  urls: string[];
  appearance: EntryAppearance;
  onTitleChange: (title: string) => void;
  onAppearanceChange: (appearance: EntryAppearance) => void;
}

export default function EntryTitleField({ title, urls, appearance, onTitleChange, onAppearanceChange }: EntryTitleFieldProps) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const [expanded, setExpanded] = useState(false);
  const titleId = useId();
  const editorId = useId();
  const entry = { title, url: urls, ...appearance };
  const tone = identityTone(title.trim().toLowerCase(), appearance.color);
  const toneName = identityPalette.find(option => option.id === tone);
  const selectedIcon = entryIcons.find(option => option.id === appearance.icon)?.id ?? "auto";
  const iconId = selectedIcon === "auto" && appearance.color ? "initial" : selectedIcon;
  const initial = Array.from(title.trim())[0]?.toLocaleUpperCase() || "A";

  function setColor(color: string) {
    onAppearanceChange({ color, icon: iconId === "auto" ? "initial" : iconId });
  }

  function setIcon(icon: string) {
    onAppearanceChange(icon === "auto" ? {} : { ...appearance, icon });
  }

  return (
    <div className="vm-field pf-title-field">
      <div className="pf-password-label">
        <label htmlFor={titleId}>{t("passwords.entryTitle")}</label>
        <button type="button" className="pf-text-action" aria-expanded={expanded} aria-controls={editorId} onClick={() => setExpanded(!expanded)}>
          {zh ? "图标与配色" : "Icon & color"}<Icon name={expanded ? "chevron-down" : "chevron-right"} size={13} />
        </button>
      </div>
      <div className="pf-title-row">
        <ServiceMark entry={entry} />
        <input id={titleId} autoFocus required value={title} onChange={event => onTitleChange(event.target.value)} placeholder={t("passwords.titlePlaceholder")} />
      </div>
      {expanded && (
        <div id={editorId} className="pf-appearance">
          <fieldset>
            <legend>{zh ? "条目图标" : "Item icon"}</legend>
            <div className="pf-icon-options">
              {entryIcons.map(option => (
                <button key={option.id} type="button" aria-pressed={iconId === option.id} onClick={() => setIcon(option.id)} title={zh ? option.zh : option.en}>
                  {option.id === "auto" ? <ServiceMark entry={{ title, url: urls }} /> : option.id === "initial"
                    ? <b aria-hidden="true">{initial}</b> : <Icon name={option.id} size={16} />}
                  <span>{zh ? option.zh : option.en}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>{zh ? "识别色" : "Accent color"}</legend>
            <div className="pf-colors">
              {identityPalette.map(option => {
                const selected = iconId !== "auto" && tone === option.id;
                const name = zh ? option.zh : option.en;
                return (
                  <button key={option.id} type="button" className="pf-swatch" data-identity-tone={option.id}
                    title={name} aria-label={name} aria-pressed={selected} onClick={() => setColor(option.id)}>
                    <span>{selected && <Icon name="check" size={12} />}</span>
                  </button>
                );
              })}
              <button type="button" className="pf-random" onClick={() => setColor(randomIdentityTone(tone))}>
                <Icon name="generator" size={15} />{zh ? "随机配色" : "Random color"}
              </button>
            </div>
            <p className="pf-tone-name" role="status">
              {iconId === "auto" ? (zh ? "自动识别服务；选颜色可改用首字图标。" : "Detected from the service. Pick a color to use the title initial.")
                : toneName && (zh ? toneName.zh : toneName.en)}
            </p>
          </fieldset>
        </div>
      )}
    </div>
  );
}
