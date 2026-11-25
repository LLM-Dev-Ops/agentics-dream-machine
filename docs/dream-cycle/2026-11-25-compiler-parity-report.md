# Compiler-Parity SOTA Report — 2026

> Dream Cycle 2026-11-25. DEEP=compiler-parity. SCAN=config-schema, golden-snapshots.
> Bonus (DAYINT % 25 == 0): ui-management-console — scoped, no finding (see below).

## TL;DR

Tonight's first candidate direction — a self-referential golden-snapshot test
that loads this repo's own `dream.config.json` through `validateConfig()`/
`compile()` — turned out to be a **near-exact duplicate of issue #146 / PR
#147** (2026-11-20, still open, unmerged). Caught it before publishing a
second competing PR for the same gap by checking GitHub live state (STEP 1/2)
*after* drafting the candidate, not just before: `gh api search/issues` for
`"HALT: invalid-config"`, `"Cannot destructure property"`, `"cfg.slots.length"`
→ 0 hits (confirms the *actual* finding below is novel), but a broader sweep
of all `compiler-parity`-labelled issues (#13, #66, #96, #106, #118, #126,
#136, #146 — eight prior compiler-parity nights) surfaced #146's dogfood test
as the same idea. Dropped that half of the candidate entirely (deleted
`packages/compile/src/real-config.test.ts` before committing) rather than
ship a duplicate. What's left and real: **`scripts/dream-nightly.mjs` — this
repo's standalone GitHub-Actions fallback runner — parses `dream.config.json`
with zero schema validation, unlike the `dream-machine` CLI's own `compile`
command.** A schema-invalid config makes `tonight()` throw; the top-level
`main().catch()` exits 1 **before the ledger-append step ever runs**, silently
violating this repo's own documented invariant ("the ledger row is written on
every run, even a budget-forced halt"). Fixed: wired `validateConfig` into
`tonight()` with an honest `HALT: invalid-config` degrade path. `npm test`:
106 → 108, 0 regressions. This specific finding was confirmed absent from all
72 prior `dream-cycle` issues by targeted GitHub search — genuinely novel,
not a rediscovery.

## Ledger check (live GitHub state, not reused from a prior night's numbers)

`docs/dream-cycle/LEDGER.md` on `main` is 9 rows, last updated 2026-09-08 (PR
#9 — the last dream-cycle PR ever merged in this repo). Live state re-checked
tonight via MCP: 72 open issues (#10→#152 range, `dream-cycle` labelled),
0 merges since #9 — a 78-day zero-merge streak, already fully diagnosed by
PR #135/#145 (missing `automerge-safe` label + universal draft state). **Not
re-raised tonight** — this is now a 5th+ repeat of an already-closed
diagnosis (#134, #144, #146, #147 all name it), exactly the case STEP 1.1's
learning signal exists to stop. Every ledger row from 2026-09-21 through
2026-11-24 (dozens of nights) exists only on an unmerged feature branch's own
commit, never on `main` — so `main`'s `LEDGER.md` is structurally stale by
construction (ledger rows only land on `main` through a merge, and nothing
has merged). Tonight's own ledger row below is appended to `main` directly by
this session for the record, same as every recent night does on its own
branch.

Issue #146 (2026-11-20, compiler-parity) / PR #147: open, unmerged, not
superseded. Issue #136 (2026-11-15): open. Issue #126 (2026-11-10): open.
Issue #118 (2026-11-05): open. None closed by a merge — consistent with the
zero-merge streak above.

## Deep dive: compiler-parity

See TL;DR — the live/novel finding is the `scripts/dream-nightly.mjs`
validation gap, not a second dogfood-snapshot PR.

Confirmed via direct reproduction (not inferred from logs): checking out the
unmodified script from `HEAD` (`git show HEAD:scripts/dream-nightly.mjs`) and
running it against a hand-crafted invalid config
(`{"cron":"not-a-cron","slots":[]}`) throws
`TypeError: Cannot destructure property 'deep' of 'cfg.slots[slot]' as it is
undefined` and exits `1`, writing nothing to any ledger. The same input
against the candidate prints `Tonight: DATE=... COMMIT=... — HALT: invalid
dream.config.json` plus the exact `validateConfig` errors, exits `0`, and (outside
`--dry-run`) appends one `HALT: invalid-config` ledger row via the existing
`dream-machine ledger append` CLI invocation already used elsewhere in the
file (same flag names: `--path/--date/--deep/--finding/--issue/--pr/
--evaluated/--verdict/--witness/--priorFates`).

The workflow that runs this script, `.github/workflows/dream-nightly.yml`,
currently has its `schedule:` trigger commented out (manual
`workflow_dispatch` only) — so the bug has not fired in production, but the
workflow is one YAML line away from being live, and the failure mode (a
silent exit-1 CI job, no ledger row, no issue) would be easy to miss until
someone noticed the ledger stopped growing.

## Hypothesis (frozen before implementation)

> Given this repository's own `dream.config.json` as the driving config for
> `scripts/dream-nightly.mjs`, when the config is schema-invalid (a
> `validateConfig()` failure), then the script should record an honest
> `HALT: invalid-config` ledger row and exit 0, rather than throwing past the
> ledger-append step and exiting 1 with no durable record — subject to: a
> schema-valid config must still produce byte-for-byte the same
> research/LLM_EVAL-blocked/dry-run behavior as before the change.

**Tested. Confirmed true, not falsified.**

## Evaluation receipt (real evaluator: `npm test`; LLM_EVAL=blocked — no
OPENROUTER_API_KEY/ANTHROPIC_API_KEY in env, confirmed by `env | grep -i`)

- Baseline (parent, commit `2fba2550182d81b36423447221823e98e227482a`):
  `npm test --silent` → **7 test files, 106 tests, 106 passed, 0 failed**.
- Candidate (same commit + candidate diff): `npm run build` clean (tsc, no
  errors) → `npm test --silent` → **8 test files, 108 tests, 108 passed, 0
  failed**. Net +2 tests, 0 regressions.
- Direct behavioral reproduction of the bug on the **parent** script (see
  Deep Dive above) vs. the candidate script, both actually executed, not
  inferred.
- `npm run lint`: 0 errors (unchanged scope — `scripts/` is not in the eslint
  glob, matching pre-existing project scope).
- `npm run typecheck`: pre-existing `tsconfig.json` "files list is empty"
  error (`TS18002`), reproduced identically on the parent commit via
  `git stash` before any candidate change — classified **preexisting /
  environmental**, not caused by tonight's candidate.
- `gh gist create --public` attempted live tonight (not assumed from a prior
  night's note): `HTTP 403: Gist writes are not permitted through this
  proxy.` `GIST=LOCAL`. GitHub issue/PR creation via the `github` MCP server
  (distinct auth from the broken `gh` CLI token) confirmed working
  (`get_me` → `nicholas-ruest`).

## Darwin

Not run. Bounded Darwin only applies after basic evaluation clears *and*
only if relevant to the candidate's search space; tonight's fix is a single,
deterministic, one-conceptual-change diff (validate-then-branch) with no
tunable parameter or generation-worthy search space.

## Evidence (classified)

- OBSERVATION: parent `scripts/dream-nightly.mjs`'s `tonight()` does raw
  `JSON.parse` with no `validateConfig` call; `packages/cli/src/index.ts:147`
  shows the CLI's own `compile` command does call it — confirmed gap between
  the one tested consumer and the one untested unattended consumer.
- OBSERVATION: targeted `gh api search/issues` across all 72 `dream-cycle`
  issues for `"HALT: invalid-config"`, `"Cannot destructure property"`,
  `"cfg.slots.length"` → 0 hits each. This finding is not a rediscovery.
- OBSERVATION: the same kind of search for the *dogfood golden-snapshot*
  idea (`"validateConfig dream-nightly"`, cross-referencing all
  `compiler-parity`-labelled issues) found issue #146/PR #147 — that idea
  *was* a rediscovery, so it was dropped from the candidate before commit.
- MEASUREMENT: parent script run against an invalid config → exit 1, no
  ledger row.
- MEASUREMENT: candidate script run against the same invalid config → exit
  0, honest `HALT: invalid-config` branch, ledger row path verified via
  `--dry-run` output (actual non-dry-run ledger-append path uses the same
  already-tested `dream-machine ledger append` CLI command).
- MEASUREMENT: `npm test` 106→108 passed, 0 regressions (raw output
  preserved in this session's scratch directory).
- INFERENCE: the bug has not yet fired in production because
  `.github/workflows/dream-nightly.yml`'s `schedule:` trigger is commented
  out — a read of the workflow YAML, not a measurement.
- DECISION: ship the `validateConfig` wiring + honest-degrade branch now,
  while the workflow is still dormant and the fix is cheap and reviewable.
- REJECTION #1: the dogfood golden-snapshot test (`real-config.test.ts`) —
  deleted before commit; duplicate of open PR #147.
- REJECTION #2: considered re-raising the auto-merge/zero-merge-streak
  structural blocker as tonight's finding — rejected; already diagnosed 4+
  times (#134, #144, #146, #147), exactly what STEP 1.1 says to stop doing.
- REJECTION #3: considered adding a full JSON-Schema (ajv) validation layer
  instead of reusing `validateConfig()` — rejected as scope creep;
  `validateConfig()` already exists, is tested, and is this repo's one
  canonical schema authority.

## Reward-hack check

Independent critic: a separate `general-purpose` subagent (not this
candidate's author) reviewed the diff from scratch — read the parent script
from `git show HEAD:...`, read `validateConfig()`'s real implementation,
reproduced both the parent's crash and the candidate's fix by direct
execution, and checked the new tests for tautology. **Verdict:
REWARD_HACK_CLEAR.** No existing test, snapshot, threshold, or gold data
weakened or altered; no evaluator exploited; no cost hidden; no undocumented
cache relied on; the `isMain` guard verified correct for both the
test-import path and the real `node scripts/dream-nightly.mjs` invocation
path (including `--dry-run`). Full critic transcript retained in this
session; summary reproduced verbatim above.

## Security review

No prompt-injection surface, no new tool/MCP authority, no credential
exposure, no filesystem/network scope change, no agent impersonation, no
cross-agent/memory/benchmark poisoning, no supply-chain exposure (zero new
dependencies — `validateConfig` is an existing workspace-internal import), no
unsafe autonomous mutation introduced. This closes a small unsafe-automation
gap: an unattended CI job that used to fail by raw stack trace now fails by
recorded, auditable `HALT`. `.github/workflows/dream-nightly.yml` permissions
(`contents: write`, `issues: write`, `pull-requests: write`) are unchanged.

## Scan findings

**config-schema** — `validateConfig()` (`packages/compile/src/config.ts`)
does not validate that `evaluatorEntrypoints` values are non-empty strings
when present (`{"bench": ""}` would pass validation and then silently no-op
at evaluation time — the same failure class ADR-0002 already named for
`redblue`). Not fixed tonight (would be a second conceptual change) —
flagged for a future `compiler-parity` or `security-adversarial` rotation.
`bonusModuli` *values* (the surface names) are also never validated as
non-empty strings, only the keys are checked as integers.

**golden-snapshots** — PR #147 (open) already adds the dogfood snapshot for
this repo's own `dream.config.json`; nothing new to add here tonight beyond
confirming it's still correct: `compile(dream.config.json)` and the literal
prompt text this session was handed are still byte-identical tonight
(`diff -u` locally, 0 bytes of difference) — PR #147's parity claim from
2026-11-20 still holds 5 nights later.

## Scoped but deferred: `ui-management-console` (bonus surface, DAYINT % 25 == 0)

No `packages/ui*` or console/dashboard surface exists in this repo —
`ls packages/` is `cli ledger memory schedule witness compile`. Recording
this as an explicit non-finding rather than fabricating a UI gap that
doesn't exist.

## Competitors (how comparable autonomous-loop frameworks treat an
unattended automation path's own driving-config failures)

| Project | Validates driving config before an unattended run? | Fails loud (clean reject) or silent (crash past the audit trail) on bad config? | Relevance |
|---|---|---|---|
| OpenHands | pydantic-style config objects raise at construction for malformed fields. | Loud, before the loop runs. | Target state this fix moves `dream-nightly.mjs` toward. |
| DSPy/GEPA | Program/signature definitions validated at compile/trace time before optimization proceeds. | Loud. | Same principle: validate the thing that compiles into the run, before running it. |
| SWE-agent | Config (yaml) loaded via a schema-backed loader; malformed configs raise early. | Loud. | Consistent with tonight's fix. |
| AutoGPT lineage | Historically loose config handling; documented community reports of malformed settings causing confusing mid-run crashes rather than a clean pre-run rejection. | Mixed/silent in older versions. | Closest comparator to the *bug*, not the fix. |

## Gist

No `gh gist create`-equivalent write access (`403: Gist writes are not
permitted through this proxy`, confirmed live tonight). `GIST=LOCAL`. Full
report committed at `docs/dream-cycle/2026-11-25-compiler-parity-report.md`
(this file).

## Witness

- session commit: `2fba2550182d81b36423447221823e98e227482a`
- report sha256 (computed with this Witness section still a placeholder, per
  STEP 16's own ordering): `b848b3a0fe183d4ca22bae252498295e1f8ac96ccfbae51c9adad78223a2c1f9`
- witness stamp: `9657daee03ee38583a062959bbbeb2ef11ce9a5979d891ce83c30f8353f18acd`
- Verifier procedure (5 steps, reproducible by anyone):
  1. `git clone` the repo at commit `2fba2550182d81b36423447221823e98e227482a`, apply the PR's diff.
  2. Restore this Witness section to its placeholder form, then `sha256sum` the file → must equal the recorded `report sha256`.
  3. `printf '%s%s' "<report sha256>" "2fba2550182d81b36423447221823e98e227482a" | sha256sum` → must equal the recorded witness stamp.
  4. `npm ci && npm run build && npm test` → expect 108 passed, 0 failed.
  5. `DREAM_CONFIG=<a hand-crafted invalid config> node scripts/dream-nightly.mjs --dry-run` → expect exit 0 and a `HALT: invalid dream.config.json` line (not a thrown stack trace).

## Recommendation

`evaluated: accepted`. ACCEPT for human review (not self-promoted, not
merged by this session). Small (~50 line) candidate, reviewable, zero new
dependencies, zero evaluation/gate/security-boundary changes, real green
test receipt with a genuine regression reproduction, independently
critiqued. Next steps:
1. Validate `evaluatorEntrypoints` values are non-empty strings in
   `validateConfig()` (config-schema scan finding above).
2. Enable `.github/workflows/dream-nightly.yml`'s `schedule:` trigger now
   that its config-validation gap is closed — separate human decision, out
   of scope for this candidate to flip on its own.
3. The single highest-leverage human action outstanding across this entire
   repo remains unchanged from #146/#147's own recommendation: resolve the
   structural auto-merge blocker (PR #135/#145 — missing `automerge-safe`
   label + universal draft state). Every other finding, however correct,
   will keep sitting unmerged until that is fixed by a human.
