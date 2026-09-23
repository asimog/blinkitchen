import Link from "next/link";
import { ArrowRight, ChefHat, LineChart, ShoppingBasket, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="container">
      <section className="hero">
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
      </section>

      <section className="grid grid-4 home-pillars" aria-label="What Blinkitchen does">
        <div className="card">
          <ShoppingBasket size={20} aria-hidden className="pillar-icon" />
          <h3>Know what&apos;s already home</h3>
          <p className="small muted">
            Pantry coverage subtracts what the kitchen already owns before suggesting anything to
            buy.
          </p>
        </div>
        <div className="card">
          <ChefHat size={20} aria-hidden className="pillar-icon" />
          <h3>Plan across ingredients</h3>
          <p className="small muted">
            Buy once, use across meals. Ingredient chaining shapes which dishes rank highest.
          </p>
        </div>
        <div className="card">
          <Sparkles size={20} aria-hidden className="pillar-icon" />
          <h3>Learn what the household prefers</h3>
          <p className="small muted">
            Cuisine affinities, substitution decisions and waste facts change future
            recommendations.
          </p>
        </div>
        <div className="card">
          <LineChart size={20} aria-hidden className="pillar-icon" />
          <h3>Predict what comes next</h3>
          <p className="small muted">
            Replenishment prompts emerge from consumption history, not from guesswork.
          </p>
        </div>
      </section>

      <section className="home-loop">
        <p className="eyebrow">The loop</p>
        <h2>Facts accumulate. Intelligence recomputes. The kitchen gets easier.</h2>
        <ol className="loop-steps">
          <li>
            <strong>Week 1</strong>
            <span className="muted small">Understand the kitchen as it is.</span>
          </li>
          <li>
            <strong>Weeks 2–4</strong>
            <span className="muted small">Recommendations appear and start adapting.</span>
          </li>
          <li>
            <strong>Weeks 5–7</strong>
            <span className="muted small">Replenishment and substitutions become personal.</span>
          </li>
          <li>
            <strong>Week 8</strong>
            <span className="muted small">See exactly what Blinkitchen learned.</span>
          </li>
        </ol>
        <p className="small muted">
          Simulated households replay the same eight-week loop deterministically, so every claim
          in this prototype can be inspected and reproduced.
        </p>
      </section>
    </div>
  );
}
