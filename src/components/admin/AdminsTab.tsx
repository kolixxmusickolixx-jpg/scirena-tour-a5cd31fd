import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Plus, ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import {
  createAdminUser,
  listAdminUsers,
  resetAdminPassword,
  setAdminActive,
  setAdminRole,
} from "@/lib/admins.functions";
import { ADMIN_ROLES, roleLabel } from "@/lib/roles";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 focus:bg-secondary/60";
const labelCls = "mb-1.5 block text-[0.6rem] tracking-[0.22em] text-muted-foreground";
const btnCls =
  "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[0.65rem] font-semibold tracking-[0.18em] text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50";
const ghostCls =
  "inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-[0.6rem] tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-40";
const cardCls = "glass rounded-2xl p-5 sm:p-6";

const errText = (e: unknown) => (e instanceof Error ? e.message : "Что-то пошло не так");

type Row = {
  user_id: string;
  email: string;
  role: string;
  active: boolean;
  must_change_password: boolean;
};

export function AdminsTab() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("organizer");
  const [busy, setBusy] = useState<string | null>(null);

  const admins = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: () => listAdminUsers(),
  });

  const rows = (admins.data?.rows ?? []) as Row[];
  const selfId = admins.data?.selfId;
  const reload = () => admins.refetch();

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    try {
      await createAdminUser({ data: { email, role } });
      toast.success("Администратор добавлен, пароль отправлен на почту");
      setEmail("");
      setOpen(false);
      reload();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(null);
    }
  }

  async function onReset(row: Row) {
    setBusy(row.user_id);
    try {
      const res = await resetAdminPassword({ data: { userId: row.user_id, email: row.email } });
      toast.success(
        res.viaLink
          ? "Ссылка для смены пароля отправлена на почту"
          : "Новый временный пароль отправлен на почту",
      );
      reload();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(null);
    }
  }

  async function onToggle(row: Row) {
    setBusy(row.user_id);
    try {
      await setAdminActive({ data: { userId: row.user_id, active: !row.active } });
      toast.success(row.active ? "Пользователь деактивирован" : "Пользователь активирован");
      reload();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(null);
    }
  }

  async function onRole(row: Row, next: string) {
    setBusy(row.user_id);
    try {
      await setAdminRole({ data: { userId: row.user_id, role: next } });
      toast.success("Роль обновлена");
      reload();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {open ? (
        <form onSubmit={onCreate} className={`${cardCls} space-y-4`}>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <UserPlus size={15} /> Новый администратор
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{row.email}</p>
              <p className="mt-1 text-[0.6rem] tracking-[0.22em] text-muted-foreground">
                {roleLabel(row.role).toUpperCase()}
                {row.user_id === selfId ? " · ЭТО ВЫ" : ""}
              </p>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>РОЛЬ</label>
              <select
                value={row.role}
                disabled={row.user_id === selfId || busy === row.user_id}
                onChange={(e) => onRole(row, e.target.value)}
                className={`${inputCls} disabled:opacity-50`}
              >
                {ADMIN_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => onReset(row)}
                disabled={busy === row.user_id}
                className={ghostCls}
              >
                <KeyRound size={13} /> СБРОС ПАРОЛЯ
              </button>
              <button
                onClick={() => onToggle(row)}
                disabled={busy === row.user_id || row.user_id === selfId}
                className={ghostCls}
              >
                {row.active ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                {row.active ? "ДЕАКТИВИРОВАТЬ" : "АКТИВИРОВАТЬ"}
              </button>
            </div>
          </div>
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
