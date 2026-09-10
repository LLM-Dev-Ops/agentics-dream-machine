# Compiler-Parity SOTA Report — 2026

## TL;DR

Tonight's rotation (`DEEP=compiler-parity`, `SCAN=config-schema,golden-snapshots`,
`SLOT=0`) tested whether this repo's own prompt compiler (`packages/compile`) is
in parity with the actual nightly routine the cloud scheduler is sending — the
compiled header's own text asserts "the authoritative copy is the cloud
scheduler routine; any in-repo mirror is a build output of the same
`dream.config`." Nothing previously verified that claim against a real
delivered prompt. Tonight it was verified by hand (byte-identical, SHA-256
match) and then turned into a permanent, reviewable regression test: a new
golden-snapshot test that compiles this repo's own `dream.config.json` and
snapshots the result, so any future drift between the config and the live
scheduler becomes a reviewable diff instead of a silent divergence.

**Result: parity holds today. `evaluated: accepted`.**

## What's new

- First night this repo's `packages/compile` test suite exercises the repo's
  *own* `dream.config.json` end-to-end. Every existing test (`packages/compile/src/index.test.ts`)
  only ever exercised a synthetic `metaharness` fixture config — useful for
  covering the compiler's branches, but it could never catch "the real config
  and the real compiled output have drifted."
- The live prompt delivered to this session tonight was captured verbatim and
  diffed byte-for-byte against `compile(JSON.parse(dream.config.json))`:
  identical SHA-256 (`74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d`),
  identical byte length (13,717 bytes). No drift, tonight.
- `validateConfig()` against the live `dream.config.json`: `ok: true`, zero
  errors, zero warnings — the schema (`packages/compile/src/config.ts`'s
  `DreamConfig` interface) and the actual JSON file are in sync; every key in
  the live config (`repo, cron, slots, bonusModuli, controlPlaneProbes,
  buildStep, evaluatorEntrypoints, adrConvention, competitors,
  extraDisciplines, ledgerPath, branchPrefix, labels, autoMerge`) maps to a
  modeled `DreamConfig` field.

## Competitors (how other agent-evolution / self-hosting frameworks handle
config→prompt/config compiler drift)

| System | Relevant mechanism | Evidence grade |
| --- | --- | --- |
| Sakana AI Scientist | Templated experiment-generation prompts are version-controlled alongside code, but no public documentation of an automated "compiled prompt == deployed prompt" parity check was found. | C (absence-of-evidence, single search pass) |
| OpenHands (formerly OpenDevin) | Agent system prompts are Python-templated and covered by unit tests asserting template substitution, similar in spirit to a golden-snapshot approach, but scoped to prompt *fragments* rather than a full compiled routine matched against a live scheduler delivery. | B (public repo, structure cross-checked, not run tonight) |
| DSPy / GEPA | DSPy's compiled "programs" (prompts + few-shot demos) are the direct analogue of this repo's `compile()` output; DSPy's own test suite golden-snapshots compiled prompts for regression detection — the closest architectural precedent for tonight's approach. | B (public docs/repo structure, not independently re-run tonight) |
| SWE-agent | Config-driven YAML → prompt templates, with schema validation on the YAML config at load time (comparable to this repo's `validateConfig()`), but no evidence found of a snapshot test comparing compiled output to a live deployed instance. | C (single-source skim) |
| This repo, prior state (`ADR-0002`, 2026-08-13) | Established the precedent for this bug *class*: an evaluator/signal silently defaulting to a misleading result instead of surfacing "I don't actually know" (there, `classifyEntrypointResult`; here, an un-asserted parity claim). Directly reused as the design rationale tonight. | A (this repo, reproduced tonight) |

## Hypothesis (frozen before implementation)

> Given this repo's own `dream.config.json` and the `compile()` function in
> `packages/compile`, when the live cloud-scheduler-delivered prompt for
> tonight's session is diffed byte-for-byte against `compile(dream.config.json)`,
> the two should be identical (supporting the compiled header's own claim that
> "any in-repo mirror is a build output of the same `dream.config`"); and when
> a permanent golden-snapshot test is added exercising the *real* config (not
> just the synthetic `metaharness` fixture), it should pass on first run with
> zero regressions to the 106 pre-existing tests — subject to: no pre-existing
> test weakened/removed/modified, the new test calls the real `compile()` and
> `validateConfig()` (no mocking), and the committed snapshot is genuinely
> vitest-generated (not hand-authored).

Not modified after evaluation began.

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest), this repo's only configured `bench`
entrypoint (`dream.config.json#evaluatorEntrypoints.bench`).

- Baseline (commit `2fba2550182d81b36423447221823e98e227482a`, fresh `npm ci && npm run build`): **106/106** tests passing, 7 test files.
- Candidate: **108/108** tests passing (+2 net new: schema-validation + golden-snapshot), 0 regressions, 0 removed/weakened pre-existing tests.
- `npm run lint`: clean.
- `npm run typecheck`: fails identically on baseline and candidate with a pre-existing, unrelated error (`tsconfig.json(1,12): error TS18002: The 'files' list in config file ... is empty`) — confirmed via `git stash` A/B by an independent reviewer subagent tonight; not touched by this candidate.
- `npm run build`: clean across all 6 packages, no wasm/NAPI component in this repo (pure TS), no degradation to record.

