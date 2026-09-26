"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Trash2 } from "lucide-react";
import { loadCatalog } from "@/catalog/load";
import { ingredientById, listCuisines, listIngredients } from "@/catalog/grocery-graph";
import { createKitchenState } from "@/domain/kitchen/state";
import { kitchenProfileSchema } from "@/domain/kitchen/schema";
import { formatQuantity, normalizeQuantity } from "@/domain/units";
import type { Unit } from "@/domain/units";
import { formatIssues } from "@/domain/zod-helpers";
import type { KitchenProfile, KitchenType } from "@/domain/kitchen/types";
import { saveKitchen, LOCAL_KITCHEN_ID } from "@/storage/kitchen-storage";
import {
  COOKING_FREQUENCY_OPTIONS,
  DIET_OPTIONS,
  PRIORITY_CHIPS,
  cookingDaysForFrequency,
  pantryItemsFromQuickPicks,
  preferencesFromPriorities,
  quickPickGroups,
  typicalPack,
} from "@/components/onboarding/onboarding-prefs";
import type {
  CookingFrequencyId,
  PriorityChipId,
  SupportedDiet,
} from "@/components/onboarding/onboarding-prefs";
import styles from "@/components/onboarding/onboarding.module.css";

const STEPS = ["Your household", "How you eat", "Your kitchen"] as const;

const MAX_PRIORITIES = 2;

const SEARCH_RESULT_LIMIT = 8;

const KITCHEN_TYPES: { id: KitchenType; label: string; hint: string }[] = [
  {
    id: "existing",
    label: "I have some stock",
    hint: "Ticks become pantry stock, one typical pack each.",
  },
  {
    id: "fresh",
    label: "Start mostly empty",
    hint: "Nothing counts as stock yet; ticks are just plans.",
  },
];

type Draft = {
  displayName: string;
  memberCount: number;
  locationId: string;
  weeklyBudget: number;
  diet: SupportedDiet;
  cuisines: string[];
  cookingFrequency: CookingFrequencyId;
  priorities: PriorityChipId[];
  kitchenType: KitchenType;
  selectedIngredientIds: string[];
};

function chipClass(active: boolean): string {
  const base = styles.chip ?? "";

  const activeClass = styles.chipActive ?? "";

  return active ? `${base} ${activeClass}` : base;
}

function packLabel(quantity: number, unit: Unit): string {
  const normalized = normalizeQuantity(quantity, unit);

  return formatQuantity(normalized.quantity, normalized.unit);
}

