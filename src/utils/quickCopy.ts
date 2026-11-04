import type { PasswordEntry } from "../types";
import { invoke } from "./commands";

export const quickCopyActions = ["username", "password", "totp", "combined", "url", "notes"] as const;
export type QuickCopyAction = (typeof quickCopyActions)[number];

export interface CombineFormat {
  order: "password-first" | "ga-first";
  separator: string;
}

export const defaultCombineFormat: CombineFormat = { order: "password-first", separator: "" };

export function isValidGaSeparator(separator: string) {
  // Restrict the saved format to short punctuation or spaces, never credential text.
  return /^[\p{P}\p{S} ]{0,8}$/u.test(separator);
}

export function formatCombined(password: string, code: string, format = defaultCombineFormat) {
  return format.order === "ga-first"
    ? code + format.separator + password
    : password + format.separator + code;
}

const labels: Record<QuickCopyAction, readonly [string, string]> = {
  username: ["用户名", "Username"],
  password: ["密码", "Password"],
  totp: ["GA 验证码", "GA code"],
  combined: ["密码＋GA", "Password + GA"],
  url: ["网址", "Website"],
  notes: ["备注", "Notes"],
};

export function getQuickCopyLabel(action: QuickCopyAction, zh: boolean, format = defaultCombineFormat) {
  if (action === "combined" && format.order === "ga-first") return zh ? "GA＋密码" : "GA + password";
  return labels[action][zh ? 0 : 1];
}

function firstWebsite(entry: PasswordEntry) {
  return entry.url?.find(url => url.trim()) || "";
}

export function canQuickCopy(entry: PasswordEntry, action: QuickCopyAction) {
  switch (action) {
    case "username": return Boolean(entry.username?.trim());
    case "password": return Boolean(entry.password);
    case "totp": return Boolean(entry.totp_secret?.trim());
    case "combined": return Boolean(entry.password && entry.totp_secret?.trim());
    case "url": return Boolean(firstWebsite(entry));
    case "notes": return Boolean(entry.notes?.trim());
  }
}

export async function resolveQuickCopy(entry: PasswordEntry, action: QuickCopyAction, format = defaultCombineFormat): Promise<string> {
  if (!canQuickCopy(entry, action)) throw new Error("Field unavailable");
  if (action === "url") return firstWebsite(entry);
  if (action === "totp" || action === "combined") {
    const code = await invoke<string>("generate_totp", { secret: entry.totp_secret });
    return action === "combined" ? formatCombined(entry.password, code, format) : code;
  }
  return entry[action];
}
