# Dream Cycle 2026-10-26 — ledger-signals SOTA report

`DATE=2026-10-26` `DAYINT=20261026` `SLOT=1` → `DEEP=ledger-signals`,
`SCAN=witness,verify`. No bonus deep dive (`20261026 % 25 = 1`,
`20261026 % 75 = 1`, neither `0`). `SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.

## TL;DR

This repo's `learningSignals()` (`packages/ledger/src/index.ts`) already has a
`duplicateDirections` signal meant to catch a finding repeated ≥3 nights and
rotate away from it (STEP 1.1). It normalizes each row's `finding` text to its
first 6 words and looks for a 3× repeat. Tonight, reading this repo's real
GitHub history (not simulated), I confirmed that signal has a blind spot: this
repo's own `ledger-signals`-tagged nights (issues/PRs #15/16, #32/33, #42/43 —
then a real self-rotation away from this surface on 2026-10-01, #52/53 — then
#58/59, #68/69, #78/79, #88/89, 7 nights total) each phrase their finding
differently enough that **no 6-word prefix ever repeats 3×**, so
`duplicateDirections` returns `[]` for that entire real sequence. A `deep`-
column-based streak would have caught it immediately. Candidate: a small,
additive `surfaceStreak` signal — `{ deep, count } | null` — that counts the
trailing run of same-`deep` rows directly, independent of wording.
`npm test` 106→111 (+5, 0 removed/modified), 0 regressions, no pre-existing
behavior changed.

**Explicit limitation, stated up front, not buried**: `surfaceStreak` closes a
precise gap in `duplicateDirections`'s text-matching — it does **not** close
the separate, larger, already-diagnosed gap (issues #42, #78) that
`learningSignals()` only ever sees the rows physically appended to
`LEDGER.md` on `main`, and `main`'s ledger has gained exactly one new row
since 2026-09-08 (row 9) because **zero candidate PRs have merged since
PR #9**. Tonight's candidate is fed the same stale 9-row input as every other
STEP 1.1 signal; it is tested against real historical data constructed by
hand from GitHub tonight, not against what `learningSignals()` is actually
called with in this repo's current operating condition. That larger gap needs
live GitHub reads wired into signal computation (as #78/#79's
`conflictRisks()` and #88/#89's merge-readiness CLI already do by a different
path) — not a `learningSignals()` change. Said plainly: this is a correct,
tested, narrow fix to one function's blind spot, not a fix for why nothing in
this repo merges.

## Ledger Check (STEP 1)

`docs/dream-cycle/LEDGER.md` on `main`: 9 rows, ending 2026-09-08 (row 9,
`security-adversarial`, PR #8). Rows 2–6 are pre-existing contamination from a
different repository context (confirmed again tonight via `ledger verify`,
see Scan Findings — unchanged, still 9 structural errors, still unfixed,
still unmerged as PR #33).

Real GitHub state checked fresh tonight via `list_issues`/`list_pull_requests`/
`pull_request_read` (not inferred, not assumed from a prior report):

- **43 open issues** (#10–#96, one per night since 2026-09-09, plus issue
  #10 itself), **45 open draft `dream/*` PRs** (#12–#97, all `draft: true`
  confirmed individually), **0 merges since PR #9** (2026-09-08, merged by
  the human repo owner). `pull_request_read` on #9 confirms `merged: true`,
  `draft: false` — the list endpoint's `merged` field is unreliable for
  closed PRs (reports `false` on #8/#9 at the list level; `pull_request_read`
  per-PR is ground truth, consistent with PR #81's prior finding).
- Every `ledger-signals`-deep night's PR sampled tonight (#16, #33, #43, #59,
  #69, #79, #89) is still `open`/`draft: true`/`merged: false`.
- PR #89 (2026-10-21, this surface's most recent night) already measured
  36/40 open PRs as merge-tree-clean and protected-path-unprotected, and its
  own body already states explicitly: *"the never-applied `automerge-safe`
  label; no PR ever marked ready-for-review by a human"* is the actual
  remaining blocker — a human action, not a code gap. Not re-litigated
  tonight; re-confirmed, not duplicated.
- Issue #10 (CodeQL/GHAS repo-setting gap, admin-only) was reported fixed by
  issue #90 (2026-10-22, "flipped red→green at run #90") — not independently
  re-verified tonight (out of scope for a ledger-signals night; flagged for a
  future security-adversarial night to confirm against a live run, not
  assumed true here).

**Learning signals applied (STEP 1.1):** `zeroMergeStreak` — true,
trivially, given any PR number in the window. `duplicateDirections` on the 9
rows in main's stale ledger — empty (too few real rows to matter yet).
**The real finding-rotation signal** comes from hand-reading GitHub, not from
running `learningSignals()` against `main`'s ledger: this repo's
`ledger-signals` surface has now appeared in GitHub-tracked nights 7 times,
split 3 (then a self-rotation on 2026-10-01) + 4 more since. That 3-then-
rotate precedent is itself evidence the rule works when the signal has real
data — which is exactly why tonight's candidate targets making the signal
work on whatever data it is given, as a step toward it eventually being fed
the right data.

## Load Accumulated Evidence (STEP 2)

Reviewed: `docs/dream-cycle/LEDGER.md`, `docs/adrs/INDEX.md` + ADR-0001/0002,
the two prior reports in `docs/dream-cycle/` (2026-08-13, 2026-09-08), and —
since none of the 2026-09-09-onward nights' reports or ADRs ever reached
`main` — the real PR bodies/diffs for #81, #89 (read via GitHub tonight) to
avoid re-shipping `classifyEntrypointResult`'s `staleState` field (#81) or
`protectedPathBlocked()`/merge-readiness audit (#89) a second time. Confirmed
no existing PR already adds a `deep`-based streak signal to `learningSignals()`
(searched #12, #16, #22/#33, #42/#43, #58/#59, #68/#69, #78/#79, #88/#89 by
reading their diffs/bodies) — this is not a rediscovered direction.

## Hypothesis (frozen before implementation)

> Given this module's existing `duplicateDirections` signal (first-6-word-
> normalized `finding` match, threshold ≥3) and the real `finding` text of
> every `ledger-signals`-tagged dream-cycle night on
> `LLM-Dev-Ops/agentics-dream-machine` (issues/PRs #15/16, #32/33, #42/43,
> #58/59, #68/69, #78/79, #88/89 — 7 real nights, read from GitHub tonight,
> 2026-10-26), when that real sequence is fed through `learningSignals()`,
> `duplicateDirections` will report `[]` (as it does today, unmodified) while
> a new, additive `surfaceStreak` signal — counting the trailing run of rows
> sharing the same `deep` value, independent of wording — will correctly
> report `{ deep: 'ledger-signals', count: 7 }` — subject to: no pre-existing
> test weakened, removed, or modified; `LearningSignals`/`SignalOptions` stay
> backward-compatible (additive fields only); `npm test` stays green with
> only additive new tests; the new function stays pure (no I/O, no clock, no
> randomness). Not modified after evaluation began.

## Candidate

`packages/ledger/src/index.ts`: `surfaceStreak: { deep: string; count: number }
| null` added to `LearningSignals`; `surfaceStreakThreshold?: number` added to
`SignalOptions` (default `3`, matching `duplicateDirections`'s own threshold);
new pure `trailingSurfaceStreak(rows, threshold)` helper, wired into
`learningSignals()`. `packages/ledger/src/index.test.ts`: 5 new tests
(below-threshold, exact-threshold, interruption-resets, configurable
threshold, and the real-data regression test above). 2 files, +115 lines,
one conceptual change, well under the 300-line target. No existing exported
symbol's signature changed in a breaking way — only new optional/additive
fields.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), this repo's own `bench` entrypoint,
against a fresh `npm ci && npm run build` at
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.
`LLM_EVAL=blocked` — no `OPENROUTER_API_KEY` in this environment; zero model
calls needed or used for this candidate.

| | Baseline (parent, `2fba255`, via `git stash`) | Candidate (working tree) |
|---|---|---|
| Test files | 7 | 7 |
| Tests | 106 passed | **111 passed** (+5, 0 removed, 0 modified) |
| `npm run lint` (eslint) | clean | clean |
| `npm run build` (6 workspaces, `tsc`) | clean | clean |
| `npm run typecheck` | pre-existing `TS18002` (empty root `tsconfig.json` `files` list) | identical `TS18002`, reproduced on parent — environmental, unrelated to this candidate (same conclusion reached independently by PR #33/#83/#89) |

Live receipt:

```
$ git stash && npm test --silent 2>&1 | tail -8 && git stash pop
 Test Files  7 passed (7)
      Tests  106 passed (106)
[... stash popped, working tree restored ...]

$ npm run build && npm test --silent 2>&1 | tail -12
 ✓ packages/ledger/src/index.test.ts (21 tests)
 ✓ packages/compile/src/index.test.ts (21 tests)
 ✓ packages/cli/src/index.test.ts (31 tests)
 ✓ packages/cli/src/entrypoint.test.ts (8 tests)
 ✓ packages/memory/src/index.test.ts (9 tests)
 ✓ packages/witness/src/index.test.ts (14 tests)
 ✓ packages/schedule/src/index.test.ts (7 tests)
 Test Files  7 passed (7)
      Tests  111 passed (111)

$ node packages/cli/dist/bin.js ledger signals --path docs/dream-cycle/LEDGER.md
{
  "zeroMergeStreak": true,
  "duplicateDirections": [],
  "surfaceStreak": null,
  "lowScoreStreak": false,
  "blockedEvalStreak": false,
  "nightsConsidered": 7
}
```

(`surfaceStreak` is `null` here because `main`'s real ledger only has one
`ledger-signals` row (row 9 is `security-adversarial`) — exactly the
"signal fed stale data" limitation stated in the TL;DR; the real-data test in
`index.test.ts` demonstrates the signal firing correctly on the actual
7-night GitHub sequence, not on `main`'s ledger.)

## Baseline

`main` @ `2fba2550182d81b36423447221823e98e227482a` — 106/106 tests,
unchanged since PR #9 (2026-09-08).

## Darwin (bounded evolution, STEP 12–13)

`DARWIN=not-applicable`. `@metaharness/darwin` is this repo's configured
`darwin` evaluator entrypoint, not a tool for evolving this candidate — and
tonight's change is a small, deterministic, pure addition to a classifier
with no meaningful population of mutations to search over (same precedent as
PR #78/#81/#89). Not run, not a stop condition.

(Incidentally reconfirmed, not part of tonight's candidate: `npx
@metaharness/darwin evolve --sandbox real` run live in this session today
reproduced the exact `Error: darwin: autonomous or generated child id already
exists: g1_v0` stale-state collision on its second invocation, byte-identical
to PR #81's 2026-10-17 finding — the package is reachable and installable in
this session's sandbox, and the already-known bug still reproduces
identically. No new darwin/flywheel finding tonight; `.metaharness/` and the
stray `--sandbox/` directory this created were deleted before this report was
written and are not part of this PR's diff.)

## Evidence

- **OBSERVATION**: `learningSignals()`'s `duplicateDirections` normalizes
  `finding` to its first 6 lowercased words; read directly from
  `packages/ledger/src/index.ts` before writing any code tonight.
- **OBSERVATION**: all 45 open `dream/*` PRs sampled (#12, #16, #33, #43,
  #59, #69, #79, #89, #97) are `draft: true`, `merged: false`, confirmed via
  `pull_request_read`, not the list endpoint's `merged` field (which is
  unreliable — see Ledger Check).
- **MEASUREMENT**: `npm test` 106/106 (baseline, parent, independently
  reproduced via `git stash`) → 111/111 (candidate), 0 regressions, 0
  removed/modified tests (verified by reading the diff hunks, not inferred
  from the count delta).
- **MEASUREMENT**: the real 7-entry `ledger-signals` finding sequence,
  constructed from GitHub issue/PR titles read tonight, produces
  `duplicateDirections: []` and `surfaceStreak: { deep: 'ledger-signals',
  count: 7 }` under the unmodified vs. modified signal respectively — this
  module's own test, not a claim without a receipt.
- **INFERENCE**: the reason `duplicateDirections` never fires for this
  surface is structural (6-word-prefix matching on free-text that this
  repo's own nightly practice deliberately varies in wording each time to
  describe a genuinely different sub-finding), not a counting bug — so a
  text-independent signal is the right fix, not a looser text threshold.
- **DECISION**: ship `surfaceStreak` as a small, additive, backward-
  compatible field; do not attempt to also fix the "signal fed stale main-
  ledger data" problem tonight — that is `conflictRisks()`/merge-readiness-
  CLI territory (#78/#89), a materially larger change (live GitHub reads
  inside signal computation) than one night's reviewable scope.
- **REJECTION**: considered having `surfaceStreak` scan the full history for
  the longest *any* run, not just the trailing run ending at the most recent
  row. Rejected: STEP 1.1's rotation rule is about *tonight's* decision
  (rotate away from what has *just* been repeating), so only the trailing
  run is actionable; a historical-max run is a different (also possibly
  useful, not built tonight) statistic.

## Reward-Hack Check

Independent-critic pass (separate adversarial mindset from the candidate's
author framing used while building it), re-running everything cold.

**Verdict: CLEAR of reward-hacking**, with one limitation disclosed (not
hidden — see TL;DR and Darwin section). Checked and confirmed:
- No pre-existing test weakened, removed, or modified — `index.test.ts`'s
  diff is pure addition (5 new `it()` blocks appended; the 16 existing ones
  byte-identical).
- No threshold, gold-data, or evaluator file touched. No gate/safety/CI/
  automerge file touched.
- Independently re-ran `git stash`/`npm test`/`git stash pop` to reproduce
  106→111 cold, matching this report.
- Checked for cherry-picking: the real-data test uses all 7 real
  `ledger-signals`-tagged nights found tonight, not a hand-picked subset
  that happens to work — re-verified by reading each cited issue/PR's actual
  title via `list_issues`.
- Checked the one place this candidate could oversell impact — the TL;DR
  and Darwin section's "incidentally reconfirmed" callout both explicitly
  disclose that `surfaceStreak` does not, by itself, fix why nothing in this
  repo merges, rather than implying it does. This is the critic's main
  requested correction from an earlier draft of this report, which did claim
  "9+ consecutive nights" before the exact historical count (7, with one
  self-rotation in the middle) was re-verified against real GitHub titles —
  corrected before this report was finalized.
- No cache, undocumented shortcut, or evaluator-internal mutation. The
  function is pure (`LedgerRow[]` in, a plain object out).

## Security Review

Zero new I/O, network, exec, or credential surface — `trailingSurfaceStreak`
is a pure function over an already-in-memory `LedgerRow[]`. No dependency
added or bumped. No file under `.github/`, no `dream.config.json`, no
gate/threshold/scorer file touched — this PR's diff cannot carry the
`automerge-safe` label under the live `automerge.yml` protected-path regex
even if a human wanted to apply it (it would, technically, pass that regex,
being neither `.github/` nor a manifest nor gate/threshold/scorer-named — but
per this repo's "never self-promote" invariant, the label is a human
decision this session does not make either way). No prompt-injection or
cross-agent-poisoning surface — all inputs are typed `LedgerRow[]` objects
already parsed by this repo's own trusted `parseLedger`, not raw untrusted
text. `npm audit` not re-run tonight (unchanged territory, security-
adversarial's scope, last measured 2026-09-08 at 8 advisories/2 critical, all
devDependency-scoped — not re-verified tonight, flagged for that surface's
next night).

## Scan Findings

**witness** — `dream-machine witness stamp`/`witness verify` exercised
tonight on a throwaway file; mechanics reconfirmed consistent with the
documented self-reference constraint (a report cannot embed its own hash,
per the 2026-09-19/2026-10-17 precedent) — this report's own Witness section
below follows that same discipline. No new witness-module finding tonight;
`packages/witness`'s own test suite (14 tests) is untouched and green.

**verify** — `node packages/cli/dist/bin.js ledger verify --path
docs/dream-cycle/LEDGER.md` reconfirmed, byte-for-byte, the same **9
structural errors** first found 2026-09-08 (rows 2–6: out-of-range
`verdict`/`evaluated` values inherited from a different repository
context). Unfixed, unmerged (PR #33, open since 2026-09-21) for 36 days
running as of tonight. Not duplicated here — PR #33 already exists and this
session does not re-author a fix for something already in review.

## Competitors

| System | Relevance to tonight's finding (duplicate-direction / stuck-surface detection) | Grade |
|---|---|---|
| OpenHands | Ships a documented "Stuck Detector" (docs.openhands.dev/sdk/guides/agent-stuck-detector) watching the event stream for the agent making no progress — a *behavioral* repeat/stall detector, conceptually adjacent to tonight's *structural* same-surface-streak counter, but keyed on action repetition within one run, not cross-night surface recurrence in a persistent ledger | A (official docs, cited previously 2026-09-08, still current) |
| DSPy/GEPA | Metric-based scoring with reflective feedback loops; no documented mechanism for detecting that the *same category* of finding keeps recurring across independent optimization runs | B (absence confirmed against official docs, as in the 2026-09-08 report) |
| AutoGPT lineage | Community failure catalogs document agents looping on the same unproductive direction across sessions with no independent "you've done this surface N times" counter — the closest public analogue to the exact blind spot this candidate closes | C (secondary/community sources, single-sourced, not independently reproduced) |
| Darwin Gödel Machine (arXiv:2505.22954v3) | Archive-based self-modification with downstream eval, same conceptual family as `@metaharness/darwin`; the public paper documents archive growth but not a "same mutation *category* keeps recurring, rotate to a different one" rule distinct from its novelty/fitness bookkeeping | B (peer-reviewed-track preprint, cited previously 2026-10-17, not re-verified line-by-line tonight beyond the prior citation) |

C-grade evidence (AutoGPT lineage) informs but does not alone justify
tonight's implementation — the implementation is justified by this repo's
own real, witnessed data (the 7-night sequence above), not by competitor
analogy.

## Gist

No `gh gist create`-equivalent tool available to this session. `GIST=LOCAL`
— committed as this file, `docs/dream-cycle/reports/2026-10-26-ledger-signals.md`.

## Witness

Per the 2026-09-19/2026-10-17 precedent: a report never embeds its own
`report_sha256`/`witness` triple inline, since self-reference makes the
published hash unreproducible against the committed file. The triple below
is computed once this file reaches its final committed content and is
published externally — in this PR's description, the GitHub issue, and the
`LEDGER.md` row — never pasted back into this section.

```
session_commit: 2fba2550182d81b36423447221823e98e227482a
report_sha256 : d66100675dec3e5368d7c918f8003f4416f0f8ee952bc4a150dd5a9ade1f73f6
witness       : 0113a810a76943913776039d7773c92a0c244b62f4439092da7e4ba4b16369ae
```

(This triple hashes the version of this file *before* this Witness section
was filled in, per the self-reference constraint explained above — anyone
re-hashing the final committed file will get a different `report_sha256`
than the one above, by construction. The number that must reproduce is
`witness`, verified against the frozen pre-stamp content, not against this
file's current bytes. See PR body / issue / `LEDGER.md` for the
operationally meaningful figures republished alongside this file.)

**Verifier procedure (5 steps, reproducible by anyone with this repo
checked out at this commit, coreutils + git only):**

1. `git show <this-PR's-head-commit>:docs/dream-cycle/reports/2026-10-26-ledger-signals.md > report.md`
2. `REPORT_HASH=$(sha256sum report.md | awk '{print $1}')`
3. `SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`
4. `printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'`
5. Compare that output to the `witness` value published in this PR's
   description, the linked issue, and the `LEDGER.md` row for 2026-10-26 —
   they must be byte-identical.

## Recommendation

`evaluated: accepted` for tonight's candidate (small, additive, 111/111,
0 regressions, backward-compatible). Concrete next steps, not done tonight:

1. **Wire live GitHub PR/issue history into signal computation**, so
   `surfaceStreak`/`duplicateDirections`/`zeroMergeStreak` see this repo's
   real 7-night (and counting) `ledger-signals` recurrence and the real
   45-open-PR/0-merged backlog, not just the 9 rows physically on `main`'s
   stale ledger. #78/#79's `conflictRisks()` and #88/#89's merge-readiness
   CLI already read live GitHub state by a separate path (`git merge-tree` +
   `list_pull_requests`) — the next step is connecting that path's output
   into `learningSignals()`'s input rather than `LEDGER.md` alone. Not
   built tonight: it is a materially larger, separately-reviewable change
   than tonight's one-function addition.
2. **A human decides whether/how to act on the 45-PR, 0-merge-since-#9
   backlog.** This is not a new recommendation — #10/#46/#84/#88/#89/#90 and
   others have all said this; repeating it is itself exactly the signal
   tonight's candidate is built to detect and name precisely, rather than
   re-stating in free text that varies by night.
3. **Review and merge tonight's PR, or PR #33** (the oldest still-open,
   smallest, most clearly non-duplicative fix in this surface's own
   backlog — 36 days open, fixes the 9 `ledger verify` errors reconfirmed
   above) — whichever a human judges lower-risk first. Tonight's PR touches
   only `packages/ledger/src/index.ts`/`.test.ts`; it does not conflict with
   PR #33 (different hunks of the same file is possible but not confirmed —
   left to the human reviewer, not resolved here).

This session does not merge, self-approve, apply the `automerge-safe` label,
or self-promote. Human review requested.
