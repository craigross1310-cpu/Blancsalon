"use server";
import { revalidatePath } from "next/cache";
import { BookingError, requestCancellation } from "@/lib/booking/service";
import { getDb } from "@/lib/db/client";

export async function requestCancellationAction(_: unknown, formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const id = String(formData.get("id") ?? "");
  const token = String(formData.get("token") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  try {
    await requestCancellation(await getDb(), id, token, reason);
    revalidatePath(`/booking/${id}`);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof BookingError ? err.message : "Something went wrong." };
  }
}
