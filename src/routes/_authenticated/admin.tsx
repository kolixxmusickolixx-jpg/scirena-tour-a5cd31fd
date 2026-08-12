import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Type,
  HelpCircle,
  Link2,
  Images,
  LogOut,
  ExternalLink,
  Plus,
  Trash2,
  Save,
  Upload,
  Menu,
  Inbox,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { checkAdminTwoFactor, revokeAdminTwoFactor } from "@/lib/twofa.functions";

import { signPaths, galleryKeys } from "@/lib/gallery";
import { SupportTab } from "@/components/admin/SupportTab";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Админ-панель — SCIRENA" },
      {
        name: "description",
        content: "Управление датами тура, текстами, FAQ, галереей и ссылками сайта SCIRENA.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Админ-панель — SCIRENA" },
      { property: "og:description", content: "Управление контентом сайта тура SCIRENA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const STATUSES = ["Билеты есть", "Мало билетов", "Sold out"];

const inputCls =
  "w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 focus:bg-secondary/60";
const labelCls = "mb-1.5 block text-[0.6rem] tracking-[0.22em] text-muted-foreground";
const btnCls =
  "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[0.65rem] font-semibold tracking-[0.18em] text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50";
const ghostCls =
  "inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[0.65rem] tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground";
const cardCls = "glass rounded-2xl p-5 sm:p-6";

type Tab = "shows" | "content" | "faq" | "socials" | "gallery" | "support";

const TABS: { id: Tab; label: string; icon: typeof CalendarDays; hint: string }[] = [
  { id: "shows", label: "Концерты", icon: CalendarDays, hint: "Города, площадки и билеты" },
  { id: "content", label: "Тексты", icon: Type, hint: "Заголовки, биография, цитата" },
  { id: "faq", label: "FAQ", icon: HelpCircle, hint: "Вопросы и ответы" },
  { id: "socials", label: "Ссылки", icon: Link2, hint: "Соцсети в подвале" },
  { id: "gallery", label: "Галерея", icon: Images, hint: "Альбомы и фотографии" },
  { id: "support", label: "Обращения", icon: Inbox, hint: "Переписка с клиентами" },
];

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("shows");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [twoFactorOk, setTwoFactorOk] = useState<boolean | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    checkAdminTwoFactor()
      .then(async ({ verified }) => {
        if (!alive) return;
        if (!verified) {
          setTwoFactorOk(false);
          await supabase.auth.signOut();
          navigate({ to: "/auth", replace: true });
          return;
        }
        setTwoFactorOk(true);
        const { data } = await supabase.rpc("claim_admin");
        if (alive) setIsAdmin(Boolean(data));
      })
      .catch(async () => {
        if (!alive) return;
        setTwoFactorOk(false);
        await supabase.auth.signOut();
        navigate({ to: "/auth", replace: true });
      });
    return () => {
      alive = false;
    };
  }, [navigate]);


  const shows = useQuery({
    queryKey: ["admin", "shows"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shows").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const faq = useQuery({
    queryKey: ["admin", "faq"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faq_items").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const socials = useQuery({
    queryKey: ["admin", "socials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("social_links").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const content = useQuery({
    queryKey: ["admin", "content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_content").select("*").order("key");
      if (error) throw error;
      return data;
    },
  });

  const refresh = (key: string) => {
    qc.invalidateQueries({ queryKey: ["admin", key] });
    qc.invalidateQueries({ queryKey: ["site"] });
  };

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    try {
      await revokeAdminTwoFactor();
    } catch {
      /* session may already be gone */
    }
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (twoFactorOk !== true) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 text-center">
        <p className="text-[0.65rem] tracking-[0.3em] text-muted-foreground">ПРОВЕРКА ДОСТУПА…</p>
      </main>
    );
  }

  if (isAdmin === false) {

    return (
      <main className="flex min-h-screen items-center justify-center px-5 text-center">
        <div className="glass max-w-md rounded-3xl p-8">
          <h1 className="font-display text-2xl font-bold">Нет доступа</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            У этого аккаунта нет прав администратора.
          </p>
          <button onClick={signOut} className={`${ghostCls} mt-6`}>
            <LogOut size={14} /> ВЫЙТИ
          </button>
        </div>
      </main>
    );
  }

  const active = TABS.find((t) => t.id === tab) ?? TABS[0]!;
  const counts: Record<Tab, number | null> = {
    shows: shows.data?.length ?? null,
    content: content.data?.length ?? null,
    faq: faq.data?.length ?? null,
    socials: socials.data?.length ?? null,
    gallery: null,
    support: null,
  };

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar */}
      <aside
        className={`glass fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-xs flex-col border-r border-border p-6 transition-transform duration-500 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <p className="font-display text-lg font-extrabold tracking-[0.2em]">SCIRENA</p>
          <p className="mt-1 text-[0.55rem] tracking-[0.3em] text-muted-foreground">
            ПАНЕЛЬ УПРАВЛЕНИЯ
          </p>
        </div>

        <nav className="mt-8 flex-1 space-y-1.5">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  setNavOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition-all ${
                  isActive
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="flex-1 tracking-[0.12em]">{label.toUpperCase()}</span>
                {counts[id] !== null && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.6rem] text-muted-foreground">
                    {counts[id]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-border pt-5">
          <Link to="/" className={`${ghostCls} w-full justify-center`}>
            <ExternalLink size={14} /> НА САЙТ
          </Link>
          <button onClick={signOut} className={`${ghostCls} w-full justify-center`}>
            <LogOut size={14} /> ВЫЙТИ
          </button>
        </div>
      </aside>

      {navOpen && (
        <button
          aria-label="Закрыть меню"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-background/70 lg:hidden"
        />
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setNavOpen(true)}
              aria-label="Меню"
              className="rounded-xl border border-border p-2.5 text-muted-foreground lg:hidden"
            >
              <Menu size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="font-display truncate text-xl font-extrabold tracking-tight sm:text-2xl">
                {active.label}
              </h1>
              <p className="truncate text-[0.6rem] tracking-[0.2em] text-muted-foreground">
                {active.hint.toUpperCase()}
              </p>
            </div>
          </div>
        </header>

        <main className="px-5 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-4xl space-y-4">
            {tab === "shows" && <ShowsTab rows={shows.data ?? []} onChange={() => refresh("shows")} />}
            {tab === "content" && (
              <ContentTab rows={content.data ?? []} onChange={() => refresh("content")} />
            )}
            {tab === "faq" && <FaqTab rows={faq.data ?? []} onChange={() => refresh("faq")} />}
            {tab === "socials" && (
              <SocialsTab rows={socials.data ?? []} onChange={() => refresh("socials")} />
            )}
            {tab === "gallery" && <GalleryTab />}
            {tab === "support" && <SupportTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

function useSaver(onChange: () => void) {
  return async (fn: () => PromiseLike<{ error: { message: string } | null }>, msg: string) => {
    const { error } = await fn();
    if (error) toast.error(error.message);
    else {
      toast.success(msg);
      onChange();
    }
  };
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border py-14 text-center text-[0.65rem] tracking-[0.25em] text-muted-foreground">
      {text}
    </div>
  );
}

type ShowRow = {
  id: string;
  city: string;
  venue: string;
  date_label: string;
  day_label: string;
  status: string;
  ticket_url: string;
  sort_order: number;
};

function ShowsTab({ rows, onChange }: { rows: ShowRow[]; onChange: () => void }) {
  const save = useSaver(onChange);

  return (
    <div className="space-y-4">
      <button
        className={btnCls}
        onClick={() =>
          save(
            () =>
              supabase.from("shows").insert({
                city: "Новый город",
                venue: "Площадка",
                date_label: "01.01",
                day_label: "ПН",
                status: "Билеты есть",
                sort_order: (rows.at(-1)?.sort_order ?? 0) + 1,
              }),
            "Концерт добавлен",
          )
        }
      >
        <Plus size={14} /> ДОБАВИТЬ ГОРОД
      </button>

      {rows.length === 0 && <EmptyState text="КОНЦЕРТОВ ПОКА НЕТ" />}
      {rows.map((row) => (
        <ShowCard key={row.id} row={row} onChange={onChange} />
      ))}
    </div>
  );
}

function ShowCard({ row, onChange }: { row: ShowRow; onChange: () => void }) {
  const [draft, setDraft] = useState(row);
  const save = useSaver(onChange);
  useEffect(() => setDraft(row), [row]);

  const set = (k: keyof ShowRow, v: string | number) => setDraft({ ...draft, [k]: v });

  return (
    <div className={`${cardCls} space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-display truncate text-base font-bold">{draft.city || "Без города"}</p>
        <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-[0.55rem] tracking-[0.2em] text-muted-foreground">
          {draft.status.toUpperCase()}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>ГОРОД</span>
          <input className={inputCls} value={draft.city} onChange={(e) => set("city", e.target.value)} />
        </label>
        <label className="block">
          <span className={labelCls}>ПЛОЩАДКА</span>
          <input className={inputCls} value={draft.venue} onChange={(e) => set("venue", e.target.value)} />
        </label>
        <label className="block">
          <span className={labelCls}>ДАТА</span>
          <input
            className={inputCls}
            value={draft.date_label}
            onChange={(e) => set("date_label", e.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelCls}>ДЕНЬ НЕДЕЛИ</span>
          <input
            className={inputCls}
            value={draft.day_label}
            onChange={(e) => set("day_label", e.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelCls}>СТАТУС</span>
          <select className={inputCls} value={draft.status} onChange={(e) => set("status", e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s} className="bg-background">
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>ССЫЛКА НА БИЛЕТЫ</span>
          <input
            className={inputCls}
            value={draft.ticket_url}
            onChange={(e) => set("ticket_url", e.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelCls}>ПОРЯДОК</span>
          <input
            type="number"
            className={inputCls}
            value={draft.sort_order}
            onChange={(e) => set("sort_order", Number(e.target.value))}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          className={btnCls}
          onClick={() =>
            save(
              () =>
                supabase
                  .from("shows")
                  .update({
                    city: draft.city,
                    venue: draft.venue,
                    date_label: draft.date_label,
                    day_label: draft.day_label,
                    status: draft.status,
                    ticket_url: draft.ticket_url,
                    sort_order: draft.sort_order,
                  })
                  .eq("id", row.id),
              "Сохранено",
            )
          }
        >
          <Save size={14} /> СОХРАНИТЬ
        </button>
        <button
          className={ghostCls}
          onClick={() => {
            if (!confirm(`Удалить «${row.city}»?`)) return;
            save(() => supabase.from("shows").delete().eq("id", row.id), "Удалено");
          }}
        >
          <Trash2 size={14} /> УДАЛИТЬ
        </button>
      </div>
    </div>
  );
}

type FaqRow = { id: string; question: string; answer: string; sort_order: number };

function FaqTab({ rows, onChange }: { rows: FaqRow[]; onChange: () => void }) {
  const save = useSaver(onChange);
  return (
    <div className="space-y-4">
      <button
        className={btnCls}
        onClick={() =>
          save(
            () =>
              supabase.from("faq_items").insert({
                question: "Новый вопрос",
                answer: "Ответ",
                sort_order: (rows.at(-1)?.sort_order ?? 0) + 1,
              }),
            "Вопрос добавлен",
          )
        }
      >
        <Plus size={14} /> ДОБАВИТЬ ВОПРОС
      </button>
      {rows.length === 0 && <EmptyState text="ВОПРОСОВ ПОКА НЕТ" />}
      {rows.map((row) => (
        <FaqCard key={row.id} row={row} onChange={onChange} />
      ))}
    </div>
  );
}

function FaqCard({ row, onChange }: { row: FaqRow; onChange: () => void }) {
  const [draft, setDraft] = useState(row);
  const save = useSaver(onChange);
  useEffect(() => setDraft(row), [row]);

  return (
    <div className={`${cardCls} space-y-3`}>
      <label className="block">
        <span className={labelCls}>ВОПРОС</span>
        <input
          className={inputCls}
          value={draft.question}
          onChange={(e) => setDraft({ ...draft, question: e.target.value })}
        />
      </label>
      <label className="block">
        <span className={labelCls}>ОТВЕТ</span>
        <textarea
          className={`${inputCls} min-h-28`}
          value={draft.answer}
          onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="block">
          <span className={labelCls}>ПОРЯДОК</span>
          <input
            type="number"
            className={`${inputCls} w-24`}
            value={draft.sort_order}
            onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
          />
        </label>
        <button
          className={`${btnCls} mt-5`}
          onClick={() =>
            save(
              () =>
                supabase
                  .from("faq_items")
                  .update({
                    question: draft.question,
                    answer: draft.answer,
                    sort_order: draft.sort_order,
                  })
                  .eq("id", row.id),
              "Сохранено",
            )
          }
        >
          <Save size={14} /> СОХРАНИТЬ
        </button>
        <button
          className={`${ghostCls} mt-5`}
          onClick={() => {
            if (!confirm("Удалить вопрос?")) return;
            save(() => supabase.from("faq_items").delete().eq("id", row.id), "Удалено");
          }}
        >
          <Trash2 size={14} /> УДАЛИТЬ
        </button>
      </div>
    </div>
  );
}

type SocialRow = { id: string; label: string; url: string; sort_order: number };

function SocialsTab({ rows, onChange }: { rows: SocialRow[]; onChange: () => void }) {
  const save = useSaver(onChange);
  return (
    <div className="space-y-4">
      <button
        className={btnCls}
        onClick={() =>
          save(
            () =>
              supabase.from("social_links").insert({
                label: "Соцсеть",
                url: "https://",
                sort_order: (rows.at(-1)?.sort_order ?? 0) + 1,
              }),
            "Ссылка добавлена",
          )
        }
      >
        <Plus size={14} /> ДОБАВИТЬ ССЫЛКУ
      </button>
      {rows.length === 0 && <EmptyState text="ССЫЛОК ПОКА НЕТ" />}
      {rows.map((row) => (
        <SocialCard key={row.id} row={row} onChange={onChange} />
      ))}
    </div>
  );
}

function SocialCard({ row, onChange }: { row: SocialRow; onChange: () => void }) {
  const [draft, setDraft] = useState(row);
  const save = useSaver(onChange);
  useEffect(() => setDraft(row), [row]);

  return (
    <div className={`${cardCls} grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end`}>
      <label className="block">
        <span className={labelCls}>НАЗВАНИЕ</span>
        <input
          className={inputCls}
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        />
      </label>
      <label className="block">
        <span className={labelCls}>ССЫЛКА</span>
        <input
          className={inputCls}
          value={draft.url}
          onChange={(e) => setDraft({ ...draft, url: e.target.value })}
        />
      </label>
      <div className="flex gap-2">
        <button
          className={btnCls}
          onClick={() =>
            save(
              () =>
                supabase
                  .from("social_links")
                  .update({ label: draft.label, url: draft.url, sort_order: draft.sort_order })
                  .eq("id", row.id),
              "Сохранено",
            )
          }
        >
          <Save size={14} />
        </button>
        <button
          className={ghostCls}
          onClick={() => {
            if (!confirm("Удалить ссылку?")) return;
            save(() => supabase.from("social_links").delete().eq("id", row.id), "Удалено");
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

const CONTENT_LABELS: Record<string, string> = {
  hero_artist: "Имя артиста (шапка)",
  hero_title_line1: "Заголовок — строка 1",
  hero_title_line2: "Заголовок — строка 2",
  hero_tour_label: "Подпись тура",
  hero_note: "Короткая заметка справа",
  bio_p1: "Биография — абзац 1",
  bio_p2: "Биография — абзац 2",
  bio_p3: "Биография — абзац 3",
  bio_p4: "Биография — абзац 4",
  quote: "Цитата на полный экран",
  privacy_url: "Ссылка на политику конфиденциальности",
};

type ContentRow = { key: string; value: string };

function ContentTab({ rows, onChange }: { rows: ContentRow[]; onChange: () => void }) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const r of rows) next[r.key] = r.value;
    setDraft(next);
  }, [rows]);

  if (rows.length === 0) return <EmptyState text="ТЕКСТОВ ПОКА НЕТ" />;

  return (
    <div className={`${cardCls} space-y-4`}>
      {rows.map((r) => (
        <label key={r.key} className="block">
          <span className={labelCls}>{(CONTENT_LABELS[r.key] ?? r.key).toUpperCase()}</span>
          {(draft[r.key] ?? "").length > 90 ? (
            <textarea
              className={`${inputCls} min-h-32`}
              value={draft[r.key] ?? ""}
              onChange={(e) => setDraft({ ...draft, [r.key]: e.target.value })}
            />
          ) : (
            <input
              className={inputCls}
              value={draft[r.key] ?? ""}
              onChange={(e) => setDraft({ ...draft, [r.key]: e.target.value })}
            />
          )}
        </label>
      ))}
      <button
        className={btnCls}
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          for (const r of rows) {
            const value = draft[r.key] ?? "";
            if (value === r.value) continue;
            const { error } = await supabase.from("site_content").update({ value }).eq("key", r.key);
            if (error) {
              toast.error(error.message);
              setSaving(false);
              return;
            }
          }
          setSaving(false);
          toast.success("Тексты сохранены");
          onChange();
        }}
      >
        <Save size={14} /> {saving ? "СОХРАНЯЮ…" : "СОХРАНИТЬ ТЕКСТЫ"}
      </button>
    </div>
  );
}

type AlbumRow = { id: string; title: string; date_label: string; sort_order: number };

function GalleryTab() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: galleryKeys.adminAlbums });
    qc.invalidateQueries({ queryKey: galleryKeys.public });
  };
  const save = useSaver(refresh);

  const albums = useQuery({
    queryKey: galleryKeys.adminAlbums,
    queryFn: async (): Promise<AlbumRow[]> => {
      const { data, error } = await supabase
        .from("gallery_albums")
        .select("id, title, date_label, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = albums.data ?? [];

  return (
    <div className="space-y-4">
      <button
        className={btnCls}
        onClick={() =>
          save(
            () =>
              supabase.from("gallery_albums").insert({
                title: "Новый альбом",
                date_label: new Date().toLocaleDateString("ru-RU"),
                sort_order: (rows.at(-1)?.sort_order ?? 0) + 1,
              }),
            "Альбом создан",
          )
        }
      >
        <Plus size={14} /> СОЗДАТЬ АЛЬБОМ
      </button>
      {rows.length === 0 && <EmptyState text="АЛЬБОМОВ ПОКА НЕТ" />}
      {rows.map((row) => (
        <AlbumCard key={row.id} row={row} onChange={refresh} />
      ))}
    </div>
  );
}

function AlbumCard({ row, onChange }: { row: AlbumRow; onChange: () => void }) {
  const [draft, setDraft] = useState(row);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [queue, setQueue] = useState<{ file: File; url: string }[]>([]);
  const save = useSaver(onChange);
  useEffect(() => setDraft(row), [row]);

  const photos = useQuery({
    queryKey: galleryKeys.adminPhotos(row.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("id, storage_path, sort_order")
        .eq("album_id", row.id)
        .order("sort_order");
      if (error) throw error;
      const list = data ?? [];
      const signed = await signPaths(list.map((p) => p.storage_path));
      return list.map((p) => ({ ...p, url: signed[p.storage_path] ?? "" }));
    },
  });

  const photoList = photos.data ?? [];

  function addToQueue(files: FileList | null) {
    if (!files || files.length === 0) return;
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (picked.length === 0) {
      toast.error("Выберите изображения");
      return;
    }
    setQueue((q) => [...q, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }

  function removeFromQueue(index: number) {
    setQueue((q) => {
      const item = q[index];
      if (item) URL.revokeObjectURL(item.url);
      return q.filter((_, i) => i !== index);
    });
  }

  function clearQueue() {
    setQueue((q) => {
      q.forEach((i) => URL.revokeObjectURL(i.url));
      return [];
    });
  }

  async function uploadQueue() {
    if (queue.length === 0) return;
    setBusy(true);
    const start = (photoList.at(-1)?.sort_order ?? 0) + 1;
    let ok = 0;
    const failed: { file: File; url: string }[] = [];
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (!item) continue;
      setProgress(`${i + 1} / ${queue.length}`);
      const ext = item.file.name.split(".").pop() || "jpg";
      const path = `${row.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("gallery").upload(path, item.file, {
        cacheControl: "31536000",
        upsert: false,
      });
      if (up.error) {
        toast.error(`${item.file.name}: ${up.error.message}`);
        failed.push(item);
        continue;
      }
      const ins = await supabase.from("gallery_photos").insert({
        album_id: row.id,
        storage_path: path,
        url: "",
        sort_order: start + i,
      });
      if (ins.error) {
        toast.error(`${item.file.name}: ${ins.error.message}`);
        failed.push(item);
      } else {
        URL.revokeObjectURL(item.url);
        ok++;
      }
    }
    setBusy(false);
    setProgress(null);
    setQueue(failed);
    if (ok > 0) toast.success(`Загружено фото: ${ok}`);
    photos.refetch();
    onChange();
  }


  async function removePhoto(id: string, path: string) {
    await supabase.storage.from("gallery").remove([path]);
    const { error } = await supabase.from("gallery_photos").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Фото удалено");
      photos.refetch();
      onChange();
    }
  }

  async function removeAlbum() {
    if (!confirm(`Удалить альбом «${row.title}» со всеми фото?`)) return;
    const paths = photoList.map((p) => p.storage_path);
    if (paths.length) await supabase.storage.from("gallery").remove(paths);
    save(() => supabase.from("gallery_albums").delete().eq("id", row.id), "Альбом удалён");
  }

  return (
    <div className={`${cardCls} space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-display truncate text-base font-bold">{draft.title || "Без названия"}</p>
        <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-[0.55rem] tracking-[0.2em] text-muted-foreground">
          {photoList.length} ФОТО
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
        <label className="block">
          <span className={labelCls}>НАЗВАНИЕ</span>
          <input
            className={inputCls}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        <label className="block">
          <span className={labelCls}>ДАТА</span>
          <input
            className={inputCls}
            value={draft.date_label}
            onChange={(e) => setDraft({ ...draft, date_label: e.target.value })}
          />
        </label>
        <label className="block">
          <span className={labelCls}>ПОРЯДОК</span>
          <input
            type="number"
            className={`${inputCls} sm:w-24`}
            value={draft.sort_order}
            onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className={btnCls}
          onClick={() =>
            save(
              () =>
                supabase
                  .from("gallery_albums")
                  .update({
                    title: draft.title,
                    date_label: draft.date_label,
                    sort_order: draft.sort_order,
                  })
                  .eq("id", row.id),
              "Сохранено",
            )
          }
        >
          <Save size={14} /> СОХРАНИТЬ
        </button>

        <label className={`${ghostCls} cursor-pointer`}>
          <Upload size={14} />
          {busy ? `ЗАГРУЗКА ${progress ?? ""}` : "ДОБАВИТЬ ФОТО"}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            className="hidden"
            onChange={(e) => {
              upload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>

        <button className={ghostCls} onClick={removeAlbum}>
          <Trash2 size={14} /> УДАЛИТЬ АЛЬБОМ
        </button>
      </div>

      {photoList.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {photoList.map((p) => (
            <div
              key={p.id}
              className="relative aspect-square overflow-hidden rounded-xl bg-secondary"
            >
              {p.url && (
                <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              )}
              <button
                onClick={() => removePhoto(p.id, p.storage_path)}
                aria-label="Удалить фото"
                className="absolute top-1 right-1 rounded-full bg-background/80 p-1.5 text-foreground transition-colors hover:bg-destructive"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
