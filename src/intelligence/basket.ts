import { normalizeQuantity, roundQuantity } from "@/domain/units";
import type { CanonicalUnit } from "@/domain/units";
import { compareStrings } from "@/domain/order";
import type { Basket, BasketItem, BasketItemStatus, EffectiveRequirement, PlannedMeal } from "@/intelligence/types";
import type { Catalog, Recipe, RecipeRequirement, Substitution } from "@/catalog/types";
import { findProductForUnit, ingredientById, recipeRequirements } from "@/catalog/grocery-graph";
import { currentChoices, pantryQuantity } from "@/domain/kitchen/state";
import type { KitchenState } from "@/domain/kitchen/types";
import { unitCostOrZero } from "@/intelligence/costing";
import { explainBasketItem } from "@/intelligence/explanations";

/**
 * Pantry-aware basket construction:
 *
 *   recipe requirements -> aggregate -> subtract pantry -> resolve simulated
 *   SKUs -> pack counts -> basket lines with explanations.
 *
 * Accepted substitutions replace the requested ingredient (with a quantity
 * ratio), so accepting a swap visibly changes what gets bought.
 */

type Aggregate = {
  ingredientId: string;
  unit: CanonicalUnit;
  required: number;
  usedInRecipeIds: Set<string>;
};

function acceptedSubstitutionFor(
  catalog: Catalog,
  acceptedIds: ReadonlySet<string>,
  ingredientId: string,
): Substitution | undefined {
  return catalog.substitutions
    .filter(
      (substitution) =>
        substitution.requestedIngredientId === ingredientId &&
        acceptedIds.has(substitution.id),
    )
    .sort((a, b) => compareStrings(a.id, b.id))[0];
}

/**
 * Requirement after applying this week's accepted substitutions. Shared with
 * the simulation policy so cooking and buying always agree.
 */
export function effectiveRequirement(
  kitchen: KitchenState,
  catalog: Catalog,
  requirement: RecipeRequirement,
): EffectiveRequirement {
  const acceptedIds = new Set(
    currentChoices(kitchen)
      .substitutionDecisions.filter((decision) => decision.accepted)
      .map((decision) => decision.substitutionId),
  );

  const substitution = acceptedSubstitutionFor(catalog, acceptedIds, requirement.ingredient.id);

  if (!substitution) {
    return {
      ingredientId: requirement.ingredient.id,
      quantity: requirement.quantity,
      unit: requirement.unit,
    };
  }

  return {
    ingredientId: substitution.substituteIngredientId,
    quantity: requirement.quantity * substitution.quantityRatio,
    unit: requirement.unit,
    substitution,
  };
}

function aggregateRequirements(
  kitchen: KitchenState,
  catalog: Catalog,
  recipes: Recipe[],
): Map<string, Aggregate> {
  const aggregates = new Map<string, Aggregate>();

  for (const recipe of recipes) {
    const scale = kitchen.profile.memberCount / recipe.servings;

    for (const requirement of recipeRequirements(catalog, recipe)) {
      const effective = effectiveRequirement(kitchen, catalog, requirement);

      if (!ingredientById(catalog, effective.ingredientId)) continue;
      const required = normalizeQuantity(effective.quantity * scale, effective.unit);
      const key = `${effective.ingredientId}:${required.unit}`;
      const existing = aggregates.get(key);

      if (existing) {
        existing.required = roundQuantity(existing.required + required.quantity);
        existing.usedInRecipeIds.add(recipe.id);
      } else {
        aggregates.set(key, {
          ingredientId: effective.ingredientId,
          unit: required.unit,
          required: required.quantity,
          usedInRecipeIds: new Set([recipe.id]),
        });
      }
    }
  }

  return aggregates;
}

export function buildBasket(
  kitchen: KitchenState,
  catalog: Catalog,
  plan: PlannedMeal[],
): Basket {
  const locationId = kitchen.profile.locationId;

  const aggregates = aggregateRequirements(
    kitchen,
    catalog,
    plan.map((meal) => meal.recipe),
  );

  const items: BasketItem[] = [];
  let requiredValue = 0;
  let coveredValue = 0;

  const aggregatesByKey = [...aggregates.entries()].sort((a, b) => compareStrings(a[0], b[0]));

  for (const [, aggregate] of aggregatesByKey) {
    const ingredient = ingredientById(catalog, aggregate.ingredientId);

    if (!ingredient) continue;

    const ownedCanonical = normalizeQuantity(
      pantryQuantity(kitchen, aggregate.ingredientId, aggregate.unit),
      aggregate.unit,
    ).quantity;

    const owned = Math.min(ownedCanonical, aggregate.required);
    const missing = Math.max(0, roundQuantity(aggregate.required - ownedCanonical));
    const unitCost = unitCostOrZero(catalog, aggregate.ingredientId, aggregate.unit, locationId);
    requiredValue += aggregate.required * unitCost;
    coveredValue += owned * unitCost;

    const product =
      missing > 0
        ? findProductForUnit(catalog, aggregate.ingredientId, locationId, aggregate.unit)
        : undefined;

    const packSizeCanonical = product
      ? normalizeQuantity(product.packSize, product.unit).quantity
      : 0;

    const packCount =
      product && packSizeCanonical > 0 ? Math.max(0, Math.ceil(missing / packSizeCanonical - 1e-9)) : 0;

    const purchasedQuantity = roundQuantity(packCount * packSizeCanonical);
    const lineCost = product ? roundQuantity(packCount * product.price) : 0;

    const status: BasketItemStatus =
      missing <= 0 ? "covered" : product ? "buy" : "unavailable";

    const explanation = explainBasketItem({
      required: aggregate.required,
      owned: ownedCanonical,
      missing,
      unit: aggregate.unit,
      packCount,
      packSize: product ? normalizeQuantity(product.packSize, product.unit).quantity : 0,
      packUnit: aggregate.unit,
      brand: product?.brand ?? "",
      lineCost,
      status,
    });

    const item: BasketItem = {
      ingredientId: aggregate.ingredientId,
      ingredient,
      required: aggregate.required,
      owned: ownedCanonical,
      missing,
      unit: aggregate.unit,
      packCount,
      purchasedQuantity,
      lineCost,
      status,
      usedInRecipeIds: [...aggregate.usedInRecipeIds].sort(compareStrings),
      explanation,
    };

    if (product) {
      item.product = product;
    }

    items.push(item);
  }

  const totalCost = roundQuantity(items.reduce((total, item) => total + item.lineCost, 0));

  return {
    items,
    totalCost,
    requiredValue: roundQuantity(requiredValue),
    pantryValueAvoided: roundQuantity(coveredValue),
    coveragePercent: requiredValue > 0 ? roundQuantity((coveredValue / requiredValue) * 100) : 0,
    fulfillable: items.length > 0 && items.every((item) => item.status !== "unavailable"),
    simulated: true,
  };
}
