import { useTranslation } from "react-i18next";
import type { PasswordGroup } from "../types";
import { identityTone } from "../utils/identityColors";
import GroupSymbol from "./GroupSymbol";
import "../styles/EntryIdentity.css";

interface EntryGroupSelectProps {
  groups: PasswordGroup[];
  groupId: string;
  onChange: (groupId: string) => void;
}

export default function EntryGroupSelect({ groups, groupId, onChange }: EntryGroupSelectProps) {
  const { t } = useTranslation();
  const group = groups.find(item => item.id === groupId);
  return (
    <span className="entry-group-select">
      <span className="entry-group-symbol" data-identity-tone={group ? identityTone(group.id, group.color) : undefined} aria-hidden="true">
        <GroupSymbol value={group?.icon ?? "📁"} size={16} />
      </span>
      <select value={groupId} aria-label={t("passwords.group")} onChange={event => onChange(event.target.value)}>
        <option value="">{t("groups.noGroup")}</option>
        {groups.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </span>
  );
}
