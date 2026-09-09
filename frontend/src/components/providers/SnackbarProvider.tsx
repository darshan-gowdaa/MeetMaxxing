"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

export type SnackbarVariant = "default" | "success" | "error";

export interface SnackbarOptions {
  /** Optional action button (e.g. "Undo"). */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Auto-dismiss duration in ms. Defaults to 4000. */
  duration?: number;
  /** Adds a leading status icon. Defaults to "default" (no icon). */
  variant?: SnackbarVariant;
}

interface SnackbarState extends SnackbarOptions {
  id: number;
  message: string;
}

interface SnackbarContextType {
  showMessage: (message: string, options?: SnackbarOptions) => void;
}

const SnackbarContext = createContext<SnackbarContextType>({
  showMessage: () => {},
});

/** Show an M3 snackbar confirmation. Errors stay inline in forms. */
export function useSnackbar() {
  return useContext(SnackbarContext);
}

const DEFAULT_DURATION = 4000;
/** Matches the --m3e-effects-fast exit animation in globals.css. */
const EXIT_MS = 150;

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  // "leaving" plays the CSS fade-out before unmount; enter uses .animate-slide-up
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(DEFAULT_DURATION);
  const startedAtRef = useRef(0);
  const idRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    setLeaving(true);
    timeoutRef.current = setTimeout(() => {
      setSnackbar(null);
      setLeaving(false);
      timeoutRef.current = null;
    }, EXIT_MS);
  }, []);

  const scheduleDismiss = useCallback(
    (duration: number) => {
      clearTimer();
      startedAtRef.current = Date.now();
      remainingRef.current = duration;
      timeoutRef.current = setTimeout(dismiss, duration);
    },
    [clearTimer, dismiss]
  );

  const showMessage = useCallback(
    (message: string, options?: SnackbarOptions) => {
      const duration = options?.duration ?? DEFAULT_DURATION;
      // Replace any active snackbar (M3: one at a time, latest wins)
      idRef.current += 1;
      setLeaving(false);
      setSnackbar({ id: idRef.current, message, ...options });
      setPaused(false);
      scheduleDismiss(duration);
    },
    [scheduleDismiss]
  );

  // Pause auto-dismiss while the user hovers/focuses the snackbar.
  useEffect(() => {
    if (!snackbar || leaving) return;
    if (paused) {
      clearTimer();
      remainingRef.current -= Date.now() - startedAtRef.current;
    } else {
      scheduleDismiss(Math.max(remainingRef.current, 800));
    }
    return clearTimer;
  }, [paused, snackbar, leaving, clearTimer, scheduleDismiss]);

  const value = useMemo(() => ({ showMessage }), [showMessage]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <SnackbarHost
        snackbar={snackbar}
        leaving={leaving}
        onPaused={setPaused}
      />
    </SnackbarContext.Provider>
  );
}

function SnackbarHost({
  snackbar,
  leaving,
  onPaused,
}: {
  snackbar: SnackbarState | null;
  leaving: boolean;
  onPaused: (paused: boolean) => void;
}) {
  if (!snackbar) return null;

  return (
    <div
      key={snackbar.id}
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[80] w-full max-w-sm px-4"
      onMouseEnter={() => {
        if (!leaving) onPaused(true);
      }}
      onMouseLeave={() => onPaused(false)}
      onFocusCapture={() => {
        if (!leaving) onPaused(true);
      }}
      onBlurCapture={() => onPaused(false)}
    >
      {/* Enter: .animate-slide-up (flattened under reduced-motion). Exit: fade via m3e token. */}
      <div
        className={`${
          leaving ? "snackbar-exit" : "animate-slide-up"
        } flex items-center gap-3 bg-surface-container-highest text-text border border-border shadow-lg rounded-2xl pl-4 pr-2 py-3`}
      >
        {snackbar.variant === "success" && (
          <RiCheckboxCircleFill className="w-5 h-5 shrink-0 text-success" aria-hidden="true" />
        )}
        {snackbar.variant === "error" && (
          <RiErrorWarningFill className="w-5 h-5 shrink-0 text-risk" aria-hidden="true" />
        )}
        <p className="flex-1 text-[13px] font-medium leading-snug min-w-0">
          {snackbar.message}
        </p>
        {snackbar.action && (
          <button
            type="button"
            onClick={() => snackbar.action?.onClick()}
            className="shrink-0 h-9 px-3 rounded-full text-[13px] font-bold uppercase tracking-wide text-primary hover:bg-primary-dim spring-colors active:opacity-80"
          >
            {snackbar.action.label}
          </button>
        )}
      </div>
    </div>
  );
}
