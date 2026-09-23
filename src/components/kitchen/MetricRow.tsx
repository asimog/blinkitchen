import { formatRupees } from "@/domain/units";
import type { WeekIntelligence } from "@/intelligence";
import { MetricCard } from "@/components/kitchen/MetricCard";
import styles from "@/components/kitchen/kitchen.module.css";

export function MetricRow({ intelligence }: { intelligence: WeekIntelligence }) {
  const toBuy = intelligence.basket.items.filter((item) => item.status === "buy").length;
  const useSoonCount = intelligence.useSoon.length;

  return (
    <dl className={styles.metrics} aria-label="This week at a glance">
      <MetricCard
        label="Pantry coverage"
        value={`${Math.round(intelligence.coverage.percent)}%`}
        hint="of this plan's value is already home"
      />
      <MetricCard
        label="Simulated basket"
        value={formatRupees(intelligence.basket.totalCost)}
        hint="estimated, nothing is ordered"
        accent
      />
      <MetricCard
        label="Ingredients to buy"
        value={String(toBuy)}
        hint={`${intelligence.basket.items.length - toBuy} already covered`}
      />
      <MetricCard
        label="Use soon"
        value={String(useSoonCount)}
        hint={useSoonCount === 0 ? "nothing at risk this week" : "items worth cooking first"}
      />
    </dl>
  );
}
