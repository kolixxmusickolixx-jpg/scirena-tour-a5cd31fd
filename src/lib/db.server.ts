import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the publishable (anon) key.
 * All privileged work goes through SECURITY DEFINER database functions,
 * so no service-role key is required — this keeps the app deployable on
 * any external host (Vercel, VPS) with only public env vars.
 */
export function publicServerClient() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY",
    );
  }

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
