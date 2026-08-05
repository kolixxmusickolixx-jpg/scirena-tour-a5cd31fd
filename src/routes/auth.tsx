import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fn =
      mode === "in"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    const { data, error: err } = await fn;
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data.session) navigate({ to: "/admin", replace: true });
    else setError("Проверьте почту для подтверждения аккаунта.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <Link to="/" className="text-[0.65rem] tracking-[0.35em] text-muted-foreground">
          ← НА САЙТ
        </Link>
        <h1 className="font-display mt-6 text-3xl font-extrabold tracking-tight">
          {mode === "in" ? "ВХОД" : "РЕГИСТРАЦИЯ"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Панель управления сайтом тура</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none focus:border-foreground/40"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none focus:border-foreground/40"
          />
          {error && <p className="text-xs text-muted-foreground">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-6 py-3 text-xs font-semibold tracking-[0.2em] text-primary-foreground disabled:opacity-50"
          >
            {loading ? "..." : mode === "in" ? "ВОЙТИ" : "СОЗДАТЬ АККАУНТ"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setError(null);
          }}
          className="mt-6 text-xs tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
        >
          {mode === "in" ? "СОЗДАТЬ АККАУНТ" : "У МЕНЯ УЖЕ ЕСТЬ АККАУНТ"}
        </button>
      </div>
    </main>
  );
}
