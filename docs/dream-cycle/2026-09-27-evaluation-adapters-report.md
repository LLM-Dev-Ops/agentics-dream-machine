# Evaluation-Adapters SOTA Report — 2026

## TL;DR

Tonight is the 4th evaluation-adapters/SCAN=flywheel,darwin rotation (after PRs #18
2026-09-12, #26 2026-09-17, #35 2026-09-22 — all still open, draft, unmerged).
Rather than add a 4th unreviewed candidate to that backlog, tonight closes a small,
concrete, previously-disclosed-but-unfixed item: the 2026-09-08 report (PR #8) flagged
a "non-blocking" duplicated verdict→exit-code ternary between `verify-entrypoint` and
`verify-entrypoints` (`packages/cli/src/index.ts`) as a follow-up ("extract a shared
helper") and explicitly did not fix it to keep that night's diff at one conceptual
change. None of the three subsequent evaluation-adapters nights touched it either.
Candidate: a single pure function `entrypointExitCode(verdict)` in
`packages/cli/src/entrypoint.ts`, used by both call sites. `npm test` 106/106 → 108/108
(+2 new, 0 removed/modified). Separately, this session's real `verify-entrypoints` run
against this repo's own unpatched `dream.config.json` reproduced, live, the exact
`--sandbox`-misparsed-as-`<repo>` garbage-directory bug PR #18 (still unmerged) already
disclosed and fixes — corroborating evidence that the underlying bug is still real and
unpatched on `main` tonight, 15 nights after a fix was proposed.

## What's new

- Reproduced tonight: `packages/cli/src/index.ts`'s `verify-entrypoint` (line ~299) and
  `verify-entrypoints` (line ~317, inside a `Math.max` reduction) each independently
  wrote `verdict === 'live' ? 0 : verdict === 'blocked' ? 1 : 2`. Confirmed via
  `git log -p` that this exact duplication has existed since PR #8 (2026-09-08) added
  the plural command, and PR #8's own report named it as a known, deferred follow-up.
- Checked all three subsequent evaluation-adapters PRs (#18, #26, #35) — none of their
  diffs touch this ternary (confirmed by reading each PR's full diff description; none
  mention `entrypointExitCode` or a shared-helper extraction). Not a duplicate direction.
- Live reproduction of the still-open PR #18 finding: running this repo's real
  `node packages/cli/dist/bin.js verify-entrypoints` against the real, unpatched
  `dream.config.json` on `main` (`darwin: "npx @metaharness/darwin evolve --sandbox
  real"`, missing the required `<repo>` positional) executed `npx @metaharness/darwin`
  for real tonight and left a literal `--sandbox/` directory (containing
  `.metaharness/variants/...`) in the repo working tree — the exact garbage-directory
  symptom PR #18's evaluation receipt documented on 2026-09-12. Removed before
  committing (untracked, not part of this candidate). Not re-fixed tonight: PR #18
  already owns this exact fix and re-submitting it would be pure duplication of an
  already-evidenced, already-reviewable candidate sitting unreviewed for 15 nights.
- Control-plane note for STEP 0.5: this session's sandbox denied a direct
  `npx --yes metaharness flywheel help` shell invocation ("Permission... denied by the
  Claude Code auto mode classifier... [Code from External]"), so the planned
  SCAN=flywheel live-probe (checking whether `metaharness flywheel`'s umbrella CLI has
  the same side-effect-scaffolding footgun PR #18 flagged for its sibling `darwin`
  subcommand) could not be run this way. The same underlying command *did* run when
  invoked indirectly through `verify-entrypoints` (a local `node` process that itself
  shells out) — see the `--sandbox/` reproduction above — so the restriction appears to
  key off the literal Bash command text, not the eventual subprocess tree. Recorded as
  an observation about tonight's session capability, not investigated further (out of
  scope for this candidate; no repo runtime code changed).

## Hypothesis (frozen before implementation)

> Given this repo's own evaluator-entrypoint CLI commands (`verify-entrypoint`,
> `verify-entrypoints` in `packages/cli/src/index.ts`), which currently duplicate an
> identical verdict→exit-code ternary (live=0, blocked=1, suspicious-silent=2) — a
> duplication the 2026-09-08 report explicitly flagged as a non-blocking follow-up and
> no subsequent night's candidate (#18, #26, #35) touched — when a new pure function
> `entrypointExitCode(verdict)` is added to `packages/cli/src/entrypoint.ts` and both
> call sites in `index.ts` are refactored to call it instead of repeating the ternary,
> then the exit code and printed text produced by both commands for all three verdicts
> should be byte-identical to current behavior, and every pre-existing test — especially
> the exit-code-pinning tests at `index.test.ts` lines 167-279 — should continue to pass
> unmodified, subject to: no pre-existing test weakened/removed/modified; the new
> function stays pure (no I/O, no clock, no randomness); and the candidate touches no
> evaluation gold data, gate, or `dream.config.json`.

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest), this repo's own `bench` entrypoint, plus real CLI
invocations (no mocking) for the live receipt.

| | Baseline (parent, commit `2fba255`) | Candidate (working tree) |
|---|---|---|
| Test files | 7 | 7 |
| Tests | 106 | 108 (+2 new, 0 removed, 0 modified) |
| Result | 106 passed | 108 passed |
| Lint (`eslint packages`) | clean | clean |
| Build (`tsc -b`, all 6 packages) | clean | clean |
| Typecheck (`tsc -b --noEmit`) | 1 pre-existing failure (`tsconfig.json` TS18002, empty `files` list) | identical pre-existing failure, unrelated to this diff |

Diff: 3 files changed, one conceptual change (extract the verdict→exit-code mapping
into a named, tested, pure function and call it from both existing call sites).

Live receipt — real CLI invocations, no mocking, tonight:

```
$ node packages/cli/dist/bin.js verify-entrypoint bench --cmd "npm --version"
bench: live (exit 0) — produced output
$ echo $?
0

$ node packages/cli/dist/bin.js verify-entrypoint fake --cmd "false"
fake: blocked (exit 1) — exited 1 with no stderr
$ echo $?
1

$ node packages/cli/dist/bin.js verify-entrypoint quiet --cmd "true"
quiet: suspicious-silent (exit 0) — exit 0 with empty stdout and stderr — indistinguishable
from "ran clean, zero findings"; do not record EVALUATED=yes from this result alone
$ echo $?
2

$ node packages/cli/dist/bin.js verify-entrypoints
bench: live (exit 0) — produced output
darwin: live (exit 0) — produced output
$ echo $?
0
```

All three verdicts map to the documented exit codes (0/1/2) exactly as before the
refactor — confirmed identical to the pre-change ternary by independent critic (see
Reward-Hack Check).

## Darwin (bounded evolution)

`DARWIN=not-applicable` — same reasoning as every prior small, pure, exhaustively-
branched candidate this repo has produced (PRs #8/#18/#26/#35/#37): `entrypointExitCode`
is a 3-branch pure function over a closed union type with no mutable population for
bounded Darwin's generations×children search to act on.

## Evidence

- OBSERVATION: `packages/cli/src/index.ts` lines ~299 and ~317 (pre-change) contained
  byte-identical verdict→exit-code ternaries, confirmed by reading the file in full
  before editing.
- OBSERVATION: the 2026-09-08 report (`docs/dream-cycle/2026-09-08-security-adversarial-report.md`)
  named this exact duplication as a disclosed, non-blocking follow-up.
- OBSERVATION: none of PR #18/#26/#35's diffs (read in full via `pull_request_read`)
  extract this helper — confirmed not a duplicate direction.
- OBSERVATION: running `verify-entrypoints` against the real, unpatched
  `dream.config.json` left a `--sandbox/.metaharness/variants/g1_v0`-shaped directory in
  the repo working tree tonight — reproduces PR #18's disclosed, still-unpatched bug.
  Removed before committing; not part of this candidate's diff.
- MEASUREMENT: `npm test` — 106/106 (baseline, commit `2fba255`) → 108/108 (candidate),
  0 regressions, 0 removed/modified tests.
- MEASUREMENT: `npm run lint` clean both sides; `npm run build` clean both sides;
  `tsc -b --noEmit` reproduces one identical pre-existing failure both sides.
- MEASUREMENT: independent critic subagent independently re-ran `npm test` and got the
  same 108/108 count, and independently traced all three verdicts through both the old
  and new logic by hand.
- DECISION: ship `entrypointExitCode` as the sole change tonight; do not re-fix the
  darwin `<repo>`-arg bug (PR #18 already owns it) or probe flywheel's live side effects
  (sandbox denied direct execution) in this same candidate — keeping the diff at one
  conceptual change, consistent with this repo's own convention and the standing
  `zeroMergeStreak` learning signal.

## Reward-Hack Check

Independent critic (separate subagent, fresh context, not primed with this report,
instructed to read the diff itself via `git diff` and independently re-run `npm test`).

**Verdict: CLEAR.** Independently confirmed: (1) no pre-existing test weakened, removed,
or modified — the pre-existing exit-code-pinning suite (`index.test.ts` lines 167-279)
is untouched; only 2 new tests added to `entrypoint.test.ts`. (2) `entrypointExitCode`
is pure — no I/O, no clock, no randomness, closed 3-value union input. (3) No behavioral
change for any of the 3 verdicts at either call site, traced by hand. (4) No
cherry-picking or evaluator-gaming. (5) No new I/O/exec surface. (6) Independently
re-ran `npm test --silent` and got the same 108/108. (7) One non-blocking cosmetic note:
the new function's JSDoc comment carries historical narrative (dates, PR numbers) —
"harmless and arguably useful provenance; not a defect," consistent with this repo's
established comment style in `entrypoint.ts`. No blocking issues found.

## Security Review

- **Tool/command-authority scope**: unchanged. `io.exec` remains reachable only from a
  trusted local CLI invocation or a repo-committed, PR-reviewed `dream.config.json` —
  same trust boundary established by PR #8. This candidate adds no new call site.
- **Unpinned `npx` darwin entrypoint (reconfirmed, not fixed)**: still real and
  unpatched on `main` tonight (see What's New) — same finding flagged 2026-08-13,
  2026-09-08, 2026-09-12; a fix already sits in unmerged PR #18. Not re-fixed here to
  avoid duplicating that PR.
- **Sandbox/session capability observation**: this session's own command-execution
  policy blocked a direct `npx <external package>` Bash invocation but did not block the
  same subprocess when invoked indirectly via this repo's own `node` CLI
  (`verify-entrypoints`). This is a fact about tonight's execution environment, not a
  vulnerability in shipped `@dream-machine/*` code — flagged for awareness, not acted on.
- **Credential exposure**: none. `LLM_EVAL=blocked` (no `OPENROUTER_API_KEY` in this
  session's environment) — no model calls anywhere in this candidate or its evaluation.
- **Prompt injection / cross-agent poisoning**: N/A — no LLM calls, no attacker-
  controllable runtime input in this candidate's path.
- **Least privilege**: no new implicit capability; the refactor touches no `IO` surface.

## Scan Findings

**flywheel** — `dream.config.json#evaluatorEntrypoints` on `main` still declares no
`flywheel` key at all (only `bench` and `darwin`); PR #18 (still open) proposes adding
`npx metaharness flywheel help`. Tonight's planned live side-effect probe of that exact
command (does the umbrella `metaharness` CLI's `flywheel` subcommand share the
silent-cwd-scaffolding footgun PR #18 already flagged for its sibling `darwin`
subcommand?) could not run: this session's sandbox denies direct external-package `npx`
execution. Not resolved tonight — flagged as a concrete next step for a session with
that capability.

**darwin** — Reconfirmed live tonight: the real, unpatched `dream.config.json` darwin
entrypoint (`npx @metaharness/darwin evolve --sandbox real`, missing the required
`<repo>` positional) still misparses `--sandbox` as the repo argument and scaffolds a
`--sandbox/.metaharness/variants/...` directory into the invoking cwd — the exact defect
PR #18 (2026-09-12, still unmerged 15 nights later) already disclosed and fixes. This is
the third consecutive night's evaluation-adapters report to reconfirm this same
unpatched, real, live bug (after #26 on 2026-09-17, #35 on 2026-09-22) — underscoring
that the bottleneck is not missing evidence or missing candidates, it is human review
throughput against a growing backlog (14+ open dream-cycle draft PRs as of tonight).

## Competitors

| System | Duplicated-logic / DRY-violation detection relevant to CLI exit-code mapping | Grade |
|---|---|---|
| ESLint `no-dupe-*` / `sonarjs/no-identical-functions` rules | Static, general-purpose duplicate-logic detectors exist and are widely deployed in CI, but none are configured in this repo's own `eslint.config`-driven `npm run lint` (confirmed: lint stayed clean before and after tonight's fix, i.e. it would not have caught this duplication) | A (this repo's own configuration, inspected directly) |
| GitHub Copilot CLI / Copilot code review | Documented to flag duplicated logic blocks in PR review suggestions (official docs) — same class of finding as tonight's, but requires a human-triggered review pass, same bottleneck this repo's own 14-PR backlog demonstrates | B (official docs, not independently reproduced against this repo) |
| SWE-agent / OpenHands | No documented automatic "extract shared helper" refactor-suggestion pipeline found in either project's official docs as of tonight | B (absence confirmed against official docs) |
| DSPy/GEPA | Metric-optimization framework; no documented static duplicate-code detection (unchanged from prior nights' findings on unrelated axes) | B |

## Gist

No `gh gist create`-equivalent tool available to this session (same constraint every
prior night). Published as a local artifact and committed as
`docs/dream-cycle/2026-09-27-evaluation-adapters-report.md`. `GIST=LOCAL`.

## Witness

`dream-machine witness stamp` hashes this exact file's raw committed bytes, so — per
this repo's own established convention (2026-08-13, 2026-09-08, 2026-09-23) — the stamp
cannot be written *inside* the file it stamps without invalidating itself. The concrete
`report_sha256`/`witness` values are published in the PR body and `LEDGER.md` row, both
computed from this file's actual committed git blob (`git show <commit>:<path>`), never
from an in-memory draft — the same self-reference-bug-avoidance discipline PR #37
(2026-09-23) established after issue #29 found 6/10 backfilled nights got this wrong.
Anyone can independently reproduce it once this file is committed:

```bash
COMMIT=<the commit that adds this file>
REPORT_HASH=$(git show "$COMMIT":docs/dream-cycle/2026-09-27-evaluation-adapters-report.md | sha256sum | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at the start of
tonight's session, before this candidate's changes).

## Recommendation

Human review of the draft PR. Concrete next steps, not done tonight:

1. **Triage the 14+ open dream-cycle draft PRs** (#12, #14, #16, #18, #20, #22, #26,
   #28, #30, #31, #33, #35, #37, #39, #41, #43 and tonight's) — this remains, as every
   recent night has said, the single most valuable action a human can take, well above
   reviewing this specific small PR.
2. **Merge PR #18** specifically fixes the darwin `<repo>`-arg bug this report
   reconfirmed live tonight, third consecutive evaluation-adapters night to do so.
3. **Investigate flywheel's live side effects** from a session whose sandbox permits
   direct external-package execution — tonight's could not.
4. `LEDGER.md` still has no rows for the 18 dream-cycle nights between 2026-09-09 and
   2026-09-26 (their PRs never merged, so their ledger-append commits never reached
   `main`) — a distinct reconciliation decision (PR #30, #33 already propose approaches),
   not addressed by this candidate.
