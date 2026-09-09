import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { siteQuery } from "@/lib/site-query";
import { supabase } from "@/integrations/supabase/client";

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const site = useQuery(siteQuery);
  const on = (site.data?.content?.["maintenance_mode"] ?? "off") === "on";
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSignedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!on || signedIn) return <>{children}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="glass max-w-lg rounded-3xl px-8 py-12 text-center">
        <p className="text-[0.6rem] tracking-[0.32em] text-muted-foreground">SCIRENA</p>
        <h1 className="mt-6 text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
          На сайте ведутся технические работы
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Попробуйте зайти чуть позже — мы скоро вернёмся.
        </p>
      </div>
    </main>
  );
}
