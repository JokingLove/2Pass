import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { invoke } from "../utils/commands";

const subscribers = new Set<() => void>();
let timer: number | undefined;

function currentSecond() {
  return document.hidden ? -1 : Math.floor(Date.now() / 1000);
}

function tick() {
  window.clearTimeout(timer);
  subscribers.forEach(notify => notify());
  if (subscribers.size && !document.hidden) {
    timer = window.setTimeout(tick, 1000 - Date.now() % 1000);
  }
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  if (subscribers.size === 1) {
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("pageshow", tick);
    window.addEventListener("focus", tick);
    tick();
  }
  return () => {
    subscribers.delete(notify);
    if (!subscribers.size) {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("pageshow", tick);
      window.removeEventListener("focus", tick);
    }
  };
}

/** A single wall clock serves all mounted codes. Fetch only once per secret and period. */
export function useGaCode(secret: string) {
  const second = useSyncExternalStore(subscribe, currentSecond);
  const period = Math.floor(second / 30);
  const source = useMemo(() => Symbol(), [secret]);
  const [result, setResult] = useState<{ source: symbol; period: number; value: string }>();

  useEffect(() => {
    if (period < 0) { setResult(undefined); return; }
    let active = true;
    const settle = (value: string) => {
      if (active && Math.floor(currentSecond() / 30) === period) setResult({ source, period, value });
    };
    invoke<string>("generate_totp", { secret }).then(settle).catch(() => settle(""));
    return () => { active = false; };
  }, [secret, source, period]);

  // Never paint the previous secret's or previous period's code while a request is pending.
  const current = result?.source === source && result.period === period ? result : undefined;
  return { code: current?.value || "", error: current?.value === "", secondsLeft: second < 0 ? 0 : 30 - second % 30 };
}
