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
  .inputValidator((input: { email: string; role: string; name?: string }) => {
    const email = clean(input?.email, 160).toLowerCase();
    const role = clean(input?.role, 20);
    const name = clean(input?.name, 80);
    if (!isEmail(email)) throw new Error("Укажите корректный email");
    if (!ROLES.includes(role)) throw new Error("Выберите роль");
    return { email, role, name };
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

    if (data.name) {
      await (context.supabase as any).rpc("admin_set_name", {
        p_user_id: userId,
        p_name: data.name,
      });
    }

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

    await (context.supabase as any).rpc("log_activity", {
      p_action: "admin_password_reset",
      p_entity: "admin_users",
      p_object_id: data.userId,
      p_object_label: data.email,
      p_details: {},
    });

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

export const deleteAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    const userId = clean(input?.userId, 64);
    if (!userId) throw new Error("Пользователь не найден");
    return { userId };
  })
  .handler(async ({ data, context }) => {
    await assertFullAdmin(context.supabase);

    const { data: res, error } = await (context.supabase as any).rpc("admin_delete_user", {
      p_user_id: data.userId,
    });
    if (error) throw new Error("Не удалось удалить администратора");
    if (!res?.ok) {
      const map: Record<string, string> = {
        forbidden: "Недостаточно прав",
        self: "Нельзя удалить самого себя",
        last_admin: "Нельзя удалить последнего администратора с полными правами",
        not_found: "Пользователь не найден",
      };
      throw new Error(map[res?.error as string] ?? "Не удалось удалить администратора");
    }

    const { deleteAuthUser } = await import("./admins.server");
    await deleteAuthUser(data.userId);
    return { ok: true };
  });

export const setAdminName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; name: string }) => ({
    userId: clean(input?.userId, 64),
    name: clean(input?.name, 80),
  }))
  .handler(async ({ data, context }) => {
    await assertFullAdmin(context.supabase);
    const { error } = await (context.supabase as any).rpc("admin_set_name", {
      p_user_id: data.userId,
      p_name: data.name,
    });
    if (error) throw new Error("Не удалось сохранить имя");
    return { ok: true };
  });
