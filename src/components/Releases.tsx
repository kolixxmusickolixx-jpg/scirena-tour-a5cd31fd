import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { Reveal } from "@/components/Reveal";
import { ReleaseCard } from "@/components/releases/ReleaseCard";
import { releasesQuery } from "@/lib/releases";

const FEATURED = 6;

export function Releases() {
  const { data, isError } = useQuery(releasesQuery);
  const releases = (data ?? []).slice(0, FEATURED);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    containScroll: "trimSnaps",
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect).on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect).off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (isError || releases.length === 0) return null;

  return (
    <section id="releases" className="relative px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="mb-4 text-[0.65rem] tracking-[0.4em] text-muted-foreground">МУЗЫКА</p>
              <h2 className="font-display text-[clamp(1.9rem,8.5vw,3rem)] leading-[1] font-extrabold tracking-tight break-words sm:text-5xl lg:text-6xl">
                РЕЛИЗЫ
              </h2>
            </div>
            <div className="hidden gap-2 md:flex">
              <button
                aria-label="Назад"
                disabled={!canPrev}
                onClick={() => emblaApi?.scrollPrev()}
                className="glass flex h-11 w-11 items-center justify-center rounded-full text-lg text-foreground transition-opacity disabled:opacity-30"
              >
                ‹
              </button>
              <button
                aria-label="Вперёд"
                disabled={!canNext}
                onClick={() => emblaApi?.scrollNext()}
                className="glass flex h-11 w-11 items-center justify-center rounded-full text-lg text-foreground transition-opacity disabled:opacity-30"
              >
                ›
              </button>
            </div>
          </div>
        </Reveal>

        <div className="mt-12 overflow-hidden" ref={emblaRef}>
          <div className="flex gap-5">
            {releases.map((release, i) => (
              <div
                key={release.id}
                className="min-w-0 shrink-0 grow-0 basis-[82%] sm:basis-[48%] lg:basis-[32%]"
              >
                <ReleaseCard release={release} eager={i === 0} />
              </div>
            ))}
          </div>
        </div>

        <Reveal>
          <div className="mt-12 flex justify-center">
            <Link
              to="/releases"
              className="glass rounded-full px-8 py-4 text-xs font-semibold tracking-[0.2em] text-foreground transition-all duration-500 hover:scale-[1.04]"
            >
              ОТКРЫТЬ ВСЕ РЕЛИЗЫ
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
