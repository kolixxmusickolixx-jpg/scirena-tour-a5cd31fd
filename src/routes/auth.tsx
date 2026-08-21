import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  startAdminLogin,
  resendAdminCode,
import { logActivity } from "@/lib/activity";
  verifyAdminCode,
  claimAdminGrant,
  checkAdminTwoFactor,
} from "@/lib/twofa.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Вход в админ-панель — SCIRENA" },
      { name: "description", content: "Вход в панель управления сайтом тура SCIRENA «УЕЗЖАЕМ ОСТАЁМСЯ?»." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Вход в админ-панель — SCIRENA" },
      { property: "og:description", content: "Панель управления сайтом тура SCIRENA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const errText = (e: unknown) => (e instanceof Error ? e.message : "Что-то пошло не так");

function AuthPage() {
  const navigate = useNavigate();
  
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      try {
        const { verified } = await checkAdminTwoFactor();
        if (verified) navigate({ to: "/admin", replace: true });
        else await supabase.auth.signOut();
      } catch {
        await supabase.auth.signOut();
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await startAdminLogin({ data: { email, password } });
      passwordRef.current = password;
      setPassword("");
      setChallengeId(res.challengeId);
      setMaskedEmail(res.maskedEmail);
      setCooldown(res.resendAfterSec);
      setStep("code");
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { grantToken } = await verifyAdminCode({ data: { challengeId, code } });
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password: passwordRef.current,
      });
      if (err || !data.session) throw new Error("Сессия истекла. Войдите заново.");
      try {
        await claimAdminGrant({ data: { grantToken } });
      } catch (inner) {
        await supabase.auth.signOut();
        throw inner;
      }
      passwordRef.current = "";
      await supabase.rpc("admin_touch_login");
      await logActivity("login", "auth");
      navigate({ to: "/admin", replace: true });
    } catch (e) {
      setError(errText(e));
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setError(null);
    setNotice(null);
    try {
      const res = await resendAdminCode({ data: { challengeId } });
      setCooldown(res.resendAfterSec);
      setNotice("Новый код отправлен на почту.");
      setCode("");
    } catch (e) {
      setError(errText(e));
    }
  }

  function backToLogin() {
    passwordRef.current = "";
    setStep("credentials");
    setChallengeId("");
    setCode("");
    setError(null);
    setNotice(null);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <Link to="/" className="text-[0.65rem] tracking-[0.35em] text-muted-foreground">
          ← НА САЙТ
        </Link>

        {step === "credentials" ? (
          <>
            <h1 className="font-display mt-6 text-3xl font-extrabold tracking-tight">ВХОД</h1>
            <p className="mt-2 text-sm text-muted-foreground">Панель управления сайтом тура</p>

            <form onSubmit={onCredentials} className="mt-8 space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none focus:border-foreground/40"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                autoComplete="current-password"
                className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none focus:border-foreground/40"
              />
              {error && <p className="text-xs text-muted-foreground">{error}</p>}
              {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-primary px-6 py-3 text-xs font-semibold tracking-[0.2em] text-primary-foreground disabled:opacity-50"
              >
                {loading ? "..." : "ВОЙТИ"}
              </button>
            </form>

            <p className="mt-6 text-[0.65rem] leading-relaxed tracking-[0.15em] text-muted-foreground">
              ДОСТУП ВЫДАЁТ АДМИНИСТРАТОР
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display mt-6 text-3xl font-extrabold tracking-tight">
              ПОДТВЕРДИТЕ ВХОД
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Мы отправили код на вашу почту{maskedEmail ? ` ${maskedEmail}` : ""}
            </p>

            <form onSubmit={onVerify} className="mt-8 space-y-4">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-center text-2xl tracking-[0.5em] text-foreground outline-none focus:border-foreground/40"
              />
              {error && <p className="text-xs text-muted-foreground">{error}</p>}
              {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full rounded-full bg-primary px-6 py-3 text-xs font-semibold tracking-[0.2em] text-primary-foreground disabled:opacity-50"
              >
                {loading ? "..." : "ПОДТВЕРДИТЬ"}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={onResend}
                disabled={cooldown > 0}
                className="text-xs tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {cooldown > 0 ? `ОТПРАВИТЬ ПОВТОРНО (${cooldown})` : "ОТПРАВИТЬ КОД ПОВТОРНО"}
              </button>
              <button
                onClick={backToLogin}
                className="text-xs tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
              >
                НАЗАД
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
