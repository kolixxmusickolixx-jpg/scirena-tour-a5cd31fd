import { useEffect, useState } from "react";

const MINIMUM_DURATION = 4400;
export function SitePreloader() {
  const [leaving, setLeaving] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const startedAt = performance.now();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.documentElement.classList.add("preloader-active");

    const elapsed = performance.now() - startedAt;
    const minimum = reduceMotion ? 700 : MINIMUM_DURATION;
    const finishTimer = window.setTimeout(() => setLeaving(true), Math.max(0, minimum - elapsed));

    return () => {
      window.clearTimeout(finishTimer);
      document.documentElement.classList.remove("preloader-active");
    };
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const remove = window.setTimeout(() => setVisible(false), 700);
    return () => window.clearTimeout(remove);
  }, [leaving]);

  useEffect(() => {
    if (!visible) document.documentElement.classList.remove("preloader-active");
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`site-preloader${leaving ? " site-preloader--leaving" : ""}`}
      aria-label="Загрузка сайта SCIRENA"
      aria-live="polite"
    >
      <div className="site-preloader__content">
        <div className="site-preloader__word" aria-hidden="true">
          <span className="site-preloader__word-ghost">SCIRENA</span>
          <span className="site-preloader__word-fill">SCIRENA</span>
        </div>

        <svg
          className="site-preloader__mark"
          viewBox="0 0 360 170"
          role="img"
          aria-label="Golden Sound"
        >
          <path
            pathLength="1"
            d="M303 47C260 18 195 8 128 17 67 25 27 50 20 78c-8 32 29 58 85 70 66 14 145 5 195-24 29-17 45-37 40-54-5-20-36-30-78-31l-75-1v35h79c25 0 41 6 44 17 4 13-10 27-35 38-42 19-106 24-160 14-47-9-77-29-72-50 5-21 39-39 86-47 54-10 119-4 174 12Z"
          />
          <path
            pathLength="1"
            d="M188 38v55h-43v-28l-71-1 43 17v47h71V91h78c24 0 41 5 44 15"
          />
          <path
            pathLength="1"
            d="M22 94c12 30 53 51 106 60 67 11 144-1 190-36"
          />
        </svg>
      </div>
    </div>
  );
}