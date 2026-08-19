import { supabase } from "@/integrations/supabase/client";

export type ActivityRow = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action: string;
  entity: string;
  object_id: string;
  object_label: string;
  created_at: string;
};

export const ACTION_LABELS: Record<string, string> = {
  login: "Вход в панель",
  logout: "Выход из панели",
  create: "Создание",
  update: "Изменение",
  delete: "Удаление",
  admin_create: "Добавлен администратор",
  admin_delete: "Удалён администратор",
  admin_role: "Изменена роль",
  admin_activate: "Активирован администратор",
  admin_deactivate: "Деактивирован администратор",
  admin_password_reset: "Сброс пароля",
  profile_update: "Обновление профиля",
};

export const ENTITY_LABELS: Record<string, string> = {
  auth: "Авторизация",
  shows: "Концерты",
  faq_items: "FAQ",
  social_links: "Ссылки",
  site_content: "Тексты",
  releases: "Релизы",
  gallery_albums: "Альбомы",
  gallery_photos: "Фотографии",
  media_items: "Медиа",
  admin_users: "Администраторы",
};

export const actionLabel = (a: string) => ACTION_LABELS[a] ?? a;
export const entityLabel = (e: string) => ENTITY_LABELS[e] ?? e || "—";

export const ACTION_GROUPS = [
  { id: "all", label: "Все действия" },
  { id: "auth", label: "Входы и выходы" },
  { id: "content", label: "Контент" },
  { id: "admins", label: "Администраторы" },
];

export function matchesGroup(row: ActivityRow, group: string) {
  if (group === "all") return true;
  if (group === "auth") return row.action === "login" || row.action === "logout";
  if (group === "admins") return row.entity === "admin_users" || row.action.startsWith("admin_");
  return ["create", "update", "delete"].includes(row.action);
}

export const activityKeys = {
  list: ["admin", "activity"] as const,
  forUser: (id: string) => ["admin", "activity", "user", id] as const,
};

export async function fetchActivity(limit = 400): Promise<ActivityRow[]> {
  const { data, error } = await (supabase as any)
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ActivityRow[];
}

export async function fetchUserActivity(userId: string, limit = 20): Promise<ActivityRow[]> {
  const { data, error } = await (supabase as any)
    .from("activity_log")
    .select("*")
    .eq("actor_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ActivityRow[];
}

export async function logActivity(
  action: string,
  entity = "",
  objectId = "",
  objectLabel = "",
): Promise<void> {
  try {
    await (supabase as any).rpc("log_activity", {
      p_action: action,
      p_entity: entity,
      p_object_id: objectId,
      p_object_label: objectLabel,
      p_details: {},
    });
  } catch {
    /* logging must never break the flow */
  }
}

/** Signed URLs for private avatar objects, keyed by storage path. */
export async function signAvatars(paths: string[]): Promise<Record<string, string>> {
  const clean = [...new Set(paths.filter(Boolean))];
  if (!clean.length) return {};
  const { data, error } = await supabase.storage.from("avatars").createSignedUrls(clean, 3600);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  data.forEach((item, i) => {
    const key = item.path ?? clean[i]!;
    if (item.signedUrl) out[key] = item.signedUrl;
  });
  return out;
}

export const initials = (name: string, email: string) => {
  const src = (name || email || "?").trim();
  const parts = src.split(/[\s._@-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0] ?? "");
  return (letters.join("") || src[0] || "?").toUpperCase();
};

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
