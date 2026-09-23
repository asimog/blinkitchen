import type { Metadata } from "next";
import { KitchenJourney } from "@/components/kitchen/KitchenJourney";

export const metadata: Metadata = {
  title: "My kitchen",
  description:
    "Your household's eight-week journey: suggested meals, pantry-aware basket, swaps, replenishment and what Blinkitchen learned.",
};

export default function KitchenPage() {
  return <KitchenJourney />;
}