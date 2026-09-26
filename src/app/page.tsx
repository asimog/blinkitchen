import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { loadCatalog } from "@/catalog/load";
import { formatRupees } from "@/domain/units";
import { buildWeekIntelligence } from "@/intelligence";
import { buildBlinkitInsights } from "@/insights/blinkit";
import { buildFixtureKitchen, HOUSEHOLD_FIXTURES } from "@/simulation/fixtures";
import { householdPolicy } from "@/simulation/policies";
import { simulateJourney } from "@/simulation/simulate";

export default function HomePage() {
  const catalog = loadCatalog();

  const fixture = HOUSEHOLD_FIXTURES[0];

  const preview = fixture
    ? buildWeekIntelligence(buildFixtureKitchen(fixture), catalog)
    : null;

  const states = HOUSEHOLD_FIXTURES.flatMap((household) =>
    simulateJourney(buildFixtureKitchen(household), catalog, householdPolicy),
  );

  const insights = buildBlinkitInsights(states, catalog);

  const toBuy = preview
    ? preview.basket.items.filter((item) => item.status === "buy").length
    : 0;

  return (
    <div className="container">
      <section className="hero">
        <div>
          <p className="eyebrow">Household grocery intelligence · prototype</p>
          <h1>
            Your grocery app remembers the kitchen,
            <br />
            <em>not just the cart.</em>
          </h1>
          <p className="hero-lede">
            Blinkitchen learns what a household already has, cooks, wastes and substitutes — then
            plans meals and a smaller basket that improve as the weeks accumulate.
          </p>
          <div className="row wrap hero-actions">
            <Link className="btn btn-primary" href="/explore/pantry_planner">
              See the 8-week demo <ArrowRight size={16} aria-hidden />
            </Link>
            <Link className="btn btn-secondary" href="/build">
              Build your kitchen
            </Link>
            <Link className="btn btn-ghost" href="/blinkit">
              Blinkit Lens <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>

        {preview && fixture ? (
          <aside className="hero-preview" aria-label="Live week projection for a simulated household">
            <div className="hero-preview-top">
              <p className="hero-preview-household">{fixture.householdName}</p>
              <span className="hero-preview-week">Week 1 · simulated</span>
            </div>
            <dl className="hero-preview-stats">
              <div>
                <dt>Pantry coverage</dt>
                <dd>{Math.round(preview.coverage.percent)}%</dd>
              </div>
              <div>
                <dt>Simulated basket</dt>
                <dd>{formatRupees(preview.basket.totalCost)}</dd>
              </div>
              <div>
                <dt>To buy</dt>
                <dd>{toBuy}</dd>
              </div>
            </dl>
            <ul className="hero-preview-meals">
              {preview.recommendations.slice(0, 3).map((recommendation) => (
                <li key={recommendation.recipe.id}>
                  <span>{recommendation.recipe.name}</span>
                  <span className="hero-preview-fit">
                    {Math.round(recommendation.score * 100)}% fit
                  </span>
                </li>
              ))}
            </ul>
            <p className="hero-preview-note">
              Derived on this render from the deterministic fixture — no projection is stored.
            </p>
          </aside>
        ) : null}
      </section>

      <section className="evidence-strip" aria-label="Cohort evidence">
        <div>
          <p className="eyebrow">The loop</p>
          <h2 style={{ fontSize: "1.5rem" }}>
            Facts accumulate. Intelligence recomputes. The kitchen gets easier.
          </h2>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Every number below comes from the same engine you can replay: four deterministic
            households, eight weeks each.
          </p>
        </div>
        <dl className="evidence-stats">
          <div>
            <dt>Already at home</dt>
            <dd>{formatRupees(insights.avoidedBasketValue)}</dd>
          </div>
          <div>
            <dt>Household-weeks replayed</dt>
            <dd>{insights.weekSnapshots}</dd>
          </div>
          <div>
            <dt>Cumulative simulated basket</dt>
            <dd>{formatRupees(insights.cumulativeBasketSpend)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
