# Data Strategy

The target data foundation for household intelligence. This document describes
direction and constraints; none of the ingestion pipeline is implemented. The
runtime application keeps consuming a validated catalog through the existing seam
(`src/catalog/load.ts`).

## Purpose

Household intelligence is only as good as its ingredient graph. A recommendation
engine can be correct and still be useless if "curd", "dahi" and "yogurt" are
three different rows, or if a recipe uses 300 g of an ingredient the catalog
measures only in packets.

The data strategy exists to make one promise true:

> One canonical ingredient, one normalised requirement, one comparable quantity.

## Why canonical ingredients matter

The catalog is a graph, not a list:

```text
Recipe ──requires──> Canonical Ingredient <──packaged as── Product (SKU)
                            ▲
                            │
                   Substitution relationship
```

- Pantry coverage compares requirements to stock by canonical ingredient.
- Ingredient reuse and chaining joins meals on canonical ingredient.
- Substitutions transform a canonical requirement into another canonical
  requirement with a quantity ratio.
- Basket lines resolve canonical requirements to simulated packages.

If ingredients are not canonical, every one of those joins silently degrades into
string matching.

## Quality over volume

> 1,000 well-normalized recipes are more useful to Blinkitchen than 50,000 dirty
> recipes.

Ingredient-level correctness dominates recipe count. A small catalog where every
line resolves cleanly demonstrates the product; a large catalog with aliases,
duplicate ingredients and unmapped units does not.

## Target dataset ranges

Directional, not contractual:

| Layer | Current | Target |
| --- | --- | --- |
| Canonical ingredients | 43 | 300 to 500 |
| Recipes | 14 | 300 to 500 initially, later 800 to 1,500 if useful |
| Cuisines | 4 | 8 to 15, with Delhi/NCR relevance first |
| Substitution relationships | 8 directed | 50 to 150 directed |
| Product templates | 46 | 400 to 800 |
| Simulated SKU variants | 92 | 1,000 to 2,000 |
| Locations | 2 | 5 to 15 across Delhi/NCR |

Initial context is Delhi and NCR: the cuisines, staples, pack sizes and price
bands should reflect what that market actually cooks and buys.

## Canonical ingredients and alias normalization

Alias normalization maps many written forms to one canonical ingredient, with the
canonical id being the only thing the engine ever sees.

```text
dahi · curd · yogurt · yoghurt                  →  canonical yogurt
dhania · coriander · coriander leaves · cilantro →  canonical coriander
atta · wheat flour · whole wheat flour           →  canonical atta
```

Rules:

- The canonical id is stable and opaque (`yogurt`, not a display label).
- Aliases are data, not schema. Adding an alias never changes a recipe.
- Ambiguous terms (for example "flour") must not be auto-resolved; they require an
  explicit alias mapping or stay unresolved.
- Alias resolution happens during ingestion, never at render time, so the runtime
  catalog is already canonical.

## Target recipe ingestion pipeline

```text
raw source
    ↓
RawRecipe               (source text and structure preserved verbatim)
    ↓
ingredient parsing      (lines, quantities, units, preparation notes)
    ↓
alias resolution        (written form → canonical ingredient id)
    ↓
unit normalization      (kg→g, l→ml; unknown units flagged, never guessed)
    ↓
schema validation       (required fields, meal slots, diet attributes, servings)
    ↓
deduplication           (near-duplicate recipes and duplicate ingredient lines)
    ↓
CanonicalRecipe         (the runtime shape)
    ↓
curated runtime catalog (src/catalog/load.ts consumes it unchanged)
```

Ingestion is an offline, repeatable build step. It is not part of the application
runtime.

## Unit normalization

- Recognise the canonical units only: `g`, `kg`, `ml`, `l`, `piece`, `packet`.
- Convert `kg → g` and `l → ml`. Never infer cross-dimension conversion
  (pieces to grams), because that requires ingredient-specific density data the
  catalog does not have.
- Prefer authoring recipe quantities in a unit the ingredient actually supports.
- Flag rather than guess: an unmappable unit becomes a review item, not a silent
  approximation.

## Validation and deduplication

Validation at ingestion:

- every recipe ingredient resolves to a canonical ingredient id;
- every dietary attribute is one the catalog defines;
- servings, prep time and complexity are present and in range;
- meal slots are non-empty;
- substitutions reference existing ingredients and carry a compatibility score and
  quantity ratio.

Deduplication targets:

- the same recipe arriving from two sources (compare name, cuisine and ingredient
  fingerprint);
- duplicate ingredient lines inside one recipe (merge quantities in the same
  canonical unit);
- ingredients that are the same thing under different names (resolve to one
  canonical id, keep the variants as aliases).

