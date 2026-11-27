# Evaluation-Adapters / Flywheel+Darwin SOTA Report — 2026

## TL;DR

Tonight's SCAN pair (`flywheel`, `darwin`) has been named in this repo's
compiled nightly prompt every slot-2 night since at least 2026-09-12 — 17
prior issues carry "flywheel,darwin scan" or equivalent in their title. Every
one of those nights' substantive finding was about `darwin`. None ever ran
`@metaharness/flywheel` itself: it has no `bin` field (confirmed via `npm view
@metaharness/flywheel bin` → empty), so it cannot be invoked as a shell
command the way `darwin`/`bench` are, and this repo's `evaluatorEntrypoints`
schema (`dream.config.json`) is command-string shaped. SCAN=flywheel has been
checked in name only for 7+ months. Candidate: `packages/cli/src/flywheel-probe.ts`
— a new, pure-at-the-boundary module that calls the real, installed
`@metaharness/flywheel@0.1.15` package's own documented quickstart (a toy,
fully offline, deterministic proposer/evaluator loop) and classifies the
result with this repo's existing live/suspicious-silent/blocked vocabulary,
wired into a new `flywheel-probe` CLI subcommand. First real, live receipt
against the actual library tonight: `flywheel: live (exit 0) — 3 promotion(s)
across 4 generation(s), replay verified`. `entrypoint.ts`'s existing
`classifyEntrypointResult` contract is untouched. Working-tree pollution from
the control-plane darwin probe (`--sandbox/.metaharness`, independently
reproduced tonight, already tracked by issue #156/PR #157) was hit again and
cleaned up — not re-fixed here, already has an open fix.

## What's new

- `npm view @metaharness/flywheel bin` returns nothing — confirmed the
  package ships no CLI; it is a dependency-free (`deps: none` per `npm view`),
  typed, ESM/CJS library you call via `runFlywheelGenerations()`. Contrast
  with `@metaharness/darwin`, which does have a `bin` and is exactly what
  every prior evaluation-adapters night's PRs (#18/#81/#101/#110/#111/#112/
  #113/#122/#123/#130/#131/#140/#148/#149/#156) have been about.
- Searched 17 issues matching "flywheel" via `gh api search/issues`: every
  title's mention of "flywheel" is the trailing "+ flywheel,darwin scan"
  decoration; none investigate the package itself. `grep -r flywheel
  packages/*/src` on `main` before tonight: zero functional references (only
  a pre-existing test name and a config schema field, see below).
- `packages/compile/src/config.ts` already declares an optional
  `flywheel?: string` field ("Flywheel gate entrypoint, if the target ships
  one") in its `DreamConfig` type, but this repo's own `dream.config.json`
  never sets it, and no code path ever calls a flywheel-shaped entrypoint —
  the schema anticipated a command-string shape that doesn't fit the real
  package.
- Reproduced the exact `--sandbox/.metaharness` working-tree pollution
  issue #156/PR #157 describes, independently, by running this repo's
  configured `darwin` entrypoint as part of tonight's STEP 0.5 control-plane
  probe (`git status --short` → `?? --sandbox/` immediately after). Cleaned
  up (`rm -rf -- --sandbox`) before building further — not re-fixed as a
  candidate tonight; #157 already proposes a fix (`diffWorkingTree` +
  `execWithSideEffectCheck`), unmerged.
- Live GitHub state reconfirmed tonight via `list_issues`/`list_pull_requests`
  (not the stale local ledger): 72+ open issues, 30+ open draft dream-cycle
  PRs (#99-#157 inclusive), **0 merges since PR #9** (2026-09-08), all
  branching from the same `main@2fba255`. `docs/dream-cycle/LEDGER.md` on
  `main` is still 9 rows (`ledger verify` still reports the same 9 schema
  errors in rows 2-6) — every night's own ledger-append lands only on its
  own unmerged branch.

## Hypothesis (frozen before implementation)

> Given the real, installed `@metaharness/flywheel@0.1.15` package (no `bin`
> field, confirmed via `npm view`) and this repo's `entrypoint.ts` classifier
> (built for exec-shaped, command-string evaluators), when a new pure-at-the-
> boundary module runs the package's own documented quickstart demo (toy,
> deterministic, offline proposer/evaluator) and maps its output onto the
> existing live/suspicious-silent/blocked vocabulary, then (1) the real
> package should reproduce its own README's documented expected output
> byte-for-byte (lift curve `0.00 -> 0.33 -> 0.67 -> 1.00`, 3 promotions,
> `replayVerifies: true`), and (2) a new `flywheel-probe` CLI command wired
> the same way `verify-entrypoint`/`verify-entrypoints` are should report
> `flywheel: live`, subject to: zero change to `entrypoint.ts`'s existing
> `classifyEntrypointResult` contract or tests, zero change to
> `dream.config.json`, no pre-existing test weakened, `npm test` 0
> regressions, and zero network/credential surface (the probe is 100%
> offline/local).

**Tested. Confirmed true, not falsified.**

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest) + a live, unmocked run of the real
`@metaharness/flywheel` npm package via this repo's own built CLI.
`LLM_EVAL=blocked` — no model-calling credentials (`OPENROUTER_API_KEY`) in
this environment; the candidate needed none (the probe's proposer/evaluator
are pure, deterministic, synchronous-logic toy functions, not model calls).

