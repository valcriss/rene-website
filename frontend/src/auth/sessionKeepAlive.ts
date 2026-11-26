import { getLastSessionRefreshAt, refreshAccessSession } from "../api/authFetch";

// The backend ends a session after SESSION_IDLE_MINUTES (2 h by default) without a refresh.
// Someone writing a long event description makes no API call for a long time, so while the
// user is active the session is refreshed at most every KEEP_ALIVE_INTERVAL_MS. A user who
// stays idle gets no refresh and the session expires normally.
export const KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000;
export const KEEP_ALIVE_CHECK_MS = 60 * 1000;

const ACTIVITY_EVENTS = ["keydown", "pointerdown", "pointermove", "wheel", "scroll", "touchstart", "input"] as const;

export const startSessionKeepAlive = (onSessionExpired: () => void) => {
  const startedAt = Date.now();
  let lastActivityAt = 0;
  let checking = false;

  const markActivity = () => {
    lastActivityAt = Date.now();
  };

  const check = async () => {
    if (checking) return;
    const lastRefreshAt = Math.max(startedAt, getLastSessionRefreshAt());
    if (lastActivityAt < lastRefreshAt || Date.now() - lastRefreshAt < KEEP_ALIVE_INTERVAL_MS) {
      return;
    }
    checking = true;
    try {
      // A network failure ("unavailable") is retried on the next check rather than logging out.
      if ((await refreshAccessSession()) === "expired") {
        onSessionExpired();
      }
    } finally {
      checking = false;
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      void check();
    }
  };

  ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, markActivity, { capture: true, passive: true }));
  document.addEventListener("visibilitychange", onVisibilityChange);
  const timer = window.setInterval(() => void check(), KEEP_ALIVE_CHECK_MS);

  return () => {
    window.clearInterval(timer);
    ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, markActivity, { capture: true }));
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
};
