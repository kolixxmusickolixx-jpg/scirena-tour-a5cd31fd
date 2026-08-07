import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Reveal } from "@/components/Reveal";
import { AlbumCard } from "@/components/gallery/AlbumCard";
import { galleryQuery } from "@/lib/gallery";

export const Route = createFileRoute("/gallery/")({
  head: () => ({
    meta: [
      { title: "Галерея тура SCIRENA «УЕЗЖАЕМ ОСТАЁМСЯ?»" },
      {
        name: "description",
        content:
          "Полная фотогалерея тура SCIRENA «УЕЗЖАЕМ ОСТАЁМСЯ?»: альбомы с концертов, закулисье и города тура.",
      },
      { property: "og:title", content: "Галерея тура SCIRENA «УЕЗЖАЕМ ОСТАЁМСЯ?»" },
      {
        property: "og:description",
        content: "Альбомы с концертов, закулисье и города тура SCIRENA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GalleryPage,
  errorComponent: () => <Message text="НЕ УДАЛОСЬ ЗАГРУЗИТЬ ГАЛЕРЕЮ" />,
  notFoundComponent: () => <Message text="АЛЬБОМЫ НЕ НАЙДЕНЫ" />,
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

function GalleryPage() {
  const { data, isLoading, isError } = useQuery(galleryQuery);
  const albums = data ?? [];

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
          <p className="mt-6 text-[0.65rem] tracking-[0.4em] text-muted-foreground">АРХИВ</p>
          <h1 className="font-display mt-3 text-[clamp(2.2rem,10vw,5rem)] leading-[0.95] font-extrabold tracking-tight">
            ГАЛЕРЕЯ
          </h1>
        </Reveal>

        {isLoading && (
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass aspect-[4/5] animate-pulse rounded-3xl sm:aspect-[4/3]" />
            ))}
          </div>
        )}

        {isError && (
          <p className="mt-16 text-[0.7rem] tracking-[0.3em] text-muted-foreground">
            НЕ УДАЛОСЬ ЗАГРУЗИТЬ ГАЛЕРЕЮ
          </p>
        )}

        {!isLoading && !isError && albums.length === 0 && (
          <p className="mt-16 text-[0.7rem] tracking-[0.3em] text-muted-foreground">
            АЛЬБОМЫ ПОЯВЯТСЯ СОВСЕМ СКОРО
          </p>
        )}

        {albums.length > 0 && (
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album, i) => (
              <Reveal key={album.id} delay={Math.min(i, 6) * 0.05}>
                <AlbumCard album={album} eager={i < 3} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
