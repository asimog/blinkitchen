import type { Metadata } from "next";
import Link from "next/link";
import "../styles/globals.css";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container site-header-inner">
            <Link href="/" className="wordmark" aria-label="Blinkitchen home">
              blinkitchen<span className="wordmark-sub">kitchen intelligence</span>
            </Link>
            <nav className="site-nav" aria-label="Primary">
              <Link href="/explore">Explore households</Link>
              <Link href="/build">Build yours</Link>
              <Link href="/kitchen">My kitchen</Link>
              <Link href="/blinkit">Blinkit lens</Link>
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <p className="small muted">
              Prototype. All products, prices, households and availability are simulated —
              not real Blinkit data. Nothing is ordered or charged.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
