import type { Metadata } from "next";
import { BlinkitLens } from "@/components/blinkit/BlinkitLens";

export const metadata: Metadata = {
  title: "Blinkit lens",
  description:
    "Cohort-level intelligence across four simulated households: recurring gaps, reuse, swaps, replenishment and demand avoided by pantry stock.",
};

export default function BlinkitPage() {
  return <BlinkitLens />;
}