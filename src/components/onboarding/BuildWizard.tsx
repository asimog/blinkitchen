"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { loadCatalog } from "@/catalog/load";
import { ingredientById, listCuisines, listIngredients, listStaples } from "@/catalog/grocery-graph";
import { createKitchenState } from "@/domain/kitchen/state";
import { kitchenProfileSchema } from "@/domain/kitchen/schema";
import { formatIssues } from "@/domain/zod-helpers";
import type { DietPreference, KitchenProfile, KitchenType, PantryItem } from "@/domain/kitchen/types";
import type { Unit } from "@/domain/units";
import { saveKitchen, LOCAL_KITCHEN_ID } from "@/storage/kitchen-storage";
import styles from "@/components/onboarding/onboarding.module.css";

const EQUIPMENT_OPTIONS: { id: string; label: string }[] = [
  { id: "pressure_cooker", label: "Pressure cooker" },
  { id: "tawa", label: "Tawa / griddle" },
  { id: "mixer_grinder", label: "Mixer grinder" },
  { id: "microwave", label: "Microwave" },
  { id: "wok", label: "Wok" },
  { id: "kadhai", label: "Kadhai" },
  { id: "oven", label: "Oven" },
];

const DIET_OPTIONS: { id: DietPreference; label: string }[] = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "eggetarian", label: "Eggetarian" },
  { id: "non_vegetarian", label: "Non-vegetarian" },
  { id: "flexible", label: "Flexible" },
];

const STEPS = ["Household", "Food preferences", "Kitchen & pantry", "Cooking routine", "Review"] as const;

/** Numeric 0..1 preference fields, keyed for the routine sliders. */
type PreferenceKey =
  | "conveniencePreference"
  | "priceSensitivity"
  | "explorationPreference"
  | "planningPreference";

type Draft = {
  displayName: string;
  memberCount: number;
  locationId: string;
  weeklyBudget: number;
  kitchenType: KitchenType;
  diet: DietPreference;
  cuisines: string[];
  equipment: string[];
  cookingDaysPerWeek: number;
  mealsCookedPerDay: number;
  conveniencePreference: number;
  priceSensitivity: number;
  explorationPreference: number;
  planningPreference: number;
  pantry: PantryItem[];
  starterIngredientIds: string[];
};

function level(value: number): string {
  if (value < 0.34) return "Low";

  if (value < 0.67) return "Medium";

  return "High";
}

