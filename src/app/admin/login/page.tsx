import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { Wordmark } from "@/components/site/Wordmark";
import { getAdmin } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/db/client";
import { DEMO_ADMIN_EMAIL, demoAdminPassword } from "@/lib/db/seed";

export const dynamic = "force-dynamic";
export const metadata = { title: "Owner login", robots: { index: false } };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  const demo = isDemoMode() || process.env.SHOW_DEMO_BANNER === "true";
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-ink px-4">
      <div className="glitter absolute inset-0 opacity-40" aria-hidden />
      <div className="relative w-full max-w-sm">
        <div className="text-center">
          <Wordmark tone="chrome" className="text-5xl" />
          <p className="eyebrow mt-3 text-gold">Salon dashboard</p>
        </div>
        <div className="mt-10 bg-ivory p-6 sm:p-8">
          <LoginForm defaultEmail={demo ? DEMO_ADMIN_EMAIL : ""} />
          {demo && (
            <p className="mt-5 border border-dashed border-gold-deep/50 bg-gold-light/20 p-3 text-xs leading-relaxed text-charcoal">
              Demo login — email <strong>{DEMO_ADMIN_EMAIL}</strong>, password <strong>{process.env.DEMO_ADMIN_PASSWORD ? "(set by DEMO_ADMIN_PASSWORD)" : demoAdminPassword()}</strong>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
