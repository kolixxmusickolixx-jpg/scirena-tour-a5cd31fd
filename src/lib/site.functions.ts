import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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

  return {
    shows: showsRes.data ?? [],
    faq: faqRes.data ?? [],
    socials: socialsRes.data ?? [],
    content,
  };
});
