import Link from "next/link";
import { ArrowRight, MapPin, Users, Wallet } from "lucide-react";
import { loadCatalog } from "@/catalog/load";
import { locationById } from "@/catalog/grocery-graph";
import { humanizeId } from "@/intelligence";
import { HOUSEHOLD_FIXTURES } from "@/simulation/fixtures";
import styles from "@/components/explore/explore.module.css";

export default function ExplorePage() {
  const catalog = loadCatalog();

  return (
    <div className="container">
      <section className={styles.intro}>
        <p className="eyebrow">Explore · simulated households</p>
        <h1>Four kitchens, eight weeks each</h1>
        <p className="muted" style={{ maxWidth: "60ch" }}>
          Every household below is a deterministic fixture. They run the same intelligence engine
          with different preferences, pantries and budgets — and their journeys replay identically
          every time. Nothing here is real customer data.
        </p>
      </section>

      <div className={styles.archetypeGrid}>
        {HOUSEHOLD_FIXTURES.map((fixture) => {
          const location = locationById(catalog, fixture.profile.locationId);
          return (
            <article key={fixture.id} className={styles.archetypeCard}>
              <p className="eyebrow">{fixture.archetype}</p>
              <h2 className={styles.archetypeName}>{fixture.householdName}</h2>
              <p className={styles.tagline}>{fixture.tagline}</p>
              <p className="small muted">{fixture.description}</p>

              <ul className={styles.facts}>
                <li>
                  <Users size={14} aria-hidden /> {fixture.profile.memberCount} people
                </li>
                <li>
                  <MapPin size={14} aria-hidden /> {location?.name ?? fixture.profile.locationId}
                </li>
                <li>
                  <Wallet size={14} aria-hidden /> ₹{fixture.profile.weeklyBudget}/week
                </li>
              </ul>

              <div className={styles.tags}>
                {fixture.profile.cuisines.map((cuisine) => (
                  <span key={cuisine} className="pill">
                    {humanizeId(cuisine)}
                  </span>
                ))}
                <span className="pill">{fixture.pantry.length} pantry items</span>
              </div>

              <Link className="btn btn-primary btn-small" href={`/explore/${fixture.id}`}>
                Open the journey <ArrowRight size={14} aria-hidden />
              </Link>
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
