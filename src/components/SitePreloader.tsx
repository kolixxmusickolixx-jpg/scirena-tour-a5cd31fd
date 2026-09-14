import { useEffect, useState } from "react";

const MINIMUM_DURATION = 3900;
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
    const remove = window.setTimeout(() => setVisible(false), 600);
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
          viewBox="0 0 693 327"
          role="img"
          aria-label="Golden Sound"
        >
          <path
            pathLength="1"
            d="M 0,139 L 0,160 L 4,178 L 13,182 L 19,192 L 21,204 L 39,219 L 78,239 L 128,252 L 181,261 L 271,267 L 357,266 L 352,262 L 353,180 L 412,176 L 505,180 L 559,191 L 569,196 L 580,207 L 580,218 L 574,222 L 574,228 L 558,242 L 535,255 L 471,274 L 385,286 L 268,289 L 195,284 L 114,271 L 28,246 L 52,263 L 127,293 L 188,310 L 274,323 L 390,326 L 467,321 L 472,315 L 480,312 L 529,304 L 582,290 L 633,268 L 662,249 L 682,226 L 688,211 L 688,197 L 692,196 L 688,182 L 679,172 L 645,151 L 564,135 L 485,130 L 439,131 L 434,128 L 432,109 L 428,108 L 429,99 L 601,100 L 603,97 L 494,74 L 365,53 L 352,53 L 351,57 L 352,129 L 347,139 L 180,143 L 182,147 L 269,170 L 269,202 L 264,209 L 199,206 L 153,195 L 122,178 L 112,166 L 110,156 L 103,153 L 105,129 L 124,102 L 134,102 L 160,82 L 204,62 L 237,52 L 301,40 L 378,35 L 486,44 L 550,56 L 666,87 L 620,55 L 560,31 L 490,13 L 407,1 L 334,0 L 253,6 L 173,21 L 130,34 L 84,53 L 42,79 L 18,103 Z"
          />
        </svg>
      </div>
    </div>
  );
}