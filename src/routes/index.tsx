import { createFileRoute } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "motion/react";
import { useRef, useState } from "react";
import { Reveal } from "@/components/Reveal";
import { ResponsiveImage } from "@/components/ResponsiveImage";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { shows, faq } from "@/lib/tour-data";
const hero = { base: "IMG_20260804_232616_195", url: "/img/IMG_20260804_232616_195-1600.webp" };
const portrait = { base: "IMG_20260804_232611_238" };
const quoteImg = { base: "IMG_20260804_232724_950" };
const alt1 = { base: "IMG_20260804_232720_983" };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SCIRENA — тур «УЕЗЖАЕМ ОСТАЁМСЯ?» 2026 | Билеты" },
      {
        name: "description",
        content:
          "Новый концертный тур SCIRENA «УЕЗЖАЕМ ОСТАЁМСЯ?» 2026. Даты, города, площадки и билеты на концерты по всей России.",
      },
      { property: "og:title", content: "SCIRENA — тур «УЕЗЖАЕМ ОСТАЁМСЯ?» 2026 | Билеты" },
      {
        property: "og:description",
        content: "Новый концертный тур SCIRENA «УЕЗЖАЕМ ОСТАЁМСЯ?» 2026. Даты, города, площадки и билеты на концерты по всей России.",
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
  component: Index,
});

const ease = [0.16, 1, 0.3, 1] as const;

function Index() {
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
      <Hero heroRef={heroRef} scale={scale} y={y} fade={fade} />
      <Upcoming />
      <Bio />
      <Cities />
      <QuoteScreen />
      <Faq />
      <Footer />
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
          <a className="transition-colors hover:text-foreground" href="#shows">КОНЦЕРТЫ</a>
          <a className="transition-colors hover:text-foreground" href="#bio">БИОГРАФИЯ</a>
          <a className="transition-colors hover:text-foreground" href="#cities">ГОРОДА</a>
          <a className="transition-colors hover:text-foreground" href="#faq">FAQ</a>
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

function Hero({ heroRef, scale, y, fade }: any) {
  return (
    <section id="top" ref={heroRef} className="relative h-[100svh] overflow-hidden">
      <ResponsiveImage
        base={hero.base}
        alt="SCIRENA — тур УЕЗЖАЕМ ОСТАЁМСЯ? 2026"
        priority
        sizes="100vw"
        style={{ scale, y, willChange: "transform", backfaceVisibility: "hidden" }}
        className="absolute inset-0 h-full w-full object-cover object-[60%_30%] opacity-70 transform-gpu"
      />

      <div className="veil absolute inset-0" />
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
            SCIRENA
          </motion.p>

          <h1 className="font-display text-[clamp(2.4rem,11.5vw,10rem)] leading-[0.9] font-extrabold tracking-[-0.02em] break-words hyphens-none sm:leading-[0.86] lg:text-[8.5vw]">
            {["УЕЗЖАЕМ", "ОСТАЁМСЯ?"].map((word, i) => (
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
                ТУР 2026
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
                  href="#shows"
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
              «Новый концертный тур SCIRENA»
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

function Upcoming() {
  return (
    <section id="shows" className="relative px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <SectionTitle kicker="РАСПИСАНИЕ" title="БЛИЖАЙШИЕ КОНЦЕРТЫ" />
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {shows.slice(0, 4).map((s, i) => (
            <Reveal key={s.city} delay={i * 0.08}>
              <motion.article
                whileHover={{ scale: 1.025 }}
                transition={{ duration: 0.7, ease }}
                className="glass grid gap-5 rounded-2xl p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-8"
              >
                <div className="min-w-0">
                  <p className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                    {s.date}
                  </p>
                  <p className="mt-3 text-lg break-words text-foreground">{s.city}</p>
                  <p className="mt-1 text-sm break-words text-muted-foreground">{s.venue}</p>
                </div>
                <a
                  href="#cities"
                  className="shrink-0 rounded-full border border-border px-6 py-3 text-center text-[0.65rem] tracking-[0.2em] text-foreground transition-all duration-500 hover:bg-primary hover:text-primary-foreground"
                >
                  КУПИТЬ
                </a>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Bio() {
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
            {[
              "SCIRENA — российская певица нового поколения, чей стиль объединяет современный поп, R&B и атмосферную электронную музыку. Её песни наполнены личными переживаниями, искренними эмоциями и кинематографичным звучанием, благодаря чему находят отклик у тысяч слушателей.",
              "Музыка SCIRENA рассказывает истории о любви, расставаниях, взрослении, поиске себя и внутренней свободе. Каждая композиция становится отдельной главой большой истории, а живые выступления превращаются в эмоциональное путешествие, где зритель чувствует себя частью происходящего.",
              "За последние годы артистка собрала преданную аудиторию по всей России. Её концерты отличаются живым звучанием, сильной визуальной составляющей и особой атмосферой, которая остаётся со зрителями ещё долго после окончания шоу.",
              "Тур «УЕЗЖАЕМ ОСТАЁМСЯ?» — это новая глава творчества SCIRENA, объединяющая музыку, свет, эмоции и истории в единое концертное путешествие.",
            ].map((p, i) => (
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

function Cities() {
  return (
    <section id="cities" className="relative px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <SectionTitle kicker="ТУР 2026" title="ГОРОДА ТУРА" />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((s, i) => (
            <Reveal key={s.city + s.date} delay={(i % 3) * 0.08}>
              <motion.article
                whileHover={{ scale: 1.03, y: -4 }}
                transition={{ duration: 0.7, ease }}
                className="glass flex h-full flex-col rounded-2xl p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs tracking-[0.25em] text-muted-foreground">
                    {s.day} · {s.date}
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

function QuoteScreen() {
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const y = useTransform(smooth, [0, 1], ["-8%", "8%"]);

  return (
    <section ref={ref} className="relative h-[70svh] overflow-hidden sm:h-[100svh]">
      <ResponsiveImage
        base={quoteImg.base}
        alt="SCIRENA на концерте тура"
        sizes="100vw"
        style={
          isMobile
            ? { willChange: "auto" }
            : { y, scale: 1.25, willChange: "transform", backfaceVisibility: "hidden" }
        }
        className="absolute inset-0 h-full w-full object-cover opacity-60 transform-gpu"
      />

      <div className="veil absolute inset-0" />
      <div className="relative z-10 flex h-full items-center justify-center px-6">
        <Reveal>
          <p className="font-display max-w-4xl text-center text-xl leading-[1.3] font-semibold text-balance-lux sm:text-4xl sm:leading-[1.25] lg:text-5xl">
            «Каждый концерт — это история, которую мы проживаем вместе.»
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <SectionTitle kicker="ПОМОЩЬ" title="FAQ" />
        <div className="mt-12 space-y-3">
          {faq.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.06}>
              <div className="glass overflow-hidden rounded-2xl">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-5 text-left"
                >
                  <span className="text-sm break-words text-foreground sm:text-lg">{item.q}</span>
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
                        {item.a}
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

function Footer() {
  const socials = ["Telegram", "VK", "YouTube", "Instagram", "TikTok"];
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
              <a key={s} href="#top" className="transition-colors hover:text-foreground">
                {s.toUpperCase()}
              </a>
            ))}
          </div>
          <div className="text-xs tracking-[0.2em] text-muted-foreground">
            <a href="#top" className="block transition-colors hover:text-foreground">
              ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ
            </a>
            <p className="mt-3">© SCIRENA TOUR 2026</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
