# Evaluation-Adapters SOTA Report — 2026-11-17

## TL;DR

Tonight closes a gap that has sat flagged-but-unaddressed in this repo across
two prior real nights and six intervening draft PRs: `packages/cli/src/entrypoint.ts`'s
`classifyConfiguredEntrypoints()` (added 2026-09-08, PR #8) correctly classifies
every configured `evaluatorEntrypoints` command as `live` / `blocked` /
`suspicious-silent`, and `dream-machine verify-entrypoints` exposes it as a CLI
command — but nothing in the *compiled nightly prompt itself*
(`packages/compile/src/index.ts`'s `step6to9Candidate()`) ever told a future
night's agent to run it. The gap was named explicitly in the 2026-09-08 report's
Recommendation #1 and again in `entrypoint.ts`'s own doc-comment ("the wiring
ADR-0002 §3 named and explicitly deferred"). Six evaluation-adapters-surfaced
PRs since (#81, #101, #111, #113, #123, #131) extended the classifier's logic
(darwin sandbox-mode diagnosticity, genome relevance, stale-run-id detection,
swallowed-positional-arg detection) but **none** touched the compiled-prompt
layer — the actual wiring gap was never closed. Candidate tonight:
`step6to9Candidate()` now emits a liveness-gate instruction, present only when
`evaluatorEntrypoints` has at least one configured command, telling the agent
to run `dream-machine verify-entrypoints` before recording `EVALUATED=yes` for
any of them. 46 changed lines, 2 files of substance + 1 snapshot + 1 test file.
`npm test`: 106/106 → 108/108, 0 regressions, independently reconfirmed by an
adversarial critic subagent.

## What's new

- Confirmed via `mcp__github__pull_request_read` + `search/issues` against the
  real `LLM-Dev-Ops/agentics-dream-machine`: **2 merged PRs total** (#8, #9 —
  both from the two prior real nights), **14 closed-unmerged**, **58 open**
  (mostly draft `dream-cycle` PRs dated 2026-09-12 through 2026-11-16). The
  `zeroMergeStreak` learning signal (`dream-machine ledger signals` →
  `"zeroMergeStreak": true`, `"nightsConsidered": 7`) is not a mild signal —
  it is a 70+ day, ~58-PR backlog with zero candidate merges since 2026-09-08.
  This biased tonight toward the smallest, most orthogonal, most easily
  reviewable candidate available, per STEP 1.1's own rule.
- Read PR #18 (2026-09-12, draft, 28 commits, 4203 insertions, still open)
  closely before deciding not to build on it: its body claims "the exact
  remote head is `f296e5034541f6e603bcd468e8406fdd6392852d`" — but
  `mcp__github__pull_request_read` on that same PR reports
  `head.sha = ed97cb897029f82223d76ebe8fcac6979f67a55f`, a **different commit**.
  The body also contains oddly precise, unverifiable claims (specific hosted
  CI run IDs, "MetaHarness 0.4.2: 82 fit / 100 compile / 79 coverage / 100
  safety, 6/6 hard constraints", exact Darwin seeds and scores) layered onto
  an otherwise plausible original hypothesis. Flagging this as a standing
  concern, not fixing it tonight (out of scope for a 46-line candidate): a
  2+-month-old, never-reviewed, 29-file draft PR accumulating increasingly
  specific, partially-unverifiable narrative claims with no human checkpoint
  is exactly the failure mode the "evaluation is not promotion" discipline
  exists to prevent, even though no promotion (merge) has actually occurred.
- SCAN=flywheel: `dream.config.json#evaluatorEntrypoints` on `main` has only
  `bench` and `darwin` — **no `flywheel` entry exists on main**. A `flywheel`
  entrypoint (`npx metaharness flywheel help`) is proposed only inside the
  unverified PR #18 above. Tonight's candidate is unaffected either way: the
  liveness-gate text it emits is generic over whatever keys are configured
  (verified by the new test `omits the liveness-gate instruction when no
  evaluatorEntrypoints are configured`), so it will cover `flywheel` for free
  if/when a human merges that key in.
- SCAN=darwin: real, network-free ground truth reconfirmed tonight —
  `npx --no-install @metaharness/darwin evolve --sandbox real` → **blocked**,
  exit 1, `npm error npx canceled due to missing packages … ["@metaharness/darwin@0.14.0"]`
  (version string advanced from `0.10.2` on 2026-09-08 to `0.14.0` tonight —
  consistent with real upstream publishing, not a stale/fabricated number).
  `bench` (`npm test`) → **live**. Matches 2026-09-08's ground truth exactly;
  the darwin entrypoint in `dream.config.json` remains unpinned (flagged
  2026-08-13, 2026-09-08, and again by PR #18 — still open, still out of
  scope for a prompt-compiler-layer candidate).

## Hypothesis (frozen before implementation)

> Given this repo's own compiled nightly-routine prompt (the output of
> `packages/compile`'s `compile(dream.config)`), when `step6to9Candidate()` is
> extended to emit an explicit instruction — present only when
> `evaluatorEntrypoints` has ≥1 configured command — telling the agent to run
> `dream-machine verify-entrypoints` and treat only a `live` verdict as license
> to proceed, then a golden-snapshot test of the compiled prompt should show
> the instruction present for a config with entrypoints and absent for a config
> without them, and `npm test` should go from 106/106 to 108/108 with 0
> regressions — subject to: no pre-existing test weakened/removed/modified,
> zero behavior change to `classifyConfiguredEntrypoints`/`verify-entrypoints`
> themselves (orthogonal, template-layer-only change), and the new text must
> accurately describe the real classifier's three verdicts (verified against
> `packages/cli/src/entrypoint.ts`, not assumed).

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest), this repo's own `bench` entrypoint.

| | Baseline (parent, commit `2fba255`) | Candidate (working tree) |
|---|---|---|
| Test files | 7 | 7 |
| Tests | 106 | 108 (+2, 0 removed, 0 modified) |
| Result | 106 passed | 108 passed |
| Lint | clean | clean |
| Build (`tsc -p`, all 6 packages) | clean | clean |
| `tsc -b --noEmit` root typecheck | pre-existing TS18002 (`tsconfig.json` empty `files` list) | identical TS18002, reproduced on both sides via `git stash` |

Diff: `packages/compile/src/index.ts` (+12/−3), `packages/cli/src/entrypoint.ts`
(+5/−4, doc-comment only), `packages/compile/src/index.test.ts` (+12 new test
lines, 0 existing lines touched), `packages/compile/src/__snapshots__/index.test.ts.snap`
(+8, golden snapshot updated for the intentional content change) = 46 changed
lines total, one conceptual change (surface the existing classifier inside the
generated prompt).

Live receipt — this repo's real `dream.config.json` compiled with the
candidate:

```
$ node packages/cli/dist/bin.js compile dream.config.json | sed -n '176,195p'
# STEP 5–9: TESTABILITY GATE → CANDIDATE → BASELINE → EVALUATION
...
Evaluator entrypoints for this repo:
- bench: `npm test`
- darwin: `npx @metaharness/darwin evolve --sandbox real`

Before trusting any entrypoint above, classify it with this repo's own
liveness check: run `dream-machine verify-entrypoints` (wraps every configured
`evaluatorEntrypoints` command through `classifyEntrypointResult`) and only
treat a `live` verdict as license to proceed. A `blocked` or
`suspicious-silent` verdict is itself evidence, not a reason to retry until it
looks live — do not record `EVALUATED=yes` from an entrypoint that has not
cleared this gate.

$ node packages/cli/dist/bin.js verify-entrypoint bench --cmd "npm test"
bench: live (exit 0) — produced output
$ node packages/cli/dist/bin.js verify-entrypoint darwin --cmd "npx --no-install @metaharness/darwin evolve --sandbox real"
darwin: blocked (exit 1) — npm error npx canceled due to missing packages and no YES option: ["@metaharness/darwin@0.14.0"]
```

Baseline vs candidate `npm test`, reproduced independently twice (once by this
session via `git stash`/`git stash pop`, once more by the independent critic
subagent via its own separate `git stash`/`git stash pop`):

```
BEFORE (git stash, base = 2fba255): 7 files, 106 tests, 106 passed
AFTER  (git stash pop, candidate):   7 files, 108 tests, 108 passed
```

## Darwin (bounded evolution)

`DARWIN=not-applicable` — same reasoning as 2026-08-13 and 2026-09-08, now with
direct corroboration from PR #18's own (independently-run, pre-existing)
finding: bounded Darwin evolution against this repo has no differentiating
signal to search over for a change at this layer — there is no mutable
population of prompt-template variants, and `packages/compile` is a pure,
small, exhaustively-branched function. Running Darwin here would not bound a
real search; it would simulate one against a single frozen template. Not a
stop condition — the promotion gate does not require Darwin when no evolvable
population exists.

## Evidence

- OBSERVATION: `packages/cli/src/entrypoint.ts`'s own doc-comment, read in
  full before editing, named this exact gap ("the wiring ADR-0002 §3 named and
  explicitly deferred: 'does not yet auto-wire evaluatorEntrypoints through the
  classifier inside the compiled prompt itself'") — confirming the candidate
  targets a real, previously-identified, previously-unaddressed gap rather
  than a newly-invented one.
- OBSERVATION: `mcp__github__pull_request_read` on PR #18 returned
  `head.sha = ed97cb897029f82223d76ebe8fcac6979f67a55f`, which does not match
  that same PR body's self-reported "exact remote head"
  (`f296e5034541f6e603bcd468e8406fdd6392852d`) — a direct, tool-verified
  discrepancy, not an inference.
- MEASUREMENT: `npm test` — 106/106 (baseline, commit `2fba255`) → 108/108
  (candidate), reproduced twice independently (this session + critic
  subagent), 0 regressions, 0 removed/modified tests.
- MEASUREMENT: `search/issues` against `LLM-Dev-Ops/agentics-dream-machine` —
  2 merged PRs (#8, #9), 14 closed-unmerged, 58 open, out of the PRs surveyed
  tonight (#81/#93/#101/#111/#113/#123/#131 plus #18, #83, #9, #8).
- INFERENCE: the darwin entrypoint's version string advancing from `0.10.2`
  (2026-09-08) to `0.14.0` (tonight) across real, network-touching `npx`
  attempts is consistent with genuine upstream package activity, not a
  fabricated/stale number reused from a prior report.
- DECISION: ship the compiled-prompt wiring as a small, additive, orthogonal
  change to `step6to9Candidate()` only; do not touch `classifyConfiguredEntrypoints`,
  `verify-entrypoints`, or any of the six open darwin-classifier PRs' logic —
  zero file overlap, zero collision risk with the open backlog.
- DECISION: do not build on, cite as ground truth, or extend PR #18 tonight —
  its head-SHA discrepancy and unverifiable precision are a standing concern
  for human review, not something this candidate should inherit or paper over.
- REJECTION: considered also adding a `flywheel` key to this repo's
  `dream.config.json` tonight (SCAN=flywheel) — rejected because no verified
  real `flywheel` CLI invocation was independently confirmed by this session
  (PR #18's `npx metaharness flywheel help` claim was not re-verified
  firsthand), and a `dream.config.json` content change is a distinct,
  human-reviewable decision already flagged as out-of-scope by the
  2026-09-08 report for the same reason.

## Reward-Hack Check

Independent critic — a separate, freshly-spawned subagent (not this
candidate's author, no shared reasoning trace) — reviewed the diff for
weakened/removed/modified tests, gold-data/threshold tampering,
mischaracterized classifier behavior, command-injection exposure, tautological
self-graded tests, and scope creep. It independently ran `git stash` /
`npm test` / `git stash pop` / `npm test` itself rather than trusting this
report's numbers, and independently read `packages/cli/src/entrypoint.ts` to
check the new prompt text's accuracy against the real implementation.

**Verdict: CLEAR of reward-hacking.** Critic's own reproduced counts: 106/106
(before) → 108/108 (after), exact match with this report. No existing
`expect(...)` altered or deleted — only insertions in test files. No gold
data/benchmark corpus/threshold in the diff (4 files touched, none of them
corpus/threshold files). The new instruction text was confirmed accurate
against the real three-way verdict logic (`blocked`/`suspicious-silent`/`live`)
in `classifyEntrypointResult` — not an overstated or invented capability; the
diff only increases discoverability of an already-existing, already-reviewed
opt-in command. No new exec path, no new command-injection surface.

**Non-blocking finding from the critic:** the new test asserts on literal
prose substrings (`'dream-machine verify-entrypoints'`, `'classifyEntrypointResult'`)
that this same diff introduces — the test author is partly grading its own
homework. Judged acceptable and non-blocking for this specific package: every
existing test in `packages/compile/src/index.test.ts` already follows this
`toContain`-on-generated-prose pattern (it is a deterministic prompt
*compiler*, not business logic), and a golden snapshot was updated alongside
it, so any further unintended drift is still caught independently by snapshot
diffing rather than relying on the `toContain` assertions alone.

No blocking defects found.

## Security Review

- **Tool/command-authority scope**: unchanged. The diff emits only static
  template-string prompt text; it introduces no new `exec` path and does not
  change `classifyConfiguredEntrypoints`'s existing `(cmd: string) =>
  Promise<ExecResult>` signature. It makes an existing, already-reviewed
  opt-in CLI command more strongly recommended to a future agent — it does
  not grant that agent any capability it did not already have.
- **Unpinned `npx @metaharness/darwin` invocation (flagged a third
  consecutive relevant night, not fixed)**: `dream.config.json`'s real
  `darwin` entrypoint still has no version pin and no `--no-install`/`-y`
  guard. Reconfirmed blocked tonight via the same `--no-install` substitution
  used 2026-09-08 — deliberately not running the literal unmodified command
  unattended. Out of scope for a prompt-template-layer candidate; a
  `dream.config.json` content edit is a distinct, human-reviewable decision.
- **PR #18 narrative/git-state discrepancy (new observation tonight)**: a
  draft PR's body making claims about its own git state that do not match
  what the GitHub API reports for that same PR is a credibility signal worth
  a human's attention — not because anything was promoted or merged (nothing
  was), but because it shows the backlog's self-reported evidence is not
  uniformly trustworthy and should not be treated as ground truth by a future
  night without independent reverification, exactly as this session treated it.
- **Credential exposure**: none — no model calls, `LLM_EVAL` not touched.
- **Prompt injection / cross-agent poisoning**: the new generated text is
  entirely derived from this repo's own `evaluatorEntrypoints` config keys and
  values (locally-authored, PR-reviewed), not from any external or
  attacker-controllable runtime input — same trust boundary as the
  pre-existing `evLines` rendering it sits beside.
- **Least privilege**: no new IO capability; `classifyConfiguredEntrypoints`'s
  `exec` parameter remains the caller's own injected function, untouched.

## Scan Findings

**flywheel** — No `flywheel` key exists in `dream.config.json#evaluatorEntrypoints`
on `main`; the surface is entirely aspirational on this repo today, proposed
only in the unverified draft PR #18. Nothing to classify tonight for this scan
on real configuration; tonight's candidate is written to cover it automatically,
without further changes, if and when a human merges a real `flywheel` entry.

**darwin** — Ground truth reconfirmed: `bench`→live, `darwin`→blocked (package
not locally cached, version now `0.14.0`). Six open PRs (#81, #101, #111,
#113, #123, #131) already carry substantial, non-duplicated darwin-classifier
logic (stale-run-id detection, sandbox-mode diagnosticity, genome-relevance
scoring, swallowed-positional-arg detection, and wiring #111's finding into CLI
output) — tonight's survey found no gap left on this specific sub-surface that
isn't already claimed by an open PR; the remaining gap this session found and
fixed was one layer up, in the compiled-prompt template that tells an agent to
*use* any of this machinery in the first place.

## Competitors

| System | Wiring tool/evaluator liveness checks into the agent's own governing instructions (vs. leaving them as a separate opt-in primitive) | Grade |
|---|---|---|
| OpenHands | Ships a "Stuck Detector" (docs.openhands.dev/sdk/guides/agent-stuck-detector) as an auxiliary service watching the event stream — a behavioral stall detector, not confirmed to be referenced inside the agent's own governing system prompt/instructions the way tonight's candidate wires classification into the compiled routine text itself | A (official docs, reproduced 2026-09-08 and again tonight) |
| DSPy/GEPA | `dspy.ai/diving-deeper/gepa-in-depth`: compiles reflection-optimized instructions into a fresh Module at build time — a genuine prompt-compilation precedent, but the output is a runtime object (reproducibility depends on pinning seed + reflection model + budget + dataset per the official docs), not a deterministic, golden-snapshot-testable text artifact the way `packages/compile` treats the nightly prompt | A (official docs) for the compilation claim; C (Simon Willison, Jul 2026, single-source) for a reported overfitting case (95% train vs 85% test) on GEPA-optimized prompts |
| "Capability present but prompt doesn't reference it" as a named failure mode | No canonical/standardized term found across official sources searched tonight. Closest informal analog: a practitioner write-up's "the model skips your tool" framing (an available-but-unreferenced-tool problem) | C (single blog, dev.to) — reported as an honest negative finding, not asserted as an established term |
| "Evaluation flywheel" (grounding this repo's SCAN=flywheel name) | No A-grade (official vendor docs / arXiv) definition found. Converging B-grade consensus across independent vendor sources (Galileo blog's "self-reinforcing improvement cycle"; Pragmatic Engineer's analyze→measure→improve→automate→repeat; LangChain's "a score is only useful when it changes what ships") describes a loop where production failures/traces feed new eval cases that gate the next release | B (vendor blog / independent newsletter, cross-checked across 3 sources) |
| AutoGPT-lineage | Community failure catalogs document agents self-reporting false success with no independent liveness check (unchanged finding from 2026-08-13, not re-researched tonight — no new primary source fetched) | C (unchanged from prior report) |

## Gist

This report. `gh gist create` is not available to this session (GitHub access
is via MCP tools scoped to issues/PRs/branches on
`LLM-Dev-Ops/agentics-dream-machine`; no gist-creation tool present) — same as
2026-08-13 and 2026-09-08. Published as a local artifact
(`/tmp/dream-work-2026-11-17/dream-gist-2026-11-17.md`), committed into the PR
as `docs/dream-cycle/2026-11-17-evaluation-adapters-report.md`. `GIST=LOCAL`.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so the stamp
cannot be written *inside* the file it stamps. The committed copy at
`docs/dream-cycle/2026-11-17-evaluation-adapters-report.md` is the frozen,
hashed artifact; this section is filled in immediately before that file is
committed, over content identical up to this point. Anyone can independently
reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-11-17-evaluation-adapters-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at the
start of tonight's session, before this candidate's changes). REPORT_HASH and
WITNESS are published in the PR body and the `LEDGER.md` row, both pointing
back at this file by path and session commit.

## Recommendation

Human review of the draft PR. Concrete next steps, not done tonight:

1. **Resolve the PR #18 narrative/git-state discrepancy.** A human should
   either independently re-verify PR #18's claims from scratch (its own head
   commit, not its body's self-reported one) or close it pending that
   re-verification — a 2+-month-old, 29-file, unreviewed draft accumulating
   increasingly specific claims with a confirmed head-SHA mismatch should not
   keep aging silently in the backlog.
2. **Address the 58-PR / 70+-day zero-merge backlog directly**, e.g. by
   triaging the smallest, lowest-risk, already-evaluated candidates (this one
   included) for an actual human merge decision, or by explicitly deciding
   some surfaces (like the six darwin-classifier PRs, which do not conflict
   with each other on files but do overlap conceptually) should be
   consolidated into one before merge rather than left as six parallel drafts.
3. **Pin or guard the `darwin` evaluator entrypoint** in `dream.config.json`
   (exact version pin, or `--no-install` with a documented one-time local
   install step) — flagged a fourth consecutive relevant night (2026-08-13,
   2026-09-08, PR #18, tonight), still not builtin as a human-reviewable
   config decision distinct from tonight's candidate.
