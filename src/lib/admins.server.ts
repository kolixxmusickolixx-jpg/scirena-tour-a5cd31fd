import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const SPECIALS = "!@#$%&*";

export function generateTempPassword() {
  const bytes = randomBytes(14);
  let out = "";
  for (let i = 0; i < 12; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  out += SPECIALS[bytes[12]! % SPECIALS.length];
  out += String(bytes[13]! % 10);
  return out;
}

function env(name: string) {
  return process.env[name] ?? process.env[`VITE_${name}`];
}

/** Service-role client, when the key is configured (optional on external hosts). */
export function adminAuthClient(): SupabaseClient | null {
  const url = env("SUPABASE_URL");
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
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
}

function anonAuthClient(): SupabaseClient {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_PUBLISHABLE_KEY") ?? env("SUPABASE_ANON_KEY");
  if (!url || !key) throw new Error("Сервис авторизации недоступен");
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function findUserByEmail(admin: SupabaseClient, email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

/** Creates (or resets) the auth user and returns its id + temporary password. */
export async function provisionAuthUser(email: string) {
  const password = generateTempPassword();
  const admin = adminAuthClient();

  if (admin) {
    const existing = await findUserByEmail(admin, email);
    if (existing) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
      return { userId: existing.id, password, existed: true };
    }
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(error?.message ?? "Не удалось создать пользователя");
    return { userId: data.user.id, password, existed: false };
  }

  // Fallback without a service-role key: standard sign-up.
  const client = anonAuthClient();
  const { data, error } = await client.auth.signUp({ email, password });
  await client.auth.signOut();
  if (error || !data.user) {
    throw new Error(error?.message ?? "Не удалось создать пользователя");
  }
  return { userId: data.user.id, password, existed: false };
}

/** Sets a fresh temporary password for an existing admin. */
export async function resetAuthPassword(userId: string, email: string) {
  const password = generateTempPassword();
  const admin = adminAuthClient();
  if (admin) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { password, viaLink: false as const };
  }

  const client = anonAuthClient();
  const { error } = await client.auth.resetPasswordForEmail(email);
  if (error) throw new Error(error.message);
  return { password: null, viaLink: true as const };
}

export async function sendPasswordEmail(
  email: string,
  password: string,
  opts: { reset?: boolean } = {},
) {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["RESEND_FROM_EMAIL"];
  if (!apiKey || !from) throw new Error("Отправка письма временно недоступна");

  const title = opts.reset ? "Новый временный пароль" : "Доступ в админ-панель SCIRENA";
  const intro = opts.reset
    ? "Для вашего аккаунта выпущен новый временный пароль."
    : "Для вас создан аккаунт в панели управления сайтом тура.";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: `SCIRENA <${from}>`,
      to: [email],
      subject: title,
      html: `<div style="background:#0b0b0b;padding:40px 0;font-family:Helvetica,Arial,sans-serif">
        <div style="max-width:460px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:20px;padding:32px">
          <p style="margin:0 0 8px;letter-spacing:.3em;font-size:11px;color:#8a8a8a">SCIRENA · АДМИН-ПАНЕЛЬ</p>
          <h1 style="margin:0 0 16px;font-size:22px;color:#e8e8e8">${title}</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#a5a5a5">${intro} Войдите с этим временным паролем — при первом входе система попросит задать новый.</p>
          <p style="margin:0 0 8px;font-size:12px;color:#8a8a8a">Логин</p>
          <p style="margin:0 0 20px;font-size:16px;color:#ffffff">${email}</p>
          <p style="margin:0 0 8px;font-size:12px;color:#8a8a8a">Временный пароль</p>
          <p style="margin:0 0 24px;font-size:26px;letter-spacing:.12em;color:#ffffff;font-weight:700">${password}</p>
          <p style="margin:0;font-size:12px;color:#6f6f6f">Никому не пересылайте это письмо. После смены пароля временный станет недействительным.</p>
        </div>
      </div>`,
    }),
  });

  if (!res.ok) {
    console.error(`[Resend] admin password send failed [${res.status}]: ${await res.text()}`);
    throw new Error("Не удалось отправить письмо с паролем");
  }
}

/** Best-effort removal of the auth user (needs a service-role key). */
export async function deleteAuthUser(userId: string) {
  const admin = adminAuthClient();
  if (!admin) return { removed: false as const };
  const { error } = await admin.auth.admin.deleteUser(userId);
  return { removed: !error };
}
