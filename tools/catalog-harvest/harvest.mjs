import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const outDir = path.join(here, "output");

const profileDir = path.join(here, "profile");

fs.mkdirSync(outDir, { recursive: true });

fs.mkdirSync(profileDir, { recursive: true });

const LISTING_FILE = path.join(outDir, "listing.json");

const RECIPES_FILE = path.join(outDir, "recipes.jsonl");

const PRODUCTS_FILE = path.join(outDir, "products.jsonl");

const MAX_RECIPES = Number(process.argv[2] ?? 260);

const LISTING_PAGES = Number(process.argv[3] ?? 8);

const DELAY_MS = Number(process.argv[4] ?? 2200);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const log = (...args) => console.log(new Date().toISOString(), ...args);

const readJsonl = (file) => {
  if (!fs.existsSync(file)) return [];

  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
};

const parseRecipe = async (url) => {
  const text = (el) => (el && el.textContent ? el.textContent : "").replace(/\s+/g, " ").trim();
  const res = await fetch(url);

  if (!res.ok) return { url, error: "http_" + res.status };
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");

  let description = null;

  for (const el of doc.querySelectorAll("div,p")) {
    const t = (el.textContent || "").trim();

    if (t.includes("Ingredients:") && t.length < 1400 && (!description || t.length < description.length)) {
      description = t;
    }
  }

  let ingredientNames = [];

  if (description) {
    const after = description.split("Ingredients:").slice(1).join("Ingredients:");
    ingredientNames = after
      .split(/,|\band\b/gi)
      .map((s) => s.replace(/[.\n]+$/g, "").replace(/\s+/g, " ").trim())
      .filter((s) => s.length > 1 && s.length < 40);
  }

  const statText = (label) => {
    for (const el of doc.querySelectorAll("*")) {
      if (el.children.length === 0 && text(el) === label) {
        const container = el.parentElement?.parentElement ?? el.parentElement;
        const t = text(container);

        if (t && t.length < 60) return t;
      }
    }

    return null;
  };

  const numberIn = (s) => {
    if (!s) return null;
    const m = s.match(/([0-9]+(?:\.[0-9]+)?)/);

    return m ? Number(m[1]) : null;
  };

  const metrics = {
    cookTime: statText("Cook Time"),
    servings: numberIn(statText("Servings")),
    kcal: numberIn(statText("kCal")),
    protein: statText("Protein"),
    fat: statText("Fat"),
    carbs: statText("Carbs"),
  };

  const qtyRe = /^([0-9\u00bd\u00bc\u00be./ ]+)\s*(kg|g|grams?|gm|ml|l|litres?|ltr|cups?|tbsp|tsp|pieces?|nos?|pcs?|bunch|pinch)?$/i;
  const headers = [];

  for (const el of doc.querySelectorAll("button,div,span,p")) {
    if (el.children.length > 0) continue;
    const t = text(el);

    if (!t || t.length > 46) continue;
    const m = t.match(/^(.{0,16}?)\s+of\s+(.{1,40})$/);

    if (m && m[1].trim() && qtyRe.test(m[1].trim())) {
      headers.push({ quantity: m[1].trim(), ingredient: m[2].trim() });
    }
  }

  const seenHeaders = new Set();

  const uniqueHeaders = headers.filter((h) => {
    const key = h.quantity + "|" + h.ingredient.toLowerCase();

    if (seenHeaders.has(key)) return false;
    seenHeaders.add(key);

    return true;
  });

  const steps = [];

  for (const el of doc.querySelectorAll("*")) {
    if (el.children.length !== 0) continue;

    if (!/^[0-9]{1,2}$/.test(text(el))) continue;
    const t = text(el.nextElementSibling);

    if (t && t.length > 25 && t.length < 700) steps.push(t);
  }

  const products = [];
  const seenProducts = new Set();

  for (const m of html.matchAll(/\{"product_id":[0-9]+[^{}]*\}/g)) {
    try {
      const item = JSON.parse(m[0]);

      if (!item.product_id || seenProducts.has(item.product_id)) continue;
      seenProducts.add(item.product_id);
      products.push({
        id: item.product_id,
        name: item.product_name || item.display_name || null,
        brand: item.brand || null,
        unit: item.unit || null,
        price: item.price ?? null,
        mrp: item.mrp ?? null,
      });
    } catch {
      // ignore malformed product blobs
    }
  }

  const title = doc.title || "";
  const name = title.split("|")[0].replace(/\s*Recipe\s*$/i, "").trim() || null;

  return { url, name, description, ingredientNames, headers: uniqueHeaders, steps, metrics, products };
};

