import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { Reveal } from "@/components/Reveal";
import { fetchGallery, downloadPhoto, type GalleryAlbum } from "@/lib/gallery";

const ease = [0.16, 1, 0.3, 1] as const;

export function Gallery() {
  const { data: albums } = useQuery({ queryKey: ["gallery"], queryFn: fetchGallery });
  const [openAlbum, setOpenAlbum] = useState<GalleryAlbum | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const list = albums ?? [];
  if (list.length === 0) return null;

  return (
    <section id="gallery" className="relative px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="mb-4 text-[0.65rem] tracking-[0.4em] text-muted-foreground">АРХИВ</p>
          <h2 className="font-display text-[clamp(1.9rem,8.5vw,3rem)] leading-[1] font-extrabold tracking-tight break-words sm:text-5xl lg:text-6xl">
            ГАЛЕРЕЯ
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((album, i) => {
            const cover = album.photos[0]?.url;
            return (
              <Reveal key={album.id} delay={i * 0.06}>
                <button
                  onClick={() => setOpenAlbum(album)}
                  className="glass group block w-full overflow-hidden rounded-3xl text-left"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
                    {cover && (
                      <img
                        src={cover}
                        alt={album.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                      />
                    )}
                    <div className="veil absolute inset-0 opacity-70" />
                  </div>
                  <div className="p-5">
                    <p className="font-display text-lg leading-tight font-bold break-words">
                      {album.title}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[0.65rem] tracking-[0.2em] text-muted-foreground">
                      <span>{album.date_label}</span>
                      <span>{album.photos.length} ФОТО</span>
                    </div>
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {openAlbum && (
          <AlbumOverlay
            album={openAlbum}
            onClose={() => setOpenAlbum(null)}
            onOpenPhoto={(i) => setLightbox(i)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openAlbum && lightbox !== null && (
          <Lightbox
            album={openAlbum}
            index={lightbox}
            setIndex={setLightbox}
            onClose={() => setLightbox(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function AlbumOverlay({
  album,
  onClose,
  onOpenPhoto,
}: {
  album: GalleryAlbum;
  onClose: () => void;
  onOpenPhoto: (i: number) => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease }}
      className="fixed inset-0 z-[80] overflow-y-auto bg-background/95"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-5 py-4 backdrop-blur-xl sm:px-10">
        <div className="min-w-0">
          <p className="font-display truncate text-base font-bold sm:text-xl">{album.title}</p>
          <p className="text-[0.6rem] tracking-[0.2em] text-muted-foreground">
            {album.date_label} · {album.photos.length} ФОТО
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-full border border-border px-4 py-2 text-[0.65rem] tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
        >
          ЗАКРЫТЬ
        </button>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2 p-5 sm:grid-cols-3 sm:gap-3 sm:p-10 lg:grid-cols-4">
        {album.photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => onOpenPhoto(i)}
            className="group aspect-square overflow-hidden rounded-xl bg-secondary"
          >
            <img
              src={p.url}
              alt={`${album.title} — фото ${i + 1}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function Lightbox({
  album,
  index,
  setIndex,
  onClose,
}: {
  album: GalleryAlbum;
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
}) {
  const total = album.photos.length;
  const photo = album.photos[index];

  const next = useCallback(() => setIndex((index + 1) % total), [index, total, setIndex]);
  const prev = useCallback(() => setIndex((index - 1 + total) % total), [index, total, setIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  if (!photo) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease }}
      className="fixed inset-0 z-[90] flex flex-col bg-background/98"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <span className="text-[0.65rem] tracking-[0.2em] text-muted-foreground">
          {index + 1} / {total}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => downloadPhoto(photo.url, `${album.title}-${index + 1}.jpg`)}
            className="rounded-full bg-primary px-4 py-2 text-[0.65rem] font-semibold tracking-[0.2em] text-primary-foreground"
          >
            СКАЧАТЬ
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-[0.65rem] tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            ЗАКРЫТЬ
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-6">
        <AnimatePresence mode="wait">
          <motion.img
            key={photo.id}
            src={photo.url}
            alt={`${album.title} — фото ${index + 1}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            className="max-h-full max-w-full object-contain"
          />
        </AnimatePresence>

        {total > 1 && (
          <>
            <button
              aria-label="Предыдущее фото"
              onClick={prev}
              className="glass absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-lg text-foreground sm:left-8"
            >
              ‹
            </button>
            <button
              aria-label="Следующее фото"
              onClick={next}
              className="glass absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-lg text-foreground sm:right-8"
            >
              ›
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
