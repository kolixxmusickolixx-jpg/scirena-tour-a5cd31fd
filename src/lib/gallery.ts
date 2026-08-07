import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GalleryPhoto = {
  id: string;
  album_id: string;
  storage_path: string;
  sort_order: number;
  url: string;
};

export type GalleryAlbum = {
  id: string;
  title: string;
  date_label: string;
  sort_order: number;
  photos: GalleryPhoto[];
};

const SIGN_TTL = 60 * 60 * 24 * 30;

/** Ключи кэша. Публичная галерея и админские списки НИКОГДА не должны
 *  делить один ключ — формы данных у них разные. */
export const galleryKeys = {
  public: ["gallery", "public"] as const,
  adminAlbums: ["gallery", "admin", "albums"] as const,
  adminPhotos: (albumId: string) => ["gallery", "admin", "photos", albumId] as const,
};

export async function signPaths(paths: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const clean = (paths ?? []).filter((p): p is string => typeof p === "string" && p.length > 0);
  if (clean.length === 0) return map;
  const { data, error } = await supabase.storage.from("gallery").createSignedUrls(clean, SIGN_TTL);
  if (error) return map;
  for (const item of data ?? []) {
    if (item?.path && item?.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

/** Приводит любые входные данные к безопасной форме альбома. */
export function normalizeAlbum(input: unknown): GalleryAlbum | null {
  if (!input || typeof input !== "object") return null;
  const a = input as Partial<GalleryAlbum>;
  if (typeof a.id !== "string" || a.id.length === 0) return null;
  return {
    id: a.id,
    title: typeof a.title === "string" && a.title ? a.title : "Без названия",
    date_label: typeof a.date_label === "string" ? a.date_label : "",
    sort_order: typeof a.sort_order === "number" ? a.sort_order : 0,
    photos: Array.isArray(a.photos)
      ? a.photos.filter((p): p is GalleryPhoto => !!p && typeof p.url === "string" && p.url !== "")
      : [],
  };
}

export function normalizeAlbums(input: unknown): GalleryAlbum[] {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeAlbum).filter((a): a is GalleryAlbum => a !== null);
}

export function albumCover(album: GalleryAlbum | null | undefined): string | null {
  return album?.photos?.[0]?.url ?? null;
}

export async function fetchGallery(): Promise<GalleryAlbum[]> {
  const [albumsRes, photosRes] = await Promise.all([
    supabase.from("gallery_albums").select("id, title, date_label, sort_order").order("sort_order"),
    supabase
      .from("gallery_photos")
      .select("id, album_id, storage_path, sort_order")
      .order("sort_order"),
  ]);
  if (albumsRes.error) throw albumsRes.error;
  if (photosRes.error) throw photosRes.error;

  const photos = photosRes.data ?? [];
  const signed = await signPaths(photos.map((p) => p.storage_path));

  return (albumsRes.data ?? []).map((a) => ({
    id: a.id,
    title: a.title ?? "Без названия",
    date_label: a.date_label ?? "",
    sort_order: a.sort_order ?? 0,
    photos: photos
      .filter((p) => p.album_id === a.id)
      .map((p) => ({
        id: p.id,
        album_id: p.album_id,
        storage_path: p.storage_path,
        sort_order: p.sort_order ?? 0,
        url: signed[p.storage_path] ?? "",
      }))
      .filter((p) => p.url !== ""),
  }));
}

export const galleryQuery = queryOptions({
  queryKey: galleryKeys.public,
  queryFn: fetchGallery,
  staleTime: 5 * 60_000,
  select: normalizeAlbums,
});

/** Предзагрузка соседних фотографий (только ближайшие). */
export function preloadPhotos(urls: (string | undefined)[]) {
  if (typeof window === "undefined") return;
  for (const url of urls) {
    if (!url) continue;
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}

export async function downloadPhoto(url: string, filename: string) {
  if (!url) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}
