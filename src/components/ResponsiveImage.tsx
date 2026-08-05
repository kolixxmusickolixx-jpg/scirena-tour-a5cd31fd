import { motion, type MotionStyle } from "motion/react";

type Props = {
  base: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  style?: MotionStyle;
  ariaHidden?: boolean;
};

export function ResponsiveImage({
  base,
  alt,
  className,
  sizes = "100vw",
  priority = false,
  style,
  ariaHidden,
}: Props) {
  const srcSet = [640, 1080, 1600].map((w) => `/img/${base}-${w}.webp ${w}w`).join(", ");
  return (
    <motion.img
      src={`/img/${base}-1080.webp`}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      aria-hidden={ariaHidden}
      width={1440}
      height={1920}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      style={style}
      className={className}
    />
  );
}
