"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartSpline, CookingPot, Package } from "lucide-react";
import type { Catalog, Recipe } from "@/catalog/types";
import { plateStyle, recipeTone } from "@/components/app/food";
import styles from "@/components/app/app.module.css";

export function Plate({
  catalog,
  recipe,
  size,
  className,
}: {
  catalog: Catalog;
  recipe: Recipe;
  size: number;
  className?: string;
}) {
  return (
    <span
      className={`${styles.plate} ${className ?? ""}`}
      style={plateStyle(recipeTone(catalog, recipe), size)}
      aria-hidden
    />
  );
}

const TABS = [
  { href: "/", label: "Today", icon: CookingPot },
  { href: "/week", label: "Week", icon: CalendarDays },
  { href: "/pantry", label: "Pantry", icon: Package },
  { href: "/kitchen", label: "Kitchen", icon: ChartSpline },
] as const;

export function BottomNav({ pantryAlert = false }: { pantryAlert?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Main">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const current = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={styles.navLink}
            aria-current={current ? "page" : undefined}
          >
            <span className={styles.navIcon}>
              <Icon size={22} strokeWidth={current ? 2.4 : 2} aria-hidden />
              {tab.href === "/pantry" && pantryAlert ? (
                <span className={styles.navDot} aria-label="needs attention" />
              ) : null}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function VegMark({ veg }: { veg: boolean }) {
  return <span className={veg ? styles.vegMark : styles.nonVegMark} aria-hidden />;
}

export function Loading() {
  return (
    <div className={styles.screen} aria-busy="true">
      <p className={styles.loading}>Opening your kitchen…</p>
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p role="alert" className={styles.errorNote}>
      {message}
    </p>
  );
}
