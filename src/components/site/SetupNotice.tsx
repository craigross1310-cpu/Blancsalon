import { usesEmbeddedDb } from "@/lib/db/client";

/**
 * On Vercel each page/API can run on a different server, so the temporary
 * built-in demo database can't be shared. Tell whoever is setting up the demo
 * how to fix it, instead of silently showing "no availability".
 */
export function SetupNotice() {
  if (!process.env.VERCEL || !usesEmbeddedDb()) return null;
  return (
    <div role="alert" className="mx-auto mb-6 max-w-3xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
      <strong>One setup step needed:</strong> connect a free database so bookings work on Vercel. In Vercel open this project →{" "}
      <strong>Storage</strong> → <strong>Create Database</strong> → <strong>Neon</strong> → create and connect it to this project, then{" "}
      <strong>Redeploy</strong>. Demo data is loaded automatically.
    </div>
  );
}
