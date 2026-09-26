import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  aliasOverrides,
  animalIngredientIds,
  breakfastKeywords,
  cuisineKeywords,
  defaultQuantities,
  dessertOrDrinkKeywords,
  lunchDinnerKeywords,
  newIngredients,
} from "./canonical.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

const repo = path.resolve(here, "..", "..");

const dataDir = path.join(repo, "src", "data");

const curatedDir = path.join(here, "curated");

const outDir = path.join(here, "output");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

const readJsonl = (file) =>
  fs.existsSync(file)
    ? fs
        .readFileSync(file, "utf8")
        .split("\n")
        .filter(Boolean)
        .flatMap((line) => {
          try {
            return [JSON.parse(line)];
          } catch {
            return [];
          }
        })
    : [];

const existingIngredients = readJson(path.join(curatedDir, "ingredients.json"));

const existingRecipes = readJson(path.join(curatedDir, "recipes.json"));

const existingTemplates = readJson(path.join(curatedDir, "product-templates.json"));

const existingSubstitutions = readJson(path.join(curatedDir, "substitutions.json"));

const harvested = readJsonl(path.join(outDir, "recipes.jsonl")).filter((r) => !r.error);

const harvestedProducts = readJsonl(path.join(outDir, "products.jsonl"));

/**
 * Authored substitution pairs among canonical ingredients. Pairs whose
 * ingredients do not survive vocabulary pruning are dropped with a report.
 */
const extraSubstitutions = [
  { requested: "cashew", substitute: "peanuts", ratio: 1, compatibility: 0.7, cuisines: ["north_indian", "mughlai"], explanation: "Peanut paste thickens gravies when cashew is unavailable." },
  { requested: "peanuts", substitute: "cashew", ratio: 1, compatibility: 0.7, cuisines: ["north_indian", "mughlai"], explanation: "Cashews give a richer, less earthy gravy than peanuts." },
  { requested: "milk", substitute: "coconut_milk", ratio: 1, compatibility: 0.75, cuisines: ["south_indian", "indo_chinese"], explanation: "Coconut milk keeps curries dairy-free with a similar richness." },
  { requested: "coconut_milk", substitute: "milk", ratio: 1, compatibility: 0.7, cuisines: ["south_indian", "indo_chinese"], explanation: "Milk is a lighter substitute when coconut milk runs out." },
  { requested: "yogurt", substitute: "buttermilk", ratio: 1, compatibility: 0.7, cuisines: ["north_indian", "south_indian"], explanation: "Buttermilk adds the same tang with less body." },
  { requested: "buttermilk", substitute: "yogurt", ratio: 0.8, compatibility: 0.7, cuisines: ["north_indian", "south_indian"], explanation: "Thin yogurt with water to replace buttermilk." },
  { requested: "sugar", substitute: "jaggery", ratio: 1.1, compatibility: 0.7, cuisines: ["maharashtrian", "gujarati"], explanation: "Jaggery adds a caramel note; use slightly more." },
  { requested: "jaggery", substitute: "sugar", ratio: 0.9, compatibility: 0.7, cuisines: ["maharashtrian", "gujarati"], explanation: "Sugar is a neutral swap when jaggery is unavailable." },
  { requested: "maida", substitute: "atta", ratio: 1, compatibility: 0.7, cuisines: ["north_indian"], explanation: "Whole wheat flour works in most everyday breads." },
  { requested: "atta", substitute: "maida", ratio: 1, compatibility: 0.65, cuisines: ["north_indian"], explanation: "Refined flour gives a softer result than whole wheat." },
  { requested: "moong_dal", substitute: "masoor_dal", ratio: 1, compatibility: 0.8, cuisines: ["north_indian", "south_indian"], explanation: "Both cook soft and mild; masoor cooks faster." },
  { requested: "masoor_dal", substitute: "moong_dal", ratio: 1, compatibility: 0.8, cuisines: ["north_indian", "south_indian"], explanation: "Moong dal is the gentler, slower-cooking swap." },
  { requested: "chana", substitute: "lobia", ratio: 1, compatibility: 0.75, cuisines: ["north_indian", "punjabi"], explanation: "Either bean carries a spiced gravy well." },
  { requested: "lobia", substitute: "chana", ratio: 1, compatibility: 0.75, cuisines: ["north_indian", "punjabi"], explanation: "Chickpeas give a firmer bite than black-eyed peas." },
  { requested: "spinach", substitute: "methi_leaves", ratio: 1, compatibility: 0.6, cuisines: ["north_indian", "punjabi"], explanation: "Fenugreek leaves add bitterness but work in saag-style dishes." },
  { requested: "methi_leaves", substitute: "spinach", ratio: 1, compatibility: 0.6, cuisines: ["north_indian", "punjabi"], explanation: "Spinach is the milder green when methi runs out." },
  { requested: "cumin", substitute: "cumin_powder", ratio: 1.1, compatibility: 0.9, cuisines: ["north_indian", "gujarati"], explanation: "Ground cumin mixes straight into the masala." },
  { requested: "cumin_powder", substitute: "cumin", ratio: 0.9, compatibility: 0.85, cuisines: ["north_indian", "gujarati"], explanation: "Whole seeds need a moment longer in the pan." },
  { requested: "coconut", substitute: "desiccated_coconut", ratio: 1, compatibility: 0.8, cuisines: ["south_indian", "gujarati"], explanation: "Desiccated coconut is a store-cupboard stand-in for fresh." },
  { requested: "desiccated_coconut", substitute: "coconut", ratio: 1, compatibility: 0.8, cuisines: ["south_indian", "gujarati"], explanation: "Fresh coconut gives a wetter, sweeter result." },
  { requested: "noodles", substitute: "pasta", ratio: 1, compatibility: 0.7, cuisines: ["indo_chinese", "italian"], explanation: "Pasta carries the same sauces in a different shape." },
  { requested: "pasta", substitute: "noodles", ratio: 1, compatibility: 0.7, cuisines: ["indo_chinese", "italian"], explanation: "Noodles are the quicker-cooking swap." },
  { requested: "green_chili", substitute: "dried_red_chili", ratio: 0.3, compatibility: 0.6, cuisines: ["north_indian", "south_indian"], explanation: "Dried chilli brings heat with an earthier finish." },
  { requested: "green_chili", substitute: "black_pepper", ratio: 1, compatibility: 0.5, cuisines: ["north_indian", "continental"], explanation: "Pepper adds heat without changing the dish's colour." },
];

