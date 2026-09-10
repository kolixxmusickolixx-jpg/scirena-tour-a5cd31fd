import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Save, Upload, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAdminReleases,
  releaseKeys,
  PLATFORMS,
  type Release,
} from "@/lib/releases";
import { PlatformIcon } from "@/components/releases/PlatformIcon";
import { SortableList } from "@/components/admin/SortableList";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 focus:bg-secondary/60";
const labelCls = "mb-1.5 block text-[0.6rem] tracking-[0.22em] text-muted-foreground";
const btnCls =
  "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[0.65rem] font-semibold tracking-[0.18em] text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50";
const ghostCls =
  "inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[0.65rem] tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground";

export function ReleasesTab() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: releaseKeys.admin });
    qc.invalidateQueries({ queryKey: releaseKeys.public });
  };

  const releases = useQuery({ queryKey: releaseKeys.admin, queryFn: fetchAdminReleases });
  const rows = releases.data ?? [];

  async function addRelease() {
    const { error } = await supabase.from("releases").insert({
      title: "Новый релиз",
      release_type: "single",
      published: false,
      sort_order: (rows.at(-1)?.sort_order ?? 0) + 1,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Релиз создан");
      refresh();
    }
  }

  return (
    <div className="space-y-4">
      <button className={btnCls} onClick={addRelease}>
        <Plus size={14} /> ДОБАВИТЬ РЕЛИЗ
      </button>

      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center text-[0.65rem] tracking-[0.25em] text-muted-foreground">
          РЕЛИЗОВ ПОКА НЕТ
        </div>
      )}

      <SortableList
        items={rows}
        table="releases"
        onSaved={refresh}
        renderItem={(row, handle) => (
          <ReleaseRowCard row={row} onChange={refresh} handle={handle} />
        )}
      />
    </div>
  );
}

function ReleaseRowCard({
  row,
  onChange,
  handle,
}: {
  row: Release;
  onChange: () => void;
  handle?: React.ReactNode;
}) {
  const [draft, setDraft] = useState(row);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    setDraft(row);
  }, [row]);

  const cover = preview ?? draft.cover;

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from("releases")
      .update({
        title: draft.title,
        release_type: draft.release_type,
        yandex_url: draft.yandex_url,
        spotify_url: draft.spotify_url,
        apple_url: draft.apple_url,
        vk_url: draft.vk_url,
        published: draft.published,
      })
      .eq("id", row.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Релиз сохранён");
      onChange();
    }
  }

  async function togglePublished() {
    const next = !draft.published;
    setDraft((d) => ({ ...d, published: next }));
    const { error } = await supabase.from("releases").update({ published: next }).eq("id", row.id);
    if (error) {
      toast.error(error.message);
      setDraft((d) => ({ ...d, published: !next }));
    } else {
      toast.success(next ? "Релиз опубликован" : "Релиз скрыт");
      onChange();
    }
  }

  async function uploadCover(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Выберите изображение");
      return;
    }
    setBusy(true);
    const localUrl = URL.createObjectURL(file);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${row.id}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("releases").upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
    });
    if (up.error) {
      setBusy(false);
      toast.error(up.error.message);
      return;
    }
    const old = row.cover_path;
    const { error } = await supabase.from("releases").update({ cover_path: path }).eq("id", row.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (old) await supabase.storage.from("releases").remove([old]);
    setPreview(localUrl);
    toast.success("Обложка обновлена");
    onChange();
  }

  async function removeRelease() {
    if (!confirm(`Удалить релиз «${row.title}»?`)) return;
    if (row.cover_path) await supabase.storage.from("releases").remove([row.cover_path]);
    const { error } = await supabase.from("releases").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Релиз удалён");
      onChange();
    }
  }

  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)]">
        <div>
          <div className="aspect-square w-full overflow-hidden rounded-xl border border-border bg-secondary/40">
            {cover ? (
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[0.55rem] tracking-[0.2em] text-muted-foreground">
                1000×1000
              </div>
            )}
          </div>
          <label className={`${ghostCls} mt-3 w-full cursor-pointer justify-center`}>
            <Upload size={14} /> ОБЛОЖКА
            <input
              type="file"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                uploadCover(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <div className="space-y-4">
          {handle && <div className="flex">{handle}</div>}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
            <div>
              <label className={labelCls}>НАЗВАНИЕ</label>
              <input
                className={inputCls}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>ТИП</label>
              <select
                className={inputCls}
                value={draft.release_type}
                onChange={(e) => setDraft({ ...draft, release_type: e.target.value })}
              >
                <option value="single">Сингл</option>
                <option value="album">Альбом</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {PLATFORMS.map((p) => (
              <div key={p.key}>
                <label className={`${labelCls} flex items-center gap-2`}>
                  <PlatformIcon platform={p.key} size={13} /> {p.label.toUpperCase()}
                </label>
                <input
                  className={inputCls}
                  placeholder="https://…"
                  value={(draft[p.field] as string | null) ?? ""}
                  onChange={(e) => setDraft({ ...draft, [p.field]: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className={btnCls} disabled={busy} onClick={save}>
              <Save size={14} /> {busy ? "СОХРАНЯЮ…" : "СОХРАНИТЬ"}
            </button>
            <button className={ghostCls} onClick={togglePublished}>
              {draft.published ? <Eye size={14} /> : <EyeOff size={14} />}
              {draft.published ? "ОПУБЛИКОВАН" : "СКРЫТ"}
            </button>
            <button
              className={`${ghostCls} ml-auto hover:border-destructive/40`}
              onClick={removeRelease}
            >
              <Trash2 size={14} /> УДАЛИТЬ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
