import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 focus:bg-secondary/60";
const labelCls = "mb-1.5 block text-[0.6rem] tracking-[0.22em] text-muted-foreground";
const btnCls =
  "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[0.65rem] font-semibold tracking-[0.18em] text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50";
const ghostCls =
  "inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[0.65rem] tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground";
const cardCls = "glass rounded-2xl p-5 sm:p-6";

export const SYSTEM_KEYS = [
  "maintenance_mode",
  "hero_media",
  "hero_image_path",
  "hero_video_path",
] as const;

const PHOTO_MAX = 8 * 1024 * 1024;
const VIDEO_MAX = 50 * 1024 * 1024;

type Values = Record<string, string>;

async function setValue(key: string, value: string) {
  const { error } = await supabase.from("site_content").update({ value }).eq("key", key);
  if (error) throw new Error(error.message);
}

function Toggle({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-secondary/40 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded-lg px-4 py-2 text-[0.65rem] font-semibold tracking-[0.18em] transition-colors ${
            value === o.v
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function SystemTab() {
  const rows = useQuery({
    queryKey: ["admin", "system-content"],
    queryFn: async (): Promise<Values> => {
      const { data, error } = await supabase.from("site_content").select("key, value");
      if (error) throw error;
      const map: Values = {};
      for (const r of data ?? []) map[r.key] = r.value;
      return map;
    },
  });

  const [draft, setDraft] = useState<Values>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (rows.data) setDraft(rows.data);
  }, [rows.data]);

  const heroMedia = draft["hero_media"] ?? "photo";

  async function saveAll() {
    setSaving(true);
    try {
      for (const key of SYSTEM_KEYS) {
        const value = draft[key] ?? "";
        if (value === (rows.data?.[key] ?? "")) continue;
        await setValue(key, value);
      }
      toast.success("Настройки сохранены");
      await rows.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className={`${cardCls} space-y-3`}>
        <span className={labelCls}>ТЕХНИЧЕСКИЕ РАБОТЫ</span>
        <Toggle
          value={draft["maintenance_mode"] ?? "off"}
          options={[
            { v: "off", l: "ВЫКЛ" },
            { v: "on", l: "ВКЛ" },
          ]}
          onChange={(v) => setDraft({ ...draft, maintenance_mode: v })}
        />
        <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
          При включении обычные посетители видят заглушку. Вошедшие в админ-панель видят сайт как
          обычно.
        </p>
      </div>

      <div className={`${cardCls} space-y-5`}>
        <div className="space-y-3">
          <span className={labelCls}>ФОН ГЛАВНОГО ЭКРАНА</span>
          <Toggle
            value={heroMedia}
            options={[
              { v: "photo", l: "ФОТО" },
              { v: "video", l: "ВИДЕО" },
            ]}
            onChange={(v) => setDraft({ ...draft, hero_media: v })}
          />
        </div>

        <MediaUploader
          title="ФОТО ФОНА"
          kind="image"
          maxBytes={PHOTO_MAX}
          recommendation="Рекомендуем: 2560 × 1440 px (или вертикально 1440 × 2160 px), формат JPG или WebP, вес до 8 МБ."
          path={draft["hero_image_path"] ?? ""}
          onChange={(p) => setDraft({ ...draft, hero_image_path: p })}
        />

        <MediaUploader
          title="ВИДЕО ФОНА"
          kind="video"
          maxBytes={VIDEO_MAX}
          recommendation="Рекомендуем: 1920 × 1080 px, MP4 (H.264), 24–30 кадров/с, длительность 10–30 сек, вес до 50 МБ (лучше 8–15 МБ для быстрой загрузки)."
          path={draft["hero_video_path"] ?? ""}
          onChange={(p) => setDraft({ ...draft, hero_video_path: p })}
        />

        <button className={btnCls} disabled={saving} onClick={saveAll}>
          <Save size={14} /> {saving ? "СОХРАНЯЮ…" : "СОХРАНИТЬ НАСТРОЙКИ"}
        </button>
      </div>
    </div>
  );
}

function MediaUploader({
  title,
  kind,
  maxBytes,
  recommendation,
  path,
  onChange,
}: {
  title: string;
  kind: "image" | "video";
  maxBytes: number;
  recommendation: string;
  path: string;
  onChange: (path: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    let alive = true;
    if (!path) {
      setPreview("");
      return;
    }
    supabase.storage
      .from("site-media")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (alive) setPreview(data?.signedUrl ?? "");
      });
    return () => {
      alive = false;
    };
  }, [path]);

  async function upload(file: File) {
    if (file.size > maxBytes) {
      toast.error(`Файл слишком большой — максимум ${Math.round(maxBytes / 1024 / 1024)} МБ`);
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || (kind === "video" ? "mp4" : "jpg");
      const key = `hero/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("site-media")
        .upload(key, file, { upsert: true, contentType: file.type });
      if (error) throw new Error(error.message);
      onChange(key);
      toast.success("Файл загружен — не забудьте сохранить настройки");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить файл");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-border p-4">
      <span className={labelCls}>{title}</span>
      <p className="mb-3 text-[0.65rem] leading-relaxed text-muted-foreground">{recommendation}</p>

      {preview ? (
        <div className="mb-3 overflow-hidden rounded-xl border border-border">
          {kind === "video" ? (
            <video src={preview} controls muted className="h-44 w-full object-cover" />
          ) : (
            <img src={preview} alt="" className="h-44 w-full object-cover" />
          )}
        </div>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">Файл не загружен — используется файл по умолчанию.</p>
      )}

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button className={ghostCls} disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload size={14} /> {busy ? "ЗАГРУЖАЮ…" : "ЗАГРУЗИТЬ"}
        </button>
        {path && (
          <button
            className={ghostCls}
            disabled={busy}
            onClick={async () => {
              if (!confirm("Удалить файл?")) return;
              setBusy(true);
              await supabase.storage.from("site-media").remove([path]);
              onChange("");
              setBusy(false);
              toast.success("Файл удалён — не забудьте сохранить настройки");
            }}
          >
            <Trash2 size={14} /> УДАЛИТЬ
          </button>
        )}
      </div>
      <input className={`${inputCls} mt-3 hidden`} value={path} readOnly />
    </div>
  );
}
