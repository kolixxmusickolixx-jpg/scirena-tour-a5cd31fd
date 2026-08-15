import { supabase } from "@/integrations/supabase/client";

export type AnalyticsSessionRow = {
  id: string;
  visitor_id: string;
  is_new: boolean;
  device: string;
  source: string;
  referrer_host: string;
  country: string;
  entry_path: string;
  page_views: number;
  started_at: string;
  last_seen_at: string;
};

export type AnalyticsEventRow = {
  id: string;
  session_id: string;
  visitor_id: string;
  event_name: string;
  path: string;
  device: string;
  source: string;
  country: string;
  duration_ms: number;
  created_at: string;
};

export type RangeData = { sessions: AnalyticsSessionRow[]; events: AnalyticsEventRow[] };

export const analyticsKeys = {
  root: ["admin", "analytics"] as const,
  range: (from: string, to: string) => ["admin", "analytics", from, to] as const,
};

export async function fetchAnalytics(fromISO: string, toISO: string): Promise<RangeData> {
  const [s, e] = await Promise.all([
    supabase
      .from("analytics_sessions")
      .select("*")
      .gte("started_at", fromISO)
      .lt("started_at", toISO)
      .order("started_at", { ascending: true })
      .limit(50000),
    supabase
      .from("analytics_events")
      .select("*")
      .gte("created_at", fromISO)
      .lt("created_at", toISO)
      .order("created_at", { ascending: true })
      .limit(100000),
  ]);
  if (s.error) throw s.error;
  if (e.error) throw e.error;
  return {
    sessions: (s.data ?? []) as AnalyticsSessionRow[],
    events: (e.data ?? []) as AnalyticsEventRow[],
  };
}

export type Kpis = {
  visitors: number;
  sessions: number;
  pageViews: number;
  newVisitors: number;
  avgDurationSec: number;
  bounceRate: number;
};

export function computeKpis(data: RangeData): Kpis {
  const sessions = data.sessions;
  const visitors = new Set(sessions.map((s) => s.visitor_id)).size;
  const pageViews = data.events.filter((e) => e.event_name === "page_view").length;
  const newVisitors = new Set(sessions.filter((s) => s.is_new).map((s) => s.visitor_id)).size;
  const durations = sessions.map((s) =>
    Math.max(0, (new Date(s.last_seen_at).getTime() - new Date(s.started_at).getTime()) / 1000),
  );
  const avgDurationSec = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;
  const bounced = sessions.filter((s) => s.page_views <= 1).length;
  return {
    visitors,
    sessions: sessions.length,
    pageViews,
    newVisitors,
    avgDurationSec,
    bounceRate: sessions.length ? (bounced / sessions.length) * 100 : 0,
  };
}

export type SeriesPoint = { date: string; label: string; visitors: number; sessions: number; views: number };

export function computeSeries(data: RangeData, fromISO: string, toISO: string): SeriesPoint[] {
  const start = new Date(fromISO);
  const end = new Date(toISO);
  const days: SeriesPoint[] = [];
  const byDay = new Map<string, { visitors: Set<string>; sessions: number; views: number }>();

  const key = (d: string | Date) => new Date(d).toISOString().slice(0, 10);
  for (const s of data.sessions) {
    const k = key(s.started_at);
    const b = byDay.get(k) ?? { visitors: new Set<string>(), sessions: 0, views: 0 };
    b.visitors.add(s.visitor_id);
    b.sessions += 1;
    byDay.set(k, b);
  }
  for (const e of data.events) {
    if (e.event_name !== "page_view") continue;
    const k = key(e.created_at);
    const b = byDay.get(k) ?? { visitors: new Set<string>(), sessions: 0, views: 0 };
    b.views += 1;
    byDay.set(k, b);
  }

  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  while (cursor < end) {
    const k = cursor.toISOString().slice(0, 10);
    const b = byDay.get(k);
    days.push({
      date: k,
      label: new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", timeZone: "UTC" }).format(cursor),
      visitors: b ? b.visitors.size : 0,
      sessions: b ? b.sessions : 0,
      views: b ? b.views : 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (days.length > 400) break;
  }
  return days;
}

export type PageRow = {
  path: string;
  views: number;
  visitors: number;
  avgDurationSec: number;
  bounceRate: number;
};

export function computePages(data: RangeData): PageRow[] {
  const map = new Map<
    string,
    { views: number; visitors: Set<string>; timeTotal: number; timeCount: number }
  >();
  for (const e of data.events) {
    if (e.event_name !== "page_view" && e.event_name !== "page_leave") continue;
    const b = map.get(e.path) ?? { views: 0, visitors: new Set<string>(), timeTotal: 0, timeCount: 0 };
    if (e.event_name === "page_view") {
      b.views += 1;
      b.visitors.add(e.visitor_id);
    } else if (e.duration_ms > 0) {
      b.timeTotal += e.duration_ms / 1000;
      b.timeCount += 1;
    }
    map.set(e.path, b);
  }
  const entryStats = new Map<string, { total: number; bounced: number }>();
  for (const s of data.sessions) {
    const b = entryStats.get(s.entry_path) ?? { total: 0, bounced: 0 };
    b.total += 1;
    if (s.page_views <= 1) b.bounced += 1;
    entryStats.set(s.entry_path, b);
  }
  return [...map.entries()]
    .map(([path, b]) => {
      const entry = entryStats.get(path);
      return {
        path,
        views: b.views,
        visitors: b.visitors.size,
        avgDurationSec: b.timeCount ? b.timeTotal / b.timeCount : 0,
        bounceRate: entry && entry.total ? (entry.bounced / entry.total) * 100 : 0,
      };
    })
    .filter((r) => r.views > 0)
    .sort((a, b) => b.views - a.views);
}

export function countBy<T extends string>(rows: { [k: string]: unknown }[], field: string): { key: T; value: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = String(r[field] ?? "") || "—";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, value]) => ({ key: key as T, value }))
    .sort((a, b) => b.value - a.value);
}

export function delta(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export function formatDuration(sec: number): string {
  const s = Math.round(sec);
  if (s < 60) return `${s} с`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m < 60) return `${m} мин ${rest.toString().padStart(2, "0")} с`;
  return `${Math.floor(m / 60)} ч ${(m % 60).toString().padStart(2, "0")} мин`;
}

export const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct",
  organic: "Organic Search",
  social: "Social",
  referral: "Referral",
  other: "Other",
};

export const DEVICE_LABELS: Record<string, string> = {
  mobile: "Mobile",
  desktop: "Desktop",
  tablet: "Tablet",
};

export const EVENT_LABELS: Record<string, string> = {
  page_view: "Просмотр страницы",
  page_leave: "Уход со страницы",
  session_start: "Начало сессии",
  click: "Клик",
  signup: "Регистрация",
  login: "Вход",
  form_submit: "Отправка формы",
  purchase: "Покупка",
};

const REGION = new Intl.DisplayNames(["ru"], { type: "region" });
export function countryName(code: string): string {
  if (!code || code.length !== 2) return "Неизвестно";
  try {
    return REGION.of(code) ?? code;
  } catch {
    return code;
  }
}
