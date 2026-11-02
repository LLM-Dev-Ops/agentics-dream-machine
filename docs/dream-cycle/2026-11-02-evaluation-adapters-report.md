# Evaluation-Adapters / Darwin SOTA Report — 2026-11-02

## Correction logged before freezing (process note, read first)

Tonight's STEP 1 initially checked only `docs/dream-cycle/LEDGER.md` (last row:
2026-09-08) and the two local `docs/adrs/ADR-000{1,2}` files. That undercounts
this repo's real accumulated evidence by a wide margin: `mcp__github__list_issues`
shows **50 open dream-cycle issues** running continuously through
`#110` (2026-11-01, *yesterday*), and `list_pull_requests` shows **58 open
PRs**, every one of them branched from the same commit this session also
started from (`2fba2550182d81b36423447221823e98e227482a`) — because **zero
PRs have merged since #9** (2026-09-08). `LEDGER.md` on `main` is stale not
because nights stopped appending to it, but because each night's ledger row
lives inside that night's own unmerged branch and never reaches `main`. This
is itself a durable, reportable observation (see Evidence), but fixing the
merge backlog is a human/process decision already tracked by issues
#84/#90/#104 — not re-litigated here.

Reading the real issue/PR history **before** freezing tonight's candidate
would have surfaced: PR #18 (2026-09-12, still open) already fixes the exact
`dream.config.json` defect this session independently reproduced tonight
(missing `<repo>` positional on the `darwin` entrypoint). This session caught
its own gap via the normal duplicate-check discipline (precedent: issue #74,
PR #76) **before** opening a new issue/PR, reverted the duplicate one-line
config change from its working tree, and narrowed tonight's candidate to the
part that is independently novel. See "What's new" and "Duplicate check" below.

## TL;DR

Tonight's SCAN=darwin probe reproduced — independently, not for the first
time — the known, already-PR'd defect in this repo's configured `darwin`
evaluator entrypoint (`npx @metaharness/darwin evolve --sandbox real`,
missing its required `<repo>` positional; PR #18 already proposes the
one-line fix, unmerged 51 days). What tonight adds that no open PR already
has (checked across all 58 open PR bodies for `swallow`, `suspicious-
misconfigured`, `flag-shaped`, `Artifacts:` — zero matches): a small, pure,
generic runtime detector, `detectSwallowedPositionalArtifact`, that reads
Darwin's own `Artifacts: <path>` output line and recognizes this entire
*class* of failure (any evaluator-entrypoint command that silently drops a
required positional and gets misclassified `live`) — not just this one
instance of it. Wired into both `classifyEntrypointResult` call sites via a
new `classifyEntrypointResultStrict` wrapper. Live receipt against this
repo's real, still-unpatched production command tonight: `verdict` flips
from `live (exit 0)` — false confidence — to `suspicious-misconfigured
(exit 2)`, **without needing PR #18 to ever merge**.

## Duplicate check (performed before freezing the final candidate)

Searched all 58 open PR titles + bodies for: `positional`, `missing <repo>`,
`required argument`, `evolve --sandbox real` → found PR #18 (2026-09-12, open
51 days) already fixes `dream.config.json`'s darwin command exactly as this
session had independently drafted (`evolve --sandbox real` →
`evolve . --sandbox real`), plus adds a `flywheel` entrypoint. PR #63
(2026-10-08) already pins the darwin `npx` version (this session's candidate
#3, see below). PR #20 (2026-09-13) already ships a static supply-chain pin
checker (adjacent to this session's candidate #5, see below). **Action
taken**: reverted the duplicate `dream.config.json` edit from the working
tree before finalizing; narrowed the candidate to the orthogonal, unduplicated
part (the runtime detector). Searched the same 58 bodies for `swallow`,
`suspicious-misconfigured`, `flag-shaped`, `Artifacts:` → zero matches; this
part is not a duplicate.

## What's new

- Reproduced tonight, three independent ways, all byte-identical leaderboard
  content: `darwin evolve --help`, `darwin evolve --sandbox real` (the exact
  literal configured command, still unpatched on `main`), and a direct repro
  with `--sandbox` as the only positional. All three create
  `./<swallowed-flag>/.metaharness` in cwd and exit 0.
- Isolated root cause empirically (no Darwin source read — external npm
  package, out of this repo's scope per ADR-0002 precedent): comparing a
  bogus-positional run against `darwin evolve . --sandbox real --generations
  1 --children 2` (correct form, matching PR #18's fix) shows `--sandbox
  real` scores variants by **whatever `npm test` reports in the current
  working directory**, independent of the `<repo>` argument's validity — the
  positional only ever controls the artifacts directory name. That is why a
  broken invocation from repo root still produces a *plausible* result: it
  silently substitutes "wherever you happen to be" for "the repo you asked
  for."
- Ran this repo's own real tooling against its own real, **still-unpatched**
  `dream.config.json` tonight (package now cached — `@metaharness/darwin@0.12.1`
  — no `--no-install` dodge needed, unlike 2026-09-08 when it wasn't locally
  cached): `verify-entrypoints dream.config.json` → `bench: live (exit 0)`,
  `darwin: live (exit 0) — produced output`, exit 0. The `darwin` verdict is
  not trustworthy — it never touched this repository's actual evaluation
  surface in any way the artifacts path reveals. `classifyEntrypointResult`'s
  `live` verdict means "produced output," not "produced output about what
  you asked it to evaluate" — a blind spot one layer past the
  `suspicious-silent` case ADR-0002 closed, and one PR #18's config-only fix
  doesn't close either (it fixes *this* command; it adds no mechanism to
  catch the *next* misconfigured one).
- Corroboration (external, Grade B — cross-checked, not single-source):
  yargs' documented default-command behavior swallows an unrecognized token
  as the positional when a `$0 <positional>`-shaped command is registered,
  matching the exact shape observed here (a third-party yargs adapter
  documents the same footgun and ships a `.check()` workaround comparing
  leftover positionals against declared command names — no CVE/formal
  advisory exists, it's a parser-ergonomics gap, not a vulnerability). 2026
  evaluator-trust literature (EvilGenie, RewardHackingAgents, SWE-Bench Pro
  Verified leakage write-up) treats "evaluator silently grades the wrong
  thing" as a first-class, actively studied failure class this year.
- SCAN=flywheel: PR #18 (unmerged) already proposes adding a `flywheel` key;
  `main` still has none. Nothing new to add tonight without duplicating #18.

## Candidates considered (score = fit+novelty+testability+measurability+production-value+reviewability, 1-5 each)

| # | Candidate | Fit | Novelty | Testability | Measurability | Prod-value | Reviewability | Total |
|---|---|---|---|---|---|---|---|---|
| 1 | **Selected**: generic `detectSwallowedPositionalArtifact` + `classifyEntrypointResultStrict`, wired into both entrypoint call sites | 5 | 5 | 5 | 5 | 5 | 5 | 30 |
| 2 | Add a `flywheel` key to `evaluatorEntrypoints` | 2 | 1 | 3 | 2 | 2 | 4 | 14 |
| 3 | Pin unpinned `npx @metaharness/darwin` to an exact version + `--yes` guard | 2 | 1 | 4 | 3 | 4 | 5 | 19 |
| 4 | Surface entrypoint verdicts in the `tui` ledger dashboard | 2 | 3 | 3 | 2 | 3 | 3 | 16 |
| 5 | Generic static linter over `evaluatorEntrypoints` command strings (pre-execution) | 3 | 2 | 5 | 3 | 3 | 4 | 20 |

Candidates #2, #3 dropped a point of novelty each after the duplicate check:
#2 and the `dream.config.json` positional fix are PR #18's content exactly;
#3 is PR #63's content exactly. #5 overlaps PR #20's already-shipped static
supply-chain checker closely enough (same "catch a misconfigured
evaluatorEntrypoints command before/without running it" idea) that it would
need to be scoped very narrowly to avoid redundancy — left as a genuine next
step, not attempted tonight. #1 is the only candidate confirmed, by searching
all 58 open PR bodies, to have zero prior art in this repo.

## Hypothesis (frozen before implementation; amended once, logged below)

> Given this repo's own `classifyEntrypointResult` (packages/cli/src/entrypoint.ts,
> ADR-0002), which classifies any exit-0-with-output evaluator-entrypoint
> result as `live` regardless of whether the output describes a run against
> the intended target, when a new pure `detectSwallowedPositionalArtifact(stdout)`
> is added that recognizes Darwin's self-reported `Artifacts: <path>` line as
> flag-shaped (a positional argument was swallowed by an adjacent flag), and a
> `classifyEntrypointResultStrict` wrapper layers this on top of the
> untouched `classifyEntrypointResult`, then (1) replaying this repo's real,
> currently-unpatched `darwin` entrypoint command's real captured output
> through the new wrapper classifies `suspicious-misconfigured` instead of
> `live`, and (2) a real, correctly-formed darwin invocation's output
> continues to classify `live`, subject to: zero change to
> `classifyEntrypointResult`'s existing three-verdict behavior/tests
> (ADR-0002 Test Contract item 1), no pre-existing test weakened/removed/
> modified, `npm test` 0 regressions, and no `dream.config.json` change (to
> avoid duplicating still-open PR #18, which owns that file's darwin/flywheel
> fix).

**Amendment, logged not hidden**: an independent adversarial-critique
subagent found the as-first-frozen candidate wired the new check into the
plural `classifyConfiguredEntrypoints` path only, leaving the singular
`verify-entrypoint` CLI command's direct `classifyEntrypointResult` call
site exposed to the exact blind spot the candidate exists to close.
**Fixed**: extracted `classifyEntrypointResultStrict` and switched both call
sites to it. `classifyEntrypointResult` itself (the clause ADR-0002 actually
pins) remains byte-for-byte unchanged; only the *scope of callers protected*
grew — a strengthening of the hypothesis's intent, not a weakening of its
evidence. Separately: the hypothesis's "no `dream.config.json` change" clause
was added only *after* the duplicate-check correction above — the
as-literally-first-frozen hypothesis did include a config change tonight
mistakenly believed to be novel. Both amendments are logged here rather than
silently smoothed over.

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest), this repo's own `bench` entrypoint, plus
real, non-mocked `npx @metaharness/darwin` invocations (package genuinely
installed tonight, first time this session could reach it past a cached-miss
`blocked` verdict) as direct behavioral evidence.

| | Baseline (parent, commit 2fba255) | Candidate (working tree) |
|---|---|---|
| Test files | 7 | 7 |
| Tests | 106 | 112 (+6, 0 removed, 0 modified) |
| Result | 106 passed | 112 passed |
| Lint | clean | clean |
| Build (`tsc -b`, all 6 packages) | clean | clean |
| `npm run typecheck` (separate script) | pre-existing `TS18002` (empty tsconfig `files`), confirmed via `git stash` to predate this diff | identical, unrelated — not caused by candidate |
| `dream.config.json` | unchanged tonight (PR #18 owns this file's fix) | unchanged |
| `verify-entrypoints`/`verify-entrypoint` (both call sites), darwin verdict against the real, still-unpatched command | `live` (exit 0, false confidence) | `suspicious-misconfigured` (exit 2) |
| Same, replayed against PR #18's corrected command's real captured output (not committed here) | n/a | `live` (exit 0, no flag-shaped artifacts path) — confirms no false positive on the fix PR #18 already proposes |

Diff: 4 files, `packages/cli/src/entrypoint.ts` (+40/-6), `entrypoint.test.ts`
(+67/-1), `index.ts` (+1/-1 import, +1/-1 call site), `index.test.ts` (+16) —
130 lines total, one conceptual change, `dream.config.json` untouched.

## Adversarial critique (independent subagent, not the candidate's author)

Verdict: **CLEAR**, one gap found and fixed (see Amendment above), one
non-blocking correctness nit recorded, not fixed (no real-world evidence it
occurs): `detectSwallowedPositionalArtifact` matches only the *first*
`Artifacts:` line (non-global regex); every real capture tonight (three
independent invocations) printed exactly one such line. One accepted
false-positive direction, by design: a legitimately flag-named artifacts
directory a user created on purpose would also be flagged
`suspicious-misconfigured` — errs toward suspicion, consistent with
ADR-0002's existing `suspicious-silent` tier. No pre-existing test weakened,
removed, or loosened (confirmed via `git diff --stat`: additions only besides
two import/call-site lines, plus an independent full `npm test` run). No
evaluator exploit, no undocumented cache, no mocking of the real `npm
test`/vitest run itself.

## Darwin (bounded evolution)

`DARWIN=not-applicable` — same reasoning as every prior non-architectural
night (PRs #8/#18/#20/#26/#35/#37/#45): a small, pure, exhaustively-branched
(now 4-verdict) classifier has no evolvable population for Darwin's
generations×children search.

## Evidence

- OBSERVATION: `mcp__github__list_issues`/`list_pull_requests` on the real
  `LLM-Dev-Ops/agentics-dream-machine` repo: 50 open issues through #110
  (2026-11-01), 58 open PRs, all branched from `2fba255`, **zero merged since
  #9** (2026-09-08) — `docs/dream-cycle/LEDGER.md` on `main` is consequently
  ~50 nights stale, each night's ledger-append living only in its own
  unmerged branch.
- OBSERVATION: PR #18 (2026-09-12) already proposes the exact
  `dream.config.json` fix this session independently drafted; PR #63
  (2026-10-08) already pins the darwin `npx` version; PR #20 (2026-09-13)
  already ships a static supply-chain pin checker. None of the 58 open PR
  bodies contain `swallow`, `suspicious-misconfigured`, `flag-shaped`, or
  reference Darwin's `Artifacts:` line — tonight's detector is not a
  duplicate.
- MEASUREMENT: `npm test` — 106/106 (baseline, commit 2fba255) → 112/112
  (candidate), 0 regressions, 0 removed/modified tests.
- MEASUREMENT: real `npx @metaharness/darwin evolve --sandbox real` (this
  repo's literal, still-unpatched entrypoint), reproduced three independent
  ways tonight, all exit 0 with `Artifacts: .../--sandbox/.metaharness` (a
  flag-shaped directory segment).
- DECISION: revert the duplicate `dream.config.json` edit from the working
  tree; narrow the candidate to the orthogonal detector; do not open a 59th
  PR proposing PR #18's already-proposed fix.
- DECISION: ship `detectSwallowedPositionalArtifact` +
  `classifyEntrypointResultStrict` as a small, additive, orthogonal
  extension to the existing classifier; do not touch `dream.config.json`.

## Security Review

No new execution/network/credential surface — pure string inspection of
output this repo's own classifier already received as part of its existing
`exec()` call; no new filesystem/network access, no agent-impersonation or
prompt-injection surface (a regex match + string split over a trusted-enough
third-party tool's self-reported path, no code execution). The known
unpinned-`npx`-version risk (tracked by #20/#63, confirmed again tonight as
still unmerged) was incidentally exercised by tonight's evidence-gathering
runs, not newly introduced, not fixed here.

## Witness

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at
the start of tonight's session; identical to the base of all 58 open PRs).
Following this repo's established convention (`GIST=LOCAL`, no `gh gist
create`-equivalent available to this session — confirmed via the harness's
own auto-mode classifier denying a raw `/gists` POST tonight as a public
data-sharing upload, consistent with every other recent night's `GIST=LOCAL`
outcome, e.g. PR #111's identical finding): this report's text is frozen as
committed at `docs/dream-cycle/2026-11-02-evaluation-adapters-report.md`;
`REPORT_HASH`/`WITNESS` are computed from those exact bytes and published in
the issue body, the draft PR body, and the `LEDGER.md` row — not inlined
into this file, since editing this section after hashing would invalidate
the hash it describes.

**Verifier procedure (5 steps, reproducible by anyone):**

1. Compute `REPORT_HASH = sha256sum docs/dream-cycle/2026-11-02-evaluation-adapters-report.md`
   at the commit this PR targets; must match the value published in the
   issue/PR/ledger.
2. Compute `printf '%s%s' "$REPORT_HASH" "2fba2550182d81b36423447221823e98e227482a" | sha256sum`;
   must match the published `WITNESS`.
3. `git checkout 2fba2550182d81b36423447221823e98e227482a && npm ci && npm
   run build && npm test` → 106/106 (baseline).
4. Apply this PR's diff on top; `npm test` → 112/112, 0 regressions.
5. From repo root on the baseline commit, run `npx @metaharness/darwin
   evolve --sandbox real` → observe `Artifacts: .../--sandbox/.metaharness`;
   then `node packages/cli/dist/bin.js verify-entrypoint darwin --cmd "npx
   @metaharness/darwin evolve --sandbox real"` on the candidate branch →
   observe `suspicious-misconfigured (exit 2)`.

## Recommendation

Human review of the draft PR. The 58-open/0-merged-since-#9 backlog is a
human decision (tracked by #84/#90/#104), not re-litigated here, but worth
restating plainly: merging PR #18 (darwin/flywheel config fix) and PR #63
(version pin) would resolve the root causes this and prior nights keep
re-confirming; tonight's PR is a complementary safety net that has value
independent of whether/when those merge. Concrete next steps, not done
tonight:

1. Merge PR #18, #63, #20 (or let a human triage the backlog) — resolves the
   root `dream.config.json` defect, the unpinned-npx risk, and extends
   static pin-checking; none re-proposed tonight to avoid duplication.
2. Recover/replay the ~50 nights of ledger rows currently stranded in
   individual unmerged branches into `main`'s `LEDGER.md` once the backlog
   is triaged — a process-integrity fix already implicitly tracked by
   #84/#90/#104, surfaced explicitly here as a corollary of tonight's
   duplicate-check.
3. Consider a pre-execution static linter for the "missing positional
   argument" command shape specifically (narrower than PR #20's supply-chain
   pin check) as a second, independent layer — deliberately not built
   tonight given its overlap with #20.
