import { useTranslation } from "react-i18next";
import { PasswordHistory as HistoryRecord } from "../types";
import Icon from "./Icon";
import "../styles/PasswordHistory.css";

interface PasswordHistoryProps {
  history?: HistoryRecord[];
  updatedAt: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function PasswordHistory({ history, updatedAt, isExpanded, onToggle }: PasswordHistoryProps) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const format = (time: number) => new Date(time).toLocaleString(i18n.language, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return <section className="v-history">
    <p><Icon name="clock" size={15} />{t("passwords.updatedOn")} {format(updatedAt)}</p>
    {!!history?.length && <>
      <button type="button" onClick={onToggle} aria-expanded={isExpanded}><span>{zh ? "修改历史" : "Change history"} · {history.length}</span><Icon name={isExpanded ? "chevron-down" : "chevron-right"} size={15} /></button>
      {isExpanded && <ol>{history.map((record, index) => <li key={index}>
        <time>{format(record.timestamp)}</time>
        {record.password !== undefined && <span>{t("passwords.passwordUpdated")}</span>}
        {record.username !== undefined && <span>{t("passwords.username")}: {record.username}</span>}
        {record.notes !== undefined && <span>{t("passwords.notes")}: {record.notes}</span>}
      </li>)}</ol>}
    </>}
  </section>;
}
