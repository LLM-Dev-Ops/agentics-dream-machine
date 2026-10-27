# Evaluation-Adapters SOTA Report — 2026-10-27

## TL;DR

Tonight's `DEEP=evaluation-adapters` / `SCAN=flywheel,darwin` surface has been hit seven times before (`#18, #20, #45, #53, #61, #71, #81`), zero merged, and three of those nights (`#53, #61, #71`) explicitly logged "reconfirmed, no new candidate." PR `#18` (2026-09-12, unmerged 45 days) already found and fixed the headline bug — `dream.config.json`'s `darwin` evaluator entrypoint is missing its required `<repo>` positional argument, so Darwin's CLI silently treats the literal token `--sandbox` as the repo root and writes its state into a bogus `./--sandbox/` directory in whatever `cwd` it's invoked from. `#18`'s own `ADR-0003` (Proposed, unmerged) additionally found that even with the arg fixed, every sandbox mode (`real`, `mock`) scores all evolved variants identically (`Delta over baseline: +0.000`), and speculated this is fixable with "a hand-authored bench suite."

**New tonight:** that speculation is wrong, and falsifiably so. Darwin's evolvable genome is a fixed set of 7 synthetic agent-harness policy files (`context_builder.ts`, `tool_policy.ts`, `score_policy.ts`, `reviewer.ts`, `retry_policy.ts`, `memory_policy.ts`, `planner.ts`) that exist only inside Darwin's own `.metaharness/variants/*` workspace — they are never written into, nor read by, the target repo. `agentics-dream-machine`'s actual source tree (`packages/*/src/*.ts`) contains **zero** occurrences of any of those seven identifiers. No bench suite authored against this repo's own test command can make a mutation to those seven files change that command's outcome, because nothing in this repo's test suite is wired to read them — under `real`, `mock`, *or* `agent` sandbox mode (the latter runs Darwin's own built-in synthetic "find the buggy file among distractors" task, also unrelated to this repo). The "no signal" result isn't a bench-authoring gap; it's a category mismatch between Darwin's genome model (built for repos that *are* themselves modular agent harnesses exposing these seven swappable surfaces) and this repo's actual architecture (a nightly CLI/orchestration tool with no such surfaces).

## What's new

- Confirmed via direct, real (non-simulated) execution of `npx @metaharness/darwin evolve --sandbox real` against this exact checkout (`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`) that the missing `<repo>` arg bug is still live on `main` (reproduced the exact `./--sandbox/.metaharness/...` artifact `#18` described).
- Read Darwin's own compiled source (`tier2-sandbox.js`, `evolve.js`, `cli.js`) to trace *why* zero sandbox mode gives signal: the genome is structurally foreign to any repo that doesn't itself define `context_builder.ts`-style surfaces.
- Static grep across `packages/*/src` (7 identifiers × this repo's real source tree): **0/7 found**, confirming the mismatch directly rather than inferring it from flat scores alone.
- Implemented a small, pure, reviewable static detector (`packages/cli/src/darwin-genome.ts`) that makes this check a permanent, automatic, CI-verifiable fact instead of a one-night observation — see Candidate below.

## Competitors (evaluation-harness-for-arbitrary-target-repo problem)

| System | Genome model | Target-repo coupling | Grade |
|---|---|---|---|
| Sakana AI Scientist | LLM-authored experiment code, scored by its own generated eval harness | Tight — genome *is* the generated artifact under test | B (vendor blog + paper, cross-checked against OSS repo) |
| OpenHands (evaluation harness) | N/A — it's an agent runtime evaluated via SWE-bench-style external harnesses, not self-evolving | External, benchmark-defined | A (official repo/docs) |
| DSPy / GEPA | Evolves *prompts/modules* that are directly invoked inside the target program's own execution graph | Tight — the evolved artifact is literally called by the program being optimized | A (official repo/docs) |
| SWE-agent | Fixed agent scaffold evaluated against SWE-bench tasks; no self-evolving harness genome | External, benchmark-defined | A (official repo/docs) |
| `@metaharness/darwin` (this repo's configured evaluator) | Fixed 7-file synthetic "agent harness" genome, evaluated by (a) target's own test command (`real`), (b) static params (`mock`), (c) a built-in synthetic bug-finding task (`agent`) | **None of the three** read or write the target repo's own source | C→A (official package source, read directly) |

The pattern across every comparator whose genome produces real signal (Sakana, DSPy/GEPA): the evolved artifact is mechanically wired into the thing being scored. Darwin's `real`/`mock`/`agent` modes never wire the genome into the target repo at all — only its unused `llm-agent` mode (ADR-273, real API spend, blocked tonight — `LLM_EVAL=blocked`, no `OPENROUTER_API_KEY`) sends the genome's files to a real LLM call, which is the one path that could plausibly produce a repo-relevant signal, and tonight's credentials don't permit testing it.

## Hypothesis (frozen before implementation)

> Given the real `@metaharness/darwin` package (v0.12.1) invoked with the corrected `<repo>` positional argument against `agentics-dream-machine`'s actual source tree (`packages/*/src`), when Darwin's seven evolvable genome-surface identifiers (`context_builder`, `tool_policy`, `score_policy`, `reviewer`, `retry_policy`, `memory_policy`, `planner`) are checked for textual occurrence in that source tree, then the overlap count should be **zero**, confirming that no `real`- or `mock`-sandbox bench suite authored against this repo's own test command can ever causally connect a genome mutation to that command's outcome — correcting ADR-0003's (Proposed, unmerged in `#18`) open conjecture that "a hand-authored bench suite" would resolve the lack of evolutionary signal. Subject to: real (not simulated) package source inspected; no modification to `@metaharness/darwin` itself; no pre-existing test weakened; the detector added must be pure (no process spawn, no network) so it runs safely even when the entrypoint itself is `blocked`.

## Evaluation

Real evaluator: `npm test` (vitest), fresh `npm ci && npm run build` at `SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.

| | Baseline (`2fba255`) | Candidate |
|---|---|---|
| Tests | 106/106 | 112/112 (+6 new, 0 removed/modified) |
| Build | clean (6 workspaces) | clean |
| Static overlap check vs real `packages/*/src` | n/a (detector didn't exist) | **0/7** surfaces found — hypothesis confirmed |
| Darwin real-execution reproduction | n/a | `npx @metaharness/darwin evolve --sandbox real` (no repo arg, exactly as configured in `dream.config.json` on `main` today) → created `./--sandbox/.metaharness/variants/g1_v0` etc. in cwd, exit 0, classified `live` by this repo's own `verify-entrypoints` — a **false positive**: "live" but evaluating a bogus path, not this repo |

Darwin itself was not re-run as part of the candidate's automated test suite (that would require network + would mutate working-tree state non-deterministically, which the new detector is explicitly designed to avoid needing). The one real, reproducible Darwin invocation above was manual, logged, and its artifact was removed before committing (`rm -rf -- --sandbox`), consistent with "the candidate may never modify evaluation gold answers" / leave stray state.

## Darwin Lineage

`DARWIN=not-applicable` — the candidate is a small, pure, deterministic static-analysis addition (no evolvable population; same precedent as PRs `#18/#20/#45/#81`, each of which also marked `not-applicable` for this surface's own bounded-Darwin step, since none of them touch Darwin's own source).

## Evidence (classified)

- **MEASUREMENT**: `grep` of 7 identifiers across `packages/*/src/*.ts`, real repo tree, tonight — 0/7 matches (file list + command in PR body).
- **OBSERVATION**: real `npx @metaharness/darwin evolve --sandbox real` execution, tonight, exit 0, artifact `./--sandbox/.metaharness/variants/g1_v0` created, removed before commit.
- **OBSERVATION**: Darwin's compiled source (`tier2-sandbox.js` header comment, `cli.js` lines ~205-245) read directly — `repoRoot = resolve(process.argv[3] ?? cwd())`; `--sandbox` consumed as `argv[3]` when no repo arg precedes it.
- **INFERENCE**: because the genome files live only under Darwin's own `workRoot` and are never copied into or referenced by the target repo under any of `real`/`mock`/`agent` sandbox modes, no bench suite targeting the repo's own test command can create a causal path from mutation → outcome.
- **HYPOTHESIS, not measured tonight**: `--sandbox llm-agent` might produce repo-relevant signal (the genome's text is sent to a real model call) — untested, `LLM_EVAL=blocked`, flagged as next step.
- **DECISION**: ship the static detector as a permanent regression guard; do not attempt a hand-authored bench suite (ADR-0003's proposed fix), since the measurement above shows it cannot work for `real`/`mock` modes regardless of authoring quality.
- **REJECTION**: rejected candidate "re-submit `#18`'s config fix" — pure duplicate of unmerged, already-correct work; rejected candidate "hand-author a bench suite" — invalidated by tonight's measurement before any implementation effort was spent on it.

## Reward-Hack Check

No pre-existing test weakened, removed, or modified (6 new tests, additive only, `entrypoint.test.ts`/new `darwin-genome.test.ts`). No benchmark, gate, threshold, or gold answer touched. The new detector does not spawn a process, touch the network, or read anything outside the repo's own `packages/*/src` tree it's handed — it cannot be used to fabricate a "live" or "relevant" verdict; a false negative (missed overlap) degrades gracefully to "assume unrelated," never silently to "confirmed relevant." No undisclosed cache dependency.

## Security Review

No new execution surface — `assessGenomeRelevance()` takes an array of `{path, content}` and does substring matching only; the CLI wrapper reuses the exact same `io.readFile`/glob pattern already used by `verify-entrypoints`. No credential exposure. No new network calls. The one real `npx @metaharness/darwin` invocation performed tonight to gather evidence used the same unpinned-version risk already flagged in `#18`/`#20` (not newly introduced, not fixed here — `#20`'s `verify-supply-chain` already tracks it).

## Scan findings

- **flywheel**: `@metaharness/flywheel@0.1.12` exists on the registry ("a verifiable self-improvement loop for agent harnesses") but ships no `bin` field — confirmed via `npm view`, matching `#18`'s finding that the correct invocation is the umbrella `npx metaharness flywheel help`. `dream.config.json` on `main` has **no `flywheel` key at all** in `evaluatorEntrypoints` (only `bench`+`darwin`) — `#18`'s fix (which adds it) is unmerged. Not re-fixed tonight to avoid a third duplicate of the same config-key edit; flagged in Recommendation.
- **darwin**: covered above — the headline finding.

## Reviewed, not duplicated

`#18` (repo-arg + flywheel fix + ADR-0003), `#20` (supply-chain pin check), `#45` (`entrypointExitCode` helper), `#53`/`#61`/`#71` (reconfirmations, no candidate), `#81` (stale-child-id classifier). None of them tested genome/target-repo textual overlap; that's this candidate's contribution.

## 3 concrete next steps

1. A human reconciles the `#18`/tonight's-candidate overlap: `#18` should merge first (it's the actual bug fix + flywheel wiring); this candidate's detector should be rebased onto it once it lands, since the detector is most useful *after* `verify-entrypoints` stops misclassifying the broken invocation as `live`.
2. If anyone wants real Darwin evolutionary signal against this specific repo, the only sandbox mode structurally capable of it is `llm-agent` (ADR-273) — budget `OPENROUTER_API_KEY` and a small, explicit spend cap, then re-run tonight's measurement under that mode specifically.
3. Resolve the `ADR-0003` numbering collision before either PR merges: `#18`'s branch and tonight's candidate both compute "0003" as the next free ADR number from `main`; whichever merges first keeps it, the other renumbers.

## Recommendation

`REJECT` the implicit premise that a better bench suite fixes Darwin's signal problem (ADR-0003's open conjecture) — replaced with a measured, falsifiable root cause. `ACCEPT` the static detector as a small, reviewable, zero-risk regression guard. Separately and unchanged from every prior night since `#18`: 50+ open draft PRs, zero merged since `#8` (2026-09-08) — a human decision on backlog triage is overdue and outside this session's authority.

## Witness

```
report_sha256 : 612a4778dbaee1ec06d9cbfbbb90eb918cf83e7709904cea9598ff681f9a70ea
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : 4f91d536fad68998a20fd1f9ae39038fd90082aa4839a48703cd1db959d643f7
```

Note (same convention as `#18`/`#20`/`#81`): `REPORT_HASH` is computed over this
report's bytes with the two values in this Witness section held at the fixed
placeholder string `<computed in STEP 16>` — the self-reference each value's
own computation depends on. To reproduce: restore those two placeholders in a
copy of this file, `sha256sum` it → must equal `REPORT_HASH` above; then
`printf '%s%s' "$REPORT_HASH" "2fba2550182d81b36423447221823e98e227482a" | sha256sum`
must equal `witness` above. Computed with this repo's own
`node packages/cli/dist/bin.js witness stamp <file> <commit>`.
