import { isRichText, sanitizeRichText } from "@/lib/rich-text";

/**
 * Renders admin-authored content: HTML when the value carries formatting,
 * plain text otherwise.
 */
export function RichText({
  value,
  className = "",
  as: Tag = "div",
}: {
  value: string | null | undefined;
  className?: string;
  as?: "div" | "p" | "span";
}) {
  if (!value) return null;
  if (!isRichText(value)) return <Tag className={className}>{value}</Tag>;
  return (
    <Tag
      className={`rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }}
    />
  );
}
