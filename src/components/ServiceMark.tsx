import type { CSSProperties, ReactNode } from "react";
import type { PasswordEntry } from "../types";
import { identityTone } from "../utils/identityColors";
import { entryIcons } from "../utils/entryIcons";
import Icon from "./Icon";
import "../styles/EntryIdentity.css";

const marks: Record<string, { color: string; ink: string; glyph: ReactNode }> = {
  github: { color: "#282b30", ink: "#fafafa", glyph: <path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87c-2.79.6-3.38-1.18-3.38-1.18-.46-1.16-1.12-1.47-1.12-1.47-.91-.62.07-.61.07-.61 1.01.07 1.54 1.03 1.54 1.03.9 1.54 2.35 1.1 2.92.84.09-.65.35-1.1.64-1.35-2.23-.25-4.57-1.12-4.57-4.98 0-1.1.39-2 1.03-2.7-.1-.25-.45-1.28.1-2.67 0 0 .84-.27 2.75 1.03a9.54 9.54 0 0 1 5 0c1.9-1.3 2.74-1.03 2.74-1.03.56 1.39.2 2.42.1 2.67.64.7 1.03 1.6 1.03 2.7 0 3.87-2.35 4.73-4.58 4.98.36.31.68.92.68 1.85V21c0 .26.18.58.69.48A10 10 0 0 0 12 2Z" /> },
  figma: { color: "#272729", ink: "#fff", glyph: <><path fill="#f24e1e" d="M9 2h3v6H9a3 3 0 1 1 0-6Z" /><path fill="#ff7262" d="M12 2h3a3 3 0 0 1 0 6h-3Z" /><path fill="#a259ff" d="M9 8h3v6H9a3 3 0 1 1 0-6Z" /><circle fill="#1abcfe" cx="15" cy="11" r="3" /><path fill="#0acf83" d="M9 14h3v3a3 3 0 1 1-3-3Z" /></> },
  notion: { color: "#eeeee9", ink: "#222324", glyph: <><path d="m3.5 5.2 12.4-1.7 4.8 2.9v13.1L8 21 3.5 17.4Zm0 0 4.7 3L20.6 6.6M8.2 8.2 8 21" stroke="currentColor" fill="none" strokeWidth="1.45" strokeLinejoin="round" /><path fill="currentColor" d="m9.9 10.1 3.1-.4 3.4 4.9v-4.4l-1.1-.1v-.9l3.4-.4v.9l-.85.36v7.4l-1.5.45-4.2-6.13v5.25l1.08.12v.91l-3.5.47v-.93l.91-.35v-6.3l-.74-.06Z" /></> },
  linear: { color: "#6867ce", ink: "#fff", glyph: <><circle fill="currentColor" cx="12" cy="12" r="9.4" /><path stroke="#6867ce" strokeWidth="1.4" d="m1 4 19 19M0 7l16 16M0 11l13 13" /></> },
  vercel: { color: "#eaece9", ink: "#181b19", glyph: <path fill="currentColor" d="M12 4 22 20H2Z" /> },
  slack: { color: "#312635", ink: "#fff", glyph: <g strokeWidth="4.2" strokeLinecap="round"><path stroke="#36c5f0" d="M4 9h5m0-5v.01" /><path stroke="#2eb67d" d="M15 4v5m5 0h.01" /><path stroke="#ecb22e" d="M20 15h-5m0 5v.01" /><path stroke="#e01e5a" d="M9 20v-5m-5 0h.01" /></g> },
  google: { color: "#f4f5f0", ink: "#fff", glyph: <><path fill="#4285f4" d="M21.5 12.2c0-.67-.06-1.3-.17-1.92H12v3.63h5.34a4.55 4.55 0 0 1-1.98 2.99v2.46h3.19c1.87-1.72 2.95-4.25 2.95-7.16Z" /><path fill="#34a853" d="M12 22c2.66 0 4.89-.88 6.55-2.4l-3.19-2.46c-.88.59-2.01.93-3.36.93-2.58 0-4.77-1.74-5.55-4.07H3.16v2.54A10 10 0 0 0 12 22Z" /><path fill="#fbbc05" d="M6.45 14a6.1 6.1 0 0 1 0-4V7.46H3.16a10 10 0 0 0 0 9.08Z" /><path fill="#ea4335" d="M12 5.93c1.45 0 2.74.49 3.77 1.47l2.83-2.83A9.53 9.53 0 0 0 12 2a10 10 0 0 0-8.84 5.46L6.45 10C7.23 7.67 9.42 5.93 12 5.93Z" /></> },
};

type MarkEntry = Pick<PasswordEntry, "title" | "url" | "icon" | "color">;

export default function ServiceMark({ entry }: { entry: MarkEntry }) {
  const title = entry.title.trim();
  const name = title.toLowerCase();
  const choice = entryIcons.find(option => option.id === entry.icon)?.id ?? "auto";

  if (choice === "auto" && !entry.color) {
    let host = "";
    try { host = new URL(entry.url?.[0] || "").hostname.toLowerCase(); } catch { /* Entries can be identified by title alone. */ }
    const service = Object.keys(marks).find(id => host === id + ".com" || host.endsWith("." + id + ".com") || name === id);
    if (service) {
      const mark = marks[service];
      const style = { "--mark-bg": mark.color, "--mark-ink": mark.ink } as CSSProperties;
      return (
        <span className="vault-service-mark" aria-hidden="true" style={style}>
          <svg viewBox="0 0 24 24" focusable="false">{mark.glyph}</svg>
        </span>
      );
    }
  }

  const initial = Array.from(title)[0]?.toLocaleUpperCase() || "·";
  return (
    <span className="vault-service-mark" data-identity-tone={identityTone(name, entry.color)} aria-hidden="true">
      {choice === "auto" || choice === "initial" ? initial : <Icon name={choice} size={21} />}
    </span>
  );
}