export function BuildWizard({ existingKitchenName }: { existingKitchenName?: string }) {
  const router = useRouter();
  const catalog = useMemo(() => loadCatalog(), []);
  const cuisines = useMemo(() => listCuisines(catalog), [catalog]);
  const quickPicks = useMemo(() => quickPickGroups(catalog), [catalog]);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [draft, setDraft] = useState<Draft>({
    displayName: "",
    memberCount: 4,
    locationId: catalog.locations[0]?.id ?? "delhi_south",
    weeklyBudget: 1500,
    diet: "vegetarian",
    cuisines: [],
    cookingFrequency: "few_days",
    priorities: [],
    kitchenType: "existing",
    selectedIngredientIds: [],
  });

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const toggle = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const togglePriority = (id: PriorityChipId) =>
    setDraft((current) => {
      if (current.priorities.includes(id)) {
        return { ...current, priorities: current.priorities.filter((chip) => chip !== id) };
      }

      if (current.priorities.length >= MAX_PRIORITIES) return current;

      return { ...current, priorities: [...current.priorities, id] };
    });

  const searchMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (query.length === 0) return [];

    return listIngredients(catalog)
      .filter(
        (ingredient) =>
          ingredient.name.toLowerCase().includes(query) ||
          ingredient.aliases.some((alias) => alias.includes(query)),
      )
      .slice(0, SEARCH_RESULT_LIMIT);
  }, [catalog, searchQuery]);

  const validateStep = (index: number): string | null => {
    if (index === 0) {
      if (draft.displayName.trim().length < 2) return "Give the household a name (at least 2 characters).";

      if (draft.memberCount < 1 || draft.memberCount > 20) return "People must be between 1 and 20.";

      if (draft.weeklyBudget < 100 || draft.weeklyBudget > 100_000) return "Weekly budget must be between ₹100 and ₹1,00,000.";
    }

    if (index === 1) {
      if (draft.cuisines.length === 0) return "Pick at least one cuisine you actually cook.";

      if (draft.priorities.length > MAX_PRIORITIES) return "Pick at most two priorities.";
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
    const profile: KitchenProfile = {
      displayName: draft.displayName.trim(),
      memberCount: draft.memberCount,
      locationId: draft.locationId,
      weeklyBudget: draft.weeklyBudget,
      diet: draft.diet,
      cuisines: draft.cuisines,
      cookingDaysPerWeek: cookingDaysForFrequency(draft.cookingFrequency),
      ...preferencesFromPriorities(draft.priorities),
      kitchenType: draft.kitchenType,
      starterIngredientIds: draft.kitchenType === "fresh" ? draft.selectedIngredientIds : [],
    };

    const parsed = kitchenProfileSchema.safeParse(profile);

    if (!parsed.success) {
      setError(formatIssues(parsed.error));

      return;
    }

    const kitchen = createKitchenState({
      id: LOCAL_KITCHEN_ID,
      profile: parsed.data,
      pantry:
        draft.kitchenType === "existing"
          ? pantryItemsFromQuickPicks(catalog, draft.selectedIngredientIds, draft.locationId)
          : [],
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
      <div className={styles.progress} role="img" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={
              index < step
                ? `${styles.progressSegment} ${styles.progressSegmentDone}`
                : index === step
                  ? `${styles.progressSegment} ${styles.progressSegmentActive}`
                  : styles.progressSegment
            }
          />
        ))}
      </div>
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
              <label htmlFor="diet">Diet</label>
              <select
                id="diet"
                value={draft.diet}
                onChange={(event) =>
                  update({
                    diet:
                      DIET_OPTIONS.find((option) => option.id === event.target.value)?.id ?? draft.diet,
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
          </>
        ) : null}

        {step === 1 ? (
          <>
            <fieldset className={styles.fieldset}>
              <legend>Cuisines you cook (pick at least one)</legend>
              <div className={styles.chipRow}>
                {cuisines.map((cuisine) => (
                  <label
                    key={cuisine}
                    className={chipClass(draft.cuisines.includes(cuisine))}
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

            <fieldset className={styles.fieldset}>
              <legend>How often do you cook?</legend>
              <div className={styles.chipRow}>
                {COOKING_FREQUENCY_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={chipClass(draft.cookingFrequency === option.id)}
                  >
                    <input
                      type="radio"
                      name="cooking-frequency"
                      checked={draft.cookingFrequency === option.id}
                      onChange={() => update({ cookingFrequency: option.id })}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>What matters most in your week? (pick up to two)</legend>
              <div className={styles.chipRow}>
                {PRIORITY_CHIPS.map((chip) => (
                  <label key={chip.id} className={chipClass(draft.priorities.includes(chip.id))}>
                    <input
                      type="checkbox"
                      checked={draft.priorities.includes(chip.id)}
                      disabled={
                        !draft.priorities.includes(chip.id) &&
                        draft.priorities.length >= MAX_PRIORITIES
                      }
                      onChange={() => togglePriority(chip.id)}
                    />
                    {chip.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <fieldset className={styles.fieldset}>
              <legend>Where are you starting from?</legend>
              <div className={styles.optionRow}>
                {KITCHEN_TYPES.map((option) => (
                  <label
                    key={option.id}
                    className={
                      draft.kitchenType === option.id
                        ? `${styles.optionCard} ${styles.optionCardActive}`
                        : styles.optionCard
                    }
                  >
                    <input
                      type="radio"
                      name="kitchen-type"
                      checked={draft.kitchenType === option.id}
                      onChange={() => update({ kitchenType: option.id })}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <span className={styles.hint}>{option.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {quickPicks.map((group) => (
              <fieldset className={styles.fieldset} key={group.id}>
                <legend>{group.label}</legend>
                <div className={styles.chipRow}>
                  {group.ingredients.map((ingredient) => (
                    <label
                      key={ingredient.id}
                      className={chipClass(draft.selectedIngredientIds.includes(ingredient.id))}
                    >
                      <input
                        type="checkbox"
                        checked={draft.selectedIngredientIds.includes(ingredient.id)}
                        onChange={() =>
                          update({
                            selectedIngredientIds: toggle(draft.selectedIngredientIds, ingredient.id),
                          })
                        }
                      />
                      {ingredient.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            <div className={styles.field}>
              <label htmlFor="ingredient-search">Something else you buy every week?</label>
              <input
                id="ingredient-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search all ingredients"
                autoComplete="off"
              />
              <p className={styles.hint}>
                Optional. Search adds one typical pack; pick nothing and Week 1 starts leaner.
              </p>
            </div>

            {searchQuery.trim().length > 0 ? (
              <fieldset className={styles.fieldset}>
                <legend>Matches</legend>
                {searchMatches.length > 0 ? (
                  <div className={styles.chipRow}>
                    {searchMatches.map((ingredient) => (
                      <label
                        key={ingredient.id}
                        className={chipClass(draft.selectedIngredientIds.includes(ingredient.id))}
                      >
                        <input
                          type="checkbox"
                          checked={draft.selectedIngredientIds.includes(ingredient.id)}
                          onChange={() =>
                            update({
                              selectedIngredientIds: toggle(draft.selectedIngredientIds, ingredient.id),
                            })
                          }
                        />
                        {ingredient.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className={styles.hint}>No ingredients match that.</p>
                )}
              </fieldset>
            ) : null}

            <fieldset className={styles.fieldset}>
              <legend>
                {draft.kitchenType === "existing" ? "In your kitchen" : "Planned essentials"}
              </legend>
              {draft.selectedIngredientIds.length === 0 ? (
                <p className={styles.hint}>
                  {draft.kitchenType === "existing"
                    ? "Nothing recorded — Week 1 starts mostly empty. That's allowed."
                    : "No essentials planned — Week 1 starts mostly empty. That's allowed."}
                </p>
              ) : (
                <ul className={styles.pantryList}>
                  {draft.selectedIngredientIds.map((ingredientId) => {
                    const row = ingredientById(catalog, ingredientId);
                    const pack = typicalPack(catalog, ingredientId, draft.locationId);

                    return (
                      <li key={ingredientId}>
                        <span>
                          <strong>{row?.name ?? ingredientId}</strong>
                          {draft.kitchenType === "existing" && pack
                            ? ` · ${packLabel(pack.quantity, pack.unit)} typical pack`
                            : null}
                          {draft.kitchenType === "fresh" ? " · planned" : null}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-small"
                          onClick={() =>
                            update({
                              selectedIngredientIds: draft.selectedIngredientIds.filter(
                                (candidate) => candidate !== ingredientId,
                              ),
                            })
                          }
                        >
                          <Trash2 size={14} aria-hidden />
                          <span className="sr-only">Remove {row?.name ?? ingredientId}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>
          </>
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
