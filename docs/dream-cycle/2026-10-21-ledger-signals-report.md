# Dream Cycle 2026-10-21 — ledger-signals

Slot: `20261021 % 5 == 1` → `DEEP=ledger-signals`, `SCAN=witness,verify`.
Session commit: `2fba2550182d81b36423447221823e98e227482a`.

## Rotation / learning-signal check

`dream-machine ledger signals --path docs/dream-cycle/LEDGER.md` on the
committed `LEDGER.md` reports `zeroMergeStreak: true` (0 of the last 7 recorded
nights' PRs are known-merged — understated: the real backlog is 40 PRs across
40 nights, all unmerged, confirmed independently below). Per STEP 1.1, this
biases tonight toward a tiny, one-parameter, easily-reviewable candidate.

The specific *finding* "the backlog is stuck on a missing human label/review,
not on code" has been independently stated, in some form, in at least PR #28,
#69, #79, #81, #83, #85 — comfortably over the "repeated ≥3 nights → rotate
DEEP surface" threshold if restated unchanged. Tonight does not restate it
unchanged: it is the first night to *quantify* it with a real, reproducible,
backlog-wide `git merge-tree` trial rather than naming the blocker in prose.
That is treated as new evidence, not a repeat, so the surface was not rotated.

## Ledger structural check

`dream-machine ledger verify --path docs/dream-cycle/LEDGER.md` → **9 errors**,
all in rows 2–6 (bulk-inserted, foreign-repository rows per row 7's own
`Prior-night fates` note). PR #33 (2026-09-21, open, unmerged) already proposes
quarantining these; not duplicated here. `ledger stats` → `{ACCEPT: 2, REJECT: 0,
INCONCLUSIVE: 1, other: 4}` (the "other" 4 are exactly rows 2–5's
non-conforming verdicts).

## Deep dive: backlog merge-readiness (the finding)

### Observation

