import { roundQuantity } from "@/domain/units";
import type { Catalog } from "@/catalog/types";
import { findProductForUnit, ingredientById, substitutionsFor } from "@/catalog/grocery-graph";
import type { KitchenState } from "@/domain/kitchen/types";
import type { Basket, Learning, SubstitutionSuggestion } from "@/intelligence/types";
import { ingredientAllowedForDiet } from "@/intelligence/diet";
import { explainSubstitution } from "@/intelligence/explanations";
import { substitutionAffinityFor } from "@/intelligence/learning";

/**
 * Substitution suggestions come only from explicit catalog relationships and
 * only for ingredients the plan is actually buying. Household decisions shift
 * the score: accepted swaps get stronger, rejected swaps get weaker. No ML.
 */

const MAX_SUGGESTIONS = 4;
const CUISINE_MATCH_BONUS = 0.05;

type DecisionCounts = { accepted: number; rejected: number };

function countDecisions(kitchen: KitchenState, substitutionId: string): DecisionCounts {
  let accepted = 0;
  let rejected = 0;
  for (const choices of kitchen.weeklyChoices) {
    for (const decision of choices.substitutionDecisions) {
      if (decision.substitutionId !== substitutionId) continue;
      if (decision.accepted) accepted += 1;
      else rejected += 1;
    }
  }
  return { accepted, rejected };
}

export function recommendSubstitutions(
  kitchen: KitchenState,
  catalog: Catalog,
  basket: Basket,
  learning: Learning,
): SubstitutionSuggestion[] {
  const locationId = kitchen.profile.locationId;
  const suggestions: SubstitutionSuggestion[] = [];

  for (const item of basket.items) {
    if (item.status !== "buy") continue;
    for (const substitution of substitutionsFor(catalog, item.ingredientId)) {
      if (substitution.id.endsWith("_self")) continue;
      const substitute = ingredientById(catalog, substitution.substituteIngredientId);
      if (!substitute) continue;
      if (!ingredientAllowedForDiet(substitute, kitchen.profile.diet)) continue;
      if (!findProductForUnit(catalog, substitute.id, locationId, item.unit)) continue;

      const affinity = substitutionAffinityFor(
        learning,
        substitution.requestedIngredientId,
        substitution.substituteIngredientId,
      );
      const affinity01 = (affinity + 1) / 2;
      const cuisineMatch = substitution.cuisines.some((cuisine) =>
        kitchen.profile.cuisines.includes(cuisine),
      );
      const score = Math.min(
        1,
        Math.max(
          0,
          0.6 * substitution.compatibilityScore +
            0.4 * affinity01 +
            (cuisineMatch ? CUISINE_MATCH_BONUS : 0),
        ),
      );

      const counts = countDecisions(kitchen, substitution.id);
      suggestions.push({
        substitution,
        requestedIngredient: item.ingredient,
        substituteIngredient: substitute,
        score: roundQuantity(score * 1000) / 1000,
        acceptedCount: counts.accepted,
        rejectedCount: counts.rejected,
        explanation: explainSubstitution({
          reason: substitution.explanation,
          compatibilityScore: substitution.compatibilityScore,
          acceptedCount: counts.accepted,
          rejectedCount: counts.rejected,
          ratio: substitution.quantityRatio,
        }),
      });
    }
  }

  return suggestions
    .sort((a, b) => b.score - a.score || a.substitution.id.localeCompare(b.substitution.id))
    .slice(0, MAX_SUGGESTIONS);
}