| | Baseline (`main@2fba255`) | Candidate |
|---|---|---|
| Test files | 7 | 8 |
| Tests | 106 | **112** (+6, 0 removed/modified) |
| Lint | clean | clean |
| Build (6 workspaces) | clean | clean |
| Typecheck (`tsc -b --noEmit`) | pre-existing `tsconfig.json` empty-files-list error (`TS18002`) | identical error, reproduced via `git stash`/`git stash pop` — confirmed pre-existing/environmental, not caused by this candidate |
| `npm audit` | 21 advisories (2 low, 12 moderate, 4 high, 3 critical), `prod: 13` | 21 advisories, unchanged — `@metaharness/flywheel` adds 1 prod dep (`prod: 14`) with 0 runtime dependencies of its own |

Diff: `packages/cli/src/flywheel-probe.ts` (new, 103 lines) +
`flywheel-probe.test.ts` (new, 48 lines) + `index.ts` (+16/-0: new
`flywheel-probe` case + import + help line) + `index.test.ts` (+9: one new
`describe` block) + `package.json` (+1: pinned exact dependency
`@metaharness/flywheel: 0.1.15`). `entrypoint.ts` and `dream.config.json`
untouched — zero file overlap with the open darwin-classifier backlog
(#101/#111/#112/#113/#122/#123/#130/#131/#148/#149/#156).

Live receipt tonight against the real, installed package:

```
$ node packages/cli/dist/bin.js flywheel-probe
flywheel: live (exit 0) — 3 promotion(s) across 4 generation(s), replay verified
$ echo $?
0
```

Independent scratch-directory reproduction (outside the repo, `/tmp`, fresh
`npm install @metaharness/flywheel@0.1.15`, README's own quickstart copied
verbatim and run with `node`):

```
lift curve: 0.00 -> 0.33 -> 0.67 -> 1.00
promotions: 3
replay verifies: true
```

Byte-for-byte match with the package's own README "Expected output" block
and with this candidate's test assertions (`flywheel-probe.test.ts`) — not
invented or cherry-picked.

## Darwin (bounded evolution)

`DARWIN=not-applicable` — the candidate is a small, deterministic,
exhaustively-branched classifier plus a thin wrapper around a third-party
library's own documented demo; there is no evolvable policy/harness-surface
population for Bounded Darwin to mutate (same precedent as PRs
#18/#81/#101/#111/#113/#123/#131/#149).

## Evidence

- OBSERVATION: `npm view @metaharness/flywheel bin` → empty; `npm view
  @metaharness/flywheel` → `deps: none`, `keywords: … promotion-gate, …
  evaluation …`. Confirmed real, not assumed.
- OBSERVATION: `gh api search/issues` for "flywheel" across this repo → 17
  hits, 0 of which investigate the package itself (all are the "+
  flywheel,darwin scan" title suffix).
- OBSERVATION: `grep -ri flywheel packages docs dream.config.json` on `main`
  before tonight → one test name (`entrypoint.test.ts`, documents the *bare
  CLI* failing, not the library), one unused schema field
  (`packages/compile/src/config.ts#flywheel?: string`), and the scan-label
  string in `dream.config.json` itself. No functional integration.
- MEASUREMENT: `npm test` 106/106 → 112/112, 0 regressions (independently
  reproduced by a fresh critic subagent via its own `git stash`/`git stash
  pop` round-trip, confirmed byte-identical tree restoration).
- MEASUREMENT: real, offline `runFlywheelGenerations()` call (this repo's
  probe and an independent scratch-dir copy of the README's own quickstart)
  both produce lift curve `[0, 0.33, 0.67, 1.00]`, 3 promotions, replay
  verifies `true` — deterministic (`now()` fixed), reproduced twice by this
  session and once independently by the critic.
- MEASUREMENT: reproduced the `--sandbox/.metaharness` working-tree pollution
  (issue #156) independently tonight: `git status --short` → `?? --sandbox/`
  immediately after the configured `darwin` STEP 0.5 probe ran.
- INFERENCE: SCAN=flywheel has been structurally unreachable by this repo's
  exec-based `evaluatorEntrypoints`/`classifyConfiguredEntrypoints` design
  since the scan pairing was introduced — not a code bug in `entrypoint.ts`
  (which is doing exactly what it was built for, correctly, for command-shaped
  evaluators), but a category mismatch between a library-shaped evaluator and
  a command-string schema.
- DECISION: ship an additive, in-process probe (`flywheel-probe.ts` + CLI
  subcommand) that gives `flywheel` the same live/suspicious-silent/blocked
  observability `darwin`/`bench` already get, reusing the vocabulary rather
  than inventing a parallel one.
- DECISION: pin the new dependency to an exact version (`0.1.15`), unlike the
  unpinned `npx @metaharness/darwin …` this repo's own config already uses
  (flagged repeatedly by prior nights, e.g. #20/#63/#149) — a real dependency
  in `package.json` locked by `package-lock.json`, not an unpinned `npx` at
  run time.
- REJECTION: did not add a `flywheel` key to `dream.config.json`'s
  `evaluatorEntrypoints` — there is no real shell command to put there; doing
  so would fabricate a command-string for a library, reintroducing the exact
  "exit 0 with no real signal" failure class `classifyEntrypointResult` exists
  to catch, just one level up.
- REJECTION: did not attempt to route flywheel through
  `classifyConfiguredEntrypoints`/`exec()` — wrong shape; `exec()` expects a
  shell command, not a library call. Kept the new probe as its own primitive
  instead of forcing a mismatched abstraction.
- REJECTION: did not mint a new ADR tonight — same collision-avoidance
  reasoning as PR #101 (`main`'s next free ADR number is still contested by
  unmerged PR #18's proposed ADR-0003); this is also a tooling/observability
  addition within the already-decided evaluator-trust framing of
  ADR-0001/0002, not itself a fresh architectural decision.
- REJECTION: did not re-fix the `--sandbox/.metaharness` pollution bug
  (issue #156) — an open, unmerged PR (#157) already proposes a fix; adding a
  second independent one would just be another unreviewed duplicate.

## Reward-Hack Check

Independent critic (separate, freshly-spawned subagent with no access to
this session's reasoning) independently: read the diff and both new files;
confirmed `entrypoint.ts` untouched; rebuilt and retested the candidate;
isolated the baseline via its own `git stash`/`git stash pop` (confirmed the
round-trip restored a byte-identical tree); ran `node packages/cli/dist/bin.js
flywheel-probe` itself; independently installed `@metaharness/flywheel@0.1.15`
in its own scratch directory outside the repo, fetched the real README via
`npm view`, and ran the documented quickstart itself to confirm the
candidate's expected numbers were not invented; grepped the new file for
network calls (none); checked `npm audit` before/after (21/21, unchanged);
adversarially tried to construct inputs that would make `classifyFlywheelProbe`
report "live" from a failure (flat lift curve, zero promotions, failed replay
with nonzero promotions) — all three correctly degrade to `suspicious-silent`
or `blocked`.

**Verdict: CLEAR.** No benchmark/gate/threshold/gold-answer file touched; no
pre-existing test weakened, removed, or retargeted (diff to `index.test.ts`
is one new, additive `describe` block); exit-code mapping
(`live=0/blocked=1/suspicious-silent=2`) confirmed textually identical to the
existing `verify-entrypoint`/`verify-entrypoints` ternaries.

**Non-blocking nitpicks, not fixed tonight** (logged, not hidden):
1. The `flywheel-probe` CLI case's `catch` branch (the probe throwing before
   producing a `FlywheelProbeResult` at all) reports `blocked` via a
   hand-written string rather than routing through `classifyFlywheelProbe`'s
   typed `EntrypointCheck` — a deliberately distinct failure mode (threw vs.
   "ran but its own replay check failed"), kept separate rather than forced
   through one type to avoid a premature abstraction; exit code (1) is
   unaffected and consistent.
2. The module's doc comment's characterization of the pre-existing
   `npx @metaharness/flywheel` regression test ("only proves the bare CLI
   invocation fails") is this candidate's own summary of that older test's
   intent, not independently re-verified by the critic against that test's
   original authorship context — doesn't affect this diff's correctness.

## Security Review

- **New execution surface**: none beyond an ordinary npm dependency. The
  probe calls only the real package's public, documented API
  (`runFlywheelGenerations`, `meetsPromotionRule`, `makeSigner`,
  `verifyReplayBundle`) with locally-defined, synchronous toy functions — no
  `exec`, no `fetch`/`http`, no filesystem writes.
- **Supply-chain**: `@metaharness/flywheel` pinned to an exact version
  (`0.1.15`, not a range) in `package.json`, locked in `package-lock.json`.
  `npm view @metaharness/flywheel dependencies` → none; `npm audit` advisory
  count unchanged (21 before and after). Contrast with the pre-existing,
  still-unpinned `npx @metaharness/darwin …` entrypoint this repo's own
  `dream.config.json` configures (tracked by #20/#63/#149, not fixed here).
- **Credential exposure**: none — `LLM_EVAL=blocked` and the probe needs no
  model-calling credentials by design.
- **Prompt injection / cross-agent poisoning**: N/A — no LLM calls in this
  candidate; the toy proposer/evaluator are deterministic local functions
  over a fixed, hardcoded rule list, not attacker-controllable input.
- **Working-tree hygiene**: the `--sandbox/.metaharness` pollution
  independently reproduced tonight (see above) comes from the pre-existing,
  unmodified `darwin` entrypoint — not from this candidate, which performs no
  filesystem writes of its own. Cleaned up before committing
  (`git status --short` confirmed clean afterward).
- **Least privilege**: the new CLI case requires no `io.exec` and no new
  `IO` capability — every existing `IO` fake (`compile`, `ledger`, `witness`,
  `tui`, `verify-entrypoint(s)`) is unaffected.

## Scan Findings

**flywheel** — this is the actual scan finding: SCAN=flywheel has been named
in the compiled nightly prompt every slot-2 night since 2026-09-12 (17
matching issue titles) but never substantively exercised, because the real
`@metaharness/flywheel` package has no CLI (`bin` field) to point
`evaluatorEntrypoints` at. Tonight is the first night with a real, live
receipt against the actual library (`flywheel: live (exit 0) — 3
promotion(s) across 4 generation(s), replay verified`). The underlying
category mismatch (library-shaped vs. command-string-shaped evaluator) is
not fully resolved — `flywheel-probe` is a hand-written, demo-specific
bridge, not a general one — flagged in Recommendation.

**darwin** — reconfirmed unchanged tonight: the configured `npx
@metaharness/darwin evolve --sandbox real` entrypoint still writes
`--sandbox/.metaharness` into `process.cwd()` (issue #156/PR #157, unmerged)
and still misparses `--sandbox` as the `<repo>` positional (issue #17/#148,
unmerged). Both independently reproduced again tonight as a side effect of
running STEP 0.5's control-plane probe. Not re-fixed — open PRs already
propose fixes.

## Competitors

| System | Library-shaped self-improvement loop vs. CLI-only tooling | Grade |
|---|---|---|
| DSPy / GEPA | Prompt/program optimizers (`dspy.GEPA` etc.) are invoked exclusively as library calls inside the caller's own Python process — no standalone CLI binary ships with the optimizer itself, the same "call it from code" shape `@metaharness/flywheel` has | B (public docs/API reference, not independently re-run tonight) |
| Sakana AI Scientist | The automated research-loop pipeline is driven by Python entry-point scripts the user runs directly (`python launch_scientist.py …`), not a packaged library API — opposite shape from flywheel's bare-library design | B (public repo README, not re-run tonight) |
| OpenHands | Ships both a CLI and a Python SDK; evaluation harnesses (e.g. SWE-bench runners) are typically invoked as scripts/CLIs, giving it liveness-checkable command surfaces flywheel-style libraries don't have | B (public docs, not re-run tonight) |
| SWE-agent | Config-driven CLI/script invocation for running trajectories and evaluation; no bare-library-only promotion-loop primitive comparable to flywheel found | C (secondary source, single-sourced) |
| AutoGPT lineage | Runs as an application/CLI, not distributed as an embeddable promotion-loop library | C |

(Lighter external-research pass than prior nights: tonight's finding is
dominated by first-party, reproducible evidence — the real package's own
behavior and this repo's own 7-month issue history — rather than external
SOTA comparison; competitor grades stay C/B pending independent re-verification.)

## Gist

`GIST=LOCAL` — no `gh gist create`-equivalent tool available to this session
(GitHub access here is MCP-tool- and `gh api search/*`-scoped only, same as
every prior evaluation-adapters night). Committed as
`docs/dream-cycle/2026-11-27-evaluation-adapters-report.md` (this file).

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so the
stamp cannot be written *inside* the file it stamps. This section is filled
in immediately before the file is committed, over content identical up to
this point.

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-11-27-evaluation-adapters-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at the
start of tonight's session, before this candidate's changes).

```
report_sha256 : 3777a94976ca0a611c8fbeb79ac3a169fa7964fbaf48cee503ccd75e3be28bfe
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : f257025f60e2ac17d638e09453fc88ace3f5b351c67810edbd231f312a6b435b
```

Self-reference convention (same as PR #101/#131/#157): the hash above is
computed over this file with this Witness section's two values still held at
the `<computed in STEP 16>` placeholder, i.e. over the content exactly as it
stood immediately before this edit. Reproduce with this repo's own
`node packages/cli/dist/bin.js witness stamp <file> <commit>`.

## Recommendation

Human review of the draft PR. Concrete next steps, not done tonight:

1. **Generalize `flywheel-probe` beyond the README's own toy demo.** Tonight's
   probe proves the library works and is reachable from this repo's own
   toolchain; it does not yet wire a real host evaluator (e.g. this repo's
   own `npm test`/`bench` as the Score function) into an actual promotion
   loop over this repo's own CLI surface — a materially larger, separately-
   reviewable change.
2. **Reconsider the `evaluatorEntrypoints`/`flywheel?: string` schema field**
   in `packages/compile/src/config.ts`. It is currently shaped for a command
   string, which cannot represent a library-shaped evaluator like the real
   `@metaharness/flywheel`. Worth a human decision (possibly its own ADR,
   once `main`'s next free ADR number is unambiguous) on whether the schema
   should gain a distinct "in-process adapter" entry shape rather than
   assuming every evaluator is `exec`-reachable.
3. **The ~80-day, 0-merge backlog remains a human decision**, already
   diagnosed twice (PR #135, #145: missing `automerge-safe` label, confirmed
   absent again tonight) — not re-litigated here, but restated because it is
   the dominant reason 30+ reviewable, evidence-backed candidates (including
   this one) have accumulated with zero feedback into the next night's
   search space.
4. `LEDGER.md` on `main` is 80+ days stale for the same structural reason
   (every night's ledger-append lands only on its own unmerged branch) —
   already tracked (issue #108/#138), not re-fixed here.
