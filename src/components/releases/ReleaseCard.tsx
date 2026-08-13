import { motion } from "motion/react";
import { PlatformIcon } from "./PlatformIcon";
import { releaseLinks, releaseTypeLabel, type Release } from "@/lib/releases";

export function ReleaseCard({ release, eager = false }: { release: Release; eager?: boolean }) {
  const links = releaseLinks(release);

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="glass flex h-full flex-col overflow-hidden rounded-2xl"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-secondary/40">
        {release.cover ? (
          <img
            src={release.cover}
            alt={`Обложка релиза ${release.title}`}
            width={1000}
            height={1000}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[0.6rem] tracking-[0.3em] text-muted-foreground">
            SCIRENA
          </div>
        )}
        <span className="absolute left-4 top-4 rounded-full border border-border bg-background/60 px-3 py-1 text-[0.55rem] tracking-[0.22em] text-foreground backdrop-blur">
          {releaseTypeLabel(release.release_type).toUpperCase()}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="font-display text-xl leading-tight font-bold tracking-tight break-words sm:text-2xl">
          {release.title}
        </h3>

        {links.length > 0 && (
          <div className="mt-5 space-y-2">
            {links.map((p) => (
              <div
                key={p.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2.5 text-xs text-foreground">
                  <PlatformIcon platform={p.key} />
                  <span className="truncate">{p.label}</span>
                </span>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-[0.6rem] font-semibold tracking-[0.18em] text-primary-foreground transition-all duration-500 hover:opacity-90"
                >
                  СЛУШАТЬ
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.article>
  );
}
