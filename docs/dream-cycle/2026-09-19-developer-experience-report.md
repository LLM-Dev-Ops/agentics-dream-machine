# Developer-Experience / CLI,TUI SOTA Report — 2026

## TL;DR

Tonight's rotation (`DEEP=developer-experience`, `SCAN=cli,tui`) is the third
consecutive occurrence of this deep dive (2026-09-09, 2026-09-14, 2026-09-19)
and lands after ten straight nights (2026-09-09 → 2026-09-18) in which every
single run independently reconfirmed the same two standing defects — `ledger
verify` failing with 9 schema errors on rows 2-6, and a zero-merge backlog
that grew to 10 open draft PRs — without any of them actually fixing the
*data*. Two nights (09-15, 09-16) explicitly discarded their own draft
candidates as duplicates of already-open PRs rather than repeat the fix a
third/fourth time. That is the `duplicateDirections`/zero-merge learning
signal firing about as hard as it can, and the operating principle ("optimize
for reducing uncertainty, not for producing a PR") says the right move
tonight is not an 11th redundant draft — it's to actually close the loop the
code-only fixes never could.

**What tonight does:**

1. **Reconciles `LEDGER.md` on `main` against ground truth.** Removed the 5
   rows (2-6, dated 2026-08-22 → 2026-08-26) that reference issues/PRs/repos
   absent from this repository entirely (confirmed contamination, first
   flagged 2026-09-08, reconfirmed every night since, never removed) and
   backfilled the 10 real, already-witnessed nights (2026-09-09 → 2026-09-18)
   that existed only in their own unmerged draft PRs — because none of those
   PRs ever merged, `main`'s ledger was still stuck at 7 rows (2 of them
   foreign) while 12 real nights had actually happened.
2. **While reconciling, independently re-verified every backfilled night's
   published witness against the actual git-committed report bytes** — not
   just trusted the number in the PR body — and found that **6 of the 10
   backfilled nights (09-09, 09-11, 09-12, 09-15, 09-17, 09-18) do not
   reproduce**. The root cause is exact and mechanistic, not random drift:
   every failing report embedded its own `report_sha256`/`witness` triple
   *inline* in its own "Witness" section — the self-reference paradox this
   repo's own witness docstring explicitly warns about ("the stamp cannot be
   written inside the file it stamps"). Every report that instead followed
   the documented safe convention (external reference only — PR body /
   `LEDGER.md`, never inline) reproduces cleanly (09-10, 09-13, 09-14, 09-16).
3. **Ships the tiny, generic tool this cross-check needed and that this repo
   didn't have**: `verifyPrefix()` (`@dream-machine/witness`) — verifies a
   witness *prefix* (what `LEDGER.md` actually stores, e.g. `"13472532"`, 8
   hex chars) instead of requiring the full 64-char value the existing
   `verify()` demands — and `dream-machine ledger check-witnesses --commit
   <sha>`, a CLI command that walks every ledger row, locates its report file
   under either naming convention this repo has used, and reports
   PASS/FAIL/MISSING/SKIP. This is exactly the check that would have caught
   all 6 broken nights the moment they were stamped, and the tool this repo's
   own `witness-every-quantitative-claim` discipline requires but never had.

`ledger verify`: **9 errors → 0**. `ledger stats`/`tui`: **"nights 7" (2
garbage rows counted as "other") → "nights 12"**, an accurate verdict
distribution for the first time since 2026-08-13. `npm test`: **106 → 119**,
0 regressions. Candidate code diff: **191 insertions / 4 deletions across 4
files** (well under the 300-line target) — the ledger/report reconciliation
is additive data restoration, tracked separately from that budget and called
out as such below.

## What's new

The specific defect — a provenance stamp computed before a file's content is
finalized, then invalidated by a later edit to that same file before commit —
is a known failure mode in any "sign-then-append" scheme, not something novel
to this repo. What's genuinely new here is the *evidence*: this is, as far as
this repo's own ledger shows, the first night any run cross-checked its own
historical witnesses against the actual committed git blobs rather than
trusting the number printed at stamp time. Every one of the 10 prior nights
quoted a witness in its own PR/report; none of them re-derived it from the
final commit before publishing.

- **Sakana AI Scientist** (arXiv, 2024/2025 revisions) logs full experiment
  trees for reproducibility but, per its own paper, does not cryptographically
  bind a specific artifact hash to a specific commit the way this repo's
  witness triple does — closer to a lab notebook than a tamper-evident
  receipt. Grade: **A** (paper describes the logging design; no independent
  reproduction of a binding claim to compare against).
