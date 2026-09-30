# Compiler-Parity SOTA Report — 2026 (night 5 on this slot)

## TL;DR

Tonight's rotation (`DEEP=compiler-parity`, `SCAN=config-schema,golden-snapshots`,
`SLOT=0`, `DAYINT=20260930`) began by re-verifying the standing compiler-parity
claim byte-for-byte against the actual scheduler-delivered prompt (5th
consecutive clean night on this surface: 2026-09-10, -15, -20, -25, tonight).
That measurement led straight into a real gap: my first draft candidate
(a self-referential golden-snapshot test comparing `compile(dream.config.json)`
against a committed in-repo mirror) turned out to duplicate PR #14
(2026-09-10), still open and unmerged 20 nights later. Rather than ship a
second copy of an already-ACCEPTed, already-unmerged candidate, I checked
GitHub state first (`list_pull_requests`, `list_issues`) and found the real,
still-open gap: PR #14's own report explicitly deferred "generate a JSON
Schema (`dream.config.schema.json`) for external validation" as a distinct
next step, "to keep the candidate to one conceptual change." **That schema
was never built in the 20 nights since.** Tonight builds it, wires it into
`dream.config.json` via a `$schema` pointer, and adds a regression test that
fails on real drift between the schema, the `DreamConfig` TypeScript
interface, and the live config — verified failing on injected drift, not
tautological.

**Result: parity holds (5th night); config-schema gap closed. `evaluated: accepted`.**

## What's new

