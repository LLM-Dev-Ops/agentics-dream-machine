# Compiler-Parity SOTA Report — 2026-10-25

**Rotation**: `DAYINT=20261025`, `SLOT=$(( DAYINT % 5 )) = 0` → `DEEP=compiler-parity`,
`SCAN=config-schema,golden-snapshots`. Bonus moduli: `DAYINT % 25 == 0` **and**
`DAYINT % 75 == 0` both fire tonight (20261025 is divisible by both 25 and 75)
→ `ui-management-console` and `self-hosting-review` are nominally in scope.
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.

## TL;DR

Tonight's first-draft candidate — a self-referential golden-snapshot test over
this repo's own `dream.config.json` — turned out to be an exact duplicate of
open PR #14 (2026-09-10, still unmerged 45 days later) and of the repeated
reconfirmations in PRs #23/#31/#41/#51/#57/#67/#76/#87. Caught *before*
committing by querying live GitHub state (10th compiler-parity night; the
same discipline PRs #51/#67/#76 each independently applied). Discarded, not
shipped.

The actual finding tonight is new: the compiled routine's rotation and bonus
triggers are not what they look like. `SLOT=$(( DAYINT % 5 ))` and
`DAYINT % 25 == 0` / `DAYINT % 75 == 0` all key off `DAYINT=$(date -u +%Y%m%d)`
— the literal `YYYYMMDD` integer. Because `100 ≡ 0 (mod 5)` (and mod 25, mod
75 reduces to the same day-of-month dependence for any two-digit day), **every
one of these "rotations" collapses to day-of-month arithmetic**, independent
of month or year:

- `DAYINT % 5` ≡ `(day-of-month) % 5` always. The 5-way nightly rotation is
  not a true round-robin — it repeats the previous night's slot at every
  31-day-month boundary (7–8 times/year) and skips a slot at the Feb→Mar
  boundary. **Concrete near-term instance**: 2026-10-31 and 2026-11-01 will
  both compute `SLOT=1` (`ledger-signals`) — back-to-back, no rotation that
  night.
- `DAYINT % 25 == 0` and `DAYINT % 75 == 0` only ever fire on the 25th of a
  month (every month, and every third month, respectively) — not a sparse
  "bonus," a guaranteed monthly/quarterly certainty. Tonight (2026-10-25) is
  a live instance of exactly this: both bonus lines are "on," which is why
  this report calls them out explicitly above instead of silently skipping
  them (an easy thing to overlook precisely because the compiled text frames
  them as a rare "bonus").

Candidate: `packages/compile/src/index.ts`'s `step0Context()` now computes
`EPOCHDAY=$(( $(date -u +%s) / 86400 ))` (days-since-Unix-epoch, strictly
monotonic) and keys `SLOT` and both bonus triggers off `EPOCHDAY` instead of
`DAYINT`; `DAYINT` is retained only for display/filenames. One conceptual
change, 3 files + 1 new test file, ~21 changed lines in tracked files.

## What's new / live GitHub state checked tonight

- `list_issues`/`list_pull_requests` on the real
  `LLM-Dev-Ops/agentics-dream-machine`: 42 open issues, PRs up to #95, **zero
  merged** since #9 (2026-09-08) — unchanged structural state from every
  prior night's report (#36/#46/#68/#82/#88/#90/#92 all document the same
  backlog from other slots; not re-litigated here, out of `compiler-parity`
  scope).