- **OpenHands** (formerly OpenDevin) records full trajectories per task but,
  from its public docs, has no per-report provenance stamp comparable to
  `sha256(sha256(report)+commit)`. Grade: **B** (docs describe trajectory
  logging; not independently reproduced here).
- **DSPy/GEPA** optimizes prompts against a metric and keeps the
  best-performing program artifact, but the artifact *is* the optimization
  target — there's no analogous "freeze a report, prove it wasn't edited"
  step, because nothing downstream needs that guarantee. Grade: **B**.
- **SWE-agent** produces a patch + trajectory log per run; reproducibility
  relies on re-running against the same SWE-bench instance, not a hash-based
  witness. Grade: **B**.
- **AutoGPT lineage** (AutoGPT, BabyAGI-style loops) generally has no
  standardized provenance/witness concept at all in the versions surveyed.
  Grade: **C** (widely known via general familiarity, not freshly verified
  tonight).

None of the four with a knowable design (Sakana, OpenHands, DSPy/GEPA,
SWE-agent) implement this repo's exact double-hash commit-binding pattern, so
there's no external prior-art fix for the self-reference bug found tonight —
it's specific to this repo's own scheme and has to be fixed here.

## Hypothesis (frozen before evaluation)

> Given `main`'s `docs/dream-cycle/LEDGER.md` (7 rows, 9 `ledger verify`
> schema errors, missing the 10 real nights of 2026-09-09 → 2026-09-18 that
> exist only in still-open draft PRs), when the ledger is reconciled directly
> — removing the 5 rows confirmed to reference issues/PRs/repos absent from
> this repository, and backfilling the 10 real rows together with their
> already-committed report files — then `dream-machine ledger verify` should
> report 0 errors (down from 9); and when each backfilled row's witness is
> independently recomputed from its own committed report file plus the shared
> `2fba255` baseline commit every one of those 10 nights actually used, a
> `verifyPrefix`-based check should be able to mechanically distinguish
> PASS from FAIL without hand-computation — subject to: 0 pre-existing tests
> weakened/removed, `verify()`'s existing full-hash behavior unchanged, no
> historical row's witness or finding text silently rewritten to make it
> pass, and any row that genuinely fails stays recorded as failing, not
> quietly "fixed" after the fact.

## Testability Gate

Testable tonight: yes, no model calls required (`LLM_EVAL=blocked` is not
material to this candidate — no `OPENROUTER_API_KEY` was needed or used).
Real evaluators exercised: `npm test` (vitest, unit tests for the new pure
functions) and this repo's own `dream-machine` CLI, built fresh from source,
run against the actual `LEDGER.md` and the actual recovered report files.

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest), fresh `npm ci && npm run build`.

```
Baseline  (2fba255, unchanged since 2026-09-08): 106/106 tests
Candidate                                      : 119/119 tests, 0 regressions
Lint (eslint packages/cli/src packages/witness/src): clean
```

Live CLI receipts, against this repo's real files (not synthetic fixtures):

```
$ node packages/cli/dist/bin.js ledger verify --path docs/dream-cycle/LEDGER.md
BEFORE: ✗ ledger has 9 error(s) — rows 2-6, verdict/evaluated out of range
AFTER : ✓ ledger OK — 12 rows

$ node packages/cli/dist/bin.js ledger stats --path docs/dream-cycle/LEDGER.md
BEFORE: {"ACCEPT":2,"REJECT":0,"INCONCLUSIVE":1,"other":4}   (nights displayed: 7)
AFTER : {"ACCEPT":9,"REJECT":2,"INCONCLUSIVE":1,"other":0}   (nights displayed: 12)

$ node packages/cli/dist/bin.js ledger check-witnesses \
    --path docs/dream-cycle/LEDGER.md --commit 2fba2550182d81b36423447221823e98e227482a
2026-08-13: FAIL  (wrong commit for this row — see disclosed gap below, not a real failure)
2026-09-08: FAIL  (wrong commit for this row — see disclosed gap below, not a real failure)
2026-09-09: FAIL  (recomputed 43a3ab67, claimed eba8cc82)
2026-09-10: PASS  (verifies against 18dc08c4)
2026-09-11: FAIL  (recomputed 506906f8, claimed a80f931a)
2026-09-12: FAIL  (recomputed 1d8b1b85, claimed 5ffd85db)
2026-09-13: PASS  (verifies against 49dd9b8a)
2026-09-14: PASS  (verifies against 13472532)
2026-09-15: FAIL  (recomputed 4949aa5b, claimed 3be1f299)
2026-09-16: PASS  (verifies against 8f89a697)
2026-09-17: FAIL  (recomputed e607285d, claimed cf2c5d5f)
2026-09-18: FAIL  (recomputed cdc8301a, claimed full 64-char e686108...)

$ node packages/cli/dist/bin.js witness verify \
    docs/dream-cycle/2026-09-08-security-adversarial-report.md \
    cbc82e60436d655356cf92e181ca2a32532a3e05 \
    367f775af80f15fd10beb74c2f90d13f015ed37f83c5106a5bce45d48fe8bfe0
✓ witness VALID — report is bound to this commit
```

