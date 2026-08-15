/**
 * Anonymous analytics tracker.
 * No personal data is collected — only a random visitor id, session id,
 * page path, device class, traffic source and coarse timings.
 */

export type AnalyticsEvent =
  | "page_view"
  | "session_start"
  | "click"
  | "signup"
  | "login"
  | "form_submit"
  | "purchase"
  | (string & {});

const VISITOR_KEY = "sc_visitor_id";
const SESSION_KEY = "sc_session";
const SESSION_TTL = 30 * 60 * 1000; // 30 минут бездействия = новая сессия

type SessionState = { id: string; lastSeen: number; startedAt: number };

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function deviceClass(): "mobile" | "tablet" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return "mobile";
  return "desktop";
}

const SEARCH_HOSTS = /google|yandex|bing|duckduckgo|yahoo|mail\.ru|rambler|baidu|ecosia/i;
const SOCIAL_HOSTS =
  /vk\.com|t\.me|telegram|instagram|facebook|twitter|x\.com|tiktok|youtube|ok\.ru|pinterest|reddit|threads/i;

function classifySource(referrer: string): {
  source: "direct" | "organic" | "social" | "referral" | "other";
  host: string;
} {
  if (!referrer) return { source: "direct", host: "" };
  let host = "";
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return { source: "other", host: "" };
  }
  if (typeof window !== "undefined" && host === window.location.hostname.replace(/^www\./, "")) {
    return { source: "direct", host: "" };
  }
  if (SEARCH_HOSTS.test(host)) return { source: "organic", host };
  if (SOCIAL_HOSTS.test(host)) return { source: "social", host };
  return { source: "referral", host };
}

function readVisitor(): { id: string; isNew: boolean } {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return { id: existing, isNew: false };
    const id = uuid();
    localStorage.setItem(VISITOR_KEY, id);
    return { id, isNew: true };
  } catch {
    return { id: uuid(), isNew: true };
  }
}

function readSession(): { state: SessionState; fresh: boolean } {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SessionState;
      if (parsed?.id && now - parsed.lastSeen < SESSION_TTL) {
        const state = { ...parsed, lastSeen: now };
        localStorage.setItem(SESSION_KEY, JSON.stringify(state));
        return { state, fresh: false };
      }
    }
  } catch {
    /* ignore */
  }
  const state: SessionState = { id: uuid(), lastSeen: now, startedAt: now };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  return { state, fresh: true };
}

function touchSession(state: SessionState) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...state, lastSeen: Date.now() }));
  } catch {
    /* ignore */
  }
}

let started = false;
let sessionState: SessionState | null = null;
let visitor = { id: "", isNew: false };
let sessionIsNew = false;
let pageEnteredAt = 0;
let lastPath = "";

async function send(event: AnalyticsEvent, extra: Record<string, unknown> = {}, durationMs = 0) {
  if (typeof window === "undefined" || !sessionState) return;
  const { source, host } = classifySource(document.referrer);
  const payload = {
    sessionId: sessionState.id,
    visitorId: visitor.id,
    event,
    path: window.location.pathname || "/",
    device: deviceClass(),
    source,
    referrerHost: host,
    isNew: visitor.isNew && sessionIsNew,
    durationMs,
    props: extra,
  };
  touchSession(sessionState);
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon && durationMs > 0) {
      navigator.sendBeacon("/api/public/track", new Blob([body], { type: "application/json" }));
      return;
    }
    await fetch("/api/public/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    /* analytics must never break the page */
  }
}

/** Публичный API — можно вызывать из любого места клиента. */
export function trackEvent(event: AnalyticsEvent, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  if (!started) initAnalytics();
  void send(event, props);
}

export function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  if (!started) {
    initAnalytics();
    return;
  }
  if (path === lastPath) return;
  // время, проведённое на предыдущей странице
  if (pageEnteredAt) void send("page_leave", { path: lastPath }, Date.now() - pageEnteredAt);
  lastPath = path;
  pageEnteredAt = Date.now();
  void send("page_view");
}

export function initAnalytics() {
  if (started || typeof window === "undefined") return;
  started = true;

  visitor = readVisitor();
  const { state, fresh } = readSession();
  sessionState = state;
  sessionIsNew = fresh;
  lastPath = window.location.pathname || "/";
  pageEnteredAt = Date.now();

  if (fresh) void send("session_start");
  void send("page_view");

  const onHide = () => {
    if (document.visibilityState === "hidden" && pageEnteredAt) {
      void send("page_leave", { path: lastPath }, Date.now() - pageEnteredAt);
      pageEnteredAt = Date.now();
    }
  };
  document.addEventListener("visibilitychange", onHide);
}
