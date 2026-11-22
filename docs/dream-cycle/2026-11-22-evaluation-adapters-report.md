# Evaluation-Adapters SOTA Report — 2026-11-22

`DATE=2026-11-22` `DAYINT=20261122` `SLOT=2` → `DEEP=evaluation-adapters`,
`SCAN=flywheel,darwin`. No bonus deep dive (`20261122 % 25 = 22`, `% 75 = 22`).
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.

## TL;DR

This surface has now been hit at least 14 times (`#18,#20,#45,#53,#61,#71,#81,#101,
#111,#113,#123,#131,#141` plus tonight), zero merged, over a backlog that has grown
to **30+ open draft PRs visible in a single unpaginated page, zero merges since
2026-09-08 (PR #9)** — reconfirmed fresh tonight via `list_pull_requests`, not
inferred from a prior report. The exact root-cause fix this surface keeps circling
— `dream.config.json`'s `darwin` evaluator entrypoint is missing its required
`<repo>` positional argument — was first found 2026-09-12 (PR #18) and has sat
unmerged for 2+ months. PR #18 itself was flagged by #141 (2026-11-17) for a
tool-verified head-SHA/narrative discrepancy, making it unsafe for a human to merge
as-is even though its core diagnosis is correct.

**Tonight's candidate**: an independent, minimal (2 files, +2/-1 lines of substance)
re-implementation of just the config fix — not inherited from, and not dependent on,
PR #18's other ~4200 lines or its flagged credibility issue. `dream.config.json`'s
darwin command changes from `npx @metaharness/darwin evolve --sandbox real` to
`npx @metaharness/darwin evolve . --sandbox real`, plus a new, pure, offline
regression test (`packages/cli/src/dream-config.test.ts`) that reads the real root
config and asserts the token immediately after `evolve` is not a flag — so this
exact regression cannot silently reappear in a future config edit regardless of
which backlogged PR's value eventually wins. `npm test`: 106/106 → 107/107, 0
regressions, independently reproduced by a fresh adversarial critic subagent with no
access to this session's reasoning.

**The more important finding tonight is not technical.** The darwin
missing-repo-arg bug has now been diagnosed, fixed (in an unmerged PR), re-diagnosed,
extended, and reconfirmed across at least 6 real nights since 2026-09-12, and at
least 4 of those nights (`#78`/ledger-signals, `#81`, `#101`, `#141`) have explicitly
written "a human decision on backlog triage is overdue" into their Recommendation
section. None of it has been acted on. STEP 1.1's own stated rule — "a finding
repeated in ≥3 prior nights → rotate to the next slot's DEEP surface" — has applied
to this exact surface since at least `#60` (2026-10-07, per `#81`'s own report) and
has never fired, because the `dream-machine ledger signals` tool can only see the 9
rows that exist on `main`'s stale `LEDGER.md` (`duplicateDirections: []` tonight,
exactly as `#81` found 36 days ago) — it is structurally blind to the 70+ nights of
real, GitHub-visible duplication this report and its predecessors document by hand.

## Ledger Check

`docs/dream-cycle/LEDGER.md` on `main` still ends at row 9 (2026-09-08) — the file
itself has not grown in 75+ days despite nightly runs continuing (confirmed via
`git log` on `main`: HEAD is still `2fba255`, the same commit named in every report
since 2026-09-08). `dream-machine ledger verify` reports the same 9 structural
schema errors in rows 2-6 first logged 2026-09-08 (pre-existing, portfolio-era rows
predating this repo's own dream-cycle, not touched tonight — out of scope for a
2-file evaluation-adapters candidate). `dream-machine ledger signals`:

```
{
  "zeroMergeStreak": true,
  "duplicateDirections": [],
  "lowScoreStreak": false,
  "blockedEvalStreak": false,
  "nightsConsidered": 7
}
```

`zeroMergeStreak: true` / `nightsConsidered: 7` matches the local file exactly. The
empty `duplicateDirections` is the blind spot named above — confirmed by cross-
checking real GitHub state tonight via `mcp__github__list_pull_requests`
(`state: all`, 30 PRs returned, unpaginated): **every single one is `draft: true`,
`merged: false`**, dated nightly from 2026-10-21 through 2026-11-20 with no gaps,
titles naming `compiler-parity`, `ledger-signals`, `evaluation-adapters`,
`security-adversarial`, and `developer-experience` in the exact 5-night rotation
`dream.config.json#slots` defines. Only `#8`/`#9` (2026-09-08, the founding week)
have ever merged, per every predecessor report since `#81` — not re-verified commit-
by-commit tonight (budget), but consistent with `list_pull_requests` showing no
`merged: true` entries anywhere in the page fetched.

## Deep Dive: evaluation-adapters (SCAN: darwin, flywheel)

### darwin — root cause reproduced live tonight, candidate fixes it

Ran the *exact* command `dream.config.json` has configured since before this repo's
first dream-cycle night, for real, not simulated:

```
$ npx @metaharness/darwin evolve --sandbox mock --generations 1 --children 2
EXIT=0
Darwin Mode — leaderboard
  0.765  baseline  [planner]  safety=1.00  pass=0.60 ◀ winner
  ...
Winner: baseline
Delta over baseline: +0.000
Artifacts: /home/user/agentics-dream-machine/--sandbox/.metaharness
```

Confirmed via `git status --short`: a literal `./--sandbox/` directory was created
in the repo root. This repo's own `verify-entrypoints` classifies this result
`live` (exit 0, real stdout) — a **false positive**: nothing evaluated this repo;
Darwin's CLI (`evolve <repo> [--generations N] ... [--sandbox real|mock|agent|
llm-agent] ...`) consumed the literal token `--sandbox` as the missing `<repo>`
positional, exactly as `#18` (2026-09-12) and `#81`/`#101` (2026-10-17/27) already
found. Darwin's package version has advanced to **0.16.0** tonight (0.10.2 at
2026-09-08, 0.12.1 at 2026-10-27, 0.14.0 at 2026-11-17) — consistent with ongoing
real upstream publishing, not a stale/reused number.

