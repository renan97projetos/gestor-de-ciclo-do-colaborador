import { useEffect, useState } from "react";

type Handlers = {
  onDigit?: (n: number) => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onBackspace?: () => void;
  ignoreDigits?: boolean;
};

export function useKeyboardNav(handlers: Handlers, deps: unknown[] = []) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.key === "Enter") {
        if (!isTyping) e.preventDefault();
        handlers.onEnter?.();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handlers.onEscape?.();
        return;
      }
      if (e.key === "Backspace" && !isTyping) {
        e.preventDefault();
        handlers.onBackspace?.();
        return;
      }
      if (!handlers.ignoreDigits && /^[0-9]$/.test(e.key) && !isTyping) {
        e.preventDefault();
        handlers.onDigit?.(parseInt(e.key, 10));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
