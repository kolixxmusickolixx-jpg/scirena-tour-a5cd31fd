import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Send, ArrowLeft, Mail, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 focus:bg-secondary/60";

const STATUSES = [
  { id: "new", label: "Новое" },
  { id: "in_progress", label: "В работе" },
  { id: "closed", label: "Закрыто" },
];
const statusLabel = (s: string) => STATUSES.find((x) => x.id === s)?.label ?? s;

type Ticket = {
  id: string;
  name: string;
  email: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export function SupportTab() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const tickets = useQuery({
    queryKey: ["admin", "support"],
    refetchInterval: 8000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, name, email, subject, status, created_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Ticket[];
    },
  });

  const rows = useMemo(
    () => (tickets.data ?? []).filter((t) => filter === "all" || t.status === filter),
    [tickets.data, filter],
  );

  const active = (tickets.data ?? []).find((t) => t.id === activeId) ?? null;

  if (active) {
    return <AdminChat ticket={active} onBack={() => setActiveId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[{ id: "all", label: "Все" }, ...STATUSES].map((s) => (
          <button
            key={s.id}
            onClick={() => setFilter(s.id)}
            className={`rounded-full px-3.5 py-1.5 text-[0.6rem] tracking-[0.2em] transition-colors ${
              filter === s.id
                ? "bg-foreground/10 text-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label.toUpperCase()}
          </button>
        ))}
      </div>

      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center text-[0.65rem] tracking-[0.25em] text-muted-foreground">
          ОБРАЩЕНИЙ НЕТ
        </div>
      )}

      {rows.map((t) => (
        <button
          key={t.id}
          onClick={() => setActiveId(t.id)}
          className="glass block w-full rounded-2xl p-5 text-left transition-colors hover:border-foreground/30"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-base font-bold">{t.name}</p>
            <span className="rounded-full bg-secondary px-3 py-1 text-[0.55rem] tracking-[0.2em] text-muted-foreground">
              {statusLabel(t.status).toUpperCase()}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{t.subject}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-[0.6rem] tracking-[0.16em] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mail size={12} /> {t.email}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} /> {new Date(t.created_at).toLocaleString("ru-RU")}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function AdminChat({ ticket, onBack }: { ticket: Ticket; onBack: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const closed = ticket.status === "closed";

  const messages = useQuery({
    queryKey: ["admin", "support", ticket.id],
    refetchInterval: 4000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("id, sender, body, created_at")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.data?.length]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase
        .from("support_messages")
        .insert({ ticket_id: ticket.id, sender: "admin", body });
      if (error) throw error;
      await supabase
        .from("support_tickets")
        .update({ status: ticket.status === "new" ? "in_progress" : ticket.status })
        .eq("id", ticket.id);
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["admin", "support"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("support_tickets").update({ status }).eq("id", ticket.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Статус обновлён");
      qc.invalidateQueries({ queryKey: ["admin", "support"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass flex max-h-[75vh] flex-col rounded-2xl">
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 p-4">
        <button
          onClick={onBack}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Назад"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold">{ticket.name}</p>
          <p className="truncate text-[0.6rem] tracking-[0.16em] text-muted-foreground">
            {ticket.email} · {new Date(ticket.created_at).toLocaleString("ru-RU")}
          </p>
        </div>
        <select
          value={ticket.status}
          onChange={(e) => setStatus.mutate(e.target.value)}
          className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[0.65rem] tracking-[0.16em] text-foreground outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-[220px] flex-1 space-y-2.5 overflow-y-auto p-4">
        {(messages.data ?? []).map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
              m.sender === "admin"
                ? "ml-auto bg-primary text-primary-foreground"
                : "border border-border bg-secondary/50 text-foreground"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{m.body}</p>
            <p className="mt-1 text-[0.55rem] opacity-60">
              {new Date(m.created_at).toLocaleString("ru-RU")}
            </p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {closed ? (
        <div className="flex items-center gap-2 border-t border-border/60 p-4 text-[0.65rem] text-muted-foreground">
          <Lock size={14} /> Обращение закрыто — только просмотр.
        </div>
      ) : (
        <form
          className="flex items-end gap-2 border-t border-border/60 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) send.mutate(text.trim());
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            placeholder="Ответ клиенту…"
            className={`${inputCls} max-h-32 min-h-[42px] resize-none`}
          />
          <button
            type="submit"
            disabled={send.isPending || !text.trim()}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
            aria-label="Отправить"
          >
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
