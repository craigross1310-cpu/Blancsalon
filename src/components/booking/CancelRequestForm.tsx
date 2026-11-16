"use client";
import { useActionState, useState } from "react";
import { requestCancellationAction } from "@/app/(site)/booking/[id]/actions";

export function CancelRequestForm({ id, token }: { id: string; token: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(requestCancellationAction, {});
  if (state.ok) return <p className="text-sm text-emerald-800">Thanks — we&apos;ve let the salon know. They&apos;ll be in touch.</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-taupe underline underline-offset-4 hover:text-ink">
        Need to cancel or change this appointment?
      </button>
    );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="token" value={token} />
      <label className="label" htmlFor="reason">Let us know what you need</label>
      <textarea id="reason" name="reason" rows={3} className="field" placeholder="e.g. Could I move to the following week?" required />
      <p className="text-xs text-taupe">This sends a request to the salon — your booking isn&apos;t changed until they reply. Our cancellation policy applies.</p>
      {state.error && <p className="text-sm text-rose-700">{state.error}</p>}
      <button className="btn btn-outline" disabled={pending}>{pending ? "Sending…" : "Send request"}</button>
    </form>
  );
}
