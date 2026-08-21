import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Underline as UnderlineIcon,
} from "lucide-react";
import { sanitizeRichText } from "@/lib/rich-text";

const COLORS = ["#ffffff", "#e8e8e8", "#a1a1aa", "#71717a", "#f5c542", "#e5484d", "#3b82f6"];
const SIZES = [
  { label: "Мелкий", value: "2" },
  { label: "Обычный", value: "3" },
  { label: "Крупный", value: "5" },
  { label: "Очень крупный", value: "6" },
];
const BLOCKS = [
  { label: "Абзац", value: "p" },
  { label: "Заголовок 1", value: "h2" },
  { label: "Заголовок 2", value: "h3" },
  { label: "Заголовок 3", value: "h4" },
];

const toolBtn =
  "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg border border-transparent px-2 text-muted-foreground transition-colors hover:border-border hover:bg-secondary/60 hover:text-foreground";
const selectCls =
  "h-8 rounded-lg border border-border bg-secondary/40 px-2 text-[0.7rem] text-foreground outline-none";

export function RichTextEditor({
  value,
  onChange,
  minHeight = 140,
  placeholder = "Введите текст…",
  className = "",
}: {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = sanitizeRichText(value ?? "");
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [value]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const html = el.innerHTML;
    onChange(html === "<br>" || html === "<div><br></div>" ? "" : sanitizeRichText(html));
  }, [onChange]);

  const exec = useCallback(
    (command: string, arg?: string) => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      try {
        document.execCommand("styleWithCSS", false, "true");
      } catch {
        /* not supported */
      }
      document.execCommand(command, false, arg);
      emit();
    },
    [emit],
  );

  const isEmpty = !value || value === "<br>";

  return (
    <div
      className={`overflow-hidden rounded-xl border transition-colors ${
        focused ? "border-foreground/40" : "border-border"
      } bg-secondary/40 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-border/70 bg-background/40 p-1.5">
        <button type="button" title="Жирный" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}>
          <Bold size={14} />
        </button>
        <button type="button" title="Курсив" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}>
          <Italic size={14} />
        </button>
        <button type="button" title="Подчёркнутый" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")}>
          <UnderlineIcon size={14} />
        </button>

        <span className="mx-1 h-5 w-px bg-border" />

        <select
          className={selectCls}
          defaultValue=""
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            if (e.target.value) exec("formatBlock", `<${e.target.value}>`);
            e.target.value = "";
          }}
        >
          <option value="" disabled>
            Стиль
          </option>
          {BLOCKS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>

        <select
          className={selectCls}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) exec("fontSize", e.target.value);
            e.target.value = "";
          }}
        >
          <option value="" disabled>
            Размер
          </option>
          {SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 rounded-lg border border-border px-1.5 py-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={`Цвет ${c}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("foreColor", c)}
              className="h-3.5 w-3.5 rounded-full border border-border"
              style={{ background: c }}
            />
          ))}
        </div>

        <span className="mx-1 h-5 w-px bg-border" />

        <button type="button" title="Маркированный список" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")}>
          <List size={14} />
        </button>
        <button type="button" title="Нумерованный список" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")}>
          <ListOrdered size={14} />
        </button>
        <button type="button" title="Цитата" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "<blockquote>")}>
          <Quote size={14} />
        </button>

        <span className="mx-1 h-5 w-px bg-border" />

        <button type="button" title="По левому краю" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyLeft")}>
          <AlignLeft size={14} />
        </button>
        <button type="button" title="По центру" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyCenter")}>
          <AlignCenter size={14} />
        </button>
        <button type="button" title="По правому краю" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyRight")}>
          <AlignRight size={14} />
        </button>

        <span className="mx-1 h-5 w-px bg-border" />

        <button
          type="button"
          title="Ссылка"
          className={toolBtn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const url = window.prompt("Адрес ссылки", "https://");
            if (!url) return;
            if (/^javascript:/i.test(url.trim())) return;
            exec("createLink", url.trim());
          }}
        >
          <Link2 size={14} />
        </button>
        <button
          type="button"
          title="Очистить форматирование"
          className={toolBtn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            exec("removeFormat");
            exec("unlink");
          }}
        >
          <Eraser size={14} />
        </button>
      </div>

      <div className="relative">
        {isEmpty && !focused && (
          <span className="pointer-events-none absolute left-3.5 top-3 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          dir="ltr"
          role="textbox"
          aria-multiline="true"
          style={{ minHeight }}
          className="rich-text w-full px-3.5 py-3 text-sm text-foreground outline-none"
          onInput={emit}
          onBlur={() => {
            setFocused(false);
            emit();
          }}
          onFocus={() => setFocused(true)}
          onPaste={(e) => {
            e.preventDefault();
            const html = e.clipboardData.getData("text/html");
            const text = e.clipboardData.getData("text/plain");
            if (html) document.execCommand("insertHTML", false, sanitizeRichText(html));
            else document.execCommand("insertText", false, text);
            emit();
          }}
        />
      </div>
    </div>
  );
}
