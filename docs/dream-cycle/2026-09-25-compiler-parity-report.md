# Compiler-Parity SOTA Report — 2026

**Rotation**: `DAYINT=20260925`, `SLOT=0` → `DEEP=compiler-parity`, `SCAN=config-schema,golden-snapshots`. Bonus: `DAYINT % 25 == 0` → `ui-management-console` (not pursued; see Recommendation). `SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.

## TL;DR

`compile(dream.config.json)` is still byte-identical to the live scheduler
prompt — the 4th consecutive clean measurement for this slot (2026-09-10,
2026-09-15, 2026-09-20, tonight). Per STEP 1.1 ("a finding repeated in ≥3
prior nights → rotate to the next slot's DEEP surface"), tonight's actual
work rotates to `ledger-signals` (SCAN=`verify`): a fresh, GitHub-API-verified
audit of this repo's own review backlog, which has gotten materially worse
since it was last measured (2026-09-11, issue #15: "3 nights stale") and has
not been corrected since. No new code candidate is proposed tonight — the
blocker is human review capacity, which this session cannot supply.

## What's new since the last check (2026-09-20, PR #31)

- Compiler-parity: still clean (see Verification Receipt).
- Backlog: **15** open `dream/*` PRs (#12, #14, #16, #18, #20, #22, #24, #26,
  #28, #30, #31, #33, #35, #37, #39), covering every night from 2026-09-09
  through 2026-09-24, **zero merged**. The only two dream-cycle PRs ever
  merged are #8 and #9, both on 2026-09-08.
- `docs/dream-cycle/LEDGER.md` on `main` has not gained a row since
  2026-09-08 (row 8/8). It is now **17 calendar nights stale** — up from the
  3 nights measured on 2026-09-11 (issue #15), an unaddressed ~5.7x growth.
- CodeQL (`analyze` job) is still red on `main`: issue #10 (opened
  2026-09-08, root-caused to a repo-settings gap — GitHub Advanced Security
  /"Code security" not enabled — not fixable by any workflow-code change)
  remains open and unresolved 17 days later. Confirmed still failing on
  PR #33's head (`analyze`: `failure`, all other checks green) via
  `pull_request_read(get_check_runs)` tonight.
- 6 unrelated `dependabot` PRs (#1–#6) are also open, several since August.

## Competitors (informative only — this finding is repo-internal, not a
capability claim; C/B-grade, no A-grade source changes the recommendation)

| Project | Cross-run memory / stale-state handling | Grade |
|---|---|---|
| OpenHands | Session state is ephemeral per run; no persistent cross-night ledger analog | B |
| SWE-agent | No autonomous PR-backlog triage; a human merges every patch | B |
| DSPy/GEPA | Optimizer state persists, but has no "unreviewed candidate backlog" concept — it doesn't open PRs | B |
| Sakana AI Scientist | Publishes papers/artifacts per run; no analog to a durable cross-run merge queue | C |
| AutoGPT lineage | No structured ledger; long-running loops are known to drift without a human checkpoint, which is the closest prior-art parallel to what's observed here | C |

## Hypothesis (frozen before verification)

> Given the live scheduler-delivered prompt for
> `LLM-Dev-Ops/agentics-dream-machine` and `compile()` run against this
> checkout's `dream.config.json` at `SESSION_COMMIT`, the two texts should be
> byte-identical (sha256 match, 0-line diff), with no manual edits to either
> side. Separately: given the real GitHub state of this repo's `dream/*` PRs
> and `docs/dream-cycle/LEDGER.md`, the ledger-staleness and zero-merge
> signals should reflect the true current backlog, not the smaller numbers
> recorded by earlier nights.

## Verification Receipt (real evaluator, no model calls — `LLM_EVAL=blocked` not applicable here, this candidate needs no LLM)

```
$ npm ci && npm run build          # clean, 6/6 packages
$ node packages/cli/dist/bin.js compile dream.config.json --out compiled-prompt.md
compiled LLM-Dev-Ops/agentics-dream-machine → compiled-prompt.md (13622 bytes)
$ diff -u compiled-prompt.md scheduler-prompt.md   # scheduler-prompt.md = the
                                                    # verbatim prompt this
                                                    # session was actually
                                                    # invoked with tonight
(no output, exit 0)
$ sha256sum compiled-prompt.md scheduler-prompt.md
74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d  compiled-prompt.md
74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d  scheduler-prompt.md
$ npm test --silent 2>&1 | tail -5
 Test Files  7 passed (7)
      Tests  106 passed (106)
```

Backlog audit (`mcp__github` tools, live, not fabricated):

```
list_pull_requests(state=all): 15 open dream/* PRs (#12..#39), all state=open
  (state=open is authoritative — a PR cannot be both open and merged)
pull_request_read(#8, get):  merged=true,  merged_at=2026-09-08T05:29:36Z
pull_request_read(#33, get_check_runs): analyze=failure, test(18/20/22)=success,
  no-optional-deps=success, guard-and-merge=skipped
issue_read(#10): state=OPEN, still root-caused to repo-settings, unresolved
issue_read(#15): state=OPEN, last real ledger row still 2026-09-08 (was
  correct on 2026-09-11 at "3 nights stale"; now stale itself at 17)
docs/dream-cycle/LEDGER.md on main: last dated row 2026-09-08 → 17 calendar
  days to 2026-09-25 (python: date(2026,9,25)-date(2026,9,8) = 17 days)
```

## Darwin Lineage

`DARWIN=not-applicable`. No candidate diff exists tonight to evolve; Bounded
Darwin requires a testable candidate population, and per the rotation rule
this session verified rather than authored new code.

## Evidence

- OBSERVATION: `compile()` output vs. the literal scheduler prompt this
  session received; `list_pull_requests`/`issue_read`/`get_check_runs`
  responses.
- MEASUREMENT: sha256 match (0-diff); 15 open unmerged `dream/*` PRs; 17-night
  ledger staleness; CodeQL `analyze` still `failure` on PR #33's head; 106/106
  tests green.
- INFERENCE: the nightly loop's own corrective mechanism ("bias to tiny,
  reviewable candidates" under a zero-merge streak) has been applied
  repeatedly (PRs #12, #16, #33 are all small and self-critic-cleared) and
  has not changed the outcome — the constraint binding this repo is human
  review throughput, not candidate quality or size.
- DECISION: rotate tonight's actionable surface to `ledger-signals`/`verify`
  per STEP 1.1; do not open PR #40 duplicating already-open, already-clean
  candidates; instead file one consolidated, freshly-verified status audit
  and correct the now-stale numbers in issue #15.
- REJECTION: none tonight — no candidate was proposed to reject.

## Reward-Hack Check

Not applicable — no candidate diff was produced tonight to check for
benchmark-weakening, cherry-picking, or evaluator exploitation. The only
claims made are direct, reproducible tool outputs (diff/sha256/GitHub API),
each shown verbatim above.

## Security Review

No code or infrastructure changed. This report itself only reads GitHub
state (least-privilege: `list_pull_requests`, `pull_request_read`,
`issue_read`, `get_me`) and appends to `docs/dream-cycle/`. No credentials,
no exec of untrusted input, no filesystem writes outside the repo's own docs
tree.

## Regression Analysis

N/A — no code candidate.

## Scan Findings

**config-schema** — `dream.config.json` validates cleanly against
`packages/compile/src/config.ts#validateConfig` (0 errors, 0 warnings); no
schema drift found tonight.

**golden-snapshots** — The existing `packages/compile/src/index.test.ts`
golden snapshot pins a *synthetic* `metaharness` config, not this repo's own
`dream.config.json`; it would not catch drift in the one document that
actually matters operationally (the live scheduler prompt). PR #14
(2026-09-10, still open) already proposes exactly this self-referential
fixture and remains the correct fix — not duplicated tonight.

## Competitors / Prior Art for the backlog pattern

See table above. No A-grade prior art found for "autonomous nightly loop
self-diagnoses its own unreviewed-PR backlog"; treated as this repo's own
novel operating condition, informed only at B/C grade by adjacent agent
frameworks' lack of an equivalent mechanism.

## Gist

No `gh gist create`-equivalent tool available to this session (consistent
with every prior night). Committed here instead. `GIST=LOCAL`.

## Witness

```
report_sha256 : 14cc050af7b0782957ab299560049d8aaeff0632b175d68936780ef1624b0701
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : 608c81fc807edb6a743fcd9ffae1f706617eae8c2dc4b2af8380cbf6cabb692e
```
`report_sha256` is the sha256 of this file's pre-stamp draft (per compiled
STEP 16: hashed before this Witness section was rewritten with the final
values, so the recorded hash intentionally does not equal
`sha256sum` of the file as finally committed — that would be circular).
5-step verifier: (1) `git show <this-commit>^:docs/dream-cycle/2026-09-25-compiler-parity-report.md`
would show the pre-stamp draft in a from-scratch reproduction, but since this
repo commits only the final stamped file, reproduce instead by (1) re-running
this report's Verification Receipt commands against `session_commit`
`2fba2550182d81b36423447221823e98e227482a`, (2) confirming the diff/sha256
outputs shown above match byte-for-byte, (3) confirming the GitHub API calls
shown above return the same states (PR/issue numbers are immutable), (4)
recomputing `printf '%s%s' 14cc050af7b0782957ab299560049d8aaeff0632b175d68936780ef1624b0701 2fba2550182d81b36423447221823e98e227482a | sha256sum`
and checking it equals `608c81fc807edb6a743fcd9ffae1f706617eae8c2dc4b2af8380cbf6cabb692e`,
(5) confirming `session_commit` is reachable from `main`'s history
(`git merge-base --is-ancestor 2fba255 main`).

## Recommendation

`evaluated: accepted` for the verification claims above (parity holds;
backlog numbers are real and worse than last measured). No candidate to
merge tonight. For the human:

1. **Triage the 15 open `dream/*` PRs.** Highest-value first merge:
   **PR #33** (`ledger-signals`, 2026-09-21) — bounds the ledger parser to one
   table, quarantines known-contaminated rows, adds a `ledger verify` CI
   gate, and was independently critic-cleared twice (its first pass caught a
   real re-contamination bug in `scripts/dream-nightly.mjs`, which the PR
   then fixed). Merging it stops several other nights' repeated findings at
   the root.
2. **Enable GitHub Advanced Security / Code scanning** in repo Settings (or
   remove `codeql.yml` if not wanted) — issue #10, open 17 days, requires an
   admin action no PR can supply.
3. **Merge or explicitly close** PR #14 (compiler-parity golden snapshot) —
   it has been re-confirmed correct on 3 separate nights now with no new
   objection raised.
4. Once the backlog is triaged, `main`'s `LEDGER.md` will resynchronize
   automatically as those nights' rows land — no separate fix needed for the
   staleness itself.

Bonus deep dive `ui-management-console` (triggered by `DAYINT % 25 == 0`) was
not pursued tonight — the review-backlog finding took priority under the
STEP 0.6 budget, and adding an 16th unreviewed surface would work against
this report's own recommendation.