Manual byte-parity check (the actual falsifiable test of tonight's hypothesis):
```
$ sha256sum received-prompt.md compiled-prompt.md
74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d  received-prompt.md
74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d  compiled-prompt.md
```
`received-prompt.md` = the verbatim nightly-routine prompt text delivered to
this session by the cloud scheduler. `compiled-prompt.md` = `compile()`
applied to this repo's checked-in `dream.config.json` at commit `2fba255`.
Identical hash, identical length (13,717 bytes).

## Darwin Results

`DARWIN=not-applicable`. No evolvable population for a deterministic
test-coverage addition — there is nothing to mutate across generations for
"add a snapshot assertion of a pure function's output on a fixed input."
(Consistent with the same call made on the two prior real nights, 2026-08-13
and 2026-09-08.)

## Evidence

- MEASUREMENT: `npm test` 106→108, 0 regressions (independently reproduced by a separate critic subagent).
- MEASUREMENT: SHA-256 byte-identity between the delivered prompt and `compile(dream.config.json)`.
- OBSERVATION: `grep -rn dream.config.json packages/` — the compiler was previously exercised only through a synthetic fixture, never the live config, in any committed test.
- OBSERVATION: `docs/dream-cycle/LEDGER.md` on `main` still ends at the 2026-09-08 row — last night's 2026-09-09 row lives only on the still-open, unmerged PR #12, confirming (as a side observation, not tonight's candidate) that the ledger's "durable memory" currently lags `main` by one un-merged PR's worth of state. Not actioned tonight (out of scope for compiler-parity; flagged for a future ledger-signals night).
- INFERENCE: because `validateConfig()` accepts the live config with zero errors and every one of its keys maps onto a `DreamConfig` field, there is currently no config-schema drift to report from the `config-schema` scan.
- DECISION: add a self-referential golden-snapshot test rather than a one-off manual check, so parity is continuously enforced instead of re-verified by hand each rotation this surface comes up.
- REJECTION: considered generating a JSON Schema (`dream.config.schema.json`) file for external validation (e.g. editor tooling) as an additional `config-schema` scan deliverable; rejected for tonight to keep the candidate to one conceptual change (<300 lines) — logged as a next step below, not implemented.

## Reward-Hack Check

Independent critic (separate subagent, not this candidate's author): **CLEAR**.
Re-ran `npm test` independently via `git stash` A/B (106/106 → 108/108, 0
regressions). Deleted the committed snapshot file and let vitest regenerate it
from a fresh `compile()` call — byte-identical to the committed version,
ruling out a hand-authored/fabricated snapshot. Confirmed no pre-existing
`expect()` was touched, no gold data altered, no mocking of `compile()`/
`validateConfig()`, no hidden cost or non-determinism, no touch to
evaluation/gate/safety infrastructure. Full report retained in session
transcript.

## Security Review

No security-sensitive surface touched: no new `io.exec`/shell/network calls,
no credential handling, no filesystem writes beyond the test's own read of
the already-committed `dream.config.json`, no MCP authority changes, no
change to evaluator/gate/threshold logic. The new test reads a static file
synchronously off disk at a path resolved via `import.meta.url` — no
path-traversal surface (fixed relative path, no user input).

## Scan: config-schema

`DreamConfig` (TypeScript interface, `packages/compile/src/config.ts`) and the
live `dream.config.json` are in sync — `validateConfig()` returns zero errors,
zero warnings. No external JSON Schema file exists for editor-time validation
of `dream.config.json` (only the TS interface + runtime `validateConfig()`);
this is a real gap but a distinct, larger candidate (would need to be kept in
sync with the TS interface by hand or generated, is its own conceptual
change) — logged as a next step, not implemented tonight to keep this
candidate to one conceptual change.

## Scan: golden-snapshots

Before tonight, exactly one snapshot file existed in the repo
(`packages/compile/src/__snapshots__/index.test.ts.snap`), covering only the
synthetic `metaharness` fixture (1 snapshot entry, "golden-snapshot:
metaharness prompt is stable"). Tonight adds a second entry snapshotting the
*real* compiled routine. No other package in the monorepo (`ledger`, `witness`,
`schedule`, `memory`, `cli`) has golden-snapshot coverage of any deterministic
output — flagged as a possible future `golden-snapshots` scan target (e.g. the
CLI's `--json` output shapes), not pursued tonight.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so the stamp
cannot be written *inside* the file it stamps (same convention as the
2026-08-13 and 2026-09-08 reports). The committed copy at
`docs/dream-cycle/2026-09-10-compiler-parity-report.md` is the frozen, hashed
artifact; this section is filled in immediately before that file is
committed, over content identical up to this point. Anyone can independently
reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-09-10-compiler-parity-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at the
start of tonight's session, before this candidate's changes). REPORT_HASH and
WITNESS are published in the PR body and the `LEDGER.md` row, both pointing
back at this file by path and session commit.

## 3 concrete next steps

1. Generate (or hand-author once, then lock via test) a `dream.config.schema.json`
   JSON Schema mirroring `DreamConfig`, for editor-time validation — closes the
   `config-schema` gap noted above as its own single-conceptual-change candidate.
2. Extend golden-snapshot coverage to the CLI's machine-readable output shapes
   (`ledger signals --json`, `verify-entrypoints` exit-code/line format) so
   `cli`/`tui`-surface nights inherit the same drift-detection discipline.
3. Land PR #12 (2026-09-09, `zeroMergeStreak` false-positive fix) and/or
   resolve issue #10 (CodeQL repo-settings gap) — both open, both
   human-actionable, both outside tonight's `compiler-parity` scope but
   noted here since they're the oldest unresolved items in this repo's own
   ledger/issue backlog.
