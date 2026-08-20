import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Search } from "lucide-react";
import {
  ACTION_GROUPS,
  ENTITY_LABELS,
  actionLabel,
  activityKeys,
  entityLabel,
  fetchActivity,
  formatDateTime,
  matchesGroup,
  type ActivityRow,
} from "@/lib/activity";
import { roleLabel } from "@/lib/roles";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 focus:bg-secondary/60";
const chipCls = (on: boolean) =>
  `rounded-full px-3.5 py-1.5 text-[0.6rem] tracking-[0.18em] transition-colors ${
    on
      ? "bg-foreground text-background"
      : "border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
  }`;

export function ActivityTab() {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const [entity, setEntity] = useState("all");

  const log = useQuery({
    queryKey: activityKeys.list,
    queryFn: () => fetchActivity(500),
    refetchOnWindowFocus: false,
  });

  const rows = (log.data ?? []) as ActivityRow[];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!matchesGroup(r, group)) return false;
      if (entity !== "all" && r.entity !== entity) return false;
      if (!needle) return true;
      return [r.actor_name, r.actor_email, actionLabel(r.action), entityLabel(r.entity), r.object_label]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, q, group, entity]);

  return (
    <div className="space-y-5">
      <div className="glass space-y-4 rounded-2xl p-5 sm:p-6">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по имени, действию или объекту"
            className={`${inputCls} pl-9`}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {ACTION_GROUPS.map((g) => (
            <button key={g.id} onClick={() => setGroup(g.id)} className={chipCls(group === g.id)}>
              {g.label.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setEntity("all")} className={chipCls(entity === "all")}>
            ВСЕ РАЗДЕЛЫ
          </button>
          {Object.entries(ENTITY_LABELS).map(([id, label]) => (
            <button key={id} onClick={() => setEntity(id)} className={chipCls(entity === id)}>
              {label.toUpperCase()}
            </button>
          ))}
          <button
            onClick={() => log.refetch()}
            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-[0.6rem] tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <RefreshCw size={13} className={log.isFetching ? "animate-spin" : ""} /> ОБНОВИТЬ
          </button>
        </div>
      </div>

      {log.isLoading && (
        <p className="text-[0.65rem] tracking-[0.25em] text-muted-foreground">ЗАГРУЗКА…</p>
      )}

      <div className="space-y-2">
        {filtered.map((r) => (
          <div
            key={r.id}
            className="glass flex flex-wrap items-start justify-between gap-3 rounded-2xl px-5 py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                {actionLabel(r.action)}
                {r.object_label ? (
                  <span className="text-muted-foreground"> · {r.object_label}</span>
                ) : null}
              </p>
              <p className="mt-1 truncate text-[0.6rem] tracking-[0.2em] text-muted-foreground">
                {(r.actor_name || r.actor_email || "СИСТЕМА").toUpperCase()}
                {r.actor_role ? ` · ${roleLabel(r.actor_role).toUpperCase()}` : ""} ·{" "}
                {entityLabel(r.entity).toUpperCase()}
              </p>
            </div>
            <span className="whitespace-nowrap text-[0.6rem] tracking-[0.18em] text-muted-foreground">
              {formatDateTime(r.created_at)}
            </span>
          </div>
        ))}
      </div>

      {!log.isLoading && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center text-[0.65rem] tracking-[0.25em] text-muted-foreground">
          ЗАПИСЕЙ НЕ НАЙДЕНО
        </div>
      )}
    </div>
  );
}
