import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BUILT_IN_FONTS,
  FONTS_CONFIG_KEY,
  FONT_SCOPES,
  buildFontCss,
  customFamily,
  formatFromName,
  parseFontsConfig,
  type CustomFont,
  type FontScope,
  type FontsConfig,
} from "@/lib/fonts";

const labelCls = "mb-1.5 block text-[0.6rem] tracking-[0.22em] text-muted-foreground";
const inputCls =
  "w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-foreground/40 focus:bg-secondary/60";
const btnCls =
  "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[0.65rem] font-semibold tracking-[0.18em] text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50";
const ghostCls =
  "inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[0.65rem] tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground";
const cardCls = "glass rounded-2xl p-5 sm:p-6";

const FONT_MAX = 5 * 1024 * 1024;
const FONT_ACCEPT = ".woff2,.woff,.ttf,.otf";
const ALLOWED_EXT = ["woff2", "woff", "ttf", "otf"];

export function FontsTab() {
  const row = useQuery({
    queryKey: ["admin", "fonts-config"],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", FONTS_CONFIG_KEY)
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? "";
    },
  });

  const [config, setConfig] = useState<FontsConfig>({ custom: [], scopes: {} });
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (row.data !== undefined) setConfig(parseFontsConfig(row.data));
  }, [row.data]);

  // Signed URLs for previewing uploaded fonts inside the admin panel.
  useEffect(() => {
    let alive = true;
    const paths = config.custom.map((f) => f.path);
    if (!paths.length) {
      setUrls({});
      return;
    }
    supabase.storage
      .from("site-media")
      .createSignedUrls(paths, 60 * 60)
      .then(({ data }) => {
        if (!alive) return;
        const map: Record<string, string> = {};
        for (const item of data ?? []) if (item?.path && item?.signedUrl) map[item.path] = item.signedUrl;
        setUrls(map);
      });
    return () => {
      alive = false;
    };
  }, [config.custom]);

  async function save(next: FontsConfig) {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("site_content")
        .upsert({ key: FONTS_CONFIG_KEY, value: JSON.stringify(next) }, { onConflict: "key" });
      if (error) throw new Error(error.message);
      setConfig(next);
      await row.refetch();
      toast.success("Настройки шрифтов сохранены");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(ext)) {
      toast.error("Поддерживаются форматы WOFF2, WOFF, TTF и OTF");
      return;
    }
    if (file.size > FONT_MAX) {
      toast.error("Файл слишком большой — максимум 5 МБ");
      return;
    }
    setBusy(true);
    try {
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const path = `fonts/${id}.${ext}`;
      const { error } = await supabase.storage
        .from("site-media")
        .upload(path, file, { upsert: true, contentType: file.type || "font/woff2" });
      if (error) throw new Error(error.message);
      const font: CustomFont = {
        id,
        name: file.name.replace(/\.[^.]+$/, ""),
        path,
        format: formatFromName(file.name),
      };
      await save({ ...config, custom: [...config.custom, font] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить шрифт");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeFont(font: CustomFont) {
    if (!confirm(`Удалить шрифт «${font.name}»?`)) return;
    setBusy(true);
    try {
      await supabase.storage.from("site-media").remove([font.path]);
      const scopes = { ...config.scopes };
      for (const key of Object.keys(scopes) as FontScope[]) {
        if (scopes[key] === font.id) delete scopes[key];
      }
      await save({ custom: config.custom.filter((f) => f.id !== font.id), scopes });
    } finally {
      setBusy(false);
    }
  }

  const previewCss = buildFontCssPreview(config, urls);
  const options = [
    ...BUILT_IN_FONTS.map((f) => ({ id: f.id, name: `${f.name} — стандартный` })),
    ...config.custom.map((f) => ({ id: f.id, name: `${f.name} — загруженный` })),
  ];

  return (
    <div className="space-y-4">
      {previewCss && <style dangerouslySetInnerHTML={{ __html: previewCss }} />}

      <div className={`${cardCls} space-y-4`}>
        <div>
          <span className={labelCls}>ДОСТУПНЫЕ ШРИФТЫ</span>
          <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
            Стандартные шрифты уже подключены к сайту. Свои шрифты можно загрузить в форматах WOFF2,
            WOFF, TTF или OTF, до 5 МБ.
          </p>
        </div>

        <div className="space-y-2">
          {BUILT_IN_FONTS.map((f) => (
            <div key={f.id} className="rounded-2xl border border-border p-4">
              <p className="text-[0.6rem] tracking-[0.22em] text-muted-foreground">{f.name}</p>
              <p className="mt-1 text-lg" style={{ fontFamily: f.family }}>
                SCIRENA — Уезжаем остаёмся? 123
              </p>
            </div>
          ))}
          {config.custom.map((f) => (
            <div key={f.id} className="rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[0.6rem] tracking-[0.22em] text-muted-foreground">{f.name}</p>
                <button className={ghostCls} disabled={busy} onClick={() => void removeFont(f)}>
                  <Trash2 size={14} /> УДАЛИТЬ
                </button>
              </div>
              <p className="mt-1 text-lg" style={{ fontFamily: customFamily(f) }}>
                SCIRENA — Уезжаем остаёмся? 123
              </p>
            </div>
          ))}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept={FONT_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <button className={ghostCls} disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload size={14} /> {busy ? "ЗАГРУЖАЮ…" : "ЗАГРУЗИТЬ ШРИФТ"}
        </button>
      </div>

      <div className={`${cardCls} space-y-4`}>
        <div>
          <span className={labelCls}>ОБЛАСТИ ПРИМЕНЕНИЯ</span>
          <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
            Для каждой области можно выбрать свой шрифт. «По умолчанию» — оставить текущую типографику
            сайта.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {FONT_SCOPES.map((scope) => (
            <div key={scope.id}>
              <span className={labelCls}>{scope.label.toUpperCase()}</span>
              <select
                className={inputCls}
                value={config.scopes[scope.id] ?? ""}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    scopes: { ...config.scopes, [scope.id]: e.target.value },
                  })
                }
              >
                <option value="">По умолчанию</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[0.6rem] text-muted-foreground">{scope.hint}</p>
            </div>
          ))}
        </div>

        <button className={btnCls} disabled={saving} onClick={() => void save(config)}>
          <Save size={14} /> {saving ? "СОХРАНЯЮ…" : "СОХРАНИТЬ ШРИФТЫ"}
        </button>
      </div>
    </div>
  );
}

/** Only the @font-face rules — scope overrides must not affect the admin panel design. */
function buildFontCssPreview(config: FontsConfig, urls: Record<string, string>): string {
  return buildFontCss({ custom: config.custom, scopes: {} }, urls);
}
