# Provenance

Vendored anti-slop ruleset. Upstream owns the rules; this repository owns the
copy, its configuration and any local changes.

- Source: https://github.com/dmmulroy/anti-slop
- Source revision: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b` (2026-09-10)
- Installed plugin path: `tools/oxlint/anti-slop/`
- Installer used: `node .kilo/skills/install-anti-slop/scripts/install.mjs`
  (the skill bundle at `.kilo/skills/install-anti-slop/` carries the same
  revision and is the source for future updates via its update procedure)
- Dependencies: `oxlint` and `@oxlint/plugins` pinned exactly to `1.85.0`
- Configuration: `oxlint.config.ts` — all generic rules at `error`; ignore
  patterns extend upstream's list with `.kilo/**` (agent skills and project
  agent config, not application source)
- Effect rules: not installed (this repository does not depend on Effect)

## Intentional deviations

None. The vendored source is byte-identical to the upstream skill bundle at the
revision above; local policy lives in `oxlint.config.ts`, not in the rules.