import Link from "next/link";
import { ArrowRight, ChefHat, LineChart, ShoppingBasket, Sparkles } from "lucide-react";
import { loadCatalog } from "@/catalog/load";
import { formatRupees } from "@/domain/units";
import { buildWeekIntelligence } from "@/intelligence";
import { buildBlinkitInsights } from "@/insights/blinkit";
import { buildFixtureKitchen, HOUSEHOLD_FIXTURES } from "@/simulation/fixtures";
import { householdPolicy } from "@/simulation/policies";
import { simulateJourney } from "@/simulation/simulate";

const THINKING = [
  {
    icon: ShoppingBasket,
    title: "Know what's already home",
    body: "Pantry coverage subtracts what the kitchen already owns before suggesting anything to buy.",
  },
  {
    icon: ChefHat,
    title: "Plan across ingredients",
    body: "Buy once, use across meals. Ingredient chaining shapes which dishes rank highest.",
  },
  {
    icon: Sparkles,
    title: "Learn what the household prefers",
    body: "Cuisine affinities, substitution decisions and waste facts change future recommendations.",
  },
  {
    icon: LineChart,
    title: "Predict what comes next",
    body: "Replenishment prompts emerge from consumption history, not from guesswork.",
  },
] as const;

const LOOP = [
  { week: "Week 1", body: "Understand the kitchen as it is." },
  { week: "Weeks 2–4", body: "Recommendations appear and start adapting." },
  { week: "Weeks 5–7", body: "Replenishment and substitutions become personal." },
  { week: "Week 8", body: "See exactly what Blinkitchen learned." },
] as const;

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
            Blinkitchen is a longitudinal intelligence layer for a grocery app. It learns what is
            already in a household&apos;s pantry, what it cooks, what it wastes and what it
            substitutes — then recommends meals and a smaller, smarter basket week after week.
          </p>
          <div className="row wrap hero-actions">
            <Link className="btn btn-primary" href="/build">
              Build your household <ArrowRight size={16} aria-hidden />
            </Link>
            <Link className="btn btn-secondary" href="/explore">
              Explore four households
            </Link>
            <Link className="btn btn-ghost" href="/blinkit">
              View Blinkit intelligence <ArrowRight size={14} aria-hidden />
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

      <section className="thinking-band" aria-label="What Blinkitchen does">
        {THINKING.map((pillar, index) => (
          <article className="thinking-item" key={pillar.title}>
            <p className="thinking-index">{String(index + 1).padStart(2, "0")}</p>
            <pillar.icon size={18} aria-hidden className="thinking-icon" />
            <h3>{pillar.title}</h3>
            <p className="small muted" style={{ margin: 0 }}>
              {pillar.body}
            </p>
          </article>
        ))}
      </section>

      <section className="loop-section">
        <p className="eyebrow">The loop</p>
        <h2>Facts accumulate. Intelligence recomputes. The kitchen gets easier.</h2>
        <ol className="loop-steps">
          {LOOP.map((step) => (
            <li key={step.week}>
              <strong>{step.week}</strong>
              <span className="muted small">{step.body}</span>
            </li>
          ))}
        </ol>
        <p className="small muted" style={{ marginTop: "1.25rem" }}>
          Simulated households replay the same eight-week loop deterministically, so every claim in
          this prototype can be inspected and reproduced.
        </p>
      </section>

      <section className="evidence-strip" aria-label="Cohort evidence">
        <div>
          <p className="eyebrow">Evidence</p>
          <h2 style={{ fontSize: "1.5rem" }}>
            Every number here is derived from the same engine you can replay.
          </h2>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Four deterministic fixtures, replayed through Weeks 1–8 at fictional catalog prices.
          </p>
        </div>
        <dl className="evidence-stats">
          <div>
            <dt>Simulated households</dt>
            <dd>{insights.households}</dd>
          </div>
          <div>
            <dt>Household-weeks replayed</dt>
            <dd>{insights.weekSnapshots}</dd>
          </div>
          <div>
            <dt>Cumulative simulated basket</dt>
            <dd>{formatRupees(insights.cumulativeBasketSpend)}</dd>
          </div>
          <div>
            <dt>Demand avoided by pantry</dt>
            <dd>{formatRupees(insights.avoidedBasketValue)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}