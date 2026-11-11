# Ledger-Signals / Witness+Verify SOTA Report — 2026

## TL;DR

Tonight's rotation (`DAYINT=20260911`, `SLOT=1` → `DEEP=ledger-signals`,
`SCAN=witness,verify`) found that `docs/dream-cycle/LEDGER.md` on `main` is
silently **3 calendar nights stale**: its last row is dated 2026-09-08, while
PR #12 (2026-09-09, a `zeroMergeStreak` false-positive fix) and PR #14
(2026-09-10, a compiler-parity golden-snapshot test) both sit open/draft,
unmerged, on GitHub — confirmed live via the GitHub MCP server, not
inferred. `dream-machine ledger signals` has no way to say this: it only
reports signals computed from whatever rows happen to be on `main`, with no
field indicating *how stale* that view is. Candidate: a deterministic,
pure `nightsSinceLastRow` field on `learningSignals()` (`packages/ledger`)
wired through a new `--today` flag on `dream-machine ledger signals`
(`packages/cli`, defaulting to the existing `io.now()` injected clock).
106→112 tests, 0 regressions, lint clean, independent critic CLEAR.

## What's new

- **Ledger staleness is now a first-class, queryable signal.** Before
  tonight, `learningSignals()` had zero notion of "today" — it could not
  distinguish a ledger that's current from one that's three real nights
  behind. `nightsSinceLastRow` closes that gap without touching any
  existing field (additive-only).
- **Fresh, independently-verified evidence that `zeroMergeStreak`'s known
  false-positive (PR #12, 2026-09-09, still unmerged) is still live on
  `main` tonight.** Checked PR #8 and PR #9 via `pull_request_read` with
  method `get` (not `list_pull_requests`, whose `merged` field incorrectly
  reported `false` for both — a real API/MCP-surface discrepancy worth
  flagging for future nights): both are in fact `merged: true`,
  human-merged by the repo owner. So real merge history for this repo's
  candidate PRs is **not** a clean zero — yet `ledger signals` still reports
  `zeroMergeStreak: true` by construction (it never receives merge data),
  matching exactly what PR #12 already diagnosed. Not re-fixed tonight —
  duplicating an already-open, already-evaluated candidate would be
  rediscovering a direction this repo's own evidence already covers (STEP
  2). Left untouched to avoid any merge-conflict collision with PR #12.
