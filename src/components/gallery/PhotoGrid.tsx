import { memo } from "react";
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((p, i) => (
        <button
          key={p.id}
          onClick={() => onOpen(i)}
          className="group block w-full overflow-hidden rounded-2xl bg-secondary"
          style={{ aspectRatio: "3 / 4" }}
        >
          <img
            src={p.url}
            alt={`${title} — фото ${i + 1}`}
            loading={i < 8 ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover opacity-0 transition-[transform,opacity] duration-700 group-hover:scale-[1.04]"
            onLoad={(e) => e.currentTarget.classList.remove("opacity-0")}
          />
        </button>
      ))}
    </div>
  );

}

export const PhotoGrid = memo(PhotoGridBase);