// ---------------------------------------------------------------------------
// Canonical vocabulary
// ---------------------------------------------------------------------------

const ingredients = [
  ...existingIngredients.map((ingredient) => ({
    ...ingredient,
    aliases: [...new Set((aliasOverrides[ingredient.id] ?? []))].sort(),
  })),
  ...newIngredients.map((ingredient) => ({ ...ingredient, dietaryAttributes: [...ingredient.dietaryAttributes] })),
];

const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));

const QUALIFIERS =
  /\b(fresh|chopped|finely|roughly|sliced|grated|minced|optional|dried|whole|small|medium|large|big|ripe|boiled|cooked|raw|frozen|thinly|diced|crushed|ground|powdered|cleaned|washed|peeled|cut|to taste|for garnish|as needed|for serving|for frying|for deep frying|for tempering|for tadka|as required|a few|some)\b/g;

function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(QUALIFIERS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const aliasIndex = new Map();

for (const ingredient of ingredients) {
  for (const alias of [ingredient.name, ...ingredient.aliases]) {
    const key = normalizeName(alias);

    if (!key) continue;
    const existing = aliasIndex.get(key);

    if (!existing || alias.length > existing.alias.length) {
      aliasIndex.set(key, { id: ingredient.id, alias: key });
    }
  }
}

function resolveIngredient(name) {
  const normalized = normalizeName(name);

  if (!normalized) return undefined;
  const exact = aliasIndex.get(normalized);

  if (exact) return exact.id;

  const tokens = new Set(normalized.split(" "));
  let best;

  for (const [key, entry] of aliasIndex) {
    const keyTokens = key.split(" ");

    if (keyTokens.length > tokens.size) continue;

    if (keyTokens.every((token) => tokens.has(token))) {
      if (!best || key.length > best.key.length) best = { id: entry.id, key };
    }
  }

  return best?.id;
}

// ---------------------------------------------------------------------------
// Quantity handling
// ---------------------------------------------------------------------------

const FRACTION = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };

