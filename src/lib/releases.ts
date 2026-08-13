import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReleaseRow = {
  id: string;
  title: string;
  release_type: string;
  cover_path: string | null;
  yandex_url: string | null;
  spotify_url: string | null;
  apple_url: string | null;
  vk_url: string | null;
  published: boolean;
  sort_order: number;
};

export type Release = ReleaseRow & { cover: string | null };

export type PlatformKey = "yandex" | "spotify" | "apple" | "vk";

export const PLATFORMS: { key: PlatformKey; field: keyof ReleaseRow; label: string }[] = [
  { key: "yandex", field: "yandex_url", label: "Яндекс Музыка" },
  { key: "spotify", field: "spotify_url", label: "Spotify" },
  { key: "apple", field: "apple_url", label: "Apple Music" },
  { key: "vk", field: "vk_url", label: "VK Музыка" },
];

const SIGN_TTL = 60 * 60 * 24 * 30;

export const releaseKeys = {
  public: ["releases", "public"] as const,
  admin: ["releases", "admin"] as const,
};

export function releaseTypeLabel(type: string) {
  return type === "album" ? "Альбом" : "Сингл";
}

export function releaseLinks(r: Release | ReleaseRow) {
  return PLATFORMS.map((p) => ({ ...p, url: (r[p.field] as string | null) ?? "" })).filter(
    (p) => typeof p.url === "string" && p.url.trim().length > 0,
  );
}

export async function signCovers(paths: (string | null)[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const clean = paths.filter((p): p is string => typeof p === "string" && p.length > 0);
  if (clean.length === 0) return map;
  const { data, error } = await supabase.storage.from("releases").createSignedUrls(clean, SIGN_TTL);
  if (error) return map;
  for (const item of data ?? []) {
    if (item?.path && item?.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

async function withCovers(rows: ReleaseRow[]): Promise<Release[]> {
  const signed = await signCovers(rows.map((r) => r.cover_path));
  return rows.map((r) => ({ ...r, cover: r.cover_path ? (signed[r.cover_path] ?? null) : null }));
}

const SELECT =
  "id, title, release_type, cover_path, yandex_url, spotify_url, apple_url, vk_url, published, sort_order";

export async function fetchPublicReleases(): Promise<Release[]> {
  const { data, error } = await supabase
    .from("releases")
    .select(SELECT)
    .eq("published", true)
    .order("sort_order");
  if (error) throw error;
  return withCovers((data ?? []) as ReleaseRow[]);
}

export async function fetchAdminReleases(): Promise<Release[]> {
  const { data, error } = await supabase.from("releases").select(SELECT).order("sort_order");
  if (error) throw error;
  return withCovers((data ?? []) as ReleaseRow[]);
}

export const releasesQuery = queryOptions({
  queryKey: releaseKeys.public,
  queryFn: fetchPublicReleases,
  staleTime: 5 * 60_000,
});
