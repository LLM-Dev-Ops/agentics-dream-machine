# Dream Cycle 2026-11-16 — ledger-signals (scan: witness, verify)

## Rotation

`DAYINT=20261116`, `SLOT=DAYINT % 5 = 1` → `DEEP=ledger-signals`,
`SCAN=witness,verify`. No bonus modulus (`20261116 % 25 != 0`,
`% 75 != 0`). `SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`
(`main` HEAD — **unchanged since PR #9**, confirmed again tonight: 0 merges
in this repository's history).

## Ledger Check

`docs/dream-cycle/LEDGER.md` on `main` has 9 rows (7 nights). Running this
repo's own real tooling:

```
$ node packages/cli/dist/bin.js ledger verify --path docs/dream-cycle/LEDGER.md
✗ ledger has 9 error(s):
  - row 2: verdict "ACCEPT / INCONCLUSIVE" not in ACCEPT|REJECT|INCONCLUSIVE
  - row 2: evaluated "partial" not in yes|no|blocked
  - row 3: evaluated "partial" not in yes|no|blocked
  - row 4: verdict "ACCEPT / INCONCLUSIVE" not in ACCEPT|REJECT|INCONCLUSIVE
  - row 4: evaluated "partial" not in yes|no|blocked
  - row 5: verdict "ACCEPT / REJECT / INCONCLUSIVE" not in ACCEPT|REJECT|INCONCLUSIVE
  - row 5: evaluated "partial" not in yes|no|blocked
  - row 6: verdict "ACCEPT / REJECT" not in ACCEPT|REJECT|INCONCLUSIVE
  - row 6: evaluated "partial" not in yes|no|blocked

$ node packages/cli/dist/bin.js ledger signals --path docs/dream-cycle/LEDGER.md
{ "zeroMergeStreak": true, "duplicateDirections": [], "lowScoreStreak": false,
  "blockedEvalStreak": false, "nightsConsidered": 7 }
```

These 9 errors are the same ones first flagged in row 9's own
`Prior-night fates` note on 2026-09-08, and left unfixed through tonight —
rows 2-6 are a bulk-inserted contamination from an unrelated commit (PR
#24), documented in detail by PR #33 (2026-09-21, still open/unmerged).

`gh` is authenticated this session (`mcp__github__get_me` succeeds). Per
STEP 1, re-checked the fate of the last 7 nights' associated issues/PRs via
the real GitHub API:

- **0 of ~30 open `dream-cycle` PRs (#12 through #137) have merged.**
  `main`'s only commits are #1-#9; every dream-cycle PR branches from the
  same `2fba255` and none has advanced.
- Two PRs (#87, #95) are `closed` (not merged) — superseded/withdrawn, not
  review rejections.
- This "97-day zero-merge streak" is independently reconfirmed by PR #135
  (2026-11-14) and tracked as a **human decision** by issues #84/#90/#104 —
  explicitly not re-litigated by any session, including this one.
- Extensive prior art already exists on this exact surface: PR #12/#16/#22
  (append-time validation extraction), PR #33 (quarantine + CI gate for
  rows 2-6), PR #99 (`surfaceStreak` signal), PR #109 (triplicate of #22),
  PR #121 (withdrawn as a triplicate — correctly identified and *not*
  shipped), PR #129 (git-merge integration audit of #12×#16×#22×#33,
  reaching `124/124` tests and `ledger verify` 0-errors on the combined
  tree, still draft/unreviewed).

## Learning Signals Applied

`zeroMergeStreak: true` → **bias to a tiny, one-parameter, easily-reviewable
candidate** (per STEP 1.1). `duplicateDirections: []` and no repeated-3x
finding text on `main`'s stale ledger, but the *real* cross-PR picture
(assembled from GitHub, not from `main`'s frozen file) shows the
append-time-validation idea alone has been shipped **three times**
(#12, #22, #109) plus one correctly-withdrawn fourth attempt (#121).
Tonight's research therefore explicitly excluded that direction and
searched for a genuinely unaddressed gap instead (see Evidence).

## Deep Dive: ledger-signals / Scan: witness, verify

Read `packages/ledger/src/index.ts` and `packages/witness/src/index.ts` in
full. `verifyLedger()`'s per-row date check was, on `main`, a shape-only
regex: `/^\d{4}-\d{2}-\d{2}$/` — matching `2026-13-99` or `2026-02-30`
despite neither being a real calendar date. This exact gap was **disclosed
but not fixed** in PR #22's own 2026-09-14 evaluation receipt ("Disclosed
gap (not fixed here, see Scan Findings in the issue): `2026-13-99` still
passes — the shared date check is regex-shape-only, not calendar-valid").
`gh api search/code` for `isValidCalendarDate`/`calendar-valid` confirmed
zero other PRs or code paths address it — a genuinely open, 63-day-old,
already-flagged, un-duplicated finding.

## Candidates considered (5, scored 1-5 on fit/novelty/testability/
measurability/production-value/reviewability)

| # | Candidate | Fit | Novelty | Testability | Measurability | Prod-value | Reviewability |
|---|---|---|---|---|---|---|---|
| 1 | **Fix `verifyLedger`'s date check: shape-only → calendar-valid** | 5 | 5 | 5 | 5 | 3 | 5 |
| 2 | Quarantine rows 2-6 + wire `ledger verify` into CI | 5 | 1 (= PR #33) | 5 | 5 | 4 | 4 |
| 3 | `ledger append` pre-write validation gate | 5 | 1 (= PR #12/#22/#109, triplicate) | 5 | 5 | 4 | 5 |
| 4 | `surfaceStreak` learning signal | 5 | 1 (= PR #99) | 4 | 4 | 3 | 4 |
| 5 | Local git-merge audit: does PR #99 land cleanly on PR #129's already-integrated stack? | 5 | 4 | 4 | 4 | 3 | 3 (larger, multi-branch) |

**Selected #1.** #2-#4 are confirmed duplicates of already-open PRs (shipping
a near-identical fourth/second copy would repeat PR #121's own
self-corrected mistake). #5 is a legitimate, novel next step but is an
audit, not a tiny single-parameter diff — deprioritized under tonight's
`zeroMergeStreak` bias toward the smallest reviewable unit; left as a
recommended follow-up, not attempted tonight.

## Hypothesis (frozen before implementation, not modified after)

> Given `docs/dream-cycle/LEDGER.md` and this repo's `verifyLedger()`, when
> the `date` field's validation is changed from a shape-only regex to a
> calendar-valid check (round-tripping the parsed y/m/d through
> `Date.UTC`), then `ledger verify` should newly reject rows with an
> impossible calendar date (month 13, day 99, Feb 30, or Feb 29 in a
> non-leap year) that currently pass silently, while every row that is
> already correctly accepted or rejected today (including the pre-existing
> 7 genuine rows and rows 2-6's already-known verdict/evaluated errors —
> their `date` fields are themselves well-formed) continues to evaluate
> identically — subject to: zero pre-existing tests weakened, removed, or
> retargeted; the new function stays pure (no I/O, no clock, no
> randomness); `npm test` stays green with only additive tests; and no
> duplication of any already-open PR's work.

**Tested. Confirmed true, not falsified.**

## Candidate

`packages/ledger/src/index.ts`: new pure export `isValidCalendarDate(date):
boolean`, round-tripping `y/m/d` through `Date.UTC` and comparing back;
`verifyLedger`'s inline date check now calls it instead of the bare shape
regex. `packages/ledger/src/index.test.ts`: 4 new tests (calendar-invalid
rejection across month/day/zero-month cases, leap-year true positive/true
negative, and direct unit tests of the new export). 2 files, **+47/-2**,
one conceptual change.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), fresh `npm ci && npm run build`.
`LLM_EVAL=blocked` (no `OPENROUTER_API_KEY` in this environment) — by
design, this candidate needs zero model calls.

| | Baseline (`main@2fba255`) | Candidate |
|---|---|---|
| Tests | 106/106 | **110/110** (+4, 0 removed/modified) |
| Lint | clean (exit 0) | clean (exit 0) |
| Build (6 workspaces) | clean | clean |
| Typecheck | pre-existing `TS18002` (empty root `tsconfig.json` `files` list) | identical, reproduced on parent — environmental, unrelated (same conclusion as PR #22/#33/#99) |
| `ledger verify` on real `docs/dream-cycle/LEDGER.md` | 9 errors, exit 1 | **9 errors, exit 1 — byte-identical set** (rows 2-6's errors are `verdict`/`evaluated`, not `date` — untouched) |

Live A/B repro (real CLI against a scratch copy of the real ledger, not
inferred from logs):

```
$ cp docs/dream-cycle/LEDGER.md /tmp/scratch.md
$ node packages/cli/dist/bin.js ledger append --path /tmp/scratch.md \
    --date 2026-13-99 --deep test --finding "bogus calendar date" \
    --verdict ACCEPT --evaluated yes
appended row to /tmp/scratch.md (verdict=ACCEPT)
# (ledger append has no pre-write gate on main — that's PR #12/#22/#109's
#  territory, not duplicated here)

# BASELINE (main@2fba255) verify of the resulting file:
✗ ledger has 9 error(s):        # <- row 8 (2026-13-99) NOT flagged

# CANDIDATE verify of the identical file:
✗ ledger has 10 error(s):
  ...
  - row 8: date "2026-13-99" is not a valid calendar date (YYYY-MM-DD)
```

## Baseline

`2fba2550182d81b36423447221823e98e227482a` (current `main` HEAD, unchanged
105 days — common ancestor of every open dream-cycle PR). 106/106 tests.

## Darwin Lineage

`DARWIN=not-applicable` — a small, deterministic, pure date-validity fix has
no evolvable parameter space (same precedent as PR #22/#33/#99).

## Evidence

OBSERVATION (PR #22's own 2026-09-14 disclosed-gap text; `main`'s current
shape-only regex read directly from source) → MEASUREMENT (`ledger verify`
on a bad-date-appended scratch file: 9 errors on baseline, not flagging the
bad date, vs. 10 on the candidate, correctly flagging it; 106→110 tests, 0
regressions) → INFERENCE (the gap was real, reproducible, and — per
`gh api search/code` — still unaddressed by any of the 11+ other PRs that
have touched this file) → DECISION (ship the smallest fix that closes it,
without touching the unrelated append-time-gating or quarantine work
already proposed elsewhere) → REJECTION (candidates #2-#4 rejected as
confirmed duplicates; candidate #5 deferred as a recommended next step, not
a tonight finding).

## Reward-Hack Check

Independent critic: a **fresh, separately-spawned `general-purpose` agent**
with no shared context or authorship of the candidate, given only the repo
and the diff. Verbatim verdict:

> **VERDICT: CLEAR (no blocking issues)**
>
> 1. Calendar-date logic — traced by hand, all correct: month out-of-range
>    (0 or 13+) is always rejected because `getUTCMonth()` is guaranteed
>    0-11, so an invalid month index can never match; day overflow (Feb 30,
>    Apr 31) is correctly rejected via the round-trip mismatch; leap years
>    (2024-02-29 accepted, 2026-02-29 and year-2000-div-400 both correctly
>    handled) match the test coverage. Non-blocking edge case *not* covered
>    by tests: two-digit years (e.g. `"0099-06-15"`) hit the classic
>    `Date.UTC` two-digit-year-interpretation quirk and get rejected —
>    harmless for this app (ledger dates are always `20XX`), but worth a
>    comment/test if the function is ever reused elsewhere. No
>    whitespace-bypass risk (anchored regex, no multiline flag).
> 2. Tests: diff is purely additive — full file read confirms no existing
>    assertion was weakened, removed, or retargeted.
> 3. No benchmark/gold-data/threshold file touched; confirmed via
>    `git diff --name-only` and a repo-wide grep — only one date-regex
>    definition exists.
> 4. `isValidCalendarDate` is pure: no I/O, no clock reads, no randomness.
> 5. `gh api search/code` for `isValidCalendarDate` returned 0 results —
>    not already implemented elsewhere.
> 6. Non-blocking overlap note: open PR #22 explicitly disclosed this exact
>    gap as an "incidental finding (not fixed tonight)" and separately
>    refactors `verifyLedger`'s inline per-row checks into a new
>    `validateRow()` export, touching the *same* lines this candidate
>    changes. Not a duplicate (PR #22 doesn't fix calendar validity), but
>    **will likely merge-conflict** with it structurally — flagged for
>    whoever merges, to rebase/reconcile order rather than being surprised.
>
> No reward-hacking indicators found.

No benchmark, gold answer, threshold, or evaluator file was touched.
No cherry-picking: all 4 calendar-invalid cases from PR #22's own disclosed
gap plus the standard leap-year edge case are tested, not a convenient
subset. No undocumented cache or evaluator exploitation — `npm test`/
`npm run lint`/`npm run build` are this repo's own unmodified commands.

## Security Review

Not a security-sensitive surface (no prompt injection, credential, MCP/tool
authority, or network/filesystem-scope change). Zero new I/O, exec, or
dependency — `isValidCalendarDate` is a pure function over a string. No
`.github/`, `dream.config.json`, or gate/threshold file touched. Soft
data-integrity relevance only: this closes one disclosed gap in the engine's
sole durable cross-night memory's own structural validator.

## Scan Findings (witness, verify)

- **verify**: confirmed, by live command, that `docs/dream-cycle/LEDGER.md`
  on `main` still has the same 9 schema errors first flagged 2026-09-08,
  unresolved in the file for 99 days — not fixed tonight (that's PR #33's
  territory; duplicating it would repeat PR #121's own self-corrected
  mistake). Tonight's fix is additive to, not a replacement for, PR #33's
  quarantine work.
- **witness**: `packages/witness/src/index.ts` read in full — `stamp()`,
  `verify()`, and `witnessFromHash()` are correctly pure, deterministic,
  sha256-based, and match this report's own Witness section below exactly.
  No defect found in the witness module itself tonight; it was read as this
  slot's second scan target but did not surface a new finding.

## Competitors (grade C — general knowledge, not freshly re-verified this
cycle; budget was spent on internal archaeology, which produced the
decisive evidence)

| System | Relevant pattern |
|---|---|
| OpenHands | Typed `Event`/`Action` dataclasses validated at construction — the same "validate at the boundary" principle this fix applies to a parsed ledger row. |
| DSPy / GEPA | Typed `Signature`s/assertions reject malformed structured output before it enters the trace. |
| SWE-agent | Trajectory logs validated against a schema in the eval harness; public issue history shows that validation has at times been shape-only, missing semantic constraints — the same class of gap fixed here. |
| Sakana AI Scientist | No documented schema-validation-at-write-time for experiment logs; drift reported anecdotally. |
| AutoGPT lineage | Historically loose logging with publicly reported schema-drift — the closest cautionary analog to this repo's own rows-2-6 incident. |

## Regression Analysis

0 pre-existing tests removed, weakened, or retargeted (confirmed by the
independent critic's full-file read, not just the diff). `npm run lint`
clean before/after. `npm run build` clean (6/6 workspaces). `npm run
typecheck` reproduces the identical pre-existing `TS18002` on both parent
and candidate — environmental, unrelated (same conclusion independently
reached by PR #22/#33/#99).

## ADR

None. This is a validation-correctness fix within the already-decided
ledger design (ADR-0001) — ADR-0002 and this repo's own convention exclude
parameter/validation-logic fixes from requiring a new ADR (precedent: PR
#8, #12, #22, #33, #99).

## Gist

No `gh gist create`-equivalent tool available in this session (same
constraint every prior night in this repo has recorded). `GIST=LOCAL` —
committed as this report file.

## Issue

#138 (filed this cycle).

## Witness

```
session_commit: 2fba2550182d81b36423447221823e98e227482a
report_sha256 : b80dc126ed824f909db462468390dcb99e498984520d66d394b3aa99ef772cc0
witness       : c8bbfe3be9c1cdc0fe8753cd95f3cb7ed2d081c414da2247000c35d1ef61ea4d
```

Computed with `dream-machine witness stamp` over
`docs/dream-cycle/2026-11-16-ledger-signals-gist.md` (the short-form report,
hashed before its own Witness section was filled in — standard caveat, see
that file). Verify:
```
sha256sum docs/dream-cycle/2026-11-16-ledger-signals-gist.md
# must equal b80dc126ed824f909db462468390dcb99e498984520d66d394b3aa99ef772cc0
printf '%s%s' b80dc126ed824f909db462468390dcb99e498984520d66d394b3aa99ef772cc0 2fba2550182d81b36423447221823e98e227482a | sha256sum
# must equal c8bbfe3be9c1cdc0fe8753cd95f3cb7ed2d081c414da2247000c35d1ef61ea4d
```

## Merge Policy

**Draft, human-review-only.** `dream.config.json` sets `autoMerge: true`,
but every dream-cycle PR in this repo opens as draft and GitHub cannot
auto-merge a draft PR (reconfirmed finding from PR #37/#97/#137). This PR
does not carry the repo's low-risk auto-merge label and this session never
applies it, self-approves, or merges. Human review is the path.

**Known future conflict, flagged proactively (per the independent
critic's finding #6):** PR #22 (2026-09-14, open) refactors this exact
function area (`verifyLedger`'s inline per-row checks → a new
`validateRow()` export) for a different purpose (append-time gating). The
two diffs touch adjacent/overlapping lines in `packages/ledger/src/index.ts`
and will very likely need a human to reconcile merge order — recommend
merging whichever lands first, then rebasing the other on top (both are
small, well-tested, and conceptually orthogonal: one validates *when*,
this one validates *what*).

The 97-day, 0-merge, 30-open-PR backlog remains a human decision (issues
#84/#90/#104) — not re-litigated here, only reconfirmed with fresh evidence.
