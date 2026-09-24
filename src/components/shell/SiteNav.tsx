"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/explore", label: "Explore households" },
  { href: "/build", label: "Build yours" },
  { href: "/kitchen", label: "My kitchen" },
  { href: "/blinkit", label: "Blinkit lens" },
] as const;

/** Primary navigation with a visible current-page state. */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="Primary">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className="site-nav-link"
            {...(active ? { "aria-current": "page" as const } : {})}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}