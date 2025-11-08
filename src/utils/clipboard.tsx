import React from 'react';
import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';

// 剪贴板工具 - 支持自动清空
export const copyToClipboardWithTimeout = async (
  text: string,
  timeoutMs: number = 30000
): Promise<void> => {
  
  try {
    // 使用 Tauri 剪贴板插件
    await writeText(text);

    // 验证复制是否成功
    try {
      const clipboardContent = await readText();
      if (clipboardContent !== text) {
        console.error('❌ 剪贴板内容不匹配！');
        console.error('期望长度:', text.length);
        console.error('实际长度:', clipboardContent?.length || 0);
      }
    } catch (readErr) {
      console.log('⚠️ 无法读取剪贴板进行验证:', readErr);
    }

    // 30秒后清空剪贴板
    setTimeout(async () => {
      try {
        // 只有当剪贴板内容仍然是我们复制的内容时才清空
        const currentClipboard = await readText();
        if (currentClipboard === text) {
          await writeText('');
        }
      } catch (err) {
        console.log('⚠️ 无法清空剪贴板:', err);
      }
    }, timeoutMs);
    
  } catch (error) {
    console.error('❌ Tauri 剪贴板失败:', error);
    console.error('错误详情:', JSON.stringify(error));
    // 降级到浏览器 API
    try {
      console.log('📋 尝试降级到浏览器 API...');
      await navigator.clipboard.writeText(text);
      console.log('✅ 已成功复制到剪贴板 (Browser API)');
    } catch (browserError) {
      console.error('❌ 浏览器 API 也失败:', browserError);
      // 最后降级到旧方法
      fallbackCopyToClipboard(text);
    }
  }
};

// 降级复制方法（用于不支持 Clipboard API 的浏览器）
const fallbackCopyToClipboard = (text: string): void => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    console.log('已复制到剪贴板（降级方法）');
  } catch (err) {
    console.error('复制失败:', err);
  }
  
  document.body.removeChild(textArea);
};

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
