import { createFileRoute } from "@tanstack/react-router";
import { publicServerClient } from "@/lib/db.server";

type Payload = {
  sessionId?: string;
  visitorId?: string;
  event?: string;
  path?: string;
  device?: string;
  source?: string;
  referrerHost?: string;
  isNew?: boolean;
  durationMs?: number;
  props?: Record<string, unknown>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function countryFrom(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-ipcountry") ??
    h.get("x-vercel-ip-country") ??
    h.get("x-country-code") ??
    ""
  ).slice(0, 2);
}

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Payload;
        try {
          body = (await request.json()) as Payload;
        } catch {
          return Response.json({ ok: false, error: "bad_json" }, { status: 400 });
        }

        if (!body.sessionId || !UUID_RE.test(body.sessionId) || !body.visitorId || !body.event) {
          return Response.json({ ok: false, error: "invalid_input" }, { status: 400 });
        }

        try {
          const supabase = publicServerClient();
          const { data, error } = await supabase.rpc("analytics_track", {
            p_session_id: body.sessionId,
            p_visitor_id: String(body.visitorId).slice(0, 64),
            p_event: String(body.event).slice(0, 40),
            p_path: String(body.path ?? "/").slice(0, 200),
            p_device: String(body.device ?? "desktop"),
            p_source: String(body.source ?? "direct"),
            p_referrer_host: String(body.referrerHost ?? "").slice(0, 120),
            p_country: countryFrom(request),
            p_is_new: Boolean(body.isNew),
            p_duration_ms: Math.max(0, Math.round(Number(body.durationMs ?? 0)) || 0),
            p_props: (body.props ?? {}) as never,
          });
          if (error) {
            console.error("[analytics] rpc error", error.message);
            return Response.json({ ok: false }, { status: 500 });
          }
          return Response.json(data ?? { ok: true }, {
            headers: { "cache-control": "no-store" },
          });
        } catch (err) {
          console.error("[analytics] handler error", err);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
