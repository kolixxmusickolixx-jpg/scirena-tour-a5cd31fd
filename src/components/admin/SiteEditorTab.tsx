import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, RotateCcw, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BUILT_IN_FONTS,
  FONTS_CONFIG_KEY,
  emptyFontsConfig,
  parseFontsConfig,
  type FontsConfig,
} from "@/lib/fonts";
import {
  MOBILE_LAYOUT_KEY,
  EDITABLE_ELEMENTS,
  elementLabel,
  elementRules,
  fontFaceCss,
  parseMobileLayout,
  type ElementOverride,
  type MobileLayout,
} from "@/lib/mobile-editor";

const labelCls = "mb-1.5 block text-[0.6rem] tracking-[0.22em] text-muted-foreground";
const inputCls =
  "w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-foreground/40 focus:bg-secondary/60";
const btnCls =
  "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[0.65rem] font-semibold tracking-[0.18em] text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50";
const ghostCls =
  "inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[0.65rem] tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground";
const cardCls = "glass rounded-2xl p-5 sm:p-6";

const FRAME_W = 390;
const FRAME_H = 760;

const BASE_CSS = `
[data-edit-id]{cursor:grab !important;}
[data-edit-id].__sc-selected{outline:2px solid #E8E8E8 !important;outline-offset:3px !important;}
html{scroll-behavior:auto !important;}
`;

