import { createFileRoute } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "motion/react";
import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { ResponsiveImage } from "@/components/ResponsiveImage";
import { Gallery } from "@/components/Gallery";
import { Releases } from "@/components/Releases";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { useSuspenseQuery } from "@tanstack/react-query";
import { siteQuery } from "@/lib/site-query";
import type { SiteData } from "@/lib/site.functions";
const quoteImg = {
  src: "/img/quote-1600.webp",
  srcSet:
    "/img/quote-640.webp 640w, /img/quote-1080.webp 1080w, /img/quote-1600.webp 1600w",
};
const hero = { base: "IMG_20260804_232616_195", url: "/img/IMG_20260804_232616_195-1600.webp" };
const portrait = { base: "IMG_20260804_232611_238" };
const alt1 = { base: "IMG_20260804_232720_983" };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SCIRENA — тур «THE OCEAN TOUR» 2027 | Билеты" },
      {
        name: "description",
        content:
          "Новый концертный тур SCIRENA «THE OCEAN TOUR» 2027. Даты, города, площадки и билеты на концерты по всей России.",
      },
      { property: "og:title", content: "SCIRENA — тур «THE OCEAN TOUR» 2027 | Билеты" },
      {
        property: "og:description",
        content: "Новый концертный тур SCIRENA «THE OCEAN TOUR» 2027. Даты, города, площадки и билеты на концерты по всей России.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: hero.url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: hero.url },
    ],
    links: [
      {
        rel: "preload",
        as: "image",
        href: "/img/IMG_20260804_232616_195-1080.webp",
        imagesrcset:
          "/img/IMG_20260804_232616_195-640.webp 640w, /img/IMG_20260804_232616_195-1080.webp 1080w, /img/IMG_20260804_232616_195-1600.webp 1600w",
        imagesizes: "100vw",
        fetchpriority: "high",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "MusicEvent",
          name: "SCIRENA — УЕЗЖАЕМ ОСТАЁМСЯ? Тур 2026",
          performer: { "@type": "MusicGroup", name: "SCIRENA" },
          image: hero.url,
        }),
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(siteQuery);
  },
  component: Index,
});

const ease = [0.16, 1, 0.3, 1] as const;

function Index() {
  const { data } = useSuspenseQuery(siteQuery);
  useSmoothScroll();
  const isMobile = useIsMobile();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const scale = useTransform(smooth, [0, 1], isMobile ? [1, 1] : [1, 1.18]);
  const y = useTransform(smooth, [0, 1], isMobile ? ["0%", "0%"] : ["0%", "10%"]);
  const fade = useTransform(smooth, [0, 0.8], [1, 0]);

  return (
    <main className="relative">
      <Nav />
      <Hero heroRef={heroRef} scale={scale} y={y} fade={fade} data={data} />
      <Cities data={data} />
      <Bio data={data} />
      <QuoteScreen data={data} />
      <Faq data={data} />
      <Releases />
      <Gallery />

      <Footer data={data} />

    </main>
  );
}

function Nav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 0.6, ease }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="glass mx-auto mt-3 grid w-[94%] max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-full px-5 py-3 sm:flex sm:justify-between">
        <a href="#top" className="font-display text-sm tracking-[0.35em] text-foreground">
          SCIRENA
        </a>
        <nav className="hidden items-center gap-8 text-xs tracking-[0.2em] text-muted-foreground md:flex">
          <a className="transition-colors hover:text-foreground" href="#cities">КОНЦЕРТЫ</a>
          <a className="transition-colors hover:text-foreground" href="#bio">БИОГРАФИЯ</a>
          <a className="transition-colors hover:text-foreground" href="#cities">ГОРОДА</a>
          <a className="transition-colors hover:text-foreground" href="#faq">FAQ</a>
          <a className="transition-colors hover:text-foreground" href="#releases">РЕЛИЗЫ</a>
          <a className="transition-colors hover:text-foreground" href="/gallery">ГАЛЕРЕЯ</a>

        </nav>
        <a
          href="#cities"
          className="shrink-0 rounded-full bg-primary px-5 py-2 text-xs font-semibold tracking-[0.16em] text-primary-foreground transition-transform duration-500 hover:scale-105"
        >
          БИЛЕТЫ
        </a>
      </div>
    </motion.header>
  );
}

