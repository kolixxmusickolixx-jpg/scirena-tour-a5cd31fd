import { useQuery } from "@tanstack/react-query";
import { siteQuery } from "@/lib/site-query";
import { FONTS_CONFIG_KEY, FONT_URLS_KEY, buildFontCss, parseFontsConfig } from "@/lib/fonts";

/** Injects custom @font-face rules and per-scope font overrides on the public site. */
export function SiteFonts() {
  const { data } = useQuery(siteQuery);
  const content = data?.content ?? {};
  const config = parseFontsConfig(content[FONTS_CONFIG_KEY]);

  let urls: Record<string, string> = {};
  try {
    urls = content[FONT_URLS_KEY] ? (JSON.parse(content[FONT_URLS_KEY]) as Record<string, string>) : {};
  } catch {
    urls = {};
  }

  const css = buildFontCss(config, urls);
  if (!css) return null;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
