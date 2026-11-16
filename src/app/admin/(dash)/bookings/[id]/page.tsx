import Link from "next/link";
import { notFound } from "next/navigation";
import {
  attendanceAction,
  cancelAction,
  confirmAction,
  declineAction,
  deletePaymentAction,
  depositAndConfirmAction,
  notesAction,
  recordPaymentAction,
  rescheduleAction,
} from "@/app/admin/actions";
import { Card, Flash, PaymentChip, StatusChip, btn, input, label } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { formatGBP, penceToInput } from "@/lib/core/money";
import { fmtDateLong, fmtDateTime, fmtDuration, fmtTime, localDateOf, localTimeOf } from "@/lib/core/time";
import { getDb } from "@/lib/db/client";
import { customerBookingUrl } from "@/lib/notify";
import { getBooking, listBookingEvents, listBookings, listNotifications, listPayments } from "@/lib/repo";
import { PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/status";

function whatsappLink(phone: string) {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) d = `44${d.slice(1)}`;
  return d.length >= 10 ? `https://wa.me/${d}` : null;
}

function PaymentFields({ amount, today, showKind = false }: { amount: number; today: string; showKind?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {showKind && (
        <div className="col-span-2">
          <label className={label}>Type</label>
          <select name="kind" className={input} defaultValue={amount > 0 ? "balance" : "deposit"}>
            {Object.entries(PAYMENT_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className={label}>Amount (£)</label>
        <input name="amount" inputMode="decimal" className={input} defaultValue={amount > 0 ? penceToInput(amount) : ""} required />
      </div>
      <div>
        <label className={label}>Date received</label>
        <input name="receivedOn" type="date" className={input} defaultValue={today} required />
      </div>
      <div>
        <label className={label}>Method</label>
        <select name="method" className={input} defaultValue="bank_transfer">
          {Object.entries(PAYMENT_METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className={label}>Note (optional)</label>
        <input name="notes" className={input} placeholder="e.g. seen in app" />
      </div>
    </div>
  );
}

export default async function BookingDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const admin = await requireAdmin();
  const db = await getDb();
  const b = await getBooking(db, id);
  if (!b) notFound();
  const [payments, events, emails, history] = await Promise.all([
    listPayments(db, { bookingId: id }),
    listBookingEvents(db, id),
    listNotifications(db, { bookingId: id }),
    listBookings(db, { customerId: b.customerId, order: "desc", limit: 20 }),
  ]);
  const today = localDateOf(new Date());
  const open = ["pending_payment", "pending_approval", "confirmed"].includes(b.status);
  const closed = ["cancelled", "declined", "expired"].includes(b.status);
  const wa = whatsappLink(b.customerPhone);
  const depositShort = b.depositDuePence > 0 && b.paidPence < b.depositDuePence;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/bookings" className="text-xs text-taupe hover:text-ink">← All bookings</Link>
      <div className="mb-6 mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl">{b.customerName}</h1>
          <p className="mt-1 text-sm text-taupe">{b.treatmentName} · {fmtDateTime(b.startsAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-ink px-2.5 py-1 font-mono text-sm tracking-wider text-gold-light">{b.reference}</span>
          <StatusChip status={b.status} />
          <PaymentChip status={b.paymentStatus} />
        </div>
      </div>
      <Flash msg={sp.msg} error={sp.error} />
      {b.cancellationRequestedAt && open && (
        <div className="mb-5 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <strong>Cancellation requested</strong> on {fmtDateTime(b.cancellationRequestedAt)}{b.cancellationReason && <> — “{b.cancellationReason}”</>}. Review against your policy, then cancel or move it below.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Money */}
          <Card title="Payment summary">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <div><dt className="text-xs text-taupe">Treatment price</dt><dd className="font-display text-2xl">{formatGBP(b.treatmentPricePence)}</dd></div>
              <div><dt className="text-xs text-taupe">Deposit required</dt><dd className="font-display text-2xl">{b.depositDuePence ? formatGBP(b.depositDuePence) : "None"}</dd></div>
              <div><dt className="text-xs text-taupe">Recorded as received</dt><dd className="font-display text-2xl text-emerald-800">{formatGBP(b.paidPence)}</dd></div>
              <div><dt className="text-xs text-taupe">Remaining balance</dt><dd className="font-display text-2xl">{formatGBP(closed ? 0 : b.outstandingPence)}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-taupe">
              Deposit rule at time of booking: {b.depositType === "percentage" ? `${b.depositPercent}% of ${formatGBP(b.treatmentPricePence)}` : `${formatGBP(b.depositFixedPence)} fixed`} → {formatGBP(b.depositDuePence)} deposit, {formatGBP(b.balanceDuePence)} balance.
              This is locked in — later price or deposit changes to the treatment don&apos;t affect this booking.
            </p>
            {b.status === "pending_payment" && b.paymentDueAt && (
              <p className="mt-2 text-xs text-amber-800">Deposit deadline: {fmtDateTime(b.paymentDueAt)} — the request is released automatically if no deposit is recorded by then.</p>
            )}
            <h3 className="mt-6 text-xs font-medium uppercase tracking-wider text-taupe">Payments recorded</h3>
            {payments.length ? (
              <ul className="mt-2 divide-y divide-sand text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <span className={p.kind === "refund" ? "text-rose-800" : ""}>{PAYMENT_KIND_LABEL[p.kind]}</span> · {PAYMENT_METHOD_LABEL[p.method]} · {fmtDateLong(p.receivedOn)}
                      <span className="block text-xs text-taupe">Recorded manually by {p.recordedByName || "owner"}{p.notes && ` — ${p.notes}`}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{p.kind === "refund" ? "−" : ""}{formatGBP(p.amountPence)}</span>
                      {admin.role === "owner" && (
                        <form action={deletePaymentAction}>
                          <input type="hidden" name="paymentId" value={p.id} />
                          <input type="hidden" name="bookingId" value={b.id} />
                          <button className="text-xs text-taupe hover:text-rose-700" title="Remove this payment record">Remove</button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-taupe">No payments recorded yet.</p>
            )}
            <p className="mt-4 rounded bg-cream px-3 py-2 text-[0.7rem] text-charcoal/70">
              Payments are recorded by you after checking your own bank account or till. This system does not connect to your bank and does not verify payments itself.
            </p>
          </Card>

          <Card title="Appointment">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-taupe">Treatment</dt><dd>{b.treatmentName}</dd></div>
              <div><dt className="text-xs text-taupe">When</dt><dd>{fmtDateLong(b.startsAt)}, {fmtTime(b.startsAt)}–{fmtTime(b.endsAt)} ({fmtDuration(b.durationMin)})</dd></div>
              <div><dt className="text-xs text-taupe">Booked</dt><dd>{fmtDateTime(b.createdAt)} · {b.source === "online" ? "Online" : "Added by salon"}</dd></div>
              <div><dt className="text-xs text-taupe">Policies agreed</dt><dd>{b.policyAgreedAt ? `${fmtDateTime(b.policyAgreedAt)}` : "—"}</dd></div>
              {b.customerNotes && <div className="sm:col-span-2"><dt className="text-xs text-taupe">Client notes</dt><dd className="whitespace-pre-line rounded bg-cream p-3">{b.customerNotes}</dd></div>}
            </dl>
            <a href={customerBookingUrl(b)} target="_blank" rel="noreferrer" className="mt-4 inline-block text-xs underline">Open the client&apos;s booking page ↗</a>
          </Card>

          <Card title="Internal notes">
            <form action={notesAction} className="space-y-3">
              <input type="hidden" name="id" value={b.id} />
              <textarea name="internalNotes" rows={3} className={input} defaultValue={b.internalNotes} placeholder="Only visible to you" />
              <button className={btn.outline}>Save notes</button>
            </form>
          </Card>

          <Card title="Activity">
            <ol className="space-y-3 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  <div>
                    <p><span className="font-medium capitalize">{e.event.replace(/_/g, " ")}</span>{e.detail && <span className="text-charcoal/80"> — {e.detail}</span>}</p>
                    <p className="text-xs text-taupe">{fmtDateTime(e.createdAt)} · {e.actor}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Emails">
            {emails.length ? (
              <ul className="divide-y divide-sand text-sm">
                {emails.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/admin/notifications/${n.id}`} className="min-w-0 hover:underline">
                      <p className="truncate">{n.subject}</p>
                      <p className="text-xs text-taupe">To {n.audience} · {fmtDateTime(n.createdAt)}</p>
                    </Link>
                    <span className="shrink-0 text-xs capitalize text-taupe">{n.status}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-taupe">No emails yet.</p>}
          </Card>
        </div>

        {/* Actions */}
        <div className="space-y-6">
          <Card title="Contact client">
            <p className="text-sm">{b.customerEmail}<br />{b.customerPhone}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`mailto:${b.customerEmail}?subject=${encodeURIComponent(`Your BLANC booking ${b.reference}`)}`} className={btn.small}>Email</a>
              {b.customerPhone && <a href={`tel:${b.customerPhone.replace(/\s/g, "")}`} className={btn.small}>Call</a>}
              {b.customerPhone && <a href={`sms:${b.customerPhone.replace(/\s/g, "")}`} className={btn.small}>Text</a>}
              {wa && <a href={wa} target="_blank" rel="noreferrer" className={btn.small}>WhatsApp</a>}
            </div>
            {history.length > 1 && <p className="mt-3 text-xs text-taupe">{history.length} bookings with this client · <Link href={`/admin/bookings?status=all&q=${encodeURIComponent(b.customerEmail)}`} className="underline">view history</Link></p>}
          </Card>

          {(b.status === "pending_payment" || b.status === "expired") && b.depositDuePence > 0 && depositShort && (
            <Card title={b.status === "expired" ? "Deposit arrived late?" : "Deposit received?"} className="border-gold">
              <p className="mb-4 text-sm text-charcoal/80">
                Check your bank for <strong>{formatGBP(b.depositDuePence)}</strong> with reference <strong className="font-mono">{b.reference}</strong>. When you&apos;ve seen it, record it here — this confirms the booking and emails the client.
                {b.status === "expired" && " The slot will be re-checked to make sure it's still free."}
              </p>
              <form action={depositAndConfirmAction} className="space-y-4">
                <input type="hidden" name="id" value={b.id} />
                <PaymentFields amount={b.depositDuePence} today={today} />
                <button className={`${btn.gold} w-full`}>Deposit received — confirm booking</button>
              </form>
            </Card>
          )}

          {(b.status === "pending_approval" || (b.status === "pending_payment" && !depositShort)) && (
            <Card title="Approve request" className="border-gold">
              <form action={confirmAction}>
                <input type="hidden" name="id" value={b.id} />
                <button className={`${btn.gold} w-full`}>Confirm booking</button>
              </form>
            </Card>
          )}

          {b.status === "pending_payment" && depositShort && (
            <Card title="Confirm without deposit">
              <form action={confirmAction} className="space-y-3">
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="withoutDeposit" value="true" />
                <p className="text-xs text-taupe">For regular clients or if you&apos;ve agreed something different. The deposit stays outstanding on the record.</p>
                <button className={`${btn.outline} w-full`}>Confirm without deposit</button>
              </form>
            </Card>
          )}

          {["confirmed", "completed", "no_show"].includes(b.status) && (
            <Card title="Record a payment">
              <form action={recordPaymentAction} className="space-y-4">
                <input type="hidden" name="id" value={b.id} />
                <PaymentFields amount={b.outstandingPence} today={today} showKind />
                <button className={`${btn.primary} w-full`}>Record payment</button>
              </form>
            </Card>
          )}

          {["confirmed", "completed", "no_show"].includes(b.status) && (
            <Card title="Attendance">
              <div className="flex gap-2">
                {(["completed", "no_show"] as const).map((o) => (
                  <form key={o} action={attendanceAction} className="flex-1">
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="outcome" value={o} />
                    <button className={`${btn.outline} w-full ${b.status === o ? "!border-ink !bg-ink !text-gold-light" : ""}`}>{o === "completed" ? "Attended" : "No-show"}</button>
                  </form>
                ))}
              </div>
            </Card>
          )}

          {open && (
            <Card title="Move appointment">
              <form action={rescheduleAction} className="space-y-3">
                <input type="hidden" name="id" value={b.id} />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>Date</label><input type="date" name="date" className={input} defaultValue={localDateOf(b.startsAt)} required /></div>
                  <div><label className={label}>Time</label><input type="time" name="time" step={300} className={input} defaultValue={localTimeOf(b.startsAt)} required /></div>
                </div>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="ignoreHours" /> Allow outside working hours</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="notify" defaultChecked /> Email the client about the change</label>
                <button className={`${btn.outline} w-full`}>Move</button>
              </form>
            </Card>
          )}

          {open && (
            <Card title={b.status === "confirmed" ? "Cancel appointment" : "Decline request"}>
              <form action={b.status === "confirmed" ? cancelAction : declineAction} className="space-y-3">
                <input type="hidden" name="id" value={b.id} />
                <div><label className={label}>Message to client (optional)</label><textarea name="reason" rows={2} className={input} defaultValue={b.cancellationReason} /></div>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="notify" defaultChecked /> Email the client</label>
                {b.paidPence > 0 && <p className="text-xs text-amber-800">{formatGBP(b.paidPence)} has been recorded for this booking. If you refund it, record the refund under “Record a payment” first.</p>}
                <button className={`${btn.danger} w-full`}>{b.status === "confirmed" ? "Cancel appointment" : "Decline request"}</button>
              </form>
            </Card>
          )}

          {closed && b.paidPence > 0 && (
            <Card title="Record a refund">
              <form action={recordPaymentAction} className="space-y-4">
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="kind" value="refund" />
                <PaymentFields amount={b.paidPence} today={today} />
                <button className={`${btn.outline} w-full`}>Record refund</button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
