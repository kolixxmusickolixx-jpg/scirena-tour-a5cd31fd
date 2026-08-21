/** Shared helpers for admin rich-text fields (stored as HTML strings). */

const BLOCKED_TAGS = /<\s*\/?\s*(script|style|iframe|object|embed|link|meta|form|input)\b[^>]*>/gi;
const EVENT_ATTRS = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URLS = /(href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi;

/** Removes scripts, inline handlers and javascript: URLs from admin-authored HTML. */
export function sanitizeRichText(html: string): string {
  return (html ?? "")
    .replace(BLOCKED_TAGS, "")
    .replace(EVENT_ATTRS, "")
    .replace(JS_URLS, "$1=\"#\"");
}

/** True when the stored value contains markup and should be rendered as HTML. */
export function isRichText(value: string | null | undefined): boolean {
  return !!value && /<[a-z][\s\S]*>/i.test(value);
}

/** Plain-text preview of a rich value (for lists, meta descriptions, etc.). */
export function richTextToPlain(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