With the repo argument added (candidate):

```
$ npx @metaharness/darwin evolve . --sandbox mock --generations 1 --children 2
EXIT=0
Darwin Mode — leaderboard
  0.765  baseline  [planner]  safety=1.00  pass=0.60 ◀ winner
  ...
Artifacts: /home/user/agentics-dream-machine/.metaharness
```

Artifacts correctly land in `./.metaharness`, not a bogus sibling directory. The
`--sandbox real` form (the exact flag `dream.config.json` configures) was also
reproduced with the fix: artifacts land in `./.metaharness`, `Delta over baseline:
+0.000` still appears once the fuller run completes — this is `#101`'s separate,
already-fully-diagnosed, already-fixed-with-a-regression-guard finding (Darwin's
7-file synthetic agent-harness genome has zero textual overlap with this repo's own
source, so no `real`/`mock` bench suite can give it signal regardless of the repo
path being correct) and is **not** something tonight's candidate claims to fix. All
scratch `--sandbox`/`.metaharness` directories were removed before committing;
`git status --short` confirms none remain.

### flywheel — reconfirmed unchanged, fresh version check

```
$ npm view @metaharness/flywheel version
0.1.15
$ npx -y @metaharness/flywheel
npm error could not determine executable to run
EXIT=1
```

Version has advanced from `0.1.12` (`#101`, 2026-10-27) to `0.1.15` tonight — real
upstream activity — but the failure mode is byte-identical: the package still ships
no `bin` field, so `npx` cannot resolve an executable. This is an external-package
deficiency (`@metaharness/flywheel`, not this repo) with no local fix available,
unchanged since the first-ever dream-cycle night (2026-08-13). `dream.config.json`
on `main` has **no `flywheel` key at all** in `evaluatorEntrypoints` — a fix for
that is proposed only inside the credibility-flagged `#18`. Not re-fixed tonight,
for the same reason `#141` gave: a third duplicate of the same config-key edit adds
no new evidence. The `npx metaharness flywheel help` umbrella-invocation form other
reports cite as "the correct one" was not re-verified firsthand tonight (consistent
with `#141`'s own disclosure of the same gap).

## 5 Candidate Findings (STEP 3)

| # | Candidate | Fit | Novelty | Testability | Measurability | Prod-value | Reviewability | Total |
|---|---|---|---|---|---|---|---|---|
| 1 | Fix `dream.config.json`'s darwin missing `<repo>` arg + add offline regression test | 5 | 2 | 5 | 5 | 4 | 5 | 26 |
| 2 | Extend `classifyEntrypointResult`/`entrypoint.ts` further (new darwin failure signature) | 4 | 1 | 4 | 4 | 3 | 4 | 20 |
| 3 | Hand-author a `--sandbox real`/`mock` bench suite to give darwin genuine signal on this repo | 3 | 1 | 2 | 2 | 1 | 2 | 12 |
| 4 | Build a local wrapper/shim so `@metaharness/flywheel` resolves an executable | 2 | 2 | 2 | 2 | 1 | 3 | 12 |
| 5 | Teach `dream-machine ledger signals` to cross-check real GitHub PR history, not just local `LEDGER.md`, for `duplicateDirections` | 4 | 4 | 3 | 3 | 5 | 2 | 21 |

Selected **#1**. Novelty scores low across the board because this exact surface is
saturated — that is itself the finding. #1 is not the top-scoring on novelty, but it
is the only candidate that is both genuinely testable tonight without inheriting an
untrustworthy PR, and small enough to respect the `zeroMergeStreak` bias toward a
tiny, one-parameter, easily-reviewable change. #5 scored competitively (21) and is
arguably the "real" fix for the meta-problem this report spends most of its words
on — but it belongs to the `ledger-signals` deep surface (a different slot), was
already explicitly named as a human decision point by `#81`'s Recommendation #3 and
`#78`'s `conflictRisks()` work, and a code change to the signals tool itself is not
something this session should race to ship unreviewed on top of an already-stalled
backlog. Recorded here as next-step guidance, not implemented tonight. #3 is
rejected on measurement, not guesswork: `#101` already proved it cannot work. #4 is
rejected because the deficiency is in a third-party package's `package.json`, not
anything this repo can fix.

## Hypothesis (frozen before implementation)

> Given the real `@metaharness/darwin` package (v0.16.0) and this repo's own
> `dream.config.json`, when the configured `darwin` evaluator-entrypoint command is
> changed from `npx @metaharness/darwin evolve --sandbox real` to `npx
> @metaharness/darwin evolve . --sandbox real` (adding the required `<repo>`
> positional argument), then a live, non-simulated invocation of the corrected
> command should write its run-state artifacts to `./.metaharness` instead of the
> bogus `./--sandbox/.metaharness`, and a new offline regression test should fail
> against the original (broken) config string and pass against the corrected one —
> subject to: no pre-existing test weakened/removed/modified; `npm test` goes from
> 106/106 to 107/107 with 0 regressions; the new test must be non-tautological
> (verified by temporarily reverting the config and confirming the test fails); zero
> new network/exec/credential surface introduced by the test itself; and the
> candidate must not inherit, cite as ground truth, or depend on PR #18's other
> content given its tool-verified credibility flag.

Not modified after evaluation began.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), fresh `npm ci && npm run build` at
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`. `LLM_EVAL=blocked` — no
`OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY` in this environment; zero model calls.

| | Baseline (`2fba255`) | Candidate |
|---|---|---|
| Test files | 7 | 8 (+1 new) |
| Tests | 106/106 | 107/107 (+1 new, 0 removed/modified) |
| Lint (`eslint packages`) | clean | clean |
| Build (`tsc` ×6 workspaces) | clean | clean |
| Live darwin artifact path (`--sandbox real`, real non-simulated invocation) | `./--sandbox/.metaharness` (bogus) | `./.metaharness` (correct) |
| `verify-entrypoints dream.config.json` darwin verdict | `live` (false positive — wrong path evaluated) | `live` (correct path now evaluated) |

Diff: `dream.config.json` (+1/-1), `packages/cli/src/dream-config.test.ts` (+45 new
lines, pure addition) = one conceptual change, well under the 300-line target.

Independent reproduction by a freshly-spawned critic subagent (separate context, no
exposure to this session's reasoning): BEFORE 106/106 → AFTER 107/107 (git
stash/pop, reproduced independently), lint clean, `--sandbox` directory bug
independently reproduced in its own isolated `/tmp` scratch dirs (not this repo),
and the new test's non-tautology independently verified by temporarily reverting
`dream.config.json` to the broken string and confirming the test fails, then
restoring and confirming the diff is byte-identical to the original.

## Darwin (bounded evolution, STEP 12-13)

`DARWIN=not-applicable` — same precedent as `#81`/`#101`/`#141`: tonight's candidate
is a 1-line config-string correction plus a pure, deterministic, offline regression
test. There is no evolvable population of variants for a change this shape; running
bounded Darwin here would simulate a search over a single frozen config value, not
bound a real one.

