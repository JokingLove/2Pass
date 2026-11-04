import React from 'react';
import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';

import { isTauri } from "@tauri-apps/api/core";

export async function copyToClipboardWithTimeout(text: string, timeoutMs = 30000) {
  if (isTauri()) {
    await writeText(text);
    window.setTimeout(async () => {
      try { if (await readText() === text) await writeText(""); } catch { /* The clipboard can become unavailable. */ }
    }, timeoutMs);
    return;
  }
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* Try a user-initiated legacy copy. */ }
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.style.cssText = "position:fixed;left:-10000px";
  const focus = document.activeElement;
  document.body.appendChild(field);
  try {
    field.select();
    if (!document.execCommand("copy")) throw new Error("Clipboard is unavailable");
  } finally {
    field.remove();
    if (focus instanceof HTMLElement) focus.focus();
  }
}

// 高亮搜索关键词
export const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;

  try {
    // 转义特殊字符
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="search-highlight">
          {part}
        </mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );
  } catch (error) {
    // 如果正则表达式无效，返回原文本
    return text;
  }
};
