"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Minus, Moon, Plus, Sun, Sunrise } from "lucide-react";
import { createKitchenState } from "@/domain/kitchen/state";
import { MEAL_SLOTS } from "@/domain/kitchen/types";
import type { DietPreference, MealSlot } from "@/domain/kitchen/types";
import { buildFixtureKitchen, HOUSEHOLD_FIXTURES } from "@/simulation/fixtures";
import { householdPolicy } from "@/simulation/policies";
import { simulateJourney } from "@/simulation/simulate";
import { LOCAL_KITCHEN_ID, saveKitchen } from "@/storage/kitchen-storage";
import { starterProfile } from "@/components/app/starter-kitchen";
import { SLOT_LABEL, useCatalog } from "@/components/app/use-kitchen";
import { ErrorNote, VegMark } from "@/components/app/ui";
import styles from "@/components/app/app.module.css";

const PEOPLE = [2, 4, 6] as const;

const BIG_FAMILY = { min: 7, max: 20, start: 8 } as const;

const DIETS: { id: DietPreference; label: string }[] = [
  { id: "vegetarian", label: "Veg" },
  { id: "non_vegetarian", label: "Non-veg" },
];

const SLOT_ICON = { breakfast: Sunrise, lunch: Sun, dinner: Moon } as const;

const SAMPLE_WEEK = 4;

/**
 * Three taps to the first meal card: who is eating, veg or non-veg, which
 * meals of the day. What is already at home is asked later, once the chosen
 * meals say which ingredients matter.
 */
export function Onboarding() {
  const router = useRouter();
  const catalog = useCatalog();
  const [people, setPeople] = useState<number | null>(null);
  const [custom, setCustom] = useState<number | null>(null);
  const [diet, setDiet] = useState<DietPreference | null>(null);
  const [slots, setSlots] = useState<MealSlot[]>(["dinner"]);
  const [error, setError] = useState<string | null>(null);
  const locationId = catalog.locations[0]?.id ?? "delhi_south";
  const step = people === null ? 1 : diet === null ? 2 : 3;

  const toggleSlot = (slot: MealSlot) =>
    setSlots((current) =>
      current.includes(slot)
        ? current.filter((row) => row !== slot)
        : MEAL_SLOTS.filter((row) => row === slot || current.includes(row)),
    );

  const finish = () => {
    if (people === null || diet === null || slots.length === 0) return;

    const kitchen = createKitchenState({
      id: LOCAL_KITCHEN_ID,
      profile: starterProfile(people, diet, slots, locationId),
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
    <div className={`${styles.screen} ${styles.paper} ${styles.narrow}`}>
      <div className={styles.answered}>
        {people !== null ? (
          <button type="button" className={styles.answerChip} onClick={() => { setPeople(null); setDiet(null); }}>
            {people} people
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
          {step === 1 ? "Who's eating?" : step === 2 ? "How do you eat?" : "Which meals?"}
        </h1>
      </div>

      {step === 1 ? (
        <div className={styles.peopleGrid} role="group" aria-label="People in your home">
          {PEOPLE.map((count) => (
            <button key={count} type="button" className={styles.peopleTile} onClick={() => setPeople(count)}>
              <span className={styles.peopleCount}>{count}</span>
              <span className={styles.peopleDots} aria-hidden>
                {Array.from({ length: count }, (_, index) => (
                  <span key={index} />
                ))}
              </span>
            </button>
          ))}
          {custom === null ? (
            <button type="button" className={styles.peopleTile} onClick={() => setCustom(BIG_FAMILY.start)}>
              <span className={styles.peopleCount}>7+</span>
              <span className={styles.peopleNote}>Big family</span>
            </button>
          ) : (
            <div className={`${styles.peopleTile} ${styles.peopleCustom}`}>
              <div className={styles.stepper}>
                <button
                  type="button"
                  aria-label="Fewer people"
                  disabled={custom <= BIG_FAMILY.min}
                  onClick={() => setCustom(custom - 1)}
                >
                  <Minus size={16} aria-hidden />
                </button>
                <span className={styles.peopleCount} aria-live="polite">{custom}</span>
                <button
                  type="button"
                  aria-label="More people"
                  disabled={custom >= BIG_FAMILY.max}
                  onClick={() => setCustom(custom + 1)}
                >
                  <Plus size={16} aria-hidden />
                </button>
              </div>
              <button type="button" className={styles.smallAction} onClick={() => setPeople(custom)}>
                {custom} people
              </button>
            </div>
          )}
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
        <div className={styles.slotGrid} role="group" aria-label="Meals to plan">
          {MEAL_SLOTS.map((slot) => {
            const Icon = SLOT_ICON[slot];

            return (
              <button
                key={slot}
                type="button"
                aria-pressed={slots.includes(slot)}
                className={styles.slotTile}
                onClick={() => toggleSlot(slot)}
              >
                <Icon size={30} aria-hidden />
                <span>{SLOT_LABEL[slot]}</span>
                <span className={styles.slotCheck} aria-hidden>
                  <Check size={14} strokeWidth={3} />
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <ErrorNote message={error} />

      <div className={styles.footer}>
        {step === 3 ? (
          <button type="button" className={styles.primary} onClick={finish} disabled={slots.length === 0}>
            Pick my meals <ArrowRight size={18} aria-hidden />
          </button>
        ) : (
          <button type="button" className={styles.quiet} onClick={openSample}>
            Or peek into a lived-in kitchen
          </button>
        )}
      </div>
    </div>
  );
}
