# Catalog harvest

Offline ingestion for the Blinkitchen catalog. Runtime code never imports
anything from this directory and never fetches data.

```text
node harvest.mjs [maxRecipes] [listingPages] [delayMs]   # slow, needs network
node generate.mjs                                        # fast, offline
```

- `harvest.mjs` opens blinkit.com/recipes in a headed browser profile
  (`profile/`, ignored), collects the listing, then visits recipe pages and
  records ingredient names, quantity headers, serving/cook-time metadata and the
  shoppable product facts embedded in each page. It writes `output/` (ignored),
  never the catalog.
- `generate.mjs` maps harvested written forms to canonical ids (`canonical.mjs`),
  normalises quantities and packs, drops non-vegetarian dishes and desserts,
  caps the vocabulary at the MVP milestone, and rewrites the four catalog JSON
  files under `src/data/`. Curated fixtures it must not lose live in `curated/`
  (snapshots of the hand-authored originals).
- `output/report.json` lists counts and the most frequent unmapped ingredient
  names; extend the alias tables in `canonical.mjs` when a mapping is missing and
  re-run `generate.mjs`.

Rules: never copy recipe instruction prose into the catalog; keep canonical ids
stable across runs; `generate.mjs` must stay deterministic and idempotent (run it
twice and the files must not change).
