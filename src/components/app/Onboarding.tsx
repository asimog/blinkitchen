"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { createKitchenState } from "@/domain/kitchen/state";
import type { DietPreference } from "@/domain/kitchen/types";
import { buildFixtureKitchen, HOUSEHOLD_FIXTURES } from "@/simulation/fixtures";
import { householdPolicy } from "@/simulation/policies";
import { simulateJourney } from "@/simulation/simulate";
import { LOCAL_KITCHEN_ID, saveKitchen } from "@/storage/kitchen-storage";
import { ingredientTone } from "@/components/app/food";
import { everydayMasalas, pantryItemsFromQuickPicks, quickPickGroups, starterProfile } from "@/components/app/starter-kitchen";
import { useCatalog } from "@/components/app/use-kitchen";
import { ErrorNote, VegMark } from "@/components/app/ui";
import styles from "@/components/app/app.module.css";

const PEOPLE = [1, 2, 3, 4, 5, 6] as const;

const DIETS: { id: DietPreference; label: string }[] = [
  { id: "vegetarian", label: "Veg" },
  { id: "non_vegetarian", label: "Non-veg" },
];

const SAMPLE_WEEK = 4;

const MAX_TILES = 15;

const MASALA_TONE = "#C9802E";

export function Onboarding() {
  const router = useRouter();
  const catalog = useCatalog();
  const [people, setPeople] = useState<number | null>(null);
  const [diet, setDiet] = useState<DietPreference | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [masalas, setMasalas] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locationId = catalog.locations[0]?.id ?? "delhi_south";

  const tiles = useMemo(() => {
    const seen = new Set<string>();

    const groups = quickPickGroups(catalog);
    const order = ["fresh_basics", "regularly_bought", "pantry_basics"];

    return [...groups]
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
      .flatMap((group) => group.ingredients)
      .filter((ingredient) => {
        if (seen.has(ingredient.id) || ingredient.category === "spice") return false;
        seen.add(ingredient.id);

        return true;
      })
      .slice(0, MAX_TILES);
  }, [catalog]);

  const step = people === null ? 1 : diet === null ? 2 : 3;

  const finish = () => {
    if (people === null || diet === null) return;

    const kitchen = createKitchenState({
      id: LOCAL_KITCHEN_ID,
      profile: starterProfile(people, diet, locationId),
      pantry: pantryItemsFromQuickPicks(
        catalog,
        [...picked, ...(masalas ? everydayMasalas(catalog, locationId).map((spice) => spice.id) : [])],
        locationId,
      ),
      createdAt: new Date().toISOString(),
    });

    if (!saveKitchen(kitchen)) {
      setError("This browser would not save your kitchen.");

      return;
    }

    router.push("/week");
  };

  const openSample = () => {
    const fixture = HOUSEHOLD_FIXTURES[0];

    if (!fixture) return;
    const weeks = simulateJourney(buildFixtureKitchen(fixture), catalog, householdPolicy, SAMPLE_WEEK);
    const last = weeks.at(-1);

    if (!last || !saveKitchen({ ...last, id: LOCAL_KITCHEN_ID })) {
      setError("This browser would not save the sample kitchen.");

      return;
    }

    router.push("/");
  };

  return (
    <div className={`${styles.screen} ${styles.paper}`}>
      <div className={styles.answered}>
        {people !== null ? (
          <button type="button" className={styles.answerChip} onClick={() => { setPeople(null); setDiet(null); }}>
            {people === 6 ? "6+" : people} {people === 1 ? "person" : "people"}
            <Check size={12} strokeWidth={3} aria-hidden />
          </button>
        ) : null}
        {diet !== null ? (
          <button type="button" className={styles.answerChip} onClick={() => setDiet(null)}>
            {diet === "vegetarian" ? "Veg" : "Non-veg"}
            <Check size={12} strokeWidth={3} aria-hidden />
          </button>
        ) : null}
      </div>

      <div className={styles.onboardHead}>
        <p className={styles.stepCount}>{step} of 3</p>
        <h1 className={styles.display}>
          {step === 1 ? "Who's eating?" : step === 2 ? "How do you eat?" : "What's in your kitchen?"}
        </h1>
      </div>

      {step === 1 ? (
        <div className={styles.peopleGrid} role="group" aria-label="People in your home">
          {PEOPLE.map((count) => (
            <button key={count} type="button" className={styles.peopleTile} onClick={() => setPeople(count)}>
              <span className={styles.peopleCount}>{count === 6 ? "6+" : count}</span>
              <span className={styles.peopleDots} aria-hidden>
                {Array.from({ length: Math.min(count, 6) }, (_, index) => (
                  <span key={index} />
                ))}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {step === 2 ? (
        <div className={styles.dietGrid} role="group" aria-label="Diet">
          {DIETS.map((option) => (
            <button key={option.id} type="button" className={styles.dietTile} onClick={() => setDiet(option.id)}>
              <VegMark veg={option.id === "vegetarian"} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {step === 3 ? (
        <div className={styles.pickGrid} role="group" aria-label="Already at home">
          <button
            type="button"
            aria-pressed={masalas}
            className={styles.pickTile}
            onClick={() => setMasalas((on) => !on)}
          >
            <span className={styles.pickSwatch} style={{ background: MASALA_TONE }} />
            <span>Masalas</span>
          </button>
          {tiles.map((ingredient) => {
            const on = picked.includes(ingredient.id);

            return (
              <button
                key={ingredient.id}
                type="button"
                aria-pressed={on}
                className={styles.pickTile}
                onClick={() =>
                  setPicked((current) =>
                    on ? current.filter((id) => id !== ingredient.id) : [...current, ingredient.id],
                  )
                }
              >
                <span className={styles.pickSwatch} style={{ background: ingredientTone(ingredient) }} />
                <span>{ingredient.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <ErrorNote message={error} />

      <div className={styles.footer}>
        {step === 3 ? (
          <>
            <p className={styles.hint}>Not sure? Skip. Your kitchen learns as you cook.</p>
            <button type="button" className={styles.primary} onClick={finish}>
              Show my week <ArrowRight size={18} aria-hidden />
            </button>
          </>
        ) : (
          <button type="button" className={styles.quiet} onClick={openSample}>
            Or peek into a lived-in kitchen
          </button>
        )}
      </div>
    </div>
  );
}
