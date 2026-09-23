import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fixtureById, HOUSEHOLD_FIXTURES } from "@/simulation/fixtures";
import { ExploreJourney } from "@/components/explore/ExploreJourney";

export function generateStaticParams() {
  return HOUSEHOLD_FIXTURES.map((fixture) => ({ id: fixture.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const fixture = fixtureById(id);

  if (!fixture) return { title: "Household not found" };

  return {
    title: `${fixture.householdName} — ${fixture.archetype}`,
    description: `${fixture.tagline}. A simulated household replayed through Weeks 1–8.`,
  };
}

export default async function ExploreHouseholdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!fixtureById(id)) notFound();

  return <ExploreJourney fixtureId={id} />;
}
