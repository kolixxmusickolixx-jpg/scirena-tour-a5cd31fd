import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, ArrowLeft, Lock, Search, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  createSupportTicket,
  findSupportTickets,
  getSupportThread,
  sendSupportMessage,
} from "@/lib/support.functions";

type Saved = { id: string; code: string };

const STORE_KEY = "scirena_support_tickets";

function readSaved(): Saved[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((t) => t?.id && t?.code) : [];
  } catch {
    return [];
  }
}

function saveTickets(list: Saved[]) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* ignore */
  }
}

const STATUS_LABEL: Record<string, string> = {
  new: "Новое",
  in_progress: "В работе",
  closed: "Закрыто",
};

const inputCls =
  "w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 focus:bg-secondary/60";
const labelCls = "mb-1.5 block text-[0.6rem] tracking-[0.22em] text-muted-foreground";

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "form" | "chat" | "restore">("form");
  const [active, setActive] = useState<Saved | null>(null);
  const [saved, setSaved] = useState<Saved[]>([]);
  const qc = useQueryClient();

  useEffect(() => {
    const list = readSaved();
    setSaved(list);
    setView(list.length > 0 ? "list" : "form");
  }, []);

  const remember = (t: Saved) => {
    const next = [t, ...readSaved().filter((s) => s.id !== t.id)];
    saveTickets(next);
    setSaved(next);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Техническая поддержка"
        className="fixed bottom-5 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full border border-border bg-primary text-primary-foreground shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-3 bottom-24 z-[70] flex max-h-[70vh] flex-col overflow-hidden rounded-3xl border border-border bg-background/95 shadow-[0_20px_70px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:inset-x-auto sm:right-5 sm:w-[380px]"
          >
            <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
              {view !== "list" && saved.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActive(null);
                    setView("list");
                  }}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Назад"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div className="min-w-0">
                <p className="text-[0.6rem] tracking-[0.28em] text-muted-foreground">ПОДДЕРЖКА</p>
                <p className="truncate text-sm text-foreground">SCIRENA · помощь по билетам</p>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto">
              {view === "list" && (
                <TicketList
                  saved={saved}
                  onOpen={(t) => {
                    setActive(t);
                    setView("chat");
                  }}
                  onNew={() => setView("form")}
                  onRestore={() => setView("restore")}
                />
              )}
              {view === "form" && (
                <NewTicketForm
                  onCreated={(t) => {
                    remember(t);
                    setActive(t);
                    setView("chat");
                  }}
                  onRestore={() => setView("restore")}
                />
              )}
              {view === "restore" && (
                <RestoreForm
                  onFound={(list) => {
                    list.forEach(remember);
                    setView("list");
                    qc.invalidateQueries({ queryKey: ["support-thread"] });
                  }}
                />
              )}
              {view === "chat" && active && <Chat ticket={active} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TicketList({
  saved,
  onOpen,
  onNew,
  onRestore,
}: {
  saved: Saved[];
  onOpen: (t: Saved) => void;
  onNew: () => void;
  onRestore: () => void;
}) {
  return (
    <div className="space-y-3 p-4">
      <p className="text-[0.6rem] tracking-[0.22em] text-muted-foreground">ВАШИ ОБРАЩЕНИЯ</p>
      {saved.map((t) => (
        <TicketRow key={t.id} ticket={t} onOpen={() => onOpen(t)} />
      ))}
      <button
        type="button"
        onClick={onNew}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-[0.65rem] font-semibold tracking-[0.18em] text-primary-foreground transition-opacity hover:opacity-90"
      >
        НОВОЕ ОБРАЩЕНИЕ
      </button>
      <button
        type="button"
        onClick={onRestore}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[0.6rem] tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" /> НАЙТИ ПО EMAIL
      </button>
    </div>
  );
}

function TicketRow({ ticket, onOpen }: { ticket: Saved; onOpen: () => void }) {
  const fetchThread = useServerFn(getSupportThread);
  const { data } = useQuery({
    queryKey: ["support-thread", ticket.id],
    queryFn: () => fetchThread({ data: { ticketId: ticket.id, accessCode: ticket.code } }),
    retry: false,
  });
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-border bg-secondary/30 p-3 text-left transition-colors hover:border-foreground/30"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm text-foreground">
          {data?.ticket.subject || "Обращение"}
        </span>
        <span className="shrink-0 text-[0.55rem] tracking-[0.18em] text-muted-foreground">
          {STATUS_LABEL[data?.ticket.status ?? "new"]}
        </span>
      </div>
      <p className="mt-1 text-[0.65rem] text-muted-foreground">
        {data ? new Date(data.ticket.created_at).toLocaleDateString("ru-RU") : "…"} · код{" "}
        {ticket.code}
      </p>
    </button>
  );
}

