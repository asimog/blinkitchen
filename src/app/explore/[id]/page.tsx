import { notFound } from "next/navigation";
import { fixtureById, HOUSEHOLD_FIXTURES } from "@/simulation/fixtures";
import { ExploreJourney } from "@/components/explore/ExploreJourney";

export function generateStaticParams() {
  return HOUSEHOLD_FIXTURES.map((fixture) => ({ id: fixture.id }));
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
