import { createServerFn } from "@tanstack/react-start";

export type SupportTicket = {
  id: string;
  name: string;
  email: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  sender: string;
  body: string;
  created_at: string;
};

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export const createSupportTicket = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string; email: string; message: string }) => {
    const name = clean(input?.name, 80);
    const email = clean(input?.email, 160).toLowerCase();
    const message = clean(input?.message, 4000);
    if (name.length < 2) throw new Error("Укажите имя");
    if (!isEmail(email)) throw new Error("Укажите корректный email");
    if (message.length < 3) throw new Error("Опишите ваш вопрос");
    return { name, email, message };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const accessCode = Array.from({ length: 6 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 32)),
    ).join("");

    const { data: ticket, error } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        name: data.name,
        email: data.email,
        subject: data.message.slice(0, 90),
        status: "new",
        access_code: accessCode,
      })
      .select("id, name, email, subject, status, created_at, updated_at")
      .single();
    if (error || !ticket) throw new Error("Не удалось создать обращение");

    const { error: msgError } = await supabaseAdmin
      .from("support_messages")
      .insert({ ticket_id: ticket.id, sender: "client", body: data.message });
    if (msgError) throw new Error("Не удалось сохранить сообщение");

    return { ticket: ticket as SupportTicket, accessCode };
  });

async function loadTicket(ticketId: string, accessCode: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: ticket } = await supabaseAdmin
    .from("support_tickets")
    .select("id, name, email, subject, status, access_code, created_at, updated_at")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket || ticket.access_code !== accessCode) throw new Error("Обращение не найдено");
  const { access_code: _code, ...safe } = ticket;
  return { supabaseAdmin, ticket: safe as SupportTicket };
}

export const getSupportThread = createServerFn({ method: "POST" })
  .inputValidator((input: { ticketId: string; accessCode: string }) => ({
    ticketId: clean(input?.ticketId, 64),
    accessCode: clean(input?.accessCode, 12).toUpperCase(),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin, ticket } = await loadTicket(data.ticketId, data.accessCode);
    const { data: messages } = await supabaseAdmin
      .from("support_messages")
      .select("id, ticket_id, sender, body, created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    return { ticket, messages: (messages ?? []) as SupportMessage[] };
  });

export const sendSupportMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { ticketId: string; accessCode: string; body: string }) => {
    const body = clean(input?.body, 4000);
    if (body.length < 1) throw new Error("Пустое сообщение");
    return {
      ticketId: clean(input?.ticketId, 64),
      accessCode: clean(input?.accessCode, 12).toUpperCase(),
      body,
    };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin, ticket } = await loadTicket(data.ticketId, data.accessCode);
    if (ticket.status === "closed") throw new Error("Обращение закрыто");
    const { error } = await supabaseAdmin
      .from("support_messages")
      .insert({ ticket_id: ticket.id, sender: "client", body: data.body });
    if (error) throw new Error("Не удалось отправить сообщение");
    await supabaseAdmin
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticket.id);
    return { ok: true };
  });

export const findSupportTickets = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; accessCode: string }) => {
    const email = clean(input?.email, 160).toLowerCase();
    const accessCode = clean(input?.accessCode, 12).toUpperCase();
    if (!isEmail(email)) throw new Error("Укажите корректный email");
    if (accessCode.length < 4) throw new Error("Укажите код доступа");
    return { email, accessCode };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("support_tickets")
      .select("id, name, email, subject, status, access_code, created_at, updated_at")
      .eq("email", data.email)
      .order("created_at", { ascending: false });

    const owned = (rows ?? []).filter((r) => r.access_code === data.accessCode);
    if (owned.length === 0) throw new Error("Обращения с таким email и кодом не найдены");
    return owned.map(({ access_code, ...rest }) => ({
      ...(rest as SupportTicket),
      accessCode: access_code as string,
    }));
  });
