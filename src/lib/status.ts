import type { BookingStatus, PaymentKind, PaymentMethod, PaymentStatus } from "./types";

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending_payment: "Pending payment",
  pending_approval: "Awaiting approval",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
  expired: "Expired",
  no_show: "No-show",
};

/** Tailwind classes for status chips + calendar blocks. */
export const BOOKING_STATUS_STYLE: Record<BookingStatus, { chip: string; block: string; dot: string }> = {
  pending_payment: { chip: "bg-amber-100 text-amber-900 ring-amber-300", block: "bg-amber-50 border-amber-400 text-amber-950", dot: "bg-amber-500" },
  pending_approval: { chip: "bg-sky-100 text-sky-900 ring-sky-300", block: "bg-sky-50 border-sky-400 text-sky-950", dot: "bg-sky-500" },
  confirmed: { chip: "bg-emerald-100 text-emerald-900 ring-emerald-300", block: "bg-emerald-50 border-emerald-500 text-emerald-950", dot: "bg-emerald-600" },
  completed: { chip: "bg-stone-200 text-stone-800 ring-stone-300", block: "bg-stone-100 border-stone-400 text-stone-800", dot: "bg-stone-500" },
  cancelled: { chip: "bg-rose-100 text-rose-900 ring-rose-300", block: "bg-rose-50 border-rose-300 text-rose-900 line-through", dot: "bg-rose-500" },
  declined: { chip: "bg-rose-100 text-rose-900 ring-rose-300", block: "bg-rose-50 border-rose-300 text-rose-900 line-through", dot: "bg-rose-500" },
  expired: { chip: "bg-zinc-100 text-zinc-600 ring-zinc-300", block: "bg-zinc-50 border-zinc-300 text-zinc-500 line-through", dot: "bg-zinc-400" },
  no_show: { chip: "bg-orange-100 text-orange-900 ring-orange-300", block: "bg-orange-50 border-orange-400 text-orange-900", dot: "bg-orange-500" },
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  awaiting_deposit: "Deposit pending",
  not_required: "No deposit required",
  deposit_received: "Deposit recorded as received",
  paid_in_full: "Paid in full (recorded)",
  refunded: "Refunded (recorded)",
};

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  deposit: "Deposit",
  balance: "Balance",
  refund: "Refund",
  other: "Other",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  card: "Card (in salon)",
  other: "Other",
};