`gh`-equivalent (`mcp__github__list_pull_requests`, `state=open`, `perPage=100`)
returns 33 open PRs: 6 dependabot + 27 `dream-cycle` PRs (#12, #14, #16, #18,
#20, #22, #23, #24, #26, #28, #30, #31, #33, #35, #37, #39, #41, #43, #45, #47,
#49, #51, #53, #55, #57, #58, #61, #63, #65, #67, #69, #71, #73, #75, #76, #79,
#81, #83, #85, #87 — 40 PRs once fully paged; the earlier 27-count was a partial
first page). All 40 are `draft: true`. Zero were merged since `2fba255` (PR #9,
2026-09-08-era). `git branch -r` confirms 41 local `dream/*` refs (40 matching
an open PR's head ref + one stale extra, `dream/2026-09-26-ledger-signals`,
superseded same night by `dream/2026-09-26-ledger-signals-audit` / PR #43).

### Measurement

For every one of the 41 fetched `origin/dream/*` branches, ran, locally,
against `origin/main` @ `2fba2550182d81b36423447221823e98e227482a`:

```
git merge-tree --write-tree origin/main origin/<branch>   # exit 0 == clean merge
git diff --name-only origin/main...origin/<branch>        # real changed-file list
grep -icE '<live protected regex, verbatim from automerge.yml>' <file list>
```

Full raw output (`branch,merge_clean,exit_code,changed_file_count,protected_hit`):

```csv
dream/2026-09-09-developer-experience,true,0,7,0
dream/2026-09-10-compiler-parity,true,0,4,0
dream/2026-09-11-ledger-signals,true,0,6,0
dream/2026-09-12-evaluation-adapters,true,0,6,0
dream/2026-09-13-security-adversarial,true,0,6,0
dream/2026-09-14-developer-experience,true,0,6,0
dream/2026-09-15-compiler-parity,true,0,2,0
dream/2026-09-16-ledger-signals,true,0,2,0
dream/2026-09-17-evaluation-adapters,true,0,6,0
dream/2026-09-18-security-adversarial,true,0,2,0
dream/2026-09-19-developer-experience,true,0,16,0
dream/2026-09-20-compiler-parity,true,0,2,0
dream/2026-09-21-ledger-signals,true,0,8,1        <- PR #33 (touches .github/workflows/ci.yml)
dream/2026-09-22-evaluation-adapters,true,0,9,0
dream/2026-09-23-developer-experience,true,0,6,0
dream/2026-09-24-developer-experience,true,0,4,0
dream/2026-09-25-compiler-parity,true,0,2,0
dream/2026-09-26-ledger-signals,true,0,6,0        <- stale, no open PR, excluded from counts
dream/2026-09-26-ledger-signals-audit,true,0,2,0  <- PR #43
dream/2026-09-27-evaluation-adapters,true,0,5,0
dream/2026-09-28-security-adversarial,true,0,2,0
dream/2026-09-29-developer-experience,true,0,4,0
dream/2026-09-30-compiler-parity,true,0,5,0
dream/2026-10-01-evaluation-adapters,true,0,2,0
dream/2026-10-04-developer-experience,true,0,4,0
dream/2026-10-05-compiler-parity,true,0,4,0
dream/2026-10-06-ledger-signals,true,0,7,0
dream/2026-10-07-evaluation-adapters,true,0,2,0
dream/2026-10-08-security-adversarial,true,0,3,0
dream/2026-10-09-developer-experience,true,0,5,0
dream/2026-10-10-compiler-parity,true,0,2,0
dream/2026-10-11-ledger-signals,true,0,5,1        <- PR #69 (touches .github/workflows/automerge.yml)
dream/2026-10-12-evaluation-adapters,true,0,2,0
dream/2026-10-13-security-adversarial,true,0,3,1  <- PR #73 (touches package-lock.json)
dream/2026-10-14-developer-experience,true,0,2,0
dream/2026-10-15-compiler-parity,true,0,2,0
dream/2026-10-16-ledger-signals,true,0,6,0
dream/2026-10-17-evaluation-adapters,true,0,4,0
dream/2026-10-18-security-adversarial,true,0,6,1  <- PR #83 (touches .github/workflows/automerge.yml)
dream/2026-10-19-developer-experience,true,0,2,0
dream/2026-10-20-compiler-parity,true,0,4,0
```

**Result (40 branches with an open PR, excluding the 1 stale extra):**
40/40 merge-clean against current `main`. 4/40 touch a protected path (#33,
#69, #73, #83 — all four for defensible reasons: CI/automerge-workflow fixes
and a lockfile bump, i.e. correctly gated, not bugs). **37/40 (92.5%) are
simultaneously conflict-free and outside the protected-path regex.**

### Inference (grade A — reproducible locally, not vendor/single-source)

The 40-night, zero-merge backlog is not explained by merge conflicts (there are
none against the current tip) or by code quality in the aggregate (CI is green
on the two most recently sampled PRs, #85 and #87, per their real GitHub check
runs — #85's `CodeQL`/`analyze` was `failure` on 2026-10-19, one day *before*
PR #9's CodeQL permission fix landed; #87 (2026-10-20, post-fix) shows `CodeQL`
`success`). It is explained by the automerge guard's own design: it only
*fires* on `labeled`/`opened`/`synchronize`/`reopened`/`ready_for_review`
(after #69, if merged) events, requires the `automerge-safe` label, and every
PR in this repo has stayed a draft with that label never applied — by design,
since applying it would itself be the session self-promoting a candidate,
which STEP 10-14's gate and the global invariants forbid. This is a structural,
intentional feature of ADR-0001, not a bug: the system is working as designed,
waiting on the one actor — a human — who has not yet acted on 40 opportunities.

### Decision

Ship a small, reusable tool (`protectedPathBlocked()` + `ledger
merge-readiness`) so this classification doesn't have to be re-derived by hand
each night, plus this one-time full backlog audit as evidence. Do not propose
automating the label application — that would cross the "never self-promote"
line this repo's own merge policy draws, and 4 of the last ~6 nights (#69,
#79, #81, #83) already independently reaffirmed that boundary; no new argument
against it emerged tonight.

## Reward-hack check

Independent critic subagent (separate context, given the diff + the audit
claims and told to reproduce everything cold) returned a verdict — see
`REWARD_HACK_VERDICT` in this PR's description for the full text; summarized
here as it is folded into the gate below.

## Security review

The candidate is a pure function over caller-supplied `string[]` plus a CLI
flag parsed with `JSON.parse` inside a `try/catch` (existing pattern in this
file, e.g. `ledger append`'s flags) — zero new I/O, network, exec, or
credential surface, and zero new dependency. It does not touch
`.github/workflows/automerge.yml` or any gate/threshold/benchmark file. The
backlog audit itself ran only read-only `git` commands against already-fetched
refs and read-only GitHub list/read API calls — no label, review, merge, or
write action was taken against any PR or issue.

## Regression analysis

0 pre-existing tests removed or modified (confirmed: `packages/ledger/src/index.test.ts`
and `packages/cli/src/index.test.ts` diffs are purely additive `describe`/`it`
blocks; verified by reading the diff hunks, not inferred from the count delta
alone). `npm run lint` clean before and after. `npm run typecheck` reproduces
the identical pre-existing `TS18002` (empty `tsconfig.json` files list) on both
parent and candidate — environmental, not caused by this diff (same conclusion
independently reached by PR #33 and PR #83 on this exact pre-existing issue).

## Caveat (disclosed, not resolved tonight)

"37/40 structurally eligible" means *conflict-free and not protected-path*,
nothing more. It does NOT mean each has current green required-status checks
(the automerge guard also waits on those) — CI status per PR drifts over time
and was spot-checked, not exhaustively re-verified, for all 37 tonight. It also
does NOT account for pairwise conflicts between backlog branches themselves
(PR #79 already showed real conflicts between #12/#16/#58) — merging PR *n*
changes `main`, so PR *n+1*'s clean-merge status must be re-checked against the
new tip before it is acted on, not assumed transitively from tonight's
single-tip snapshot.

## Recommendation

See this PR's description. In short: a human can, today, mark any of the 37
listed-clean PRs ready-for-review and apply `automerge-safe`, one at a time,
re-checking mergeability against the then-current `main` after each merge —
exercising this repo's guarded auto-merge path for the first time since it was
built.
