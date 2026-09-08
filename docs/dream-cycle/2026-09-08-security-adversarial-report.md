# Security-Adversarial / Supply-Chain SOTA Report — 2026

## TL;DR

Tonight closes the follow-up ADR-0002 explicitly deferred on 2026-08-13:
`dream.config.json`'s `evaluatorEntrypoints` (`bench: npm test`, `darwin: npx
@metaharness/darwin evolve --sandbox real`) were never actually routed through
this repo's own `classifyEntrypointResult` liveness classifier — only a
single, hand-invoked `verify-entrypoint <label> --cmd "…"` command existed.
Candidate: `classifyConfiguredEntrypoints()` (pure, `packages/cli/src/entrypoint.ts`)
plus a new `dream-machine verify-entrypoints [config]` CLI command that reads a
`dream.config`'s `evaluatorEntrypoints` map, runs every configured command
through the existing classifier, and exits with the worst verdict across all
of them (`live`=0 < `blocked`=1 < `suspicious-silent`=2). Live receipt tonight
against this repo's real config: `bench` → **live**, `darwin` → **blocked**
(package genuinely not installed — a safe, loud failure, not the silent-exit-0
class this tool exists to catch). Separately, `npm audit` on a fresh `npm ci`
found 8 known advisories (2 critical, CVSS 9.8) in the dev-only vitest/vite
toolchain — zero runtime dependencies in any shipped `@dream-machine/*`
package — with a fix already sitting unmerged in this repo as dependabot PR #1.

## What's new

- Reproduced tonight: this repo's `verify-entrypoint` command only ever
  classified *one* hand-typed command at a time. Nothing consumed
  `dream.config.json#evaluatorEntrypoints` programmatically — the exact gap
  ADR-0002 §3 named ("does not yet auto-wire `evaluatorEntrypoints` through
  the classifier … next-step work, explicitly deferred").
- `git log` + `mcp__github__list_issues`/`list_pull_requests` on the real
  `LLM-Dev-Ops/agentics-dream-machine` repo: **0 issues, 0 dream-cycle PRs**
  exist — only 6 open dependabot PRs (#1-6). This reconfirms, one more night
  running, the 2026-08-13 report's flag that `LEDGER.md` rows referencing
  issues/PRs like #6, #7, #24, `redacted #219`, `openAVO#1`, `RuVector#908`
  are inherited from a different repository context and do not exist here.
  Not corrected tonight (out of scope for this candidate) — flagged again so
  a future night doesn't try to re-check the fate of artifacts that were
  never created in *this* repository.
- Dependabot PR #1 (`chore(deps-dev): bump the dev-dependencies group with 7
  updates`, open since 2026-09-03, CI status `pending`/no checks recorded)
  bumps `vitest`/`@vitest/coverage-v8` from `^2.1.0` to `^4.1.11` — well past
  the `<3.2.6` vulnerable range for GHSA-5xrq-8626-4rwp (critical, CVSS 9.8,
  arbitrary file read+execute via the Vitest UI server). This repo's `npm
  test` never invokes `vitest --ui`, so tonight's exposure window is narrow,
  but the fix is a single already-open PR away — not authored, not merged,
  tonight (this session never merges).
- `npx --no-install @metaharness/darwin evolve --sandbox real` (this repo's
  literal configured `darwin` entrypoint, minus network install) classifies
  **blocked**, exit 1, `npm error npx canceled due to missing packages and no
  YES option: ["@metaharness/darwin@0.10.2"]` — the package is not locally
  cached. Deliberately did **not** run the literal unmodified command tonight
  (see Security Review): as configured, it is an *unpinned* `npx
  @metaharness/darwin …` with no version pin and no `--no-install`/`-y`
  guard, meaning a real unattended nightly run would silently attempt a
  network install and execute whatever code is currently published at that
  package name — worth flagging on its own, not just as classifier plumbing.

## Hypothesis (frozen before implementation)

> Given this repo's own `dream.config.json#evaluatorEntrypoints` (`bench`,
> `darwin`), when each configured command is executed for real and routed
> through the existing pure `classifyEntrypointResult` classifier via a new
> `classifyConfiguredEntrypoints()` + `verify-entrypoints` CLI command, then
> the reported per-entrypoint verdicts should match ground truth verified by
> hand tonight (bench=live, darwin=blocked) and the command should exit with
> the worst verdict across all configured entrypoints — subject to: no
> pre-existing test weakened/removed/modified, the new classification logic
> stays pure (no I/O, no clock, no randomness — only the existing exec/print
> boundary), and zero behavior change to the pre-existing singular
> `verify-entrypoint` command.

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest), this repo's own `bench` entrypoint.

| | Baseline (parent, commit cbc82e6) | Candidate (working tree) |
|---|---|---|
| Test files | 7 | 7 |
| Tests | 98 | 106 (+8, 0 removed, 0 modified) |
| Result | 98 passed | 106 passed |
| Lint | clean | clean |
| Build (`tsc -b`, all 6 packages) | clean | clean |

Diff: 2 files changed for implementation (`entrypoint.ts` +27 lines,
`index.ts` +23 lines incl. one HELP-text line) + 2 test files (+45/+37 lines)
= 132 changed lines total, one conceptual change (wire the plural config
case through the existing classifier). No pre-existing test touched.

Live receipt — `dream-machine verify-entrypoint(s)` run against real commands
tonight:

```
$ node packages/cli/dist/bin.js verify-entrypoint bench --cmd "npm test"
bench: live (exit 0) — produced output
$ echo $?
0

$ node packages/cli/dist/bin.js verify-entrypoint darwin --cmd "npx --no-install @metaharness/darwin evolve --sandbox real"
darwin: blocked (exit 1) — npm error npx canceled due to missing packages and no YES option: ["@metaharness/darwin@0.10.2"]
$ echo $?
1

$ node packages/cli/dist/bin.js verify-entrypoints /path/to/dream.config.receipt.json
bench: live (exit 0) — produced output
darwin: blocked (exit 1) — npm error npx canceled due to missing packages and no YES option: ["@metaharness/darwin@0.10.2"]
$ echo $?
1
```

(`dream.config.receipt.json` = this repo's real `dream.config.json` with only
the `darwin` command's `--no-install` flag added — see Security Review for
why the literal command was not executed unmodified. `bench`'s command is
identical to the real config's.) All classifications match ground truth
verified by hand.

## Darwin (bounded evolution)

Not run. `DARWIN=not-applicable` — same reasoning as 2026-08-13: no evolvable
population exists for a small, pure, exhaustively-branched wiring function;
bounded Darwin's generations×children search needs a mutable candidate
population this doesn't have. Not a stop condition.

## Evidence

- OBSERVATION: `verify-entrypoint` (singular) existed but nothing consumed
  `dream.config.json#evaluatorEntrypoints` programmatically before tonight —
  confirmed by reading `packages/cli/src/index.ts` in full before editing.
- OBSERVATION: `npx --no-install @metaharness/darwin evolve --sandbox real` →
  exit 1, `npm error npx canceled due to missing packages…` — reproduced
  twice tonight (once via `verify-entrypoint`, once via `verify-entrypoints`
  against the receipt config).
- MEASUREMENT: `npm test` — 98/98 (baseline, commit cbc82e6) → 106/106
  (candidate), 0 regressions, 0 removed/modified tests.
- MEASUREMENT: `npm audit --json` on a fresh `npm ci` — 8 advisories (2
  critical/CVSS 9.8, 1 high, 3 moderate, 2 low), all inside
  `eslint`/`vitest`/`vite`/`esbuild` devDependencies; `prod: 13` (all
  internal `@dream-machine/*` workspace packages, 0 third-party runtime
  deps) vs `dev: 269`.
- INFERENCE: the critical CVE (GHSA-5xrq-8626-4rwp, Vitest UI arbitrary
  file read+execute, range `<3.2.6`) is not exercised by this repo's `npm
  test` (`vitest run`, no `--ui`), so today's blast radius is low, but the
  installed `vitest@2.1.9`/`@vitest/coverage-v8` are inside the vulnerable
  range and a fix is a semver-major bump away.
- DECISION: ship `classifyConfiguredEntrypoints` + `verify-entrypoints` as a
  small, additive, orthogonal CLI command; do not touch `packages/compile`'s
  prompt-template generation to auto-invoke it inside a future compiled
  STEP 5-9 (see Recommendation — a larger, separately-reviewable change).
- DECISION: do not merge, author-approve, or action dependabot PR #1 or the
  Vitest CVE remediation tonight — flagged for human/dependabot-native
  merge, consistent with "evaluation is not promotion."

## Reward-Hack Check

Independent critic (separate subagent, not this candidate's author) reviewed
the diff for weakened/removed/modified tests, cherry-picked cases, threshold
or gold-data tampering, and command-injection exposure; independently
re-measured `npm test` before (`git stash`) and after.

**Verdict: CLEAR of reward-hacking.** Confirmed: 98/98 → 106/106 (critic's
own count matches this report's), purely additive diff to both test files,
no assertions loosened. Command-injection surface unchanged — `cmd` strings
still only ever originate from a locally-authored, PR-reviewed
`dream.config.json`, flowing through the same `IO.exec` → `child_process.exec`
path `verify-entrypoint` and `buildStep.cmd` already use. Exit-code
aggregation (`Math.max` over live=0/blocked=1/suspicious-silent=2) confirmed
correct — no path produces a false "live" verdict.

**Non-blocking findings from the critic, addressed or logged:**
1. Duplicated verdict→exit-code ternary between `verify-entrypoint` and
   `verify-entrypoints` (`index.ts`) — cosmetic, logged as a follow-up
   (extract a shared helper), not fixed tonight to keep the diff at one
   conceptual change.
2. Missing CLI-level test for the `suspicious-silent`-aggregate exit-code-2
   path — **fixed before this report was finalized**: added
   `'exits 2 (worst) when any entrypoint is suspicious-silent, even if others
   are live'` to `index.test.ts` (98→106 count above already includes it).
3. Untested malformed-config edge cases (`dream.config.json` missing/invalid
   JSON, `evaluatorEntrypoints` not an object) — behavior is inherited
   generically from `run()`'s outer try/catch, same untested convention as
   the pre-existing `compile`/`schedule` commands; not a regression, logged
   as a follow-up rather than expanded tonight (out of the one-conceptual-
   change scope).

No blocking defects found.

## Security Review

- **Tool/command-authority scope**: `io.exec` still only reachable from a
  trusted local CLI invocation or a repo-committed, PR-reviewed
  `dream.config.json` — no new remote/network attack surface. Same trust
  boundary as the pre-existing `verify-entrypoint`.
- **Unpinned `npx` invocation (flagged, not fixed)**: this repo's real
  `dream.config.json#evaluatorEntrypoints.darwin` is `"npx @metaharness/darwin
  evolve --sandbox real"` — no version pin, no `--no-install`/`-y` guard. Run
  literally inside an unattended nightly session, this would silently attempt
  a network install and execute whatever is currently published under that
  package name at that moment — the maintainer's `npm` account becomes part
  of this pipeline's trust boundary with no pin to catch a compromised
  publish. Tonight's session deliberately substituted `--no-install` for the
  live receipt above rather than executing the literal configured command
  unattended, and did **not** modify `dream.config.json` itself (config
  changes are a separate, human-reviewable decision). Recommended next step
  below, not built tonight.
- **Credential exposure**: none — module handles no secrets, `LLM_EVAL` not
  touched (no model calls in this candidate).
- **Prompt injection / cross-agent poisoning**: N/A — no LLM calls in this
  candidate; `dream.config.json` values are locally-authored/PR-reviewed,
  not attacker-controllable runtime input.
- **Least privilege**: `io.exec` remains optional (`exec?`), so every
  existing IO/test fake (`compile`, `ledger`, `witness`, `tui`) is
  unaffected and gains no new implicit capability.

## Scan Findings

**redblue** — `dream.config.json#evaluatorEntrypoints` does not currently
configure a `redblue` key at all (only `bench` and `darwin` are set), so
tonight's `verify-entrypoints` had nothing new to classify for redblue
specifically; the 2026-08-13 finding (silent no-op via the npm bin-symlink
footgun) stands unchanged and unpatched upstream (out of this repo's scope).

**supply-chain** — `npm audit` on a clean `npm ci`: 8 advisories (2
critical/CVSS 9.8, 1 high, 3 moderate, 2 low), 100% confined to
`eslint`/`vitest`/`vite`/`esbuild` devDependencies (`prod: 13` deps, all
internal `@dream-machine/*` workspace packages; `dev: 269`). The critical
CVE (GHSA-5xrq-8626-4rwp) requires `vitest --ui`, which this repo's `npm
test` (`vitest run`) never invokes — narrow but real exposure for any
future contributor who runs `vitest --ui` locally on an untrusted network.
Fix already sits unmerged as dependabot PR #1 (`vitest`/`@vitest/coverage-v8`
`^2.1.0`→`^4.1.11`, well past the `<3.2.6` vulnerable range), open since
2026-09-03 with no recorded CI status. Separately, the `darwin` evaluator
entrypoint's unpinned `npx @metaharness/darwin …` invocation (no version
pin, no `--no-install` guard) is itself a supply-chain trust gap — see
Security Review.

## Competitors

| System | Silent/false-success tool-liveness handling | Grade |
|---|---|---|
| GitHub Copilot CLI | Open issue (github/copilot-cli#3064) requesting a *stricter* nonzero exit when MCP servers fail to start, because today's CLI can exit 0 in CI with zero tools available — the same failure class this repo's classifier targets, unresolved upstream as of tonight | A (official repo issue, fetched directly) |
| OpenHands | Ships a documented "Stuck Detector" (docs.openhands.dev/sdk/guides/agent-stuck-detector) as an auxiliary service watching the event stream for the agent making no progress — a *behavioral* stall detector, not an exit-code/output liveness classifier for individual tool invocations | A (official docs, fetched directly) |
| SWE-agent | Guardrails (cost, syntax check, lint+revert) are described as intentionally 100%-precision — only fire on definite failure; no documented empty-output/exit-code liveness check specific to tool subprocesses found | C (secondary blog source, single-sourced) |
| DSPy/GEPA | Metric-based scoring with reflective feedback; no documented tool-subprocess liveness/silent-failure detection | B (absence confirmed against official docs, as in the 2026-08-13 report) |
| AutoGPT-lineage | Community failure catalogs document agents self-reporting false success with no independent liveness check (unchanged from 2026-08-13's finding) | C |
| arXiv:2606.09863 "From Confident Closing to Silent Failure" (research, not a competitor) | Directly characterizes false-success/silent-failure patterns in LLM agents as a named, studied failure class — supports tonight's premise that exit-code-only trust is a known-bad pattern, not a one-off | B (arXiv preprint, not yet independently reproduced by this session) |
| arXiv:2607.07405 "Reason Less, Verify More" (research, not a competitor) | Proposes deterministic, pre-execution gates to recover silent policy-violation failures in tool-using agents — same philosophy (deterministic classification interposed before trust) as `classifyEntrypointResult`/`classifyConfiguredEntrypoints`, applied to a different failure class (policy violations vs. liveness) | B (arXiv preprint) |

## Gist

This report. `gh gist create` is not available to this session (GitHub access
is via MCP tools scoped to issues/PRs/branches on
`LLM-Dev-Ops/agentics-dream-machine`; no gist-creation tool present) — same
as 2026-08-13. Published as a local artifact
(`/tmp/dream-gist-2026-09-08.md`, committed into the PR as
`docs/dream-cycle/2026-09-08-security-adversarial-report.md`). `GIST=LOCAL`.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so — as
noted 2026-08-13 — the stamp cannot be written *inside* the file it stamps.
The committed copy at
`docs/dream-cycle/2026-09-08-security-adversarial-report.md` is the frozen,
hashed artifact; this section is filled in immediately before that file is
committed, over content identical up to this point. Anyone can independently
reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-09-08-security-adversarial-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = cbc82e60436d655356cf92e181ca2a32532a3e05` (repo HEAD at the
start of tonight's session, before this candidate's changes). REPORT_HASH and
WITNESS are published in the PR body and the `LEDGER.md` row, both pointing
back at this file by path and session commit.

## Recommendation

Human review of the draft PR. Concrete next steps, not done tonight:

1. **Wire `verify-entrypoints` into the compiled nightly prompt itself**
   (`packages/compile/src/index.ts`'s `step6to9Candidate`), so a future
   night's STEP 5-9 guidance tells the agent to *run* this command rather
   than relying on it existing as an opt-in CLI primitive. Deliberately not
   done tonight — touching the compiled-prompt template is a larger,
   separately-reviewable change than "add one CLI command," and this
   session's zero-recent-merge learning signal
   (`dream-machine ledger signals` → `zeroMergeStreak: true`) biases tonight
   toward the smaller, more easily reviewable candidate.
2. **Pin or guard the `darwin` evaluator entrypoint.** Either pin an exact
   version (`npx @metaharness/darwin@<version> …`) or add `--no-install`
   with a documented one-time local-install step, so an unattended nightly
   run never silently attempts a network install + execute of a third-party
   package with no human in the loop. Not built tonight — a
   `dream.config.json` content change is a distinct, human-reviewable
   decision from tonight's classifier-wiring candidate.
3. **Merge (or let dependabot auto-merge) PR #1**, resolving all 8 current
   `npm audit` advisories including the critical Vitest UI RCE-adjacent CVE
   — a session action, not something this session does itself tonight.
4. `LEDGER.md` rows 1-6 (dates 2026-08-22 through 2026-08-26) reference
   issues/PRs and repositories (`#24`, `redacted #219`, `openAVO#1`,
   `RuVector#908`, etc.) that do not exist in `LLM-Dev-Ops/agentics-dream-machine`
   — confirmed again tonight via `list_issues`/`list_pull_requests` (0
   issues, only dependabot PRs #1-6). Flagged a second consecutive night;
   still not corrected (out of scope for this candidate — rewriting ledger
   history is a distinct, larger decision a human should make explicitly).
