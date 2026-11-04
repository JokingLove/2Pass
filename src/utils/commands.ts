import { invoke as nativeInvoke, isTauri } from "@tauri-apps/api/core";
import type { PasswordEntry, PasswordGroup } from "../types";

export const nativeVault = isTauri();

// Browser sessions contain only disposable examples. No vault file, browser
// storage or master password participates in the preview.
let session: { entries: PasswordEntry[]; groups: PasswordGroup[] } | undefined;
export function startDemo(chinese: boolean) {
  if (nativeVault) throw new Error("Demo is unavailable in the desktop vault.");
  const now = Date.now();
  const folders = chinese ? ["工作空间", "个人账户", "开发工具"] : ["Workspace", "Personal", "Development"];
  const groups = folders.map((name, i) => ({ id: "folder-" + i, name, icon: ["💼","🏠","🔧"][i], created_at: now, sort_order:i }));
  const services = [
    ["GitHub","github.com",2], ["Figma","figma.com",0], ["Notion","notion.so",0],
    ["Google","google.com",1], ["Linear","linear.app",0], ["Vercel","vercel.com",2], ["Slack","slack.com",0],
  ] as const;
  const entries = services.map(([title, domain, folder], i): PasswordEntry => ({
    id:"sample-" + i, title, username: (folder === 1 ? "alex" : "studio") + "@example.com",
    password:"DemoOnly-" + title + "-482!", notes:"", url:["https://" + domain], group_id:groups[folder].id,
    tags:[groups[folder].name], sort_order:i, created_at:now - (20 + i)*86400000, updated_at:now - i*86400000,
    ...(i === 0 ? { totp_secret: "JBSWY3DPEHPK3PXP" } : {}),
  }));
  session = {entries, groups};
}
export function endDemo() { session = undefined; }

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
async function demoTotp(secret: string) {
  const clean = secret.replace(/\s/g, "").replace(/=+$/, "").toUpperCase();
  if (!/^[A-Z2-7]+$/.test(clean) || [1,3,6].includes(clean.length % 8)) throw new Error("Invalid Base32 key");
  const bits = [...clean].map(c => alphabet.indexOf(c).toString(2).padStart(5,"0")).join("");
  if (bits.slice(bits.length - bits.length % 8).includes("1")) throw new Error("Invalid Base32 key");
  const bytes = Uint8Array.from(bits.match(/.{8}/g) || [], b => parseInt(b,2));
  const counter = new ArrayBuffer(8);
  new DataView(counter).setBigUint64(0, BigInt(Math.floor(Date.now() / 30000)));
  const key = await crypto.subtle.importKey("raw", bytes, { name:"HMAC", hash:"SHA-1" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, counter));
  const offset = digest[digest.length - 1] & 15;
  return ((new DataView(digest.buffer).getUint32(offset) & 0x7fffffff) % 1000000).toString().padStart(6,"0");
}
export async function invoke<T = void>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  if (nativeVault) return nativeInvoke<T>(command, args);
  if (!session) throw new Error("Demo session is closed.");
  const entry = args.entry as PasswordEntry;
  const group = args.group as PasswordGroup;
  let result: unknown;
  switch (command) {
    case "get_all_entries": result = session.entries; break;
    case "get_all_groups": result = session.groups; break;
    case "add_entry": session.entries.push(structuredClone(entry)); break;
    case "update_entry": session.entries = session.entries.map(e => e.id === entry.id ? structuredClone(entry) : e); break;
    case "delete_entry": session.entries = session.entries.filter(e => e.id !== args.id); break;
    case "add_group": session.groups.push(structuredClone(group)); break;
    case "update_group": session.groups = session.groups.map(g => g.id === group.id ? structuredClone(group) : g); break;
    case "delete_group":
      if (session.entries.some(e => e.group_id === args.id)) throw new Error("Group still has entries");
      session.groups = session.groups.filter(g => g.id !== args.id);
      break;
    case "generate_totp": return await demoTotp(String(args.secret)) as T;
    case "generate_totp_secret": result = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => alphabet[b & 31]).join(""); break;
    case "get_totp_qr_url": {
      const issuer = encodeURIComponent(String(args.issuer));
      result = "otpauth://totp/" + issuer + ":" + encodeURIComponent(String(args.accountName)) + "?issuer=" + issuer + "&secret=" + encodeURIComponent(String(args.secret));
      break;
    }
    default: throw new Error("This action requires the desktop vault.");
  }
  return structuredClone(result) as T;
}