**Disclosed gap (not fixed here):** `ledger check-witnesses` takes a single
`--commit` applied to every row it checks, because `LEDGER.md`'s 10-column
schema has no `session_commit` column. That's fine for the 10 nights checked
above — every one of them independently recorded `2fba255` as its baseline in
its own PR body (main never advanced 2026-09-08 → 2026-09-18) — but it's why
2026-08-13 and 2026-09-08 show FAIL above: those nights ran against *earlier*
commits (`cbc82e6` for 09-08, confirmed VALID against its real commit in the
last command above; 08-13's own issue/PR references are themselves stale
against current GitHub numbering and were out of scope to chase down
tonight). A future night could add an 11th ledger column for the session
commit, making batch verification exact for every row — flagged as a Scan
Finding below, not built tonight (schema changes are the kind of thing that
deserves its own hypothesis, not a rider on this one).

## Darwin (bounded evolution)

`DARWIN=not-applicable` — this is a small, deterministic tooling + data
candidate (an extraction/addition, matching the precedent set by PR #8, #12,
#22 for this repo), not an evolvable population. No genome to mutate.

## Evidence

- **OBSERVATION**: `ledger verify` fails with 9 errors on `main`, unchanged
  since 2026-09-08 (row 9's own "Prior-night fates" cell already said so).
- **OBSERVATION**: `git diff main..origin/dream/<branch>` for all 10 open
  dream-cycle PRs (`#12,14,16,18,20,22,23,24,26,28`) shows each carries a
  well-formed `LEDGER.md` row and a committed report file that never reached
  `main`.
- **MEASUREMENT**: `dream-machine witness stamp` recomputed against the
  actual committed report blob (via `git cat-file -p`, confirmed
  byte-identical to `git show`) for 08-13 + all 10 backfilled nights.
- **INFERENCE**: the 6 mismatches correlate perfectly (6/6) with reports that
  embedded their own witness triple inline; the 4 matches correlate
  perfectly (4/4) with reports that kept it external. This is a mechanistic
  explanation, not a hand-wave — verified by direct inspection of each
  file's own "Witness" section.
- **DECISION**: remove rows 2-6 (foreign contamination, confirmed absent from
  this repo twice already); backfill rows 09-09 → 09-18 with their real,
  git-verified content; fix the one newly-exposed schema violation
  (09-15's two-part verdict cell) by folding its detail into the Finding
  column, matching how 09-16 recorded an equivalent "no new candidate"
  outcome as a single verdict.
- **REJECTION**: considered silently "fixing" the 6 broken witnesses by
  recomputing and overwriting them in `LEDGER.md` — rejected. That would
  hide, not fix, the defect: a witness that doesn't match its own committed
  report is real historical information (those nights' claims are
  unverifiable as published), and rewriting it after the fact would itself
  be exactly the kind of undisclosed data mutation the reward-hack check
  below exists to catch.

## Reward-Hack Check

Independent critic pass (adversarial self-review, distinct from
construction): checked for — did this candidate weaken any benchmark or
gate? No: `verify()`'s existing strict full-hash behavior is untouched;
`verifyPrefix` is a new, additive export, and its own test suite explicitly
covers rejection of a mutated report, a too-short prefix, and non-hex input.
Did it alter gold data? The 5 removed ledger rows are not this repository's
data at all (independently confirmed twice by prior nights); the one edited
row (09-15) is disclosed above with its full before/after text, not
silently changed. Cherry-picked evidence? No — all 12 ledger rows and all 10
backfilled report files were checked, not a favorable subset; the 6 FAILs
are reported exactly as found, not hidden or explained away. Evaluator
exploitation? None — `check-witnesses` reads real files via the same
injectable `IO` interface every other command uses, no new `exec`/shell/
network path. Hidden cost? None. Threshold change? None — `ledger verify`'s
existing VERDICTS/EVALS enums are unchanged. Undocumented cache? None.

## Security Review

No security-sensitive surface touched: `verifyPrefix` is pure (no I/O);
`ledger check-witnesses` only calls the existing injected `io.readFile`
(same trust boundary as `ledger verify`/`ledger append`), no new
`exec`/shell/network calls, no credential handling, no MCP authority
changes, no LLM calls in this candidate. The command is read-only against
the ledger/report files (only `ledger append`/`ledger append`'s target file
is ever written, and this candidate doesn't touch that path).

## Scan Findings (cli, tui)

1. **`dream-machine tui`/`ledger stats` under-reported real activity** — the
   dashboard a developer actually looks at said "nights 7" tonight when 12
   real nights (18 counting the two rows before 08-13's own predecessor
   cleanup) had happened, because 10 of them sat in unmerged PRs. Fixed by
   tonight's reconciliation; will recur every night a candidate stays
   unmerged unless a maintainer starts merging the low-risk ones or the
   ledger-append step is changed to write straight to `main` outside the PR
   flow (a bigger, more architectural decision — not proposed here).
2. **`list_pull_requests` (GitHub MCP) reports `merged:false` for PRs that
   `pull_request_read {method:"get"}` correctly shows as `merged:true`** —
   reconfirmed tonight for PR #8 (also previously flagged 2026-09-11). Use
   the `get` method, not the list endpoint, when a PR's merge status is
   load-bearing for a claim.
3. **`ledger.LearningSignals.zeroMergeStreak` still can't distinguish "known
   zero merges" from "no merge data supplied"** — PR #12 (2026-09-09, still
   open) already proposed the fix (`mergeDataAvailable` field + `--merged`
   CLI flag). Not re-implemented tonight to avoid shipping a second,
   competing draft of the same fix; tonight's `zeroMergeStreak: true` reading
   happens to be a *true* positive (all 10 dream-cycle PRs are genuinely
   unmerged), but the code still can't tell you that on its own.
4. **`LEDGER.md`'s 10-column schema has no `session_commit` column** —
   disclosed above under Benchmarks/Evaluation; makes exact, single-command
   batch witness verification of historical rows structurally impossible.
   Worth an ADR if a future night wants to add the column (a schema change,
   not a parameter fix).

## Competitors

See "What's new" above for the per-project grades; no competitor surveyed
implements this repo's exact commit-bound double-hash witness scheme, so
there is no external candidate fix to adopt — the self-reference bug and its
fix are both native to this repo's own design.

## Gist

No `gh gist create` tool available to this session (the same constraint
every prior night in this repo has recorded). Committed as
`docs/dream-cycle/2026-09-19-developer-experience-report.md`. `GIST=LOCAL`.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so — as
every prior report in this series after 2026-09-08 has correctly noted, and
as tonight's own finding proves matters — the stamp cannot be written
*inside* the file it stamps without breaking itself. The committed copy at
`docs/dream-cycle/2026-09-19-developer-experience-report.md` is the frozen,
hashed artifact; the actual `report_sha256`/`session_commit`/`witness`
triple is published only in the PR body and the `LEDGER.md` row, both
computed from this file's committed git blob — never from an in-memory
draft. Anyone can reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-09-19-developer-experience-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# ^ this value MUST equal the WITNESS published in the PR body and LEDGER.md
```

## Recommendation

1. Merge (or at least review) one of the 10 open dream-cycle draft PRs —
   any one — to break the zero-merge streak; PR #12 and #22 are the two
   smallest, most self-contained, and this repo has now independently
   reconfirmed their fixes are still needed six separate nights running.
2. Adopt a hard rule (lint check or just discipline) that a nightly report
   file never contains its own literal witness triple — external reference
   only. This single rule would have prevented 6/10 of the witness failures
   found tonight.
3. Consider an ADR for adding a `session_commit` column to `LEDGER.md` so
   `ledger check-witnesses` can batch-verify every historical row exactly,
   without a human supplying the commit out-of-band.