## Provenance

Every recipe and substitution records where it came from: source name, source URL
and ingestion provenance (when and how it was normalised). Provenance is required
to audit a questionable line without re-ingesting the whole dataset, and it is how
the prototype keeps its catalog honest while using published recipe structure.

## Data source principles

Prefer, in order:

1. Open datasets with permissive licences.
2. Appropriately licensed APIs or data partnerships.
3. Public factual and reference data (ingredient names, categories, storage types,
   typical pack sizes).
4. Independently normalised factual recipe structure, with explicit provenance.

Do not violate website terms, do not indiscriminately scrape protected content,
and do not reuse copyrighted recipe text. Ingredient lists and quantities needed
for a shoppable basket are factual structure; expressive instructions are not
required by this product and should not be copied.

## Target recipe model

The runtime `Recipe` shape stays as documented in [DATA_MODEL.md](DATA_MODEL.md);
ingestion may populate more of it over time:

| Group | Fields |
| --- | --- |
| Identity | id, name, aliases |
| Classification | cuisine, region, meal slots, dietary attributes, tags |
| Planning | servings, preparation time, cooking time, complexity |
| Ingredients | canonical ingredient id, quantity, unit, optional, preparation note |
| Nutrition | optional enrichment, never required and never used in ranking |
| Provenance | source, source URL, ingestion provenance |

The rule that never changes: recipes reference canonical ingredients, never SKUs.

## SKU mapping

Recipes never reference products. The commerce layer maps a canonical requirement
to packages:

```text
Recipe needs: 350 g paneer
Available:    200 g pack, 500 g pack
Decision:     how many packs, at which price, for this location
```

Current behaviour resolves the cheapest available SKU whose pack unit matches the
requirement's unit dimension and rounds the pack count up. Target behaviour adds
whole-week package reasoning, where several meals sharing an ingredient can make a
larger pack the better purchase. That is a planned enhancement, not current
behaviour.

SKUs are simulated in the prototype and always carry explicit provenance
(`simulated: true`). Real product ingestion would replace the generator behind the
same `Product` shape.

## Substitution data

Substitutions are an explicit curated relationship, never inferred from text
similarity or embeddings:

The curated shape is the `Substitution` type in [DATA_MODEL.md](DATA_MODEL.md).
The data rules that matter: every relationship is directed, `compatibilityScore`
is culinary plausibility on a 0..1 scale, `quantityRatio` states how much
substitute replaces one unit of the requested ingredient, `cuisines` records
where the swap is culturally normal, and `explanation` is the plain-language
reason shown to the household.

Target scale is 50 to 150 directed relationships, prioritising pairs a Delhi/NCR
household would actually consider (paneer and tofu, rajma and chana, toor and
moong dal, ghee and oil), each with a defensible ratio.

## Nutrition as optional enrichment

Calories, macros and micronutrients are nice to have and never required for the
product to work. If added, they are enrichment fields on the canonical ingredient
or recipe, they never influence ranking, and their absence must not break any
surface.

## Current catalog versus target catalog

| Aspect | Current | Target |
| --- | --- | --- |
| Shape | Author-curated JSON fixtures | Same shape, generated by the ingestion pipeline |
| Ingredients | 43, exact ids only, no aliases | 300 to 500 canonical, alias-aware |
| Recipes | 14, one source URL each | 300 to 1,500 with full provenance |
| Units | g, kg, ml, l only in current data | All six canonical units used where valid |
| Diet coverage | vegetarian, vegan attributes only | All five diet preferences supported end to end |
| Optional ingredients | 1 line, treated as required | Defined optional semantics |
| SKUs | 46 templates × 2 locations | 1,000 to 2,000 simulated variants |
| Substitutions | 8 directed | 50 to 150 directed |

## Offline ingestion boundary

Ingestion stays outside runtime Blinkitchen for three reasons:

1. **Determinism.** The runtime must produce identical output for identical
   inputs. Ingestion-time heuristics belong in a build step where they can be
   reviewed, tested and re-run.
2. **Bundle size.** Parsing, alias tables and raw sources should never ship to the
   browser.
3. **Reviewability.** Data changes are diffable artifacts, not runtime behaviour.

The application continues to consume validated catalog data through
`src/catalog/load.ts`. No runtime architecture changes are required to adopt the
target catalog: a bigger, better catalog is still just a `Catalog`.

## What this strategy does not change

- No second authority. Data lands in the catalog, which stays read-only.
- No derived data in the catalog. Learning, staples and cadence remain projections
  of household facts.
- No new runtime services, databases or queues for data ingestion.
- No LLM or embedding dependency; canonicalisation is an explicit mapping problem
  with review, not a similarity search.