# Evaluation-Adapters SOTA Report — 2026-09-12

## TL;DR

Tonight's DEEP=`evaluation-adapters` + SCAN=`flywheel,darwin` dive found that this
repo's own `dream.config.json#evaluatorEntrypoints.darwin` command has been
silently misparsing its own flags as the required `<repo>` positional argument
since it was first written — every unattended run has been creating a garbage
directory (`--sandbox/`, or `--help/` under other flags) in the working tree
and evolving against *that empty directory*, never against this repo. Fixed by
supplying the missing argument and adding the previously-unwired `flywheel`
entrypoint via its real invocation path. Separately, and not fixed tonight
(documented as ADR-0003, Proposed): even once pointed at the real repo, bounded
Darwin evolution against this repo cannot produce non-degenerate results,
because `@metaharness/darwin bench create` generates a single generic
"keep tests green" task with `publicTestCommand == hiddenTestCommand ==
regressionTestCommand == npm test` — a mutation-invariant signal. All three
sandbox modes (`real`, `mock`) reproducibly converge on `Winner: baseline`,
`Delta over baseline: +0.000` for this repo, confirmed empirically twice.

## What's New (2026)

- **Darwin Gödel Machine lineage** [B, WebSearch synthesis, Sep 2026]:
  `@metaharness/darwin`'s leaderboard vocabulary (baseline / `g{n}_v{m}` /
  lineage / winner) mirrors the "Darwin Gödel Machine" line of work — a
  population of agent-harness variants evolved against benchmark performance,
  not source-code mutation. This matches what we found: darwin's genome
  dimensions (`planner`, `toolPolicy`, `reviewer`, `retryPolicy`,
  `memoryPolicy`, `contextBuilder`, `scorePolicy`) are **agent-runtime policy
  knobs**, not this repo's TypeScript source — a category mismatch for a
  compiler/ledger/witness toolkit repo with no agent execution loop of its own.
- **The evaluator-is-the-blind-spot problem** [B, WebSearch synthesis]: current
  self-improvement literature (Sakana AI RSI Lab, "Red Queen Gödel Machine"
  co-evolution work) explicitly frames a self-improvement loop's evaluator as
  its attack surface / blind spot. Tonight's finding is a concrete instance:
  the darwin adapter was "live" (exit 0, real output) on every single prior
  run while silently evaluating nothing meaningful — passing ADR-0002's
  liveness classifier while still being substantively wrong. That gap between
  "produced output" and "produced a *correct* evaluation" is not something the
  3-state classifier (live/blocked/suspicious-silent) can see by construction.
