/**
 * Delivery channels. Email is live; SMS / WhatsApp are deliberately stubbed so
 * they can be added later (e.g. Twilio / WhatsApp Business API) by implementing
 * this interface — templates, the outbox table and the dispatcher already
 * support a `channel` column.
 */
export interface OutgoingMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  fromName: string;
  replyTo?: string;
}

export interface DeliveryResult {
  status: "sent" | "failed" | "logged";
  provider: string;
  providerMessageId?: string;
  error?: string;
}

export interface Channel {
  name: "email" | "sms" | "whatsapp";
  send(msg: OutgoingMessage): Promise<DeliveryResult>;
}

/** Resend (https://resend.com) via its REST API. Falls back to the outbox log when not configured. */
export const emailChannel: Channel = {
  name: "email",
  async send(msg) {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM; // e.g. "bookings@blancsalon.co.uk" on a verified domain
    if (!key || !from) {
      return { status: "logged", provider: "outbox (email not configured)" };
    }
    if (/@(example\.(com|org|net)|[^@]+\.(invalid|demo|test))$/i.test(msg.to)) {
      return { status: "logged", provider: "outbox (sample address — not sent)" };
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${msg.fromName} <${from}>`,
          to: [msg.to],
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok) return { status: "failed", provider: "resend", error: body.message || `HTTP ${res.status}` };
      return { status: "sent", provider: "resend", providerMessageId: body.id };
    } catch (err) {
      return { status: "failed", provider: "resend", error: err instanceof Error ? err.message : String(err) };
    }
  },
};

export const channels: Record<string, Channel> = { email: emailChannel };
