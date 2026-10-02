"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export interface ContextMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  tone?: "danger";
  disabled?: boolean;
  /** Draws a divider above the item */
  separated?: boolean;
  onSelect: () => void;
}

/** Menu pinned at a point (right-click position or a button's corner). Closes on outside click, Escape, scroll and resize. */
export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // Keep the menu inside the viewport
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    });
  }, [x, y]);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
      const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[(i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      style={pos}
      className="fixed z-50 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
    >
      {items.map((item) => (
        <div key={item.key}>
          {item.separated && <div className="my-1 border-t border-gray-100" />}
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
            className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none disabled:opacity-40 ${
              item.tone === "danger" ? "text-rose-700" : "text-gray-800"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
