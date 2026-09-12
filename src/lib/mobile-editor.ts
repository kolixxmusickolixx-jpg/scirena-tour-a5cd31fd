import { BUILT_IN_FONTS, customFamily, type FontsConfig } from "./fonts";

/** site_content key holding per-element mobile overrides. */
export const MOBILE_LAYOUT_KEY = "mobile_layout";

export type ElementOverride = {
  x?: number;
  y?: number;
  fontSize?: number;
  fontId?: string;
};

export type MobileLayout = Record<string, ElementOverride>;

/** Elements that can be selected in the mobile editor. */
export const EDITABLE_ELEMENTS: { id: string; label: string }[] = [
  { id: "nav_logo", label: "Логотип SCIRENA" },
  { id: "nav_tickets", label: "Кнопка «Билеты» в шапке" },
  { id: "hero_artist", label: "Надпись над заголовком" },
  { id: "hero_title", label: "Главный заголовок" },
  { id: "hero_tour_label", label: "Подпись тура" },
  { id: "hero_buy", label: "Кнопка «Купить билет»" },
  { id: "hero_cities", label: "Кнопка «Все города»" },
  { id: "hero_note", label: "Примечание в Hero" },
  { id: "cities_kicker", label: "Надкоголовок «Города тура»" },
  { id: "cities_title", label: "Заголовок «Города тура»" },
  { id: "bio_kicker", label: "Надзаголовок «Биография»" },
  { id: "bio_title", label: "Заголовок «Биография»" },
  { id: "faq_kicker", label: "Надзаголовок FAQ" },
  { id: "faq_title", label: "Заголовок FAQ" },
  { id: "footer_logo", label: "Большая надпись SCIRENA в подвале" },
];

export const elementLabel = (id: string) =>
  EDITABLE_ELEMENTS.find((e) => e.id === id)?.label ?? id;

export function parseMobileLayout(raw: string | null | undefined): MobileLayout {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as MobileLayout;
  } catch {
    return {};
  }
}

/** Resolves a font id (built-in or uploaded) to a CSS font-family value. */
export function resolveFontFamily(
  fontId: string | undefined,
  fonts: FontsConfig,
  urls: Record<string, string>,
): string {
  if (!fontId) return "";
  const custom = fonts.custom.find((f) => f.id === fontId);
  if (custom) return urls[custom.path] ? customFamily(custom) : "";
  return BUILT_IN_FONTS.find((f) => f.id === fontId)?.family ?? "";
}

export function fontFaceCss(fonts: FontsConfig, urls: Record<string, string>): string {
  return fonts.custom
    .map((f) => {
      const url = urls[f.path];
      if (!url) return "";
      return `@font-face{font-family:"scirena-${f.id}";src:url("${url}") format("${f.format}");font-display:swap;}`;
    })
    .join("");
}

/** Rules for one element — used both on the public site and in the live preview. */
export function elementRules(
  id: string,
  o: ElementOverride,
  fonts: FontsConfig,
  urls: Record<string, string>,
): string {
  const decls: string[] = [];
  const x = o.x ?? 0;
  const y = o.y ?? 0;
  if (x !== 0 || y !== 0) decls.push(`transform:translate(${x}px,${y}px) !important`);
  if (o.fontSize) decls.push(`font-size:${o.fontSize}px !important`);
  const family = resolveFontFamily(o.fontId, fonts, urls);
  if (family) decls.push(`font-family:${family} !important`);
  if (!decls.length) return "";
  return `[data-edit-id="${id}"]{${decls.join(";")};}`;
}

/** Full mobile-only stylesheet for the public site. */
export function buildMobileLayoutCss(
  layout: MobileLayout,
  fonts: FontsConfig,
  urls: Record<string, string>,
): string {
  const rules = Object.entries(layout)
    .map(([id, o]) => elementRules(id, o ?? {}, fonts, urls))
    .join("");
  if (!rules) return "";
  return `@media (max-width:767px){${rules}}`;
}
