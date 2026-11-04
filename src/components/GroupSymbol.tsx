import Icon from "./Icon";

// Keep the original stored keys so existing vaults retain their chosen icons.
const symbols = {
  "📁": ["文件夹", "Folder", ""],
  "💼": ["工作", "Work", "M3 8h18v12H3z M8.5 8V5h7v3 M3 12c5 2 13 2 18 0m-10 1h2v2h-2z"],
  "🏠": ["个人", "Home", "m3 10 9-7 9 7 M5 9.5V21h14V9.5 M9.5 21v-7h5v7"],
  "🌐": ["网络", "Web", ""],
  "🔧": ["工具", "Tools", "M14.1 4.1a6 6 0 0 0-6.4 8.1l-5 5a2.2 2.2 0 0 0 3.1 3.1l5.1-5.1a6 6 0 0 0 8.2-7.8l-3.7 3.7-3.5-3.5 3.7-3.6z"],
  "🏦": ["银行", "Bank", "m3 9 9-6 9 6H3z M5 11v7m5-7v7m4-7v7m5-7v7M3 21h18"],
  "🎮": ["游戏", "Games", "M8 7h8c2 0 3 1 3.7 3l1.4 6.8c.6 2.7-1.4 4.1-3.2 2.6l-3.4-3h-5l-3.4 3c-1.8 1.5-3.8.1-3.2-2.6L4.3 10C5 8 6 7 8 7z M6 12h5m-2.5-2.5v5m7-3.5h.01m2.1 2h.01"],
  "🛒": ["购物", "Shopping", "M2.5 4H5l2.5 11h11l2-8H6 M9 19.5h.01m8.5 0h.01"],
  "📧": ["邮箱", "Email", "M3 5.5h18v13H3z m0 .5 9 7 9-7"],
  "🎓": ["学习", "Education", "m2 9 10-5 10 5-10 5z M6 11v5c3 3 9 3 12 0v-5m4-2v7"],
  "💳": ["支付", "Payment", "M2.5 5.5h19v13h-19z M3 10h18m-15 5h3"],
  "📱": ["手机", "Phone", "M7 2.5h10a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1z M11 18.5h2"],
} as const;
export const groupSymbols = Object.keys(symbols);
function symbol(value: string) { return Object.prototype.hasOwnProperty.call(symbols, value) ? symbols[value as keyof typeof symbols] : undefined; }
export function groupSymbolLabel(value: string, zh: boolean) { return symbol(value)?.[zh ? 0 : 1] ?? value; }
export default function GroupSymbol({ value, size = 16 }: { value: string; size?: number }) {
  const match = symbol(value);
  if ((!value || match) && !match?.[2]) return <Icon name={value === "🌐" ? "globe" : "folder"} size={size} />;
  if (!match) return <span aria-hidden="true" className="vault-folder-symbol">{value}</span>;
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round"><path d={match[2]} /></svg>;
}
