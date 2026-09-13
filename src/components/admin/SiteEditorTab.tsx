import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Save,
  RotateCcw,
  Smartphone,
  MousePointer2,
  Move,
  Scaling,
  SlidersHorizontal,
  X,
  Minus,
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
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
  type ElementPatch,
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
const FRAME_H = 560;

type MobileTool = "select" | "move" | "size" | "settings" | null;

const BASE_CSS = `
[data-edit-id]{cursor:pointer !important;}
[data-edit-id].__sc-selected{outline:2px solid #E8E8E8 !important;outline-offset:3px !important;}
html{scroll-behavior:auto !important;}
`;

export function SiteEditorTab() {
  const isMobile = useIsMobile();
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
  const [mobileTool, setMobileTool] = useState<MobileTool>(null);

  const frameRef = useRef<HTMLIFrameElement>(null);
  const layoutRef = useRef<MobileLayout>({});
  layoutRef.current = layout;
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;

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

  const patch = useCallback((id: string, next: ElementPatch) => {
    setLayout((prev) => {
      const merged = { ...prev[id], ...next } as Record<string, unknown>;
      for (const key of Object.keys(merged)) if (merged[key] === undefined) delete merged[key];
      return { ...prev, [id]: merged as ElementOverride };
    });
    setDirty(true);
  }, []);

  /** Nudges the selected element by 1px steps. */
  const nudge = useCallback(
    (dx: number, dy: number) => {
      const id = selectedRef.current;
      if (!id) return;
      const cur = layoutRef.current[id] ?? {};
      patch(id, { x: (cur.x ?? 0) + dx, y: (cur.y ?? 0) + dy });
    },
    [patch],
  );

  /** Press-and-hold repeats the nudge. */
  const holdRef = useRef<{ t: ReturnType<typeof setTimeout> | null; i: ReturnType<typeof setInterval> | null }>({
    t: null,
    i: null,
  });

  const stopHold = useCallback(() => {
    if (holdRef.current.t) clearTimeout(holdRef.current.t);
    if (holdRef.current.i) clearInterval(holdRef.current.i);
    holdRef.current = { t: null, i: null };
  }, []);

  const startHold = useCallback(
    (dx: number, dy: number) => {
      stopHold();
      nudge(dx, dy);
      holdRef.current.t = setTimeout(() => {
        holdRef.current.i = setInterval(() => nudge(dx, dy), 30);
      }, 350);
    },
    [nudge, stopHold],
  );

  useEffect(() => stopHold, [stopHold]);

  /** Wires tap-to-select inside the same-origin preview document. */
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

    // The public site injects its own saved mobile styles (also !important).
    // Blank them inside the preview so live edits are the single source of truth.
    const stripSaved = () => {
      doc.querySelectorAll("style").forEach((el) => {
        if (el.id.startsWith("__sc-editor")) return;
        if (el.textContent?.includes("data-edit-id")) el.textContent = "";
      });
    };
    stripSaved();
    new MutationObserver(stripSaved).observe(doc.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Never navigate away while editing.
    const block = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    doc.addEventListener("click", block, true);
    doc.addEventListener("submit", block, true);

    doc.addEventListener(
      "pointerdown",
      (e: PointerEvent) => {
        const el = (e.target as Element | null)?.closest?.("[data-edit-id]") as HTMLElement | null;
        if (!el) return;
        const editId = el.dataset["editId"];
        if (!editId) return;
        e.preventDefault();
        setSelected(editId);
      },
      true,
    );

    setReady(true);
  }, []);

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

  const arrowCls =
    "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-secondary/40 text-foreground transition-colors active:bg-secondary disabled:opacity-40";

  const holdProps = (dx: number, dy: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      startHold(dx, dy);
    },
    onPointerUp: stopHold,
    onPointerLeave: stopHold,
    onPointerCancel: stopHold,
    disabled: !selected,
    className: arrowCls,
    style: { touchAction: "none" as const },
  });

  const setMobileToolOpen = (tool: Exclude<MobileTool, null>) => {
    setMobileTool((currentTool) => (currentTool === tool ? null : tool));
  };

  if (isMobile) {
    const mobileArrowCls =
      "inline-flex h-12 w-12 touch-none items-center justify-center rounded-xl border border-border bg-secondary text-foreground transition-colors active:bg-foreground active:text-background disabled:opacity-35";
    const mobileHoldProps = (dx: number, dy: number) => ({
      ...holdProps(dx, dy),
      className: mobileArrowCls,
    });
    const mobileTools: {
      id: Exclude<MobileTool, null>;
      label: string;
      icon: typeof MousePointer2;
    }[] = [
      { id: "select", label: "Выбрать", icon: MousePointer2 },
      { id: "move", label: "Переместить", icon: Move },
      { id: "size", label: "Размер", icon: Scaling },
      { id: "settings", label: "Настройки", icon: SlidersHorizontal },
    ];

    return (
      <div className="fixed inset-0 z-[70] flex h-[100dvh] flex-col overflow-hidden bg-background">
        <header className="grid min-h-16 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/95 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Редактор сайта</p>
            <p className="truncate text-[0.55rem] text-muted-foreground">Мобильная версия</p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-[0.65rem] font-semibold text-primary-foreground disabled:opacity-45"
            disabled={saving || !dirty}
            onClick={() => void save()}
          >
            <Save size={14} /> {saving ? "Сохраняю…" : "Сохранить"}
          </button>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
          <iframe
            ref={frameRef}
            title="Мобильное превью сайта"
            src="/"
            onLoad={attach}
            className="h-full w-full border-0 bg-background"
          />

          {selected && (
            <div className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-md bg-primary px-2.5 py-1 text-[0.6rem] font-semibold text-primary-foreground shadow-lg">
              <span className="block truncate">{elementLabel(selected)}</span>
            </div>
          )}

          {mobileTool && (
            <section className="absolute inset-x-0 bottom-0 z-20 max-h-[65dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-card px-4 pb-4 pt-3 shadow-2xl">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
              <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selected ? elementLabel(selected) : "Элемент не выбран"}
                  </p>
                  <p className="mt-0.5 text-[0.6rem] text-muted-foreground">
                    {selected ? "Изменения видны сразу" : "Нажмите на элемент в preview"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Закрыть панель"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground"
                  onClick={() => setMobileTool(null)}
                >
                  <X size={16} />
                </button>
              </div>

              {mobileTool === "select" && (
                <label className="block">
                  <span className={labelCls}>ВЫБРАТЬ ЭЛЕМЕНТ</span>
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
                </label>
              )}

              {mobileTool === "move" && (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5">
                  <div className="min-w-0 space-y-2">
                    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                      <span className="text-xs text-muted-foreground">X</span>
                      <input
                        type="number"
                        className={inputCls}
                        disabled={!selected}
                        value={current.x ?? 0}
                        onChange={(e) => selected && patch(selected, { x: Number(e.target.value) })}
                      />
                    </div>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                      <span className="text-xs text-muted-foreground">Y</span>
                      <input
                        type="number"
                        className={inputCls}
                        disabled={!selected}
                        value={current.y ?? 0}
                        onChange={(e) => selected && patch(selected, { y: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid w-[9.75rem] grid-cols-3 gap-1.5">
                    <span />
                    <button aria-label="Вверх" {...mobileHoldProps(0, -1)}>
                      <ArrowUp size={18} />
                    </button>
                    <span />
                    <button aria-label="Влево" {...mobileHoldProps(-1, 0)}>
                      <ArrowLeft size={18} />
                    </button>
                    <span className="grid place-items-center text-[0.55rem] text-muted-foreground">1 PX</span>
                    <button aria-label="Вправо" {...mobileHoldProps(1, 0)}>
                      <ArrowRight size={18} />
                    </button>
                    <span />
                    <button aria-label="Вниз" {...mobileHoldProps(0, 1)}>
                      <ArrowDown size={18} />
                    </button>
                  </div>
                </div>
              )}

              {mobileTool === "size" && (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className={labelCls}>РАЗМЕР ШРИФТА</span>
                    <span className="text-sm tabular-nums text-foreground">{current.fontSize ?? 16} px</span>
                  </div>
                  <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-3">
                    <button
                      type="button"
                      aria-label="Уменьшить размер"
                      className={mobileArrowCls}
                      disabled={!selected || (current.fontSize ?? 16) <= 8}
                      onClick={() => selected && patch(selected, { fontSize: Math.max(8, (current.fontSize ?? 16) - 1) })}
                    >
                      <Minus size={17} />
                    </button>
                    <input
                      type="range"
                      min={8}
                      max={120}
                      step={1}
                      disabled={!selected}
                      value={current.fontSize ?? 16}
                      onChange={(e) => selected && patch(selected, { fontSize: Number(e.target.value) })}
                      className="w-full accent-foreground"
                    />
                    <button
                      type="button"
                      aria-label="Увеличить размер"
                      className={mobileArrowCls}
                      disabled={!selected || (current.fontSize ?? 16) >= 120}
                      onClick={() => selected && patch(selected, { fontSize: Math.min(120, (current.fontSize ?? 16) + 1) })}
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                </div>
              )}

              {mobileTool === "settings" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block min-w-0">
                      <span className={labelCls}>X (PX)</span>
                      <input
                        type="number"
                        className={inputCls}
                        disabled={!selected}
                        value={current.x ?? 0}
                        onChange={(e) => selected && patch(selected, { x: Number(e.target.value) })}
                      />
                    </label>
                    <label className="block min-w-0">
                      <span className={labelCls}>Y (PX)</span>
                      <input
                        type="number"
                        className={inputCls}
                        disabled={!selected}
                        value={current.y ?? 0}
                        onChange={(e) => selected && patch(selected, { y: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className={labelCls}>ШРИФТ</span>
                    <select
                      className={inputCls}
                      disabled={!selected}
                      value={current.fontId ?? ""}
                      onChange={(e) => selected && patch(selected, { fontId: e.target.value || undefined })}
                    >
                      <option value="">По умолчанию</option>
                      {fontOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelCls}>РАЗМЕР ШРИФТА: {current.fontSize ?? 16} PX</span>
                    <input
                      type="range"
                      min={8}
                      max={120}
                      step={1}
                      disabled={!selected}
                      value={current.fontSize ?? 16}
                      onChange={(e) => selected && patch(selected, { fontSize: Number(e.target.value) })}
                      className="w-full accent-foreground"
                    />
                  </label>
                  <button
                    type="button"
                    className={`${ghostCls} w-full justify-center`}
                    disabled={!selected}
                    onClick={resetSelected}
                  >
                    <RotateCcw size={14} /> СБРОСИТЬ ЭЛЕМЕНТ
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        <nav className="grid shrink-0 grid-cols-4 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
          {mobileTools.map(({ id, label, icon: Icon }) => {
            const active = mobileTool === id;
            return (
              <button
                key={id}
                type="button"
                className={`flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-1 px-1 text-[0.55rem] transition-colors ${
                  active ? "bg-secondary text-foreground" : "text-muted-foreground"
                }`}
                onClick={() => setMobileToolOpen(id)}
              >
                <Icon size={18} />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`${cardCls} space-y-3`}>
        <div className="flex items-center gap-2 text-[0.6rem] tracking-[0.22em] text-muted-foreground">
          <Smartphone size={14} /> ПРЕВЬЮ {FRAME_W} × {FRAME_H}
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
          />
        </div>
        <p className="text-[0.6rem] leading-relaxed text-muted-foreground">
          Нажмите на элемент в превью, чтобы выбрать его. Изменения видны сразу; кнопка «Сохранить»
          записывает их в базу. Настройки применяются только к мобильной версии сайта.
        </p>
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

        <div className="flex flex-wrap items-center gap-5">
          <div>
            <span className={labelCls}>ПЕРЕМЕЩЕНИЕ (ШАГ 1 PX)</span>
            <div className="grid w-[9.5rem] grid-cols-3 gap-1.5">
              <span />
              <button aria-label="Вверх" {...holdProps(0, -1)}>
                <ArrowUp size={16} />
              </button>
              <span />
              <button aria-label="Влево" {...holdProps(-1, 0)}>
                <ArrowLeft size={16} />
              </button>
              <span />
              <button aria-label="Вправо" {...holdProps(1, 0)}>
                <ArrowRight size={16} />
              </button>
              <span />
              <button aria-label="Вниз" {...holdProps(0, 1)}>
                <ArrowDown size={16} />
              </button>
              <span />
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-3 min-w-[12rem]">
            <div>
              <span className={labelCls}>X (PX)</span>
              <input
                type="number"
                className={inputCls}
                disabled={!selected}
                value={current.x ?? 0}
                onChange={(e) => selected && patch(selected, { x: Number(e.target.value) })}
              />
            </div>
            <div>
              <span className={labelCls}>Y (PX)</span>
              <input
                type="number"
                className={inputCls}
                disabled={!selected}
                value={current.y ?? 0}
                onChange={(e) => selected && patch(selected, { y: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={labelCls}>
              РАЗМЕР ШРИФТА{current.fontSize ? `: ${current.fontSize}px` : ""}
            </span>
            <input
              type="range"
              min={8}
              max={120}
              step={1}
              disabled={!selected}
              value={current.fontSize ?? 16}
              onChange={(e) => selected && patch(selected, { fontSize: Number(e.target.value) })}
              className="w-full accent-foreground"
            />
            <button
              className="mt-1 text-[0.6rem] tracking-[0.2em] text-muted-foreground underline"
              disabled={!selected}
              onClick={() => selected && patch(selected, { fontSize: undefined })}
            >
              СБРОСИТЬ РАЗМЕР
            </button>
          </div>

          <div>
            <span className={labelCls}>ШРИФТ</span>
            <select
              className={inputCls}
              disabled={!selected}
              value={current.fontId ?? ""}
              onChange={(e) => selected && patch(selected, { fontId: e.target.value || undefined })}
            >
              <option value="">По умолчанию</option>
              {fontOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className={btnCls} disabled={saving || !dirty} onClick={() => void save()}>
            <Save size={14} /> {saving ? "СОХРАНЯЮ…" : "СОХРАНИТЬ"}
          </button>
          <button className={ghostCls} disabled={!selected} onClick={resetSelected}>
            <RotateCcw size={14} /> СБРОСИТЬ ЭЛЕМЕНТ
          </button>
          <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground">
            {selected ? elementLabel(selected) : "ЭЛЕМЕНТ НЕ ВЫБРАН"} · НАСТРОЕНО: {touched.length}
            {dirty ? " · ЕСТЬ НЕСОХРАНЁННЫЕ ИЗМЕНЕНИЯ" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