export function SiteEditorTab() {
  const layoutRow = useQuery({
    queryKey: ["admin", "mobile-layout"],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", MOBILE_LAYOUT_KEY)
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? "";
    },
  });

  const fontsRow = useQuery({
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

  const [layout, setLayout] = useState<MobileLayout>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fonts, setFonts] = useState<FontsConfig>(emptyFontsConfig());
  const [fontUrls, setFontUrls] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  const frameRef = useRef<HTMLIFrameElement>(null);
  const layoutRef = useRef<MobileLayout>({});
  layoutRef.current = layout;

  useEffect(() => {
    if (layoutRow.data !== undefined) setLayout(parseMobileLayout(layoutRow.data));
  }, [layoutRow.data]);

  useEffect(() => {
    if (fontsRow.data !== undefined) setFonts(parseFontsConfig(fontsRow.data));
  }, [fontsRow.data]);

  // Signed URLs so uploaded fonts render inside the preview.
  useEffect(() => {
    let alive = true;
    const paths = fonts.custom.map((f) => f.path);
    if (!paths.length) {
      setFontUrls({});
      return;
    }
    supabase.storage
      .from("site-media")
      .createSignedUrls(paths, 60 * 60)
      .then(({ data }) => {
        if (!alive) return;
        const map: Record<string, string> = {};
        for (const item of data ?? []) if (item?.path && item?.signedUrl) map[item.path] = item.signedUrl;
        setFontUrls(map);
      });
    return () => {
      alive = false;
    };
  }, [fonts.custom]);

  const patch = useCallback((id: string, next: ElementOverride) => {
    setLayout((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));
    setDirty(true);
  }, []);

  /** Wires selection + touch dragging inside the same-origin preview document. */
  const attach = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;

    const base = doc.createElement("style");
    base.id = "__sc-editor-base";
    base.textContent = BASE_CSS;
    doc.head.appendChild(base);

    const overrides = doc.createElement("style");
    overrides.id = "__sc-editor-overrides";
    doc.head.appendChild(overrides);

    // Never navigate away while editing.
    const block = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    doc.addEventListener("click", block, true);
    doc.addEventListener("submit", block, true);

    let dragId: string | null = null;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;

    doc.addEventListener(
      "pointerdown",
      (e: PointerEvent) => {
        const el = (e.target as Element | null)?.closest?.("[data-edit-id]") as HTMLElement | null;
        if (!el) return;
        const id = el.dataset["editId"]!;
        e.preventDefault();
        setSelected(id);
        dragId = id;
        startX = e.clientX;
        startY = e.clientY;
        const current = layoutRef.current[id] ?? {};
        originX = current.x ?? 0;
        originY = current.y ?? 0;
      },
      true,
    );

    doc.addEventListener(
      "pointermove",
      (e: PointerEvent) => {
        if (!dragId) return;
        e.preventDefault();
        patch(dragId, {
          x: Math.round(originX + (e.clientX - startX)),
          y: Math.round(originY + (e.clientY - startY)),
        });
      },
      true,
    );

    const end = () => {
      dragId = null;
    };
    doc.addEventListener("pointerup", end, true);
    doc.addEventListener("pointercancel", end, true);

    setReady(true);
  }, [patch]);

  // Push live overrides + selection outline into the preview document.
  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (!ready || !doc) return;
    const styleEl = doc.getElementById("__sc-editor-overrides");
    if (styleEl) {
      const rules = Object.entries(layout)
        .map(([id, o]) => elementRules(id, o ?? {}, fonts, fontUrls))
        .join("");
      styleEl.textContent = fontFaceCss(fonts, fontUrls) + rules;
    }
    doc.querySelectorAll("[data-edit-id].__sc-selected").forEach((el) => {
      el.classList.remove("__sc-selected");
    });
    if (selected) {
      doc.querySelector(`[data-edit-id="${selected}"]`)?.classList.add("__sc-selected");
    }
  }, [layout, selected, fonts, fontUrls, ready]);

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("site_content")
        .upsert({ key: MOBILE_LAYOUT_KEY, value: JSON.stringify(layout) }, { onConflict: "key" });
      if (error) throw new Error(error.message);
      await layoutRow.refetch();
      setDirty(false);
      toast.success("Настройки мобильной версии сохранены");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  function resetSelected() {
    if (!selected) return;
    setLayout((prev) => {
      const next = { ...prev };
      delete next[selected];
      return next;
    });
    setDirty(true);
  }

  const current: ElementOverride = (selected && layout[selected]) || {};
  const fontOptions = [
    ...BUILT_IN_FONTS.map((f) => ({ id: f.id, name: `${f.name} — стандартный` })),
    ...fonts.custom.map((f) => ({ id: f.id, name: `${f.name} — загруженный` })),
  ];
  const touched = Object.keys(layout).filter((id) => Object.keys(layout[id] ?? {}).length > 0);

  return (
    <div className="space-y-4">
      <div className={`${cardCls} space-y-2`}>
        <span className={labelCls}>МОБИЛЬНАЯ ВЕРСИЯ</span>
        <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
          Нажмите на элемент в превью, чтобы выделить его, и перетащите пальцем. Ниже можно задать
          размер и шрифт текста, а также точные координаты. Настройки применяются только к мобильной
          версии сайта — вид на компьютере не меняется.
        </p>
      </div>

      <div className={`${cardCls} space-y-3`}>
        <div className="flex items-center gap-2 text-[0.6rem] tracking-[0.22em] text-muted-foreground">
          <Smartphone size={14} /> ПРЕВЬЮ 390 × 760
        </div>
        <div className="flex justify-center overflow-hidden rounded-3xl border border-border bg-black/40 p-3">
          <iframe
            ref={frameRef}
            title="Мобильное превью сайта"
            src="/"
            onLoad={attach}
            width={FRAME_W}
            height={FRAME_H}
            className="max-w-full rounded-2xl border-0 bg-black"
            style={{ touchAction: "none" }}
          />
        </div>
      </div>

      <div className={`${cardCls} space-y-4`}>
        <div>
          <span className={labelCls}>ВЫБРАННЫЙ ЭЛЕМЕНТ</span>
          <select
            className={inputCls}
            value={selected ?? ""}
            onChange={(e) => setSelected(e.target.value || null)}
          >
            <option value="">— не выбран —</option>
            {EDITABLE_ELEMENTS.map((el) => (
              <option key={el.id} value={el.id}>
                {el.label}
              </option>
            ))}
          </select>
        </div>

        {selected ? (
          <>
            <p className="text-[0.65rem] text-muted-foreground">{elementLabel(selected)}</p>

            <div>
              <span className={labelCls}>РАЗМЕР ШРИФТА{current.fontSize ? `: ${current.fontSize}px` : ""}</span>
              <input
                type="range"
                min={8}
                max={120}
                step={1}
                value={current.fontSize ?? 16}
                onChange={(e) => patch(selected, { fontSize: Number(e.target.value) })}
                className="w-full accent-foreground"
              />
              <button
                className="mt-2 text-[0.6rem] tracking-[0.2em] text-muted-foreground underline"
                onClick={() => patch(selected, { fontSize: undefined })}
              >
                СБРОСИТЬ РАЗМЕР
              </button>
            </div>

            <div>
              <span className={labelCls}>ШРИФТ</span>
              <select
                className={inputCls}
                value={current.fontId ?? ""}
                onChange={(e) => patch(selected, { fontId: e.target.value || undefined })}
              >
                <option value="">По умолчанию</option>
                {fontOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className={labelCls}>ПОЗИЦИЯ X (PX)</span>
                <input
                  type="number"
                  className={inputCls}
                  value={current.x ?? 0}
                  onChange={(e) => patch(selected, { x: Number(e.target.value) })}
                />
              </div>
              <div>
                <span className={labelCls}>ПОЗИЦИЯ Y (PX)</span>
                <input
                  type="number"
                  className={inputCls}
                  value={current.y ?? 0}
                  onChange={(e) => patch(selected, { y: Number(e.target.value) })}
                />
              </div>
            </div>

            <button className={ghostCls} onClick={resetSelected}>
              <RotateCcw size={14} /> СБРОСИТЬ ЭЛЕМЕНТ
            </button>
          </>
        ) : (
          <p className="text-[0.65rem] text-muted-foreground">
            Нажмите на элемент в превью или выберите его из списка.
          </p>
        )}
      </div>

      <div className={`${cardCls} flex flex-wrap items-center gap-3`}>
        <button className={btnCls} disabled={saving || !dirty} onClick={() => void save()}>
          <Save size={14} /> {saving ? "СОХРАНЯЮ…" : "СОХРАНИТЬ"}
        </button>
        <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground">
          НАСТРОЕНО ЭЛЕМЕНТОВ: {touched.length}
          {dirty ? " · ЕСТЬ НЕСОХРАНЁННЫЕ ИЗМЕНЕНИЯ" : ""}
        </span>
      </div>
    </div>
  );
}
