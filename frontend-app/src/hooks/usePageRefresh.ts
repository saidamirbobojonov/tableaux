import { useEffect, useRef } from "react";
import { useInterval } from "./useInterval";

/**
 * Polls `callback` every `delayMs` ms, AND re-fires immediately when the
 * browser tab becomes visible again (e.g. user switches back).
 */
export function usePageRefresh(callback: () => void, delayMs: number) {
  const saved = useRef(callback);
  useEffect(() => { saved.current = callback; }, [callback]);

  useInterval(() => saved.current(), delayMs);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") saved.current();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
}
