# Compiler-Parity / Config-Schema SOTA Report — 2026

## TL;DR

Tonight's rotation is `SLOT=0` → `DEEP=compiler-parity`, `SCAN=config-schema,golden-snapshots`.
Live GitHub state: **0 merges since PR #9 (2026-09-08), 72+ days, ~70 open
`dream-cycle` PRs (#12→#145)** — already fully diagnosed by PR #135 and PR
#145 (missing `automerge-safe` label + universal draft state). Not re-raised
tonight (would be a 3rd+ repeat; the ledger's own learning signal exists to
stop that). Tonight's own finding is new: this repo's `@dream-machine/compile`
package had **zero tests that ever compiled, validated, or snapshotted its
own `dream.config.json`** — the actual file the real cloud scheduler compiles
every night. Every existing test in `packages/compile/src/index.test.ts`
exercises a fake fixture config for a different repo (`ruvnet/metaharness`).
Verified by hand tonight: `dream-machine compile dream.config.json` is
byte-for-byte, sha256-identical to the literal scheduler prompt this very
session was invoked with. Candidate: a new self-referential golden-snapshot
test (`packages/compile/src/dogfood.test.ts`) that loads this repo's real
`dream.config.json`, asserts it's schema-valid, compiles without throwing,
and snapshots the result — so any future drift between `dream.config.json`
(or `compile()`) and the live scheduler routine fails CI loudly instead of
silently, for the first time in this repo's history.

## What's new

- **Live byte-for-byte parity check (new tonight).** Captured the literal
  text of tonight's own invocation prompt to `/tmp/dream-cycle-scratch/received-prompt.md`,
  ran `node packages/cli/dist/bin.js compile dream.config.json --out /tmp/compiled-tonight.md`
  against `main@2fba255`, and diffed: `diff -u` exit 0, `sha256sum` identical
  (`74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d` both
  sides). **No drift exists right now** — but nothing pinned that fact before
  tonight; a future edit to `dream.config.json` or `compile()`'s section
  builders could silently change what the real scheduler says with 0 failing
  tests.
- **Gap confirmed by exhaustive search**, not assumed: `grep -rn
  "dream.config.json" packages/` shows the only other references are in
  `packages/cli` using the string purely as a generic default *filename
  argument* (e.g. `compile [config]` defaulting to `'dream.config.json'`),
  never actually loading *this repo's* root file through `compile()`/
  `validateConfig()`. `git log --all --oneline -- packages/compile` shows 3
  prior commits (#6→this-repo's-ADR-0002 wiring, #107's type guards, #127's
  bonusModuli guard) — none add this test.
- **4-PR compiler-parity backlog unchanged since 2026-11-15** (PR #137's
  audit): #87 (closed, not merged — compile stdout double-newline),
  #97 (open — EPOCHDAY/DAYINT rotation bug fix), #107 (open — config type
  guards), #127 (open — bonusModuli value guard). Re-verified tonight that
  #107 already added `adrConvention` shape validation (`typeof pad ===
  'number'`, `typeof dir === 'string'`) but still does **not** bound-check
  `pad` (negative, zero, or non-integer values pass silently) — e.g.
  `{pad: -1, dir: 'x'}` would produce a nonsensical `ADR-N` example string.
  Logged as a config-schema scan finding below, not implemented tonight
  (keeps one conceptual change; #107 is the natural place to extend when a
  human reviews it).
- `npm audit` (fresh `npm ci`): unchanged from prior nights — advisories
  confined to devDependencies (eslint/vitest/vite/esbuild toolchain), 0 in
  the internal `@dream-machine/*` production deps; dependabot PR #1 remains
  the open, unmerged fix (not this session's to merge).

## Hypothesis (frozen before implementation)

> Given this repo's own `dream.config.json` (the actual input to the live
> cloud-scheduler routine) and `@dream-machine/compile`'s existing
> `validateConfig()`/`compile()` functions, when a new, self-contained vitest
> test (`packages/compile/src/dogfood.test.ts`) loads the real root config
> file, asserts it validates and compiles without throwing, and snapshots
> the compiled output via `toMatchSnapshot()`, then (a) the snapshot should
> match the byte-for-byte-verified live scheduler prompt captured tonight,
> and (b) the full suite should go from 106/106 to 109/109 with **zero**
> regressions, zero removed/weakened pre-existing tests, and zero changes to
> any tracked file other than the two new test/snapshot files — subject to:
> no `.ts` source logic in `packages/compile` touched, no gold data altered,
> deterministic (no dates/randomness — `compile()`'s own documented
> contract).

**Tested. Confirmed true, not falsified.**

## Evaluation Receipt

Real evaluator: this repo's own `npm test` (vitest), `npm run lint`, `npm run build`.

| | Baseline (`dogfood.test.ts` absent) | Candidate (`dogfood.test.ts` present) |
|---|---|---|
| Tests | 106/106 | **109/109** (+3, 0 removed/modified) |
| Lint | clean | clean |
| Build (6 workspaces) | clean | clean |
| Typecheck | pre-existing `tsconfig.json` root `TS18002` ("files list is empty") — reconfirmed identical with the candidate file moved aside; unrelated to tonight's diff | same pre-existing error, unchanged |
| Tracked-file diff | — | 2 new untracked files only: `packages/compile/src/dogfood.test.ts`, `packages/compile/src/__snapshots__/dogfood.test.ts.snap` |

```
$ mv packages/compile/src/dogfood.test.ts /tmp/... && npm test --silent 2>&1 | tail -5
 Test Files  7 passed (7)
      Tests  106 passed (106)

$ mv /tmp/... packages/compile/src/dogfood.test.ts && npm test --silent 2>&1 | tail -8
 ✓ packages/compile/src/dogfood.test.ts (3 tests) 4ms
  Snapshots  1 written
 Test Files  8 passed (8)
      Tests  109 passed (109)
```

Independent byte-for-byte parity check (the actual hypothesis under test, run
before the candidate file existed):

```
$ node packages/cli/dist/bin.js compile dream.config.json --out /tmp/compiled-tonight.md
compiled LLM-Dev-Ops/agentics-dream-machine → /tmp/compiled-tonight.md (13717 bytes)
$ diff -u /tmp/dream-cycle-scratch/received-prompt.md /tmp/compiled-tonight.md ; echo $?
0
$ sha256sum /tmp/dream-cycle-scratch/received-prompt.md /tmp/compiled-tonight.md
74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d  received-prompt.md
74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d  compiled-tonight.md
```

## Baseline

`main@2fba2550182d81b36423447221823e98e227482a` (tip since PR #9,
2026-09-08 — unchanged by the backlog, nothing has merged since). 106/106
tests, 0 tests referencing this repo's own `dream.config.json`.

## Darwin Lineage

`DARWIN=not-applicable` — a single additive test file has no evolvable
population (same reasoning as every prior compiler-parity/wiring night:
2026-08-13, 2026-09-08, 2026-11-15).

## Evidence

- OBSERVATION: `grep -rn "dream.config.json" packages/` → only generic
  default-filename references in `packages/cli`, never a load-and-compile of
  this repo's own root config.
- OBSERVATION: `git log --all --oneline -- packages/compile` → 3 prior
  commits, none add a dogfood/self-referential test.
- MEASUREMENT: `npm test` 106/106 → 109/109, +3 tests, 0 regressions.
- MEASUREMENT: `diff`/`sha256sum` of tonight's literal invocation prompt vs.
  `compile(dream.config.json)` → byte-identical.
- MEASUREMENT: `npm run lint` clean, `npm run build` clean (6/6 workspaces),
  both before and after the candidate.
- OBSERVATION: `npm run typecheck` fails identically (root `tsconfig.json`
  `TS18002`) with and without the candidate file present — pre-existing,
  unrelated to tonight's diff.
- INFERENCE: PR #107's `adrConvention` validation (unmerged) checks `pad`'s
  *type* but not its *range* — a residual, narrower config-schema gap,
  logged as a scan finding, not implemented tonight.
- DECISION: ship only the dogfood golden-snapshot test; do not touch
  `packages/compile/src/config.ts` or `index.ts` logic (zero conceptual
  overlap with the open #97/#107/#127 PRs, so this candidate cannot conflict
  with any of them).

## Reward-Hack Check

Independent critic (separate general-purpose subagent, not this candidate's
author): **CLEAR.** Verified via its own read of `git diff HEAD` (empty —
only two new untracked files), confirmed no pre-existing test/assertion
weakened or retargeted, no gold/evaluator code (`index.ts`, `config.ts`,
vitest config, `package.json`) touched, the snapshot path resolution
(`fileURLToPath(new URL('../../../dream.config.json', import.meta.url))`
from `packages/compile/src/dogfood.test.ts`) correctly lands on the real
repo-root config (not a decoy), the snapshot content field-by-field matches
the real config, no nondeterminism/hidden cost/cache, and the claimed gap
("no prior test exercised this repo's own `dream.config.json`") is real per
an independent grep/log search. One non-blocking style note: relies more on
the snapshot than on explicit `toContain` invariants (unlike `index.test.ts`'s
convention) — reasonable given the snapshot already pins the real file's
exact content.

## Security Review

No new runtime attack surface: a vitest test reading a fixed, literal
relative path (`../../../dream.config.json` from the test file's own
`import.meta.url`) — not derived from user/network/environment input, so no
path-traversal or injection vector. No `.github/`, lockfile, gate, threshold,
or security-boundary file touched. No credential exposure, no LLM calls
(`LLM_EVAL=blocked` — no `OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY` configured
for model-calling evaluation stages tonight; irrelevant here since this
candidate needed none).

## Scan Findings

**config-schema** — `validateConfig()`'s `adrConvention` branch (added by
unmerged PR #107) checks `typeof pad === 'number'` and `typeof dir ===
'string'` but not that `pad` is a positive integer; a config like
`{adrConvention: {pad: -1, dir: 'docs/adrs'}}` or `{pad: 1.5, dir: '...'}`
passes validation today (on #107's branch) yet `adrPad()`/`step19Adr()`'s
`'0'.repeat(Math.max(0, pad - 1))` would emit a degenerate ADR-numbering
example. Narrow, not production-breaking (this repo's own `dream.config.json`
uses the plain `'4-digit'` string form), logged for whoever reviews #107.

**golden-snapshots** — the pre-existing `metaharness` fixture snapshot
(`packages/compile/src/__snapshots__/index.test.ts.snap`) remains in sync
with `compile()` tonight (109/109 passing, 0 obsolete-snapshot failures).
The new `dogfood.test.ts.snap` is the only snapshot addition; it is seeded
from tonight's verified-byte-identical `compile(dream.config.json)` output,
not hand-written or copy-pasted.

## Competitors

| System | Config→prompt self-test / dogfooding its own production config | Grade |
|---|---|---|
| OpenHands | Config schema (`config.toml`) validated via pydantic models at load time; no evidence found of a CI test that loads the project's *own* deployed config and snapshots the rendered agent instructions | A (official repo, no comparable practice found) |
| SWE-agent | YAML-templated prompts tested against fixture configs in its test suite; no located test that golden-snapshots its own production/example config end-to-end | A |
| DSPy/GEPA | Signature/program compilation is unit-tested against synthetic programs; optimizer config is validated but not snapshot-tested against a single canonical "real" deployment config | B |
| Sakana AI Scientist | Experiment configs (Hydra/YAML) validated by schema; paper reports no equivalent of a "does our own real config compile to what we think it does" regression test | A (paper), C (practice-specific claim) |
| AutoGPT lineage | Historical community reports of config/prompt-template drift between docs and shipped behavior (the exact failure class this dogfood test targets) — cautionary precedent, not a counter-example | C |

## Gist

No `gh gist create`-equivalent tool available to this session (`gh api
gists -X POST ...` → `403 Gist writes are not permitted through this
proxy`, confirmed live tonight, not assumed from a prior night's note).
`GIST=LOCAL`. Full report committed as
`docs/dream-cycle/2026-11-20-compiler-parity-report.md`.

## Witness

```
report_sha256 : 6e9a4a3342af55ac6d24da914eae59943555faa641f7465195a698dc809f318d
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : 146af13fbfd7693b59a665b5c6d7be1c26931341a28316b6ec0b008bb257321c
```
Self-referential-hashing caveat (same convention as issue #116/PR #135):
`report_sha256` was computed on this file with this Witness section still a
placeholder (`<computed in STEP 16...>`), per STEP 16's own ordering — filling
in the real values afterward necessarily changes the file's own bytes/hash.
Reproduce by regenerating the report with the placeholder restored, or treat
the triple above as the authoritative witness of the report's *content*
(everything above this section) rather than of this exact byte sequence.

## Recommendation

`evaluated: accepted`. Draft PR for human review. Next steps not done
tonight: (1) merge PR #97 first per PR #137's own recommendation (fixes the
rotation bug that would have changed tonight's own slot); (2) when reviewing
#107, consider bounding `adrConvention.pad` to a positive integer (tonight's
scan finding); (3) the structural auto-merge blocker (missing
`automerge-safe` label + universal draft state, PR #135/#145) remains the
single highest-leverage human action outstanding — this and every other
backlog PR will sit unmerged regardless of code quality until a human
resolves it.
