import { useCallback, useEffect, useRef, useState } from "react";

const WARN_MS   = 55 * 60 * 1000;   // 55 min → show warning
const LOGOUT_MS = 60 * 60 * 1000;   // 60 min → auto-logout
const WARN_SECS = 5 * 60;           // 5 min countdown

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

export function useInactivity(onLogout: () => void) {
  const [showWarning, setShowWarning]   = useState(false);
  const [secondsLeft, setSecondsLeft]   = useState(WARN_SECS);

  const warnTimer     = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const logoutTimer   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const onLogoutRef   = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const clearAll = useCallback(() => {
    if (warnTimer.current)    { clearTimeout(warnTimer.current);     warnTimer.current    = null; }
    if (logoutTimer.current)  { clearTimeout(logoutTimer.current);   logoutTimer.current  = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const restart = useCallback(() => {
    clearAll();
    setShowWarning(false);

    warnTimer.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(WARN_SECS);

      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      }, 1000);
    }, WARN_MS);

    logoutTimer.current = setTimeout(() => {
      clearAll();
      setShowWarning(false);
      onLogoutRef.current();
    }, LOGOUT_MS);
  }, [clearAll]);

  useEffect(() => {
    restart();
    return clearAll;
  }, [restart, clearAll]);

  useEffect(() => {
    const handle = () => restart();
    ACTIVITY_EVENTS.forEach((ev) =>
      document.addEventListener(ev, handle, { passive: true }),
    );
    return () =>
      ACTIVITY_EVENTS.forEach((ev) =>
        document.removeEventListener(ev, handle),
      );
  }, [restart]);

  const continueSession = useCallback(() => restart(), [restart]);

  return { showWarning, secondsLeft, continueSession };
}
