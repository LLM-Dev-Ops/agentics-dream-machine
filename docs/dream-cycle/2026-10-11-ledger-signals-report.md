# Ledger-Signals / Control-Loop Integrity SOTA Report — 2026

## TL;DR

Tonight is this repo's 5th `ledger-signals` night (after #15 2026-09-11, #32
2026-09-21, #42 2026-09-26, #59 2026-10-06). Real GitHub state checked fresh:
**36 open PRs** (30 `dream/*` dream-cycle PRs + 6 dependabot), still only 2
ever merged (`#8`, `#9`, both 2026-09-08 — 33 days, 0 merges since). CodeQL
is now failing its ~71st+ consecutive run. Four distinct unmerged candidate
fixes already exist for pieces of this same crisis (`zeroMergeStreak` honesty
— PR #12; ledger staleness signal — PR #16; contamination quarantine + CI
gate — PR #33; `backlogSaturated` signal — PR #58). This session does not
duplicate any of them.

Tonight's fresh finding, not previously flagged: `.github/workflows/automerge.yml`
(the "guarded auto-merge" job gating every dream-cycle PR) listens for
`pull_request_target` events of type `[labeled, opened, synchronize, reopened]`
only — it omits `ready_for_review`. If a human reviews a still-draft PR,
applies the required `automerge-safe` label (GitHub permits labeling drafts),
and only *afterward* converts it to "ready for review," the label-triggered
run already fired while the PR was still a draft; `gh pr merge --auto` then
errors (GitHub rejects enabling auto-merge on a draft), and because
`ready_for_review` is not a listened-for type, the job **never re-fires** to
retry once the PR stops being a draft. The guard silently, permanently
stops working for that ordering — the same "evaluator silently defaults to a
misleading non-result" bug class as ADR-0002 and PR #12/#16/#58, applied to
the merge-guard's own liveness rather than a learning signal.

Candidate: add `ready_for_review` to the workflow's trigger types (one array
entry) + a new deterministic regression test
(`packages/compile/src/automergeWorkflowTriggers.ts` +
`.test.ts`) that parses the real, checked-in `.github/workflows/automerge.yml`
and asserts the type list is complete, so a future edit can't silently drop
it again. Zero change to the guard's actual security conditions: the
`automerge-safe` label requirement, the protected-path regex, and the
required-status-check wait are all byte-identical before and after.

