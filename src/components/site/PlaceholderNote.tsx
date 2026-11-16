import { loadSettings } from "@/lib/data";

/** Visible only while "Show placeholder notices" is on in Admin → Settings. */
export async function PlaceholderNote({ children, className = "", tone = "light" }: { children: React.ReactNode; className?: string; tone?: "light" | "dark" }) {
  const s = await loadSettings();
  if (!s.business.showPlaceholderNotices) return null;
  return (
    <div
      className={`border border-dashed px-4 py-3 text-xs leading-relaxed ${
        tone === "dark" ? "border-gold/50 text-gold-light/90 bg-white/5" : "border-gold-deep/50 bg-gold-light/20 text-charcoal"
      } ${className}`}
      role="note"
    >
      <span className="eyebrow mr-2 !tracking-[0.2em] text-gold-deep">To confirm</span>
      {children}
    </div>
  );
}
