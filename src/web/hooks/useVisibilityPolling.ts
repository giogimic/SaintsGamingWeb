import { useEffect, useRef } from "react";

export interface VisibilityPollingOptions {
  /** Whether polling is active (default: true) */
  enabled?: boolean;
  /** Whether to execute callback immediately on mount (default: true) */
  runImmediately?: boolean;
}

/**
 * Executes a callback at a defined interval, but automatically pauses execution
 * when the browser tab is in the background or hidden (`document.hidden`).
 * When the tab regains focus / visibility, it optionally triggers an immediate sync.
 */
export function useVisibilityPolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  options: VisibilityPollingOptions = {}
): void {
  const { enabled = true, runImmediately = true } = options;
  const callbackRef = useRef(callback);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const startTimer = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (!document.hidden) {
          void callbackRef.current();
        }
      }, intervalMs);
    };

    const stopTimer = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        // Tab restored to foreground: run sync once immediately and resume interval
        void callbackRef.current();
        startTimer();
      }
    };

    if (runImmediately && !document.hidden) {
      void callbackRef.current();
    }

    startTimer();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, intervalMs, runImmediately]);
}
