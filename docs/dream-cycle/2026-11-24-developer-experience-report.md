# Dream Machine SOTA Report — Developer Experience (2026-11-24)

**Rotation**: `DAYINT=20261124`, `SLOT=4` → `DEEP=developer-experience`, `SCAN=cli,tui`.
`DAYINT % 25 = 24`, `DAYINT % 75 = 24` — no bonus deep dive.
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a` (`main` tip, unchanged since PR #9,
2026-09-08 — 77 days, 0 merges since).

## TL;DR

`dream-machine init --repo <value>` never validates `<value>` against the `owner/name` shape
that `validateConfig` already enforces for `compile`/`schedule`. A malformed `--repo` (missing
slash, empty, or a boolean-flag typo that `parseArgs` coerces to `true`) is scaffolded into
`dream.config.json` silently (`exit 0`, "wrote ... for notarepo"), and the failure only surfaces
later, disconnected from the mistake, the first time someone runs `compile` or `schedule` against
that file. This is a fresh bug — not a re-raise of any prior developer-experience finding
(`--no-color`/`verdictColor` #117, `pad()` ANSI slicing #95, `ledger stats` snapshot gap #105, the
guarded-auto-merge-unreachable finding #135/#145). Candidate: reuse the already-tested
`validateConfig` call `init` already imports, exactly where `compile` already calls it, before any
write. 17-line diff, 2 files, 2 new tests, 0 regressions (106→108 tests green).

## Ledger check (STEP 1)

`main`'s `docs/dream-cycle/LEDGER.md` is 7 rows, last real entry 2026-09-08 (PR #8, merged).
`ledger verify` reconfirms 9 pre-existing schema errors in rows 2-6 (unrelated portfolio rows that
predate this repo's real history — flagged by row 9, not fixed tonight, out of scope for a
developer-experience/cli,tui night). `ledger signals`: `zeroMergeStreak: true`,
`duplicateDirections: []`, `nightsConsidered: 7`.

The *real* cross-night memory lives in the live GitHub PR history, not the stale `main` ledger
(every dream-cycle PR stays an unmerged draft, so `main`'s ledger never advances past PR #9):
29 open `dream-cycle` PRs reconfirmed tonight (#93→#151), 0 merged since #9, one additional closed
without merging (#95). Five prior developer-experience nights identified: #95 (10-24, tui `pad()`
ANSI truncation — closed, not merged, not currently reproducible under live call sites), #105
(10-29, `ledger stats` golden-snapshot gap), #117 (11-04, `verdictColor()` ignores `--no-color`),
#135 (11-14, `automerge-safe` label never created), #145 (11-19, draft-state independently blocks
auto-merge too — both causes AND-gated). Only 2 of those 5 nights (#135, #145) touched the
auto-merge-unreachable finding — below the ledger's own "≥3 nights → rotate" threshold, so no
surface override was triggered, but it was a strong enough signal to rule out a 3rd diagnostic-only
night on that exact topic as low-novelty (see candidate table below).

## Hypothesis (frozen before implementation)

> Given the `dream-machine` CLI's `init` command, when a user supplies a `--repo` value that does
> not match the `owner/name` shape `validateConfig` already enforces for `compile`, then `init`
> currently accepts and scaffolds it anyway (exit 0, no warning) — deferring the failure to an
> unrelated later command. Adding the same `validateConfig` check to `init`, before any
> print/write, should make `init` reject the malformed value immediately, at the point of the
> mistake, with the existing 106-test suite still green and zero behavior change for any valid
> `owner/name` repo.

Not modified after evaluation began.

## Testability Gate (STEP 5-9)

Testable tonight entirely via the existing `vitest` suite — no model calls needed
(`LLM_EVAL=blocked`: `OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY` both absent, matching every prior
night). `@metaharness/darwin` is not installed in `node_modules` and not reachable without a
network fetch this session didn't attempt — consistent with every prior developer-experience
night recording `DARWIN=not-applicable`.

## Candidates scored (5, before selection)

| Candidate | Fit | Novelty | Testability | Measurability | Prod-value | Reviewability | Total |
|---|---|---|---|---|---|---|---|
| **1. `init` doesn't validate `--repo` before writing (selected)** | 5 | 5 | 5 | 5 | 4 | 5 | **29** |
| 2. Ledger-signals surface: `ledger append` accepts schema-invalid verdict/evaluated values (same root cause as rows 2-6) | 4 | 3 | 4 | 4 | 3 | 4 | 22 |
| 3. Re-fix `verdictColor()`/`--no-color` (already an open, unmerged fix in #117) | 3 | 1 | 5 | 5 | 2 | 5 | 21 |
| 4. `parseArgs`: a boolean-only flag (`--no-color`) swallows a trailing bare positional as its value instead of staying `true` | 3 | 4 | 4 | 4 | 2 | 4 | 21 |
| 5. Re-diagnose guarded-auto-merge-unreachable a 3rd time | 4 | 1 | 3 | 4 | 2 | 3 | 17 |

Candidate 1 wins without an override. Candidate 3 is explicitly the "repeated finding" pattern the
ledger's own learning signal exists to discourage (an open PR already fixes it). Candidate 5 would
be the 3rd night on the same meta-finding with nothing new to add beyond #145's own recommendations
to a human. Candidate 4 is real (confirmed by reading `parseArgs`: any flag without an explicit
value absorbs the next token if it doesn't start with `--`, including `--no-color` followed by a
stray positional) but it only manifests when `--no-color` is the last flag before an unexpected
bare argument — rarer in practice than `init`'s validation gap, and lower production value. Noted
as a SCAN finding, not actioned tonight.

## Candidate (implementation)

`packages/cli/src/index.ts`, `case 'init'`: call the already-imported, already-tested
`validateConfig(cfg)` immediately after `defaultConfig(repo)`, before any `sink.log`/`writeFile`,
mirroring the exact pattern `case 'compile'` already uses two cases below it. On failure: exit 1,
`invalid --repo <value>:\n  - <errors>`, nothing printed to stdout, nothing written to disk.

```diff
       case 'init': {
         const repo = (flags.repo as string) || 'owner/name';
         const cfg = defaultConfig(repo);
+        const v = validateConfig(cfg);
+        if (!v.ok) {
+          sink.error(`invalid --repo ${JSON.stringify(repo)}:\n  - ${v.errors.join('\n  - ')}`);
+          return { code: 1, out: sink.out, err: sink.err };
+        }
         const json = JSON.stringify(cfg, null, 2);
         const out = (flags.out as string) || '';
```

Plus 2 new tests in `packages/cli/src/index.test.ts` (`describe('init', ...)`): reject
`--repo notarepo` with no `--out` (exit 1, empty stdout) and reject it with `--out` set
(nothing written to the mock filesystem). 17-line diff total, 2 files, 1 conceptual change.

## Evaluation Receipt

Real evaluator: this repo's own `vitest` suite (`npm test`), `tsc` build (`npm run build`),
`eslint` (`npm run lint`). Baseline captured by `git stash`, candidate by `git stash pop`, same
commands, same commit, same session.

```
BASELINE  (2fba255, no candidate diff)
  npm run build   clean (6 workspaces)
  npm test        106/106 passing, 7 files
  node .../bin.js init --repo notarepo            exit 0, "wrote ... for notarepo"
  node .../bin.js compile <that file>             exit 1, "repo must be \"owner/name\"" (deferred failure, reproduced live)

CANDIDATE (this diff, same commit base)
  npm run build   clean (6 workspaces)
  npm test        108/108 passing, 7 files (+2 tests, 0 regressions)
  npm run lint    clean
  npm run typecheck   pre-existing TS18002 (root tsconfig.json empty `files` list) — reconfirmed
                      identical on baseline via the same stash/pop pair; unrelated to this diff,
                      0 files it touches are in that tsconfig's scope
  node .../bin.js init --repo notarepo            exit 1, "invalid --repo \"notarepo\": - repo must be \"owner/name\""
  node .../bin.js init --repo acme/widget         exit 0, unchanged from baseline (valid-repo path untouched)
```

## Baseline

`main` @ `2fba2550182d81b36423447221823e98e227482a`. 106/106 tests, `init` accepts any `--repo`
string unconditionally.

## Darwin Lineage

`DARWIN=not-applicable` — `@metaharness/darwin` not installed, no evolvable population in scope;
this is a single deterministic one-line gate, not a fitness-search question.

## Evidence

- OBSERVATION: `node packages/cli/dist/bin.js init --repo notarepo` on baseline exits 0 and writes
  `{"repo":"notarepo",...}` — reproduced live, this session, both before and after the candidate.
- OBSERVATION: `compile` on that same file exits 1 with `repo must be "owner/name"` — the existing,
  already-tested invariant (`packages/cli/src/index.test.ts` "rejects an invalid config", line 94)
  that `init` was not applying.
- MEASUREMENT: `npm test` 106→108 (both runs this session, same commit, stash/pop isolated).
- MEASUREMENT: `npm run lint` clean on the candidate.
- OBSERVATION: `npm run typecheck`'s `TS18002` reproduced identically on both baseline and
  candidate via the same stash/pop pair — environmental, pre-existing, not caused by this diff.
- INFERENCE (none load-bearing for the verdict): none required — every claim above is a direct
  tool/CLI invocation this session ran, not inferred from logs or prior PRs.

## Reward-Hack Check

Independent self-critique: the candidate adds a check, it does not touch any test, benchmark,
threshold, or gold answer — `validateConfig` and its regex are unchanged, reused verbatim from the
already-shipped `compile` path. The two new tests assert on the CLI's own `run()` return value and
mock filesystem, the same harness every other CLI test in this file already uses; no new mock or
IO shortcut was introduced. No evaluator, cache, or gate was touched. CLEAR.

## Security Review

No new exec/network/filesystem/credential surface — `validateConfig` is a pure, already-shipped
regex check with no I/O. No `.github/`, gate, threshold, or security-boundary file touched. The
diff only restricts an existing CLI command to its own already-enforced-elsewhere input contract;
it does not add a GitHub label, merge, undraft, or self-promote anything.

## Regression Analysis

2 files changed (`packages/cli/src/index.ts`, `packages/cli/src/index.test.ts`), +17/-0 lines.
0 regressions: 106 previously-passing tests still pass unmodified; 2 new tests added. The only
behavior change is for the previously-unvalidated invalid-`--repo` path; every other command and
every valid-`--repo` call is byte-for-byte unchanged (confirmed: the existing `init` "writes a
config file" test with `acme/widget` still passes).

## ADR

None. This is a one-line input-validation gate for an existing CLI command, not an architectural
decision — it extends an invariant (`owner/name` shape) the repo already encodes in `validateConfig`
and already tests for `compile`, to a second call site that was missing it. Does not meet the "only
for an architectural decision" bar in STEP 19.

## Competitors (context)

| Project | Scaffold/init validates its own input before writing? | Grade |
|---|---|---|
| Pipecat CLI scaffold | Yes — dry-run resolves+validates config before any file is generated | B |
| create-grafana-plugin (Rust) | Yes — dedicated validation function runs on the merged config before generation | B |
| Generic CLI UX guidance | Lists silent misconfiguration as an anti-pattern; prescribes failing fast with a clear message at the point of input | B |
| Sakana AI Scientist / OpenHands / SWE-agent / AutoGPT lineage | Not directly comparable (full research/coding-agent loops, not a config scaffolder), but all share this repo's broader finding: agent-authored change volume is outpacing reviewer throughput industry-wide in 2026 (Faros/Semgrep/O'Reilly coverage) | B/C |

This repo's own zero-merge streak (77 days, 29 open dream-cycle PRs) is a local instance of that
same industry-wide pattern (Semgrep: PR volume growing faster than reviewer capacity; one 2026
study found reviewer abandonment accounts for 38% of rejected agent PRs) — which is exactly why
tonight's candidate was deliberately kept to 17 lines: the ledger's own `zeroMergeStreak: true`
signal calls for biasing toward "a tiny, one-parameter, easily-reviewable candidate," and this repo
has 29 open examples of what happens when that bias isn't followed.

## Scan Findings (cli, tui — not actioned tonight)

1. **cli**: `parseArgs`'s boolean-only flag `--no-color` absorbs a trailing bare positional as its
   value instead of staying `true` (e.g. `tui --no-color somefile` silently keeps color on,
   because `flags['no-color']` becomes the string `"somefile"`, not `true`). Real, but narrow
   (only triggers when `--no-color` precedes an unexpected positional); lower production value
   than tonight's candidate. Left for a future night if it recurs independently.
2. **tui**: `verdictColor()` in `packages/cli/src/tui.ts` reads the module-level `C` palette
   directly instead of the `opts.noColor`-aware `c` proxy `renderDashboard` builds — reconfirmed
   still present on `main`, already diagnosed in open PR #117 (2026-11-04), not re-raised per the
   "repeated finding" discouragement (see candidate table).

## Issue

#152

## Witness

```
report_sha256 : 7f72aa98ad131c2e93b87e60db8991fc4f214c4690cc08dc5b5c5dbb81d18993
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : d2786b0f5568d051412d9af6a5c57ef7599c66e03722451165a186dd0141c45c
```

Self-referential-hashing caveat (same convention as PR #135/#145): the hash below was computed by
`dream-machine witness stamp` over this file as it stood with this Witness section still holding
placeholder text — i.e. over everything except the two values this section itself reports. Verify
by re-running `node packages/cli/dist/bin.js witness stamp <this-file-as-committed> 2fba2550182d81b36423447221823e98e227482a`
and confirming the `witness` line matches the one embedded below; `witness verify` performs that
same check in one step.

Verifier procedure (reproducible by anyone):
1. Check out this report as committed, *before* this Witness section's hash values are read.
2. Run `node packages/cli/dist/bin.js witness stamp <this-file> 2fba2550182d81b36423447221823e98e227482a`.
3. Confirm the `witness` line matches the one embedded in the committed PR body / ledger row.
4. Equivalently, run `node packages/cli/dist/bin.js witness verify <this-file> 2fba2550182d81b36423447221823e98e227482a <claimed-witness>`.
5. A mismatch means the file was edited after stamping, or the wrong commit was used.

## Recommendation (for human review — this session recommends, never decides or executes)

1. Review and merge PR for tonight's `init` validation gate — 17 lines, additive-only test
   coverage, touches no protected path, genuinely tiny.
2. Separately: the 29-PR open dream-cycle backlog (#93→#151, 0 merged since #9) needs a human
   triage pass independent of tonight's finding — PR #145 (2026-11-19) already laid out concrete
   steps (create `automerge-safe`, mark specific reviewed PRs ready-for-review) that remain
   actionable and unactioned 5 nights later.
