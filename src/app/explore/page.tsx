import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MapPin, Users, Wallet } from "lucide-react";
import { loadCatalog } from "@/catalog/load";
import { locationById } from "@/catalog/grocery-graph";
import { humanizeId } from "@/intelligence";
import { HOUSEHOLD_FIXTURES } from "@/simulation/fixtures";
import styles from "@/components/explore/explore.module.css";

export const metadata: Metadata = {
  title: "Explore four households",
  description:
    "Four simulated kitchens replay Weeks 1–8 deterministically: pantry reuse, ingredient chaining, swaps, replenishment and learning.",
};

export default function ExplorePage() {
  const catalog = loadCatalog();

  return (
    <div className="container">
      <section className={styles.intro}>
        <p className="eyebrow">Explore · simulated households</p>
        <h1>Four kitchens, eight weeks each</h1>
        <p className={styles.lede}>
          Every household below is a deterministic fixture. They run the same intelligence engine
          with different preferences, pantries and budgets — and their journeys replay identically
          every time. Nothing here is real customer data.
        </p>
      </section>

      <div className={styles.rail}>
        {HOUSEHOLD_FIXTURES.map((fixture) => {
          const location = locationById(catalog, fixture.profile.locationId);

          return (
            <article key={fixture.id} className={styles.row}>
              <div>
                <p className={styles.archetype}>{fixture.archetype}</p>
                <h2 className={styles.rowName}>{fixture.householdName}</h2>
              </div>

              <div className={styles.rowBody}>
                <p className={styles.tagline}>{fixture.tagline}</p>
                <p className="small muted" style={{ marginBottom: 0 }}>
                  {fixture.description}
                </p>
                <ul className={styles.rowStats}>
                  <li>
                    <Users size={13} aria-hidden /> {fixture.profile.memberCount} people
                  </li>
                  <li>
                    <MapPin size={13} aria-hidden />{" "}
                    {location?.name ?? fixture.profile.locationId}
                  </li>
                  <li>
                    <Wallet size={13} aria-hidden /> ₹{fixture.profile.weeklyBudget}/week
                  </li>
                  {fixture.profile.cuisines.map((cuisine) => (
                    <li key={cuisine}>{humanizeId(cuisine)}</li>
                  ))}
                  <li>{fixture.pantry.length} pantry items</li>
                </ul>
              </div>

              <div className={styles.rowAction}>
                <Link className="btn btn-secondary btn-small" href={`/explore/${fixture.id}`}>
                  Open the journey <ArrowRight size={14} aria-hidden />
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <p className="small muted">
        These four are also the cohort behind the <Link href="/blinkit">Blinkit lens</Link>.
      </p>
    </div>
  );
}