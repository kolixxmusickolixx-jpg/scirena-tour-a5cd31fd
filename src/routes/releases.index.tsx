import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Reveal } from "@/components/Reveal";
import { ReleaseCard } from "@/components/releases/ReleaseCard";
import { releasesQuery } from "@/lib/releases";

export const Route = createFileRoute("/releases/")({
  head: () => ({
    meta: [
      { title: "Релизы SCIRENA — синглы и альбомы" },
      {
        name: "description",
        content:
          "Все релизы SCIRENA: синглы и альбомы с ссылками на Яндекс Музыку, Spotify, Apple Music и VK Музыку.",
      },
      { property: "og:title", content: "Релизы SCIRENA — синглы и альбомы" },
      {
        property: "og:description",
        content: "Синглы и альбомы SCIRENA на всех музыкальных площадках.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReleasesPage,
  errorComponent: () => <Message text="НЕ УДАЛОСЬ ЗАГРУЗИТЬ РЕЛИЗЫ" />,
  notFoundComponent: () => <Message text="РЕЛИЗЫ НЕ НАЙДЕНЫ" />,
});

function Message({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 text-center">
      <p className="text-[0.7rem] tracking-[0.3em] text-muted-foreground">{text}</p>
      <Link
        to="/"
        className="rounded-full border border-border px-6 py-3 text-[0.65rem] tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
      >
        НА ГЛАВНУЮ
      </Link>
    </main>
  );
}

function EmptyReleases() {
  return (
    <Reveal>
      <div className="glass mt-14 flex flex-col items-center rounded-2xl px-6 py-16 text-center sm:py-24">
        <span className="text-[0.6rem] tracking-[0.4em] text-muted-foreground">SCIRENA</span>
        <p className="font-display mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          РЕЛИЗЫ ПОКА НЕ ОПУБЛИКОВАНЫ
        </p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Новые синглы и альбомы появятся здесь сразу после выхода.
        </p>
      </div>
    </Reveal>
  );
}

function ReleasesPage() {
  const { data, isLoading, isError } = useQuery(releasesQuery);
  const releases = data ?? [];

  return (
    <main className="min-h-screen px-5 py-24 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <Link
            to="/"
            className="text-[0.65rem] tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground"
          >
            ← НА ГЛАВНУЮ
          </Link>
          <p className="mt-6 text-[0.65rem] tracking-[0.4em] text-muted-foreground">МУЗЫКА</p>
          <h1 className="font-display mt-3 text-[clamp(2.2rem,10vw,5rem)] leading-[0.95] font-extrabold tracking-tight">
            РЕЛИЗЫ
          </h1>
        </Reveal>

        {isLoading && (
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass aspect-[3/4] animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {isError && (
          <p className="mt-16 text-[0.7rem] tracking-[0.3em] text-muted-foreground">
            НЕ УДАЛОСЬ ЗАГРУЗИТЬ РЕЛИЗЫ
          </p>
        )}

        {!isLoading && !isError && releases.length === 0 && <EmptyReleases />}

        {releases.length > 0 && (
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {releases.map((release, i) => (
              <Reveal key={release.id} delay={Math.min(i, 6) * 0.05}>
                <ReleaseCard release={release} eager={i < 3} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