- Compiler-parity has now had **10 real nights** (#14, #23, #31, #41, #50/51,
  #56/57, #66/67, #76/77, #86/87, tonight). #86/87 (2026-10-20, 5 nights ago)
  fixed a real bug (`compile` stdout double-trailing-newline) — so "reconfirm
  clean, no new candidate" is not the only possible outcome for this surface,
  which is why tonight kept looking after discarding the duplicate rather
  than stopping at "clean, rotate."
- `search_issues(query: "bonusModuli bonus deep dive ui-management-console
  self-hosting-review")` on this repo: **0 results**. No prior night (across
  all 5 slots, 94 issues) appears to have examined the bonus-trigger
  semantics. This is genuinely new ground, not a rediscovery.

## Hypothesis (frozen before implementation)

> Given `dream.config.json`'s `slots` (5 entries) and `bonusModuli`
> (`{25: ui-management-console, 75: self-hosting-review}`), and the compiled
> STEP 0 formula `SLOT=$(( DAYINT % slots.length ))` / `DAYINT % mod == 0`
> where `DAYINT=$(date -u +%Y%m%d)`: enumerating the resulting slot sequence
> across a multi-year window of consecutive calendar days should show a true
> round-robin (every night advances exactly one slot, mod 5) and the bonus
> triggers should fire on a cadence roughly independent of calendar
> day-of-month. If instead the sequence repeats/skips slots at month
> boundaries and the bonus triggers are provably pinned to one day-of-month,
> switching the formula's dividend from `DAYINT` to a strictly monotonic
> `EPOCHDAY` (days since the Unix epoch) should restore both properties,
> subject to: no pre-existing test weakened/removed, the new/changed tests
> pin the actual compiled template text (not just a freestanding math claim),
> and the new tests demonstrably fail against the pre-fix code.

**Tested. Confirmed true (the day-of-month collapse), not falsified — see
Evaluation Receipt.** The fix's round-robin property is also confirmed, not
falsified.

## Candidate

`packages/compile/src/index.ts` (`step0Context`): add
`EPOCHDAY=$(( $(date -u +%s) / 86400 ))` to the generated STEP 0 bash block;
change `SLOT=$(( DAYINT % ${slots.length} ))` → `SLOT=$(( EPOCHDAY %
${slots.length} ))`; change the bonus-line template from `DAYINT % ${mod} ==
0` → `EPOCHDAY % ${mod} == 0`; add one explanatory paragraph in the compiled
prompt itself (so a future reader — human or agent — sees the "why", not just
the formula). `DAYINT`/`DATE` stay defined and used for display/filenames
(`Tonight: DATE / ...`, `/tmp/dream-gist-${DATE}.md`) — unrelated to this fix.

`packages/compile/src/index.test.ts`: 2 pre-existing assertions updated to
match the new literal template text (`'SLOT=$(( DAYINT % 5 ))'` →
`'SLOT=$(( EPOCHDAY % 5 ))'`; `'DAYINT % 25 == 0'` → `'EPOCHDAY % 25 ==
0'`) — same strings, same specificity, just pointed at the corrected
template. The committed golden snapshot was regenerated (`npx vitest run -u`)
and hand-diffed: the only delta is the `DAYINT`→`EPOCHDAY` substitution plus
the new explanatory paragraph — nothing else moved.

`packages/compile/src/rotation.test.ts` (new): two parts —

1. **Production-pinning** (added after an independent critic flagged the
   first draft as not exercising production code at all — see Reward-Hack
   Check): regex-extracts the actual rotation/bonus variable name from
   `compile()`'s real output and asserts it is `EPOCHDAY`, plus asserts the
   literal `EPOCHDAY=...` definition line is present. This fails immediately
   if `step0Context()` ever reverts to `DAYINT`.
2. **Characterization** (general math, not tied to this repo's specific
   config): reimplements the bash `dayint()`/`epochDay()` arithmetic in pure
   TS over 420 consecutive UTC days spanning 2026, and asserts (a) the old
   `dayint % 5` formula does repeat the 2026-10-31→2026-11-01 slot and does
   produce ≥1 skip somewhere in the window, (b) the new `epochDay % 5`
   formula never repeats or skips, (c) `dayint % 25` only ever hits on
   day-of-month 25, and (d) `epochDay % 25` hits more than one day-of-month.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), this repo's configured `bench`
entrypoint. `LLM_EVAL=blocked` (no `OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY`
in the environment) — by design this candidate needs zero model calls.

| | Baseline (`main@2fba255`, fresh `npm ci && npm run build`) | Candidate |
|---|---|---|
| Test files | 7 | 8 |
| Tests | 106 | 113 (+7, 0 removed/modified) |
| Result | 106 passed | 113 passed |
| Lint | clean | clean |
| Build (6 packages) | clean | clean |
| Typecheck | pre-existing unrelated failure (`tsconfig.json` empty `files` list) | identical pre-existing failure |

