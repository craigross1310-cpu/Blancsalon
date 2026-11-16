"use client";

/** Phone-friendly "jump to category" picker — opens the native iOS/Android list. */
export function CategoryJump({ categories }: { categories: { label: string; id: string }[] }) {
  return (
    <label className="relative block">
      <span className="sr-only">Jump to a treatment category</span>
      <select
        defaultValue=""
        onChange={(e) => {
          const el = document.getElementById(e.target.value);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          e.target.value = "";
        }}
        className="w-full appearance-none border border-ink bg-ivory py-3 pl-4 pr-10 text-[0.95rem] text-ink"
      >
        <option value="" disabled>
          Jump to a category…
        </option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gold-deep" aria-hidden>
        ▾
      </span>
    </label>
  );
}
