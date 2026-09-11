import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { FONTS_CONFIG_KEY, FONT_URLS_KEY, parseFontsConfig } from "./fonts";

export type SiteShow = {
  id: string;
  city: string;
  venue: string;
  date_label: string;
  day_label: string;
  status: string;
  ticket_url: string;
  sort_order: number;
};

export type SiteFaq = { id: string; question: string; answer: string; sort_order: number };
export type SiteSocial = { id: string; label: string; url: string; sort_order: number };

export type SiteData = {
  shows: SiteShow[];
  faq: SiteFaq[];
  socials: SiteSocial[];
  content: Record<string, string>;
};

export const getSiteData = createServerFn({ method: "GET" }).handler(async (): Promise<SiteData> => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });

  const [showsRes, faqRes, socialsRes, contentRes] = await Promise.all([
    supabase
      .from("shows")
      .select("id, city, venue, date_label, day_label, status, ticket_url, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("faq_items")
      .select("id, question, answer, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("social_links")
      .select("id, label, url, sort_order")
      .order("sort_order", { ascending: true }),
    supabase.from("site_content").select("key, value"),
  ]);

  const content: Record<string, string> = {};
  for (const row of contentRes.data ?? []) content[row.key] = row.value;

  const fontsConfig = parseFontsConfig(content[FONTS_CONFIG_KEY]);
  const fontPaths = fontsConfig.custom.map((f) => f.path).filter(Boolean);

  const mediaPaths = [
    content["hero_image_path"],
    content["hero_video_path"],
    ...fontPaths,
  ].filter((p): p is string => typeof p === "string" && p.length > 0);
  if (mediaPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("site-media")
      .createSignedUrls(mediaPaths, 60 * 60 * 24 * 7);
    const map: Record<string, string> = {};
    for (const item of signed ?? []) {
      if (item?.path && item?.signedUrl) map[item.path] = item.signedUrl;
    }
    if (content["hero_image_path"]) content["hero_image_url"] = map[content["hero_image_path"]] ?? "";
    if (content["hero_video_path"]) content["hero_video_url"] = map[content["hero_video_path"]] ?? "";
  }


  return {
    shows: showsRes.data ?? [],
    faq: faqRes.data ?? [],
    socials: socialsRes.data ?? [],
    content,
  };
});
