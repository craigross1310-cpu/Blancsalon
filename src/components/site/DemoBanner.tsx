import { isDemoMode } from "@/lib/db/client";

/** Small floating badge so nobody mistakes the demo for the live site. */
export function DemoBanner() {
  if (!isDemoMode() && process.env.SHOW_DEMO_BANNER !== "true") return null;
  return (
    <div className="pointer-events-none fixed bottom-3 left-3 hidden sm:block z-[60] max-w-[calc(100vw-1.5rem)] rounded-full border border-gold/40 bg-ink/90 px-3 py-1.5 text-[0.65rem] tracking-wide text-gold-light shadow-lg backdrop-blur">
      Demo preview · sample data · no real payments or emails
    </div>
  );
}
