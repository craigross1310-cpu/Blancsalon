/**
 * Business settings. Everything here is editable by the owner in
 * Admin → Settings. Values wrapped in [square brackets] are placeholders that
 * BLANC needs to supply — they are deliberately not invented.
 */

export interface BusinessSettings {
  name: string;
  tagline: string;
  ownerName: string;
  email: string;
  phone: string;
  instagramHandle: string;
  addressLine1: string;
  addressLine2: string;
  town: string;
  postcode: string;
  mapEmbedUrl: string;
  heroIntro: string;
  aboutHeading: string;
  aboutBody: string;
  qualifications: string;
  showPlaceholderNotices: boolean;
}

export interface PaymentSettings {
  accountName: string;
  sortCode: string;
  accountNumber: string;
  bankName: string;
  showAccountName: boolean;
  showSortCode: boolean;
  showAccountNumber: boolean;
  showBankName: boolean;
  referenceInstructions: string;
  /** Hours the customer has to pay the deposit before the request expires. */
  deadlineHours: number;
}

export interface BookingSettings {
  slotIntervalMin: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  bufferMin: number;
  reminderHoursBefore: number;
}

export interface PolicySettings {
  deposit: string;
  cancellation: string;
  rescheduling: string;
  lateArrival: string;
  noShow: string;
  refund: string;
  unpaidExpiry: string;
  version: string;
}

export interface NotificationSettings {
  ownerEmail: string;
  fromName: string;
  replyTo: string;
  customerEmails: boolean;
  ownerNewBooking: boolean;
  ownerCancellationRequest: boolean;
  ownerConfirmation: boolean;
  reminders: boolean;
}

export interface PrivacySettings {
  retentionMonths: number;
}

export interface CalendarSettings {
  /** Secret token in the owner's private calendar-subscription link. */
  feedToken: string;
  includePending: boolean;
}

export interface AllSettings {
  business: BusinessSettings;
  payment: PaymentSettings;
  booking: BookingSettings;
  policies: PolicySettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  calendar: CalendarSettings;
}

export type SettingsKey = keyof AllSettings;

const PH = (s: string) => `[PLACEHOLDER — ${s}]`;

export const DEFAULT_SETTINGS: AllSettings = {
  business: {
    name: "BLANC Salon",
    tagline: "Skin · Aesthetics · Wellbeing",
    ownerName: "",
    email: "",
    phone: "",
    instagramHandle: "blanc_salon_21",
    addressLine1: "",
    addressLine2: "",
    town: "",
    postcode: "",
    mapEmbedUrl: "",
    heroIntro:
      "Advanced skin, aesthetics and wellbeing treatments — from glow facials and needling to Morpheus8 and HIFU. Invest in your skin, body and wellbeing.",
    aboutHeading: "Welcome to BLANC",
    aboutBody: PH(
      "BLANC to supply the brand story: how the salon started, the therapist's background and treatment philosophy"
    ),
    qualifications: PH("BLANC to supply qualifications, training and insurance details"),
    showPlaceholderNotices: true,
  },
  payment: {
    accountName: PH("account holder name"),
    sortCode: "00-00-00",
    accountNumber: "00000000",
    bankName: "",
    showAccountName: true,
    showSortCode: true,
    showAccountNumber: true,
    showBankName: false,
    referenceInstructions:
      "Please use your booking reference as the payment reference so we can match your deposit to your appointment.",
    deadlineHours: 24,
  },
  booking: {
    slotIntervalMin: 15,
    minNoticeHours: 24,
    maxAdvanceDays: 60,
    bufferMin: 15,
    reminderHoursBefore: 24,
  },
  policies: {
    deposit: PH(
      "Deposit policy, e.g. whether deposits are deducted from the treatment price and whether they are refundable"
    ),
    cancellation: PH("Cancellation notice period and what happens to the deposit"),
    rescheduling: PH("How much notice is needed to move an appointment, and how many times"),
    lateArrival: PH("What happens if a client arrives late"),
    noShow: PH("No-show policy"),
    refund: PH("Refund conditions"),
    unpaidExpiry:
      "Booking requests are held for a limited time while the deposit is paid. If the deposit is not received by the deadline shown, the request is automatically released.",
    version: "placeholder-v1",
  },
  notifications: {
    ownerEmail: "",
    fromName: "BLANC Salon",
    replyTo: "",
    customerEmails: true,
    ownerNewBooking: true,
    ownerCancellationRequest: true,
    ownerConfirmation: true,
    reminders: true,
  },
  privacy: {
    retentionMonths: 24,
  },
  calendar: {
    feedToken: "",
    includePending: true,
  },
};

export function isPlaceholder(value: string | undefined | null): boolean {
  return !value || /\[PLACEHOLDER/.test(value);
}
