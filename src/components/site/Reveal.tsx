"use client";
import { useEffect, useRef, useState } from "react";

/** Fades content up as it scrolls into view. Respects reduced-motion via CSS. */
export function Reveal({ children, className = "", delay = 0, as: Tag = "div" }: { children: React.ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          // Also reveal anything already scrolled past (fast scrolls, anchor jumps).
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            setShown(true);
            io.disconnect();
          }
        }),
      { rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${className} ${shown ? "animate-rise is-shown" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
