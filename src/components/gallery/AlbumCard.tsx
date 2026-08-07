import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { albumCover, type GalleryAlbum } from "@/lib/gallery";

function AlbumCardBase({
  album,
  eager = false,
  className = "",
}: {
  album: GalleryAlbum;
  eager?: boolean;
  className?: string;
}) {
  const cover = albumCover(album);
  const count = album.photos.length;

  return (
    <Link
      to="/gallery/$albumId"
      params={{ albumId: album.id }}
      className={`glass group block overflow-hidden rounded-3xl transition-transform duration-700 hover:-translate-y-1 ${className}`}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-secondary sm:aspect-[4/3]">
        {cover ? (
          <img
            src={cover}
            alt={album.title}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-[1.07]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[0.6rem] tracking-[0.3em] text-muted-foreground">
            НЕТ ФОТО
          </div>
        )}
        <div className="veil pointer-events-none absolute inset-0 opacity-80" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5">
          <p className="font-display text-lg leading-tight font-bold break-words sm:text-xl">
            {album.title}
          </p>
          <div className="mt-2 flex items-center justify-between text-[0.6rem] tracking-[0.24em] text-muted-foreground">
            <span>{album.date_label || "—"}</span>
            <span>{count} ФОТО</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export const AlbumCard = memo(AlbumCardBase);
