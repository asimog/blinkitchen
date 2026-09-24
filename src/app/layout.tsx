import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import { SiteNav } from "@/components/shell/SiteNav";
import "../styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Blinkitchen — the kitchen, not just the cart",
    template: "%s · Blinkitchen",
  },
  description:
    "A prototype of a longitudinal household grocery intelligence layer. Household facts are truth; intelligence is derived.",
  openGraph: {
    title: "Blinkitchen",
    description: "Your grocery app remembers the kitchen, not just the cart.",
    type: "website",
  },
};

const FOOTER_LINKS = [
  { href: "/explore", label: "Explore households" },
  { href: "/build", label: "Build yours" },
  { href: "/kitchen", label: "My kitchen" },
  { href: "/blinkit", label: "Blinkit lens" },
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="container site-header-inner">
            <Link href="/" className="wordmark" aria-label="Blinkitchen home">
              blinkitchen<span className="wordmark-sub">kitchen intelligence</span>
            </Link>
            <SiteNav />
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="container site-footer-inner">
            <div>
              <p className="site-footer-brand">blinkitchen</p>
              <p className="small muted" style={{ margin: 0 }}>
                Household facts are truth. Intelligence is derived.
              </p>
            </div>
            <nav className="site-footer-nav" aria-label="Footer">
              {FOOTER_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <p className="small muted site-footer-note">
              Prototype. All products, prices, households and availability are simulated — not real
              Blinkit data. Nothing is ordered or charged.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}