import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronDown,
  KeyRound,
  Plus,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  resetAdminPassword,
  setAdminActive,
  setAdminName,
  setAdminRole,
} from "@/lib/admins.functions";
import { ADMIN_ROLES, roleLabel } from "@/lib/roles";
import {
  actionLabel,
  entityLabel,
  fetchUserActivity,
  formatDateTime,
  signAvatars,
  type ActivityRow,
} from "@/lib/activity";
import { AdminAvatar } from "./AdminAvatar";
import { ProfileCard } from "./ProfileCard";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 focus:bg-secondary/60";
const labelCls = "mb-1.5 block text-[0.6rem] tracking-[0.22em] text-muted-foreground";
const btnCls =
  "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[0.65rem] font-semibold tracking-[0.18em] text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50";
const ghostCls =
  "inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-[0.6rem] tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-40";
const dangerCls =
  "inline-flex items-center gap-2 rounded-xl border border-destructive/50 px-3.5 py-2 text-[0.6rem] tracking-[0.18em] text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40";
const cardCls = "glass rounded-2xl p-5 sm:p-6";

const errText = (e: unknown) => (e instanceof Error ? e.message : "Что-то пошло не так");
const fmt = (v?: string | null) => (v ? formatDateTime(v) : "—");

type Row = {
  user_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: string;
  active: boolean;
  must_change_password: boolean;
  created_at: string;
  last_login_at: string | null;
};

function AdminHistory({ userId }: { userId: string }) {
  const history = useQuery({
    queryKey: ["admin", "activity", "user", userId],
    queryFn: () => fetchUserActivity(userId, 15),
  });
  const rows = (history.data ?? []) as ActivityRow[];

  if (history.isLoading) {
    return <p className="text-[0.6rem] tracking-[0.22em] text-muted-foreground">ЗАГРУЗКА…</p>;
  }
  if (!rows.length) {
    return <p className="text-[0.6rem] tracking-[0.22em] text-muted-foreground">ДЕЙСТВИЙ НЕТ</p>;
  }
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap justify-between gap-2 text-[0.7rem]">
          <span className="text-foreground/90">
            {actionLabel(r.action)}
            {r.object_label ? (
              <span className="text-muted-foreground"> · {r.object_label}</span>
            ) : null}
            <span className="text-muted-foreground"> · {entityLabel(r.entity)}</span>
          </span>
          <span className="text-muted-foreground">{formatDateTime(r.created_at)}</span>
        </li>
      ))}
    </ul>
  );
}

