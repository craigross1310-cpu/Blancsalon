import { randomBytes, randomInt } from "node:crypto";

// No 0/O, 1/I/L or U to avoid confusion when typed into a banking app.
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

/** Booking reference used as the bank transfer payment reference, e.g. "BLC-7KQ4MZ". */
export function generateReference(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `BLC-${s}`;
}

/** Unguessable token for the customer's private booking page link. */
export function generateAccessToken(): string {
  return randomBytes(24).toString("base64url");
}