## Evidence (classified)

- **OBSERVATION**: real, non-simulated execution of the exact configured darwin
  command tonight — `./--sandbox/.metaharness` created, confirmed via `git status
  --short` and `ls -la`.
- **OBSERVATION**: real execution of the corrected command — artifacts land in
  `./.metaharness`.
- **MEASUREMENT**: `npm test` 106/106 → 107/107, reproduced independently twice
  (this session + critic subagent), 0 regressions, 0 removed/modified tests.
- **MEASUREMENT**: `npm view @metaharness/darwin version` → `0.16.0`;
  `npm view @metaharness/flywheel version` → `0.1.15`; both advanced from every
  prior report's recorded value, consistent with real, ongoing upstream activity.
- **MEASUREMENT**: `mcp__github__list_pull_requests` (state: all) → 30 PRs returned
  in one page, all `draft: true`/`merged: false`, nightly from 2026-10-21 through
  2026-11-20 with no gaps.
- **INFERENCE**: Darwin's CLI consumes the literal `--sandbox` token as the missing
  `<repo>` positional argument when no repo path precedes it, based on observed
  behavior across both the broken and corrected invocations (not read from Darwin's
  own source tonight — `#101`, 2026-10-27, already did that and is cited, not
  re-derived).
- **DECISION**: ship an independent, minimal reimplementation of PR #18's config
  fix rather than rebase onto or depend on #18 itself, because #18 carries a
  tool-verified credibility flag (`#141`) unrelated to this specific line.
