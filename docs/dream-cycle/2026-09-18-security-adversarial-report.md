# Security-Adversarial / Supply-Chain SOTA Report — 2026

## TL;DR

Tonight is `DAYINT=20260918`, `SLOT=3` → `DEEP=security-adversarial`,
`SCAN=redblue,supply-chain` — the same slot as 2026-08-13, 2026-09-08 and
2026-09-13. All three of this slot's natural candidates already exist as
unmerged, unreviewed draft PRs (`verify-entrypoints` in #8/closed-not-merged,
`verify-supply-chain` in #20). Shipping a fourth would duplicate #20's
`assessSupplyChainPin()` almost exactly. Tonight instead (a) reconfirms both
scans against live state with fresh counts, and (b) escalates one finding
with materially new evidence: **CodeQL has never once passed in this
repository** — 0/30 runs green since the workflow was added
(2026-09-03T20:35:27Z) through tonight, a fact issue #10 (filed 2026-09-08,
5 data points) did not have. Root cause unchanged from #10's diagnosis: a
repo-Settings gap ("Code Security must be enabled"), not a code defect — no
diff this session can write fixes it. No new candidate PR opened tonight;
one comment added to #10 with the full 30-run count, and this rotation's
findings filed as a new issue cross-linking #10/#19/#20 rather than
re-diagnosing what's already correctly diagnosed.

## What's new

- **CodeQL: 0/30 runs green, no exceptions, since the workflow's first run.**
  `mcp__github__actions_list` (`codeql.yml`, all 30 recorded runs,
  2026-09-03T20:35:27Z → 2026-09-17T09:16:33Z) — every single run,
  `push`/`pull_request`/`schedule` alike, `conclusion: failure`. Issue #10
  (2026-09-08) correctly diagnosed the root cause from 5 runs; tonight
  confirms it holds for the full history and quantifies it precisely for the
  first time. Job log for the latest run (105145969608, 2026-09-17) confirmed
  by hand tonight:
  ```
  ##[warning]Code Security must be enabled for this repository to use code scanning. - https://docs.github.com/rest
  ##[error]Please verify that the necessary features are enabled: Code Security must be enabled for this repository to use code scanning. - https://docs.github.com/rest
  ```
  This is a `Settings → Code security and analysis` toggle, not a workflow
  YAML defect — PR #9 (`actions:read`, merged 2026-09-08) did not and could
  not fix it, exactly as #10 already concluded. No packages/* diff exists
  that resolves this; it is out of this session's authority (no repo-admin
  access) and is filed as a human action item, not a candidate.
- **redblue** — `dream.config.json#evaluatorEntrypoints` still has no
  `redblue` key (unchanged since 2026-08-13, 4th consecutive check). The
  original 2026-08-13 finding (npm bin-symlink `import.meta.url` footgun
  causing a silent exit-0/empty-output no-op) is unpatched upstream and
  outside this repo's scope; nothing new to classify.
- **supply-chain** — fresh `npm ci && npm audit --json` tonight: **9
  advisories** (2 critical, 2 high, 3 moderate, 2 low), identical to
  2026-09-13's count — unchanged for a 5th consecutive night. Still 100%
  confined to devDependencies (`prod: 13`, all internal
  `@dream-machine/*` workspace packages; `dev: 269`). Fix still sits in
  dependabot PR #1, now **15 days open** (since 2026-09-03T20:37:30Z),
  untouched.
- **This slot's natural candidate is already built and unmerged.** PR #20
  (2026-09-13, still open/draft) ships `assessSupplyChainPin()` +
  `verify-supply-chain` — a pure, static classifier flagging exactly the
  unpinned `npx @metaharness/darwin evolve --sandbox real` entrypoint this
  slot has flagged in prose since 2026-08-13. Confirmed tonight: `main`'s CLI
  `--help` output (fresh build, commit `2fba255`) has no `verify-supply-chain`
  command — PR #20 has not merged. Re-implementing it would strictly
  duplicate an existing, already-critic-reviewed diff; not done.
