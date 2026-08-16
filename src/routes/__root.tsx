import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { SupportWidget } from "@/components/SupportWidget";
import { initAnalytics, trackPageView } from "@/lib/analytics-client";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SCIRENA — тур «УЕЗЖАЕМ ОСТАЁМСЯ?» 2026 | Билеты" },
      {
        name: "description",
        content: "Новый концертный тур SCIRENA «УЕЗЖАЕМ ОСТАЁМСЯ?» 2026. Даты, города, площадки и билеты на концерты по всей России.",
      },
      { name: "author", content: "SCIRENA" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "SCIRENA — тур «УЕЗЖАЕМ ОСТАЁМСЯ?» 2026 | Билеты" },
      { name: "twitter:title", content: "SCIRENA — тур «УЕЗЖАЕМ ОСТАЁМСЯ?» 2026 | Билеты" },
      { property: "og:description", content: "Новый концертный тур SCIRENA «УЕЗЖАЕМ ОСТАЁМСЯ?» 2026. Даты, города, площадки и билеты на концерты по всей России." },
      { name: "twitter:description", content: "Новый концертный тур SCIRENA «УЕЗЖАЕМ ОСТАЁМСЯ?» 2026. Даты, города, площадки и билеты на концерты по всей России." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7cdc0b22-acac-46f4-b076-494a525ca98a/id-preview-89bf0ad0--e406177f-7c16-4c04-a703-b57e9e631364.lovable.app-1785875604168.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7cdc0b22-acac-46f4-b076-494a525ca98a/id-preview-89bf0ad0--e406177f-7c16-4c04-a703-b57e9e631364.lovable.app-1785875604168.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;800&family=Manrope:wght@300;400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideSupport = pathname.startsWith("/admin") || pathname.startsWith("/auth");
  const trackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return;
    if (trackedPath.current === pathname) return;
    trackedPath.current = pathname;
    initAnalytics();
    trackPageView(pathname);
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      {!hideSupport && <SupportWidget />}
      <Toaster />
    </QueryClientProvider>
  );
}
