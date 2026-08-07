import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { downloadPhoto, preloadPhotos, type GalleryPhoto } from "@/lib/gallery";

const ease = [0.16, 1, 0.3, 1] as const;

export function Lightbox({
  photos,
  index,
  title,
  onIndexChange,
  onClose,
}: {
  photos: GalleryPhoto[];
  index: number;
  title: string;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const total = photos.length;
  const safeIndex = total > 0 ? ((index % total) + total) % total : 0;
  const photo = photos[safeIndex];
  const [zoom, setZoom] = useState(false);

  const next = useCallback(() => {
    if (total > 1) onIndexChange((safeIndex + 1) % total);
  }, [safeIndex, total, onIndexChange]);

  const prev = useCallback(() => {
    if (total > 1) onIndexChange((safeIndex - 1 + total) % total);
  }, [safeIndex, total, onIndexChange]);

  useEffect(() => setZoom(false), [safeIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [next, prev, onClose]);

  const neighbours = useMemo(
    () =>
      total > 1
        ? [photos[(safeIndex + 1) % total]?.url, photos[(safeIndex - 1 + total) % total]?.url]
        : [],
    [photos, safeIndex, total],
  );
  useEffect(() => preloadPhotos(neighbours), [neighbours]);

  if (!photo) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease }}
      className="fixed inset-0 z-[95] flex flex-col bg-background/98"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <span className="text-[0.65rem] tracking-[0.2em] text-muted-foreground">
          {safeIndex + 1} / {total}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setZoom((z) => !z)}
            className="rounded-full border border-border px-4 py-2 text-[0.65rem] tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            {zoom ? "УМЕНЬШИТЬ" : "УВЕЛИЧИТЬ"}
          </button>
          <button
            onClick={() => downloadPhoto(photo.url, `${title || "photo"}-${safeIndex + 1}.jpg`)}
            className="rounded-full bg-primary px-4 py-2 text-[0.65rem] font-semibold tracking-[0.2em] text-primary-foreground"
          >
            СКАЧАТЬ
          </button>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-full border border-border px-4 py-2 text-[0.65rem] tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-6">
        <AnimatePresence mode="wait">
          <motion.img
            key={photo.id}
            src={photo.url}
            alt={`${title} — фото ${safeIndex + 1}`}
            drag={zoom ? true : "x"}
            dragElastic={zoom ? 0.05 : 0.18}
            dragConstraints={zoom ? undefined : { left: 0, right: 0 }}
            onDoubleClick={() => setZoom((z) => !z)}
            onDragEnd={(_, info) => {
              if (zoom) return;
              if (info.offset.x < -70) next();
              else if (info.offset.x > 70) prev();
            }}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: zoom ? 2.2 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            className={`max-h-full max-w-full touch-none object-contain select-none ${zoom ? "cursor-grab" : "cursor-zoom-in"}`}
            draggable={false}
          />
        </AnimatePresence>

        {total > 1 && !zoom && (
          <>
            <button
              aria-label="Предыдущее фото"
              onClick={prev}
              className="glass absolute top-1/2 left-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-lg text-foreground sm:left-8"
            >
              ‹
            </button>
            <button
              aria-label="Следующее фото"
              onClick={next}
              className="glass absolute top-1/2 right-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-lg text-foreground sm:right-8"
            >
              ›
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
