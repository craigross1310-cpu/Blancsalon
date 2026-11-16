import type { Db } from "../db/client";
import type { AllSettings } from "../settings-schema";
import { siteUrl } from "../settings";
import type { Booking } from "../types";
import { channels } from "./channels";
import { renderCustomer, renderOwner, type CustomerTemplate, type OwnerTemplate, type RenderedMessage } from "./templates";

export function customerBookingUrl(b: Booking): string {
  return `${siteUrl()}/booking/${b.id}?t=${encodeURIComponent(b.accessToken)}`;
}

export function adminBookingUrl(b: Booking): string {
  return `${siteUrl()}/admin/bookings/${b.id}`;
}

async function record(
  db: Db,
  args: { booking: Booking; audience: "customer" | "owner"; template: string; to: string; msg: RenderedMessage; settings: AllSettings; skip?: string }
) {
  const channel = channels.email;
  const result = args.skip
    ? { status: "skipped" as const, provider: "", error: args.skip }
    : await channel.send({
        to: args.to,
        subject: args.msg.subject,
        text: args.msg.text,
        html: args.msg.html,
        fromName: args.settings.notifications.fromName || args.settings.business.name,
        replyTo: args.settings.notifications.replyTo || args.settings.business.email || undefined,
      });
  await db.query(
    `insert into notifications (booking_id, channel, audience, template, recipient, subject, body_text, body_html, status, provider, provider_message_id, error, sent_at)
     values ($1, 'email', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, case when $8 = 'sent' then now() else null end)`,
    [
      args.booking.id,
      args.audience,
      args.template,
      args.to || "(no address)",
      args.msg.subject,
      args.msg.text,
      args.msg.html,
      result.status,
      result.provider,
      "providerMessageId" in result ? result.providerMessageId ?? null : null,
      result.error ?? null,
    ]
  );
  return result.status;
}

export async function notifyCustomer(
  db: Db,
  settings: AllSettings,
  template: CustomerTemplate,
  booking: Booking,
  extra: { reason?: string; previousStart?: Date } = {}
) {
  const msg = renderCustomer(template, {
    booking,
    settings,
    bookingUrl: customerBookingUrl(booking),
    adminUrl: adminBookingUrl(booking),
    ...extra,
  });
  let skip: string | undefined;
  if (!settings.notifications.customerEmails) skip = "Customer emails are switched off in settings";
  else if (template === "reminder" && !settings.notifications.reminders) skip = "Reminders are switched off";
  else if (!booking.customerEmail || booking.customerEmail.endsWith("@invalid")) skip = "No customer email address";
  return record(db, { booking, audience: "customer", template, to: booking.customerEmail, msg, settings, skip });
}

export async function notifyOwner(
  db: Db,
  settings: AllSettings,
  template: OwnerTemplate,
  booking: Booking,
  extra: { reason?: string } = {}
) {
  const n = settings.notifications;
  const to = n.ownerEmail || settings.business.email;
  const enabled =
    (template === "owner_new_request" && n.ownerNewBooking) ||
    (template === "owner_cancellation_request" && n.ownerCancellationRequest) ||
    (template === "owner_confirmed" && n.ownerConfirmation);
  const msg = renderOwner(template, {
    booking,
    settings,
    bookingUrl: customerBookingUrl(booking),
    adminUrl: adminBookingUrl(booking),
    ...extra,
  });
  const skip = !enabled ? "Owner notification switched off in settings" : !to ? "No owner email set in settings" : undefined;
  return record(db, { booking, audience: "owner", template, to, msg, settings, skip });
}
