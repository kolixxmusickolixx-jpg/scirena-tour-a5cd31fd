import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["artist", "organizer", "developer", "photographer", "videographer"];
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

async function assertFullAdmin(supabase: any) {
  const { data, error } = await supabase.rpc("is_full_admin");
  if (error || data !== true) throw new Error("Недостаточно прав");
}

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; role: string }) => {
    const email = clean(input?.email, 160).toLowerCase();
    const role = clean(input?.role, 20);
    if (!isEmail(email)) throw new Error("Укажите корректный email");
    if (!ROLES.includes(role)) throw new Error("Выберите роль");
    return { email, role };
  })
  .handler(async ({ data, context }) => {
    await assertFullAdmin(context.supabase);

    const { provisionAuthUser, sendPasswordEmail } = await import("./admins.server");
    const { userId, password } = await provisionAuthUser(data.email);

    const { data: res, error } = await (context.supabase as any).rpc("admin_upsert_user", {
      p_user_id: userId,
      p_email: data.email,
      p_role: data.role,
    });
    if (error || !res?.ok) throw new Error("Не удалось сохранить администратора");

    await sendPasswordEmail(data.email, password);
    return { ok: true, email: data.email };
  });

export const resetAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; email: string }) => {
    const userId = clean(input?.userId, 64);
    const email = clean(input?.email, 160).toLowerCase();
    if (!userId || !isEmail(email)) throw new Error("Пользователь не найден");
    return { userId, email };
  })
  .handler(async ({ data, context }) => {
    await assertFullAdmin(context.supabase);

    const { resetAuthPassword, sendPasswordEmail } = await import("./admins.server");
    const result = await resetAuthPassword(data.userId, data.email);

    if (result.password) {
      await (context.supabase as any).rpc("admin_mark_temp_password", { p_user_id: data.userId });
      await sendPasswordEmail(data.email, result.password, { reset: true });
      return { ok: true, viaLink: false };
    }
    return { ok: true, viaLink: true };
  });

export const setAdminActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; active: boolean }) => {
    const userId = clean(input?.userId, 64);
    if (!userId) throw new Error("Пользователь не найден");
    return { userId, active: Boolean(input?.active) };
  })
  .handler(async ({ data, context }) => {
    await assertFullAdmin(context.supabase);
    if (data.userId === context.userId && !data.active) {
      throw new Error("Нельзя деактивировать самого себя");
    }
    const { error } = await context.supabase
      .from("admin_users" as any)
      .update({ active: data.active } as any)
      .eq("user_id", data.userId);
    if (error) throw new Error("Не удалось изменить статус");
    return { ok: true };
  });

export const setAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: string }) => {
    const userId = clean(input?.userId, 64);
    const role = clean(input?.role, 20);
    if (!userId) throw new Error("Пользователь не найден");
    if (!ROLES.includes(role)) throw new Error("Выберите роль");
    return { userId, role };
  })
  .handler(async ({ data, context }) => {
    await assertFullAdmin(context.supabase);
    if (data.userId === context.userId) throw new Error("Нельзя менять собственную роль");
    const { error } = await context.supabase
      .from("admin_users" as any)
      .update({ role: data.role } as any)
      .eq("user_id", data.userId);
    if (error) throw new Error("Не удалось изменить роль");
    return { ok: true };
  });

export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertFullAdmin(context.supabase);
    const { data, error } = await context.supabase
      .from("admin_users" as any)
      .select("user_id, email, role, active, must_change_password, created_at")
      .order("created_at");
    if (error) throw new Error("Не удалось загрузить список");
    return { rows: (data ?? []) as any[], selfId: context.userId };
  });

export const getMyAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any).rpc("admin_me");
    const info = (data ?? {}) as {
      role?: string;
      active?: boolean;
      mustChangePassword?: boolean;
      email?: string;
    };
    return {
      role: info.role ?? null,
      active: info.active ?? false,
      mustChangePassword: info.mustChangePassword ?? false,
      email: info.email ?? null,
    };
  });

export const completePasswordChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await (context.supabase as any).rpc("admin_password_changed");
    return { ok: true };
  });
