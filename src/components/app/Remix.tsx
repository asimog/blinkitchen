"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { currentChoices } from "@/domain/kitchen/state";
import type { KitchenCommand } from "@/domain/kitchen/commands";
import { humanizeId } from "@/intelligence";
import { buildRemixStories, storySelections, storySkippedRecipeId } from "@/intelligence/remix";
import type { RemixStory } from "@/intelligence/remix";
import { dishName } from "@/components/app/food";
import { DAY_SHORT, mainSlot, useKitchen } from "@/components/app/use-kitchen";
import type { ReadyKitchen } from "@/components/app/use-kitchen";
import { Loading, Plate } from "@/components/app/ui";
import styles from "@/components/app/app.module.css";

export function Remix() {
  const session = useKitchen();

  if (session.status !== "ready") return <Loading />;

  return <Stories session={session} />;
}

const THEME: Record<RemixStory["kind"], string | undefined> = {
  chain: styles.storyLeaf,
  swap: styles.storySaffron,
  new: styles.storyChilli,
  pantry: styles.storyInk,
};

function Stories({ session }: { session: ReadyKitchen }) {
  const { catalog, kitchen, intelligence, run } = session;
  const router = useRouter();
  const [stories] = useState(() => buildRemixStories(kitchen, catalog, intelligence));
  const [index, setIndex] = useState(0);
  const story = stories[index];

  const next = () => {
    if (index + 1 >= stories.length) router.push("/week");
    else setIndex(index + 1);
  };

  if (!story) {
    return (
      <div className={`${styles.screen} ${styles.storyLeaf}`}>
        <div className={styles.storyBody}>
          <p className={styles.storyKicker}>WEEK {kitchen.week}</p>
          <h1 className={styles.storyTitle}>A fresh week.</h1>
        </div>
        <div className={styles.footer}>
          <button type="button" className={styles.primary} onClick={() => router.push("/week")}>
            Plan it
          </button>
        </div>
      </div>
    );
  }

  const keep = () => {
    const additions = storySelections(story, mainSlot(kitchen.profile));
    const days = new Set(additions.map((meal) => `${meal.day}:${meal.slot}`));
    const kept = currentChoices(kitchen).selectedMeals.filter((meal) => !days.has(`${meal.day}:${meal.slot}`));

    if (run([{ type: "select_meals", meals: [...kept, ...additions] }])) next();
  };

  const dismiss = () => {
    const skipped = storySkippedRecipeId(story);
    const commands: KitchenCommand[] = skipped ? [{ type: "skip_recommendation", recipeId: skipped }] : [];

    if (commands.length === 0 || run(commands)) next();
  };

  return (
    <div className={`${styles.screen} ${THEME[story.kind] ?? ""}`}>
      <div className={styles.storyProgress} aria-label={`Idea ${index + 1} of ${stories.length}`}>
        {stories.map((row, position) => (
          <span key={row.id} data-done={position <= index || undefined} />
        ))}
      </div>
      <div className={styles.storyTop}>
        <p className={styles.storyHeading}>Week {kitchen.week}, remixed</p>
        <button type="button" className={styles.iconLinkLight} aria-label="Close" onClick={() => router.push("/week")}>
          <X size={22} aria-hidden />
        </button>
      </div>

      <div className={styles.storyBody}>
        {story.kind === "chain" ? (
          <>
            <p className={styles.storyKicker}>ONE {story.ingredient.name.toUpperCase()}, {story.meals.length} DISHES</p>
            <h1 className={styles.storyTitle}>{story.ingredient.name} goes all the way.</h1>
            <ol className={styles.chainRow}>
              {story.meals.map((meal) => (
                <li key={meal.recipe.id}>
                  <Plate catalog={catalog} recipe={meal.recipe} size={76} className={styles.storyPlate} />
                  <span className={styles.chainName}>{dishName(meal.recipe.name)}</span>
                  <span className={styles.chainDay}>{DAY_SHORT[meal.day]}</span>
                </li>
              ))}
            </ol>
          </>
        ) : null}

        {story.kind === "swap" ? (
          <>
            <p className={styles.storyKicker}>YOU HAD {story.from.name.toUpperCase()} LAST WEEK</p>
            <h1 className={styles.storyTitle}>Try {dishName(story.to.name)} instead?</h1>
            <div className={styles.swapRow}>
              <span className={styles.swapFrom}><Plate catalog={catalog} recipe={story.from} size={96} /></span>
              <span className={styles.swapArrow} aria-hidden>→</span>
              <Plate catalog={catalog} recipe={story.to} size={150} className={styles.storyPlate} />
            </div>
            <p className={styles.storyNote}>Same {humanizeId(story.to.cuisine)} comfort · {DAY_SHORT[story.day]}</p>
          </>
        ) : null}

        {story.kind === "new" ? (
          <>
            <p className={styles.storyKicker}>SOMETHING NEW · {humanizeId(story.recipe.cuisine).toUpperCase()}</p>
            <h1 className={styles.storyTitle}>{dishName(story.recipe.name)}</h1>
            <div className={styles.storyHeroPlate}>
              <Plate catalog={catalog} recipe={story.recipe} size={200} className={styles.storyPlate} />
            </div>
            <p className={styles.storyNote}>{story.recipe.estimatedPreparationMinutes} min · {DAY_SHORT[story.day]}</p>
          </>
        ) : null}

        {story.kind === "pantry" ? (
          <>
            <p className={styles.storyKicker}>YOUR PANTRY CAN DO {humanizeId(story.recipe.cuisine).toUpperCase()}</p>
            <h1 className={styles.storyTitle}>{dishName(story.recipe.name)}</h1>
            <div className={styles.storyHeroPlate}>
              <Plate catalog={catalog} recipe={story.recipe} size={200} className={styles.storyPlate} />
            </div>
            <p className={styles.storyNote}>{story.coveragePercent}% already at home · {DAY_SHORT[story.day]}</p>
          </>
        ) : null}
      </div>

      <div className={styles.storyActions}>
        <button type="button" className={styles.storyKeep} onClick={keep}>
          {story.kind === "chain" ? `Keep all ${story.meals.length}` : `Add to ${DAY_SHORT[story.day]}`}
        </button>
        <button type="button" className={styles.storySkip} onClick={dismiss}>
          Not this
        </button>
      </div>
    </div>
  );
}