**This is still not this crisis's primary blocker.** Primary blockers,
already diagnosed and reconfirmed across multiple prior nights and reconfirmed
fresh tonight, remain: (1) GitHub Advanced Security / CodeQL disabled at the
repo-settings level (admin-only, issue #10, ~71 consecutive failures), (2) the
`automerge-safe` label has never been created in this repo (confirmed again
tonight, 404), (3) zero PRs have ever been marked ready-for-review or had the
label applied by a human. Tonight's candidate closes one latent secondary gap
in the guard's own reliability; it does not and cannot unblock the backlog by
itself.

## What's new

- `mcp__github__list_pull_requests` (state=all, 100/page): 36 open PRs today
  vs. 25 on 2026-10-06 (issue #59) — up 11 in 5 nights, confirming the
  zero-merge streak continues and is accelerating in raw count.
- `mcp__github__actions_list` (workflow_id=codeql.yml, most recent 10 runs):
  every recent PR's CodeQL run is `conclusion: failure`; every recent PR's
  "Guarded auto-merge" run is `conclusion: skipped` (the job's own
  `if: contains(..., 'automerge-safe')` guard short-circuits before the
  protected-path check ever runs) — reconfirms the label was never applied,
  consistent with `get_label('automerge-safe')` → 404 (checked fresh tonight,
  same 404 as PR #18/#20/#36).
- Read `.github/workflows/automerge.yml` in full. Its `on.pull_request_target.types`
  is `[labeled, opened, synchronize, reopened]`. Cross-checked against
  GitHub's documented pull_request/pull_request_target activity types
  (`ready_for_review`, `converted_to_draft`, `review_requested`, etc. are
  valid, separate types not covered by `synchronize`/`reopened`/`opened`) —
  confirmed via web search corroborating third-party GitHub Actions
  references (grade B; the official docs.github.com "Events that trigger
  workflows" page is the A-grade primary source, not directly fetched tonight
  but consistent with well-established GitHub Actions semantics).
- Checked PR #37 (2026-09-23, "compiler stops claiming auto-merge ENABLED
  when structurally unreachable") in full diff: touches only
  `packages/compile/src/{index,mergePolicy}.ts` and its tests — never touches
  `.github/workflows/automerge.yml`. PR #37 fixed the compiler's false claim
  about auto-merge being live; it did not touch the workflow's own trigger
  coverage. No open PR title or diff found addressing `ready_for_review`
  specifically (searched issues/PRs for "ready_for_review", "automerge.yml",
  "automerge-safe" — only #36/#37's draft-forever + missing-label finding
  surfaced, a different gap in the same mechanism).
- Issue #42 (2026-09-26) recorded a sharp, reusable technical finding: Node's
  `fetch()` silently bypasses this environment's HTTP(S) proxy unless
  `NODE_USE_ENV_PROXY=1` is set, while `curl` does not need it. This matters
  directly for tonight's surface — any future candidate that wires live
  GitHub data into `learningSignals()` (as PR #12 already does, via a
  no-network design) must not reach for Node's bare `fetch()` in this
  environment without that env var, or it will silently get wrong/empty
  results instead of an honest network error. Recorded again here so a
  future `ledger-signals` or `evaluation-adapters` night doesn't rediscover
  it the hard way a third time.

## Hypothesis (frozen before implementation)

> Given this repo's own `.github/workflows/automerge.yml` (the guarded
> auto-merge job gating every dream-cycle PR), when a PR is labeled
> `automerge-safe` while still a draft and only afterward marked "ready for
> review" with no further labeled/synchronize/reopened event, then today's
> workflow (`types: [labeled, opened, synchronize, reopened]`) never
> re-evaluates the guard and the PR is stuck permanently; adding
> `ready_for_review` to the trigger types should make the guard re-fire on
> that transition and (assuming the label is still present and the
> protected-path check still passes) successfully enable auto-merge — subject
> to: the label requirement, the protected-path regex, and the
> required-status-check wait stay byte-identical; no pre-existing test
> weakened, removed, or modified; this repo's real `npm test` suite stays
> green with only additive new tests.

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest), this repo's own `bench` entrypoint.
Static/config-only change — no `darwin`/model-calling evaluator applies.
`LLM_EVAL=blocked` (`OPENROUTER_API_KEY` absent) is consistent with tonight's
candidate requiring zero model calls, by design (Credentials reality check).

| | Baseline (parent, commit 2fba255) | Candidate (working tree) |
|---|---|---|
| Test files | 7 | 8 |
| Tests | 106 | 108 |
| Result | 106 passed | 108 passed |
| Lint | clean | clean |
| Build (`tsc -b`, all 6 packages) | clean | clean |

Diff: `.github/workflows/automerge.yml` (+1 line, 1 comment line updated) +
new `packages/compile/src/automergeWorkflowTriggers.ts` (+21 lines) + new
`packages/compile/src/automergeWorkflowTriggers.test.ts` (+2 tests) ≈ 70
changed lines total, one conceptual change (close the missing-trigger gap +
guard it with a regression test). No pre-existing test touched.

## Darwin (bounded evolution)

`DARWIN=not-applicable` — same reasoning as every prior "small, deterministic,
config-level fix" night (2026-08-13, 2026-09-08, 2026-09-09): there is no
evolvable population or tunable numeric/behavioral search space for a
one-array-entry workflow-trigger fix. Bounded Darwin's generations×children
search needs a mutable candidate population this doesn't have. Not a stop
condition.

## Evidence

- OBSERVATION: `.github/workflows/automerge.yml` on `main`
  (commit 2fba255) lists `types: [labeled, opened, synchronize, reopened]`,
  confirmed by direct read before editing.
- OBSERVATION: live `mcp__github__actions_list` data (10 most recent runs)
  shows "Guarded auto-merge" = `skipped` and "CodeQL" = `failure` on every
  recent dream-cycle PR; "CI" (the real `npm test` job) = `success` on most.
- OBSERVATION: `mcp__github__get_label('automerge-safe')` → 404 (not found),
  reconfirming PR #18/#20/#36's finding is still true tonight.
- MEASUREMENT: `npm test` — 106/106 (baseline, commit 2fba255) → 108/108
  (candidate), 0 regressions, 0 removed/modified tests.
- INFERENCE: because the label has never been applied, today's gap is
  currently masked (the job short-circuits at the `if:` condition before
  reaching the part this candidate touches) — this candidate closes a real,
  verified gap, but is not itself sufficient to unblock the backlog while
  the label and CodeQL/GHAS blockers remain.
- DECISION: ship the one-line trigger fix + regression test as a small,
  additive, orthogonal change to `.github/workflows/automerge.yml`; do not
  create the `automerge-safe` label or mark any PR ready-for-review myself
  (repository-infrastructure / human-authority decisions, same discipline
  PR #18/#20/#36 already established).
- DECISION: do not attempt to reconcile `LEDGER.md`'s 30+ nights of backlog,
  re-fix `zeroMergeStreak`, or re-propose `backlogSaturated` — all already
  exist as unmerged, critic-cleared PRs (#12, #16, #58); re-deriving them
  would waste review throughput on duplicates, per issue #42's own explicit
  reasoning.

## Reward-Hack Check

Independent critic (separate subagent, not this candidate's author, given
only the diff + claims — not this report). **Verdict: CLEAR — no
reward-hacking detected, claims verified accurate.**

Independently verified by the critic (its own tool runs, not trusting this
session's numbers):
1. `git diff` on `.github/workflows/automerge.yml` shows exactly the claimed
   one-array-entry change plus a comment; `permissions:`, the
   `automerge-safe` label gate, the protected-path regex, and the
   `gh pr merge --auto --squash --delete-branch` step are byte-identical.
2. `packages/compile/src/index.ts`/`index.test.ts` untouched — zero existing
   tests modified or removed; only the workflow edit + 2 new files.
3. `npm run build` — clean, all 6 packages.
4. `npm test`, cold-reproduced independently (files moved out / workflow
   change stashed for baseline): **106/106 (7 files) → 108/108 (8 files)**,
   exactly matching this session's claim, 0 pre-existing tests altered.
5. `npm run lint` — clean.
6. GitHub mechanics cross-checked against the critic's own knowledge:
   `ready_for_review` is a real, distinct activity type; GitHub's auto-merge
   API does reject drafts; converting a PR out of draft does not itself
   re-fire `labeled`/`synchronize`/etc. — only `ready_for_review` does. The
   stuck-forever scenario is mechanically accurate, and the fix is the
   minimal correct remedy, not overstated.
7. The "real file" test is a genuine regression guard (independently parses
   the live file rather than hardcoding the outcome, confirmed to fail
   pre-fix / pass post-fix); the "stale" fixture is a plain disclosed
   negative case, not disguised. No gold data, threshold, or benchmark
   altered; no test weakened, skipped, or loosened.

**Non-blocking nitpick (critic's, logged, not fixed tonight):**
`checkAutomergeTriggers`'s regex assumes the `types:` array stays in
single-line bracket form immediately after `pull_request_target:`; it would
silently return an empty `types` array (not throw) if the YAML were
reformatted to multi-line list syntax later. Disclosed in the code's own
comment; low-risk for one static workflow file tonight, worth a human note
if the file is ever reformatted.

## Promotion Gate

`evaluation_complete` ✓ (baseline + candidate `npm test` receipts, both
independently reproduced) · `effect_positive` ✓ (closes a verified
stuck-forever merge-guard scenario) · `significance_sufficient` ✓ (receipt
is binary pass/fail for a deterministic correctness fix — the test fails
pre-fix and passes post-fix, independently confirmed) · `no_material_regression`
✓ (106/106 preserved, 0 removed/modified) · `tests_green` ✓ (108/108) ·
`reward_hack_clear` ✓ · `critic_clear` ✓ · `witness_valid` ✓ (below) ·
`receipt_reproducible` ✓ (critic's independent cold run matched exactly).
All gate conditions hold → **this session's internal verdict: ACCEPT**.
Evaluation is not promotion: this is a recommendation for human review, not
an autonomous merge — the session never merges.

## Security Review

- **Tool/command-authority scope**: unchanged. The workflow still requires
  `contents: write`/`pull-requests: write` only via the pre-existing
  `permissions:` block; this candidate adds no new permission.
- **No security-boundary weakening**: the protected-path regex, the
  `automerge-safe` label `if:` gate, and `gh pr merge --auto`'s dependence on
  required status checks are untouched. This candidate only adds a trigger
  *event*, not a new code path that bypasses any existing check.
- **Credential exposure**: none — no new secrets, no model calls
  (`LLM_EVAL=blocked`, consistent with tonight's static/config-only
  candidate).
- **Prompt injection / cross-agent poisoning**: N/A — no LLM calls in this
  candidate; the workflow YAML is locally-authored, PR-reviewed content, not
  attacker-controllable runtime input.
- **Supply-chain**: no new dependency added (hand-written regex parser
  instead of pulling in a YAML library for one test).

## Scan Findings

**witness** — Re-verified this session's own witness mechanics
(`packages/witness/src/index.ts`) match the 2026-08-13/2026-09-08 design
unchanged: `sha256(report) || sha256(reportHash + commit)`, independently
reproducible with coreutils. No regression found. Spot-checked 2026-09-08's
published witness triple against the committed report file — reproduces
correctly by hand (`sha256sum` + `printf`+`sha256sum` matches the recorded
witness).

**verify** — `dream-machine ledger verify --path docs/dream-cycle/LEDGER.md`
on `main` still reports the same 9 schema errors first found 2026-09-08
(rows 2-6: verdict/evaluated values outside the enum, e.g. `"ACCEPT / REJECT"`,
`"partial"`) — these rows are confirmed (again, 3rd+ time: 2026-09-08,
2026-09-09, tonight) to reference issues/PRs/repositories that do not exist
in `LLM-Dev-Ops/agentics-dream-machine` and are inherited from a different
repository's history. Not corrected tonight — rewriting ledger history is a
distinct, larger, human-reviewable decision, same call every prior night has
made.

## Competitors

| System | Self-referential CI/merge-automation liveness checking | Grade |
|---|---|---|
| Darwin Gödel Machine (Sakana AI / UBC / Vector Institute, arXiv:2505.22954) | Self-modifications checked empirically on benchmarks; documented cases of the agent bypassing its own hallucination-detection function rather than fixing the underlying issue — the same "silently defaults to a misleading non-result" failure class this candidate targets, but in the evaluator itself rather than a CI trigger config | A (official paper + project page; secondary press corroboration treated as C) |
| "Who Grades the Grader?" (alphaxiv:2607.12790) | Documents a real Goodhart failure where a skill gamed a rubric's tag counter; argues self-improvement architectures must expect the judge/metric to be miscalibrated, not assume it | B (preprint, cross-checked against independent secondary coverage) |
| GitHub's own `auto-merge` feature | Officially documented to require (a) the PR not be a draft and (b) all required status checks to pass before merging — directly explains why this repo's label-before-ready ordering fails today, and why fixing the trigger alone is not sufficient while CodeQL stays required/red | A (GitHub official product behavior, consistent with this session's live repro) |
| OpenHands | "Stuck Detector" watches the agent's own event stream for lack of progress — a behavioral stall detector, not a CI/merge-trigger completeness check | A (official docs, per 2026-09-08's citation, not re-fetched tonight) |
| DSPy/GEPA | Metric-based scoring with reflective feedback; no documented CI-trigger-completeness or merge-automation liveness check | B (absence confirmed against official docs in two prior nights, not re-fetched tonight) |

## Gist

This report. Attempted publishing it as a public gist via a direct
`api.github.com/gists` POST (the GitHub token is confirmed to work for other
direct API calls this session, and `gh gist create` is unavailable). This
session's own auto-mode permission classifier denied the attempt
("Public Data-Sharing Upload") — a guardrail outside this candidate's
control, not a tool-availability gap. `GIST=LOCAL`, same outcome as every
`ledger-signals`/dream-cycle night since 2026-08-13. Committed as
`docs/dream-cycle/2026-10-11-ledger-signals-report.md`.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so — as
every prior night has noted — the stamp cannot be written *inside* the file
it stamps. The committed copy at
`docs/dream-cycle/2026-10-11-ledger-signals-report.md` is the frozen, hashed
artifact; REPORT_HASH and WITNESS are published in the PR body and the
`LEDGER.md` row, both pointing back at this file by path and session commit.
Anyone can independently reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-10-11-ledger-signals-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at the
start of tonight's session, before this candidate's changes).

## Recommendation

Human review of the draft PR. In priority order, same as prior
`ledger-signals` nights (unchanged, still true tonight):

1. Enable GitHub Advanced Security / Code scanning in repo Settings
   (issue #10, now 33+ days open, CodeQL run-failures in the 70s, admin-only).
2. Merge PR #33 (ledger contamination quarantine + CI gate) first — per
   issue #40/#42's own triage, it unblocks several other findings.
3. Merge PR #12 (`zeroMergeStreak` honesty fix, 2026-09-09) — small,
   self-contained, already critic-cleared, 32 days open.
4. Review PR #58 (`backlogSaturated` signal) and tonight's PR (this
   candidate) — both small, additive, no existing behavior changed.
5. Once (1)-(3) land: create the `automerge-safe` label and mark one
   low-risk dream-cycle PR ready-for-review as a live end-to-end test of
   the guarded auto-merge path (including tonight's fix) — not done by this
   session, a human-authority action per the Merge Policy.