function parseQuantity(value) {
  const text = String(value ?? "").trim().toLowerCase();
  let total = 0;
  let matched = false;
  const fraction = text.match(/(\d+)\s*\/\s*(\d+)/);

  if (fraction) {
    total += Number(fraction[1]) / Number(fraction[2]);
    matched = true;
  } else {
    for (const [symbol, amount] of Object.entries(FRACTION)) {
      if (text.includes(symbol)) {
        total += amount;
        matched = true;
        break;
      }
    }

    const number = text.match(/(\d+(?:\.\d+)?)/);

    if (number) {
      total += Number(number[1]);
      matched = true;
    }
  }

  if (!matched || total <= 0) return null;
  const unitMatch = text.match(/(kg|g|grams?|gm|ml|l|litres?|ltr|cups?|tbsp|tsp|pieces?|nos?|pcs?|packets?|bunch|pinch|tbs)/i);

  return { quantity: total, unit: unitMatch ? unitMatch[1].toLowerCase() : "" };
}

const LIQUID_IDS = new Set([
  "milk",
  "buttermilk",
  "coconut_milk",
  "vinegar",
  "soy_sauce",
  "rose_water",
  "honey",
  "oil",
  "ghee",
  "mustard_oil",
  "coconut_oil",
  "olive_oil",
  "sesame_oil",
  "tamarind",
  "tomato_puree",
]);

function toCanonical(quantity, unitToken, ingredientId) {
  const ingredient = ingredientById.get(ingredientId);
  const category = ingredient?.category ?? "pantry";
  const token = (unitToken ?? "").toLowerCase();

  if (token === "kg") return { quantity: quantity * 1000, unit: "g" };

  if (token === "g" || token.startsWith("gram") || token === "gm") return { quantity, unit: "g" };

  if (token === "l" || token.startsWith("litre") || token === "ltr") return { quantity: quantity * 1000, unit: "ml" };

  if (token === "ml") return { quantity, unit: "ml" };

  if (token.startsWith("piece") || token.startsWith("no") || token.startsWith("pc")) return { quantity, unit: "piece" };

  if (token.startsWith("packet")) return { quantity, unit: "packet" };

  if (token === "bunch") return { quantity, unit: "piece" };

  if (token === "pinch") return { quantity: Math.max(0.5, quantity), unit: "g" };

  if (token.startsWith("cup")) {
    return LIQUID_IDS.has(ingredientId) || category === "dairy"
      ? { quantity: quantity * 240, unit: "ml" }
      : { quantity: quantity * 150, unit: "g" };
  }

  if (token === "tbsp" || token === "tbs") {
    if (category === "spice") return { quantity: quantity * 9, unit: "g" };

    if (category === "fat") return { quantity: quantity * 15, unit: "ml" };

    if (LIQUID_IDS.has(ingredientId)) return { quantity: quantity * 15, unit: "ml" };

    return { quantity: quantity * 12, unit: "g" };
  }

  if (token === "tsp") {
    if (category === "spice") return { quantity: quantity * 3, unit: "g" };

    if (category === "fat") return { quantity: quantity * 5, unit: "ml" };

    if (LIQUID_IDS.has(ingredientId)) return { quantity: quantity * 5, unit: "ml" };

    return { quantity: quantity * 4, unit: "g" };
  }

  // No unit: spices are counted in teaspoons, countable vegetables in pieces.
  if (category === "spice") return { quantity: quantity * 3, unit: "g" };

  if (category === "fat") return { quantity: quantity * 10, unit: "ml" };

  if (category === "dairy" && LIQUID_IDS.has(ingredientId)) return { quantity: quantity * 200, unit: "ml" };

  if (ingredient?.commonUnits.includes("piece") && quantity <= 12) return { quantity, unit: "piece" };

  return { quantity: quantity * 100, unit: "g" };
}

