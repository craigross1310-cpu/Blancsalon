import type { DepositType } from "./core/deposit";

export type BookingStatus =
  | "pending_payment"
  | "pending_approval"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "declined"
  | "expired"
  | "no_show";

export type PaymentStatus = "awaiting_deposit" | "not_required" | "deposit_received" | "paid_in_full" | "refunded";

export type PaymentKind = "deposit" | "balance" | "refund" | "other";
export type PaymentMethod = "bank_transfer" | "cash" | "card" | "other";

/** Statuses that hold a slot in the diary. Mirrors the DB exclusion constraint. */
export const DIARY_STATUSES: BookingStatus[] = ["pending_payment", "pending_approval", "confirmed", "completed", "no_show"];

export interface Treatment {
  id: string;
  slug: string;
  category: string;
  name: string;
  summary: string;
  description: string;
  pricePence: number;
  priceNote: string;
  durationMin: number;
  depositType: DepositType;
  depositFixedPence: number;
  depositPercent: number;
  preparationInfo: string;
  aftercareInfo: string;
  imageUrl: string | null;
  active: boolean;
  onlineBooking: boolean;
  featured: boolean;
  sortOrder: number;
  reviewNote: string;
}

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  notes: string;
  anonymisedAt: Date | null;
  createdAt: Date;
}

export interface Booking {
  id: string;
  reference: string;
  accessToken: string;
  customerId: string;
  treatmentId: string | null;
  treatmentName: string;
  treatmentPricePence: number;
  durationMin: number;
  depositType: DepositType;
  depositFixedPence: number;
  depositPercent: number;
  depositDuePence: number;
  balanceDuePence: number;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentDueAt: Date | null;
  source: "online" | "admin";
  customerNotes: string;
  internalNotes: string;
  policyAgreedAt: Date | null;
  policyVersion: string | null;
  cancellationRequestedAt: Date | null;
  cancellationReason: string;
  reminderSentAt: Date | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  /** Net amount recorded as received (payments minus refunds). */
  paidPence: number;
  /** Treatment price minus net amount recorded. */
  outstandingPence: number;
}

export interface Payment {
  id: string;
  bookingId: string;
  kind: PaymentKind;
  amountPence: number;
  method: PaymentMethod;
  receivedOn: string;
  notes: string;
  recordedByName: string;
  createdAt: Date;
  bookingReference?: string;
  customerName?: string;
  treatmentName?: string;
}

export interface OpeningDay {
  weekday: number;
  isOpen: boolean;
  open: string;
  close: string;
  breaks: { start: string; end: string }[];
}

export interface TimeBlock {
  id: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
}

export interface BookingEvent {
  id: string;
  event: string;
  detail: string;
  actor: string;
  createdAt: Date;
}

export interface NotificationRecord {
  id: string;
  bookingId: string | null;
  channel: "email" | "sms" | "whatsapp";
  audience: "customer" | "owner";
  template: string;
  recipient: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  status: "sent" | "failed" | "logged" | "skipped";
  provider: string;
  error: string | null;
  createdAt: Date;
  bookingReference?: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "owner" | "staff";
}
