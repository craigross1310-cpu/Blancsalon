import { SiteHeader } from "./SiteHeader";

export function PageHero({ eyebrow, title, script, children }: { eyebrow: string; title: string; script?: string; children?: React.ReactNode }) {
  return (
    <>
      <SiteHeader overlay />
      <section className="relative overflow-hidden bg-ink pb-16 pt-32 text-ivory sm:pb-20 sm:pt-40">
        <div className="glitter animate-twinkle absolute inset-0 opacity-40" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-8">
          <p className="eyebrow animate-rise text-gold">{eyebrow}</p>
          {script && <p className="animate-rise mt-4 font-script text-4xl text-gold-light/90 sm:text-5xl" style={{ animationDelay: "80ms" }}>{script}</p>}
          <h1 className="heading animate-rise mt-3 text-4xl sm:text-6xl" style={{ animationDelay: "140ms" }}>{title}</h1>
          {children && <div className="animate-rise mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ivory/70" style={{ animationDelay: "220ms" }}>{children}</div>}
        </div>
      </section>
    </>
  );
}
