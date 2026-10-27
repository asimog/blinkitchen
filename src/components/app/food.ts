import type { CSSProperties } from "react";
import type { Catalog, Ingredient, IngredientCategory, Recipe } from "@/catalog/types";
import { ingredientById } from "@/catalog/grocery-graph";

/**
 * Placeholder food colour until real photography lands: each ingredient gets
 * a recognisable tone, and a dish takes the tone of its main ingredient.
 */

const INGREDIENT_TONES = new Map(Object.entries({
  atta: "#D9B98A",
  besan: "#E6B85C",
  brinjal: "#5B3A5E",
  butter: "#F3DC8B",
  capsicum: "#4F8A3A",
  carrot: "#E07A2E",
  cauliflower: "#EFE6CF",
  chana: "#C98A3E",
  cheese: "#F2C14E",
  coriander: "#3E7A36",
  cream: "#F5ECD8",
  curd: "#F6F6F0",
  garlic: "#EDE3CE",
  ghee: "#E8C04A",
  ginger: "#C9A36B",
  green_chili: "#4C9A3A",
  green_peas: "#6BA84A",
  maida: "#F1EADB",
  masoor_dal: "#E2814A",
  milk: "#F7F4EC",
  mixed_vegetables: "#7FA24C",
  moong_dal: "#E9C64A",
  mushroom: "#B89B7A",
  noodles: "#E8C77A",
  oil: "#E8C04A",
  okra: "#4E8B3A",
  onion: "#B6446A",
  paneer: "#F7F2E4",
  pasta: "#EBC46E",
  poha: "#F2D27A",
  potato: "#D9B26A",
  rajma: "#7A2E26",
  rice: "#F4F0E4",
  sooji: "#EAD7A4",
  spinach: "#3E7A36",
  sugar: "#F7F5F0",
  tofu: "#F1EBDD",
  tomato: "#D2452E",
  toor_dal: "#E7A928",
  yogurt: "#F6F6F0",
}));

const CATEGORY_TONES: Record<IngredientCategory, string> = {
  vegetables: "#6E9A45",
  dairy: "#F4EEDF",
  protein: "#C98A3E",
  pantry: "#DCC59A",
  fat: "#E8C04A",
  spice: "#C9802E",
};

/** Dishes cooked in gravy read as the gravy, not the paneer floating in it. */
const DISH_TONES: { pattern: RegExp; tone: string }[] = [
  { pattern: /palak|saag|hariyali|methi/i, tone: "#3F7D2E" },
  { pattern: /makhani|butter|tikka|kadai|shahi|korma/i, tone: "#D2622E" },
  { pattern: /dal|sambar|khichdi/i, tone: "#E3A62A" },
  { pattern: /rajma/i, tone: "#8A3324" },
  { pattern: /chole|chana/i, tone: "#B8742F" },
  { pattern: /biryani|pulao|fried rice/i, tone: "#E7B54A" },
  { pattern: /paratha|roti|thepla|naan|kulcha/i, tone: "#D9A75E" },
];

export function ingredientTone(ingredient: Pick<Ingredient, "id" | "category">): string {
  return INGREDIENT_TONES.get(ingredient.id) ?? CATEGORY_TONES[ingredient.category];
}

const MINOR_INGREDIENTS = new Set(["onion", "garlic", "ginger", "tomato", "salt", "green_chili", "lemon"]);

export function recipeTone(catalog: Catalog, recipe: Recipe): string {
  const named = DISH_TONES.find((row) => row.pattern.test(recipe.name));

  if (named) return named.tone;

  const main = recipe.ingredients
    .flatMap((line) => {
      const ingredient = ingredientById(catalog, line.ingredientId);

      if (!ingredient || MINOR_INGREDIENTS.has(ingredient.id)) return [];

      if (ingredient.category === "spice" || ingredient.category === "fat") return [];

      return [{ ingredient, weight: line.unit === "kg" || line.unit === "l" ? line.quantity * 1000 : line.quantity }];
    })
    .sort((a, b) => b.weight - a.weight)[0];

  return main ? ingredientTone(main.ingredient) : "#D9A75E";
}

/** Custom properties consumed by the `.plate` styles. */
export function plateStyle(tone: string, size: number): CSSProperties {
  // SAFETY: React's CSSProperties has no index signature for custom
  // properties; these two are read only by the plate stylesheet.
  return { "--tone": tone, "--size": `${size}px` } as CSSProperties;
}

/** Some harvested dish names arrive lowercase; show them as names. */
export function dishName(name: string): string {
  if (name !== name.toLowerCase()) return name;

  return name.replace(/(^|[\s(])\p{L}/gu, (start) => start.toUpperCase());
}