Diff: 3 files changed (`index.ts` +11/-2, `index.test.ts` 2 lines, snapshot
regenerated) + 1 new test file (`rotation.test.ts`, 103 lines) = one
conceptual change (rotation/bonus dividend: `DAYINT` → `EPOCHDAY`).

Direct arithmetic verification (Python, cross-checked against the bash
formula, reproduced independently by the critic below):

```
$ python3 -c "
from datetime import date, timedelta
d0=date(2026,1,1)
repeats=skips=0; prev=None
for i in range(420):
    d=d0+timedelta(days=i)
    dayint=int(d.strftime('%Y%m%d')); slot=dayint%5
    if prev is not None:
        if slot==prev: repeats+=1
        elif slot!=(prev+1)%5: skips+=1
    prev=slot
print('repeats', repeats, 'skips', skips)
"
repeats 8 skips 1
```

Live (hand-run) confirmation of the concrete named instance:
`20261031 % 5 == 1` and `20261101 % 5 == 1` — identical.

Non-tautology check on the new production-pinning tests: `git stash push --
packages/compile/src/index.ts` (keeping the new/updated test files), rerun →
3/3 production-pinning tests fail exactly as predicted (`expected 'DAYINT' to
be 'EPOCHDAY'`, and the `EPOCHDAY=...` containment check); `git stash pop` →
all 113 green again.

## Baseline

Commit `2fba2550182d81b36423447221823e98e227482a` (every open dream-cycle PR
in this repo branches from this same commit — nothing has ever merged).
106/106 tests. No code anywhere computed or tested the rotation/bonus
arithmetic beyond generating its literal text; the day-of-month collapse was
unverified by any of the 9 prior compiler-parity nights.

## Darwin Lineage

