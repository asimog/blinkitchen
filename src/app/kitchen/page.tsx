import type { Metadata } from "next";
import { KitchenStory } from "@/components/app/KitchenStory";

export const metadata: Metadata = { title: "Kitchen" };

export default function KitchenPage() {
  return <KitchenStory />;
}
