import { formatGBP } from "../core/money";
import { fmtDateTime, fmtDuration } from "../core/time";
import type { AllSettings } from "../settings-schema";
import { isPlaceholder } from "../settings-schema";
import type { Booking } from "../types";

export interface RenderedMessage {
  subject: string;
  text: string;
  html: string;
}

export type CustomerTemplate =
  | "request_received"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "expired"
  | "reminder"
  | "rescheduled";

export type OwnerTemplate = "owner_new_request" | "owner_cancellation_request" | "owner_confirmed";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Ctx {
  booking: Booking;
  settings: AllSettings;
  bookingUrl: string;
  adminUrl: string;
  reason?: string;
  previousStart?: Date;
}

function summaryRows(b: Booking): [string, string][] {
  const rows: [string, string][] = [
    ["Reference", b.reference],
    ["Treatment", b.treatmentName],
    ["When", fmtDateTime(b.startsAt)],
    ["Duration", fmtDuration(b.durationMin)],
    ["Treatment price", formatGBP(b.treatmentPricePence)],
  ];
  if (b.depositDuePence > 0) {
    rows.push(["Deposit", formatGBP(b.depositDuePence)]);
    rows.push(["Balance due at appointment", formatGBP(b.balanceDuePence)]);
  } else {
    rows.push(["Deposit", "Not required"]);
  }
  return rows;
}

export function bankDetailsRows(s: AllSettings, reference: string): [string, string][] {
  const p = s.payment;
  const rows: [string, string][] = [];
  if (p.showAccountName && p.accountName) rows.push(["Account name", p.accountName]);
  if (p.showBankName && p.bankName) rows.push(["Bank", p.bankName]);
  if (p.showSortCode && p.sortCode) rows.push(["Sort code", p.sortCode]);
  if (p.showAccountNumber && p.accountNumber) rows.push(["Account number", p.accountNumber]);
  rows.push(["Payment reference", reference]);
  return rows;
}

