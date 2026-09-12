import { useQuery } from "@tanstack/react-query";
import { siteQuery } from "@/lib/site-query";
import { FONTS_CONFIG_KEY, FONT_URLS_KEY, parseFontsConfig } from "@/lib/fonts";
import { MOBILE_LAYOUT_KEY, buildMobileLayoutCss, parseMobileLayout } from "@/lib/mobile-editor";

/** Applies per-element mobile overrides saved in the admin site editor. */
export function MobileLayout() {
  const { data } = useQuery(siteQuery);
  const content = data?.content ?? {};

  let urls: Record<string, string> = {};
  try {
    urls = content[FONT_URLS_KEY] ? (JSON.parse(content[FONT_URLS_KEY]) as Record<string, string>) : {};
  } catch {
    urls = {};
  }

  const css = buildMobileLayoutCss(
    parseMobileLayout(content[MOBILE_LAYOUT_KEY]),
    parseFontsConfig(content[FONTS_CONFIG_KEY]),
    urls,
  );
  if (!css) return null;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
