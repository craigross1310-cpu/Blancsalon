/**
 * All money is handled as integer pence to avoid floating point errors.
 */

export function formatGBP(pence: number, opts: { trimWhole?: boolean } = {}): string {
  const negative = pence < 0;
  const abs = Math.abs(Math.round(pence));
  const pounds = Math.floor(abs / 100);
  const p = abs % 100;
  const poundsStr = pounds.toLocaleString("en-GB");
  const body = opts.trimWhole && p === 0 ? `£${poundsStr}` : `£${poundsStr}.${String(p).padStart(2, "0")}`;
  return negative ? `-${body}` : body;
}

/** Parses "45", "45.5", "45.50", "£45.50" into pence. Returns null when invalid. */
export function parsePoundsToPence(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim().replace(/^£/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** Pence to a plain "45.50" string for form inputs. */
export function penceToInput(pence: number): string {
  return (pence / 100).toFixed(2);
}
