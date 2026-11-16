import { NextResponse, type NextRequest } from "next/server";
import { clientIp, rateLimited } from "@/lib/auth/session";
import { BookingError, createBookingRequest } from "@/lib/booking/service";
import { getDb } from "@/lib/db/client";
import { bookingRequestSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = await clientIp();
  if (rateLimited(`booking:${ip}`, 8, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many booking requests. Please try again later or contact us on Instagram." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Please check your details.", field: first?.path?.[0] }, { status: 400 });
  }
  try {
    const db = await getDb();
    const b = await createBookingRequest(db, parsed.data);
    return NextResponse.json({ id: b.id, token: b.accessToken, reference: b.reference }, { status: 201 });
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.code === "SLOT_UNAVAILABLE" ? 409 : 400 });
    }
    console.error("Booking request failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
