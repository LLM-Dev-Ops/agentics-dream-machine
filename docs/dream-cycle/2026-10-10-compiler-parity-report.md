# Compiler-Parity SOTA Report — 2026-10-10

## TL;DR

`compile(dream.config.json)` is byte-identical (sha256
`74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d`) to tonight's
delivered prompt — compiler-parity holds, the 6th consecutive clean night
(after 2026-09-10/15/20/25/30, 10-05). But the candidate this session drafted
before checking GitHub — a self-referential golden-snapshot test over this
repo's own `dream.config.json` — is a near-exact duplicate of **open PR #14**
(2026-09-10). This is the **3rd time** a session has independently rebuilt
that same candidate and had to discard it after querying live GitHub state
(after PR #31 on 09-20 and PR #51 on 09-30). The repeated near-miss is itself
evidence that `docs/dream-cycle/LEDGER.md` on `main` (still ending at the
2026-09-08 row) is not a reliable "have we tried this" signal, because no
dream-cycle PR has merged since 2026-09-08 — every subsequent night's ledger
row lives only on its own unmerged branch. Tonight's actual contribution: a
cross-branch audit of the full 29-PR open backlog (something no single
branch's own diff against `main` can see), surfacing one new, concrete,
previously-unreported defect (an ADR numbering collision) and a merge-order
recommendation.

## Frozen hypothesis (frozen 2026-10-10, before implementation) — tested, REJECTED

> Given this repo's own `dream.config.json`, when a self-referential vitest
> test (`validateConfig` + `compile` + `toMatchSnapshot()`) is added to
> `packages/compile/src/index.test.ts`, then any future edit to
> `dream.config.json` that changes the compiled prompt text should be forced
> through `npm test` failing, relative to the baseline of zero test coverage
> over this repo's real config, subject to: 0 regressions, no weakened
> assertion, no new code path.

**Measurement** (carried out in full before the duplicate was discovered):
baseline `npm test` on `main @ 2fba255`: 106/106. Candidate (3 new tests,
1 new snapshot): 109/109, 0 regressions, lint clean, build clean. The
`compile()`/received-prompt byte-identity check was independently reproduced
(see TL;DR hash).

**Verdict: REJECT.** Not because the measurement failed — it was clean — but
because the candidate duplicates open, unmerged PR #14 (2026-09-10), which
ran the identical experiment first and is still awaiting review. Shipping a
4th copy of the same fix would optimize for PR count over reducing
uncertainty, the opposite of this routine's own operating principle. The
diff was built, tested, confirmed clean, then discarded uncommitted — same
discipline PR #31 and PR #51 each independently applied before this session.

## What's new tonight: the 29-PR backlog, audited in full

No dream-cycle PR has merged since PR #8/#9 (2026-09-08). Every night since
has opened a new draft PR against the same `main @ 2fba255`. Branch listing
+ `list_pull_requests(state=all)` tonight:

| # | Branch date | Surface | Title (verbatim) | State |
|---|---|---|---|---|
| 12 | 09-09 | dev-experience | fix zeroMergeStreak false-positive in learningSignals | open draft |
| 14 | 09-10 | compiler-parity | self-referential compiler-parity golden snapshot | open draft |
| 16 | 09-11 | ledger-signals | add nightsSinceLastRow ledger-staleness signal | open draft |
| 18 | 09-12 | evaluation-adapters | fix darwin/flywheel evaluatorEntrypoints + **ADR-0003** | open draft |
| 20 | 09-13 | security-adversarial | static supply-chain pin check for unpinned npx evaluatorEntrypoints | open draft |
| 22 | 09-14 | dev-experience | validate ledger append rows before writing | open draft |
| 23 | 09-15 | compiler-parity | re-confirmed, backlog escalation (no new candidate) | open draft |
| 24 | 09-16 | ledger-signals | backlog escalation (no new candidate) | open draft |
| 26 | 09-17 | evaluation-adapters | instruct classifying evaluator-entrypoint liveness in compiled STEP 5-9 | open draft |
| 28 | 09-18 | security-adversarial | CodeQL 0/30 runs ever green | open draft |
| 30 | 09-19 | dev-experience | reconcile LEDGER.md + witness self-reference bug (6/10 nights) | open draft |
| 31 | 09-20 | compiler-parity | re-confirmed 3rd time, PR #14 CI-status finding (no new candidate) | open draft |
| 33 | 09-21 | ledger-signals | quarantine contaminated ledger rows + CI gate, **ADR-0003** | open draft |
| 35 | 09-22 | evaluation-adapters | detect darwin entrypoint non-idempotency | open draft |
| 37 | 09-23 | dev-experience | compiler stops claiming auto-merge ENABLED when structurally unreachable | open draft |
| 39 | 09-24 | dev-experience | verdictColor honors --no-color | open draft |
| 41 | 09-25 | compiler-parity | re-confirmed 4th time, rotated to ledger-signals backlog audit (no new candidate) | open draft |
| 43 | 09-26 | ledger-signals | backlog reconfirmed (no new candidate) | open draft |
| 45 | 09-27 | evaluation-adapters | extract entrypointExitCode shared helper | open draft |
| 47 | 09-28 | security-adversarial | reconfirmed, backlog crisis escalated (no new candidate) | open draft |
| 49 | 09-29 | dev-experience | --no-color flag ignores =true/space-value forms | open draft |
| 51 | 09-30 | compiler-parity | dream.config.json JSON Schema, closes PR #14's deferred gap | open draft |
| 53 | 10-01 | evaluation-adapters | rotated per ledger-signals, backlog reconfirmed (no new candidate) | open draft |
| 55 | 10-04 | dev-experience | tui honors NO_COLOR env var | open draft |
| 57 | 10-05 | compiler-parity | golden-snapshot coverage for CLI machine-readable outputs | open draft |
| 58 | 10-06 | ledger-signals | backlogSaturated learning signal | open draft |
| 61 | 10-07 | evaluation-adapters | reconfirmed, no new candidate (26 open PRs) | open draft |
| 63 | 10-08 | security-adversarial | pin darwin evaluatorEntrypoints (6th night, 1st fix) | open draft |
| 65 | 10-09 | dev-experience | consolidate #39+#49+#55, fix #49/#55 merge conflict | open draft |

**29 open draft PRs**, 0 merged, spanning every rotation slot at least 5
times. `mergeable_state` sampled on #14, #31, #33, #37, #58, #65: all
`unstable`, every one of them explained by the *same* unrelated cause, not
their own diff (see root cause below).

### Root cause (previously diagnosed, still unresolved 32 days later)

Issue #10 (opened 2026-09-08, last updated 2026-09-18): CodeQL's `analyze`
job fails on **every** run since the workflow was added (2026-09-03) —
`Code Security must be enabled for this repository to use code scanning`, a
repository-settings gap (GitHub Advanced Security), not a workflow-permissions
issue (PR #9's `actions: read` fix did not and could not address it). This
requires a repo admin acting in Settings → Code security and analysis — no
PR from any session can resolve it. Reconfirmed tonight: `analyze` check-run
on PR #14's head is still `conclusion: failure`; every functional check
(`test (18/20/22)`, `no-optional-deps`) is `success`.

### New finding tonight: ADR numbering collision

Two independent, still-open PRs each add a **different** ADR under the same
number:

- PR #18 (2026-09-12): `docs/adrs/ADR-0003-dream-cycle-evaluation-adapters-darwin-genome-bench-gap.md`
- PR #33 (2026-09-21): `docs/adrs/ADR-0003-dream-cycle-ledger-signals-contamination-containment.md`

STEP 19's own discipline ("determine the next number from the repo, do not
assume") only works relative to `main`, which has never advanced past
ADR-0002 — so every unmerged branch that adds an ADR independently claims
ADR-0003. Whichever of #18/#33 merges first keeps the number; the other must
renumber to ADR-0004 (and its INDEX row) before it can merge. No branch has
hit this yet because none has merged. Worth checking before merging either.

### Known consolidation opportunities already identified by prior nights

- PR #65 (10-09) already ships the union of #39+#49+#55 (all three fix facets
  of the same `--no-color`/`NO_COLOR` contract; #49 and #55 textually
  conflict with each other). Recommendation already in #65's own body: merge
  #65, close #39/#49/#55 as superseded. Net backlog **-2**.
- PR #31 (09-20) and PR #41 (09-25) both recommend merging PR #14 first — the
  oldest, most-reconfirmed (now 4 independent nights: #14/#23/#31/#41, plus
  tonight's near-miss makes a 5th), zero-conflict, all-functional-checks-green
  compiler-parity candidate. Its `unstable` state is entirely the unrelated
  CodeQL gap above, not its own diff.
- PR #51 (09-30) is **not** a duplicate of #14 — it adds a JSON Schema for
  `dream.config.json`, an explicitly deferred gap from #14's own body.
  Independent, additive, keep.
- PR #12 (09-09, `--merged` flag) and PR #58 (10-06, `--open` flag) both add
  honesty-pattern options to `learningSignals()` that `packages/compile`
  still never wires up — PR #58's own body says so explicitly ("Scoping
  note: ... Nothing in `packages/compile/src/index.ts` ... yet tells a
  future session to compute the real open-PR count"). This is exactly the
  gap that caused tonight's (and #31's, and #51's) duplicate near-miss: the
  compiled STEP 1/STEP 2 text never instructs a session to check **live
  GitHub PRs** for an already-in-flight candidate on the current surface,
  only the local (stale) `LEDGER.md`. Closing this is squarely
  `packages/compile` / compiler-parity scope — logged as next step 1 below,
  deliberately not implemented tonight (would be the 4th candidate built
  under time pressure after a 3rd discovered duplicate; better reviewed
  fresh).

## Benchmarks / evaluation

- Compiler-parity byte-identity: MEASUREMENT, this session, reproducible
  (see TL;DR hash).
- Rejected candidate's test delta (106→109, 0 regressions): MEASUREMENT,
  this session; not shipped.
- Backlog count (29 open PRs, 0 merged since 09-08) and ADR collision:
  MEASUREMENT, direct `list_pull_requests`/`get_files` calls, this session.
- Root-cause attribution (CodeQL repo-setting gap): OBSERVATION, inherited
  from issue #10 (2026-09-08), independently reconfirmed tonight via PR #14's
  live check-runs.

## Reward-hack check

No benchmark/gold data/threshold touched. No evaluator exploited. The
discarded candidate was additive-only and would have passed review on its
own merits — it was discarded for redundancy, not defect. This report ships
no code diff, so there is no fitness/benchmark surface to game.

## Security review

No security-sensitive surface touched. This report documents a
repository-settings gap (issue #10) that only a human with repo-admin access
can close; no credential, permission, or scope change is proposed here.

## Darwin

`DARWIN=not-applicable` — no code candidate shipped tonight, no evolvable
population.

## 3 concrete next steps

1. Wire `packages/compile/src/index.ts`'s STEP 1/STEP 2 text to instruct a
   future session to check live open PRs (branch prefix match + title/body
   similarity) for the current night's DEEP surface *before* drafting a
   candidate — the gap three independent nights (#31, #51, tonight) have now
   each manually discovered the hard way. Deliberately not built tonight to
   avoid a 4th rushed-under-pressure implementation after discovering the
   3rd duplicate; worth its own dedicated compiler-parity night.
2. A repo admin should decide on issue #10 (enable GitHub Advanced Security
   code scanning, or remove `codeql.yml` if not wanted) — unblocks every
   other open PR's `unstable` state.
3. A human should triage the 29-PR backlog in the order prior nights have
   already recommended: merge #14 → close #23/#31/#41 as superseded
   reconfirmations (keep #51, distinct) → merge #65 → close #39/#49/#55 →
   resolve the #18-vs-#33 ADR-0003 collision before merging whichever comes
   second → review #12/#33/#58 (ledger/signal honesty + contamination fixes,
   independent and small).

All quantitative claims above are MEASUREMENT (direct tool output, this
session) unless marked OBSERVATION (inherited, independently reconfirmed).

## Witness

Computed from this file's committed git blob, reported in the PR body and
ledger row rather than embedded here — this file deliberately does not embed
its own witness triple (avoids the self-reference bug issue #29 found in
6/10 backfilled nights).
