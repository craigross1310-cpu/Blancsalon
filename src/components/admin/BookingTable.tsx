import Link from "next/link";
import { formatGBP } from "@/lib/core/money";
import { fmtDateShort, fmtTime } from "@/lib/core/time";
import type { Booking } from "@/lib/types";
import { PaymentChip, StatusChip } from "./ui";

export function BookingTable({ bookings, empty = "No bookings." }: { bookings: Booking[]; empty?: string }) {
  if (!bookings.length) return <p className="py-6 text-center text-sm text-taupe">{empty}</p>;
  return (
    <ul className="-my-1 divide-y divide-sand">
      {bookings.map((b) => (
        <li key={b.id}>
          <Link href={`/admin/bookings/${b.id}`} className="-mx-2 grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 rounded px-2 py-3 transition hover:bg-cream/60">
            <div className="w-16 text-center">
              <p className="text-[0.65rem] uppercase tracking-wide text-taupe">{fmtDateShort(b.startsAt)}</p>
              <p className="font-display text-lg leading-tight">{fmtTime(b.startsAt)}</p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {b.customerName}
                {b.cancellationRequestedAt && ["confirmed", "pending_payment", "pending_approval"].includes(b.status) && (
                  <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[0.65rem] text-rose-800">Cancellation request</span>
                )}
              </p>
              <p className="truncate text-xs text-taupe">{b.treatmentName} · {b.reference}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 sm:hidden">
                <StatusChip status={b.status} />
              </div>
            </div>
            <div className="text-right">
              <div className="hidden justify-end gap-1.5 sm:flex">
                <StatusChip status={b.status} />
                <PaymentChip status={b.paymentStatus} />
              </div>
              <p className="mt-1 text-xs text-taupe">
                {formatGBP(b.treatmentPricePence)}
                {b.depositDuePence > 0 && <> · dep {formatGBP(b.depositDuePence)}</>}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
