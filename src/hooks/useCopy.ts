import { useState, useCallback } from "react";
import { copyToClipboardWithTimeout } from "../utils/clipboard";

interface UseCopyReturn {
  /** 当前已复制的元素 ID */
  copiedId: string | null;
  /** 复制文本到剪贴板 */
  copyToClipboard: (text: string, id: string) => Promise<void>;
  /** 检查指定 ID 是否已复制 */
  isCopied: (id: string) => boolean;
}

/**
 * 复制到剪贴板的 Hook
 * 
 * @example
 * ```tsx
 * const { copyToClipboard, isCopied } = useCopy();
 * 
 * <button 
 *   onClick={() => copyToClipboard("text", "btn-1")}
 *   className={isCopied("btn-1") ? "copied" : ""}
 * >
 *   {isCopied("btn-1") ? "✓" : "📋"}
 * </button>
 * ```
 * 
 * @param timeout 复制成功提示显示时长（毫秒），默认 3000ms
 * @param clearTimeout 剪贴板自动清空时长（毫秒），默认 30000ms
 * @returns 包含 copiedId、copyToClipboard 和 isCopied 的对象
 */
export function useCopy(timeout = 3000, clearTimeout = 30000): UseCopyReturn {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = useCallback(
    async (text: string, id: string) => {
      try {
        await copyToClipboardWithTimeout(text, clearTimeout);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), timeout);
      } catch (error) {
        console.error("复制失败:", error);
        throw error;
      }
    },
    [timeout, clearTimeout]
  );

  const isCopied = useCallback(
    (id: string) => copiedId === id,
    [copiedId]
  );

  return {
    copiedId,
    copyToClipboard,
    isCopied,
  };
}
