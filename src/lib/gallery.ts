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

export async function signPaths(paths: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  if (paths.length === 0) return map;
  const { data } = await supabase.storage.from("gallery").createSignedUrls(paths, SIGN_TTL);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
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
    ...a,
    photos: photos
      .filter((p) => p.album_id === a.id)
      .map((p) => ({ ...p, url: signed[p.storage_path] ?? "" })),
  }));
}

export async function downloadPhoto(url: string, filename: string) {
  try {
    const res = await fetch(url);
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
