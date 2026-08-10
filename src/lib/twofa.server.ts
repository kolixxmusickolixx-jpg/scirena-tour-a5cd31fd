import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 60;
const MAX_SENDS_PER_CHALLENGE = 5;
const MAX_CHALLENGES_PER_HOUR = 8;
const GRANT_TTL_SEC = 120;

type Challenge = {
  id: string;
  email: string;
  user_id: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  sends: number;
  last_sent_at: string;
  consumed_at: string | null;
  grant_token: string | null;
  grant_expires_at: string | null;
  created_at: string;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // 2FA tables are internal and intentionally not part of the generated types.
  return supabaseAdmin as unknown as {
    from: (table: string) => any;
  };
}

function hashCode(challengeId: string, code: string) {
  return createHash("sha256").update(`${challengeId}:${code}`).digest("hex");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function generateCode() {
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "";
  const head = name.slice(0, 2);
  return `${head}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

async function sendCodeEmail(email: string, code: string) {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["RESEND_FROM_EMAIL"];
  if (!apiKey || !from) throw new Error("Отправка кода временно недоступна");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: `SCIRENA <${from}>`,
      to: [email],
      subject: `Код подтверждения входа: ${code}`,
      html: `<div style="background:#0b0b0b;padding:40px 0;font-family:Helvetica,Arial,sans-serif">
        <div style="max-width:440px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:20px;padding:32px">
          <p style="margin:0 0 8px;letter-spacing:.3em;font-size:11px;color:#8a8a8a">SCIRENA · АДМИН-ПАНЕЛЬ</p>
          <h1 style="margin:0 0 16px;font-size:22px;color:#e8e8e8">Подтвердите вход</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#a5a5a5">Введите этот код в форме подтверждения. Он действует ${CODE_TTL_MIN} минут.</p>
          <p style="margin:0 0 24px;font-size:34px;letter-spacing:.35em;color:#ffffff;font-weight:700">${code}</p>
          <p style="margin:0;font-size:12px;color:#6f6f6f">Если это были не вы — просто проигнорируйте письмо и смените пароль.</p>
        </div>
      </div>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[Resend] send failed [${res.status}]: ${body}`);
    throw new Error("Не удалось отправить код на почту");
  }
}

export async function verifyPasswordAndIssueCode(email: string, password: string) {
  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new Error("Сервис авторизации недоступен");

  const db = await admin();

  // Rate limit: how many login challenges for this email in the last hour.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("admin_2fa_challenges")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= MAX_CHALLENGES_PER_HOUR) {
    throw new Error("Слишком много попыток входа. Попробуйте позже.");
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });
  // Never keep a session server-side — the password step must not grant access.
  await authClient.auth.signOut();

  if (signInError || !signIn?.user) throw new Error("Неверный email или пароль");
  const userId = signIn.user.id;

  // Invalidate previous pending codes for this user.
  await db
    .from("admin_2fa_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("consumed_at", null);

  const code = generateCode();
  const { data: created, error } = await db
    .from("admin_2fa_challenges")
    .insert({
      email,
      user_id: userId,
      code_hash: "pending",
      expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
    })
    .select("id")
    .single();
  if (error || !created) throw new Error("Не удалось начать подтверждение входа");

  await db
    .from("admin_2fa_challenges")
    .update({ code_hash: hashCode(created.id, code) })
    .eq("id", created.id);

  await sendCodeEmail(email, code);

  return {
    challengeId: created.id as string,
    maskedEmail: maskEmail(email),
    resendAfterSec: RESEND_COOLDOWN_SEC,
    expiresInMin: CODE_TTL_MIN,
  };
}

async function loadChallenge(db: Awaited<ReturnType<typeof admin>>, id: string) {
  const { data } = await db.from("admin_2fa_challenges").select("*").eq("id", id).maybeSingle();
  return (data ?? null) as Challenge | null;
}

export async function resendCode(challengeId: string) {
  const db = await admin();
  const ch = await loadChallenge(db, challengeId);
  if (!ch || ch.consumed_at) throw new Error("Сессия подтверждения истекла. Войдите заново.");
  if (ch.sends >= MAX_SENDS_PER_CHALLENGE) throw new Error("Лимит отправок исчерпан. Войдите заново.");

  const since = (Date.now() - new Date(ch.last_sent_at).getTime()) / 1000;
  if (since < RESEND_COOLDOWN_SEC) {
    throw new Error(`Повторная отправка через ${Math.ceil(RESEND_COOLDOWN_SEC - since)} сек.`);
  }

  const code = generateCode();
  await db
    .from("admin_2fa_challenges")
    .update({
      code_hash: hashCode(ch.id, code),
      attempts: 0,
      sends: ch.sends + 1,
      last_sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
    })
    .eq("id", ch.id);

  await sendCodeEmail(ch.email, code);
  return { resendAfterSec: RESEND_COOLDOWN_SEC };
}

export async function verifyCode(challengeId: string, code: string) {
  const db = await admin();
  const ch = await loadChallenge(db, challengeId);
  if (!ch || ch.consumed_at) throw new Error("Сессия подтверждения истекла. Войдите заново.");
  if (new Date(ch.expires_at).getTime() < Date.now()) {
    await db.from("admin_2fa_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", ch.id);
    throw new Error("Срок действия кода истёк. Запросите новый.");
  }
  if (ch.attempts >= MAX_ATTEMPTS) {
    await db.from("admin_2fa_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", ch.id);
    throw new Error("Слишком много попыток. Войдите заново.");
  }

  if (!safeEqual(hashCode(ch.id, code), ch.code_hash)) {
    const attempts = ch.attempts + 1;
    await db.from("admin_2fa_challenges").update({ attempts }).eq("id", ch.id);
    const left = Math.max(0, MAX_ATTEMPTS - attempts);
    throw new Error(left ? `Неверный код. Осталось попыток: ${left}` : "Слишком много попыток. Войдите заново.");
  }

  const grantToken = randomBytes(32).toString("hex");
  await db
    .from("admin_2fa_challenges")
    .update({
      consumed_at: new Date().toISOString(),
      grant_token: grantToken,
      grant_expires_at: new Date(Date.now() + GRANT_TTL_SEC * 1000).toISOString(),
    })
    .eq("id", ch.id);

  return { grantToken };
}

export async function claimGrant(userId: string, grantToken: string, ttlHours: number) {
  const db = await admin();
  const { data } = await db
    .from("admin_2fa_challenges")
    .select("*")
    .eq("grant_token", grantToken)
    .maybeSingle();
  const ch = (data ?? null) as Challenge | null;
  if (!ch || ch.user_id !== userId) throw new Error("Подтверждение не найдено");
  if (!ch.grant_expires_at || new Date(ch.grant_expires_at).getTime() < Date.now()) {
    throw new Error("Подтверждение истекло. Войдите заново.");
  }

  await db.from("admin_2fa_challenges").update({ grant_token: null, grant_expires_at: null }).eq("id", ch.id);
  await db.from("admin_2fa_verifications").insert({
    user_id: userId,
    expires_at: new Date(Date.now() + ttlHours * 3600_000).toISOString(),
  });

  return { ok: true };
}

export async function isVerified(userId: string) {
  const db = await admin();
  const { data } = await db
    .from("admin_2fa_verifications")
    .select("id")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

export async function revokeVerifications(userId: string) {
  const db = await admin();
  await db.from("admin_2fa_verifications").delete().eq("user_id", userId);
}
