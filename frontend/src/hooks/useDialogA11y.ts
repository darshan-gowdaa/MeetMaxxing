"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Shared dialog accessibility behaviour:
 *  - Escape closes the dialog
 *  - Focus is moved into the dialog on open (first focusable element, unless
 *    the caller manages its own initial focus)
 *  - Tab is trapped inside the dialog while it is open
 *  - Focus returns to the trigger element on close
 *
 * Attach the returned ref to the dialog panel (the element with
 * role="dialog"). Render through a portal? No problem — the ref attaches
 * whenever the panel mounts; pass `enabled` when the panel is conditionally
 * rendered (e.g. `enabled={mounted && !busy}`).
 */
export function useDialogA11y<T extends HTMLElement>({
  onClose,
  enabled = true,
  autoFocus = true,
}: {
  onClose: () => void;
  enabled?: boolean;
  autoFocus?: boolean;
}) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const panel = ref.current;
    if (!panel) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    if (autoFocus) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? panel).focus({ preventScroll: true });
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("keydown", handleKey, true);
      // Restore focus to the trigger when the dialog unmounts
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [enabled, autoFocus]);

  return ref;
}