function NewTicketForm({
  onCreated,
  onRestore,
}: {
  onCreated: (t: Saved) => void;
  onRestore: () => void;
}) {
  const create = useServerFn(createSupportTicket);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () => create({ data: { name, email, message } }),
    onSuccess: (res) => {
      toast.success(`Обращение создано. Код доступа: ${res.accessCode}`);
      onCreated({ id: res.ticket.id, code: res.accessCode });
    },
    onError: (e: Error) => toast.error(e.message || "Не удалось отправить"),
  });

  return (
    <form
      className="space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div>
        <label className={labelCls}>ИМЯ</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className={labelCls}>EMAIL</label>
        <input
          type="email"
          className={inputCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className={labelCls}>ВОПРОС</label>
        <textarea
          className={`${inputCls} min-h-[110px] resize-none`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-[0.65rem] font-semibold tracking-[0.18em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {mutation.isPending ? "ОТПРАВКА…" : "ОТПРАВИТЬ"}
      </button>
      <button
        type="button"
        onClick={onRestore}
        className="flex w-full items-center justify-center gap-2 text-[0.6rem] tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" /> У МЕНЯ УЖЕ ЕСТЬ ОБРАЩЕНИЕ
      </button>
    </form>
  );
}

function RestoreForm({ onFound }: { onFound: (list: Saved[]) => void }) {
  const find = useServerFn(findSupportTickets);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const mutation = useMutation({
    mutationFn: () => find({ data: { email, accessCode: code } }),
    onSuccess: (res) => {
      toast.success(`Найдено обращений: ${res.length}`);
      onFound(res.map((t) => ({ id: t.id, code: t.accessCode })));
    },
    onError: (e: Error) => toast.error(e.message || "Ничего не найдено"),
  });

  return (
    <form
      className="space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
        Введите email и код доступа, который вы получили при создании обращения — мы восстановим всю
        переписку.
      </p>
      <div>
        <label className={labelCls}>EMAIL</label>
        <input
          type="email"
          className={inputCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className={labelCls}>КОД ДОСТУПА</label>
        <input
          className={`${inputCls} uppercase tracking-[0.3em]`}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-[0.65rem] font-semibold tracking-[0.18em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {mutation.isPending ? "ПОИСК…" : "НАЙТИ ОБРАЩЕНИЯ"}
      </button>
    </form>
  );
}

function Chat({ ticket }: { ticket: Saved }) {
  const fetchThread = useServerFn(getSupportThread);
  const send = useServerFn(sendSupportMessage);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const thread = useQuery({
    queryKey: ["support-thread", ticket.id],
    queryFn: () => fetchThread({ data: { ticketId: ticket.id, accessCode: ticket.code } }),
    refetchInterval: 4000,
    retry: false,
  });

  const messages = useMemo(() => thread.data?.messages ?? [], [thread.data]);
  const closed = thread.data?.ticket.status === "closed";

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const mutation = useMutation({
    mutationFn: (body: string) =>
      send({ data: { ticketId: ticket.id, accessCode: ticket.code, body } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["support-thread", ticket.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Не удалось отправить"),
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2">
        <span className="text-[0.6rem] tracking-[0.18em] text-muted-foreground">
          СТАТУС: {STATUS_LABEL[thread.data?.ticket.status ?? "new"]}
        </span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(ticket.code);
            toast.success("Код доступа скопирован");
          }}
          className="flex items-center gap-1 text-[0.6rem] tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          <Copy className="h-3 w-3" /> {ticket.code}
        </button>
      </div>

      <div className="min-h-[220px] flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
              m.sender === "admin"
                ? "border border-border bg-secondary/50 text-foreground"
                : "ml-auto bg-primary text-primary-foreground"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{m.body}</p>
            <p className="mt-1 text-[0.55rem] opacity-60">
              {new Date(m.created_at).toLocaleString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {closed ? (
        <div className="flex items-center gap-2 border-t border-border/60 px-4 py-3 text-[0.65rem] text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Обращение закрыто. Переписка доступна только для просмотра.
        </div>
      ) : (
        <form
          className="flex items-end gap-2 border-t border-border/60 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) mutation.mutate(text.trim());
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Сообщение…"
            rows={1}
            className={`${inputCls} max-h-28 min-h-[42px] resize-none`}
          />
          <button
            type="submit"
            disabled={mutation.isPending || !text.trim()}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
            aria-label="Отправить"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
}
