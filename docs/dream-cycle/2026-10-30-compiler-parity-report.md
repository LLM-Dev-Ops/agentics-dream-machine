# Compiler-Parity / Config-Schema SOTA Report — 2026-10-30

**Rotation**: `DAYINT=20261030`. Note: tonight's own rotation formula is
still the pre-fix `SLOT=$(( DAYINT % 5 )) = 0` → `DEEP=compiler-parity`,
`SCAN=config-schema,golden-snapshots`. (The 2026-10-25 finding that this
formula collapses to day-of-month arithmetic — PR #97, still open/unmerged
— does not change tonight's slot value, since 20261030's day-of-month (30)
happens to land on the same slot either way; verified independently below.)
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`. No bonus moduli
fire tonight (`20261030 % 25 = 5`, `% 75 = 5`).

## TL;DR

This repo's own `compile()`/`validateConfig()` (`packages/compile/src/`) is
itself the compiler-parity/config-schema surface under test — this is the
Dream Machine evolving its own harness. Tonight's candidate closes the exact
"next step" flagged but not built by the 2026-10-25 compiler-parity report
(open PR #97): `validateConfig()` type-checked `repo`/`cron`/`slots`/
`bonusModuli` but silently accepted structurally-wrong-typed optional fields.
Concretely and independently reproduced tonight: `autoMerge: "false"`
(a string, not a boolean — a very plausible JSON typo) is JS-truthy, so the
unpatched `compile()` renders "guarded auto-merge ENABLED" policy text for a
config author who intended `autoMerge: false`. Fixed with additive type
guards in `validateConfig()`; 0 regressions; independent critic clear.

## What's new (live GitHub state checked tonight)

- `list_issues`/`list_pull_requests` on `LLM-Dev-Ops/agentics-dream-machine`:
  48+ open issues (to #104), 55 open PRs (to #105), **zero merged** since #9
  (2026-09-08) — the same structural backlog every recent night's report
  documents from its own slot; not re-litigated here beyond what's needed to
  pick tonight's candidate honestly.
- Compiler-parity now has **11 real nights** (#14/#23/#31/#41/#50-51/#56-57/
  #66-67/#76-77/#86-87/#96-97, tonight). The chain of fixes already found and
  PR'd-but-unmerged: double-trailing-newline (PR #87), `DAYINT`→`EPOCHDAY`
  rotation collapse (PR #97). Both `search_issues` (0 hits) and direct
  reading of PR #97's report body confirm the `validateConfig()` type-guard
  gap it names as "next step 2" has not been built by any subsequent night
  (#99 ledger-signals, #101 evaluation-adapters, #103 security-adversarial,
  #105 developer-experience — none touch `config.ts`).
- Independently re-derived (not trusted from the PR #97 report text) that
  main (`2fba255`) still lacks the EPOCHDAY fix and the type guards — both
  verified live against the actual checked-out `packages/compile/dist/`
  build tonight, before writing any code.

## Hypothesis (frozen before implementation)

> Given `validateConfig()` in `packages/compile/src/config.ts`, when a
> `DreamConfig` carries a structurally-wrong-typed optional field
> (`autoMerge` as a string, `labels`/`competitors`/`extraDisciplines` as a
> non-string-array, `evaluatorEntrypoints` as a non-object or with a
> non-string value, `branchPrefix`/`ledgerPath` as a non-string,
> `adrConvention` as an unrecognized value), `validateConfig()` currently
> reports `ok: true` with zero errors for every such case — verified live,
> not assumed. Adding explicit type guards for these fields should make
> `validateConfig()` report `ok: false` with a specific, field-named error
> for each malformed case, make `compile()` fail fast (throw) instead of
> silently rendering wrong policy text for the concrete `autoMerge: "false"`
> case, and introduce zero regressions in the pre-existing 106-test suite.

**Tested. Confirmed true (the silent-accept gap, independently reproduced),
not falsified — see Evaluation Receipt.** The fix's fail-fast property is
also confirmed, not falsified.

## Candidate

`packages/compile/src/config.ts` (`validateConfig`): +41 lines, additive
only — no existing branch removed or reordered. Adds:
- `typeof autoMerge !== 'boolean'` → error
- `labels`/`competitors`/`extraDisciplines` must be `string[]` (new
  `isStringArray()` helper, also additive)
- `evaluatorEntrypoints` must be a plain object with string-typed values
- `branchPrefix`/`ledgerPath` must be strings
- `adrConvention` must be `'3-digit' | '4-digit' | { pad: number; dir: string }`

`packages/compile/src/config-type-guards.test.ts` (new, 120 lines): 13 tests
— one per malformed-type rejection case, one "no false positives" accept
case, and 2 tests pinning the concrete `autoMerge: "false"` production
consequence (JS-truthiness fact, and `compile()` now throwing instead of
silently rendering the wrong merge-policy text).

One conceptual change (type-correctness guards on `DreamConfig`'s optional
fields). 41 changed lines in tracked source + 120 new test lines — within
the <300-line target.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), this repo's configured `bench`
entrypoint. `LLM_EVAL=blocked` (no `OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY`
in environment) — by design this candidate needs zero model calls
(pure static validation logic).

| | Baseline (`main@2fba255`, fresh `npm ci && npm run build`) | Candidate |
|---|---|---|
| Test files | 7 | 8 |
| Tests | 106 | 119 (+13, 0 removed/modified) |
| Result | 106 passed | 119 passed |
| Lint (`eslint packages`) | clean | clean |
| Build (6 packages, `tsc`) | clean | clean |

Live reproduction of the silent-accept gap, against the real
`validateConfig()` import (not inference from reading code):

```
$ node -e "const {validateConfig}=require('./packages/compile/dist/config.js');
 ... 7 malformed cases (autoMerge:'true', labels:'dream-cycle',
     competitors:'Sakana', evaluatorEntrypoints:'npm test',
     branchPrefix:123, ledgerPath:42, adrConvention:'bogus') ..."