function Hero({ heroRef, scale, y, fade, data }: any) {
  const c = (data as SiteData).content;
  const isVideo = (c["hero_media"] ?? "photo") === "video";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!isVideo) return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const play = () => v.play().catch(() => {});
    play();
    v.addEventListener("loadeddata", play);
    return () => v.removeEventListener("loadeddata", play);
  }, [isVideo]);

  return (
    <section id="top" ref={heroRef} className="relative h-[100svh] overflow-hidden">
      {isVideo ? (
        <motion.video
          ref={videoRef}
          src="/video/hero.mp4"
          autoPlay
          loop
          muted={muted}
          playsInline
          preload="auto"
          style={{ scale, y, willChange: "transform", backfaceVisibility: "hidden", filter: "grayscale(100%) brightness(110%) contrast(110%)" }}
          className="absolute inset-0 h-full w-full object-cover object-center opacity-100 transform-gpu"
        />
      ) : (
        <ResponsiveImage
          base={hero.base}
          alt="SCIRENA — тур УЕЗЖАЕМ ОСТАЁМСЯ? 2026"
          priority
          sizes="100vw"
          style={{ scale, y, willChange: "transform", backfaceVisibility: "hidden" }}
          className="absolute inset-0 h-full w-full object-cover object-[60%_30%] opacity-70 transform-gpu"
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.07 0 0 / 12%) 0%, oklch(0.07 0 0 / 28%) 40%, oklch(0.07 0 0 / 62%) 100%)",
        }}
      />
      {isVideo && (
        <button
          type="button"
          aria-label={muted ? "Включить звук" : "Выключить звук"}
          onClick={() => {
            const v = videoRef.current;
            const next = !muted;
            setMuted(next);
            if (v) {
              v.muted = next;
              if (!next) void v.play().catch(() => {});
            }
          }}
          className="glass absolute right-5 top-20 z-20 flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-foreground sm:right-10"
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      )}
      <motion.div
        style={{ opacity: fade }}
        className="relative z-10 flex h-full flex-col justify-end px-5 pb-12 sm:px-10 sm:pb-16 lg:px-16"
      >
        <div className="mx-auto w-full max-w-7xl">
          <motion.p
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.2, delay: 0.3, ease }}
            className="mb-6 text-xs tracking-[0.4em] text-muted-foreground"
          >
            {c["hero_artist"] ?? "SCIRENA"}
          </motion.p>

          <h1 className="font-display text-[clamp(2.6rem,12.8vw,10rem)] leading-[0.9] font-extrabold tracking-[-0.02em] break-words hyphens-none sm:leading-[0.86] lg:text-[8.5vw]">
            {[c["hero_title_line1"] ?? "УЕЗЖАЕМ", c["hero_title_line2"] ?? "ОСТАЁМСЯ?"].map((word, i) => (
              <span key={word} className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={{ y: "110%", filter: "blur(18px)" }}
                  animate={{ y: "0%", filter: "blur(0px)" }}
                  transition={{ duration: 1.5, delay: 0.35 + i * 0.15, ease }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>

          <div className="mt-6 grid gap-6 sm:mt-8 sm:gap-8 sm:flex sm:items-end sm:justify-between">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.9, ease }}
                className="font-display text-sm tracking-[0.5em] text-muted-foreground"
              >
                {c["hero_tour_label"] ?? "ТУР 2026"}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1.1, delay: 1.05, ease }}
                className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:flex sm:flex-wrap"
              >
                <a
                  href="#cities"
                  className="rounded-full bg-primary px-8 py-4 text-center text-xs font-semibold tracking-[0.2em] text-primary-foreground transition-all duration-500 hover:scale-[1.04] hover:opacity-90"
                >
                  КУПИТЬ БИЛЕТ
                </a>
                <a
                  href="#cities"
                  className="glass rounded-full px-8 py-4 text-center text-xs font-semibold tracking-[0.2em] text-foreground transition-all duration-500 hover:scale-[1.04]"
                >
                  ВСЕ ГОРОДА
                </a>
              </motion.div>
            </div>
            <motion.p
              initial={{ opacity: 0, filter: "blur(12px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.4, delay: 1.2, ease }}
              className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground sm:text-sm sm:text-right"
            >
              {c["hero_note"] ?? ""}
            </motion.p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <Reveal>
      <p className="mb-4 text-[0.65rem] tracking-[0.4em] text-muted-foreground">{kicker}</p>
      <h2 className="font-display text-[clamp(1.9rem,8.5vw,3rem)] leading-[1] font-extrabold tracking-tight break-words sm:text-5xl lg:text-6xl">
        {title}
      </h2>
    </Reveal>
  );
}

function NoAnnouncements({ note }: { note: string }) {
  return (
    <Reveal>
      <div className="glass mt-14 flex flex-col items-center rounded-2xl px-6 py-14 text-center sm:py-20">
        <span className="text-[0.6rem] tracking-[0.4em] text-muted-foreground">SCIRENA</span>
        <p className="font-display mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          АНОНСОВ ПОКА НЕТ
        </p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{note}</p>
      </div>
    </Reveal>
  );
}