- **Backlog, reconfirmed and grown.** `node packages/cli/dist/bin.js ledger
  signals` on `main`'s real `LEDGER.md` tonight: `zeroMergeStreak: true`,
  `nightsConsidered: 7`. `list_pull_requests` (state=all) tonight: **9** open
  draft dream-cycle PRs (#12, #14, #16, #18, #20, #22, #23, #24, #26),
  spanning 2026-09-09 → 2026-09-17, zero merged since #8/#9 on 2026-09-08 —
  up from 7 open PRs on 2026-09-16's count. `ledger verify` on `main`'s
  `LEDGER.md`: still the same 9 pre-existing structural errors on rows 2–6
  (unchanged, now confirmed a 6th consecutive night).

## Hypothesis (frozen before evaluation)

> Given this repo's `.github/workflows/codeql.yml` `analyze` job, when its
> full recorded run history (all runs since the workflow's first trigger) is
> inspected via the GitHub Actions API and one representative run's job log
> is read directly, then every run should show `conclusion: failure` with the
> job log's failure reason matching issue #10's diagnosed root cause
> ("Code Security must be enabled for this repository to use code scanning",
> a repo-Settings gap) rather than any code- or workflow-permissions-level
> defect — subject to: no repository setting is changed by this session, no
> workflow file is edited, and the count is taken from the real API response,
> not inferred from a sample or a prior night's report.

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest), this repo's own `bench` entrypoint —
run to confirm tonight's baseline is unaffected by an evidence-only night.

| | main @ `2fba255` (baseline = tonight's candidate; no code diff) |
|---|---|
| `npm ci` | clean |
| `npm run build` (tsc -b, all 6 packages) | clean |
| Test files | 7 |
| Tests | 106 passed / 106 |
| `npm audit --json` | 9 advisories (2 critical, 2 high, 3 moderate, 2 low) |
| `ledger signals` | `zeroMergeStreak: true` |
| `ledger verify` | 9 pre-existing errors, 0 new |
| CodeQL run history (`actions_list`, `codeql.yml`) | 30/30 runs `conclusion: failure`, 0 green |

No `packages/*` diff tonight — see Testability Gate. This report + one
`LEDGER.md` row + one issue comment is tonight's only change surface.

## Testability Gate

The one genuinely new claim tonight (0/30 CodeQL runs, not "still red") is
testable and was tested (above) — it is a `packages/`-external, repo-Settings
fact, not a code candidate. No code candidate was selected tonight:
re-implementing PR #20's static pin-checker would be a duplicate diff against
an already-open, already-critic-reviewed PR, which the "don't rediscover a
failed [or already-pursued] direction" discipline and the zero-merge-streak
learning signal both argue against — the correct action for a fully-serviced
slot with a growing, unreviewed backlog is not a fifth stacked draft PR.
`EVALUATED=no`, `VERDICT=INCONCLUSIVE`, reason: no new testable code
candidate existed for this slot tonight that would not duplicate #20.

## Darwin (bounded evolution)

Not run. `DARWIN=not-applicable` — no code candidate exists tonight to
evolve a population around (same reasoning as every non-architectural night
with no diff, e.g. 2026-08-13, 2026-09-08).

## Evidence

- OBSERVATION: `mcp__github__actions_list` (`codeql.yml`, 30/30 runs,
  2026-09-03 → 2026-09-17) — every run `conclusion: failure`.
- OBSERVATION: job log for run 35204225216 / job 105145969608 (2026-09-17,
  latest at session start) — failure step is `github/codeql-action/analyze@v3`,
  reason quoted verbatim above; matches issue #10's originally diagnosed
  error string exactly, 10 nights later.
- MEASUREMENT: `npm audit --json` on a fresh `npm ci` tonight — 9 advisories
  (2 critical/2 high/3 moderate/2 low), identical to 2026-09-13's count.
- MEASUREMENT: `npm test` — 106/106, unchanged from main's last recorded
  baseline (2026-09-08 ledger row 9).
- MEASUREMENT: `ledger signals` — `zeroMergeStreak: true`; `list_pull_requests`
  (state=all) — 9 open dream-cycle draft PRs, 0 merged since 2026-09-08.
- INFERENCE: because CodeQL's failure is a repo-Settings gap and not a
  required-check-blocking-merge question this session can verify (no branch-
  protection-rules API tool available in this session's toolset), whether
  CodeQL's permanent red status is *also* mechanically blocking the 9-PR
  backlog from merging (vs. simply nobody having reviewed them) is not
  established tonight — flagged as an open question for human triage, not
  asserted as fact.
- DECISION: do not open a duplicate root-cause issue for CodeQL; comment on
  #10 with the escalated count instead. Do not re-implement PR #20's
  candidate. File tonight's rotation as one new issue that cross-links #10,
  #19, #20 rather than restating their content.

## Reward-Hack Check

No code diff exists tonight to critique for weakened tests, cherry-picking,
or evaluator exploitation — the only quantitative claims are the CodeQL
run-history count and the `npm audit`/`npm test`/`ledger` numbers above, each
taken directly from a live tool call this session made and quoted with its
source command. An independent critic subagent re-ran `npm audit --json`,
`npm test`, and re-fetched the CodeQL workflow-run list independently
tonight; all three reproduced the same figures (9 advisories, 106/106,
30/30 failing). **CLEAR** — no reward-hacking surface exists without a
candidate diff.

## Security Review

- **Tool/command-authority scope**: only read-only GitHub API calls
  (`list_pull_requests`, `list_issues`, `actions_list`, `get_job_logs`,
  `issue_read`, `pull_request_read`) plus local `npm ci`/`npm run
  build`/`npm test`/`npm audit`/`dream-machine ledger …` were run tonight.
  One issue comment and one new issue are the only write actions against
  GitHub; no file, label, merge, or settings change.
- **CodeQL finding itself**: a repo-Settings gap that leaves this repo
  without any static security scanning coverage for 15 days running (0/30
  runs ever succeeded) is itself a security-relevant gap — it does not mean
  any specific vulnerability exists, but it means CodeQL's `security-extended`
  query suite has not actually run against a single commit or PR in this
  repo's history. Escalated via issue comment, not fixed (outside this
  session's authority: requires repo-admin access to GitHub Settings).
- **Supply-chain**: 2 critical / 2 high advisories, 100% devDependencies,
  fix already open 15 days as dependabot PR #1 — this session does not
  merge or enable auto-merge on it (never self-promotes).
- **Credential exposure**: none — no secrets handled, `LLM_EVAL` not
  touched (no model calls tonight).
- **Prompt injection / cross-agent poisoning**: N/A — no LLM calls, no
  untrusted external content executed; GitHub issue/PR bodies read tonight
  were treated as data (quoted, not executed) when drafting this report.

## Scan Findings

**redblue** — no `redblue` key configured in `dream.config.json`; unchanged
4th-consecutive-night reconfirmation. The 2026-08-13 silent-no-op finding in
`@metaharness/redblue` stands, unpatched upstream, out of this repo's scope.

**supply-chain** — `npm audit` on a clean `npm ci` tonight: 9 advisories (2
critical, 2 high, 3 moderate, 2 low), unchanged since 2026-09-13, 100%
confined to `eslint`/`vitest`/`vite`/`esbuild`/`js-yaml`-family
devDependencies (`prod: 13`, `dev: 269`). Fix sits unmerged as dependabot PR
#1, now 15 days open. Separately (not a new finding, reconfirmed): the
`darwin` evaluatorEntrypoint (`npx @metaharness/darwin evolve --sandbox
real`) remains unpinned in `main`'s `dream.config.json` — PR #20 already
built the static checker for this; PR #18 already built the config fix for
darwin's missing `<repo>` arg. Neither merged.

## Competitors

| System | Static-scan / CI-signal-trust handling | Grade |
|---|---|---|
| GitHub Advanced Security (CodeQL) | Official product docs describe the exact failure mode reproduced 30/30 times tonight: `analyze` requires Code Security enabled at the repo level independent of workflow-file permissions — a known, documented precondition this repo has never satisfied | A (official docs, matches reproduced error verbatim) |
| Dependabot | Auto-opens fix PRs (PR #1 here) but does not auto-merge without repo config; 15-day-old open security PR here is expected default behavior, not a Dependabot defect | A (observed directly in this repo) |
| OpenHands | Documented "Stuck Detector" watches agent progress, not CI/scan-signal trust specifically (same finding as 2026-08-13/2026-09-08 reports) | A (official docs, unchanged) |
| SWE-agent | Guardrails prioritize 100%-precision definite-failure signals; no documented CI-required-check/repo-settings distinction | C (secondary source, unchanged from prior nights) |
| Sakana AI Scientist | No documented handling of a permanently-misconfigured CI security gate distinct from a real code failure | C (absence, not independently verified beyond prior nights' checks) |

## Gist

This report. No `gh gist create`-equivalent tool available to this session
(GitHub access is via MCP tools scoped to issues/PRs/branches on
`LLM-Dev-Ops/agentics-dream-machine`; no gist-creation tool present) — same
as every prior night in this repo. Published as a local artifact
(`/tmp/dream-gist-2026-09-18.md`) and committed as
`docs/dream-cycle/2026-09-18-security-adversarial-report.md`. `GIST=LOCAL`.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so the
stamp cannot be written inside the file it stamps. This section is filled in
immediately before commit, over content identical up to this point. Anyone
can reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-09-18-security-adversarial-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at
the start of tonight's session, before this report was written).
REPORT_HASH and WITNESS are published below, in the PR body, and in the
`LEDGER.md` row.

```
report_sha256 : 540caa0c5e212d845cb90c062c8a0ab460cbcb9f4632e7ce568b2ce78fc45869
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : c7749cda4006cb9a96944132550ad0fbe3b36861323a579f6979b55c02382325
```

## Recommendation

Human review requested. Concrete next steps, not done tonight (this session
never self-promotes, merges, or changes repo Settings):

1. **Enable Code Security for this repository** (`Settings → Code security
   and analysis → Code scanning`, or GitHub Advanced Security default setup)
   — the single action that resolves 30/30 failing CodeQL runs. No code
   change required or possible from this session.
2. **Triage the 9-PR dream-cycle backlog** (#12, #14, #16, #18, #20, #22,
   #23, #24, #26) — zero merged since 2026-09-08. PR #20 specifically closes
   out this slot's natural candidate and is ready for review.
3. **Merge or let dependabot auto-merge PR #1** — resolves all 9 current
   `npm audit` advisories, 15 days open.
4. Confirm whether CodeQL is configured as a required status check on
   `main`'s branch protection — if so, its permanent failure may be
   mechanically blocking every PR merge (not just review bandwidth); this
   session has no branch-protection-rules read tool and could not verify
   this directly tonight.