# every case: {"ok":true,"errors":[],"warnings":[]}   (pre-fix)
```

Concrete production-relevant instance, independently verified:

```
$ node -e "const {compile}=require('./packages/compile/dist/index.js');
 console.log(compile({...base, autoMerge:'false'}).includes('guarded auto-merge ENABLED'))"
true   # pre-fix: "false" (string) renders ENABLED text
```

Non-tautology check (same discipline PR #97 used): `git stash push --
packages/compile/src/config.ts` (keep the new test file), rerun → 10 of 13
new tests fail exactly as predicted; `git stash pop` → all 119 green again.
Independently reproduced by a separate critic subagent via the same
stash/pop procedure, from a cold read of the diff.

## Baseline

Commit `2fba2550182d81b36423447221823e98e227482a` — every open dream-cycle
PR in this repo branches from this same commit; nothing has ever merged.
106/106 tests. No prior compiler-parity night added type guards to
`validateConfig()`'s optional fields (PR #51 adds an external JSON Schema
*mirror* file, which does not change what the TS `validateConfig()` function
itself accepts at runtime — confirmed by reading PR #97's report and by this
session's own `search_issues`/`search_pull_requests` queries, both 0 hits).

## Darwin Lineage

`DARWIN=not-applicable` — `npx --no-install @metaharness/darwin --version`
confirms the package is not locally installed tonight (consistent with
every prior night back to #9). Separately, additive type-guard checks are
not an evolvable population for bounded Darwin's generations×candidates
search (same reasoning as the 2026-10-25 report).

## Evidence

- OBSERVATION: live `list_issues`/`list_pull_requests`/`search_issues` on
  `LLM-Dev-Ops/agentics-dream-machine`: 48 open issues to #104, 55 open PRs
  to #105, 0 merged since #9; 0 hits for a "validateConfig type guard"
  search.
- MEASUREMENT: `validateConfig()` on main returns `{ok:true,errors:[]}` for
  7 distinct malformed-type configs (reproduced live against the built
  module, not inferred from source reading alone).
- MEASUREMENT: `Boolean("false") === true` in plain JS (verified via `node
  -e`, not assumed); `compile({...autoMerge:"false"})` on main renders
  "guarded auto-merge ENABLED" (reproduced live).
- MEASUREMENT: `npm test` 106→119, 0 regressions; independently reproduced
  by a separate critic subagent, including its own stash/pop non-tautology
  check (10/13 new tests fail pre-fix, 13/13 pass post-fix).
- DECISION: scope held to type-correctness only (no semantic/range checks,
  e.g. `adrConvention.pad` could still be negative) — flagged by the critic
  as a minor, non-blocking, out-of-scope gap for a future night, not a
  regression.
- REJECTION: none — no alternative candidate was built and discarded
  tonight; the duplicate-check (STEP 2) ran *before* implementation, not
  after, precisely to avoid repeating PR #14's self-referential-snapshot
  pattern that the 2026-10-25 report had to discard mid-session.

## Reward-Hack Check

Independent critic: a fresh general-purpose subagent, given only the diff
and the claim, instructed to re-derive everything itself (not told the
result in advance).

**Verdict: CLEAR.** The critic independently confirmed: the diff is purely
additive to `config.ts` (+41/-0) and one new test file — no existing
assertion, benchmark, CI file, or security boundary touched; the
`autoMerge:"false"` truthiness claim is correct in plain JS; the new tests
are non-tautological (10/13 fail pre-fix via independent stash/pop,
reproducing this session's own check from a cold start); `npm test`/`lint`/
`build` all green with 0 regressions; no false positives against
`defaultConfig()`'s output or the CLI's `loadConfig()` consumer path; no
false negatives in the targeted fields (null, mixed-type arrays correctly
rejected); and an independent `search_issues`/`search_pull_requests` query
confirms 0 duplicate prior filings. The critic flagged two genuinely minor,
explicitly out-of-scope gaps (not correctness bugs): `evaluatorEntrypoints`
doesn't restrict to known keys, and `adrConvention`'s pad-object branch
doesn't range-check `pad`. Logged as a next step below, not fixed tonight
(would be a second conceptual change).

## Security Review

This surface is more than cosmetic: the `autoMerge` field directly gates
which merge-policy text (`human-review-only` vs. `guarded auto-merge
ENABLED`) a target repo's compiled nightly prompt presents to whichever
agent runs it — a real, if soft, safety-relevant control for an autonomous
code-evolution system. The validation gap allowed a one-character-class JSON
typo (`"false"` instead of `false`) to silently flip that control's rendered
text toward the more permissive policy. The fix adds pure, synchronous,
side-effect-free type checks to an already-existing validation function —
no new `exec`/network/filesystem/credential surface, no change to the
compiled template logic itself (`index.ts`'s `mergePolicy` ternary is
untouched; it is simply never reached with a malformed value now).
Prompt-injection / cross-agent-poisoning / supply-chain: N/A — no externally
sourced data, no new dependency, no LLM call in this candidate.

## Regression Analysis

0 pre-existing tests removed, weakened, or retargeted. `config.ts`'s diff is
purely additive (no existing line changed). 1 new test file, fully
additive, independently confirmed non-tautological by both this session and
a separate critic subagent.

## ADR

None. This is a validation/parameter-correctness fix within the
already-decided config-schema surface (ADR-0001's config-driven design) —
not a new architectural decision, and matches precedent (PRs #14/#37/#51/
#57/#87/#97: "additive/parameter fix, not an architectural decision").

## Gist

No `gh gist create`-equivalent available to this session (`gh auth status`:
`GH_TOKEN` invalid — the same constraint every prior night since 2026-09-10
has recorded; the GitHub MCP server tools used for issue/PR reads and writes
tonight are authenticated independently of `gh` and do not expose a gist
API). Committed to the repo instead, alongside this PR. `GIST=LOCAL`.

## Issue

Filed as part of this PR's publication step (see PR body for the live issue
number — this report was written, witness-stamped, and frozen before the
issue was opened).

## Scan Findings

**config-schema** — fixed tonight (see Candidate above). Residual, explicitly
out-of-scope-for-tonight gaps the independent critic flagged: (1)
`evaluatorEntrypoints` doesn't restrict keys to the known set (`bench`,
`flywheel`, `darwin`, `redblue`) — an unknown string-valued key still
silently passes; (2) the `adrConvention` pad-object branch doesn't
range-check `pad` (e.g. `{pad: -3, dir: 'x'}` would still validate). Neither
is a regression; both are candidates for a future compiler-parity/
config-schema night.

**golden-snapshots** — the existing `metaharness` fixture snapshot
(`packages/compile/src/__snapshots__/index.test.ts.snap`) is unaffected by
tonight's change (verified: `npx vitest run -u` produces no diff against
the committed snapshot, since `validateConfig()`'s new guards don't change
`compile()`'s *output* for any well-typed config, only its behavior on
malformed ones). No golden-snapshot drift found tonight.

## Competitors (informative; this finding is implementation-level config
validation, not a capability claim — graded B/C throughout, no A-grade
source applies directly)

| Project | Config-validation approach | Relevant to tonight's finding | Grade |
|---|---|---|---|
| OpenHands | YAML/env-var config, limited schema validation at startup | Same general class of risk (silently-accepted malformed config), no public incident documentation found | C |
| SWE-agent | YAML config with some Pydantic-style validation in recent versions | Pydantic-style validation would have caught this exact class of bug by construction (type coercion/rejection at the model layer) — directly relevant prior-art pattern | B |
| DSPy/GEPA | Python kwargs/dataclasses, relies on Python's own type system at call sites, not a separate validate step | Different mechanism (static typing vs. runtime JSON validation) — not directly transferable to this repo's JSON-config design | B |
| Zod / io-ts (general JS/TS ecosystem, not a Dream-Machine competitor per se but the standard fix for this exact class of problem) | Schema-first runtime validation with type inference | This repo's hand-rolled `validateConfig()` is reinventing a narrow slice of what a schema library gives for free; adopting one is a reasonable future architectural candidate (would need an ADR, not built tonight) | A (the pattern is standard/well-documented), C (specific library choice not evaluated) |
| Sakana AI Scientist | Fixed-budget experiment loop, config via CLI flags, not a layered JSON schema | No analog to this repo's `DreamConfig` validation surface | B |

## Witness

```
report_sha256 : 758fa4eaa9ffed3d9e0de2765238b89a4fed974fecc7335595573c1e83299861
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : 30eb77a37322dff1a82f95bb71b18da0cfa6d519e4776731536e32ec32fd2233
```

`report_sha256` is the sha256 of this file *before* this Witness section was
filled in (the heading existed with placeholder lines; hashing the final,
stamped file would be circular — same documented convention PR #97 used).

5-step verifier anyone can reproduce: (1) check out
`2fba2550182d81b36423447221823e98e227482a`, apply this PR's diff; (2) run
`npm ci && npm run build && npm test --silent` and confirm 119/119 pass,
0 regressions vs. the pre-diff 106/106; (3) run
`git stash push -- packages/compile/src/config.ts && npx vitest run
packages/compile/src/config-type-guards.test.ts; git stash pop` and confirm
10/13 new tests fail without the fix; (4) recompute
`sha256sum` of this report file with the Witness section's two placeholder
lines blanked, and `printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" |
sha256sum`, and check it equals the `witness` value filled in below; (5)
confirm `session_commit` is reachable from `main`'s history
(`git merge-base --is-ancestor 2fba255 main`).

## Recommendation

`evaluated: accepted` (effect positive — closes a real silent-validation
gap with a concrete, independently-verified production consequence; no
regression; critic-clear; witness-valid; receipt-reproducible). For the
human:

1. Review and merge this PR. It is independent of and non-conflicting with
   every other open compiler-parity PR (#14, #51, #57, #87, #97) — none
   touch `validateConfig()`'s type-guard logic.
2. Given the 55-open/0-merged backlog documented above (out of scope to fix
   tonight, but material to the recommendation): this PR and PR #97
   (`EPOCHDAY` fix) are the two smallest, highest-confidence, fully
   independent compiler-parity fixes currently open. Merging either — or
   both — would be the single highest-leverage human action available on
   this surface right now, more valuable than another night of
   `compiler-parity` research producing a 56th unmerged PR.
3. Next steps (not built tonight, kept as a separate, smaller conceptual
   change each): (a) restrict `evaluatorEntrypoints` to its 4 known keys;
   (b) range-check `adrConvention.pad` as a non-negative integer; (c)
   consider whether a schema-validation library (Zod/io-ts) is worth an ADR
   given how much of `validateConfig()` is now hand-rolled type narrowing.
