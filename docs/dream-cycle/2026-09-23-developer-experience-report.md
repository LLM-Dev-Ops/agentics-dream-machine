# Developer-Experience SOTA Report — 2026

## Rotation

`DATE=2026-09-23`, `DAYINT=20260923`, `SLOT=3` → natural assignment
`DEEP=security-adversarial`, `SCAN=redblue,supply-chain`. **Rotated**: the
security-adversarial CodeQL/repo-settings finding (issue #10) has now been
carried, unchanged in root cause, across 3 consecutive security-adversarial
nights (2026-09-08 diagnosis, 2026-09-13 reconfirmed, 2026-09-18 escalated)
— the learning signal "a finding repeated in ≥3 prior nights → rotate to the
next slot's DEEP surface" fires. Tonight uses `DEEP=developer-experience`
(slot 4's deep) while keeping tonight's own `SCAN=redblue,supply-chain`
(only the DEEP surface rotates per the signal's wording; scans stay as
computed for tonight's actual slot). No bonus deep dive (`20260923 % 25 =
23`, `% 75 = 48`).

## Ledger Check

`docs/dream-cycle/LEDGER.md` on `main` still ends at 2026-09-08 (7 rows,
rows 2-6 the confirmed-foreign contamination flagged repeatedly, a fix for
which already exists as still-open PR #33 — not re-done tonight, out of
scope for this candidate). Real GitHub state as of tonight: 12 open
dream-cycle issues (#11...#34), 14 open draft dream-cycle PRs (#12, #14,
#16, #18, #20, #22, #23, #24, #26, #28, #30, #31, #33, #35), **zero merged
since #8/#9 on 2026-09-08** — `zeroMergeStreak` still true, up from 10 on
2026-09-18. Per the learning signal, tonight biases to a **tiny,
one-parameter, easily-reviewable candidate**.

## Deep Dive: why nothing merges

PR #18 (2026-09-12) and PR #20 (2026-09-13) already found that this repo's
`.github/workflows/automerge.yml` guard requires a label, `automerge-safe`,
that has never been created in this repository (`get_label` → 404,
reconfirmed tonight). Tonight adds a second, independent, previously
unreported gap and ships a fix for the part that's safely fixable.

Fresh evidence gathered tonight (not previously fetched):

- **Every historical `automerge.yml` run** (`actions_list
  list_workflow_runs`, unpaginated: 49/49 runs) has `conclusion: skipped` —
  the job's `if: contains(..., 'automerge-safe')` guard has never once
  evaluated true, in either direction. Consistent with, and now
  quantifying, the missing-label finding.
- **GitHub's own documented behavior** (Grade A, official docs, confirmed
  via web search tonight —
  https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request):
  auto-merge cannot be enabled on, and GitHub will not merge, a **draft**
  pull request. A human must mark it "Ready for review" first.
- **This repo's own compiled routine, read directly**
  (`packages/compile/src/index.ts`, `step20to25PublishFlow`, the exact
  function that generated tonight's own STEP 20-25 instructions):
  unconditionally instructs "Open a **draft** PR (even a significant result
  stays draft)" — with no branch, no config gate, regardless of
  `autoMerge`.

Put together: even on a night the missing label were created, the
auto-merge pathway would *still* never fire, because this repo's own
nightly instructions guarantee every dream-cycle PR stays a draft forever.
Two independent, structural gaps — not one. Prior nights (PR #18, PR #20)
found gap #1 and stopped; the compiled-prompt's own claim
("guarded auto-merge ENABLED for this target", printed whenever
`autoMerge: true`) was, and until tonight remained, false.

## Hypothesis (frozen before implementation)

> Given this repo's real `dream.config.json` (`autoMerge: true`) and the
> real, unconditional "always draft" instruction in
> `step20to25PublishFlow`, when a pure `assessMergePolicyReachability({
> autoMerge, alwaysOpensDraft })` function is added and wired into that
> same function via a single new module constant `ALWAYS_OPENS_DRAFT_PR`,
> then the compiled routine's merge-policy text for `autoMerge: true`
> should say the policy is configured-but-unreachable (not "ENABLED")
> whenever `alwaysOpensDraft` is true — matching this repo's real,
> empirically observed state (0/49 auto-merge runs ever cleared the label
> guard) — while: the `autoMerge: false` branch and the default
> golden-snapshot fixture (whose config never sets `autoMerge`, defaulting
> false) stay byte-identical; every pre-existing test keeps its meaning (no
> assertion is weakened into a near-trivial one); the invariant "the
> session itself still never runs the merge" is present in every branch;
> and the candidate touches no evaluation gate, benchmark, threshold, or
> security boundary (verified against `automerge.yml`'s own protected-path
> regex).

## Candidate

- `packages/compile/src/mergePolicy.ts` (new, pure, 33 lines):
  `assessMergePolicyReachability({autoMerge, alwaysOpensDraft}) →
  {reachable, reason}`. Three exhaustive branches: `autoMerge` false →
  unreachable ("human-review only by design"); `autoMerge` true +
  `alwaysOpensDraft` true → unreachable (draft/GitHub-mechanics reason);
  `autoMerge` true + `alwaysOpensDraft` false → reachable. The third branch
  is not exercised by the compiled routine today (this repo always sets
  `alwaysOpensDraft: true`) but is unit-tested directly as an honest,
  general-purpose pure function.
- `packages/compile/src/index.ts`: new module constant
  `ALWAYS_OPENS_DRAFT_PR = true`, documented as the single source of truth
  mirroring STEP 20-25's own hardcoded "always draft" text so the two can't
  drift apart silently. `step20to25PublishFlow` now branches on
  `assessMergePolicyReachability(...).reachable` instead of unconditionally
  emitting the "ENABLED" copy whenever `autoMerge` is true.
- `packages/compile/src/index.test.ts`: the one pre-existing test that
  asserted the old, false "ENABLED" claim (`toContain('guarded auto-merge
  ENABLED')`) is corrected to assert the new, accurate text instead — it
  is a stricter set of assertions (adds a negative assertion on the old
  false claim, pins exact new substrings), not a weakened one. No other
  pre-existing test touched.
- `packages/compile/src/mergePolicy.test.ts` (new): 3 tests, exhaustively
  covering all three branches of the pure function.

8 lines removed / ~65 lines added across 4 files, one conceptual change,
well under the 300-line target.

## Evaluation Receipt

Real evaluator only (`npm test` = `vitest run`); no model calls
(`LLM_EVAL=blocked`: no `OPENROUTER_API_KEY` in this environment, same as
every prior night).

```
# BASELINE (main @ 2fba255)
npm ci && npm run build : clean
npm test                : 106/106
npm run lint             : clean
npm run typecheck        : 1 pre-existing failure — tsconfig.json(1,12)
                            TS18002 "'files' list ... is empty" (confirmed
                            via git stash on this exact commit, unrelated
                            to any packages/* diff)

# CANDIDATE (working tree, this PR)
npm run build : clean
npm test      : 109/109 (+3 new in mergePolicy.test.ts, 0 removed, 0
                pre-existing tests weakened; index.test.ts keeps 21/21,
                one assertion corrected not deleted)
npm run lint  : clean
typecheck     : identical pre-existing TS18002 failure, unrelated
golden-snapshot (__snapshots__/index.test.ts.snap): 0 diff — the fixture
  config never sets `autoMerge`, so it only ever exercises the untouched
  `!autoMerge` branch.
```

Independent-critic subagent (fresh context, no priming from this report)
independently re-read the diff, re-ran `npx vitest run --silent` on both
the working tree (109/109) and a `git stash`-baseline checkout (106/106),
and independently re-checked `automerge.yml`'s protected-path regex against
the 4 changed file paths — **CLEAR**, verdict and evidence in the
Reward-Hack Check section below.

## Baseline

Commit `2fba2550182d81b36423447221823e98e227482a`, 106/106 tests,
`automerge.yml` unchanged since 2026-08-13 (`5423e55`), `automerge-safe`
label never created, `packages/compile/src/index.ts` unconditionally
claiming "guarded auto-merge ENABLED for this target" whenever
`autoMerge: true` is set — a claim this PR shows to be false for this
repo's actual, currently-configured behavior.

## Darwin Lineage

`DARWIN=not-applicable` — small, pure, exhaustively-branched (3 cases)
comparison/classification function; no evolvable population, same
reasoning as every prior non-architectural night in this repo (PRs
#8/#18/#20/#26/#35).

## Evidence

- OBSERVATION: `get_label('automerge-safe')` → 404 (reconfirmed tonight,
  first found 2026-09-12).
- OBSERVATION: `list_workflow_runs('automerge.yml')`, unpaginated, 49/49
  runs `conclusion: skipped`.
- OBSERVATION: `packages/compile/src/index.ts:349` (pre-change) —
  unconditional `Open a **draft** PR (even a significant result stays
  draft)`.
- MEASUREMENT (Grade A, official docs, web search 2026-09-23): GitHub does
  not permit merging or enabling auto-merge on a draft pull request.
- INFERENCE: the auto-merge pathway is unreachable for two independent
  reasons, not one; fixing only the label (as a human eventually will)
  does not make it reachable on its own.
- DECISION: fix the compiler's own misleading claim (in-scope, no
  evaluation/gate/safety code touched); do not attempt to change STEP
  20-25's draft-forever policy itself (an architectural decision left to a
  human — see Recommendation).
- REJECTION: considered also creating the `automerge-safe` label directly
  (a one-API-call fix for gap #1) — rejected. Even though creating a label
  is not itself a merge, it is unauditable, judgment-laden repository
  infrastructure adjacent to enabling autonomous merges, and prior nights
  (#18, #20) deliberately only reported this gap rather than acting on it;
  tonight keeps that same discipline rather than overriding it unilaterally.

Full OBSERVATION/MEASUREMENT/INFERENCE/DECISION/REJECTION log is this
section; no separate evidence file was needed for a diff this size.

## Reward-Hack Check

Independent critic subagent (separate context, instructed to read the
actual working-tree files and re-run tests itself rather than trust this
report) returned **CLEAR**:

1. The corrected `index.test.ts` assertion is stricter than the one it
   replaced (adds a negative assertion on the old false claim, pins two
   new exact substrings), not gamed into near-trivial.
2. `ALWAYS_OPENS_DRAFT_PR = true` accurately mirrors STEP 20-25's literal,
   unconditional text — not a fudge.
3. The unreachable `reachable: true` branch is dead code in today's
   compiled output (STEP 20-25 always passes `alwaysOpensDraft: true|`)
   but is independently unit-tested and an honest general-purpose
   interface, not a fabricated "this works" claim about current behavior.
4. "The session itself still never runs the merge" is present verbatim in
   every merge-policy branch, unchanged.
5. `automerge.yml`'s protected-path regex
   (`^(\.github/|packages/[^/]+/package\.json$|package\.json$|package-lock\.json$|.*/safety|.*/gate|.*(threshold|promotion|scorer).*|SECURITY\.md$)`)
   matches none of the 4 changed files.
6. Independently re-ran `npm test`: 109/109 candidate, 106/106 baseline —
   matches this report's claim exactly.

No pre-existing test removed, no gold data touched, no benchmark or
threshold changed, no cherry-picking (the one existing assertion changed
is disclosed above with its full before/after).

## Security Review

No new runtime attack surface: `packages/compile` only generates prompt
text, performs no I/O, exec, network, or credential access, both before
and after this change. No LLM calls in this candidate's path
(`LLM_EVAL=blocked` tonight, no `OPENROUTER_API_KEY`). The change makes a
previously-false safety-relevant claim (about whether autonomous merge is
live) accurate instead — a security-adjacent correctness improvement, not
a new boundary.

## Regression Analysis

0 pre-existing tests removed. 1 pre-existing assertion corrected (disclosed
above, stricter not weaker). `npm run lint` clean. `npm run build` clean.
`npm run typecheck`: identical pre-existing failure on baseline and
candidate (unrelated). Golden-snapshot: 0 diff.

## ADR

None. This is a correctness fix to generated prompt text (the compiler
now tells the truth about a policy's reachability) — not a new
architectural decision, no new capability, no changed default behavior for
any config that doesn't already set `autoMerge: true`. Consistent with
prior nights' precedent for additive/corrective primitives in
`packages/*` (PR #20, PR #26: "None — additive... not an architectural
decision").

## Scan Findings (redblue, supply-chain)

- **redblue**: still no `redblue` key configured in `dream.config.json` —
  6th consecutive confirmation since 2026-08-13, unchanged.
- **supply-chain**: fresh `npm audit` tonight — 9 advisories (2 critical, 2
  high, 3 moderate, 2 low), unchanged since 2026-09-13, 100% confined to
  devDependencies, fix still open as dependabot PR #1 (now 20 days old).
- CodeQL (issue #10, not this slot's scan but still the standing
  infrastructure item): reconfirmed via a fresh, unpaginated fetch — **0
  of 41** historical runs across all branches have ever succeeded, same
  repo-Settings root cause, unchanged. No code change fixes this.

## Competitors

Sakana AI Scientist, OpenHands, DSPy/GEPA, SWE-agent, AutoGPT lineage — see
the SOTA gist for the comparison table. Grade C (general knowledge, not
independently re-verified tonight); informs but does not justify tonight's
finding, which rests entirely on Grade A first-party evidence (this repo's
own GitHub state + GitHub's own official documentation).

## Gist

No `gh gist create`-equivalent tool available to this session (same
constraint recorded every prior night). Working draft:
`/tmp/dream-gist-2026-09-23.md` (not committed — ephemeral session
scratch). Canonical, durable copy: this file. `GIST=LOCAL`.

## Issue

Filed alongside this PR (see PR description for the number).

## Witness

Computed externally from this file's actual **committed git blob**, never
from an in-memory draft — deliberately avoiding the exact self-reference
bug issue #29 (2026-09-19) found in 6/10 backfilled nights ("a nightly
report never contains its own literal witness triple"). The
`report_sha256` / `session_commit` / `witness` triple is recorded in this
PR's description, in the linked issue, and in `LEDGER.md`'s Witness column
— not here. Verify: `git show <this-commit>:docs/dream-cycle/2026-09-23-developer-experience-report.md | sha256sum`, then `printf '%s%s' "<that hash>" "<session_commit>" | sha256sum` must equal the witness recorded in the PR/issue/ledger.

## Merge Policy

`dream.config.json` sets `autoMerge: true`, but per tonight's own finding,
that pathway is currently unreachable (missing label + draft-forever
mandate). This PR stays **draft, human-review-only**, exactly like every
prior dream-cycle PR in this repo. This session does not merge,
self-approve, or enable auto-merge under any condition, and did not create
the `automerge-safe` label (see Evidence → REJECTION).

## Recommendation

`evaluated: accepted`

1. A human creates the `automerge-safe` label if the guarded auto-merge
   policy is still wanted, **and** separately decides (a distinct,
   architectural decision this session does not make) whether STEP 20-25's
   blanket "always draft" instruction should change for PRs that qualify
   for auto-merge — e.g. mark-ready-for-review only when a low-risk label
   and green CI both hold.
2. Review and merge (or explicitly close) at least one of the 14 open
   dream-cycle draft PRs — tonight's fix makes the routine stop claiming a
   false "ENABLED" status but does not itself unblock the backlog.
3. A repo admin enables Code Security / code scanning in repository
   Settings to resolve issue #10 (CodeQL, 0/41 runs green, unrelated to
   tonight's finding but still open).
