import type { PasswordEntry } from "../types";

export const sortOptions = [
  { id: "custom", zh: "手动拖动", en: "Manual" },
  { id: "name", zh: "名称 A–Z", en: "Name A–Z" },
  { id: "name-desc", zh: "名称 Z–A", en: "Name Z–A" },
  { id: "recent", zh: "最近更新", en: "Newest update" },
  { id: "oldest", zh: "最早更新", en: "Oldest update" },
  { id: "created", zh: "最近创建", en: "Newest creation" },
] as const;

export type EntrySort = typeof sortOptions[number]["id"];

export function isEntrySort(value: unknown): value is EntrySort {
  return sortOptions.some(option => option.id === value);
}

export function byManualOrder(a: PasswordEntry, b: PasswordEntry) {
  // Older vaults may not have saved ranks yet. Keep their creation order.
  const rankA = a.sort_order ?? Infinity;
  const rankB = b.sort_order ?? Infinity;
  return rankA === rankB ? a.created_at - b.created_at : rankA - rankB;
}

export function compareEntries(a: PasswordEntry, b: PasswordEntry, sort: EntrySort, names: Intl.Collator) {
  switch (sort) {
    case "name": return names.compare(a.title, b.title) || byManualOrder(a, b);
    case "name-desc": return names.compare(b.title, a.title) || byManualOrder(a, b);
    case "recent": return b.updated_at - a.updated_at || byManualOrder(a, b);
    case "oldest": return a.updated_at - b.updated_at || byManualOrder(a, b);
    case "created": return b.created_at - a.created_at || byManualOrder(a, b);
    case "custom": return byManualOrder(a, b);
  }
}

// A move in a group or search result only replaces its slots in the whole vault.
export function mergeVisibleOrder(allEntries: PasswordEntry[], visibleOrder: PasswordEntry[]) {
  const visible = new Set(visibleOrder.map(entry => entry.id));
  let next = 0;
  return [...allEntries].sort(byManualOrder).map(entry =>
    visible.has(entry.id) ? visibleOrder[next++].id : entry.id
  );
}
