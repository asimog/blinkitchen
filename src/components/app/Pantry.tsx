"use client";

import { Check } from "lucide-react";
import { findProduct } from "@/catalog/grocery-graph";
import { formatQuantity } from "@/domain/units";
import { buildPantryTimeline } from "@/intelligence/pantry-timeline";
import type { PantryEvent } from "@/intelligence/pantry-timeline";
import { dishName, ingredientTone } from "@/components/app/food";
import { DAY_SHORT, useKitchen } from "@/components/app/use-kitchen";
import type { ReadyKitchen } from "@/components/app/use-kitchen";
import { BottomNav, ErrorNote, Loading } from "@/components/app/ui";
import styles from "@/components/app/app.module.css";

const SHELF_SIZE = 6;

export function Pantry() {
  const session = useKitchen();

  if (session.status !== "ready") return <Loading />;

  return <PantryView session={session} />;
}

type EventCopy = { title: string; detail: string; tone: "urgent" | "soon" | "good" };

function eventCopy(event: PantryEvent): EventCopy {
  const name = event.ingredient.name;

  switch (event.kind) {
    case "use_soon":
      return event.recipeName
        ? { title: `Use the ${name.toLowerCase()}`, detail: `${dishName(event.recipeName)} has it`, tone: "urgent" }
        : { title: `${name} is going off`, detail: "No meal this week uses it", tone: "urgent" };
    case "runs_out":
      if (event.cover === "basket") {
        return { title: `${name} runs out`, detail: "Covered by this week's basket", tone: "good" };
      }

      return {
        title: `${name} runs out`,
        detail: event.cover === "unavailable" ? "Not available nearby" : `Needed for ${dishName(event.recipeName)}`,
        tone: "urgent",
      };
    case "running_low":
      return {
        title: `${name} is getting low`,
        detail: `${formatQuantity(event.remaining, event.unit)} left · nothing planned to restock`,
        tone: "soon",
      };
  }
}

function eventDay(event: PantryEvent): string {
  if (event.kind === "running_low") return "SOON";

  return event.day ? DAY_SHORT[event.day].toUpperCase() : "NOW";
}

function PantryView({ session }: { session: ReadyKitchen }) {
  const { catalog, kitchen, intelligence, run, error } = session;
  const { events, shelf } = buildPantryTimeline(kitchen, catalog, intelligence);
  const flagged = shelf.filter((item) => item.flag !== null);
  const unflagged = shelf.filter((item) => item.flag === null);

  const front = [
    ...flagged,
    ...unflagged.filter((item) => item.ingredient.category !== "spice"),
    ...unflagged.filter((item) => item.ingredient.category === "spice"),
  ].slice(0, SHELF_SIZE);

  const restock = (ingredientId: string) => {
    const product = findProduct(catalog, ingredientId, kitchen.profile.locationId);

    if (!product) return;
    run([{ type: "receive_grocery", lines: [{ ingredientId, quantity: product.packSize, unit: product.unit }] }]);
  };

  return (
    <div className={`${styles.screen} ${styles.paper}`}>
      <header className={styles.topBar}>
        <h1 className={styles.display}>Pantry</h1>
        <span className={styles.counter}>{shelf.length} items</span>
      </header>

      {shelf.length > 0 ? (
        <div className={styles.shelf}>
          <div className={styles.shelfRow}>
            {front.map((item) => (
              <div
                key={item.ingredient.id}
                className={styles.jar}
                data-flag={item.flag ?? undefined}
                aria-label={`${item.ingredient.name}, ${Math.round(item.level * 100)}% of a pack${item.flag ? ", needs attention" : ""}`}
              >
                <span className={styles.jarGlass}>
                  <span
                    className={styles.jarFill}
                    style={{ height: `${Math.max(8, item.level * 100)}%`, background: ingredientTone(item.ingredient) }}
                  />
                </span>
                <span className={styles.jarLabel}>{item.ingredient.name}</span>
              </div>
            ))}
          </div>
          <div className={styles.shelfBoard} aria-hidden />
        </div>
      ) : (
        <p className={styles.emptyNote}>Your pantry fills up as orders arrive.</p>
      )}

      <h2 className={styles.sectionLabel}>Coming up</h2>
      <ErrorNote message={error} />
      {events.length === 0 ? (
        <p className={styles.emptyNote}>Nothing runs out this week.</p>
      ) : (
        <ol className={styles.timeline}>
          {events.map((event) => {
            const copy = eventCopy(event);

            return (
              <li key={`${event.kind}-${event.ingredient.id}`} className={styles.timelineItem}>
                <span className={styles.timelineDay}>{eventDay(event)}</span>
                <div className={styles.timelineCard}>
                  <span className={styles.toneDot} data-tone={copy.tone} aria-hidden />
                  <div className={styles.timelineBody}>
                    <p className={styles.timelineTitle}>{copy.title}</p>
                    <p className={styles.timelineDetail} data-tone={copy.tone}>{copy.detail}</p>
                  </div>
                  {copy.tone === "good" ? <Check size={20} strokeWidth={2.6} className={styles.goodIcon} aria-hidden /> : null}
                  {event.kind === "running_low" ? (
                    <button type="button" className={styles.smallAction} onClick={() => restock(event.ingredient.id)}>
                      Add
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <BottomNav
        pantryAlert={events.some(
          (event) => event.kind === "use_soon" || (event.kind === "runs_out" && event.cover === "none"),
        )}
      />
    </div>
  );
}