- **Row 1 of `LEDGER.md` (2026-08-13, "first real night") also carries
  impossible cross-context references**, a variant of the contamination
  rows 2-6 have been flagged for on 2026-08-13 and 2026-09-08 but that
  those nights never extended to row 1. Row 1 cites `Issue #6` / `PR #7`.
  Ground truth tonight: `#6` is a dependabot PR ("bump actions/checkout
  from 4 to 7") created 2026-09-03; `#7` is an *issue* (not a PR) created
  2026-09-08. Neither existed on 2026-08-13. Row 1's references are not
  schema-invalid (unlike rows 2-6, they're single clean values, so `ledger
  verify` never flags them) — they're simply impossible, which `ledger
  verify`'s structural schema check cannot catch. Flagged, not corrected
  tonight: rewriting ledger history is a distinct, human-reviewable
  decision (same reasoning rows 2-6 have been given twice already).
- **`ledger verify` still reports the same 9 structural errors** on rows
  2-6 (compound verdicts like `"ACCEPT / INCONCLUSIVE"`, `evaluated:
  "partial"`), first flagged 2026-09-08, confirmed unchanged tonight
  byte-for-byte. Second consecutive night flagged — one more unaddressed
  night would cross this repo's own `duplicateDirections >= 3` rotation
  threshold in spirit (the literal signal keys on `finding` text, not
  repeated scan flags, so it won't fire automatically — logged here so a
  future night doesn't have to rediscover that this is now a 2-night-old,
  not 1-night-old, gap).
- **The `darwin` evaluator entrypoint, blocked on 2026-09-08 (package not
  installed), is live tonight** and actually executed a real 3-generation
  evolution run against this repo's own `npm test` — which also means it's
  the first night this repo can observe what "live" actually does. Two
  new findings from watching it run for real (see Scan: verify below):
  it writes an **untracked, literally-named `--sandbox/` directory** into
  the repo root (not a hidden/tmp path), and leaves **non-idempotent
  state** that makes a second invocation fail outright
  (`Error: darwin: autonomous or generated child id already exists:
  g1_v0`). Reproduced twice, cleaned up before committing (this session's
  own probe-generated directory was untracked debris, not evidence to
  keep). This sharpens, with real execution evidence instead of a
  blocked/not-installed guess, the "pin or guard the darwin entrypoint"
  recommendation already logged on 2026-09-08.

## Frozen Hypothesis

> Given this repo's own `docs/dream-cycle/LEDGER.md` on `main` (last row
> dated 2026-09-08) and the fact that PR #12 (2026-09-09) and PR #14
> (2026-09-10) are both still open/draft/unmerged — confirmed live via the
> GitHub MCP server — `dream-machine ledger signals` today silently
> computes its learning signals from a ledger that is 3 calendar nights
> stale relative to `io.now()`, with no field in its output surfacing that
> staleness. Adding a deterministic, pure `nightsSinceLastRow` signal (last
> row date vs. an injected `today`) should report 3 for this repo's real
> ledger+today, 0 for a ledger whose last row IS today, and null when the
> ledger has no dated rows — with zero regressions to the 106 pre-existing
> tests, no I/O inside `learningSignals()`, and no change to the existing
> (separately-tracked-in-PR#12) `zeroMergeStreak` field.

Frozen before implementation; not modified after evaluation began.

## Candidate

`packages/ledger/src/index.ts`: `SignalOptions` gains `today?: string`;
`LearningSignals` gains `nightsSinceLastRow: number | null`; a small pure
`daysBetweenUTC()` helper computes the UTC calendar-day difference between
the last dated row and `today`. `packages/cli/src/index.ts`: new `--today
<YYYY-MM-DD>` flag on `ledger signals`, defaulting to `io.now()` (the
existing injected-clock pattern already used by `ledger append --date`);
help text updated. 66 insertions / 2 deletions across 4 files (src + tests
in both packages), one conceptual change. `packages/cli/src/tui.ts` is
deliberately untouched — PR #12 already modifies it, and touching the same
file would create an avoidable merge-conflict surface between two
independently-reviewable candidates.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), this repo's configured `bench`
entrypoint. Baseline (commit `2fba2550182d81b36423447221823e98e227482a`,
fresh `npm ci && npm run build`): **106/106**. Candidate: **112/112**, +6 net
new tests (4 in `packages/ledger`, 2 in `packages/cli`), 0 regressions, 0
removed/weakened pre-existing tests. Lint clean. `npm run build` clean
across all 6 packages (pure TS, no wasm/NAPI, no degradation).

```
$ node packages/cli/dist/bin.js ledger signals --path docs/dream-cycle/LEDGER.md
{
  "zeroMergeStreak": true,
  "duplicateDirections": [],
  "lowScoreStreak": false,
  "blockedEvalStreak": false,
  "nightsConsidered": 7,
  "nightsSinceLastRow": 3
}
```

That `3` is the real, live number for this repo's real ledger tonight — not
a synthetic test fixture. `--today` explicitly overrides the default (used
by the CLI test suite so the numbers are deterministic without mocking
`Date`).

## Baseline

Commit `2fba2550182d81b36423447221823e98e227482a`, 106/106 tests.
`learningSignals()` existed with `zeroMergeStreak`, `duplicateDirections`,
`lowScoreStreak`, `blockedEvalStreak`, `nightsConsidered` — no notion of
"today" or ledger staleness existed anywhere in the codebase.

## Darwin Lineage

`DARWIN=not-applicable` for the shipped candidate — no evolvable population
for a small, deterministic, pure signal addition (same reasoning as every
prior non-architectural night). The `darwin` *evaluator entrypoint itself*
was, however, run for real tonight as part of the `verify` scan (see Scan
Findings) — that's evaluator-liveness research, not candidate evolution,
and its output (a throwaway `--sandbox/` directory) was deleted before
committing anything.

## Evidence

- OBSERVATION: `docs/dream-cycle/LEDGER.md` on `main`, last row date
  `2026-09-08`; `io.now()` (real UTC date) `2026-09-11`.
- OBSERVATION (GitHub MCP, `list_pull_requests`, state=all): PR #12 and #14
  both `state: open`, `draft: true`.
- MEASUREMENT (GitHub MCP, `pull_request_read` method `get`, per-PR ground
  truth): PR #8 `merged: true`, `merged_at: 2026-09-08T05:29:36Z`; PR #9
  `merged: true`, `merged_at: 2026-09-08T05:30:47Z`. Both contradict the
  `merged: false` that `list_pull_requests` reported for the same two PRs
  in the same session — an MCP/API surface discrepancy, not a ledger bug;
  logged so a future night trusts `get`, not `list`, for merge ground
  truth.
- MEASUREMENT: `npm test` 106→112, independently reproduced by a separate
  critic subagent via `git stash` A/B.
- MEASUREMENT: `node packages/cli/dist/bin.js ledger signals --path
  docs/dream-cycle/LEDGER.md --today 2026-09-11` → `nightsSinceLastRow: 3`,
  matching the by-hand calendar difference (2026-09-08 → 2026-09-11).
- OBSERVATION: `npx @metaharness/darwin evolve --sandbox real`, run twice
  from the repo root: first run exit 0, real 3-generation evolution
  (`g1_v0`..`g3_v7`, `baseline`), scored this repo's own `npm test`; second
  run (same cwd, no cleanup) exit 1, `Error: darwin: autonomous or
  generated child id already exists: g1_v0`. Both runs created
  `./--sandbox/.metaharness/{variants,runs}/`, a literal, untracked,
  top-level directory name (not a hidden or tmp path). Deleted (`rm -rf --
  ./--sandbox`) before any `git add`.
- OBSERVATION: `node packages/cli/dist/bin.js verify-entrypoints
  dream.config.json` classifies the same darwin command as `live (exit 0)
  — produced output` — correct for the *first* invocation it observed, but
  "live" says nothing about idempotency or filesystem hygiene across
  repeated invocations.
- INFERENCE: `ledger verify`'s 9 structural errors (rows 2-6) are
  byte-identical to the 2026-09-08 report's count — confirms no silent
  drift, also confirms no one has fixed it in 2 consecutive nights now.
- INFERENCE: row 1's `#6`/`#7` references post-date the row's own
  2026-08-13 timestamp by 3+ weeks, so they cannot refer to this repo's own
  issue/PR tracker at the time the row was written — same contamination
  class as rows 2-6, previously un-flagged for row 1 specifically.
- DECISION: ship only the `nightsSinceLastRow` wiring tonight; document the
  `darwin` hygiene finding and the row-1 finding as scan results rather
  than implementing fixes for either (darwin's sandbox-naming bug lives in
  a third-party npm package this repo doesn't control; rewriting ledger
  history is an explicitly human decision per two prior nights'
  precedent).
- REJECTION: considered also wiring `nightsSinceLastRow` into
  `packages/cli/src/tui.ts`'s dashboard footer. Rejected tonight to avoid
  any merge-conflict surface with PR #12, which already modifies that same
  file — logged as a next step once PR #12 lands.

## Reward-Hack Check

Independent critic (separate subagent, not this candidate's author):
**CLEAR.** Verbatim verdict: "No pre-existing assertions altered/removed —
diff is pure addition (66 insertions, 2 deletions; the 2 deletions are the
one-line help-text replacement and the old `learningSignals(rows)` call
signature, not test weakening). Diff touches only `packages/ledger` and
`packages/cli` — no gold data, benchmark corpus, thresholds, or eval/gate
infra touched. `learningSignals()` stays pure — no `Date.now()`, no I/O, no
network. `--today` fallback (`flags.today || io.now()`) exercised by a
dedicated test; override exercised by a second test. Independently
reproduced 106→112 via `git stash` A/B, matching exactly. No
cherry-picking/reward-hacking: the field defaults to `null` (opt-in),
doesn't alter any existing computed signal." One non-blocking gap noted:
`--today` takes an arbitrary string with no format validation;
`daysBetweenUTC` silently returns `null` on malformed input (safe,
non-crashing) but that path is untested — logged as a follow-up, not a
blocker.

## Security Review

No security-sensitive surface touched by the shipped candidate: no new
`io.exec`/shell/network calls, no credential handling, no filesystem writes
beyond the pre-existing `ledger append` path, no MCP authority change.
`--today` is parsed as a plain string and only ever reaches
`Date.UTC(...)` on regex-validated integer groups — never a shell, never a
path. Separately (not part of the shipped candidate, but surfaced by
tonight's `verify` scan): the `darwin` evaluator entrypoint, run live for
the first time this repo has observed, writes an untracked directory into
the repo root and leaves state that breaks on re-invocation — a
filesystem-scope and supply-chain-adjacent finding (the entrypoint remains
unpinned, per the 2026-09-08 recommendation, still not actioned — a
`dream.config.json` content change is a distinct, human-reviewable
decision this candidate does not make).

## Regression Analysis

0 pre-existing tests removed or modified. `packages/ledger/src/index.test.ts`
+19 lines (4 new tests). `packages/cli/src/index.test.ts` +12 lines (2 new
tests). `packages/ledger/src/index.ts` +32/-0. `packages/cli/src/index.ts`
+3/-2 (flag wiring + help text). `typecheck` fails identically before and
after the candidate with a pre-existing, unrelated root-`tsconfig.json`
error (`TS18002`, empty `files` list) — confirmed via `git stash` A/B, not
caused by tonight's change.

## ADR

None — this is an additive signal/parameter change to existing,
already-decided ledger-signals machinery (ADR-0001), not a new
architectural decision. Matches this repo's own ADR convention (excludes
parameter changes) and the precedent set by PR #12 and #14.

## Scan Findings

**witness** — Reviewed `packages/witness/src/index.ts` end-to-end (14
existing tests). Clean: `stamp()`/`verify()`/`witnessFromHash()` are pure,
deterministic, correctly validate commit-sha shape and 64-hex-char
report-hash shape before comparing, and `verifySteps()` emits a genuinely
reproducible 5-step coreutils procedure. No issue found; no change
proposed.

**verify** — Three findings, all documented above and none fixed tonight
(each is either a duplicate of an already-evaluated direction, a
human-only decision, or outside this repo's own source): (1) `ledger
verify`'s 9 structural errors on rows 2-6, unchanged for a 2nd consecutive
check; (2) row 1's impossible `#6`/`#7` references, a previously-unflagged
instance of the same contamination class; (3) the live `darwin` entrypoint's
untracked-directory + non-idempotent-state behavior, newly observed because
tonight is the first night the package was actually installable.

## Competitors

| System | Cross-run memory / staleness handling | Grade |
|---|---|---|
| OpenHands | Session/trajectory state persisted per-run; no published mechanism for detecting that a *control-loop's own* durable memory has fallen behind unmerged work | B |
| SWE-agent | Stateless per-issue runs by design; no cross-run ledger to go stale in the first place — sidesteps this class of bug entirely | B |
| DSPy/GEPA | Optimization history tracked per-run in an in-memory/on-disk trace; no documented check for "is my optimizer's view of history current relative to pending external changes" | C |
| Sakana AI Scientist | Experiment logs accumulate per paper-writing run; reviewed materials describe no explicit staleness/freshness signal over accumulated findings | C |
| AutoGPT-lineage | Long-running agents with persistent memory stores; community-documented failures include acting on stale memory, but no standard "nights since last durable write" signal was found | C |

No A-grade (reproducible/official) source was found describing this exact
failure class — "a nightly evolutionary loop's own append-only ledger
lagging behind its own unmerged output" is narrow enough that the closest
comparisons are B/C-grade inferences from each system's general
persistence model, not a reproduced benchmark. Treated as informative only,
per this repo's own evidence-grading discipline.

## Gist

No `gh gist create` tool available to this session (same constraint as
every prior night). Committed instead as
`docs/dream-cycle/2026-09-11-ledger-signals-report.md`. `GIST=LOCAL`.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so — as
noted on every prior night — the stamp cannot be written *inside* the file
it stamps. The committed copy at
`docs/dream-cycle/2026-09-11-ledger-signals-report.md` is the frozen,
hashed artifact; this section is filled in immediately before that file is
committed, over content identical up to this point. Anyone can
independently reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-09-11-ledger-signals-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

```
report_sha256 : 87982031b26fee72c64c6443ffd8e79ac5a89b2995fbe2b85bfb108712f8e84d
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : a80f931a6a450babc31eef277549c75c84341a8ad3f8a264efe749ecef2a91cc
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at
the start of tonight's session, before this candidate's changes). Verified
locally with `dream-machine witness verify`. REPORT_HASH and WITNESS are
also published in the PR body and the `LEDGER.md` row, both pointing back
at this file by path and session commit.

## Recommendation

`evaluated: accepted`. Human review of the draft PR. Concrete next steps,
not done tonight:

1. **Merge PR #12 and/or PR #14** (both open 1-2 nights with clean
   receipts and CLEAR critic verdicts) — or explain why not. Until one
   merges, `main`'s ledger will keep drifting further behind real nightly
   work, which is the exact condition `nightsSinceLastRow` now makes
   visible instead of silent.
2. **Pin or `--no-install`-guard the `darwin` evaluator entrypoint** in
   `dream.config.json` (recommended once already, 2026-09-08; now backed
   by direct evidence that the unpinned command, when it *does* run,
   writes untracked state into the repo root and fails non-idempotently on
   re-invocation) — a `dream.config.json` content change, a distinct
   human-reviewable decision this candidate does not make.
3. **Decide whether to correct `LEDGER.md` rows 1-6's cross-context
   references** (now including row 1, not just 2-6) in one explicit,
   human-reviewed pass, rather than have each future night re-flag the
   same unfixed rows. A human decision, not a nightly candidate's to make
   unilaterally.
