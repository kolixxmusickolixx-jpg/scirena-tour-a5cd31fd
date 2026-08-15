import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  RefreshCw,
  Users,
  MousePointerClick,
  Eye,
  UserPlus,
  Timer,
  LogOut,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  analyticsKeys,
  computeKpis,
  computePages,
  computeSeries,
  countBy,
  countryName,
  delta,
  DEVICE_LABELS,
  EVENT_LABELS,
  fetchAnalytics,
  formatDuration,
  SOURCE_LABELS,
  type RangeData,
} from "@/lib/analytics";

const cardCls = "glass rounded-2xl p-5 sm:p-6";
const labelCls = "mb-1.5 block text-[0.6rem] tracking-[0.22em] text-muted-foreground";
const inputCls =
  "w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground/40";

type PresetId = "today" | "7d" | "30d" | "90d" | "custom";

const PRESETS: { id: PresetId; label: string; days: number }[] = [
  { id: "today", label: "Сегодня", days: 1 },
  { id: "7d", label: "7 дней", days: 7 },
  { id: "30d", label: "30 дней", days: 30 },
  { id: "90d", label: "90 дней", days: 90 },
  { id: "custom", label: "Период", days: 0 },
];

function startOfDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function useRange(preset: PresetId, customFrom: string, customTo: string) {
  return useMemo(() => {
    const now = new Date();
    const to = new Date(startOfDay(now).getTime() + 24 * 3600 * 1000);
    if (preset === "custom" && customFrom && customTo) {
      const f = new Date(`${customFrom}T00:00:00.000Z`);
      const t = new Date(new Date(`${customTo}T00:00:00.000Z`).getTime() + 24 * 3600 * 1000);
      const span = Math.max(1, t.getTime() - f.getTime());
      return {
        from: f.toISOString(),
        to: t.toISOString(),
        prevFrom: new Date(f.getTime() - span).toISOString(),
        prevTo: f.toISOString(),
      };
    }
    const days = PRESETS.find((p) => p.id === preset)?.days || 7;
    const from = new Date(to.getTime() - days * 24 * 3600 * 1000);
    const span = days * 24 * 3600 * 1000;
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      prevFrom: new Date(from.getTime() - span).toISOString(),
      prevTo: from.toISOString(),
    };
  }, [preset, customFrom, customTo]);
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null)
    return (
      <span className="inline-flex items-center gap-1 text-[0.65rem] text-muted-foreground">
        <Minus className="h-3 w-3" /> нет данных
      </span>
    );
  const up = value >= 0;
  const Icon = value === 0 ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[0.65rem] font-medium ${
        value === 0 ? "text-muted-foreground" : up ? "text-emerald-400" : "text-rose-400"
      }`}
    >
      <Icon className="h-3 w-3" />
      {up && value !== 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function KpiCard({
  icon: Icon,
  title,
  value,
  change,
  invert,
}: {
  icon: typeof Users;
  title: string;
  value: string;
  change: number | null;
  invert?: boolean;
}) {
  const shown = change === null ? null : invert ? -change : change;
  return (
    <div className="glass group rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/20 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-[0.58rem] tracking-[0.22em] text-muted-foreground uppercase">{title}</span>
        <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{value}</div>
      <div className="mt-2">
        <DeltaBadge value={shown} />
        <span className="ml-1.5 text-[0.6rem] text-muted-foreground">к прошлому периоду</span>
      </div>
    </div>
  );
}

function BarList({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { key: string; label: string; value: number }[];
  total: number;
}) {
  return (
    <div className={cardCls}>
      <h3 className="text-[0.62rem] tracking-[0.24em] text-muted-foreground uppercase">{title}</h3>
      <div className="mt-4 space-y-2.5">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Нет данных за период</p>}
        {rows.map((r) => {
          const pct = total ? (r.value / total) * 100 : 0;
          return (
            <div key={r.key} className="group relative overflow-hidden rounded-lg">
              <div
                className="absolute inset-y-0 left-0 rounded-lg bg-foreground/10 transition-all duration-500 group-hover:bg-foreground/20"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
              <div className="relative flex items-center justify-between px-3 py-2 text-sm">
                <span className="truncate text-foreground/90">{r.label}</span>
                <span className="ml-3 shrink-0 tabular-nums text-muted-foreground">
                  {r.value} · {pct.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Metric = "visitors" | "sessions" | "views";
const METRICS: { id: Metric; label: string }[] = [
  { id: "visitors", label: "Посетители" },
  { id: "sessions", label: "Сессии" },
  { id: "views", label: "Просмотры" },
];

export function AnalyticsTab() {
  const qc = useQueryClient();
  const [preset, setPreset] = useState<PresetId>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [metric, setMetric] = useState<Metric>("visitors");
  const range = useRange(preset, customFrom, customTo);

  const current = useQuery({
    queryKey: analyticsKeys.range(range.from, range.to),
    queryFn: () => fetchAnalytics(range.from, range.to),
  });
  const previous = useQuery({
    queryKey: analyticsKeys.range(range.prevFrom, range.prevTo),
    queryFn: () => fetchAnalytics(range.prevFrom, range.prevTo),
  });

  const empty: RangeData = { sessions: [], events: [] };
  const cur = current.data ?? empty;
  const prev = previous.data ?? empty;

  const kpis = useMemo(() => computeKpis(cur), [cur]);
  const prevKpis = useMemo(() => computeKpis(prev), [prev]);
  const series = useMemo(() => computeSeries(cur, range.from, range.to), [cur, range]);
  const pages = useMemo(() => computePages(cur).slice(0, 10), [cur]);

  const sources = countBy(cur.sessions, "source").map((r) => ({
    key: r.key,
    label: SOURCE_LABELS[r.key] ?? "Other",
    value: r.value,
  }));
  const devices = countBy(cur.sessions, "device").map((r) => ({
    key: r.key,
    label: DEVICE_LABELS[r.key] ?? r.key,
    value: r.value,
  }));
  const countries = countBy(cur.sessions, "country")
    .map((r) => ({ key: r.key, label: countryName(r.key), value: r.value }))
    .slice(0, 8);
  const events = countBy(cur.events, "event_name")
    .map((r) => ({ key: r.key, label: EVENT_LABELS[r.key] ?? r.key, value: r.value }))
    .slice(0, 8);

  const loading = current.isLoading || previous.isLoading;
  const updatedAt = current.dataUpdatedAt
    ? new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(
        new Date(current.dataUpdatedAt),
      )
    : "—";

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: analyticsKeys.root });
  };

  return (
    <div className="space-y-5">
      <div className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Аналитика</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Обновлено в {updatedAt} · анонимные данные посещений
            </p>
          </div>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[0.65rem] tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            ОБНОВИТЬ
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-border p-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`rounded-lg px-3 py-1.5 text-[0.62rem] tracking-[0.16em] transition-colors ${
                  preset === p.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label.toUpperCase()}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <span className={labelCls}>С</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <span className={labelCls}>ПО</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {current.error && (
        <div className={cardCls}>
          <p className="text-sm text-rose-400">Не удалось загрузить аналитику. Попробуйте обновить.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          icon={Users}
          title="Уникальные посетители"
          value={kpis.visitors.toLocaleString("ru-RU")}
          change={delta(kpis.visitors, prevKpis.visitors)}
        />
        <KpiCard
          icon={MousePointerClick}
          title="Сессии"
          value={kpis.sessions.toLocaleString("ru-RU")}
          change={delta(kpis.sessions, prevKpis.sessions)}
        />
        <KpiCard
          icon={Eye}
          title="Просмотры страниц"
          value={kpis.pageViews.toLocaleString("ru-RU")}
          change={delta(kpis.pageViews, prevKpis.pageViews)}
        />
        <KpiCard
          icon={UserPlus}
          title="Новые посетители"
          value={kpis.newVisitors.toLocaleString("ru-RU")}
          change={delta(kpis.newVisitors, prevKpis.newVisitors)}
        />
        <KpiCard
          icon={Timer}
          title="Среднее время на сайте"
          value={formatDuration(kpis.avgDurationSec)}
          change={delta(kpis.avgDurationSec, prevKpis.avgDurationSec)}
        />
        <KpiCard
          icon={LogOut}
          title="Bounce rate"
          value={`${kpis.bounceRate.toFixed(1)}%`}
          change={delta(kpis.bounceRate, prevKpis.bounceRate)}
          invert
        />
      </div>

      <div className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[0.62rem] tracking-[0.24em] text-muted-foreground uppercase">Динамика по дням</h3>
          <div className="flex gap-1.5 rounded-xl border border-border p-1">
            {METRICS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={`rounded-lg px-3 py-1.5 text-[0.62rem] tracking-[0.16em] transition-colors ${
                  metric === m.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 h-[260px] w-full sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="scAnalyticsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
                tickLine={false}
                axisLine={false}
                minTickGap={16}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={44}
              />
              <Tooltip
                cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0]?.payload as (typeof series)[number] | undefined;
                  if (!p) return null;
                  return (
                    <div className="glass rounded-xl px-3.5 py-2.5 text-xs shadow-lg">
                      <p className="mb-1.5 text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
                        {label}
                      </p>
                      <p className="text-foreground">Посетители: {p.visitors}</p>
                      <p className="text-foreground">Сессии: {p.sessions}</p>
                      <p className="text-foreground">Просмотры: {p.views}</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke="currentColor"
                strokeWidth={2}
                fill="url(#scAnalyticsFill)"
                className="text-foreground"
                activeDot={{ r: 4 }}
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={cardCls}>
        <h3 className="text-[0.62rem] tracking-[0.24em] text-muted-foreground uppercase">Популярные страницы</h3>
        <div className="mt-4 -mx-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-[0.58rem] tracking-[0.18em] text-muted-foreground uppercase">
                <th className="px-2 pb-2 font-normal">Страница</th>
                <th className="px-2 pb-2 text-right font-normal">Просмотры</th>
                <th className="px-2 pb-2 text-right font-normal">Уникальные</th>
                <th className="px-2 pb-2 text-right font-normal">Ср. время</th>
                <th className="px-2 pb-2 text-right font-normal">Bounce</th>
              </tr>
            </thead>
            <tbody>
              {pages.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-muted-foreground">
                    Нет данных за период
                  </td>
                </tr>
              )}
              {pages.map((p) => (
                <tr key={p.path} className="border-t border-border/60 transition-colors hover:bg-secondary/30">
                  <td className="max-w-[240px] truncate px-2 py-2.5 text-foreground">{p.path}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">{p.views}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">{p.visitors}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                    {formatDuration(p.avgDurationSec)}
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                    {p.bounceRate.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <BarList title="Источники трафика" rows={sources} total={cur.sessions.length} />
        <BarList title="Устройства" rows={devices} total={cur.sessions.length} />
        <BarList title="География" rows={countries} total={cur.sessions.length} />
        <BarList title="События" rows={events} total={cur.events.length} />
      </div>
    </div>
  );
}