- **`@metaharness/flywheel` packaging** [A, reproduced live tonight]: v0.1.11
  still ships no `bin` field (confirmed via `npm view … bin` → empty, and
  `npx @metaharness/flywheel` → `npm error could not determine executable to
  run`). Its `dist/cli.js` exports a bare `dispatch()` for a **host CLI** to
  call (per its own header comment: "consumed by `metaharness flywheel
  <sub>`") — running it directly with `node` "succeeds" (exit 0) while
  producing zero bytes on both streams, the exact `suspicious-silent`
  signature ADR-0002 defines. The correct, working invocation is through the
  umbrella `metaharness` package (`bin: metaharness`), confirmed live tonight.

## Hypothesis (frozen before implementation)

> Given this repo's own `dream.config.json#evaluatorEntrypoints` map, when the
> `darwin` command is corrected to supply its required `<repo>` positional
> argument (`.`) and a `flywheel` entry is added using its real working
> invocation (`npx metaharness flywheel help`, via the umbrella CLI rather
> than the bin-less `@metaharness/flywheel` package), then
> `dream-machine verify-entrypoints` should classify **all three** configured
> entrypoints as `live` against hand-verified ground truth, and neither
> command should leave an un-gitignored side-effect directory misnamed after
> a misparsed flag in the invoking working directory — subject to: no
> pre-existing test weakened, removed, or modified; `npm test` stays fully
> green; no evaluation gold data or thresholds touched; and the deeper
> "does darwin produce real evolutionary signal for this repo" question is
> documented, not silently declared solved.

## Benchmarks / Evaluation Receipt

Real evaluators only — `npm test` (vitest) and this repo's own
`dream-machine verify-entrypoints` CLI, executing the literal configured
commands for real (network calls included; no mocking).

**`npm test`**: baseline (commit `2fba255`) **106/106** → candidate **106/106**,
0 regressions, 0 tests modified/removed/weakened. Build (`tsc -b`, 6 packages)
clean before and after.

**`verify-entrypoints`, baseline** (`dream.config.json` at `2fba255`, run from
repo root):
```
$ node packages/cli/dist/bin.js verify-entrypoints /tmp/baseline-dream.config.json
bench: live (exit 0) — produced output
darwin: live (exit 0) — produced output
$ ls -la | grep ^d
drwxr-xr-x  3 root root  4096 ...  --sandbox      <-- garbage dir, misparsed flag as <repo>
```
Reproduced identically on an earlier probe with `--help` substituted for
`--sandbox`: created a `--help/` directory instead. The classifier reports
`live` in both cases — exit 0, real (if meaningless) output — which is
correct per ADR-0002's 3-state contract and exactly the classifier-blind-spot
named above.

**`verify-entrypoints`, candidate** (this PR's `dream.config.json`):
```
$ node packages/cli/dist/bin.js verify-entrypoints
bench: live (exit 0) — produced output
darwin: live (exit 0) — produced output
flywheel: live (exit 0) — produced output
$ git status --porcelain    # after rm -rf .metaharness (now gitignored)
 M .gitignore
 M dream.config.json
```
No stray flag-named directory. `.metaharness/` (darwin's real per-repo state
directory) is now covered by `.gitignore`.

**Direct flywheel invocation, before/after**:
```
$ npx -y @metaharness/flywheel --version         # OLD (unreachable) shape
npm error could not determine executable to run   # exit 1

$ npx -y metaharness flywheel                      # NEW (correct) shape
metaharness flywheel — a verifiable self-improvement loop for agent harnesses.
  metaharness flywheel run <config.mjs> ...
  ...                                               # exit 0, real output
```

## Darwin Results (bounded, ≤3 generations × ≤4 children, fitness frozen before running)

Fitness function: darwin's own built-in composite score (`safety`-weighted
`pass` rate against the repo's bench suite), unmodified — this session did
not write or alter a fitness function.

Run 1 — `--sandbox real`, repo arg correctly supplied (`.`, the real worktree),
default generations/children (no caps passed, exceeds the ≤3×≤4 cap so treated
as a *scan* probe, not a promotable candidate lineage): 10 variants evaluated,
**all scored identically** (`pass=0.00` throughout in one run against a
bogus-path repo, `pass=1.00` throughout in another run pointed at `--help/`),
`Winner: baseline`, `Delta over baseline: +0.000`.

Run 2 — **bounded**, `--sandbox mock --generations 3 --children 4 --seed 42`,
repo arg = real worktree root: 10 variants across mutation dimensions
(`scorePolicy`, `retryPolicy`, `toolPolicy`, `memoryPolicy`, `reviewer`,
`contextBuilder`), **all scored identically** at `0.765` (`pass=0.60`
uniformly), `Winner: baseline`, `Delta over baseline: +0.000`. Failed lineage
(all 9 non-baseline variants) recorded here, not discarded.

Root cause (`bench create .`, real command): the auto-generated bench suite
is a single task (`repo-native`, `task-0001`) whose `publicTestCommand`,
`hiddenTestCommand`, and `regressionTestCommand` are all literally `npm test`
— a pass/fail signal that cannot vary with any of darwin's harness-policy
mutation dimensions, for a repo that has no agent-execution loop of its own
for those dimensions to affect. This explains both runs above identically,
independent of `--sandbox` mode. **No fitness function was modified to
chase a result** — the frozen, unmodified fitness function is exactly what
produced the flat `+0.000` result, and that result is reported as-is.

`DARWIN_WINNER=baseline (no lift found; root cause documented, not patched)`.

## Evidence (classified)

- OBSERVATION: `dream.config.json#evaluatorEntrypoints.darwin` has never
  included a `<repo>` positional argument, in either its 2026-08-13 (`mock`)
  or 2026-09-03 (`real`) form (`git show` on both commits).
- MEASUREMENT: baseline `verify-entrypoints` run creates a `--sandbox/`
  directory (reproduced twice, once as `--sandbox/`, once with `--help`
  substituted as `--help/`).
- MEASUREMENT: `npm view @metaharness/flywheel bin` → empty; `npx
  @metaharness/flywheel` → exit 1, "could not determine executable to run".
- MEASUREMENT: `npx -y metaharness flywheel` → exit 0, real USAGE text.
- MEASUREMENT: bounded Darwin (`--sandbox mock`, 3 gens × 4 children, seed 42,
  repo arg = real worktree) → 10/10 variants scored identically, delta=+0.000.
- MEASUREMENT: `npm test` 106/106 both baseline and candidate.
- INFERENCE: the flat delta is caused by the auto-generated bench suite's
  single `npm test`-for-everything task, not by sandbox mode choice (both
  `real` and `mock` independently reproduced the same flat result).
- INFERENCE: darwin's genome (planner/toolPolicy/reviewer/retryPolicy/
  memoryPolicy/contextBuilder/scorePolicy) targets agent-harness runtime
  policy, which this repo (a compiler/ledger/witness toolkit) does not
  execute — a probable structural reason no bench task could vary with it
  without hand-authoring one.
- DECISION: ship only the certain, low-risk fixes tonight (repo arg,
  flywheel entrypoint, `.gitignore` hygiene); defer the bench-suite /
  genome-fit question to human review via ADR-0003 rather than
  hand-authoring a custom bench task under tonight's time budget.
- REJECTION: considered switching `--sandbox mock`→`real` back to `mock`
  as part of tonight's fix; rejected — evidence shows sandbox mode is not
  the actual variable controlling non-differentiation here (see INFERENCE
  above), so changing it would not fix anything and would re-litigate a
  prior deliberate human decision (commit `cbc82e6`) without cause.

## Witness

```
report_sha256 : e6afef888bdb4c87ddb748841f820e2470eb5ab8aa6bff5a329a5d662612b6f4
session_commit: 2fba255
witness       : 5ffd85db624a5e3f1aff350d1ba949e729ea6f702bd81d7df5c50af83fcf6004
```
`report_sha256` is computed from this file's content immediately before this
Witness section is filled in (same convention as the 2026-09-08 report) —
verifier step 1 below re-hashes the file as committed for provenance, not to
reproduce this exact digest.
Verifier (reproduce by hand):
1. `sha256sum docs/dream-cycle/gists/2026-09-12-evaluation-adapters.md` → `REPORT_HASH`.
2. `printf '%s%s' "$REPORT_HASH" "2fba255" | sha256sum` → must equal `witness` above.
3. Re-run `node packages/cli/dist/bin.js verify-entrypoints` from a clean
   worktree at the PR's head commit — expect `bench: live`, `darwin: live`,
   `flywheel: live`.
4. `rm -rf .metaharness` before/after (now gitignored) to avoid state
   collisions across repeated runs (see Evidence — this is a known
   idempotency caveat, not something tonight's fix resolves).
5. `npm test` → expect 106/106.

## Next Steps

1. Hand-author a repo-specific `--bench` suite for `@metaharness/darwin` with
   tasks whose pass/fail actually varies by harness-policy dimension — or
   formally accept (ADR-0003) that bounded Darwin evolution is a placeholder
   for this repo until one exists, same status class as `LLM_EVAL=blocked`.
2. Consider whether ADR-0002's classifier should gain a fourth signal for
   "produced non-empty output that doesn't match an expected shape" — out of
   scope tonight (would need a per-entrypoint expected-shape contract).
3. `.metaharness/`'s cross-run idempotency (colliding generated-id state on a
   second run) is unresolved; a nightly wrapper should `rm -rf .metaharness`
   before invoking `verify-entrypoints`/darwin — not implemented tonight.