- **Process correction, disclosed rather than hidden**: my first-pass
  candidate (self-referential compile() golden snapshot) was built and fully
  green (108/108 tests) before I checked GitHub's actual issue/PR history —
  a violation of STEP 2's "load accumulated evidence... do not rediscover a
  failed direction" spirit (this wasn't failed, it was duplicate-in-flight,
  arguably worse to re-propose). Caught it, discarded the diff, and re-scoped
  before writing anything to disk permanently. Logged here as tonight's own
  process finding: **local `docs/dream-cycle/` + `git log` are not sufficient
  "accumulated evidence" — they are 20+ nights stale relative to GitHub's
  actual issue/PR/ledger state**, because zero dream-cycle PRs have ever
  merged into this checkout's `main`. STEP 2 should explicitly say "check
  live GitHub issues/PRs before finalizing a candidate," not just local
  `docs/dream-cycle/`. (Flagged as a next step below, not implemented — it's
  a `compile`-template wording fix, arguably a fresh single-parameter
  candidate for a *future* compiler-parity night, not tonight's.)
- First JSON Schema for `dream.config.json` in this repo's history:
  `packages/compile/dream.config.schema.json` (draft-07), modeling every
  `DreamConfig` field and mirroring `validateConfig()`'s actual runtime rules
  (not just types) — notably the cron minute-field constraint
  (`FIXED_MINUTE_RE`: a single fixed value 0-59, i.e. no `*`/`/`/`,` allowed
  in the minute field; the other four cron fields are unconstrained, matching
  `CRON_RE`).
- `dream.config.json` now carries a `"$schema"` pointer to it — real editor
  autocomplete/validation (VS Code's built-in JSON language server) for
  anyone hand-editing this repo's own live config, or scaffolding a new
  target's config via `dream-machine init`.
- New regression test (`packages/compile/src/dream-config-schema.test.ts`)
  guards three drift directions at once: schema vs. hardcoded `DreamConfig`
  field list, schema `required` vs. `validateConfig()`'s actual mandatory
  fields, and schema `properties` vs. the live `dream.config.json`'s real
  keys.

## Competitors (schema-for-agent-config precedent)

| System | Relevant mechanism | Evidence grade |
| --- | --- | --- |
| DSPy / GEPA | Compiled "programs" are checked against typed signatures at compile time; no public JSON-Schema-for-YAML/JSON-config artifact found analogous to this repo's `dream.config.json`. | B (public docs, not re-run tonight) |
| SWE-agent | YAML agent configs are schema-validated via Pydantic models at load time — the closest architectural analogue to `validateConfig()`, but ships internally, not as a standalone `.schema.json` for editor tooling. | B (public repo structure) |
| OpenHands | Config loading uses `pydantic-settings`; generates no externally-consumable JSON Schema artifact for editors either, as far as public docs show. | C (single-pass skim) |
| Sakana AI Scientist | Experiment templates are Python-driven, not declarative config files; JSON-Schema-for-config is not an applicable comparison. | C (absence-of-evidence) |
| This repo, prior state (PR #14, 2026-09-10) | Explicitly proposed this exact JSON Schema as a deferred next step, "a distinct, larger candidate... kept in sync with the TS interface by hand or generated." Directly reused as tonight's design rationale and scope boundary (hand-authored + guarded by test, not generated, to avoid a new codegen dependency). | A (this repo, reproduced tonight) |

## Hypothesis (frozen before implementation)

> Given this repo's `DreamConfig` TypeScript interface and `validateConfig()`
> (`packages/compile/src/config.ts`), when a hand-authored JSON Schema
> (`packages/compile/dream.config.schema.json`) is added modeling the same
> fields and the same mandatory-field/cron-format rules, and a test is added
> asserting schema↔interface and schema↔live-config parity, then: (a) the
> live `dream.config.json` should validate cleanly against both the runtime
> `validateConfig()` and the new schema's modeled shape; (b) the new test
> should fail if a field is removed from the schema or an unmodeled key is
> added to `dream.config.json` (proving it isn't vacuous); (c) all 106
> pre-existing tests should keep passing unmodified; (d) no evaluation gate,
> benchmark, threshold, or security boundary is touched.

Not modified after evaluation began.

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest), this repo's only configured `bench`
entrypoint (`dream.config.json#evaluatorEntrypoints.bench`).

- Baseline (commit `2fba2550182d81b36423447221823e98e227482a`, fresh
  `npm ci && npm run build`): **106/106** tests, 7 test files.
- Candidate: **111/111** tests (+5 net new), 0 regressions, 0
  removed/weakened pre-existing tests.
- `npm run lint`: clean.
- `npm run build`: clean, all 6 packages, no wasm/NAPI component in this repo.
- `npm run typecheck`: fails identically on baseline and candidate with a
  pre-existing, unrelated error (`tsconfig.json(1,12): error TS18002:
  "'files' list ... is empty"`), confirmed via `git stash -u` A/B — not
  touched by this candidate (same conclusion as PR #14 and PR #37's reports).

Manual byte-parity check (compiler-parity's own core claim, re-verified
5th consecutive time):
```
$ sha256sum received-prompt.txt compiled-prompt.txt
74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d  received-prompt.txt
74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d  compiled-prompt.txt
```
`received-prompt.txt` = the verbatim nightly-routine prompt delivered to this
session tonight by the cloud scheduler. `compiled-prompt.txt` =
`node packages/cli/dist/bin.js compile dream.config.json` at commit `2fba255`
(before tonight's `$schema` key addition — re-verified identical after the
addition too, since `compile()` never reads unknown keys). Identical hash,
identical length (13,717 bytes), for the 5th consecutive time this slot has
come up.

Adversarial drift injection (proves the new tests are real, not tautological):
- Deleted `properties.autoMerge` from the schema → both the
  field-parity test and the live-config-coverage test failed with a clear
  diff/message. Reverted; suite back to 111/111 green.
- (Independent critic subagent re-ran this same injection independently —
  see Reward-Hack Check.)

## Darwin Results

`DARWIN=not-applicable`. A hand-authored schema mirroring a fixed TypeScript
interface has no evolvable population — nothing to mutate across generations
for "does this static JSON object model that static TypeScript interface
correctly." Consistent with every prior non-architectural night in this repo.

## Evidence

- OBSERVATION: `packages/compile/src/index.test.ts:60-140` only ever
  exercises a synthetic `metaharness` fixture, never the live
  `dream.config.json` — reconfirms PR #14's original observation.
- OBSERVATION: `find . -iname "*.schema.json"` and
  `search_code(filename:dream.config.schema.json)` both returned zero
  results before tonight — the gap PR #14 flagged on 2026-09-10 was still
  fully open 20 nights later.
- OBSERVATION (process finding, this repo's actual GitHub state, fetched
  live tonight): 19 open dream-cycle issues (#10-#48), ~24 open dream-cycle
  PRs (#12-#49), **zero merged since #8/#9 on 2026-09-08** — 22 consecutive
  nights of unreviewed backlog. This is not tonight's candidate (already
  exhaustively diagnosed across 6+ prior nights: #36/#37, #40, #42, #44,
  #46, #48 — root cause: STEP 20-25 unconditionally opens every PR as draft,
  and GitHub cannot auto-merge a draft PR, so `autoMerge: true` is
  structurally unreachable regardless of the missing `automerge-safe` label;
  PR #37 already fixed the compiler's *false claim* about this, itself still
  unmerged). Recorded here only as ledger-check context, not re-litigated.
- MEASUREMENT: `npm test` 106→111, 0 regressions, independently reproduced.
- MEASUREMENT: SHA-256 byte-identity between the delivered prompt and
  `compile(dream.config.json)`, 5th consecutive clean night.
- DECISION: hand-author the schema rather than generate it from the TS
  interface (e.g. via `typescript-json-schema` or `zod-to-json-schema`) —
  avoids a new runtime/dev dependency and a codegen build step for a
  14-field, rarely-changed interface; the new test is the drift guard in
  lieu of codegen.
- DECISION: add the `$schema` pointer directly to the live
  `dream.config.json` rather than leaving the schema file orphaned — an
  unreferenced schema file provides no actual editor benefit.
- REJECTION: considered re-deriving/re-proposing PR #14's self-referential
  golden-snapshot candidate (my own first draft tonight, fully green before
  I checked GitHub) — rejected once GitHub's live issue/PR state showed it
  was already an open, ACCEPTed, unmerged PR. A second copy would not
  reduce uncertainty about what this repo should become; it would only grow
  the already-22-night backlog. Diff discarded, not committed.
- REJECTION: considered also creating the missing `automerge-safe` label or
  changing STEP 20-25's draft-forever policy to unblock the backlog directly
  — out of scope for tonight's `compiler-parity` surface, and PR #37
  (2026-09-23) already deliberately left both to a human decision, a
  restraint this session preserves rather than overrides unilaterally.

## Reward-Hack Check

Independent critic (separate subagent, fresh context, not primed with this
report, instructed to verify everything itself): **CLEAR, with one minor
non-blocking finding, fixed before commit.**

- Verified the schema field-by-field against `config.ts`'s `DreamConfig`,
  `BuildStep`, `EvaluatorEntrypoints`, `AdrConvention`, and `validateConfig()`
  — types, required-ness, `additionalProperties: false`, the `adrConvention`
  union, all correct.
- **Found**: the `cron` pattern didn't allow leading/trailing whitespace,
  while `validateConfig()` calls `cron.trim()` before checking — so
  `" 0 9 * * * "` would pass the runtime validator but fail the schema.
  Low severity (stricter-than-necessary, not a false-negative letting bad
  config through), but a real parity gap in a candidate whose whole point is
  schema↔validator parity. **Fixed**: pattern now anchors `^\s*...\s*$`
  around the same 5-field/fixed-minute rule; re-verified against
  `" 0 9 * * * "`, `"60 * * * *"` (still correctly rejected), `"* * * * *"`
  (still correctly rejected) with a standalone `node -e` regex fuzz test,
  and the full suite re-run (111/111 green).
- Independently injected two regressions and reverted exactly, confirming
  the tests are real: deleting `autoMerge` from the schema failed 2/5 tests;
  adding an unmodeled key to the live `dream.config.json` failed 1/5 tests.
  `git diff`/`git status` clean after revert both times.
- Independently reproduced the 106→111 count via `git stash -u` A/B (not
  just trusting this candidate's own numbers).
- Confirmed `npm run lint` / `npm run build` clean, no evaluation/gate/
  benchmark/security-boundary/CI file touched (`git diff --stat` limited to
  the 3 files above), and that the `$schema` key is inert at runtime by
  reading `compile()`/`validateConfig()`/the CLI's `loadConfig()` directly,
  not just re-running this candidate's own test.

Full critic transcript retained in session record.

## Security Review

No new runtime attack surface: the schema file is a static, non-executed
JSON artifact; the new test performs only synchronous local file reads of
already-committed repository files (no network, no exec, no credentials, no
user-controlled path — all paths are fixed relative paths resolved via
`import.meta.url`, no traversal surface). The `$schema` key addition to
`dream.config.json` is inert to every consumer (`compile()`, `validateConfig()`,
the CLI) — all of them destructure only named `DreamConfig` fields and ignore
unknown keys. No evaluation gate, benchmark corpus, threshold, or CI/workflow
file touched (`git diff --stat`: `dream.config.json` (+1 line),
`packages/compile/dream.config.schema.json` (new), 
`packages/compile/src/dream-config-schema.test.ts` (new) — none match
`automerge.yml`'s own protected-path regex).

## Scan: config-schema

Gap closed: `dream.config.json` now has an external JSON Schema
(`packages/compile/dream.config.schema.json`) in addition to the TypeScript
interface + runtime `validateConfig()`, cross-guarded by a new test so the
three can't silently drift apart. `validateConfig()` itself is unchanged
tonight (0 errors/warnings against the live config, as every prior
compiler-parity night has also found).

## Scan: golden-snapshots

No new golden-snapshot fixture added tonight (that gap — self-referential
snapshotting of the live compiled routine — is PR #14's, still open,
deliberately not duplicated). Existing coverage unchanged: one snapshot
entry (`metaharness`, synthetic fixture) in
`packages/compile/src/__snapshots__/index.test.ts.snap`.

## Witness

`dream-machine witness stamp` hashes this exact file's raw committed bytes,
so the stamp cannot be written inside the file it stamps. Filled in
immediately before commit, over content identical up to this point.

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-09-30-compiler-parity-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at the
start of tonight's session, before this candidate's changes).

## 3 concrete next steps

1. Land (or explicitly close) PR #14 (self-referential golden-snapshot,
   2026-09-10) and PR #37 (merge-policy truthfulness fix, 2026-09-23) — both
   still open, both independently critic-cleared, both compiler-parity-slot
   findings, both now 20/7 nights stale respectively.
2. Fix STEP 2's compiled wording (`packages/compile/src/index.ts`,
   `step2Evidence`) to explicitly instruct checking live GitHub issue/PR
   state before finalizing a candidate, not just local `docs/dream-cycle/` —
   tonight's own near-miss (independently catching a would-be duplicate of
   PR #14) shows local evidence alone is insufficient once the backlog is
   this stale. This is itself a small, well-scoped future compiler-parity
   candidate, not implemented tonight to keep this candidate single-concept.
3. A human triages the 22-night, ~24-PR backlog (starting with PR #33,
   twice critic-cleared, which fixes the ledger-contamination root cause
   several other findings depend on) — reconfirmed necessary, not
   re-diagnosed, tonight.