function table(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
${rows
  .map(
    ([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #e9dfd0;color:#7a6a58;font-size:13px;letter-spacing:.04em;text-transform:uppercase;width:45%">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #e9dfd0;color:#14110f;font-size:15px;text-align:right">${esc(v)}</td></tr>`
  )
  .join("\n")}
</table>`;
}

function textTable(rows: [string, string][]): string {
  return rows.map(([k, v]) => `${k}: ${v}`).join("\n");
}

function button(href: string, label: string): string {
  return `<p style="margin:28px 0"><a href="${esc(href)}" style="display:inline-block;background:#14110f;color:#f3e7d3;text-decoration:none;padding:14px 28px;font-size:13px;letter-spacing:.18em;text-transform:uppercase">${esc(label)}</a></p>`;
}

function layout(s: AllSettings, title: string, inner: string): string {
  const b = s.business;
  const contact = [b.phone, b.email].filter((x) => x && !isPlaceholder(x)).map(esc).join(" · ");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f4eee5;font-family:Helvetica,Arial,sans-serif;color:#14110f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4eee5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fffdf9">
<tr><td style="background:#0d0c0b;padding:34px 32px;text-align:center">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:34px;letter-spacing:.32em;color:#e9e4dc;font-weight:700">BLANC.</div>
<div style="margin-top:8px;font-size:10px;letter-spacing:.4em;color:#c9a96e;text-transform:uppercase">${esc(b.tagline)}</div>
</td></tr>
<tr><td style="padding:36px 32px 12px">
<h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;margin:0 0 18px;color:#14110f">${esc(title)}</h1>
${inner}
</td></tr>
<tr><td style="padding:24px 32px 32px;border-top:1px solid #e9dfd0;font-size:12px;color:#7a6a58;line-height:1.6">
${esc(b.name)}${contact ? `<br>${contact}` : ""}<br>Instagram: @${esc(b.instagramHandle)}
</td></tr></table></td></tr></table></body></html>`;
}

const p = (s: string) => `<p style="font-size:15px;line-height:1.65;margin:0 0 14px;color:#2b2520">${s}</p>`;

export function renderCustomer(template: CustomerTemplate, c: Ctx): RenderedMessage {
  const { booking: b, settings: s } = c;
  const first = esc(b.customerName.split(" ")[0] || b.customerName);
  const firstText = b.customerName.split(" ")[0] || b.customerName;
  const summary = summaryRows(b);

  switch (template) {
    case "request_received": {
      if (b.depositDuePence > 0) {
        const bank = bankDetailsRows(s, b.reference);
        const due = b.paymentDueAt ? fmtDateTime(b.paymentDueAt) : "";
        const subject = `Booking request received — deposit details (${b.reference})`;
        const html = layout(
          s,
          "We've received your booking request",
          p(`Hi ${first}, thank you for choosing BLANC. Your requested time is being held for you while you pay your deposit.`) +
            p(`<strong>Your appointment is not confirmed yet.</strong> Once we have checked that your deposit has arrived, we'll confirm your booking by email.`) +
            table(summary) +
            `<h2 style="font-family:Georgia,serif;font-weight:400;font-size:19px;margin:26px 0 4px">Pay your ${esc(formatGBP(b.depositDuePence))} deposit by bank transfer</h2>` +
            table(bank) +
            p(esc(s.payment.referenceInstructions)) +
            (due ? p(`<strong>Please pay by ${esc(due)}.</strong> If the deposit hasn't been received by then, the request will be released so the time can be offered to other clients.`) : "") +
            button(c.bookingUrl, "View your booking")
        );
        const text = `Hi ${firstText},\n\nThank you for choosing BLANC. Your requested time is being held while you pay your deposit. Your appointment is NOT confirmed until we have checked your deposit has arrived.\n\n${textTable(summary)}\n\nPAY YOUR ${formatGBP(b.depositDuePence)} DEPOSIT BY BANK TRANSFER\n${textTable(bank)}\n\n${s.payment.referenceInstructions}\n${due ? `\nPlease pay by ${due}. Unpaid requests are released after this time.\n` : ""}\nView your booking: ${c.bookingUrl}\n`;
        return { subject, html, text };
      }
      const subject = `Booking request received (${b.reference})`;
      const html = layout(
        s,
        "We've received your booking request",
        p(`Hi ${first}, thank you for choosing BLANC. No deposit is needed for this treatment.`) +
          p(`<strong>Your appointment is not confirmed yet</strong> — we'll review your request and confirm by email shortly.`) +
          table(summary) +
          button(c.bookingUrl, "View your booking")
      );
      const text = `Hi ${firstText},\n\nThank you for choosing BLANC. No deposit is needed for this treatment. Your appointment is not confirmed yet — we'll confirm by email shortly.\n\n${textTable(summary)}\n\nView your booking: ${c.bookingUrl}\n`;
      return { subject, html, text };
    }
    case "confirmed": {
      const subject = `Your BLANC appointment is confirmed — ${fmtDateTime(b.startsAt)}`;
      const balance = b.outstandingPence;
      const html = layout(
        s,
        "Your appointment is confirmed",
        p(`Hi ${first}, you're booked in. We look forward to seeing you.`) +
          table([...summary, ["Recorded as paid", formatGBP(b.paidPence)], ["Remaining balance", formatGBP(balance)]]) +
          p(`Need to change something? Please get in touch as early as possible — see our booking policies on your booking page.`) +
          button(c.bookingUrl, "View your booking") +
          p(`<a href="${esc(c.bookingUrl.replace(/\/booking\/([^?]+)\?t=/, "/api/bookings/$1/ics?t="))}" style="color:#9c7a43">Add this appointment to your calendar</a>`)
      );
      const text = `Hi ${firstText},\n\nYour BLANC appointment is confirmed.\n\n${textTable(summary)}\nRecorded as paid: ${formatGBP(b.paidPence)}\nRemaining balance: ${formatGBP(balance)}\n\nView your booking: ${c.bookingUrl}\n`;
      return { subject, html, text };
    }
    case "declined":
    case "cancelled":
    case "expired": {
      const titles = {
        declined: "We're unable to accept your booking request",
        cancelled: "Your appointment has been cancelled",
        expired: "Your booking request has expired",
      } as const;
      const intro = {
        declined: `Hi ${first}, unfortunately we're unable to accept your booking request for the time below.`,
        cancelled: `Hi ${first}, your appointment below has been cancelled.`,
        expired: `Hi ${first}, we didn't receive your deposit before the payment deadline, so your requested time has been released. If you've already paid, please reply to this email with your booking reference and we'll look into it straight away.`,
      } as const;
      const subject = `${titles[template]} (${b.reference})`;
      const html = layout(
        s,
        titles[template],
        p(intro[template]) +
          (c.reason ? p(`<em>${esc(c.reason)}</em>`) : "") +
          table(summary) +
          p(`You're welcome to book another time online or contact us on Instagram @${esc(s.business.instagramHandle)}.`)
      );
      const text = `${intro[template].replace(/<[^>]+>/g, "").replace(first, firstText)}\n${c.reason ? `\n${c.reason}\n` : ""}\n${textTable(summary)}\n`;
      return { subject, html, text };
    }
    case "reminder": {
      const subject = `Reminder: your BLANC appointment ${fmtDateTime(b.startsAt)}`;
      const html = layout(
        s,
        "See you soon",
        p(`Hi ${first}, this is a friendly reminder of your upcoming appointment.`) +
          table([...summary, ["Remaining balance", formatGBP(b.outstandingPence)]]) +
          button(c.bookingUrl, "View your booking")
      );
      const text = `Hi ${firstText},\n\nA reminder of your upcoming BLANC appointment.\n\n${textTable(summary)}\nRemaining balance: ${formatGBP(b.outstandingPence)}\n\n${c.bookingUrl}\n`;
      return { subject, html, text };
    }
    case "rescheduled": {
      const subject = `Your BLANC appointment has moved — ${fmtDateTime(b.startsAt)}`;
      const prev = c.previousStart ? fmtDateTime(c.previousStart) : "";
      const html = layout(
        s,
        "Your appointment time has changed",
        p(`Hi ${first}, your appointment has been moved${prev ? ` from <s>${esc(prev)}</s>` : ""} to the new time below.`) +
          table(summary) +
          p(`If the new time doesn't work for you, please get in touch.`) +
          button(c.bookingUrl, "View your booking")
      );
      const text = `Hi ${firstText},\n\nYour appointment has been moved${prev ? ` from ${prev}` : ""}.\n\n${textTable(summary)}\n\n${c.bookingUrl}\n`;
      return { subject, html, text };
    }
  }
}

export function renderOwner(template: OwnerTemplate, c: Ctx): RenderedMessage {
  const { booking: b, settings: s } = c;
  const rows: [string, string][] = [
    ["Client", b.customerName],
    ["Email", b.customerEmail],
    ["Mobile", b.customerPhone],
    ...summaryRows(b),
  ];
  if (b.customerNotes) rows.push(["Client notes", b.customerNotes]);
  switch (template) {
    case "owner_new_request": {
      const dep = b.depositDuePence > 0 ? `Deposit pending: ${formatGBP(b.depositDuePence)}` : "No deposit required";
      const subject = `New booking request: ${b.customerName} — ${b.treatmentName} (${b.reference})`;
      const html = layout(
        s,
        "New booking request",
        p(`${esc(dep)}. Check your bank for a transfer with reference <strong>${esc(b.reference)}</strong>, then confirm the booking in your dashboard.`) +
          table(rows) +
          button(c.adminUrl, "Open in dashboard")
      );
      return { subject, html, text: `New booking request\n${dep}\n\n${textTable(rows)}\n\n${c.adminUrl}\n` };
    }
    case "owner_cancellation_request": {
      const subject = `Cancellation request: ${b.customerName} (${b.reference})`;
      const html = layout(
        s,
        "Cancellation request",
        p(`${esc(b.customerName)} has asked to cancel the appointment below. Nothing has been changed yet — review it against your cancellation policy in the dashboard.`) +
          (c.reason ? p(`Reason given: <em>${esc(c.reason)}</em>`) : "") +
          table(rows) +
          button(c.adminUrl, "Review in dashboard")
      );
      return { subject, html, text: `Cancellation request\n${c.reason ? `Reason: ${c.reason}\n` : ""}\n${textTable(rows)}\n\n${c.adminUrl}\n` };
    }
    case "owner_confirmed": {
      const subject = `Booking confirmed: ${b.customerName} — ${fmtDateTime(b.startsAt)}`;
      const html = layout(s, "Booking confirmed", p("This booking is now confirmed and in your diary.") + table(rows) + button(c.adminUrl, "Open in dashboard"));
      return { subject, html, text: `Booking confirmed\n\n${textTable(rows)}\n\n${c.adminUrl}\n` };
    }
  }
}