function Bio({ data }: { data: SiteData }) {
  const c = data.content;
  return (
    <section id="bio" className="relative px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
      <div className="mx-auto grid max-w-7xl gap-10 sm:gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl">
            <ResponsiveImage
              base={portrait.base}
              alt="Портрет SCIRENA"
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="aspect-[3/4] w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 veil opacity-60" />
          </div>
        </Reveal>
        <div>
          <SectionTitle kicker="ОБ АРТИСТКЕ" title="БИОГРАФИЯ" />
          <div className="mt-8 space-y-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {[c["bio_p1"], c["bio_p2"], c["bio_p3"], c["bio_p4"]].filter(Boolean).map((p, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <p>{p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Cities({ data }: { data: SiteData }) {
  const shows = data.shows;
  if (shows.length === 0)
    return (
      <section id="cities" className="relative px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <SectionTitle kicker="ТУР 2027" title="ГОРОДА ТУРА" />
          <NoAnnouncements note="Города тура будут опубликованы здесь после анонса. Следите за обновлениями." />
        </div>
      </section>
    );
  return (
    <section id="cities" className="relative px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <SectionTitle kicker="ТУР 2027" title="ГОРОДА ТУРА" />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {shows.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 0.08}>
              <motion.article
                whileHover={{ scale: 1.03, y: -4 }}
                transition={{ duration: 0.7, ease }}
                className="glass flex h-full flex-col rounded-2xl p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs tracking-[0.25em] text-muted-foreground">
                    {s.day_label} · {s.date_label}
                  </span>
                  <span
                    className={`shrink-0 rounded-full border border-border px-3 py-1 text-[0.6rem] tracking-[0.14em] ${
                      s.status === "Sold out" ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {s.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="font-display mt-6 text-2xl font-bold tracking-tight break-words">
                  {s.city}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.venue}</p>
                <button
                  disabled={s.status === "Sold out"}
                  className="mt-8 rounded-full bg-primary px-6 py-3 text-[0.65rem] font-semibold tracking-[0.2em] text-primary-foreground transition-all duration-500 hover:opacity-90 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
                >
                  {s.status === "Sold out" ? "ПРОДАНО" : "КУПИТЬ БИЛЕТ"}
                </button>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuoteScreen({ data }: { data: SiteData }) {
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const y = useTransform(smooth, [0, 1], ["-8%", "8%"]);

  return (
    <section ref={ref} className="relative h-[70svh] overflow-hidden sm:h-[100svh]">
      <motion.img
        src={quoteImg.src}
        srcSet={quoteImg.srcSet}
        alt="SCIRENA на концерте тура"
        sizes="100vw"
        loading="lazy"
        decoding="async"
        style={
          isMobile
            ? { willChange: "auto" }
            : { y, scale: 1.25, willChange: "transform", backfaceVisibility: "hidden" }
        }
        className="absolute inset-0 h-full w-full object-cover opacity-95 transform-gpu"
      />

      <div className="veil absolute inset-0 opacity-50" />
      <div className="relative z-10 flex h-full items-center justify-center px-6">
        <Reveal>
          <p className="font-display max-w-4xl text-center text-xl leading-[1.3] font-semibold text-balance-lux sm:text-4xl sm:leading-[1.25] lg:text-5xl">
            {data.content["quote"] ?? ""}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Faq({ data }: { data: SiteData }) {
  const faq = data.faq;
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <SectionTitle kicker="ПОМОЩЬ" title="FAQ" />
        <div className="mt-12 space-y-3">
          {faq.map((item, i) => (
            <Reveal key={item.id} delay={i * 0.06}>
              <div className="glass overflow-hidden rounded-2xl">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-5 text-left"
                >
                  <span className="text-sm break-words text-foreground sm:text-lg">{item.question}</span>
                  <motion.span
                    animate={{ rotate: open === i ? 45 : 0 }}
                    transition={{ duration: 0.6, ease }}
                    className="shrink-0 text-xl text-muted-foreground"
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.5, ease }}

                    >
                      <p className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ data }: { data: SiteData }) {
  const socials = data.socials;
  return (
    <footer className="relative overflow-hidden border-t border-border px-5 pt-24 pb-10 sm:px-10 lg:px-16">
      <ResponsiveImage
        base={alt1.base}
        alt=""
        ariaHidden
        sizes="100vw"
        className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover opacity-10 blur-2xl sm:block"
      />
      <div className="relative mx-auto max-w-7xl">
        <Reveal>
          <p className="font-display text-[clamp(3rem,15vw,11rem)] leading-[0.85] font-extrabold tracking-tight lg:text-[11rem]">
            SCIRENA
          </p>
        </Reveal>
        <div className="mt-10 grid gap-8 sm:mt-14 sm:flex sm:items-end sm:justify-between">
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs tracking-[0.2em] text-muted-foreground">
            {socials.map((s) => (
              <a
                key={s.id}
                href={s.url || "#top"}
                target={s.url?.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="transition-colors hover:text-foreground"
              >
                {s.label.toUpperCase()}
              </a>
            ))}
          </div>
          <div className="text-xs tracking-[0.2em] text-muted-foreground">
            <a
              href={data.content["privacy_url"] || "#top"}
              className="block transition-colors hover:text-foreground"
            >
              ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ
            </a>
            <p className="mt-3">© SCIRENA TOUR 2027</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
