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

async function rpc(fn: string, args: Record<string, unknown>) {
  const { publicServerClient } = await import("./db.server");
  const { data, error } = await publicServerClient().rpc(fn, args);
  if (error) {
    console.error(`[support] ${fn} failed: ${error.message}`);
    throw new Error("Сервис поддержки временно недоступен");
  }
  return (data ?? {}) as Record<string, any>;
}

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
    const res = await rpc("support_create_ticket", {
      p_name: data.name,
      p_email: data.email,
      p_message: data.message,
    });
    if (!res["ok"]) throw new Error("Не удалось создать обращение");
    return { ticket: res["ticket"] as SupportTicket, accessCode: res["accessCode"] as string };
  });

export const getSupportThread = createServerFn({ method: "POST" })
  .inputValidator((input: { ticketId: string; accessCode: string }) => ({
    ticketId: clean(input?.ticketId, 64),
    accessCode: clean(input?.accessCode, 12).toUpperCase(),
  }))
  .handler(async ({ data }) => {
    const res = await rpc("support_get_thread", {
      p_ticket_id: data.ticketId,
      p_code: data.accessCode,
    });
    if (!res["ok"]) throw new Error("Обращение не найдено");
    return {
      ticket: res["ticket"] as SupportTicket,
      messages: (res["messages"] ?? []) as SupportMessage[],
    };
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
    const res = await rpc("support_send_message", {
      p_ticket_id: data.ticketId,
      p_code: data.accessCode,
      p_body: data.body,
    });
    if (!res["ok"]) {
      throw new Error(res["error"] === "closed" ? "Обращение закрыто" : "Не удалось отправить сообщение");
    }
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
    const res = await rpc("support_find_tickets", {
      p_email: data.email,
      p_code: data.accessCode,
    });
    if (!res["ok"]) throw new Error("Обращения с таким email и кодом не найдены");
    return (res["tickets"] ?? []) as (SupportTicket & { accessCode: string })[];
  });