export function BuildWizard({ existingKitchenName }: { existingKitchenName?: string }) {
  const router = useRouter();
  const catalog = useMemo(() => loadCatalog(), []);
  const cuisines = useMemo(() => listCuisines(catalog), [catalog]);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft>({
    displayName: "",
    memberCount: 4,
    locationId: catalog.locations[0]?.id ?? "delhi_south",
    weeklyBudget: 1500,
    kitchenType: "existing",
    diet: "vegetarian",
    cuisines: [],
    equipment: [],
    cookingDaysPerWeek: 5,
    mealsCookedPerDay: 2,
    conveniencePreference: 0.5,
    priceSensitivity: 0.5,
    explorationPreference: 0.4,
    planningPreference: 0.6,
    pantry: [],
    starterIngredientIds: [],
  });

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const updatePreference = (key: PreferenceKey, value: number) =>
    setDraft((current) => {
      const next = { ...current };
      next[key] = value;

      return next;
    });

  const toggle = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const profile: KitchenProfile = {
    displayName: draft.displayName.trim(),
    memberCount: draft.memberCount,
    locationId: draft.locationId,
    weeklyBudget: draft.weeklyBudget,
    diet: draft.diet,
    cuisines: draft.cuisines,
    cookingDaysPerWeek: draft.cookingDaysPerWeek,
    mealsCookedPerDay: draft.mealsCookedPerDay,
    conveniencePreference: draft.conveniencePreference,
    priceSensitivity: draft.priceSensitivity,
    explorationPreference: draft.explorationPreference,
    planningPreference: draft.planningPreference,
    equipment: draft.equipment,
    kitchenType: draft.kitchenType,
    starterIngredientIds: draft.kitchenType === "fresh" ? draft.starterIngredientIds : [],
  };

  const validateStep = (index: number): string | null => {
    if (index === 0) {
      if (draft.displayName.trim().length < 2) return "Give the household a name (at least 2 characters).";

      if (draft.memberCount < 1 || draft.memberCount > 20) return "People must be between 1 and 20.";

      if (draft.weeklyBudget < 100 || draft.weeklyBudget > 100_000) return "Weekly budget must be between ₹100 and ₹1,00,000.";
    }

    if (index === 1 && draft.cuisines.length === 0) {
      return "Pick at least one cuisine you actually cook.";
    }

    if (index === 2) {
      const invalid = draft.pantry.find((item) => !(item.quantity > 0));

      if (invalid) return "Every pantry item needs a quantity above zero.";
    }

    return null;
  };

  const next = () => {
    const problem = validateStep(step);

    if (problem) {
      setError(problem);

      return;
    }

    setError(null);
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };

  const back = () => {
    setError(null);
    setStep((current) => Math.max(0, current - 1));
  };

  const finish = () => {
    const parsed = kitchenProfileSchema.safeParse(profile);

    if (!parsed.success) {
      setError(formatIssues(parsed.error));

      return;
    }

    const kitchen = createKitchenState({
      id: LOCAL_KITCHEN_ID,
      profile: parsed.data,
      pantry: draft.pantry,
      createdAt: new Date().toISOString(),
    });

    if (!saveKitchen(kitchen)) {
      setError("The household could not be saved in this browser.");

      return;
    }

    router.push("/kitchen");
  };

  return (
    <div className={styles.wizard}>
      <p className="eyebrow">
        Build your household · Step {step + 1} of {STEPS.length}
      </p>
      <h2 className={styles.stepTitle}>{STEPS[step]}</h2>

      {existingKitchenName ? (
        <p className={styles.warning}>
          You already have a household (“{existingKitchenName}”). Finishing this wizard replaces it.
        </p>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.stepBody}>
        {step === 0 ? (
          <>
            <div className={styles.field}>
              <label htmlFor="household-name">Household name</label>
              <input
                id="household-name"
                type="text"
                value={draft.displayName}
                onChange={(event) => update({ displayName: event.target.value })}
                placeholder="e.g. The Mehtas"
                autoComplete="off"
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="member-count">People in the household</label>
                <input
                  id="member-count"
                  type="number"
                  min={1}
                  max={20}
                  value={draft.memberCount}
                  onChange={(event) => update({ memberCount: Number(event.target.value) })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="weekly-budget">Weekly grocery budget (₹)</label>
                <input
                  id="weekly-budget"
                  type="number"
                  min={100}
                  max={100000}
                  step={50}
                  value={draft.weeklyBudget}
                  onChange={(event) => update({ weeklyBudget: Number(event.target.value) })}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="location">Delivery area</label>
              <select
                id="location"
                value={draft.locationId}
                onChange={(event) => update({ locationId: event.target.value })}
              >
                {catalog.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.city})
                  </option>
                ))}
              </select>
              <p className={styles.hint}>Simulated availability — different areas stock different SKUs.</p>
            </div>
            <fieldset className={styles.fieldset}>
              <legend>What does your kitchen look like right now?</legend>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="kitchen-type"
                  checked={draft.kitchenType === "existing"}
                  onChange={() => update({ kitchenType: "existing" })}
                />
                <span>
                  <strong>Existing kitchen</strong>
                  <span className={styles.hint}>I&apos;ll record useful pantry stock in the next step.</span>
                </span>
              </label>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="kitchen-type"
                  checked={draft.kitchenType === "fresh"}
                  onChange={() => update({ kitchenType: "fresh", pantry: [] })}
                />
                <span>
                  <strong>Fresh kitchen</strong>
                  <span className={styles.hint}>Starts empty; I can name essentials I plan to stock.</span>
                </span>
              </label>
            </fieldset>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div className={styles.field}>
              <label htmlFor="diet">Diet</label>
              <select
                id="diet"
                value={draft.diet}
                onChange={(event) =>
                  update({
                    diet:
                      DIET_OPTIONS.find((option) => option.id === event.target.value)?.id ??
                      draft.diet,
                  })
                }
              >
                {DIET_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className={styles.hint}>Diet is a hard filter: incompatible recipes are never shown.</p>
            </div>
            <fieldset className={styles.fieldset}>
              <legend>Cuisines you cook (pick at least one)</legend>
              <div className={styles.chipRow}>
                {cuisines.map((cuisine) => (
                  <label
                    key={cuisine}
                    className={`${styles.chip} ${draft.cuisines.includes(cuisine) ? styles.chipActive : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={draft.cuisines.includes(cuisine)}
                      onChange={() => update({ cuisines: toggle(draft.cuisines, cuisine) })}
                    />
                    {cuisine.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : null}

        {step === 2 ? (
          draft.kitchenType === "existing" ? (
            <PantryEditor draft={draft} update={update} />
          ) : (
            <fieldset className={styles.fieldset}>
              <legend>Essentials you expect to stock (optional)</legend>
              <p className={styles.hint}>
                These are intentions for a fresh kitchen, not stock. They never count as inventory.
              </p>
              <div className={styles.chipRow}>
                {listStaples(catalog).map((ingredient) => (
                  <label
                    key={ingredient.id}
                    className={`${styles.chip} ${
                      draft.starterIngredientIds.includes(ingredient.id) ? styles.chipActive : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={draft.starterIngredientIds.includes(ingredient.id)}
                      onChange={() =>
                        update({ starterIngredientIds: toggle(draft.starterIngredientIds, ingredient.id) })
                      }
                    />
                    {ingredient.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )
        ) : null}

        {step === 3 ? (
          <>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="cooking-days">Cooking days per week</label>
                <input
                  id="cooking-days"
                  type="number"
                  min={0}
                  max={7}
                  value={draft.cookingDaysPerWeek}
                  onChange={(event) => update({ cookingDaysPerWeek: Number(event.target.value) })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="meals-per-day">Meals cooked per day</label>
                <input
                  id="meals-per-day"
                  type="number"
                  min={1}
                  max={3}
                  value={draft.mealsCookedPerDay}
                  onChange={(event) => update({ mealsCookedPerDay: Number(event.target.value) })}
                />
              </div>
            </div>

            {(
              [
                ["conveniencePreference", "Convenience", "Quick, low-effort meals vs slow cooking"],
                ["priceSensitivity", "Price sensitivity", "Value picks vs premium ingredients"],
                ["explorationPreference", "Exploration", "Familiar dishes vs new cuisines"],
                ["planningPreference", "Planning", "Cook from the pantry vs buy fresh each week"],
              ] as const
            ).map(([key, label, hint]) => (
              <div className={styles.field} key={key}>
                <label htmlFor={key}>
                  {label}: <strong>{level(draft[key])}</strong>
                </label>
                <input
                  id={key}
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={draft[key]}
                  aria-valuetext={level(draft[key])}
                  onChange={(event) => updatePreference(key, Number(event.target.value))}
                />
                <p className={styles.hint}>{hint}</p>
              </div>
            ))}

            <fieldset className={styles.fieldset}>
              <legend>Equipment (optional)</legend>
              <div className={styles.chipRow}>
                {EQUIPMENT_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={`${styles.chip} ${draft.equipment.includes(option.id) ? styles.chipActive : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={draft.equipment.includes(option.id)}
                      onChange={() => update({ equipment: toggle(draft.equipment, option.id) })}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : null}

        {step === 4 ? (
          <dl className={styles.review}>
            <div>
              <dt>Household</dt>
              <dd>
                {draft.displayName.trim()} · {draft.memberCount} people ·{" "}
                {catalog.locations.find((location) => location.id === draft.locationId)?.name} · ₹
                {draft.weeklyBudget}/week
              </dd>
            </div>
            <div>
              <dt>Preferences</dt>
              <dd>
                {DIET_OPTIONS.find((option) => option.id === draft.diet)?.label} ·{" "}
                {draft.cuisines.map((cuisine) => cuisine.replace(/_/g, " ")).join(", ")}
              </dd>
            </div>
            <div>
              <dt>Kitchen</dt>
              <dd>
                {draft.kitchenType === "fresh"
                  ? `Fresh kitchen · ${draft.starterIngredientIds.length} essentials planned`
                  : `Existing kitchen · ${draft.pantry.length} pantry items`}
              </dd>
            </div>
            <div>
              <dt>Routine</dt>
              <dd>
                Cooks {draft.cookingDaysPerWeek} days/week · {draft.mealsCookedPerDay} meals/day ·
                convenience {level(draft.conveniencePreference).toLowerCase()} · price{" "}
                {level(draft.priceSensitivity).toLowerCase()}
              </dd>
            </div>
            <div>
              <dt>What happens next</dt>
              <dd>
                Blinkitchen starts Week 1 from these facts. Everything after that is learned from
                what you cook, buy, swap and waste. Nothing is ordered or charged.
              </dd>
            </div>
          </dl>
        ) : null}
      </div>

      <div className={styles.nav}>
        <button type="button" className="btn btn-secondary" onClick={back} disabled={step === 0}>
          <ArrowLeft size={16} aria-hidden /> Back
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={next}>
            Continue <ArrowRight size={16} aria-hidden />
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={finish}>
            <Check size={16} aria-hidden /> Start Week 1
          </button>
        )}
      </div>
    </div>
  );
}

function PantryEditor({
  draft,
  update,
}: {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
}) {
  const catalog = useMemo(() => loadCatalog(), []);
  const ingredients = useMemo(() => listIngredients(catalog), [catalog]);
  const [ingredientId, setIngredientId] = useState(ingredients[0]?.id ?? "");
  const [quantity, setQuantity] = useState<number>(500);
  const [unit, setUnit] = useState<Unit>("g");
  const [useSoon, setUseSoon] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const ingredient = ingredientById(catalog, ingredientId);
  const units = ingredient?.commonUnits ?? ["g"];

  const add = () => {
    if (!ingredient) {
      setProblem("Pick an ingredient first.");

      return;
    }

    if (!(quantity > 0)) {
      setProblem("Quantity must be above zero.");

      return;
    }

    if (!units.includes(unit)) {
      setProblem(`Use one of: ${units.join(", ")} for ${ingredient.name}.`);

      return;
    }

    if (draft.pantry.some((item) => item.ingredientId === ingredient.id)) {
      setProblem(`${ingredient.name} is already in the pantry — remove it first to change it.`);

      return;
    }

    setProblem(null);
    update({
      pantry: [...draft.pantry, { ingredientId: ingredient.id, quantity, unit, useSoon, acquiredWeek: 1 }],
    });
    setUseSoon(false);
  };

  return (
    <div>
      <p className={styles.hint}>
        Record useful stock only. Leave out anything you don&apos;t track — an empty pantry is fine.
      </p>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="pantry-ingredient">Ingredient</label>
          <select
            id="pantry-ingredient"
            value={ingredientId}
            onChange={(event) => {
              const nextIngredient = ingredientById(catalog, event.target.value);
              setIngredientId(event.target.value);

              if (nextIngredient && nextIngredient.commonUnits[0]) setUnit(nextIngredient.commonUnits[0]);
            }}
          >
            {ingredients.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="pantry-quantity">Quantity</label>
          <input
            id="pantry-quantity"
            type="number"
            min={0}
            step={10}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="pantry-unit">Unit</label>
          <select
            id="pantry-unit"
            value={unit}
            onChange={(event) =>
              setUnit(units.find((candidate) => candidate === event.target.value) ?? unit)
            }
          >
            {units.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className={styles.checkbox}>
        <input type="checkbox" checked={useSoon} onChange={(event) => setUseSoon(event.target.checked)} />
        Mark as “use soon”
      </label>
      <div className={styles.nav}>
        <button type="button" className="btn btn-secondary btn-small" onClick={add}>
          <Plus size={14} aria-hidden /> Add to pantry
        </button>
      </div>
      {problem ? (
        <p className={styles.error} role="alert">
          {problem}
        </p>
      ) : null}

      {draft.pantry.length > 0 ? (
        <ul className={styles.pantryList}>
          {draft.pantry.map((item) => {
            const row = ingredientById(catalog, item.ingredientId);

            return (
              <li key={item.ingredientId}>
                <span>
                  <strong>{row?.name ?? item.ingredientId}</strong> · {item.quantity} {item.unit}
                  {item.useSoon ? <em className={styles.useSoon}> · use soon</em> : null}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() =>
                    update({ pantry: draft.pantry.filter((row2) => row2.ingredientId !== item.ingredientId) })
                  }
                >
                  <Trash2 size={14} aria-hidden />
                  <span className="sr-only">Remove {row?.name ?? item.ingredientId}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.hint}>Nothing recorded yet — that&apos;s allowed.</p>
      )}
    </div>
  );
}
