"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { IngredientCategory } from "@/catalog/types";
import { ingredientTone } from "@/components/app/food";
import { startingPantryItems, usualStaples, withStartingPantry } from "@/components/app/starter-kitchen";
import { useKitchen } from "@/components/app/use-kitchen";
import type { ReadyKitchen } from "@/components/app/use-kitchen";
import { ErrorNote, Loading } from "@/components/app/ui";
import styles from "@/components/app/app.module.css";

const CATEGORY_ORDER: IngredientCategory[] = ["vegetables", "dairy", "protein", "pantry", "fat", "spice"];

export function HomeCheck() {
  const session = useKitchen();

  if (session.status !== "ready") return <Loading />;

  return <Choices session={session} />;
}

/**
 * Asked once, after the meals are picked: the household answers for the
 * ingredients this week actually needs, never for an abstract pantry.
 */
function Choices({ session }: { session: ReadyKitchen }) {
  const { catalog, kitchen, intelligence, replace, error } = session;
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const locationId = kitchen.profile.locationId;

  const needed = intelligence.basket.items
    .map((item) => item.ingredient)
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));

  const usual = usualStaples(catalog, locationId);
  const usualIds = new Set(usual.map((ingredient) => ingredient.id));
  const usualCovers = needed.filter((ingredient) => usualIds.has(ingredient.id));

  const stock = (ids: string[]) => {
    const next = withStartingPantry(kitchen, startingPantryItems(catalog, ids, locationId));

    if (!next) {
      setFailed("Your kitchen already has stock. Change it from the Pantry tab.");

      return;
    }

    replace(next);
    router.push("/checkout");
  };

  const toggle = (id: string) =>
    setPicked((current) => (current.includes(id) ? current.filter((row) => row !== id) : [...current, id]));

  return (
    <div className={`${styles.screen} ${styles.paper} ${styles.narrow}`}>
      <header className={styles.topBar}>
        <Link href="/week" className={styles.iconLink} aria-label="Back to your week">
          <ArrowLeft size={22} aria-hidden />
        </Link>
        <span className={styles.counter}>{needed.length} ingredients</span>
      </header>

      <div className={styles.onboardHead}>
        <h1 className={styles.display}>What&apos;s already home?</h1>
      </div>

      <ErrorNote message={error ?? failed} />

      {picking ? (
        <>
          <div className={styles.pickGrid} role="group" aria-label="Already at home">
            {needed.map((ingredient) => (
              <button
                key={ingredient.id}
                type="button"
                aria-pressed={picked.includes(ingredient.id)}
                className={styles.pickTile}
                onClick={() => toggle(ingredient.id)}
              >
                <span className={styles.pickSwatch} style={{ background: ingredientTone(ingredient) }} />
                <span>{ingredient.name}</span>
              </button>
            ))}
          </div>
          <div className={styles.footer}>
            <button type="button" className={styles.quiet} onClick={() => setPicking(false)}>
              Back to the three options
            </button>
            <button type="button" className={styles.primary} onClick={() => stock(picked)}>
              {picked.length === 0 ? "Nothing's home" : `${picked.length} at home`} <ArrowRight size={18} aria-hidden />
            </button>
          </div>
        </>
      ) : (
        <div className={styles.modeList}>
          <button type="button" className={styles.modeCard} onClick={() => stock(usual.map((ingredient) => ingredient.id))}>
            <span className={styles.modeSwatches} aria-hidden>
              {usualCovers.slice(0, 5).map((ingredient) => (
                <span key={ingredient.id} style={{ background: ingredientTone(ingredient) }} />
              ))}
            </span>
            <span className={styles.modeTitle}>The usual stuff</span>
            <span className={styles.modeNote}>
              Dals, rice, atta, oil and masalas are home · {usualCovers.length} of {needed.length} covered
            </span>
            <span className={styles.modeTag}>Quickest</span>
          </button>

          <button type="button" className={styles.modeCard} onClick={() => stock([])}>
            <span className={styles.modeSwatches} aria-hidden>
              {needed.slice(0, 5).map((ingredient) => (
                <span key={ingredient.id} style={{ background: ingredientTone(ingredient) }} />
              ))}
            </span>
            <span className={styles.modeTitle}>A fresh new kitchen</span>
            <span className={styles.modeNote}>Nothing yet · all {needed.length} go in the basket</span>
          </button>

          <button type="button" className={styles.modeCard} onClick={() => setPicking(true)}>
            <span className={styles.modeSwatches} data-outline aria-hidden>
              {needed.slice(0, 5).map((ingredient) => (
                <span key={ingredient.id} />
              ))}
            </span>
            <span className={styles.modeTitle}>The perfectionist</span>
            <span className={styles.modeNote}>Tick exactly what you have</span>
          </button>
        </div>
      )}
    </div>
  );
}
