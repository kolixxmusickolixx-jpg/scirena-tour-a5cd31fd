import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 60;
const MAX_SENDS_PER_CHALLENGE = 5;
const MAX_CHALLENGES_PER_HOUR = 8;
const GRANT_TTL_SEC = 120;
const SESSION_TTL_HOURS = 12;

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export const startAdminLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string }) => {
    const email = clean(input?.email, 160).toLowerCase();
    const password = typeof input?.password === "string" ? input.password : "";
    if (!isEmail(email)) throw new Error("Укажите корректный email");
    if (password.length < 6) throw new Error("Укажите пароль");
    return { email, password };
  })
  .handler(async ({ data }) => {
    const { verifyPasswordAndIssueCode } = await import("./twofa.server");
    return verifyPasswordAndIssueCode(data.email, data.password);
  });

export const resendAdminCode = createServerFn({ method: "POST" })
  .inputValidator((input: { challengeId: string }) => {
    const challengeId = clean(input?.challengeId, 64);
    if (!challengeId) throw new Error("Сессия подтверждения не найдена");
    return { challengeId };
  })
  .handler(async ({ data }) => {
    const { resendCode } = await import("./twofa.server");
    return resendCode(data.challengeId);
  });

export const verifyAdminCode = createServerFn({ method: "POST" })
  .inputValidator((input: { challengeId: string; code: string }) => {
    const challengeId = clean(input?.challengeId, 64);
    const code = clean(input?.code, 6).replace(/\D/g, "");
    if (!challengeId) throw new Error("Сессия подтверждения не найдена");
    if (code.length !== 6) throw new Error("Введите 6-значный код");
    return { challengeId, code };
  })
  .handler(async ({ data }) => {
    const { verifyCode } = await import("./twofa.server");
    return verifyCode(data.challengeId, data.code);
  });

export const claimAdminGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { grantToken: string }) => {
    const grantToken = clean(input?.grantToken, 128);
    if (!grantToken) throw new Error("Подтверждение не найдено");
    return { grantToken };
  })
  .handler(async ({ data, context }) => {
    const { data: res, error } = await (context.supabase as any).rpc("twofa_claim_grant", {
      p_grant_token: data.grantToken,
      p_ttl_hours: SESSION_TTL_HOURS,
    });
    if (error) throw new Error("Не удалось подтвердить вход");
    if (!res?.ok) {
      throw new Error(
        res?.error === "expired" ? "Подтверждение истекло. Войдите заново." : "Подтверждение не найдено",
      );
    }
    return { ok: true };
  });

export const checkAdminTwoFactor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any).rpc("twofa_is_verified");
    return { verified: data === true };
  });

export const revokeAdminTwoFactor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await (context.supabase as any).rpc("twofa_revoke");
    return { ok: true };
  });


export const twoFactorConfig = {
  CODE_TTL_MIN,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_SEC,
  MAX_SENDS_PER_CHALLENGE,
  MAX_CHALLENGES_PER_HOUR,
  GRANT_TTL_SEC,
  SESSION_TTL_HOURS,
};
