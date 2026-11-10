# Compiler-Parity / Config-Schema & Golden-Snapshots SOTA Report — 2026-11-10

**Rotation**: `DATE=2026-11-10`, `DAYINT=20261110`, `SLOT=$(( DAYINT % 5 )) = 0` →
`DEEP=compiler-parity`, `SCAN=config-schema,golden-snapshots`. No bonus moduli
fire tonight (`20261110 % 25 = 10`, `% 75 = 10`, both nonzero).
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.

## TL;DR

`packages/compile/src/config.ts`'s `validateConfig()` checks that `bonusModuli`
KEYS are integer-like strings, but never checked that the VALUES are valid.
Since `step0Context()` string-interpolates each value directly into the
compiled nightly prompt (`` `DAYINT % ${mod} == 0  → add ${surface}` ``), a
config with a malformed value — `{}`, `null`, a number, or an empty string —
passes validation silently and the compiled prompt an autonomous agent reads
each night ends up containing `→ add [object Object]`, `→ add null`, or
`→ add ` with no surface name. Reproduced live against the real built module
(not inferred). Fixed with a 3-line additive type/non-empty-string guard,
mirroring the pattern PR #107 (2026-10-30, still open/unmerged) already
applied to `autoMerge`/`labels`/`competitors`/etc. — but #107 never touched
`bonusModuli`'s values, and no later night did either. `npm test` 106→113,
0 regressions, independent critic clear.

## Ledger Check (STEP 1)

