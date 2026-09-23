import type { Catalog } from "@/catalog/types";
import { applyKitchenCommand } from "@/domain/kitchen/commands";
import type { KitchenCommand, KitchenError } from "@/domain/kitchen/commands";
import { isJourneyComplete } from "@/domain/kitchen/state";
import { WEEK_MAX, WEEK_MIN } from "@/domain/kitchen/types";
import type { KitchenState } from "@/domain/kitchen/types";
import { buildWeekIntelligence } from "@/intelligence";
import type { JourneyPolicy } from "@/simulation/policies";

/**
 * Deterministic journey simulation.
 *
 * It is a helper, not a second domain: every transition goes through
 * applyKitchenCommand, identical to the interactive prototype. Given identical
 * inputs, results are byte-identical — no clocks, no randomness, no snapshots.
 */

export class SimulationError extends Error {
  constructor(week: number, command: KitchenCommand, error: KitchenError) {
    super(
      `Simulation failed in week ${week} on ${command.type}: ${error.code} — ${error.message}`,
    );
    this.name = "SimulationError";
  }
}

type WeekResult =
  | { ok: true; state: KitchenState }
  | { ok: false; command: KitchenCommand; error: KitchenError };

/** Build one week of intelligence, run the policy, apply its commands in order. */
export function simulateWeek(
  kitchen: KitchenState,
  catalog: Catalog,
  policy: JourneyPolicy,
): WeekResult {
  const intelligence = buildWeekIntelligence(kitchen, catalog);
  const commands = policy(kitchen, catalog, intelligence);
  let state = kitchen;

  for (const command of commands) {
    const result = applyKitchenCommand(state, command);

    if (!result.ok) {
      return { ok: false, command, error: result.error };
    }

    state = result.state;
  }

  return { ok: true, state };
}

/**
 * Simulate consecutive weeks from the starting kitchen and return one state
 * per week, ending at `weeks` (default 8). If the journey is already complete,
 * or the kitchen already starts later than `weeks`, the returned array is
 * shorter — states always describe the weeks they represent via `state.week`.
 */
export function simulateJourney(
  startingKitchen: KitchenState,
  catalog: Catalog,
  policy: JourneyPolicy,
  weeks: number = WEEK_MAX,
): KitchenState[] {
  const target = Math.min(WEEK_MAX, Math.max(WEEK_MIN, Math.trunc(weeks)));
  const states: KitchenState[] = [startingKitchen];
  let state = startingKitchen;

  while (state.week < target && !isJourneyComplete(state)) {
    const result = simulateWeek(state, catalog, policy);

    if (!result.ok) {
      throw new SimulationError(state.week, result.command, result.error);
    }

    if (result.state.week === state.week && !isJourneyComplete(result.state)) {
      throw new SimulationError(state.week, { type: "complete_week" }, {
        code: "invalid_command",
        message: "Policy did not advance the week or complete the journey",
      });
    }

    state = result.state;
    states.push(state);
  }

  return states;
}
