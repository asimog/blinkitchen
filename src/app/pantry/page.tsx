import type { Metadata } from "next";
import { Pantry } from "@/components/app/Pantry";

export const metadata: Metadata = { title: "Pantry" };

export default function PantryPage() {
  return <Pantry />;
}