`docs/dream-cycle/LEDGER.md` on `main` ends at row 9 (2026-09-08) — unchanged
since that night, because **zero PRs have merged in this repo since #9**.
Live `list_issues`/`list_pull_requests` tonight: 56 open issues (to #124), 30
open PRs (to #125) on the first page alone, 0 merged. This is not new — every
recent night's report documents the same backlog from its own slot (most
recently #124, 2026-11-08: "merge-readiness audit of the 7 open
security-adversarial PRs"). `ledger signals` tonight:
`{"zeroMergeStreak":true,"duplicateDirections":[],"lowScoreStreak":false,"blockedEvalStreak":false,"nightsConsidered":7}`.
Per STEP 1.1, `zeroMergeStreak:true` → bias tonight's candidate to tiny,
one-parameter, easily-reviewable. That directly shaped candidate selection
below (see Competitors/Candidates section — the two more "interesting"
rejected candidates were passed over partly *because* they were less
cleanly reviewable).

**Material observation, not re-litigated as tonight's finding (out of
compiler-parity scope, already well-documented elsewhere):** `LEDGER.md` on
`main` has not gained a row since 2026-09-08, yet GitHub shows real,
distinct, well-evidenced nightly work continuing through at least
2026-11-08 (issues #10 through #124). Every night's `docs/dream-cycle/*.md`
report and `LEDGER.md` row updates live only on that night's own unmerged
PR branch — `main` itself has only 3 files in `docs/dream-cycle/` (two
security-adversarial reports plus `LEDGER.md`) despite ~58 real nights
having run. This is the same zero-merge backlog already tracked by
`ledger-signals` nights (#88, #104, #124) from a different angle: the
"durable cross-night memory" the routine depends on is itself split across
dozens of unmerged branches, not actually durable on `main`. Recorded here
as an observation for the record; not tonight's candidate.

## Deep Dive — compiler-parity history (STEP 2: accumulated evidence)

Read, in order, before researching externally: `docs/dream-cycle/` (only 2
real prior reports on `main`, neither compiler-parity), `docs/adrs/`
(ADR-0001, ADR-0002 — neither touches `config.ts`), then the **actual open
PR diffs** for every prior compiler-parity night this slot has produced
(pulled live via `pull_request_read get_diff`, not inferred from titles):

- **PR #87** (2026-10-20): `compile` stdout had a doubled trailing `\n`
  relative to `--out` and `schedule`'s embedded content. Fixed in
  `packages/cli/src/index.ts`. Unmerged. Still live on `main` (confirmed:
  `main`'s `packages/cli/src/index.ts` still calls `sink.log(prompt)`
  unconditionally).
- **PR #97** (2026-10-25): `SLOT=$(( DAYINT % 5 ))` and the bonus triggers
  collapse to day-of-month arithmetic (`100 ≡ 0 mod 5/25/75`); fixed via a
  monotonic `EPOCHDAY`. Unmerged. Still live on `main` (confirmed: `main`'s
  `step0Context()` still defines `DAYINT` only, no `EPOCHDAY`, and still
  divides `DAYINT`).
- **PR #107** (2026-10-30): `validateConfig()` silently accepted
  type-malformed *optional* fields (`autoMerge: "false"` as a string is
  JS-truthy → wrong merge-policy text rendered). Added type guards for
  `autoMerge`/`labels`/`competitors`/`extraDisciplines`/
  `evaluatorEntrypoints`/`branchPrefix`/`ledgerPath`/`adrConvention`.
  Unmerged. Still live on `main` (confirmed: read `main`'s current
  `config.ts` directly tonight — zero of those guards are present; this
  repo's actual baseline tonight has none of PR #107's fix).
- **PR #119** (2026-11-05): independently re-derived PR #87's double-newline
  finding from scratch (a reconfirmation, not a new fix).
- PR #107's own "Recommendation" section names two deferred next steps:
  (a) restrict `evaluatorEntrypoints` to its 4 known keys, (b) range-check
  `adrConvention.pad` as a non-negative integer. Both presuppose #107's own
  type-guard scaffold already existing in `validateConfig()` — which, since
  #107 is unmerged, it does not. Picking up either tonight would mean
  re-deriving most of #107's 41-line diff just to reach the point where (a)
  or (b) would even apply — high duplication risk for a "tiny" candidate.
  Not attempted tonight for that reason (see Candidates below).

**Not a rediscovery check:** `gh api search/issues` for `bonusModuli` across
this repo returns exactly 2 hits — #96/#97, both about the `EPOCHDAY`
rotation-formula fix, neither mentioning value-type validation. Grepped
`docs/adrs/*.md` and the repo's docs site for `bonusModuli` — only schema/
example usages, no prior bug report on this specific gap. Independently
re-confirmed by tonight's critic subagent.

## Hypothesis (frozen before implementation)

> Given a `dream.config.json` with a `bonusModuli` map, when a value is a
> non-string or empty/whitespace-only string (`{}`, `null`, a number, `''`,
> `'   '`), `validateConfig()` currently reports `ok: true` with zero errors,
> and `compile()` goes on to string-interpolate that value directly into the
> compiled prompt's "Bonus deep dives" block, producing malformed text
> (`→ add [object Object]`, `→ add null`, `→ add ` with nothing). Adding an
> explicit `typeof`/non-empty check for `bonusModuli` values should make
> `validateConfig()` reject every such case with a specific, field-named
> error, and make `compile()` throw before it can emit the malformed text —
> subject to: no pre-existing test weakened/removed/modified, the new tests
> must fail against the pre-fix code (not tautological), and the existing
> 106-test suite stays green with zero regressions.

**Tested. Confirmed true (the silent-accept gap, independently reproduced
both by this session and by a separate critic subagent), not falsified —
see Evaluation Receipt.** The fix's fail-fast property is also confirmed,
not falsified.

## 5 Candidates Considered (STEP 3 scoring, 1–5 each)

| # | Candidate | Fit | Novelty | Testability | Measurability | Prod-value | Reviewability | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | **`bonusModuli` values untyped/unvalidated → malformed text silently rendered into the compiled prompt** | 5 | 4 | 5 | 5 | 4 | 5 | **SELECTED** |
| 2 | `adrConvention.pad` range-check (non-negative integer) — PR #107's own deferred "next step 2" | 3 | 2 | 4 | 4 | 3 | 3 | Rejected — presupposes #107's unmerged type-guard scaffold; building it tonight would re-derive most of #107's diff, high duplication risk |
| 3 | `scan` array not enforced to exactly 2 entries (type says `[string,string]`, validation only checks `length ≥ 1`) | 3 | 3 | 4 | 3 | 2 | 4 | Rejected — cosmetic type/doc mismatch, rendering still works correctly for any length, no concrete broken-output consequence |
| 4 | Duplicate `deep` surface names across rotation slots not detected | 3 | 3 | 3 | 3 | 3 | 3 | Rejected — ambiguous whether duplicate `deep` across slots is ever actually invalid (could be deliberate), weaker falsifiable claim |
| 5 | `branchPrefix`/`ledgerPath` path-safety (e.g. `"../"`) | 2 | 2 | 3 | 2 | 2 | 3 | Rejected — speculative; both fields are config-author-controlled (same trust boundary as the config itself), no concrete exploit path demonstrated |

No override of the top score — #1 is both the top score and the selection.

## Candidate

`packages/compile/src/config.ts` (`validateConfig`): +4/-1 lines, purely
additive logic alongside the existing key check (switches `Object.keys` to
`Object.entries` to also see the value, adds one `typeof`/`trim()` guard).

```diff
   if (config.bonusModuli) {
-    for (const k of Object.keys(config.bonusModuli)) {
+    for (const [k, surface] of Object.entries(config.bonusModuli)) {
       if (!/^\d+$/.test(k)) errors.push(`bonusModuli key "${k}" must be an integer`);
+      if (typeof surface !== 'string' || surface.trim() === '') {
+        errors.push(`bonusModuli["${k}"] must be a non-empty string, got ${JSON.stringify(surface)}`);
+      }
     }
   }
```

`packages/compile/src/index.test.ts` (+23 lines, 0 removed/modified): one
`it.each` over 5 malformed values (object/null/number/empty-string/
whitespace-string) asserting `validateConfig().ok === false` with the
specific error message; one "no false positives" accept case; one
`compile()`-level test asserting it now throws instead of silently
rendering `[object Object]`.

One conceptual change, ~27 changed lines total (well under the <300-line
target), no `.github/`, no lockfile, no safety/gate/threshold/promotion/
scorer path touched.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), this repo's own configured `bench`
entrypoint (`npm test`, per `dream.config.json`'s `evaluatorEntrypoints`).
`LLM_EVAL=blocked` — no `OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY`/
`OPENAI_API_KEY` in this session's environment, consistent with every prior
night; this candidate needs zero model calls by design (pure static
validation logic).

| | Baseline (parent, `main@2fba255`, fresh `npm ci && npm run build`) | Candidate (working tree) |
|---|---|---|
| Test files | 7 | 7 |
| Tests | 106 | 113 (+7, 0 removed, 0 modified) |
| Result | 106 passed | 113 passed |
| Lint (`eslint packages`) | clean | clean |
| Build (6 packages, `tsc`) | clean | clean |
| `npm audit --omit=dev` | 0 vulnerabilities | 0 vulnerabilities |
| `bonusModuli: {"25": {}}` | `validateConfig().ok === true`; `compile()` renders `→ add [object Object]` | `validateConfig().ok === false`; `compile()` throws |

Live reproduction of the pre-fix gap (ran against the real built module,
not inferred from source reading):

```
$ node repro.js
--- object value ---      "...→ add [object Object]\n```..."
--- empty string value --- "...→ add \n```..."
--- number value ---       "...→ add 123\n```..."
--- null value ---          "...→ add null\n```..."
--- normal (baseline) ---   "...→ add roadmap-review\n```..."
```

Non-tautology check: `git stash push -- packages/compile/src/config.ts`
(keeping the new test file), rebuild, rerun → **6/6 new tests fail exactly
as predicted** (the 5 `it.each` rejection cases plus the `compile()`-throws
case; errors: `expected true to be false` / `expected [Function] to throw`).
`git stash pop`, rebuild, rerun → all 113 green again. **Independently
reproduced by a separate critic subagent** from a cold read of the diff,
using the same stash/pop procedure, with its own verification that the
production-consequence claim (`[object Object]` reaching the compiled
prompt) is real before the fix.

## Darwin Results

`DARWIN=unavailable` — `npx -y @metaharness/darwin@0.13.1 --version` was
blocked by this session's sandbox policy against executing fetched
third-party code (not a missing-credential or missing-package condition —
the registry resolved `0.13.1` fine via `npm view`, but actually running it
was denied). Recorded as a degradation, not a stop condition, consistent
with STEP 0.5's build-failure-is-a-degradation discipline. Separately: a
3-line additive type-guard check has no evolvable population for bounded
Darwin's generations×candidates search, same reasoning as every prior
small deterministic-fix night in this slot's history (#87, #97, #107).

## Evidence

- OBSERVATION: `packages/compile/src/config.ts`'s `bonusModuli` validation
  loop (`main@2fba255`) iterates `Object.keys(...)` only — the value is
  never read or checked.
- OBSERVATION: `packages/compile/src/index.ts`'s `step0Context()` string-
  interpolates each `bonusModuli` value directly into the compiled prompt
  with no escaping or type coercion guard.
- MEASUREMENT: live repro script against the real built module —
  `bonusModuli: {"25": {}}` → `validateConfig().ok === true`;
  `compile(...)` output contains the literal substring
  `DAYINT % 25 == 0  → add [object Object]`. Same for `null` → `→ add null`,
  `123` → `→ add 123` (less obviously broken but still untyped), `''` →
  `→ add ` (trailing space, no surface name).
- MEASUREMENT: `npm test` 106→113, 0 regressions, 0 removed/modified tests;
  `npm run lint` clean; `npm run build` clean; `npm audit --omit=dev` 0
  vulnerabilities, both before and after.
- MEASUREMENT: non-tautology stash/pop — 6/6 new tests fail pre-fix with
  the predicted assertion errors, pass post-fix; independently reproduced
  by a separate critic subagent.
- MEASUREMENT: live `list_issues`/`list_pull_requests` on
  `LLM-Dev-Ops/agentics-dream-machine`: 56 open issues (to #124), 30+ open
  PRs (to #125), 0 merged since #9 (2026-09-08).
- INFERENCE: this gap is not purely cosmetic — the malformed text would
  land inside the literal nightly-routine prompt that an autonomous agent
  (this session, on a future night with a misconfigured `bonusModuli`)
  reads and is instructed to act on; a `[object Object]` or empty surface
  name as a "deep dive to add" is a small but real instruction-quality
  defect in a system whose own operating principle is "every quantitative
  claim carries its evidence grade" / reproducibility.
- DECISION: scope held to `bonusModuli` values only — did not also attempt
  PR #107's deferred `evaluatorEntrypoints`-key-restriction or
  `adrConvention.pad` range-check, since both presuppose #107's unmerged
  scaffold and re-deriving it would be a second conceptual change and a
  high-duplication-risk diff against an already-open PR.
- REJECTION: considered re-deriving PR #107's `adrConvention.pad` next step
  — rejected (see Candidates table, row 2) specifically because it would
  require rebuilding most of #107's own diff first, which is not "tiny" and
  risks a merge conflict with an already-open, already-scored PR.
- REJECTION: considered the `scan` tuple-length gap — rejected as cosmetic
  (type/doc mismatch only; no broken runtime output demonstrated for any
  array length ≥ 1).

## Reward-Hack Check

Independent critic: a fresh general-purpose subagent, given only the diff
and the claim, instructed to re-derive everything itself from the actual
repo state (not told the result in advance), with explicit instructions to
try to find reasons to REJECT.

**Verdict: CLEAR.** The critic independently: (a) verified the production-
consequence claim true, by reasoning from the pre-fix code and reproducing
the `[object Object]` interpolation; (b) verified the 6 new tests are
non-tautological via its own independent stash/pop run (6/6 failed
pre-fix); (c) found no reward-hacking signal — no existing test/threshold
weakened, no gold answers altered, no subset-only test run, no evaluator
exploit, no hidden cost, no gate/security/threshold file touched; (d)
confirmed final repo state via `git status`/`git diff` matches exactly the
diff described, nothing extra changed, and `npm test --silent` → 113/113
passing; (e) grepped `docs/adrs/` and the docs site for `bonusModuli` and
found no prior report of this specific value-validation gap, consistent
with this session's own `search/issues` 0-hit result.

## Security Review

This is more than purely cosmetic, in the same (smaller-scale) sense PR
#107 argued for `autoMerge`: the compiled nightly prompt is the literal
instruction text an autonomous agent (this session, on future nights)
reads and acts on. A malformed `bonusModuli` value degrades the quality of
that instruction text (a `[object Object]`/empty "deep dive to add" line)
rather than compromising any safety boundary — it cannot grant permissions,
disable a gate, or change a threshold; `step0Context()`'s rendering logic
itself is untouched. The fix is a pure, synchronous, side-effect-free type
check added to an already-existing, already-tested validation function —
no new `exec`/network/filesystem/credential surface, no new dependency, no
LLM call in this candidate. No prompt-injection surface (no externally
sourced data reaches this code; `bonusModuli` is authored by the same
party that owns the repo's `dream.config.json`). No tool/MCP authority
change.

## Scan Findings

- **config-schema**: fixed tonight for `bonusModuli` values specifically
  (see Candidate above). `validateConfig()` remains hand-rolled structural
  validation (not JSON-Schema/ajv/Zod) — PR #51's JSON-Schema-mirror
  proposal and PR #107's broader optional-field type guards are both still
  open/unmerged and not re-attempted tonight (see Candidates table).
  Current `main` state independently re-confirmed tonight by directly
  reading `config.ts`: zero of PR #107's guards are present on `main` as of
  this session.
- **golden-snapshots**: the existing `metaharness` fixture snapshot
  (`packages/compile/src/__snapshots__/index.test.ts.snap`) is unaffected —
  `npx vitest run -u` produces no diff, confirmed via `git diff --stat`
  returning nothing for the snapshot directory. Tonight's fix only changes
  behavior for malformed input the snapshot's well-formed fixture never
  exercises.

## Competitors (informative only; this is implementation-level config
validation, same bug class PR #107 already graded — not re-researched from
scratch, no new capability claim, B/C grade throughout)

| Project | Config-validation approach | Relevance | Grade |
|---|---|---|---|
| SWE-agent | YAML config with Pydantic-style validation in recent versions | Pydantic would reject a non-string/empty value by construction — the standard fix for exactly this bug class | B |
| OpenHands | YAML/env-var config, limited startup validation | Same general risk class (silently-accepted malformed config); no public incident documenting this specific sub-case | C |
| Zod / io-ts (general TS ecosystem, not a Dream-Machine competitor, but the standard library-level fix) | Schema-first runtime validation with type inference | This repo's hand-rolled `validateConfig()` keeps reinventing one narrow slice of what a schema library gives for free, field by field, night by night (#107, tonight) — the cumulative pattern itself is weak evidence for revisiting the schema-library architectural question PR #107 raised, though not a decision for tonight | A (pattern), C (library choice unevaluated) |
| Sakana AI Scientist / DGM lineage | Self-modifying systems with reproducibility requirements | Same "don't let a malformed artifact silently reach the system's own operating instructions" principle, at much larger scale | A (source), C (direct relevance — this is a much smaller instance) |

## Gist

No `gh gist create` available this session: `gh auth status` reports
`GH_TOKEN` invalid (same as every prior night since 2026-09-10), **and**
tonight's own direct probe of the REST gists endpoint
(`gh api -X GET /gists`) returned a distinct, more specific error than
"invalid token": `"This GitHub API path is not available: sessions are
bound to their configured repositories. Use repository-scoped endpoints."`
— this is a session-routing/proxy-scoping restriction, not a credential
problem (the same session's GitHub MCP tools are independently
authenticated and work fine for repository-scoped issue/PR reads and
writes, confirmed via `get_me` returning the real account). `GIST=LOCAL`,
same outcome as every dream-cycle night on this repo to date. Committed as
`docs/dream-cycle/2026-11-10-compiler-parity-report.md` (this file).

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so — same
documented convention as every prior night's report — the stamp cannot be
written *inside* the file it stamps. The hash below was computed on this
report's content exactly as it stood immediately before this section was
filled in.

```
session_commit: 2fba2550182d81b36423447221823e98e227482a
report_sha256 : d61da42e9715c7c8f4f06b8e72706c3ca4b3fe0c3f7935be5c3f558ee329da0c
witness       : 0af1d8c7c080963ec598f7f90658b63a4207b2542a504590ee6cbe69d8339861
```

Verify the hash-chain math (not the self-referential file hash):

```bash
printf '%s%s' "d61da42e9715c7c8f4f06b8e72706c3ca4b3fe0c3f7935be5c3f558ee329da0c" "2fba2550182d81b36423447221823e98e227482a" | sha256sum
# must equal 0af1d8c7c080963ec598f7f90658b63a4207b2542a504590ee6cbe69d8339861
```

5-step verifier anyone can reproduce: (1) check out
`2fba2550182d81b36423447221823e98e227482a`, apply this PR's diff; (2) run
`npm ci && npm run build && npm test --silent` and confirm 113/113 pass,
0 regressions vs. the pre-diff 106/106; (3) run
`git stash push -- packages/compile/src/config.ts && npx vitest run
packages/compile/src/index.test.ts; git stash pop` and confirm 6/6 new
tests fail without the fix; (4) recompute `sha256sum` of this report file
with the Witness section's two placeholder lines blanked, and
`printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum`, and check it
equals the `witness` value filled in below; (5) confirm `session_commit` is
reachable from `main`'s history
(`git merge-base --is-ancestor 2fba255 main`).

## Recommendation

`evaluated: accepted` — small (27 changed lines), real-evidence-backed,
non-protected-path, zero-security-surface fix with a non-tautological
regression test independently re-verified by a separate critic, closing a
genuinely novel gap in `bonusModuli` validation that no prior night (across
58+ real GitHub nights) had filed. For the human:

1. Review and merge this PR. It is independent of and non-conflicting with
   every other open compiler-parity PR (#87, #97, #107, #119) — none touch
   the `bonusModuli` value-validation branch.
2. Given the 56-open-issue/30+-open-PR/0-merged backlog documented above
   (out of scope to fix tonight, but material to the recommendation): this
   PR is one of the smallest, highest-confidence, fully independent
   compiler-parity fixes currently open, in the same spirit as #97/#107's
   own recommendations. Merging it (or #87/#97/#107, all independent of
   each other) would be higher-leverage than another night of
   `compiler-parity` research producing a 5th unmerged PR on this surface.
3. Next steps (not built tonight, kept separate): (a) PR #107's own
   deferred `evaluatorEntrypoints`-key-restriction and
   `adrConvention.pad` range-check, once/if #107 itself merges; (b) the
   `main`-vs-GitHub ledger-staleness gap noted above under Ledger Check is
   a `ledger-signals`-surface finding, not re-litigated here.

This session does not merge, self-approve, or self-promote.
