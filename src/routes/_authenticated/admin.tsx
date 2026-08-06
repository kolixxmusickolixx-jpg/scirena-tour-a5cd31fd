import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signPaths } from "@/lib/gallery";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Админ-панель — SCIRENA" },
      { name: "description", content: "Управление датами тура, текстами, FAQ и ссылками сайта SCIRENA." },
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
  "w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/40";
const btnCls =
  "rounded-full bg-primary px-5 py-2 text-[0.65rem] font-semibold tracking-[0.2em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50";
const ghostCls =
  "rounded-full border border-border px-5 py-2 text-[0.65rem] tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground";

type Tab = "shows" | "content" | "faq" | "socials" | "gallery";

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("shows");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.rpc("claim_admin").then(({ data }) => setIsAdmin(Boolean(data)));
  }, []);

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

  const refresh = (key: string) => qc.invalidateQueries({ queryKey: ["admin", key] });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
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
            ВЫЙТИ
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">АДМИН-ПАНЕЛЬ</h1>
            <p className="mt-1 text-xs tracking-[0.2em] text-muted-foreground">SCIRENA TOUR</p>
          </div>
          <div className="flex gap-3">
            <Link to="/" className={ghostCls}>
              НА САЙТ
            </Link>
            <button onClick={signOut} className={ghostCls}>
              ВЫЙТИ
            </button>
          </div>
        </header>

        <nav className="mt-8 flex flex-wrap gap-2">
          {(
            [
              ["shows", "КОНЦЕРТЫ"],
              ["content", "ТЕКСТЫ"],
              ["faq", "FAQ"],
              ["socials", "ССЫЛКИ"],
              ["gallery", "ГАЛЕРЕЯ"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={
                tab === id
                  ? "rounded-full bg-primary px-5 py-2 text-[0.65rem] font-semibold tracking-[0.2em] text-primary-foreground"
                  : ghostCls
              }
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-8 space-y-4">
          {tab === "shows" && (
            <ShowsTab rows={shows.data ?? []} onChange={() => refresh("shows")} />
          )}
          {tab === "content" && (
            <ContentTab rows={content.data ?? []} onChange={() => refresh("content")} />
          )}
          {tab === "faq" && <FaqTab rows={faq.data ?? []} onChange={() => refresh("faq")} />}
          {tab === "socials" && (
            <SocialsTab rows={socials.data ?? []} onChange={() => refresh("socials")} />
          )}
          {tab === "gallery" && <GalleryTab />}
        </div>
      </div>
    </main>
  );
}

function useSaver(onChange: () => void) {
  return async (
    fn: () => PromiseLike<{ error: { message: string } | null }>,
    msg: string,
  ) => {
    const { error } = await fn();
    if (error) toast.error(error.message);
    else {
      toast.success(msg);
      onChange();
    }
  };
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
        + ДОБАВИТЬ ГОРОД
      </button>

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
    <div className="glass space-y-3 rounded-2xl p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground">ГОРОД</span>
          <input className={inputCls} value={draft.city} onChange={(e) => set("city", e.target.value)} />
        </label>
        <label className="block">
          <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground">ПЛОЩАДКА</span>
          <input className={inputCls} value={draft.venue} onChange={(e) => set("venue", e.target.value)} />
        </label>
        <label className="block">
          <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground">ДАТА</span>
          <input
            className={inputCls}
            value={draft.date_label}
            onChange={(e) => set("date_label", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground">ДЕНЬ НЕДЕЛИ</span>
          <input
            className={inputCls}
            value={draft.day_label}
            onChange={(e) => set("day_label", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground">СТАТУС</span>
          <select
            className={inputCls}
            value={draft.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="bg-background">
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground">ССЫЛКА НА БИЛЕТЫ</span>
          <input
            className={inputCls}
            value={draft.ticket_url}
            onChange={(e) => set("ticket_url", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground">ПОРЯДОК</span>
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
          СОХРАНИТЬ
        </button>
        <button
          className={ghostCls}
          onClick={() => {
            if (!confirm(`Удалить «${row.city}»?`)) return;
            save(() => supabase.from("shows").delete().eq("id", row.id), "Удалено");
          }}
        >
          УДАЛИТЬ
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
        + ДОБАВИТЬ ВОПРОС
      </button>
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
    <div className="glass space-y-3 rounded-2xl p-5">
      <input
        className={inputCls}
        value={draft.question}
        onChange={(e) => setDraft({ ...draft, question: e.target.value })}
      />
      <textarea
        className={`${inputCls} min-h-28`}
        value={draft.answer}
        onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
      />
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="number"
          className={`${inputCls} w-24`}
          value={draft.sort_order}
          onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
        />
        <button
          className={btnCls}
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
          СОХРАНИТЬ
        </button>
        <button
          className={ghostCls}
          onClick={() => {
            if (!confirm("Удалить вопрос?")) return;
            save(() => supabase.from("faq_items").delete().eq("id", row.id), "Удалено");
          }}
        >
          УДАЛИТЬ
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
        + ДОБАВИТЬ ССЫЛКУ
      </button>
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
    <div className="glass grid gap-3 rounded-2xl p-5 sm:grid-cols-[1fr_2fr_auto]">
      <input
        className={inputCls}
        value={draft.label}
        onChange={(e) => setDraft({ ...draft, label: e.target.value })}
      />
      <input
        className={inputCls}
        value={draft.url}
        onChange={(e) => setDraft({ ...draft, url: e.target.value })}
      />
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
          СОХР.
        </button>
        <button
          className={ghostCls}
          onClick={() => {
            if (!confirm("Удалить ссылку?")) return;
            save(() => supabase.from("social_links").delete().eq("id", row.id), "Удалено");
          }}
        >
          УД.
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
  const save = useSaver(onChange);
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const r of rows) next[r.key] = r.value;
    setDraft(next);
  }, [rows]);

  return (
    <div className="glass space-y-4 rounded-2xl p-5">
      {rows.map((r) => (
        <label key={r.key} className="block">
          <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground">
            {(CONTENT_LABELS[r.key] ?? r.key).toUpperCase()}
          </span>
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
        onClick={async () => {
          for (const r of rows) {
            const value = draft[r.key] ?? "";
            if (value === r.value) continue;
            const { error } = await supabase
              .from("site_content")
              .update({ value })
              .eq("key", r.key);
            if (error) {
              toast.error(error.message);
              return;
            }
          }
          toast.success("Тексты сохранены");
          onChange();
        }}
      >
        СОХРАНИТЬ ТЕКСТЫ
      </button>
    </div>
  );
}

type AlbumRow = { id: string; title: string; date_label: string; sort_order: number };

function GalleryTab() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["gallery"] });
  const save = useSaver(refresh);

  const albums = useQuery({
    queryKey: ["gallery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_albums")
        .select("id, title, date_label, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data as AlbumRow[];
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
        + СОЗДАТЬ АЛЬБОМ
      </button>
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
  const save = useSaver(onChange);
  useEffect(() => setDraft(row), [row]);

  const photos = useQuery({
    queryKey: ["gallery-photos", row.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("id, storage_path, sort_order")
        .eq("album_id", row.id)
        .order("sort_order");
      if (error) throw error;
      const paths = (data ?? []).map((p) => p.storage_path);
      const signed = await signPaths(paths);
      return (data ?? []).map((p) => ({ ...p, url: signed[p.storage_path] ?? "" }));
    },
  });

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    const start = (photos.data?.at(-1)?.sort_order ?? 0) + 1;
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      setProgress(`${i + 1} / ${files.length}`);
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${row.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("gallery").upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
      });
      if (up.error) {
        toast.error(up.error.message);
        continue;
      }
      const ins = await supabase.from("gallery_photos").insert({
        album_id: row.id,
        storage_path: path,
        url: "",
        sort_order: start + i,
      });
      if (ins.error) toast.error(ins.error.message);
      else ok++;
    }
    setBusy(false);
    setProgress(null);
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
    const paths = (photos.data ?? []).map((p) => p.storage_path);
    if (paths.length) await supabase.storage.from("gallery").remove(paths);
    save(() => supabase.from("gallery_albums").delete().eq("id", row.id), "Альбом удалён");
  }

  return (
    <div className="glass space-y-4 rounded-2xl p-5">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
        <label className="block">
          <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground">НАЗВАНИЕ</span>
          <input
            className={inputCls}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground">ДАТА</span>
          <input
            className={inputCls}
            value={draft.date_label}
            onChange={(e) => setDraft({ ...draft, date_label: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground">ПОРЯДОК</span>
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
          СОХРАНИТЬ
        </button>

        <label className={`${ghostCls} cursor-pointer`}>
          {busy ? `ЗАГРУЗКА ${progress ?? ""}` : "+ ДОБАВИТЬ ФОТО"}
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
          УДАЛИТЬ АЛЬБОМ
        </button>
      </div>

      {(photos.data?.length ?? 0) > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {photos.data!.map((p) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
              <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              <button
                onClick={() => removePhoto(p.id, p.storage_path)}
                aria-label="Удалить фото"
                className="absolute top-1 right-1 rounded-full bg-background/80 px-2 py-1 text-[0.6rem] text-foreground"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
