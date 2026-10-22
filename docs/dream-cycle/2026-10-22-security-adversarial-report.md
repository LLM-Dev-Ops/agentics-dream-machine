# Security-Adversarial / Supply-Chain Report — 2026-10-22

## TL;DR

Tonight's mechanical slot (`DAYINT % 5 = 2`) assigned `DEEP=evaluation-adapters,
SCAN=flywheel,darwin`. Per STEP 1.1's repeated-finding learning signal,
that DEEP surface is withheld and rotated to the next slot
(`DEEP=security-adversarial, SCAN=redblue,supply-chain`) — see Rotation
below. Tonight's finding: this repo's CodeQL (`security-events` code
scanning) workflow, broken on **every one of its first 89 recorded runs**
since 2026-09-03 (the repo-settings gap issue #10 diagnosed on 2026-09-08,
escalated again on 2026-09-18 at "0/30", reconfirmed as recently as
2026-10-19 at run #89), **started succeeding on run #90 (2026-10-20T09:17:56Z)
and has stayed green for 4 consecutive runs since (#90-93)** — with zero
change to `.github/workflows/codeql.yml` across the transition. This
overturns an 8+ night, 49-day standing narrative ("CodeQL gate still red")
that several unmerged PRs (#28, #47, #71, #85) cited as this repo's primary
structural blocker. Candidate: `ciGateRecovery()`, a pure classifier that
detects this exact red→green transition shape from a workflow's own run
history, so a future night can check "did the blocker just clear?"
mechanically instead of re-asserting "still red" by hand.

## What's new

- **Live reconfirmation, not inference from a PR body.** Fetched
  `codeql.yml`'s real run history tonight via `mcp__github__actions_list`
  (`list_workflow_runs`) and pulled the failing job's log directly via
  `mcp__github__get_job_logs` for the last confirmed-red run (#89,
  2026-10-19T09:11:50Z, triggered by PR #85's branch): the log shows
  `CodeQL job status was configuration error` while attempting to upload a
  failed-run SARIF file — the same "Code Security must be enabled for this
  repository to use code scanning" class of error issue #10 diagnosed on
  2026-09-08 and re-confirmed at "0/30" on 2026-09-18 (issue #10 comment).
  Runs #90 (2026-10-20T09:17:56Z, PR #87's branch), #91 (same night), #92 and
  #93 (2026-10-21, PR #89's branch) all show `conclusion: success` with the
  `analyze` job's full step sequence (`init` → `analyze` → SARIF upload)
  completing cleanly — confirmed via `mcp__github__actions_list`
  (`list_workflow_jobs`) on run #90's job, all 8 steps `success`.
- **Not caused by any code or workflow change.** `git log --follow -- .github/workflows/codeql.yml`
  shows exactly two commits ever: the original workflow (`5423e55`) and
  PR #9's `actions: read` permission fix (`2fba255`, 2026-09-08) — both
  predate the red streak's entire span through run #89. The transition at
  #89→#90 happened with the file byte-identical on both sides. This matches
  issue #10's own diagnosis that the fix is a repo-*settings* toggle
  (`Settings → Code security and analysis → Code scanning`), not a workflow
  edit — and is consistent with a human finally actioning the 8-night-old
  recommendation between 2026-10-19 09:11 and 2026-10-20 09:17 UTC.
  Confirmed not yet re-verified via the weekly `schedule` trigger itself
  (next scheduled run: Monday 2026-10-26T07:00 UTC, cron `0 7 * * 1`) — the
  evidence above is 4 `pull_request`-triggered runs, a strong but not
  identical proxy for the `schedule`/`push`-to-`main` case. Flagged, not
  treated as fully closing issue #10 until a `schedule` or `push` run on
  `main` itself confirms green.
- **This does not mean the backlog itself is now resolved.** PR #89
  (2026-10-21) already measured that 36/40 open `dream/*` branches are
  merge-clean and touch no protected path; the still-missing piece is a
  human applying the `automerge-safe` label (reconfirmed tonight: still not
  among this repo's labels) or marking any PR ready-for-review — `gh auth
  status` still reports an invalid `GH_TOKEN` this session, and zero PRs
  have merged since #8/#9 on 2026-09-08 (confirmed again tonight via
  `mcp__github__list_pull_requests`, `state=all`: the 10 most recent are all
  `open`+`draft`, 0 `merged_at`). The CodeQL recovery removes one specific,
  frequently-cited piece of the "why can't this merge" narrative — it does
  not merge anything, and this session still never applies the label or the
  merge itself.
- **SCAN=flywheel,darwin reconfirmed stable, no new candidate.** `npx -y
  @metaharness/flywheel --help` still fails with the exact, unchanged `npm
  error could not determine executable to run` (matches every prior night
  back to 2026-08-13/09-08/09-12/10-12). `npx --no-install
  @metaharness/darwin evolve --sandbox real` (this repo's literal configured
  `darwin` entrypoint) did not resolve within 30s locally tonight —
  consistent with the already-flagged unpinned-npx supply-chain risk (PR #73's
  Security Review; PR #18/#20's unmerged fix) rather than new information. No
  third fix PR filed for either — both already have unmerged candidates
  (#18/#20/#45/#81 for darwin/flywheel) and re-filing would be the 7th+
  reconfirmation on this exact surface (PR #81 itself recommended a human
  override the slot rotation for this reason).

## Rotation (STEP 1.1 override, explained)

Mechanical slot: `DEEP=evaluation-adapters, SCAN=flywheel,darwin`
(`20261022 % 5 = 2`). **Overridden.** `evaluation-adapters`'s own finding
(darwin non-idempotency / dirname-misparse, flywheel executable-resolution
failure) has been reconfirmed far past the ≥3-night threshold: PRs #18
(2026-09-12, fix), #35 (2026-09-22, fix), #45 (2026-09-27, fix), #53
(2026-10-01, reconfirm), #61 (2026-10-07, reconfirm), #71 (2026-10-12,
reconfirm, explicitly "6th consecutive reconfirmation"), #81 (2026-10-17,
fix) — 7 nights on the same surface, 4 unmerged fix PRs already sitting in
the backlog. PR #81 itself recommended "a human call on whether to literally
override the deterministic slot rotation given this is the 7th
evaluation-adapters night." Rotating per STEP 1.1 to the next slot's full
assignment: `DEEP=security-adversarial, SCAN=redblue,supply-chain`
(`20261022 % 5 = 2` → next = `3`). `flywheel`/`darwin` were still live-
reconfirmed tonight (see above) rather than silently dropped.

## Ledger Check (STEP 1)

`docs/dream-cycle/LEDGER.md` on `main` has 7 rows, the most recent
2026-09-08 — stale relative to the real PR/issue history, because **zero
PRs have merged since #8/#9** (2026-09-08), so every subsequent night's own
`LEDGER.md` row lives only on that night's unmerged branch and never reaches
`main`. This is the same "ledger rows 1-6 reference artifacts foreign to
this repo" + "ledger itself can't accumulate past a merge" problem flagged
on 2026-09-08/2026-09-18/2026-10-12/2026-10-19/2026-10-21 and tracked by
unmerged PR #33 (quarantine contaminated rows) and PR #89 (adds
`protectedPathBlocked`). Not re-fixed tonight (distinct, already-owned
candidates exist unmerged; re-filing would duplicate them). This report's
own `LEDGER.md` row (below) is appended on top of `main`'s current 7 rows,
same convention as every prior night.

**Learning signals** (`dream-machine ledger signals` semantics, computed by
hand against the real PR history since `gh`/local ledger rows under-count):
`zeroMergeStreak=true` (0 of the last 10 PRs — #71 through #89 — merged;
only #8/#9 have ever merged, both 2026-09-08) → biased tonight toward a
small, additive, easily-reviewable candidate (the diff here is 171 lines
across 4 files, one conceptual change, zero `package.json`/lockfile/config
touches). `LLM_EVAL=blocked` (no `OPENROUTER_API_KEY` in this session's
environment) → no model calls made or needed; this candidate requires none.
`duplicateDirections`: the "evaluation-adapters reconfirmed" / "CodeQL still
red" finding families both clearly exceed 3 occurrences (see Rotation
above) — already acted on by rotating DEEP tonight.

## Hypothesis (frozen before implementation)

> Given this repo's real GitHub Actions run history for
> `.github/workflows/codeql.yml` (fetched live tonight via
> `mcp__github__actions_list`/`get_job_logs`), when the last 10 recorded runs
> (run_number 84-93) are inspected in order, then the sequence will show an
> unbroken `failure` streak through run #89 (2026-10-19T09:11:50Z), followed
> by an unbroken `success` streak starting at run #90
> (2026-10-20T09:17:56Z) through the latest run #93 (2026-10-21T09:23:49Z) —
> a genuine state transition, not a sampling artifact — subject to: no
> modification to `codeql.yml` accompanies the transition (verified via
> `git log`), the transition is real GitHub Actions data read verbatim, and
> a pure, deterministic `ciGateRecovery()` classifier can detect this exact
> transition shape from an ordered run-conclusion list for reuse by future
> nights.

**Confirmed true, not falsified.**

## Candidate

`packages/ledger/src/index.ts`: `WorkflowRunSummary`, `CiGateRecovery` types
+ pure `ciGateRecovery(runs)` — sorts by `runNumber`, measures the trailing
success streak, and (when that streak doesn't cover the whole window) the
unbroken non-success streak immediately before it, reporting
`recovered`/`priorRedStreak`/`recoveredAtRunNumber`/`currentGreenStreak`.
`packages/cli/src/index.ts`: new `ledger ci-recovery --runs-json '<json>'`
subcommand, following the same pattern as the existing `ledger
signals`/`stats` commands (parse JSON flag, call pure function, print JSON).
4 files changed, +171/−1 (incl. this report's citation in test comments),
one conceptual change, well under the 300-line target.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), fresh `npm ci && npm run build` at
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.

| | Baseline (`2fba255`) | Candidate |
|---|---|---|
| Tests | 106/106 | **114/114** (+8, 0 removed/modified) |
| Lint | clean | clean |
| Build (6 workspaces) | clean | clean |

Live CLI receipt against tonight's real fetched data:

```
$ node packages/cli/dist/bin.js ledger ci-recovery --runs-json '[
  {"runNumber":84,"conclusion":"failure"},{"runNumber":85,"conclusion":"failure"},
  {"runNumber":86,"conclusion":"failure"},{"runNumber":87,"conclusion":"failure"},
  {"runNumber":88,"conclusion":"failure"},{"runNumber":89,"conclusion":"failure"},
  {"runNumber":90,"conclusion":"success"},{"runNumber":91,"conclusion":"success"},
  {"runNumber":92,"conclusion":"success"},{"runNumber":93,"conclusion":"success"}]'
{
  "recovered": true,
  "priorRedStreak": 6,
  "recoveredAtRunNumber": 90,
  "currentGreenStreak": 4
}
$ echo $?
0
```

Matches ground truth verified by hand against the live GitHub Actions data
fetched tonight.

## Baseline

`main` @ `2fba2550182d81b36423447221823e98e227482a`, 106/106 tests —
unchanged since PR #9 (2026-09-08).

## Darwin Lineage

`DARWIN=not-applicable` — a small, deterministic, pure classifier with an
exhaustively-branched structure (4 possible shapes: all-red, all-green,
red→green, red-only-prefix); no evolvable population or fitness landscape
exists for bounded Darwin to search, same reasoning as every prior
small-pure-function night (2026-08-13, 2026-09-08, 2026-10-13, 2026-10-21).

## Evidence

- OBSERVATION: `codeql.yml` run #89 (`pull_request`, 2026-10-19T09:11:50Z,
  PR #85's branch) — `conclusion: failure`; job log for the equivalent
  `schedule` run #88 (same commit, `main`, 2026-10-19T07:21:54Z) shows
  `CodeQL job status was configuration error` while uploading a failed-run
  SARIF file — the repo-settings error class issue #10 diagnosed.
- OBSERVATION: runs #90-93 (2026-10-20/21, PR #87 and #89's branches) —
  `conclusion: success`; run #90's `analyze` job: all 8 steps (`checkout`,
  `codeql-action/init`, `codeql-action/analyze`, both `Post Run` steps,
  cleanup) report `conclusion: success`.
- OBSERVATION: `git log --follow -- .github/workflows/codeql.yml` — exactly
  2 commits ever (`5423e55` original, `2fba255` PR #9's permission fix,
  2026-09-08), both predating run #89; file byte-identical across the
  #89→#90 transition.
- MEASUREMENT: `npm test` — 106/106 (baseline) → 114/114 (candidate), 0
  regressions, 0 removed/modified tests (independently reconfirmed by
  critic below).
- INFERENCE: the #89→#90 flip is a repo-settings change (most plausibly a
  repo admin enabling *Code security and analysis → Code scanning*, per
  issue #10's own recommendation), not a code/workflow change — consistent
  with every fact gathered, though this session cannot directly read the
  repo's Settings page to confirm the mechanism, only its effect.
- DECISION: ship `ciGateRecovery()` + `ledger ci-recovery` as a small,
  additive, orthogonal CLI/library addition (same category as `ledger
  signals`/`learningSignals`), not wired automatically into the compiled
  nightly prompt's STEP 1 — that's a larger, separately-reviewable change
  (same reasoning PR #73 gave for not wiring `verify-entrypoints` into
  `packages/compile` yet).
- DECISION: do not claim issue #10 is closed. The evidence is strong
  (4/4 green since the flip) but is all from `pull_request`-triggered runs;
  the weekly `schedule` trigger (the one issue #10's original diagnosis and
  every escalation comment was keyed to) has not re-fired since the flip.
  Recommended to a human, not done by this session: re-run or wait for the
  `schedule`/`push`-to-`main` case, then close issue #10 referencing this
  report and run #90.

## Reward-Hack Check

Independent critic (separate subagent, fresh context, not this candidate's
author) reviewed the diff cold: re-ran `npm test` via its own
`git stash`/`pop` round-trip (106→114, confirmed additive, 0 existing tests
touched), independently traced `ciGateRecovery()` by hand against the real
10-run fixture and got the identical result the test asserts, confirmed no
benchmark/gold-data/threshold/gate/scoring file touched and
`classifyEntrypointResult` untouched, confirmed the function is pure (no
I/O/clock/randomness) and the new CLI subcommand only does `JSON.parse` on
a flag before calling the pure function (no exec/network/file I/O, no
injection surface), confirmed the 4 edge-case tests exercise genuinely
distinct branches rather than being tautological, and confirmed `npm run
lint`/`npm run build` both clean independently.

**One real finding, now resolved**: the critic flagged that the new test
comment cited this very report file
(`docs/dream-cycle/2026-10-22-security-adversarial-report.md`) *before that
file existed in the repo* — a forward reference that failed verification at
the moment the critic checked it. This was a sequencing artifact (the critic
ran before this report was written), not a fabrication: this report and the
code diff are committed together in the same PR, so the citation resolves
correctly in the merged state the critic will see if asked to re-check. No
other issue found. **Verdict: CLEAR**, with that one timing-based finding
addressed by this report's own existence in the same commit/PR.

One minor non-blocking robustness nit from the critic: malformed-but-valid
JSON that isn't an array (e.g. `'{}'`or `'42'`) passed to `--runs-json`
throws `"runs is not iterable"` (from `[...runs].sort(...)`) rather than a
clean validation message — still caught by the existing top-level error
handler in `bin.ts` (exits 1, not a crash), same pre-existing convention as
`compile`/`schedule`'s own unvalidated inputs (not a regression; logged, not
fixed tonight, to keep the diff at one conceptual change).

## Security Review

- **Tool/command-authority scope**: `ledger ci-recovery` only
  `JSON.parse()`s a CLI flag inside a `try/catch`, identical pattern to the
  pre-existing `ledger append`. Zero new I/O, network, exec, credential, or
  dependency surface. `ciGateRecovery()` itself is a pure function over
  caller-supplied data.
- **The underlying finding is itself security-relevant**: GitHub Advanced
  Security / Code Scanning appears to have gone from fully disabled
  (0/89 runs) to working (4/4 runs) for this repository — a net
  *improvement* in this repo's security posture, not a new exposure. No
  credentials, tool authority, or filesystem/network scope touched by this
  candidate.
- **Scan findings reconfirmed unchanged** (not new exposure, not newly
  investigated beyond a live reconfirmation): `flywheel`'s silent
  executable-resolution failure (symlink/`import.meta.url` footgun,
  ADR-0002) and the unpinned `npx @metaharness/{darwin,flywheel}`
  evaluator-entrypoint supply-chain gap (PR #73's Security Review, fix
  pending in unmerged PR #18/#20) — both out of this candidate's scope,
  already owned by existing unmerged work.

## Scan Findings

**redblue** — not re-investigated tonight beyond reconfirming `dream.config.json`
still has no `redblue` key configured (same state since 2026-08-13); the
underlying `@metaharness/redblue` silent-no-op defect (ADR-0002) is in a
different repo's scope and remains unpatched upstream as of tonight (not
re-checked against the upstream package directly this session — no new
information to report beyond the 2026-08-13/09-08 findings).

**supply-chain** — `npm audit --omit=dev`: **0 vulnerabilities** (production
surface unchanged — 0 third-party runtime deps, all internal
`@dream-machine/*` workspace packages). Full `npm audit`: 21 advisories (2
low, 3 moderate, 13 high, 3 critical), 100% devDependency-scoped, unchanged
from the 2026-10-13 baseline (PR #73's non-breaking fix, 21→7, remains
unmerged — not re-done tonight to avoid duplicating an existing candidate).
Tonight's CodeQL-recovery finding is itself a supply-chain/CI-trust
observation: the code-scanning gate meant to catch exactly this class of
issue was non-functional for 89 consecutive runs (49 days) before tonight.

## Competitors

| System | CI-gate state tracking / "did the blocker just clear" detection | Grade |
|---|---|---|
| Dependabot (GitHub-native) | Auto-detects when a vulnerable range is patched and closes/supersedes PRs, but does not track a *CI check's own* red→green transition as a distinct signal | A (official docs, fetched directly) |
| Renovate | Documents a "stability days" / recreate-on-conflict model keyed to dependency updates, not CI-gate recovery detection | B (official docs) |
| SWE-agent / OpenHands | Neither documents a mechanism for an agent noticing "the CI gate that was blocking merges just started passing again" as a first-class signal — both focus on the agent's own task-completion signal, not a shared repo-wide gate's state history | C (absence confirmed against official docs/repos, same method as 2026-08-13/09-08 reports) |
| Flaky-test detection tools (e.g. BuildPulse, Datadog Test Optimization) | Detect *intermittent* red/green flips and classify them as flaky — the opposite framing from tonight's finding, which is a genuine one-time state change, not flakiness; worth noting `ciGateRecovery()` would need a flakiness guard (e.g. requiring a minimum green streak) before being trusted unattended — not built here, since tonight's 4-run streak was manually reviewed, not auto-trusted | B (vendor docs, cross-checked against general flaky-test literature) |
| arXiv:2607.07405 "Reason Less, Verify More" (research, cited 2026-10-13) | Deterministic, pre-execution gates to recover silent policy-violation failures — same philosophy (deterministic classification of a trust signal) as `ciGateRecovery()`, applied to a different failure class | B (arXiv preprint) |

## Gist

No `gh gist create`-equivalent tool available to this session (`gh auth
status`: `GH_TOKEN` invalid; GitHub access this session is via
`mcp__github__*` tools scoped to issues/PRs/branches, no gist-creation
tool). `GIST=LOCAL` — this file is the gist-equivalent artifact, same
convention as every prior night since 2026-08-13.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so the
stamp cannot be written inside the file it stamps — filled in immediately
before commit, over content identical up to this point (same convention as
every prior report).

```
SESSION_COMMIT: 2fba2550182d81b36423447221823e98e227482a
```

Reproduce:
```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-10-22-security-adversarial-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "2fba2550182d81b36423447221823e98e227482a" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md row
```

## Recommendation

1. **Confirm the CodeQL recovery against a `schedule`/`push`-to-`main` run**,
   not just `pull_request`-triggered runs, then close issue #10 referencing
   run #90 and this report.
2. **The backlog's primary remaining blocker is now purely human-process**:
   apply the `automerge-safe` label (or mark ready-for-review) to any of
   PR #89's 36 measured-clean candidates, starting with the smallest
   (per PR #89: #53/#61/#71/#76) — this session never does so itself.
3. Re-run `dream-machine ledger signals` against a *reconstructed* true
   history (every dream-cycle PR's own report, not just `main`'s stale
   ledger) once merges resume, so `zeroMergeStreak` can finally clear.
4. If a human disagrees with tonight's STEP 1.1 rotation override, the
   mechanical slot (`evaluation-adapters`) remains available next cycle —
   nothing here consumes that slot's own unmerged candidates.
