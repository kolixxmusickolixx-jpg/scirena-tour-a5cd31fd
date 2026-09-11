export const FONTS_CONFIG_KEY = "fonts_config";
export const FONT_URLS_KEY = "font_urls";

export type FontScope = "site" | "headings" | "body" | "buttons" | "nav" | "accent";

export const FONT_SCOPES: { id: FontScope; label: string; hint: string }[] = [
  { id: "site", label: "Весь сайт", hint: "Базовый шрифт всех текстов" },
  { id: "headings", label: "Заголовки", hint: "H1–H6 и крупные надписи" },
  { id: "body", label: "Основной текст", hint: "Абзацы и списки" },
  { id: "buttons", label: "Кнопки", hint: "Кнопки и ссылки-кнопки" },
  { id: "nav", label: "Навигация", hint: "Меню и шапка сайта" },
  { id: "accent", label: "Акцентный текст", hint: "Цитаты и выделения" },
];

export type CustomFont = {
  id: string;
  name: string;
  path: string;
  format: string;
};

export type FontsConfig = {
  custom: CustomFont[];
  scopes: Partial<Record<FontScope, string>>;
};

/** Fonts already available on the site. `family` is a full CSS font-family value. */
export const BUILT_IN_FONTS: { id: string; name: string; family: string }[] = [
  { id: "unbounded", name: "Unbounded", family: '"Unbounded", system-ui, sans-serif' },
  { id: "manrope", name: "Manrope", family: '"Manrope", system-ui, sans-serif' },
  { id: "system", name: "Системный", family: "system-ui, -apple-system, sans-serif" },
  { id: "georgia", name: "Georgia", family: 'Georgia, "Times New Roman", serif' },
  { id: "mono", name: "Моноширинный", family: 'ui-monospace, "Courier New", monospace' },
];

export const emptyFontsConfig = (): FontsConfig => ({ custom: [], scopes: {} });

export function parseFontsConfig(raw: string | undefined | null): FontsConfig {
  if (!raw) return emptyFontsConfig();
  try {
    const parsed = JSON.parse(raw) as Partial<FontsConfig>;
    return {
      custom: Array.isArray(parsed.custom) ? parsed.custom.filter((f) => f && f.id && f.path) : [],
      scopes: parsed.scopes && typeof parsed.scopes === "object" ? parsed.scopes : {},
    };
  } catch {
    return emptyFontsConfig();
  }
}

export const customFamily = (font: CustomFont) => `"scirena-${font.id}", sans-serif`;

export function formatFromName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "woff2") return "woff2";
  if (ext === "woff") return "woff";
  if (ext === "otf") return "opentype";
  return "truetype";
}

const SCOPE_SELECTORS: Record<FontScope, string> = {
  site: "body, input, textarea, select",
  headings: "h1, h2, h3, h4, h5, h6, .font-display, .rich-text h2, .rich-text h3, .rich-text h4",
  body: "p, li, span, div, .rich-text",
  buttons: "button, a[role='button'], .btn",
  nav: "nav, nav *, header a",
  accent: "blockquote, .rich-text blockquote, em, strong, .accent-text",
};

/** Builds @font-face rules plus scope overrides for the public site. */
export function buildFontCss(config: FontsConfig, urls: Record<string, string>): string {
  const faces = config.custom
    .map((f) => {
      const url = urls[f.path];
      if (!url) return "";
      return `@font-face{font-family:"scirena-${f.id}";src:url("${url}") format("${f.format}");font-display:swap;}`;
    })
    .join("");

  const resolve = (value: string | undefined) => {
    if (!value) return "";
    const custom = config.custom.find((f) => f.id === value);
    if (custom) return urls[custom.path] ? customFamily(custom) : "";
    return BUILT_IN_FONTS.find((f) => f.id === value)?.family ?? "";
  };

  let rules = "";
  const site = resolve(config.scopes.site);
  if (site) rules += `:root{--font-sans:${site};}${SCOPE_SELECTORS.site}{font-family:${site};}`;

  for (const scope of ["headings", "body", "buttons", "nav", "accent"] as FontScope[]) {
    const family = resolve(config.scopes[scope]);
    if (!family) continue;
    if (scope === "headings") rules += `:root{--font-display:${family};}`;
    rules += `${SCOPE_SELECTORS[scope]}{font-family:${family};}`;
  }

  return faces + rules;
}
