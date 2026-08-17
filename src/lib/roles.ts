export type AdminRole =
  | "artist"
  | "organizer"
  | "developer"
  | "photographer"
  | "videographer";

export const ADMIN_ROLES: { id: AdminRole; label: string; hint: string }[] = [
  { id: "artist", label: "Артист", hint: "Полный доступ" },
  { id: "organizer", label: "Организатор", hint: "Полный доступ" },
  { id: "developer", label: "Программист", hint: "Полный доступ" },
  { id: "photographer", label: "Фотограф", hint: "Только «Галерея»" },
  { id: "videographer", label: "Видеограф", hint: "Только «Медиа»" },
];

export const FULL_ACCESS_ROLES: AdminRole[] = ["artist", "organizer", "developer"];

export const roleLabel = (role: string | null | undefined) =>
  ADMIN_ROLES.find((r) => r.id === role)?.label ?? "—";

export const isFullAccess = (role: string | null | undefined) =>
  FULL_ACCESS_ROLES.includes(role as AdminRole);

/** Sections a role may open in the admin panel. Mirrors the database `can_manage()`. */
export function allowedSections(role: string | null | undefined): string[] {
  if (isFullAccess(role)) {
    return [
      "analytics",
      "shows",
      "content",
      "faq",
      "socials",
      "releases",
      "gallery",
      "media",
      "support",
      "admins",
    ];
  }
  if (role === "photographer") return ["gallery"];
  if (role === "videographer") return ["media"];
  return [];
}