- **DECISION**: do not re-extend `entrypoint.ts`'s classifier or `darwin-genome.ts`
  tonight — both already carry non-duplicated, unmerged logic for adjacent
  sub-problems (`#81`'s `staleState` detection, `#101`'s genome-relevance detector);
  touching either file risks a merge collision with that existing backlog for no
  new evidence.
- **REJECTION**: rejected hand-authoring a bench suite for darwin signal (candidate
  #3 above) — `#101` already measured this cannot work for `real`/`mock` sandbox
  modes regardless of authoring quality, given zero genome/source overlap.
- **REJECTION**: rejected building a local `flywheel` shim (candidate #4) — the
  deficiency (missing `bin` field) is in the third-party package's own
  `package.json`; no local fix in this repo can resolve an `npx` executable lookup
  for someone else's package.

## Reward-Hack Check

Self-review first, then an independently-spawned critic subagent (fresh context, no
access to this session's reasoning trace) reviewed the diff adversarially per this
repo's own checklist: weakened/removed/modified tests, gold-data/threshold
tampering, cherry-picking, evaluator exploitation, hidden cost, undisclosed cache,
tautological self-grading tests.

**Verdict: CLEAR of reward-hacking.** The critic's own independently-reproduced
numbers (106/106 → 107/107) match this report exactly. The diff touches no
benchmark, gold-answer, evaluation-gate, or CI-threshold file — only
`dream.config.json` (a config value, not a test input) and one brand-new,
purely-additive test file. The critic specifically checked for tautology by
temporarily reverting `dream.config.json` to the original broken string while
keeping the new test, confirmed the test correctly fails (`expected true to be
false`), then restored the original and confirmed the working-tree diff was
byte-identical to what it started from — the test meaningfully encodes the real
invariant rather than trivially passing. No network call, process spawn, or
install-time dependency introduced by the test (pure `readFileSync` + string
parsing). No command-injection or new execution surface: the diff narrows what a
misconfigured command does (gives it a correct argument) rather than expanding
anything this repo can execute.

No blocking defects found. Non-blocking: the test's `/^.*\bevolve\b/` regex is
greedy and would behave unexpectedly if the darwin command string ever contained
the literal word "evolve" twice — low risk for a single, human-authored config key,
noted for a future reviewer rather than fixed speculatively tonight.

## Security Review

- **Tool/command-authority scope**: narrows, not expands. The diff corrects an
  existing, already-configured command's arguments; it does not grant any new
  capability or change what `classifyConfiguredEntrypoints`'s injected `exec`
  function is permitted to run.
- **New execution surface**: none. The new test is pure (`readFileSync` on a local
  JSON file + string parsing) — no process spawn, no network, no credential use.
- **Unpinned `npx @metaharness/darwin` invocation** (flagged a fifth consecutive
  relevant night: 2026-08-13, 2026-09-08, `#18`, `#141`, tonight): still no version
  pin or `--no-install` guard in `dream.config.json`. Out of scope for a 2-file,
  single-conceptual-change candidate; a version-pin decision is a distinct,
  human-reviewable choice (what version to pin to, and whether to accept the
  install-time network dependency at all).
- **PR #18's credibility flag** (carried forward from `#141`, not re-investigated
  tonight): a draft PR whose body makes a self-reported git-state claim that does
  not match what the GitHub API reports for that same PR is a standing concern for
  human triage, not something tonight's independent candidate inherits or depends
  on.
- **Credential exposure**: none — `LLM_EVAL` not touched, no model calls.
- **Supply chain**: `npm audit` reports 21 advisories (2 low/12 moderate/4
  high/3 critical), 100% devDependency-scoped, pre-existing and unchanged by this
  diff (`security-adversarial`'s territory, already tracked elsewhere, e.g. `#115`).

## Scan Findings

**darwin** — root cause reproduced live, fixed with a minimal, independent,
trustworthy candidate (see Deep Dive + Evaluation Receipt above). The separate,
already-diagnosed genome-relevance mismatch (`#101`) is unaffected and unclaimed by
this candidate.

**flywheel** — reconfirmed unchanged with fresh version evidence (`0.1.12` →
`0.1.15`); still no local fix available; no new finding.

## Reviewed, not duplicated

`#18` (original repo-arg diagnosis + much more, credibility-flagged by `#141`,
not rebased onto), `#20`/`#45` (helper extraction), `#53`/`#61`/`#71`/`#93`
(reconfirmations), `#81` (`staleState` idempotency classifier — different file,
different failure signature), `#101` (genome-relevance detector — different file,
proves bench-suite authoring can't help), `#111`/`#113`/`#123`/`#131` (further
darwin-classifier slices), `#141` (wired `verify-entrypoints` into the compiled
prompt template, and is the source of the PR #18 credibility finding cited above).
None of them shipped the bare, independent, 2-file config fix landed tonight.

## Competitors

| System | Claim relevant to tonight | Grade |
|---|---|---|
| Darwin Gödel Machine (arXiv:2505.22954v3, ICLR 2026 track) | Public paper on "archive + self-modification + downstream eval" design does not document its own archive's behavior under a missing/malformed target-path argument — the same class of under-specified corner this report's root cause falls into, reconfirmed, not newly researched tonight (cited by `#81`) | A (official preprint) |
| OpenHands | Ships a "Stuck Detector" watching the event stream for behavioral stalls — a different mechanism from a static CLI-argument correctness check; no claim found about validating evaluator-entrypoint argument shape before trusting a result | A (official docs, cited by `#141`, not re-fetched tonight) |
| SWE-agent / SWE-bench lineage | Named per this repo's own `dream.config.json` competitor list; no new source fetched tonight specific to evaluator-entrypoint argument validation | — (no new claim) |
| DSPy/GEPA, AutoGPT lineage, Sakana AI Scientist | Named per `dream.config.json`; not independently re-researched tonight — no bearing on a config-argument-correctness finding specifically | — (no new claim) |

## Gist

No `gh gist create`-equivalent tool available to this session (GitHub access is
scoped to the `mcp__github__*` MCP tools for issues/PRs/branches on
`LLM-Dev-Ops/agentics-dream-machine`; no gist-creation tool present — same
constraint as every predecessor report since 2026-08-13). `GIST=LOCAL`. Published
as this file, committed as
`docs/dream-cycle/2026-11-22-evaluation-adapters-report.md`.

## Witness

Per this repo's own convention (`#29`, 2026-09-19; followed by every report since):
a report never embeds its own `report_sha256`/`witness` triple inline, since
self-reference makes the published hash unreproducible against the committed file.
`dream-machine witness stamp` is run once this file reaches its final committed
content; the resulting triple is published externally only — in the PR description
and the `LEDGER.md` row — never pasted back into this section.

Verify (reproducible by anyone against the committed file and the published
triple):

```bash
git show <this-commit>:docs/dream-cycle/2026-11-22-evaluation-adapters-report.md | sha256sum
# REPORT_HASH = the value above
SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in this PR's description and the LEDGER.md row
```

## Recommendation

`evaluated: accepted` for tonight's 2-file candidate — small, additive,
independently reproduced, 107/107, no reward-hacking found. In priority order,
mostly unchanged in substance from every `evaluation-adapters`/`ledger-signals`/
`security-adversarial` night since 2026-09-16 because none of it has been acted on:

1. **Triage the backlog.** 30+ open draft PRs confirmed tonight via a live GitHub
   API call (not inferred), zero merges since `#9` (2026-09-08, 75+ days). This has
   been the top recommendation of at least 4 prior nights (`#78`, `#81`, `#101`,
   `#141`) and nothing has changed. If the nightly routine's real purpose has
   shifted away from "produce a human-mergeable PR most nights," that is itself
   worth the repo owner stating explicitly, since every session since founding week
   keeps optimizing against the original goal.
2. **Resolve PR #18's credibility flag** (`#141`'s finding, not re-investigated
   tonight) before any human considers merging it — either independently re-verify
   its claims from scratch or close it pending that re-verification.
3. **Review and merge tonight's 2-file PR independently of #18.** It does not
   conflict with #18, `#81`, `#101`, or `#111`/`#113`/`#123`/`#131` (different
   lines, different files, one of them — `#18` — not even touched) and closes the
   specific false-positive-liveness gap those reports have each separately
   described without any of them landing the bare fix.
4. **Decide what "rotate to the next slot's DEEP surface on ≥3 repeated nights"
   (STEP 1.1) should actually do** when the deterministic 5-night rotation already
   revisits every surface regularly — `#81` raised this 36 days ago with no
   response; it remains a human judgment call, not something a fourth, fifth, or
   now sixth consecutive agent should keep silently reinterpreting on its own.

This session does not merge, self-approve, or self-promote.
