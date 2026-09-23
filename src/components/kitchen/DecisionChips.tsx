import { ingredientById } from "@/catalog/grocery-graph";
import type { Catalog } from "@/catalog/types";
import type { SubstitutionDecision } from "@/domain/kitchen/types";
import styles from "@/components/kitchen/kitchen.module.css";

/** Chips describing swaps the household already decided, with ingredient names. */
export function DecisionChips({
  decisions,
  catalog,
  label,
}: {
  decisions: SubstitutionDecision[];
  catalog: Catalog;
  label: string;
}) {
  if (decisions.length === 0) return null;
  const nameOf = (ingredientId: string) =>
    ingredientById(catalog, ingredientId)?.name ?? ingredientId;

  return (
    <div className={styles.badgeRow} aria-label={label}>
      <span className="small muted" style={{ alignSelf: "center" }}>
        {label}
      </span>
      {decisions.map((decision) => {
        const substitution = catalog.substitutions.find(
          (row) => row.id === decision.substitutionId,
        );
        if (!substitution) return null;
        const requested = nameOf(substitution.requestedIngredientId);
        const substitute = nameOf(substitution.substituteIngredientId);
        return (
          <span
            key={decision.substitutionId}
            className={`pill ${decision.accepted ? styles.decisionAccepted : styles.decisionRejected}`}
          >
            {decision.accepted
              ? `Swapped ${requested} → ${substitute}`
              : `Kept ${requested}`}
          </span>
        );
      })}
    </div>
  );
}
