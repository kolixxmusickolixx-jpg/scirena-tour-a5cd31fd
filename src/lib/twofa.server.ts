import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { publicServerClient } from "./db.server";

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 60;
const MAX_SENDS_PER_CHALLENGE = 5;
const MAX_CHALLENGES_PER_HOUR = 8;
const GRANT_TTL_SEC = 120;

type Rpc = Record<string, any>;

async function rpc(fn: string, args: Record<string, unknown>): Promise<Rpc> {
  const { data, error } = await publicServerClient().rpc(fn, args);
  if (error) {
    console.error(`[2fa] ${fn} failed: ${error.message}`);
    throw new Error("Сервис подтверждения временно недоступен");
  }
  return (data ?? {}) as Rpc;
}

function hashCode(challengeId: string, code: string) {
  return createHash("sha256").update(`${challengeId}:${code}`).digest("hex");
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
  const SUPABASE_URL = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new Error("Сервис авторизации недоступен");

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

  const challengeId = randomUUID();
  const code = generateCode();

  const created = await rpc("twofa_create_challenge", {
    p_id: challengeId,
    p_email: email,
    p_user_id: userId,
    p_code_hash: hashCode(challengeId, code),
    p_expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
    p_max_per_hour: MAX_CHALLENGES_PER_HOUR,
  });
  if (!created["ok"]) throw new Error("Слишком много попыток входа. Попробуйте позже.");

  await sendCodeEmail(email, code);

  return {
    challengeId,
    maskedEmail: maskEmail(email),
    resendAfterSec: RESEND_COOLDOWN_SEC,
    expiresInMin: CODE_TTL_MIN,
  };
}

export async function resendCode(challengeId: string) {
  const code = generateCode();
  const res = await rpc("twofa_resend", {
    p_id: challengeId,
    p_code_hash: hashCode(challengeId, code),
    p_expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
    p_cooldown_sec: RESEND_COOLDOWN_SEC,
    p_max_sends: MAX_SENDS_PER_CHALLENGE,
  });

  if (!res["ok"]) {
    if (res["error"] === "cooldown") {
      throw new Error(`Повторная отправка через ${res["waitSec"]} сек.`);
    }
    if (res["error"] === "send_limit") throw new Error("Лимит отправок исчерпан. Войдите заново.");
    throw new Error("Сессия подтверждения истекла. Войдите заново.");
  }

  await sendCodeEmail(res["email"] as string, code);
  return { resendAfterSec: RESEND_COOLDOWN_SEC };
}

export async function verifyCode(challengeId: string, code: string) {
  const grantToken = randomBytes(32).toString("hex");
  const res = await rpc("twofa_verify", {
    p_id: challengeId,
    p_code_hash: hashCode(challengeId, code),
    p_max_attempts: MAX_ATTEMPTS,
    p_grant_token: grantToken,
    p_grant_ttl_sec: GRANT_TTL_SEC,
  });

  if (!res["ok"]) {
    switch (res["error"]) {
      case "code_expired":
        throw new Error("Срок действия кода истёк. Запросите новый.");
      case "too_many":
        throw new Error("Слишком много попыток. Войдите заново.");
      case "wrong_code": {
        const left = Number(res["attemptsLeft"] ?? 0);
        throw new Error(
          left ? `Неверный код. Осталось попыток: ${left}` : "Слишком много попыток. Войдите заново.",
        );
      }
      default:
        throw new Error("Сессия подтверждения истекла. Войдите заново.");
    }
  }

  return { grantToken };
}
