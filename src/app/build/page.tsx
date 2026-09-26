import type { Metadata } from "next";
import { BuildExperience } from "@/components/onboarding/BuildExperience";

export const metadata: Metadata = {
  title: "Build your household",
  description:
    "Create a household in five short steps. Blinkitchen starts Week 1 from your answers, then learns from what you cook, buy, swap and waste.",
};

export default function BuildPage() {
  return <BuildExperience />;
}
