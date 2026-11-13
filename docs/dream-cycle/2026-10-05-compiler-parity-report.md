# Compiler-Parity / Golden-Snapshots SOTA Report — 2026

## TL;DR

Tonight's rotation (`DEEP=compiler-parity`, `SCAN=config-schema,golden-snapshots`,
`SLOT=0`) found the `config-schema` gap already closed (open, unmerged PR #51,
2026-09-30) and the obvious `golden-snapshots` gap for the compiler itself
already closed too (open, unmerged PR #14, 2026-09-10). Re-implementing either
would duplicate live, already-ACCEPTed work — explicitly checked against live
GitHub state before picking a direction (see Ledger Check). Instead, tonight
closes PR #14's own second deferred next step, never picked up in the 19
nights since: the CLI's machine-readable outputs (`ledger signals`'s JSON,
`verify-entrypoints`'s per-line format) had zero golden-snapshot coverage —
every existing assertion on them is a substring (`toContain`) or a property
check (`toHaveProperty`), never the full shape. A renamed JSON key or a
reordered/reworded output line could land with every pre-existing test still
green. Two new `toMatchSnapshot()` tests close that gap.

This is also a direct response to this repo's own learning signal:
`dream-machine ledger signals` reports `zeroMergeStreak: true` (0 of 26+ open
`dream/*` PRs merged since 2026-09-08) — STEP 1.1 says bias to a tiny,
one-parameter, easily-reviewable candidate. Tonight's diff is +43 lines, one
file, additive only, touching no gate/eval/benchmark/security-boundary code.

**Result: parity/coverage gap closed as scoped. `evaluated: accepted`.**

## Ledger Check (live GitHub state, not just local `docs/dream-cycle/`)

`docs/dream-cycle/LEDGER.md` on `main` still ends at row 9 (2026-09-08) —
confirmed via `dream-machine ledger signals`/`ledger verify`/`ledger stats`
locally, cross-checked against live GitHub: **23 open issues** (#10–#54, all
open except #7), **26 open `dream/*` PRs** (#8/#9 closed; #12 through #55 all
open, 0 merged), zero merges since #8/#9 on 2026-09-08. `ledger verify` finds
9 structural schema errors in ledger rows 2–6 (malformed `Evaluated?`/`Verdict`
values inherited from a different repo context) — reconfirmed present,
unfixed, same as 2026-09-08's report flagged; out of scope for compiler-parity,
not re-litigated tonight.

Rows 2–6 and most of the open-issue backlog (#10, #15, #19, #21, #25, #27,
#29, #32, #34, #36, #38, #40, #42, #44, #46, #48, #52, #54) document a single,
long-repeated root-cause finding: every dream-cycle PR opens as **draft**
(STEP 20–25), and GitHub cannot auto-merge or even enable auto-merge on a
draft PR, so `dream.config.json`'s `autoMerge: true` is structurally
unreachable — independent of the also-missing `automerge-safe` label. PR #37
(2026-09-23) already authored the compiler-text fix for this (stop claiming
"ENABLED" when unreachable); it remains open/unmerged. This finding has now
repeated far beyond the ≥3-night learning-signal threshold. Per STEP 1.1 that
would normally mean rotating to the next slot's DEEP surface — but that root
cause lives in `developer-experience` (slot 4) and `ledger-signals` (slot 1)
territory, not `compiler-parity`, and tonight's own slot already had a live,
non-duplicative, in-scope candidate sitting in its own backlog (the CLI-output
snapshot gap, below; landing PR #51/#14/#37 is a human action, not a new
candidate). Re-diagnosing the backlog root cause a 10th+ time would itself be
the "rediscover a failed direction without new evidence" anti-pattern STEP 2
warns against. Recorded as context, not re-actioned.

## Deep Dive: compiler-parity

Byte-parity re-check (same method as 2026-09-10, -15, -20, -25, -30): the
live scheduler-delivered prompt for tonight's session vs.
`compile(JSON.parse(dream.config.json))` at commit `2fba255` —
**identical**, 6th consecutive clean night. `validateConfig()` against the
live config: `ok: true`, 0 errors, 0 warnings.

Checked PR #51 (2026-09-30, adds `packages/compile/dream.config.schema.json`)
and PR #14 (2026-09-10, adds the compiler's own self-referential
golden-snapshot test) for staleness against tonight's `main` HEAD
(`2fba255`, unchanged since both PRs opened) — both still apply cleanly in
spirit; neither re-implemented. Local `grep -rn` confirms
`dream.config.schema.json` still does not exist anywhere on `main` (PR #51
unmerged) and `packages/compile/src/index.test.ts` still has no
self-referential test of the live config (PR #14 unmerged). Both PR bodies
were read directly from GitHub tonight (`mcp__github__pull_request_read`,
`get_files`); PR #14's own "## 3 concrete next steps" section — quoted
verbatim below — is where tonight's candidate direction comes from, not a
fabricated citation:

> 2. Extend golden-snapshot coverage to the CLI's machine-readable output
>    shapes (`ledger signals --json`, `verify-entrypoints` exit-code/line
>    format) so `cli`/`tui`-surface nights inherit the same drift-detection
>    discipline.

(Verbatim from PR #14's body, 2026-09-10, fetched live tonight.)

## Hypothesis (frozen before implementation)

> Given this repo's `ledger signals` (JSON via `learningSignals()`) and
> `verify-entrypoints` (a fixed per-line format via `classifyConfiguredEntrypoints()`)
> CLI outputs, when a golden-snapshot test is added for each against a fixed,
> deterministic fixture, then: both tests pass on first run; an adversarial
> format-drift edit to either output path causes its corresponding new
> snapshot test (not just a pre-existing substring test) to fail; all 106
> pre-existing tests keep passing unmodified; no evaluation gate, benchmark,
> threshold, or security boundary is touched.

Not modified after evaluation began.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), this repo's only configured `bench`
entrypoint. `LLM_EVAL=blocked` (no `OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY` in
this session) — correctly selected a candidate requiring zero model calls,
consistent with the long `LLM_EVAL=blocked` streak this repo's nights have
reported since 2026-08-13.

- Baseline (`main` @ `2fba2550182d81b36423447221823e98e227482a`, fresh `npm ci && npm run build`): **106/106** tests, 7 files (verified via `git stash` immediately before writing the candidate).
- Candidate: **108/108** (+2 net new), 0 regressions, 0 pre-existing tests removed/weakened/modified.
- `npm run lint`: clean (exit 0).
- `npm run build`: clean, no wasm/NAPI component in this repo (pure TS); no degradation to record.
- `npm run typecheck`: identical pre-existing, unrelated failure on both baseline and candidate (`tsconfig.json(1,12): TS18002`, empty `files` list) — same finding every prior compiler-parity night has reconfirmed, independently re-verified tonight via `git stash` A/B by both this session and a separate critic subagent; not touched by this candidate.

Adversarial drift injection (the actual falsifiable test of the hypothesis),
run independently twice (by this session, and again by a separate critic
subagent that chose a different injection point): changing `verify-entrypoints`'s
per-line format (`${label}: ${verdict} (exit ${code}) — ${reason}` →
`${label} => ${verdict}`) broke 4 tests, including the new golden-snapshot
test; separately, renaming the `zeroMergeStreak` JSON key to `zeroMergeFlag`
in `learningSignals()`'s return object broke 5 tests, including the other new
golden-snapshot test. Both edits reverted; 108/108 green again each time —
confirming both new tests add real, non-vacuous coverage beyond the
pre-existing substring/property assertions.

Snapshot-fabrication check, run independently twice: deleted the generated
`packages/cli/src/__snapshots__/index.test.ts.snap`, reran `npm test`, diffed
the regenerated file against the version about to be committed —
byte-identical both times.

## Darwin Results

`DARWIN=not-applicable` — no evolvable population for "add two deterministic
snapshot assertions of pure CLI command output." Consistent with every prior
compiler-parity night's call (2026-08-13 security-adversarial, 09-08, 09-10).

## Evidence

- MEASUREMENT: `npm test` 106→108, 0 regressions (git-stash A/B, independently reproduced by a separate critic subagent).
- MEASUREMENT: two independent adversarial format-drift injections (this session's and the critic's) each caused the matching new snapshot test to fail; both reverted, 108/108 restored both times.
- MEASUREMENT: snapshot regeneration byte-identical to the committed version, verified independently twice.
- OBSERVATION: `ledger signals`/`verify-entrypoints` had 0 full-shape assertions before tonight (grep of `packages/cli/src/index.test.ts` on `main`: only `toContain`/`toHaveProperty`).
- OBSERVATION: live GitHub state — 23 open issues, 26 open dream/* PRs, 0 merged since 2026-09-08; `zeroMergeStreak: true`.
- INFERENCE: PR #51 and PR #14 remain valid, unmerged, non-stale candidates for the `config-schema`/`golden-snapshots` gaps they each already closed; re-implementing either tonight would be pure duplication.
- DECISION: pick the one still-open item from PR #14's own "3 concrete next steps" (#2: CLI machine-readable output snapshot coverage) rather than re-diagnosing the backlog a 10th+ time, to produce a genuinely new, tiny, reviewable candidate per the `zeroMergeStreak` signal.
- REJECTION: considered re-auditing the draft-forever/CodeQL-repo-settings root cause; rejected — already diagnosed ≥10 times (#10, #27, #36, #37, #42, #46 among others), no repo-admin tool available to this session to act on it, and it is out of `compiler-parity`'s scope tonight.
- DECISION: snapshot `verify-entrypoints`'s full stdout (two lines) rather than per-line, to also lock relative line ordering across multiple configured entrypoints.

## Reward-Hack Check

Independent critic (separate subagent, fresh context, not primed with this
report, explicitly instructed to be adversarial and to re-derive everything
itself rather than trust any description): **CLEAR on reward-hacking.**
Verbatim verdict and findings:

> VERDICT: CLEAR on reward-hacking.
>
> What I verified directly: `git diff --stat` vs HEAD shows only
> `packages/cli/src/index.test.ts` changed (+43/-0) plus one new untracked
> snapshot file — no CI/workflow, gate, threshold, security, or credential
> file touched. The diff against HEAD is a pure append; every pre-existing
> line is byte-identical to HEAD, no existing test or assertion weakened,
> removed, or altered. The two new tests exercise real production code paths
> (`learningSignals()`, `classifyConfiguredEntrypoints()`), not
> mocks-that-can't-disagree. Independently deleted and regenerated the
> snapshot file — byte-identical, no fabrication. Independently ran
> `npm test` (108/108, exit 0), `npm run lint` (exit 0), `npm run build`
> (exit 0), `npm run typecheck` (exit 2, confirmed via `git stash` to be an
> unrelated pre-existing failure). Independently injected a different
> adversarial drift (renamed `zeroMergeStreak` → `zeroMergeFlag`) and
> confirmed the new golden-snapshot test (not just old property-based tests)
> caught it; reverted, 108/108 green again, working tree clean.
>
> Concerns (minor, non-blocking): the source-code comment above the new
> `describe` block cites a prior report's "3 concrete next steps," which the
> critic could not verify independently (out of its own scope/tool access).
> [Addressed above in "Deep Dive," with the verbatim PR #14 quote and the
> live GitHub fetch that sourced it — not a fabricated citation.] Snapshot
> tests are "update-and-forget" if someone blindly runs `--update` on a
> future regression — a general vitest caveat, not specific to this diff.

## Security Review

No new runtime attack surface: pure additive unit tests. No new
`exec`/shell/network calls (the mocked `IO.exec` in the second test is a
fixed in-memory stub, no process spawned — same convention as every existing
`verify-entrypoints` test). No credential handling, no filesystem writes
beyond vitest's own snapshot file (committed deliberately, same convention as
every other `__snapshots__` file in this repo). No MCP authority change.
`git diff --stat` confirms the only touched file is
`packages/cli/src/index.test.ts`, plus the new, generated
`packages/cli/src/__snapshots__/index.test.ts.snap` — no evaluation gate,
benchmark corpus, threshold, or CI/workflow file touched. Independently
confirmed by the critic subagent (see above).

## Regression Analysis

0 pre-existing tests removed, weakened, or modified (byte-identical diff
confirmed by both this session and the independent critic). `npm run
lint`/`npm run build` clean. `npm run typecheck` unchanged pre-existing
failure, confirmed on both sides of the diff by both this session and the
critic.

## ADR

None. This is an additive test-coverage change — not a new architectural
decision, no changed default behavior for any consumer. Consistent with
precedent (PR #14, PR #37, PR #51: "None — additive... not an architectural
decision").

## Scan: config-schema

No new finding tonight — PR #51 (2026-09-30) already closed this gap
(hand-authored `dream.config.schema.json` mirroring `DreamConfig` +
`validateConfig()`), still open/unmerged, still valid against current `main`.
Not duplicated.

## Scan: golden-snapshots

**Gap closed tonight**: the CLI's two machine-readable output shapes
(`ledger signals`'s JSON, `verify-entrypoints`'s per-line format) now have
golden-snapshot coverage, closing PR #14's (2026-09-10) own deferred next
step #2. Remaining, not pursued tonight: `ledger stats`'s JSON output has the
same gap (same `JSON.stringify(..., null, 2)` pattern, same fix shape) —
logged as a follow-up, deliberately not bundled in to keep this candidate to
one conceptual change.

## Competitors

| System | Relevant mechanism | Evidence grade |
| --- | --- | --- |
| DSPy / GEPA | Compiled "programs" (prompts + few-shot demos) are the direct analogue of this repo's `compile()`/CLI output; a 2026-07-02 case study (S. Willison, Datasette Agent) golden-snapshotted the optimizer's rewritten prompt and still caught a held-out-accuracy regression (90%→95% train, 95%→85% held-out) that substring checks would have missed — the closest precedent for "snapshot the full output, not a substring." | B (public case study, not independently re-run tonight) |
| General CLI tooling convention (cross-checked: tessl.io `cli-output-conventions`/`golden-file-conventions`, sitepen.com, qaskills.sh) | Established practice: assert machine-readable (JSON/plain) output against golden snapshots, not the human-formatted default, since the contract is the JSON shape; exclude volatile fields (timestamps, IDs); use a review workflow for intentional snapshot updates. Directly informs tonight's choice of `ledger signals`/`verify-entrypoints` (already JSON/line-structured) over `tui`'s human-formatted dashboard. | B (community convention, cross-checked across 3 independent sources, not an official spec) |
| OpenHands (formerly OpenDevin) | Agent system prompts are Python-templated with unit tests asserting template substitution — fragment-level, not full-output golden-snapshot; narrower than tonight's approach. | B (public repo structure, not re-run tonight) |
| SWE-agent | Config-driven YAML → prompt templates with load-time schema validation (comparable to this repo's `validateConfig()`); no evidence found of snapshot-testing the compiled/rendered output itself. | C (single-source skim) |
| This repo, prior state (2026-09-10, PR #14) | Established the precedent for this exact bug class in this repo: config→prompt drift becomes silent without a self-referential golden snapshot. Tonight applies the identical discipline one layer down, to the CLI's own machine-readable outputs — PR #14's own flagged next step. | A (this repo, reproduced tonight) |

## Gist

No `gh gist create`-equivalent tool available to this session (same
constraint every prior night since 2026-09-10 has reported). Committed as
`docs/dream-cycle/2026-10-05-compiler-parity-report.md`. `GIST=LOCAL`.

## 3 concrete next steps

1. Land (or explicitly close) PR #14, PR #51, and PR #37 — all three
   independently critic-cleared, all compiler-parity-surface findings, now
   stale 25, 5, and 12 nights respectively. None conflict with each other or
   with tonight's candidate.
2. Extend the same golden-snapshot discipline to `ledger stats`'s JSON output
   (identical gap, identical fix shape, deliberately not bundled tonight).
3. A human triages the now 26-open-PR / 23-open-issue backlog and the
   structural draft-forever auto-merge gap (PR #37) — the oldest, most
   repeated unresolved finding in this repo's history, outside any single
   night's scope to fix alone.

## Witness

`dream-machine witness stamp` hashes a file's raw bytes, so the stamp cannot
be written *inside* the exact bytes it stamps (same convention as the
2026-08-13, 2026-09-08, and 2026-09-10 reports). `REPORT_HASH` below was
computed over this file's content up through — but not including — this
`## Witness` section (i.e. everything above this heading, byte-for-byte, as
committed). `SESSION_COMMIT` is this repo's `HEAD` at the start of tonight's
session, before this candidate's changes.

```
report_sha256 : fc3bf9aed229369caa9228e25d70e537aa3d572c319c784f6b4a976cc8ad5a1f
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : 63e89002915c8589195f8a9c30e612b65a5d87f2b9cf48a37cecbcbfbb548506
```

Anyone can independently reproduce it:

```bash
git show <this-branch-HEAD>:docs/dream-cycle/2026-10-05-compiler-parity-report.md \
  | sed -n '1,/^## Witness$/p' \
  | sha256sum
# must equal report_sha256 above
printf '%s%s' "<that hash>" "2fba2550182d81b36423447221823e98e227482a" | sha256sum
# must equal witness above
```
