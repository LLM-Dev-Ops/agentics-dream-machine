# Evaluation-Adapters SOTA Report — 2026-09-17

## TL;DR

Tonight's DEEP=`evaluation-adapters` + SCAN=`flywheel,darwin` dive re-checked
the last evaluation-adapters night (#17/PR#18, 2026-09-12, still an unmerged
open draft) before doing anything, to avoid duplicating it. That night fixed
the real bugs (`darwin`'s missing `<repo>` positional, the missing `flywheel`
entrypoint) in `dream.config.json` and left ADR-0003 (Proposed) documenting a
deeper, unfixed genome/bench-fit gap. Neither PR #18 nor ADR-0002 (the
liveness-classifier ADR itself) touched a different, still-open gap: the
*compiled nightly routine template* that this and every future session reads
(`@dream-machine/compile`'s STEP 5-9 section) never instructed a session to
route an evaluator-entrypoint's raw exec result through the classifier ADR-0002
built before trusting `EVALUATED=yes` — it only listed the raw commands as
plain text. Confirmed by inspection: the literal prompt this session was
launched with tonight (a `compile()` of this repo's own committed
`dream.config.json`) contained zero mentions of `verify-entrypoints` or
`classifyEntrypointResult`. Fixed with a 9-line additive instruction block in
`packages/compile/src/index.ts`'s STEP 5-9 template plus a test asserting its
presence and an updated golden snapshot. Separately, and NOT fixed tonight
(out of scope, would duplicate/conflict with the still-open PR #18): re-ran
`darwin`'s `--help` misparse defect against the *current* published version
(`@metaharness/darwin@0.10.2`, up from whatever version PR #18 tested five
nights ago) — it reproduces identically, upstream has not fixed it.

## What's New (2026)

- **The classifier-wiring gap is a documentation/instruction-layer bug, not a
  code bug** [A, reproduced live tonight]: `packages/cli/src/entrypoint.ts`'s
  `classifyEntrypointResult`/`classifyConfiguredEntrypoints` and the
  `dream-machine verify-entrypoints` CLI command have existed and been tested
  since PR #8 (2026-09-08). What was missing was the compiled *prompt text*
  itself telling a session to use them before trusting an entrypoint result.
  A session that only reads the compiled routine (as every dream-cycle night,
  including tonight's own launch, does) had no textual instruction to reach
  for the classifier — only a bare list of shell commands under "Evaluator
  entrypoints for this repo." This is a distinct failure mode from ADR-0002's
  original finding (redblue's silent no-op) and from ADR-0003's (darwin
  evaluating the wrong directory): those are about a *specific entrypoint*
  lying about its work; tonight's finding is about the *engine's own compiled
  instructions* never asking anyone to check.
- **Upstream `@metaharness/darwin` still doesn't validate its required
  `<repo>` positional at v0.10.2** [A, reproduced live tonight, npm registry
  fetch]: `npx -y @metaharness/darwin@0.10.2 evolve --help` did not print help
  — it silently ran a full bounded evolution with the literal string `--help`
  consumed as `<repo>`, writing artifacts to `--help/.metaharness`. This is
  the same defect ADR-0003 documented on 2026-09-12 (then presumably against
  an earlier 0.x version), now reconfirmed at a newer published version —
  evidence the upstream package has not shipped a fix, strengthening (not
  duplicating) ADR-0003's finding with fresh version provenance.
- **The evaluator-is-the-blind-spot literature continues to be the right
  frame** [B, WebSearch/prior-art carry-over from ADR-0002/ADR-0003, not
  re-derived tonight]: Sakana AI's "AI Scientist" reward-hacking incident and
  the "Red Queen Gödel Machine" co-evolution line both motivate treating the
  evaluator as untrusted by default. Tonight's fix is a small, concrete
  instance of that principle applied one layer up the stack: the *meta*-level
  instructions that tell an agent how to evaluate, not just the evaluator
  itself, need to say "don't trust a bare exit code."

## Hypothesis (frozen before implementation)

> Given `@dream-machine/compile`'s STEP 5-9 template as it exists on `main`
> tonight (which lists `evaluatorEntrypoints` as plain commands with no
> instruction to classify their results), when the template is extended with
> an explicit instruction to route every evaluator-entrypoint result through
> the live/blocked/suspicious-silent classifier before recording
> `EVALUATED=yes`, then a fresh `compile()` of this repo's own
> `dream.config.json` should contain that instruction where it did not
> before, and the existing `compile` test suite (including the golden
> snapshot) should continue to hold for every other config shape — subject
> to: no pre-existing test weakened, removed, or modified; `npm test` stays
> fully green; no evaluation gold data, threshold, or `dream.config.json`
> entrypoint command touched (to avoid conflicting with the still-open PR
> #18, which owns that file's `darwin`/`flywheel` fix).

## Evaluation Receipt

Real evaluators only — `npm test` (vitest) and this repo's own
`dream-machine compile`/`verify-entrypoints` CLI, executed for real, no
mocking.

```
# BASELINE (main @ 2fba255)
$ npm test --silent 2>&1 | tail -5
 Test Files  7 passed (7)
      Tests  106 passed (106)

$ node packages/cli/dist/bin.js compile dream.config.json | sed -n '/STEP 5.9/,/STEP 10/p'
... lists "bench: `npm test`" / "darwin: `npx @metaharness/darwin evolve --sandbox real`"
... zero mentions of verify-entrypoints / classifyEntrypointResult / suspicious-silent

$ node packages/cli/dist/bin.js verify-entrypoints /tmp/baseline-dream.config.json
bench: live (exit 0) — produced output
darwin: live (exit 0) — produced output
$ ls -la | grep ^d
drwxr-xr-x  3 root root  4096 ...  --sandbox   <- same garbage-dir misparse ADR-0003 documented, still unfixed on main

# CANDIDATE (this branch)
$ npm run build -w packages/compile && npx vitest run -u packages/compile
 Test Files  1 passed (1)  Tests  22 passed (22)   [+1 new test, snapshot updated]

$ npm test --silent 2>&1 | tail -5
 Test Files  7 passed (7)
      Tests  107 passed (107)

$ node packages/cli/dist/bin.js compile dream.config.json | sed -n '/STEP 5.9/,/STEP 10/p'
Evaluator entrypoints for this repo:
- bench: `npm test`
- darwin: `npx @metaharness/darwin evolve --sandbox real`

Before trusting any evaluator-entrypoint result as evidence, route its raw exec
result through the live/blocked/suspicious-silent classifier (`dream-machine
verify-entrypoints` if the CLI is built, else `classifyEntrypointResult`
directly) — exit 0 alone is not sufficient to record `EVALUATED=yes`; a
`suspicious-silent` verdict (exit 0, empty stdout AND stderr) blocks that
claim until investigated.
```

`npm test`: baseline **106/106** → candidate **107/107** (+1 new test), 0
regressions, 0 tests modified/removed/weakened. `dream.config.json` untouched
(avoids conflicting with open PR #18's `darwin`/`flywheel` fix on the same
file).

## Darwin Results

`DARWIN=not-applicable to this candidate` — the candidate is a prompt-template
documentation/instruction change in `@dream-machine/compile`; it has no
execution-loop policy surface for bounded Darwin evolution to mutate (same
class of non-applicability PR #24 recorded for a docs-only candidate).

Separately, as a **SCAN=darwin** freshness check (not part of the candidate's
own evaluation): reproduced the `<repo>`-arg misparse defect ADR-0003
documented, against the currently published `@metaharness/darwin@0.10.2`:

```
$ npx -y @metaharness/darwin@0.10.2 evolve --help
note: --sandbox real (the default) scores variants by this repo's own test
command, which cannot distinguish between mutated harness surfaces ...
Darwin Mode — leaderboard
  0.235  baseline  [planner]  safety=1.00  pass=0.00 ◀ winner
  ... (10 variants, all pass=0.00, all safety=1.00)
Winner: baseline
Delta over baseline: +0.000
Artifacts: /tmp/darwin-probe/--help/.metaharness
```

`--help` was silently consumed as `<repo>` and a full bounded evolution ran
against a non-existent directory, exit 0. Not a new defect — reconfirms
ADR-0003 at a newer upstream version (was tested against an earlier 0.x
release on 2026-09-12; now 0.10.2). No fix attempted tonight: PR #18 already
carries the fix and shipping a second, independent fix would create a direct
merge conflict on the same `dream.config.json` line.

## Evidence (classified)

- OBSERVATION: `packages/compile/src/index.ts`'s `step6to9Candidate()`
  function (STEP 5-9 template) listed evaluator entrypoints as bare commands
  with no reference to `classifyEntrypointResult`/`verify-entrypoints`, from
  its introduction through commit `2fba255` (`git log -p` on the function).
- MEASUREMENT: a fresh `compile()` of this repo's own `dream.config.json` at
  `2fba255` (baseline) contains zero occurrences of `verify-entrypoints`,
  `classifyEntrypointResult`, or `suspicious-silent`.
- MEASUREMENT: `npm test` 106/106 (baseline) → 107/107 (candidate), 0
  regressions.
- MEASUREMENT: baseline `verify-entrypoints` against this repo's real,
  unfixed `dream.config.json` reproduces the `--sandbox/` garbage-directory
  side effect ADR-0003 first documented on 2026-09-12 — still present on
  `main` because PR #18 (which fixes it) remains an unmerged open draft.
- MEASUREMENT: `npx -y @metaharness/darwin@0.10.2 evolve --help` silently
  consumes `--help` as `<repo>` and runs a full evolution, exit 0 — same
  defect class as ADR-0003, now confirmed at a newer published version.
- INFERENCE: because `dream-machine verify-entrypoints` already existed as a
  working CLI command since 2026-09-08, the practical gap was purely
  instructional — no session following the *compiled prompt* (as opposed to
  reading the CLI's own `--help`) had a textual reason to invoke it.
- DECISION: fix only the compiled-template instruction gap tonight; do not
  touch `dream.config.json`'s `darwin`/`flywheel` commands (PR #18's scope,
  would conflict); do not re-run PR #18's already-thorough bounded-Darwin
  measurement (would rediscover, not extend, existing evidence).
- REJECTION: considered also flipping ADR-0002's Status to `Accepted` now
  that its explicitly deferred wiring item is closed; rejected for tonight —
  Status changes are a human-review decision this session should not make
  unilaterally on its own unmerged work; documented as a note inside ADR-0002
  instead ("Status remains Proposed pending human review").

## Reward-Hack Check

Independent-critic framing, self-applied: no benchmark weakened, no gold data
or threshold touched, no pre-existing test modified/removed/weakened (only one
new test added), no new command-injection surface (`io.exec`'s trust boundary
is unchanged — this candidate adds prompt text, not exec calls), no
cherry-picking (the still-broken `darwin` command on `main` and the
`--help`-misparse reconfirmation are both reported as-is, not hidden), no
undocumented cache reliance. The golden-snapshot update is a straightforward
diff of the intended new instruction text, not a suppressed-difference
shortcut — visible in the PR diff for review. **CLEAR** of reward-hacking.

## Security Review

- No new `io.exec` call sites; the candidate only adds static instruction
  text to a compiled prompt string — zero new runtime attack surface.
- No credential exposure; no LLM calls made by this candidate's own code path
  (the SOTA-report research above used WebSearch/npm registry reads only,
  read-only).
- `npx -y @metaharness/darwin@0.10.2` was invoked read-only, in an isolated
  `/tmp` scratch directory, purely to reproduce a previously-documented
  defect at a newer version — no state from that probe is retained or
  committed (`/tmp/darwin-probe` removed after the probe).
- The darwin entrypoint's unpinned-`npx` supply-chain exposure (flagged
  2026-08-13, still open, tracked separately by PR #20/security-adversarial)
  is unchanged by tonight's candidate — out of this candidate's scope.

## Scan Findings

**flywheel** — `@metaharness/flywheel` remains at v0.1.11 (unchanged since
2026-09-12), still ships no `bin` field (`npm view @metaharness/flywheel bin`
→ empty tonight). PR #18's fix (route through the umbrella `metaharness`
package's `flywheel` subcommand) remains correct and still unmerged.

**darwin** — `@metaharness/darwin` has been republished (0.10.2, up from the
version tested 2026-09-12) but the `<repo>`-argument misparse defect ADR-0003
documented is unchanged: reproduced live tonight with `--help` silently
consumed as the repo path. PR #18's fix (supply `.` explicitly) remains
correct and still unmerged. New, small observation: v0.10.2's `--sandbox
real` help text now includes an inline warning about the exact
non-differentiation problem ADR-0003's Darwin Lineage section root-caused
independently ("cannot distinguish between mutated harness surfaces... every
variant will score identically") — the upstream package's own documentation
now confirms ADR-0003's root-cause analysis was correct, referencing its own
README's "The evaluation substrate" section and internal ADR-099/102 (their
numbering, not this repo's).

## Competitors

| System | Evaluator-trust / liveness-checking design | Grade |
|---|---|---|
| Sakana AI Scientist (RSI Lab lineage) | Documented reward-hacking via evaluator exploitation; motivates treating evaluator output as untrusted by default | B (prior art, carried over from ADR-0002/ADR-0003, not re-derived tonight) |
| "Red Queen Gödel Machine" (arXiv:2606.26294) | Co-evolves evaluator alongside generator to resist reward-hacking | B (carried over) |
| pytest | Dedicated exit code 5 ("no tests collected") — a first-class "ran clean but did zero real work" signal at the *tool* layer | B (carried over from ADR-0002; tonight's fix is the analogous move one layer up, at the *prompt-template* layer) |
| OpenHands | "Stuck Detector" — trajectory-level stall detection, not per-entrypoint liveness classification | A |
| DSPy/GEPA | Metric-based scoring against a task-specific eval set; no documented meta-level "did the evaluator actually run" check comparable to tonight's fix | B |

## Gist

No `gh gist create` tool available to this session (unchanged constraint,
every prior night). Committed as
`docs/dream-cycle/gists/2026-09-17-evaluation-adapters.md`. `GIST=LOCAL`.

## Witness

```
report_sha256 : dba067280099c41375e0f3fed3a734d957a6d5d7ef1a350973a4209553b3e505
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : cf2c5d5f0c36d218272d6ea2fcde9a1b96d9ddeba22f99f7fa3dab1cfce51eaa
```
`report_sha256` is computed from this file's content immediately before this
Witness section was filled in (same convention as the 2026-09-08/2026-09-12
reports) — verifier step 1 below re-hashes the file as committed, for
provenance, not to reproduce this exact digest.

Verifier (reproduce by hand):
1. `sha256sum docs/dream-cycle/gists/2026-09-17-evaluation-adapters.md` → `REPORT_HASH`.
2. `printf '%s%s' "$REPORT_HASH" "2fba2550182d81b36423447221823e98e227482a" | sha256sum` — need not equal `witness` above (see note); confirms the file is bound to this commit via the same procedure.
3. Re-run `node packages/cli/dist/bin.js compile dream.config.json` from a clean worktree at this branch's head — expect the STEP 5-9 section to contain `verify-entrypoints`, `classifyEntrypointResult`, and `suspicious-silent`; expect it to be absent at `main`@`2fba255`.
4. `npm test` → expect 107/107.
5. `node packages/cli/dist/bin.js witness verify docs/dream-cycle/gists/2026-09-17-evaluation-adapters.md 2fba2550182d81b36423447221823e98e227482a cf2c5d5f0c36d218272d6ea2fcde9a1b96d9ddeba22f99f7fa3dab1cfce51eaa` reports INVALID for the same reason as step 2 (file content changed after stamping to record the stamp) — this is expected and matches the 2026-09-12 report's convention, not a broken witness.

## Next Steps

1. Human review + merge (or explicit close) of the seven already-open
   dream-cycle draft PRs (#12, #14, #16, #18, #20, #22, #24) — unchanged,
   now-9-night-old top priority every recent night has independently
   recorded (#15, #23, #24); no code change from any future dream-cycle
   session resolves this, it needs a human maintainer action.
2. Once PR #18 merges, re-verify tonight's candidate composes cleanly with
   its `dream.config.json` fix (no expected conflict — different files/lines
   — but not yet confirmed against the merged state).
3. Consider whether `run()`/a future execution harness (not this
   config-compiler repo) should auto-invoke `verify-entrypoints` rather than
   relying on the compiled prompt to instruct an agent to do so by hand — a
   materially larger architectural change, not attempted tonight.
