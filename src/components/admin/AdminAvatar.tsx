import { initials } from "@/lib/activity";

type Props = {
  name?: string | null;
  email?: string | null;
  url?: string | null | undefined;
  size?: number;
};

export function AdminAvatar({ name, email, url, size = 44 }: Props) {
  const label = initials(name ?? "", email ?? "");
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary/60"
    >
      {url ? (
        <img src={url} alt={name || email || "Аватар"} className="h-full w-full object-cover" />
      ) : (
        <span
          style={{ fontSize: Math.max(11, size * 0.34) }}
          className="font-semibold tracking-[0.08em] text-foreground/80"
        >
          {label}
        </span>
      )}
    </div>
  );
}
