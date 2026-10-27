import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, Mukta } from "next/font/google";
import "../styles/globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--nf-display", display: "swap" });

const body = Figtree({ subsets: ["latin"], variable: "--nf-body", display: "swap" });

const hindi = Mukta({ subsets: ["devanagari"], weight: ["500", "700"], variable: "--nf-hindi", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Blinkitchen", template: "%s · Blinkitchen" },
  description: "Aaj kya banega? A kitchen that plans the week from what is already at home.",
};

export const viewport: Viewport = { themeColor: "#1B1310", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${hindi.variable}`}>
      <body>
        <main className="app-frame">{children}</main>
      </body>
    </html>
  );
}
