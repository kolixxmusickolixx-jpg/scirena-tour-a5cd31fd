import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { Reveal } from "@/components/Reveal";
import { PhotoGrid } from "@/components/gallery/PhotoGrid";
import { Lightbox } from "@/components/gallery/Lightbox";
import { galleryQuery } from "@/lib/gallery";

export const Route = createFileRoute("/gallery/$albumId")({
  head: () => ({
    meta: [
      { title: "Альбом — галерея SCIRENA" },
      {
        name: "description",
        content: "Фотографии с концертов тура SCIRENA «УЕЗЖАЕМ ОСТАЁМСЯ?» — смотрите и скачивайте.",
      },
      { property: "og:title", content: "Альбом — галерея SCIRENA" },
      {
        property: "og:description",
        content: "Фотографии с концертов тура SCIRENA «УЕЗЖАЕМ ОСТАЁМСЯ?».",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AlbumPage,
  errorComponent: () => <GalleryMessage text="НЕ УДАЛОСЬ ЗАГРУЗИТЬ АЛЬБОМ" />,
  notFoundComponent: () => <GalleryMessage text="АЛЬБОМ НЕ НАЙДЕН" />,
});

function GalleryMessage({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 text-center">
      <p className="text-[0.7rem] tracking-[0.3em] text-muted-foreground">{text}</p>
      <Link
        to="/gallery"
        className="rounded-full border border-border px-6 py-3 text-[0.65rem] tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
      >
        К ГАЛЕРЕЕ
      </Link>
    </main>
  );
}

function AlbumPage() {
  const { albumId } = Route.useParams();
  const { data, isLoading, isError } = useQuery(galleryQuery);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const album = (data ?? []).find((a) => a.id === albumId) ?? null;
  const photos = album?.photos ?? [];

  const close = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [albumId]);

  if (isLoading) return <GalleryMessage text="ЗАГРУЗКА…" />;
  if (isError) return <GalleryMessage text="НЕ УДАЛОСЬ ЗАГРУЗИТЬ АЛЬБОМ" />;
  if (!album) return <GalleryMessage text="АЛЬБОМ НЕ НАЙДЕН" />;

  return (
    <main className="min-h-screen px-5 py-24 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <Link
            to="/gallery"
            className="text-[0.65rem] tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground"
          >
            ← ВСЕ АЛЬБОМЫ
          </Link>
          <h1 className="font-display mt-5 text-[clamp(1.9rem,8vw,3.5rem)] leading-[1] font-extrabold tracking-tight break-words">
            {album.title}
          </h1>
          <p className="mt-3 text-[0.65rem] tracking-[0.3em] text-muted-foreground">
            {album.date_label || "—"} · {photos.length} ФОТО
          </p>
        </Reveal>

        <div className="mt-12">
          <PhotoGrid photos={photos} title={album.title} onOpen={setLightbox} />
        </div>
      </div>

      <AnimatePresence>
        {lightbox !== null && photos.length > 0 && (
          <Lightbox
            photos={photos}
            index={lightbox}
            title={album.title}
            onIndexChange={setLightbox}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
