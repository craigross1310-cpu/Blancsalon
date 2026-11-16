export function Wordmark({ tone = "dark", className = "" }: { tone?: "dark" | "light" | "chrome"; className?: string }) {
  const color = tone === "chrome" ? "chrome-text" : tone === "light" ? "text-ivory" : "text-ink";
  return (
    <span className={`font-display font-bold tracking-[0.22em] ${color} ${className}`} aria-label="BLANC">
      BLANC<span className="text-gold">.</span>
    </span>
  );
}
