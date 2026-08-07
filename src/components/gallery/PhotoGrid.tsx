import { memo } from "react";
import { Reveal } from "@/components/Reveal";
import type { GalleryPhoto } from "@/lib/gallery";

function PhotoGridBase({
  photos,
  title,
  onOpen,
}: {
  photos: GalleryPhoto[];
  title: string;
  onOpen: (i: number) => void;
}) {
  if (photos.length === 0) {
    return (
      <p className="py-20 text-center text-[0.7rem] tracking-[0.3em] text-muted-foreground">
        В ЭТОМ АЛЬБОМЕ ПОКА НЕТ ФОТО
      </p>
    );
  }

  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
      {photos.map((p, i) => (
        <Reveal key={p.id} delay={Math.min(i, 8) * 0.03} className="break-inside-avoid">
          <button
            onClick={() => onOpen(i)}
            className="group block w-full overflow-hidden rounded-2xl bg-secondary"
          >
            <img
              src={p.url}
              alt={`${title} — фото ${i + 1}`}
              loading={i < 4 ? "eager" : "lazy"}
              decoding="async"
              className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          </button>
        </Reveal>
      ))}
    </div>
  );
}

export const PhotoGrid = memo(PhotoGridBase);
