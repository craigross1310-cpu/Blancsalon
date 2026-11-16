import type { Metadata, Viewport } from "next";
import "@fontsource/bodoni-moda/400.css";
import "@fontsource/bodoni-moda/400-italic.css";
import "@fontsource/bodoni-moda/700.css";
import "@fontsource-variable/jost";
import "@fontsource/pinyon-script/400.css";
import "./globals.css";
import { siteUrl } from "@/lib/settings";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "BLANC Salon — Skin · Aesthetics · Wellbeing", template: "%s · BLANC Salon" },
  description:
    "BLANC Salon: advanced facials, needling, Morpheus8, HIFU face and body, and wellbeing treatments. Book online and secure your appointment with a deposit.",
  openGraph: { title: "BLANC Salon", description: "Skin · Aesthetics · Wellbeing", images: ["/gallery/lash-2.jpg"] },
  icons: { icon: "/brand/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#0d0c0b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