`DARWIN=not-applicable` — `npx --no-install @metaharness/darwin --version`
confirms the package is not locally installed tonight (consistent with
every prior night's finding); separately, a one-line template substitution
has no evolvable population for bounded Darwin's generations×candidates
search.

## Evidence

- OBSERVATION: `list_pull_requests`/`pull_request_read` on the live repo:
  PR #14 (2026-09-10) runs the identical self-referential-snapshot
  experiment this session's first draft independently reproduced
  (`sha256 74d99dad72...` matches exactly). Discarded before committing.
- MEASUREMENT: `DAYINT % 5 ≡ (day-of-month) % 5` for every date tested
  (Python, 420-day window spanning 2026 into 2027); 8 repeats, 1 skip.
- MEASUREMENT: `20261031 % 5 == 20261101 % 5 == 1` — the concrete,
  falsifiable, near-term (6 days out) prediction.
- MEASUREMENT: `DAYINT % 25 == 0` fires on exactly the 25th of every month,
  12/year, with zero exceptions in a 420-day scan; `DAYINT % 75 == 0` fires
  on exactly 4 of those (Jan/Apr/Jul/Oct 25) in 2026.
- MEASUREMENT: `npm test` 106→113, 0 regressions; independently reproduced
  by a separate critic subagent via a different stash point
  (`index.ts`-only revert) than this session used.
- INFERENCE: `EPOCHDAY=$(( $(date -u +%s) / 86400 ))` under bash integer
  (truncating) division is exactly days-since-epoch for any post-1970 UTC
  instant — no off-by-one, confirmed independently by the critic.
- DECISION: keep `DATE`/`DAYINT` defined for display/filename use
  (`/tmp/dream-gist-${DATE}.md` etc.) — only the rotation/bonus *dividend*
  changes, not every use of the calendar date.
- REJECTION: the duplicate self-referential golden-snapshot candidate
  (matches PR #14) — built, measured (106→108 clean), then discarded
  uncommitted once the duplicate was confirmed live on GitHub.

## Reward-Hack Check

Independent critic: a fresh general-purpose subagent, given only the diff
and the claim, instructed to re-derive everything itself. Findings:

**Verdict: CLEAR of reward-hacking. Fix confirmed correct.** The critic
independently re-derived the day-of-month collapse by hand, independently
confirmed `EPOCHDAY` has no off-by-one, independently reran `npm test`
(110/110 — the count *before* the production-pinning tests described below
were added in response to its own finding), and independently reverted only
`index.ts` to confirm the two `index.test.ts` string assertions and the
snapshot test fail without the fix.

**One real, non-blocking finding, fixed before this report was finalized**:
the critic flagged that the first-draft `rotation.test.ts` imported nothing
from `./index.js` — it reimplemented the bash arithmetic as freestanding
helper functions and asserted general math facts, so it passed identically
whether `index.ts` had the bug or the fix (tautological *with respect to the
shipped change*, though not with respect to the underlying arithmetic
claim). **Addressed**: added the three "production template" tests above
that regex-extract the rotation/bonus variable name directly from
`compile()`'s real output; re-verified non-tautological via the stash
procedure in the Evaluation Receipt (3/3 fail pre-fix, pass post-fix). No
pre-existing assertion was weakened, removed, or modified — only pointed at
corrected literal text. No evaluation gate, benchmark corpus, threshold, or
security boundary touched.

## Security Review

No new runtime attack surface: pure string-template generation in an
already-existing function, no new `exec`/network/credential/filesystem
surface. The new test file does only synchronous in-memory date arithmetic
and one call to the existing, already-tested `compile()` function with a
fixed, locally-defined fixture (no user input, no path traversal). `git diff
--stat` touches no `.github/` file, no lockfile, no evaluation/gate/safety
file. Prompt-injection / credential-exposure / cross-agent-poisoning: N/A —
no LLM calls in this candidate, no externally-sourced data consumed.

## Regression Analysis

0 pre-existing tests removed or weakened. 2 pre-existing assertions in
`index.test.ts` updated to track corrected literal output (not loosened —
same specificity, same string-containment check, different literal). 1
golden snapshot regenerated and hand-diffed (only the intended substitution
plus one new paragraph). 1 new test file, fully additive, verified
non-tautological against the actual shipped diff.

## ADR

None. This is a formula/parameter fix within the already-decided STEP 0
rotation design (ADR-0001) — not a new architectural decision. No consumer's
default behavior changes in kind, only in which calendar dates the existing
behavior lands on. Consistent with precedent (PRs #14, #37, #51, #57, #87:
"additive/parameter fix, not an architectural decision").

## Gist

No `gh gist create`-equivalent available to this session (`gh auth status`:
`GH_TOKEN` invalid — same constraint as every prior night since 2026-09-10).
Committed here instead. `GIST=LOCAL`.

## Issue

Filed tonight (see PR body for the live issue number — this report is
written before the issue is opened, consistent with freezing the hypothesis
before publication machinery).

## Scan Findings

**config-schema** — `validateConfig()` (`packages/compile/src/config.ts`)
accepts a live config with type-malformed fields silently: `autoMerge:
"true"` (string, not boolean), `labels: "dream-cycle"` (string, not array),
`evaluatorEntrypoints: "npm test"` (string, not object), and `branchPrefix:
123` (number, not string) each validate with `ok: true, errors: 0,
warnings: 0` tonight (reproduced live against this repo's real
`dream.config.json`, type-mutated in memory, never written to disk). Not
fixed tonight — would be a second conceptual change, logged as next step 2
below. Not a duplicate: neither PR #51 (adds an external JSON Schema mirror,
doesn't add type guards to `validateConfig()` itself) nor any other open PR
title/body matches this specific gap (checked via `search_issues`).

**golden-snapshots** — the existing `metaharness` fixture snapshot
(`packages/compile/src/__snapshots__/index.test.ts.snap`) now correctly
reflects `EPOCHDAY`; no other golden-snapshot drift found tonight. The
self-referential snapshot over this repo's *own* `dream.config.json` (what
tonight's discarded first draft rebuilt) remains PR #14's unmerged
contribution — not duplicated here a second time.

## Competitors (informative; this finding is a date-arithmetic/implementation
detail, not a capability claim — graded B/C, no A-grade source applies
directly)

| Project | Scheduling / cadence mechanism | Relevant to tonight's finding | Grade |
|---|---|---|---|
| OpenHands | Session-triggered or cron-triggered; no documented rotating "surface" concept | No analog to a day-of-month-collapsing modulus bug found | B |
| SWE-agent | Single-task invocation, no nightly rotation | N/A | B |
| DSPy/GEPA | Optimizer loop runs per invocation, not calendar-scheduled | N/A | B |
| Sakana AI Scientist | Fixed-budget experiment loop, not calendar-scheduled; arXiv 2408.06292 documents sandboxing gaps (runaway process spawning, unbounded checkpoint writes) as its main reliability lesson, not scheduling | Different failure class (resource exhaustion, not calendar aliasing) — A-grade source, not directly transferable | A (source), C (relevance) |
| Prompt-regression-testing vendors (agentsnap, EvalView) | Replay recorded LLM/tool-call traces on every PR vs. periodic live runs | Analogous "golden trace vs. live drift" pattern to this repo's own golden-snapshot discipline (PR #14/#51/#57), not to the rotation-formula bug specifically; vendor-sourced claims (incl. one unverifiable "80% bug catch rate") — treat as C-grade | C |

No A-grade prior art changes tonight's recommendation; the rotation-formula
bug is a repo-internal implementation detail (how `DAYINT` is defined and
consumed), not a capability gap relative to any competitor.

## Witness

```
report_sha256 : bd9f7cd1d67739004cb0370b6d8360764addb0c19929afbbb75d797dfe285365
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : 648589d8235f38ed46ac2062e9ea79de15d45131405a608b304108ff291eb01a
```

`report_sha256` is the sha256 of this file *before* this Witness section was
filled in (the heading existed as a placeholder; hashing the final,
stamped file would be circular — same documented convention as every prior
compiler-parity report). 5-step verifier: (1) re-run this report's
Evaluation Receipt commands against `session_commit`
`2fba2550182d81b36423447221823e98e227482a`; (2) confirm the diff/test
outputs shown above match byte-for-byte/line-for-line; (3) confirm the
GitHub API findings shown above (PR #14's existence/content, the 0-result
`search_issues` query) return the same results — issue/PR numbers and
history are immutable; (4) recompute
`printf '%s%s' bd9f7cd1d67739004cb0370b6d8360764addb0c19929afbbb75d797dfe285365 2fba2550182d81b36423447221823e98e227482a | sha256sum`
and check it equals
`648589d8235f38ed46ac2062e9ea79de15d45131405a608b304108ff291eb01a`; (5)
confirm `session_commit` is reachable from `main`'s history
(`git merge-base --is-ancestor 2fba255 main`).

## Recommendation

`evaluated: accepted` for the arithmetic finding and the fix (effect
positive, no regression, critic-clear, witness-valid, receipt-reproducible).
For the human:

1. Review and merge this PR (or PR #14, whichever a human reaches first —
   they are independent and non-conflicting; this PR does not touch
   anything PR #14 touches).
2. Next step: add type-correctness checks to `validateConfig()` for
   `autoMerge` (boolean), `labels`/`competitors` (string arrays),
   `evaluatorEntrypoints` (object), `branchPrefix`/`ledgerPath` (string) —
   the `config-schema` scan finding above. Distinct, separately reviewable;
   not built tonight to keep this candidate to one conceptual change.
3. Separately (not this session's call): decide whether `bonusModuli`'s
   intended semantics were "fire roughly every Nth night" (in which case
   tonight's `EPOCHDAY` fix is exactly right) or "fire on a specific
   recurring calendar date" (in which case the *correct* fix is to document
   the day-of-month behavior as intentional rather than change it) — this
   report found and fixed the mechanical ambiguity but cannot adjudicate
   original intent.

The 29-PR-and-growing unmerged backlog, the CodeQL/automerge-gate history,
and the ledger-staleness pattern are already extensively documented by other
nights' reports (#15/#29/#30/#36/#42/#46/#67/#68/#77/#82/#88/#90/#92) and are
out of `compiler-parity` scope tonight.
