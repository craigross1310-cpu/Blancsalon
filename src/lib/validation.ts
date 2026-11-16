import { z } from "zod";

export const bookingRequestSchema = z.object({
  treatmentId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  fullName: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().email("Please enter a valid email address").max(200),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter your mobile number")
    .max(30)
    .regex(/^[+\d][\d\s()-]{6,}$/, "Please enter a valid mobile number"),
  notes: z.string().trim().max(1000).optional().default(""),
  policyAgreed: z.literal(true, { message: "Please agree to the booking policies" }),
  /** Honeypot — must stay empty. */
  company: z.string().max(0).optional(),
});

export type BookingRequestBody = z.infer<typeof bookingRequestSchema>;
