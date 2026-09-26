import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf, MoveUpRight } from "lucide-react";
import { loadCatalog } from "@/catalog/load";
import { buildWeekIntelligence } from "@/intelligence";
import { buildFixtureKitchen, HOUSEHOLD_FIXTURES } from "@/simulation/fixtures";
import { BasketReveal } from "@/components/kitchen/BasketReveal";

export default function HomePage() {
  const catalog = loadCatalog();
  const fixture = HOUSEHOLD_FIXTURES[0];
  const preview = fixture ? buildWeekIntelligence(buildFixtureKitchen(fixture), catalog) : null;

  return (
    <div className="container">
      <section className="home-hero">
        <div className="home-story">
          <p className="eyebrow"><span className="brand-dot" /> A little kitchen intelligence</p>
          <h1>Your kitchen.<br />A little more <em>possibility.</em></h1>
          <p className="home-lede">Good meals start with what you have. Plan your week, use more of your groceries, and buy just what’s missing.</p>
          <Link className="btn btn-primary home-cta" href="/explore/pantry_planner">See the 8-week demo <ArrowRight size={18} aria-hidden /></Link>
          <Link className="home-secondary" href="/build">Build your kitchen <MoveUpRight size={14} aria-hidden /></Link>
          <p className="home-caption">An independent Blinkit concept · simulated households &amp; prices</p>
        </div>
        <div className="home-photo">
          <Image src="/images/kitchen-table.png" alt="" fill sizes="(max-width: 760px) 100vw, 50vw" priority />
          <div className="photo-label"><Leaf size={18} aria-hidden /><span>A good week starts<br /><strong>right here, at home.</strong></span></div>
          <span className="photo-note">An imagined kitchen table</span>
        </div>
      </section>
      {preview && fixture ? (
        <section className="home-demo" aria-label="Try pantry-aware shopping">
          <div className="section-heading">
            <div><p className="eyebrow">01 / Start with what’s already there</p><h2>A full week.<br /><em>A more thoughtful basket.</em></h2></div>
            <p>{fixture.householdName} · Week 1<br /><span className="muted">{preview.plan.length} meals, one shared kitchen.</span></p>
          </div>
          <div className="home-demo-grid">
            <div className="home-menu">
              <p className="eyebrow">On the menu</p>
              {preview.plan.slice(0, 3).map((meal, index) => (
                <div className="home-menu-row" key={meal.recipeId}><span className="menu-number">0{index + 1}</span><div><h3>{meal.recipe.name}</h3><p>{meal.recipe.estimatedPreparationMinutes} min · made for sharing</p></div></div>
              ))}
              <Link className="text-link" href="/explore/pantry_planner">Explore the whole week <ArrowRight size={15} aria-hidden /></Link>
            </div>
            <BasketReveal basket={preview.basket} />
          </div>
        </section>
      ) : null}
      <section className="home-next">
        <div><p className="eyebrow">02 / It gets to know your kitchen</p><h2>Every week tells<br />a little more of your story.</h2></div>
        <div><p>The meals you cook. The swaps you keep. The ingredients you reach for again. See what eight weeks can teach a kitchen.</p><Link className="text-link" href="/explore">Meet the four households <ArrowRight size={16} aria-hidden /></Link><Link className="home-secondary" href="/blinkit">Blinkit Lens <MoveUpRight size={14} aria-hidden /></Link></div>
      </section>
    </div>
  );
}