export function AdminsTab() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [role, setRole] = useState<string>("organizer");
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  const admins = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: () => listAdminUsers(),
  });

  const rows = (admins.data?.rows ?? []) as Row[];
  const selfId = admins.data?.selfId;
  const reload = () => admins.refetch();

  useEffect(() => {
    const paths = rows.map((r) => r.avatar_url ?? "").filter(Boolean);
    if (paths.length) signAvatars(paths).then(setAvatars);
    setNames((prev) => {
      const next = { ...prev };
      rows.forEach((r) => {
        if (next[r.user_id] === undefined) next[r.user_id] = r.name ?? "";
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admins.data]);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
      reload();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(null);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    await run("create", async () => {
      await createAdminUser({ data: { email, role, name: newName } });
      toast.success("Администратор добавлен, пароль отправлен на почту");
      setEmail("");
      setNewName("");
      setOpen(false);
    });
  }

  return (
    <div className="space-y-4">
      <ProfileCard onSaved={reload} />

      {open ? (
        <form onSubmit={onCreate} className={`${cardCls} space-y-4`}>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <UserPlus size={15} /> Новый администратор
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>ИМЯ</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Имя"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>EMAIL</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@scirenatour.ru"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>РОЛЬ</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
                {ADMIN_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label} — {r.hint}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
            Временный пароль сгенерируется автоматически и придёт на указанную почту. При первом
            входе система попросит задать новый пароль.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy === "create"} className={btnCls}>
              {busy === "create" ? "ОТПРАВКА…" : "СОЗДАТЬ И ОТПРАВИТЬ ПАРОЛЬ"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={ghostCls}>
              ОТМЕНА
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className={btnCls}>
          <Plus size={14} /> ДОБАВИТЬ АДМИНИСТРАТОРА
        </button>
      )}

      {admins.isLoading && (
        <p className="text-[0.65rem] tracking-[0.25em] text-muted-foreground">ЗАГРУЗКА…</p>
      )}

      {rows.map((row) => (
        <div key={row.user_id} className={`${cardCls} space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <AdminAvatar
                name={row.name}
                email={row.email}
                url={row.avatar_url ? avatars[row.avatar_url] : null}
              />
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">{row.name || row.email}</p>
                <p className="mt-1 truncate text-[0.6rem] tracking-[0.22em] text-muted-foreground">
                  {row.email.toUpperCase()} · {roleLabel(row.role).toUpperCase()}
                  {row.user_id === selfId ? " · ЭТО ВЫ" : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-[0.55rem] tracking-[0.2em] ${
                  row.active
                    ? "bg-foreground/10 text-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {row.active ? "АКТИВЕН" : "ОТКЛЮЧЁН"}
              </span>
              {row.must_change_password && (
                <span className="rounded-full border border-border px-3 py-1 text-[0.55rem] tracking-[0.2em] text-muted-foreground">
                  ВРЕМЕННЫЙ ПАРОЛЬ
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-2 text-[0.65rem] text-muted-foreground sm:grid-cols-2">
            <p>СОЗДАН: {fmt(row.created_at)}</p>
            <p>ПОСЛЕДНИЙ ВХОД: {fmt(row.last_login_at)}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>ИМЯ</label>
              <div className="flex gap-2">
                <input
                  value={names[row.user_id] ?? ""}
                  onChange={(e) => setNames((p) => ({ ...p, [row.user_id]: e.target.value }))}
                  placeholder="Имя"
                  className={inputCls}
                />
                <button
                  disabled={busy === row.user_id}
                  onClick={() =>
                    run(row.user_id, async () => {
                      await setAdminName({
                        data: { userId: row.user_id, name: names[row.user_id] ?? "" },
                      });
                      toast.success("Имя обновлено");
                    })
                  }
                  className={ghostCls}
                >
                  ОК
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>РОЛЬ</label>
              <select
                value={row.role}
                disabled={row.user_id === selfId || busy === row.user_id}
                onChange={(e) => {
                  const next = e.target.value;
                  run(row.user_id, async () => {
                    await setAdminRole({ data: { userId: row.user_id, role: next } });
                    toast.success("Роль обновлена");
                  });
                }}
                className={`${inputCls} disabled:opacity-50`}
              >
                {ADMIN_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                run(row.user_id, async () => {
                  const res = await resetAdminPassword({
                    data: { userId: row.user_id, email: row.email },
                  });
                  toast.success(
                    res.viaLink
                      ? "Ссылка для смены пароля отправлена на почту"
                      : "Новый временный пароль отправлен на почту",
                  );
                })
              }
              disabled={busy === row.user_id}
              className={ghostCls}
            >
              <KeyRound size={13} /> СБРОС ПАРОЛЯ
            </button>
            <button
              onClick={() =>
                run(row.user_id, async () => {
                  await setAdminActive({ data: { userId: row.user_id, active: !row.active } });
                  toast.success(row.active ? "Пользователь деактивирован" : "Пользователь активирован");
                })
              }
              disabled={busy === row.user_id || row.user_id === selfId}
              className={ghostCls}
            >
              {row.active ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
              {row.active ? "ДЕАКТИВИРОВАТЬ" : "АКТИВИРОВАТЬ"}
            </button>
            <button
              onClick={() => setExpanded(expanded === row.user_id ? null : row.user_id)}
              className={ghostCls}
            >
              <ChevronDown
                size={13}
                className={expanded === row.user_id ? "rotate-180 transition-transform" : "transition-transform"}
              />
              ИСТОРИЯ ДЕЙСТВИЙ
            </button>
            <button
              onClick={() => setConfirmDelete(row.user_id)}
              disabled={busy === row.user_id || row.user_id === selfId}
              className={dangerCls}
            >
              <Trash2 size={13} /> УДАЛИТЬ
            </button>
          </div>

          {confirmDelete === row.user_id && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-[0.7rem] text-foreground">
                Удалить администратора {row.email}? Действие необратимо.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={busy === row.user_id}
                  onClick={() =>
                    run(row.user_id, async () => {
                      await deleteAdminUser({ data: { userId: row.user_id } });
                      setConfirmDelete(null);
                      toast.success("Администратор удалён");
                    })
                  }
                  className={dangerCls}
                >
                  ПОДТВЕРДИТЬ УДАЛЕНИЕ
                </button>
                <button onClick={() => setConfirmDelete(null)} className={ghostCls}>
                  ОТМЕНА
                </button>
              </div>
            </div>
          )}

          {expanded === row.user_id && (
            <div className="rounded-xl border border-border p-4">
              <AdminHistory userId={row.user_id} />
            </div>
          )}
        </div>
      ))}

      {!admins.isLoading && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center text-[0.65rem] tracking-[0.25em] text-muted-foreground">
          АДМИНИСТРАТОРОВ ПОКА НЕТ
        </div>
      )}
    </div>
  );
}
