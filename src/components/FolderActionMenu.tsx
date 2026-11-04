import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";

export type FolderAction = "edit" | "up" | "down" | "delete";

interface FolderActionMenuProps {
  id: string;
  groupName: string;
  anchor: HTMLButtonElement;
  initialFocus: "first" | "last";
  first: boolean;
  last: boolean;
  onAction: (action: FolderAction) => void;
  onDismiss: (restoreFocus: boolean) => void;
}

export default function FolderActionMenu({
  id, groupName, anchor, initialFocus, first, last, onAction, onDismiss,
}: FolderActionMenuProps) {
  const { i18n, t } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const menuRef = useRef<HTMLDivElement>(null);
  const actions = [
    { id: "edit", icon: "edit", label: zh ? "编辑分组" : "Edit group", disabled: false },
    { id: "up", icon: "arrow-up", label: zh ? "上移" : "Move up", disabled: first },
    { id: "down", icon: "arrow-down", label: zh ? "下移" : "Move down", disabled: last },
    { id: "delete", icon: "trash", label: t("groups.deleteGroup"), disabled: false },
  ] as const;

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const scrollPane = anchor.closest(".rail-scroll");
    const padding = 8;
    function position() {
      if (!menu) return;
      const trigger = anchor.getBoundingClientRect();
      const clip = scrollPane?.getBoundingClientRect();
      if (getComputedStyle(anchor).visibility === "hidden" || !trigger.width ||
        (clip && (trigger.bottom <= clip.top || trigger.top >= clip.bottom))) {
        onDismiss(true);
        return;
      }
      const viewport = window.visualViewport;
      const leftBound = (viewport?.offsetLeft ?? 0) + padding;
      const topBound = (viewport?.offsetTop ?? 0) + padding;
      const rightBound = leftBound + (viewport?.width ?? document.documentElement.clientWidth) - 2 * padding;
      const bottomBound = topBound + (viewport?.height ?? document.documentElement.clientHeight) - 2 * padding;
      const { width, height } = menu.getBoundingClientRect();
      const beside = window.matchMedia("(min-width: 721px)").matches && trigger.right + padding + width <= rightBound;
      const below = trigger.bottom + padding;
      const above = trigger.top - padding - height;
      let top = beside ? trigger.top - 5 : below;
      if (!beside && below + height > bottomBound && above >= topBound) top = above;
      const left = beside ? trigger.right + padding : trigger.right - width;
      menu.style.left = Math.max(leftBound, Math.min(left, rightBound - width)) + "px";
      menu.style.top = Math.max(topBound, Math.min(top, bottomBound - height)) + "px";
      menu.style.visibility = "visible";
    }
    position();
    const items = menu.querySelectorAll<HTMLButtonElement>("button:enabled");
    items[initialFocus === "last" ? items.length - 1 : 0]?.focus({ preventScroll: true });

    function outside(event: PointerEvent) {
      if (!(event.target instanceof Element) || menu?.contains(event.target) || anchor.contains(event.target)) return;
      const otherControl = event.target.closest("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      onDismiss(!otherControl);
      if (!otherControl) {
        // A click on a non-focusable surface can move focus to body after pointerdown.
        requestAnimationFrame(() => { if (document.activeElement === document.body) anchor.focus({ preventScroll: true }); });
      }
    }
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    const observer = new ResizeObserver(position);
    if (scrollPane) observer.observe(scrollPane);
    observer.observe(menu);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
      observer.disconnect();
    };
  }, [anchor, initialFocus, onDismiss]);

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onDismiss(true);
      return;
    }
    if (event.key === "Tab") {
      // Continue normal tab order from the trigger, not from the end of body.
      onDismiss(true);
      return;
    }
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:enabled"));
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    switch (event.key) {
      case "ArrowDown": next = (index + 1) % items.length; break;
      case "ArrowUp": next = (index - 1 + items.length) % items.length; break;
      case "Home": next = 0; break;
      case "End": next = items.length - 1; break;
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
    items[next]?.focus();
  }

  return createPortal(
    <div ref={menuRef} id={id} className="vault-folder-popup" role="menu" aria-label={groupName} onKeyDown={navigate}
      onBlur={event => {
        const next = event.relatedTarget;
        if (next instanceof Node && next !== anchor && !event.currentTarget.contains(next)) onDismiss(false);
      }}>
      <div className="vault-folder-popup-title" aria-hidden="true">{groupName}</div>
      {actions.map(action => (
        <button key={action.id} type="button" tabIndex={-1} role="menuitem" disabled={action.disabled}
          className={action.id === "delete" ? "is-danger" : undefined} onClick={() => onAction(action.id)}>
          <Icon name={action.icon} size={15} /><span>{action.label}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