function quantityFromSteps(steps, ingredientId) {
  const aliases = [
    ingredientById.get(ingredientId)?.name ?? "",
    ...(ingredientById.get(ingredientId)?.aliases ?? []),
  ]
    .flatMap((alias) => {
      const lower = alias.toLowerCase();

      return lower.length >= 4 ? [lower] : [];
    })
    .sort((a, b) => b.length - a.length);

  for (const step of steps) {
    const lower = step.toLowerCase();

    for (const alias of aliases) {
      let index = lower.indexOf(alias);

      while (index !== -1) {
        const before = lower.slice(Math.max(0, index - 55), index);
        const matches = [...before.matchAll(/(\d+(?:\.\d+)?|\d+\s*\/\s*\d+|[½¼¾⅓⅔])\s*(kg|g|grams?|gm|ml|l|litres?|ltr|cups?|tbsp|tsp|pieces?|nos?|pcs?|bunch|pinch)?\s*(?:of\s+)?$/g)];
        const last = matches.at(-1);

        if (last) {
          const parsed = parseQuantity(`${last[1]} ${last[2] ?? ""}`);

          if (parsed) return parsed;
        }

        index = lower.indexOf(alias, index + 1);
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Recipe generation
// ---------------------------------------------------------------------------

const hash = (value) => {
  let sum = 0;

  for (let index = 0; index < value.length; index += 1) sum = (sum * 31 + value.charCodeAt(index)) % 1000003;

  return sum;
};

function inferCuisine(name) {
  const lower = name.toLowerCase();

  for (const [cuisine, keywords] of cuisineKeywords) {
    if (keywords.some((keyword) => lower.includes(keyword))) return cuisine;
  }

  return "north_indian";
}

function inferSlots(name) {
  const lower = name.toLowerCase();
  const slots = [];

  if (breakfastKeywords.some((keyword) => lower.includes(keyword))) slots.push("breakfast");

  if (lunchDinnerKeywords.some((keyword) => lower.includes(keyword)) || slots.length === 0) {
    slots.push("lunch", "dinner");
  }

  return [...new Set(slots)].slice(0, 3);
}

function stepMinutes(metrics) {
  const text = String(metrics?.cookTime ?? "").toLowerCase();
  const hours = text.match(/(\d+)\s*h(?:ours?|rs?)?\b/);
  const minutes = text.match(/(\d+)\s*min/);
  const total = (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);

  if (total >= 5) return Math.min(180, total);
  const fallback = text.match(/\d{1,3}/);

  if (!fallback) return null;
  const value = Number(fallback[0]);

  if (!(value >= 5 && value <= 180)) return null;

  return value;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 6)
    .join("_");
}

const NON_VEG = /\b(egg|eggs|chicken|mutton|fish|prawn|prawns|keema|bacon|ham|sausage|crab|squid|oyster|tuna|salami|pepperoni|meat|gelatin|mayonnaise|anchovy|anchovies)\b/i;

const NON_GROCERY = /^(water|hot water|cold water|warm water|ice|ice cube|ice cubes|as required|salt water|lukewarm water)$/;

const GARNISH_IDS = new Set([
  "coriander",
  "mint",
  "lemon",
  "curry_leaves",
  "sev",
  "spring_onion",
  "desiccated_coconut",
  "sesame",
  "cashew",
]);

function buildGeneratedRecipes() {
  const excluded = new RegExp(dessertOrDrinkKeywords.join("|"), "i");
  const seenNames = new Set(existingRecipes.map((recipe) => normalizeName(recipe.name)));
  const candidates = [];

  for (const item of harvested) {
    const name = item.listedName ?? item.name;

    if (!name || excluded.test(name)) continue;

    if (NON_VEG.test((item.ingredientNames ?? []).join(" "))) continue;
    const normalized = normalizeName(name);

    if (!normalized || seenNames.has(normalized)) continue;
    seenNames.add(normalized);
    candidates.push(item);
  }

  candidates.sort((a, b) => {
    const left = (a.listedName ?? a.name ?? "").toLowerCase();
    const right = (b.listedName ?? b.name ?? "").toLowerCase();

    return left < right ? -1 : left > right ? 1 : 0;
  });

  const drafts = [];

  for (const item of candidates) {
    const name = item.listedName ?? item.name;
    const steps = Array.isArray(item.steps) ? item.steps : [];
    const headerByIngredient = new Map();

    for (const header of item.headers ?? []) {
      const id = resolveIngredient(header.ingredient);

      if (id && !headerByIngredient.has(id)) headerByIngredient.set(id, header.quantity);
    }

    const lines = [];
    const seenLineIds = new Set();

    for (const rawName of item.ingredientNames ?? []) {
      if (NON_GROCERY.test(normalizeName(rawName))) continue;
      const id = resolveIngredient(rawName);

      if (!id || seenLineIds.has(id)) continue;
      seenLineIds.add(id);

      let parsed = headerByIngredient.has(id)
        ? parseQuantity(headerByIngredient.get(id))
        : null;

      if (!parsed) parsed = quantityFromSteps(steps, id);

      const canonical = parsed
        ? toCanonical(parsed.quantity, parsed.unit, id)
        : { ...defaultQuantities[ingredientById.get(id)?.category ?? "pantry"] };

      if (!(canonical.quantity > 0)) continue;
      lines.push({ ingredientId: id, quantity: Math.round(canonical.quantity * 100) / 100, unit: canonical.unit, optional: false });
    }

    if (lines.length < 4) continue;

    const optionalFromSteps = [];

    for (const step of steps) {
      if (!/\boptional\b/i.test(step)) continue;
      const lower = step.toLowerCase();

      for (const line of lines) {
        const ingredient = ingredientById.get(line.ingredientId);
        const names = [ingredient?.name ?? "", ...(ingredient?.aliases ?? [])].map((alias) => alias.toLowerCase());

        if (names.some((alias) => alias.length >= 4 && lower.includes(alias)) && !optionalFromSteps.includes(line.ingredientId)) {
          optionalFromSteps.push(line.ingredientId);
        }
      }
    }

    const optionalCandidates = [...optionalFromSteps];

    if (lines.length >= 5) {
      for (const line of lines) {
        if (optionalCandidates.length >= 2) break;

        if (GARNISH_IDS.has(line.ingredientId) && !optionalCandidates.includes(line.ingredientId)) {
          optionalCandidates.push(line.ingredientId);
        }
      }
    }

    for (const line of lines) {
      if (optionalCandidates.includes(line.ingredientId)) line.optional = true;
    }

    const minutes = stepMinutes(item.metrics);
    const complexity = minutes === null ? (steps.length <= 6 ? "low" : steps.length <= 12 ? "medium" : "high") : minutes <= 20 ? "low" : minutes <= 40 ? "medium" : "high";
    const cuisine = inferCuisine(name);
    const animalFree = lines.every((line) => !animalIngredientIds.has(line.ingredientId));
    const servings = Math.min(12, Math.max(2, Number(item.metrics?.servings) || 4));
    const id = slugify(name);

    drafts.push({
      id,
      name,
      cuisine,
      mealSlots: inferSlots(name),
      sourceUrl: item.url,
      servings,
      ingredients: lines,
      dietaryAttributes: animalFree ? ["vegetarian", "vegan"] : ["vegetarian"],
      preparationComplexity: complexity,
      estimatedPreparationMinutes: minutes ?? (complexity === "low" ? 20 : complexity === "medium" ? 35 : 50),
      discoveryLevel: hash(name) % 6 === 0 ? "explore" : "familiar",
      tags: [cuisine],
    });
  }

  // Keep every authored ingredient the harvest actually uses (existing ids are
  // always kept); cap the vocabulary at 150 for the current data milestone.
  const usage = new Map();

  for (const draft of drafts) {
    for (const line of draft.ingredients) usage.set(line.ingredientId, (usage.get(line.ingredientId) ?? 0) + 1);
  }

  const existingIds = new Set(existingIngredients.map((ingredient) => ingredient.id));
  const keptIds = new Set(existingIds);

  const newIds = [...usage.keys()]
    .filter((id) => !existingIds.has(id))
    .sort((a, b) => (usage.get(b) ?? 0) - (usage.get(a) ?? 0) || (a < b ? -1 : 1));

  const room = Math.max(0, 150 - existingIds.size);

  for (const id of newIds.slice(0, room)) keptIds.add(id);

  const pruned = [];

  for (const draft of drafts) {
    const lines = draft.ingredients.filter((line) => keptIds.has(line.ingredientId));

    if (lines.length < 4) continue;
    pruned.push({ ...draft, ingredients: lines });
  }

  const uniqueIds = new Set(existingRecipes.map((recipe) => recipe.id));
  const recipes = [];

  for (const draft of pruned) {
    if (recipes.length >= 150) break;
    let id = draft.id;
    let suffix = 2;

    while (uniqueIds.has(id)) {
      id = `${draft.id}_${suffix}`;
      suffix += 1;
    }

    uniqueIds.add(id);
    recipes.push({ ...draft, id });
  }

  return { recipes, keptIds, usage };
}

const { recipes: generatedRecipes, keptIds } = buildGeneratedRecipes();

const finalIngredients = ingredients.filter(
  (ingredient) =>
    existingIngredients.some((existing) => existing.id === ingredient.id) ||
    keptIds.has(ingredient.id) ||
    extraSubstitutions.some(
      (entry) =>
        ingredient.id === entry.requested || ingredient.id === entry.substitute,
    ),
);

// Harvested written forms become visible alias provenance on the ingredient.
const collectedAliases = new Map();

for (const item of harvested) {
  const names = [...(item.ingredientNames ?? []), ...(item.headers ?? []).map((header) => header.ingredient)];

  for (const raw of names) {
    const id = resolveIngredient(raw);

    if (!id) continue;
    const normalized = normalizeName(raw);

    if (!normalized) continue;
    const bucket = collectedAliases.get(id) ?? new Set();
    bucket.add(normalized);
    collectedAliases.set(id, bucket);
  }
}

for (const ingredient of finalIngredients) {
  const own = new Set([normalizeName(ingredient.name), ...ingredient.aliases.map((alias) => normalizeName(alias))]);
  const extra = [...(collectedAliases.get(ingredient.id) ?? [])].filter((alias) => !own.has(alias)).sort().slice(0, 15);
  ingredient.aliases = [...new Set([...ingredient.aliases, ...extra])].sort();
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

function parsePack(unitText) {
  const text = String(unitText ?? "").toLowerCase().trim();
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|grams?|gm|ml|l|litre|litres?|ltr|pieces?|pcs?|nos?|packets?|pack|dozen|bunch)/);

  if (!match) return null;
  const quantity = Number(match[1]);
  const token = match[2];

  if (!(quantity > 0)) return null;

  if (token === "kg") return { packSize: quantity * 1000, unit: "g" };

  if (token.startsWith("g") || token === "gm") return { packSize: quantity, unit: "g" };

  if (token === "l" || token.startsWith("litre") || token === "ltr") return { packSize: quantity * 1000, unit: "ml" };

  if (token === "ml") return { packSize: quantity, unit: "ml" };

  if (token === "dozen") return { packSize: quantity * 12, unit: "piece" };

  if (token.startsWith("piece") || token.startsWith("pc") || token.startsWith("no")) return { packSize: quantity, unit: "piece" };

  if (token.startsWith("pack") || token.startsWith("bunch")) return { packSize: quantity, unit: "packet" };

  return null;
}

function buildProductTemplates() {
  const templates = existingTemplates.map((template) => ({ ...template }));
  const usedIds = new Set(templates.map((template) => template.id));
  const byIngredient = new Map();

  for (const product of harvestedProducts) {
    if (!product.name || !(product.price > 0)) continue;
    const ingredientId = resolveIngredient(product.name);

    if (!ingredientId || !keptIds.has(ingredientId)) continue;
    const pack = parsePack(product.unit);

    if (!pack) continue;
    const list = byIngredient.get(ingredientId) ?? [];
    list.push({ ...product, ingredientId, ...pack });
    byIngredient.set(ingredientId, list);
  }

  const unitCost = (product) => product.price / product.packSize;
  let added = 0;

  for (const ingredient of finalIngredients) {
    const candidates = (byIngredient.get(ingredient.id) ?? [])
      .filter((candidate) => candidate.packSize > 0)
      .sort((a, b) => unitCost(a) - unitCost(b) || String(a.name).localeCompare(String(b.name)));

    if (candidates.length === 0) continue;

    const picks = new Map();
    const indices = [...new Set([0, candidates.length - 1])];

    for (const index of indices) {
      const candidate = candidates[index];

      if (!candidate) continue;
      let id = `${ingredient.id}__${slugify(candidate.name)}`.slice(0, 60);
      let suffix = 2;

      while (usedIds.has(id)) {
        id = `${`${ingredient.id}__${slugify(candidate.name)}`.slice(0, 56)}_${suffix}`;
        suffix += 1;
      }

      usedIds.add(id);
      const brand = String(candidate.brand ?? "").trim() || String(candidate.name).split(" ")[0] || "Blinkit";
      picks.set(id, {
        id,
        ingredientId: ingredient.id,
        name: String(candidate.name).trim().slice(0, 80),
        brand: brand.slice(0, 40),
        packSize: Math.round(candidate.packSize * 100) / 100,
        unit: candidate.unit,
        basePrice: Math.round(candidate.price * 100) / 100,
      });
    }

    for (const template of picks.values()) {
      templates.push(template);
      added += 1;
    }
  }

  // Every canonical ingredient must be purchasable; synthesize a deterministic
  // generic pack for ingredients the harvest did not cover.
  const covered = new Set(templates.map((template) => template.ingredientId));

  const fallbackPack = {
    vegetables: { packSize: 500, unit: "g", pricePerKg: 60 },
    dairy: { packSize: 500, unit: "ml", pricePerKg: 70 },
    protein: { packSize: 500, unit: "g", pricePerKg: 140 },
    pantry: { packSize: 500, unit: "g", pricePerKg: 120 },
    fat: { packSize: 1000, unit: "ml", pricePerKg: 180 },
    spice: { packSize: 100, unit: "g", pricePerKg: 400 },
  };

  for (const ingredient of finalIngredients) {
    if (covered.has(ingredient.id)) continue;
    const spec = fallbackPack[ingredient.category] ?? fallbackPack.pantry;
    const id = `${ingredient.id}_pack`;
    let unique = id;
    let suffix = 2;

    while (usedIds.has(unique)) {
      unique = `${id}_${suffix}`;
      suffix += 1;
    }

    usedIds.add(unique);
    templates.push({
      id: unique,
      ingredientId: ingredient.id,
      name: ingredient.name,
      brand: "Blinkit",
      packSize: spec.packSize,
      unit: spec.unit,
      basePrice: Math.round((spec.pricePerKg * spec.packSize) / 1000),
    });
  }

  // Every recipe requirement line must be purchasable in its own dimension:
  // a 1-piece coconut line needs a piece pack even if the harvest only matched
  // gram packs. Synthesize the missing dimension deterministically.
  const dimensionOf = (unit) => {
    if (unit === "kg" || unit === "g") return "g";

    if (unit === "l" || unit === "ml") return "ml";

    return unit;
  };

  const usedDimensions = new Map();

  for (const recipe of [...existingRecipes, ...generatedRecipes]) {
    for (const line of recipe.ingredients) {
      if (!keptIds.has(line.ingredientId)) continue;
      const set = usedDimensions.get(line.ingredientId) ?? new Set();
      set.add(dimensionOf(line.unit));
      usedDimensions.set(line.ingredientId, set);
    }
  }

  const piecePrice = { vegetables: 30, dairy: 45, protein: 60, pantry: 50, fat: 80, spice: 20 };

  for (const ingredient of finalIngredients) {
    for (const dim of usedDimensions.get(ingredient.id) ?? []) {
      const covered = templates.some(
        (template) => template.ingredientId === ingredient.id && dimensionOf(template.unit) === dim,
      );

      if (covered) continue;

      const spec =
        dim === "g"
          ? { packSize: 500, unit: "g", basePrice: 60 }
          : dim === "ml"
            ? { packSize: 500, unit: "ml", basePrice: 45 }
            : { packSize: 1, unit: "piece", basePrice: piecePrice[ingredient.category] ?? 30 };

      const id = `${ingredient.id}_${dim}`;
      let unique = id;
      let suffix = 2;

      while (usedIds.has(unique)) {
        unique = `${id}_${suffix}`;
        suffix += 1;
      }

      usedIds.add(unique);
      templates.push({
        id: unique,
        ingredientId: ingredient.id,
        name: ingredient.name,
        brand: "Blinkit",
        packSize: spec.packSize,
        unit: spec.unit,
        basePrice: spec.basePrice,
      });
    }
  }

  return { templates, added };
}

const { templates: finalTemplates, added: harvestedTemplateCount } = buildProductTemplates();

// ---------------------------------------------------------------------------
// Substitutions
// ---------------------------------------------------------------------------


function buildSubstitutions() {
  const finalIds = new Set(finalIngredients.map((ingredient) => ingredient.id));
  const valid = [...existingSubstitutions];
  const ids = new Set(valid.map((substitution) => substitution.id));
  const dimensionIds = new Set(["g", "ml", "piece", "packet"]);

  const canonicalDimension = (unit) => {
    if (unit === "kg" || unit === "g") return "g";

    if (unit === "l" || unit === "ml") return "ml";

    if (unit === "piece") return "piece";

    return "packet";
  };

  const dimsOf = (ingredient) => new Set(ingredient.commonUnits.map(canonicalDimension).filter((dim) => dimensionIds.has(dim)));

  for (const entry of extraSubstitutions) {
    const requested = ingredientById.get(entry.requested);
    const substitute = ingredientById.get(entry.substitute);

    if (!requested || !substitute) continue;

    if (!finalIds.has(entry.requested) || !finalIds.has(entry.substitute)) continue;
    const requestedDims = dimsOf(requested);
    const shared = [...dimsOf(substitute)].some((dim) => requestedDims.has(dim));

    if (!shared) continue;
    const id = `${entry.requested}_to_${entry.substitute}`;

    if (ids.has(id)) continue;
    ids.add(id);
    valid.push({
      id,
      requestedIngredientId: entry.requested,
      substituteIngredientId: entry.substitute,
      compatibilityScore: entry.compatibility,
      quantityRatio: entry.ratio,
      cuisines: entry.cuisines,
      explanation: entry.explanation,
    });
  }

  return valid.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

const substitutions = buildSubstitutions();

// ---------------------------------------------------------------------------
// Report + write
// ---------------------------------------------------------------------------

const unmappedCounts = new Map();

for (const item of harvested) {
  for (const name of item.ingredientNames ?? []) {
    if (resolveIngredient(name)) continue;
    const key = normalizeName(name);

    if (!key || key.length < 2) continue;
    unmappedCounts.set(key, (unmappedCounts.get(key) ?? 0) + 1);
  }
}

const report = {
  harvestedRecipes: harvested.length,
  harvestedProducts: harvestedProducts.length,
  canonicalIngredients: finalIngredients.length,
  generatedRecipes: generatedRecipes.length,
  totalRecipes: existingRecipes.length + generatedRecipes.length,
  harvestedProductTemplates: harvestedTemplateCount,
  totalProductTemplates: finalTemplates.length,
  totalSubstitutions: substitutions.length,
  generatedOptionalLines: generatedRecipes.flatMap((recipe) => recipe.ingredients.filter((line) => line.optional)).length,
  unmappedIngredients: [...unmappedCounts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, 80),
};

fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));

fs.writeFileSync(path.join(dataDir, "ingredients.json"), JSON.stringify(finalIngredients, null, 1) + "\n");

fs.writeFileSync(path.join(dataDir, "recipes.json"), JSON.stringify([...existingRecipes, ...generatedRecipes], null, 1) + "\n");

fs.writeFileSync(path.join(dataDir, "product-templates.json"), JSON.stringify(finalTemplates, null, 1) + "\n");

fs.writeFileSync(path.join(dataDir, "substitutions.json"), JSON.stringify(substitutions, null, 1) + "\n");

console.log(JSON.stringify(report, null, 1));