async function main() {
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    locale: "en-IN",
    viewport: { width: 1366, height: 800 },
    args: ["--disable-blink-features=AutomationControlled"],
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  const pages = context.pages();
  const page = pages.length ? pages[0] : await context.newPage();

  await page.goto("https://blinkit.com/recipes", { waitUntil: "domcontentloaded", timeout: 90000 });
  await wait(2500);

  if (!fs.existsSync(LISTING_FILE)) {
    const pairs = [];
    const seen = new Set();

    for (let i = 0; i < LISTING_PAGES; i += 1) {
      const found = await page.evaluate(() => {
        const out = [];

        for (const a of document.querySelectorAll('a[href*="/recipe/"]')) {
          const href = a.getAttribute("href");
          const name = (a.textContent || "").trim();

          if (href && name) out.push({ href, name });
        }

        return out;
      });

      for (const pair of found) {
        if (seen.has(pair.href)) continue;
        seen.add(pair.href);
        pairs.push({ ...pair, url: new URL(pair.href, "https://blinkit.com").toString() });
      }

      log("listing page", i + 1, "total", pairs.length);

      const nextHref = await page.evaluate(() => {
        const a = [...document.querySelectorAll("a")].find((x) => (x.textContent || "").includes("Next Page"));

        return a ? a.getAttribute("href") : null;
      });

      if (!nextHref) break;
      await page.goto(new URL(nextHref, "https://blinkit.com").toString(), { waitUntil: "domcontentloaded", timeout: 90000 });
      await wait(1200);
    }

    fs.writeFileSync(LISTING_FILE, JSON.stringify(pairs, null, 1));
  }

  const listing = JSON.parse(fs.readFileSync(LISTING_FILE, "utf8"));

  const exclude =
    /chicken|mutton|fish|prawn|keema|egg|omelette|pepperoni|bacon|pork|beef|lamb|wine|vodka|\bgin\b|\brum\b|beer|toddy|eggnog|whisky|cocktail|mulled|sali boti|patra ni|haleem|dhansak|oyster|squid|crab/i;

  const selected = listing.filter((item) => !exclude.test(item.name)).slice(0, MAX_RECIPES);

  const existing = readJsonl(RECIPES_FILE);
  const done = new Set(existing.filter((r) => !r.error).map((r) => r.url));
  const products = new Map(readJsonl(PRODUCTS_FILE).map((p) => [p.id, p]));
  const failedUrls = new Set(existing.filter((r) => r.error).map((r) => r.url));
  let harvested = done.size;
  let failed = 0;

  const flushProducts = () => {
    fs.writeFileSync(PRODUCTS_FILE, [...products.values()].map((p) => JSON.stringify(p)).join("\n") + (products.size ? "\n" : ""));
  };

  for (const item of selected) {
    if (done.has(item.url) || failedUrls.has(item.url)) continue;
    let data = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        data = await page.evaluate(parseRecipe, item.url);

        if (data && !data.error) break;
      } catch (error) {
        log("evaluate error", item.url, String(error).slice(0, 140));
      }

      await wait(4000);
    }

    if (!data || data.error) {
      failed += 1;
      fs.appendFileSync(RECIPES_FILE, JSON.stringify({ url: item.url, listedName: item.name, error: data ? data.error : "evaluate_failed" }) + "\n");
      log("failed", item.url, data ? data.error : "evaluate_failed");
      failedUrls.add(item.url);
    } else {
      for (const product of data.products) {
        if (!products.has(product.id)) products.set(product.id, product);
      }

      harvested += 1;
      fs.appendFileSync(
        RECIPES_FILE,
        JSON.stringify({
          url: data.url,
          listedName: item.name,
          name: data.name,
          ingredientNames: data.ingredientNames,
          headers: data.headers,
          steps: data.steps,
          metrics: data.metrics,
        }) + "\n",
      );
      log("ok", harvested, "/", selected.length, data.name, "ingredients", data.ingredientNames.length, "products", products.size);
    }

    if (harvested % 5 === 0) flushProducts();
    await wait(DELAY_MS);
  }

  flushProducts();
  log("DONE harvested", harvested, "products", products.size, "failed", failed);
  await context.close();
}

main().catch((error) => {
  console.error("harvest fatal", error);
  process.exit(1);
});
