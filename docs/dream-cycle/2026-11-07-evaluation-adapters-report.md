# Evaluation-Adapters / Darwin SOTA Report — 2026-11-07

## Rotation

`DATE=2026-11-07`, `DAYINT=20261107`, `SLOT=(DAYINT % 5)=2` → `DEEP=evaluation-adapters`,
`SCAN=flywheel,darwin`. No bonus dive (`20261107 % 25 = 7`, `% 75 = 7`, neither `0`).
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.

## TL;DR

`evaluation-adapters`/`darwin` is this repo's most heavily re-visited surface:
at least 9 prior nights (#17/18, #25/26, #34/35, #44/45, #53, #60, #61, #70,
#71, #80/81, #100/101, #110/111, #112/113) have hit it, and every
once-plausible small candidate on the *known* failure modes (missing
`<repo>` arg, non-idempotent state, genome/bench mismatch, repo-independent
`mock` mode, swallowed-positional detection) is already open and unmerged.
Rather than force a 10th near-duplicate finding, tonight ships the one
concrete, previously-deferred follow-up the 2026-11-01 report (PR #111)
explicitly named and declined to build: **wiring `classifySandboxDiagnosticity`
into the `verify-entrypoint`/`verify-entrypoints` CLI commands' human-readable
output**, so a human (or a future dream-cycle session) reading `darwin: live`
is told, inline, when that `live` verdict is known to carry zero evidentiary
value about this specific repository.

## Ledger Check (STEP 1) + real GitHub state

`docs/dream-cycle/LEDGER.md` on `main`: 9 rows, ending 2026-09-08 (PR #8) —
confirmed byte-identical to this checkout. Real GitHub state checked fresh
tonight (`mcp__github__list_pull_requests`/`list_issues`/`issue_read`/
`pull_request_read` — not inferred from the stale local file):

- **2 PRs merged ever** (#8, #9, both 2026-09-08). **Zero merges since.**
  `list_pull_requests(state=closed)` confirms only those two; everything
  else listed (through PR #121, 2026-11-06) is `state: open`, `draft: true`.
- `main`'s `LEDGER.md` is stale not because nights stopped appending —
  every night's row lives only in that night's own unmerged branch and
  never reaches `main`, exactly as PRs #112/#113 (2026-11-02) and #110/#111
  (2026-11-01) already documented.
- Issue #88/PR #89 (2026-10-21, ledger-signals) already performed a
  backlog-wide `git merge-tree` audit: 36/40 open PRs were conflict-free
  and untouched any protected path — "structurally eligible for
  `automerge-safe` today" — and explicitly recommended a **human** apply
  that label for the first time in this repo's history. Not re-audited or
  re-litigated tonight; no `automerge-safe` label has been applied to any
  PR since (confirmed: none of the ~30 most recent PRs carry it).
- Read PR #112/#113 (2026-11-02, evaluation-adapters) in full: added
  `detectSwallowedPositionalArtifact` + `classifyEntrypointResultStrict`,
  a 4th verdict (`suspicious-misconfigured`), wired into both
  `entrypoint.ts`/`index.ts` call sites. Read PR #110/#111 (2026-11-01,
  rotated from ledger-signals) in full: `classifySandboxDiagnosticity`
  (darwin `--sandbox mock` proven repo-independent via a real-vs-
  nonexistent-path experiment), shipped as a standalone file, explicitly
  **not** wired into CLI output — "a natural, small follow-up... not built
  tonight." Read PR #80/#81 (2026-10-17, non-idempotent stale-state
  classifier) and PR #17/#18 (2026-09-12, ADR-0003 + `<repo>`-arg/flywheel
  fix) in full for context; neither overlaps tonight's candidate (both
  patch `classifyEntrypointResult` itself or `dream.config.json`; tonight
  touches neither).
- Searched all evaluation-adapters-labeled issue/PR bodies back to #17 for
  `formatEntrypointLine`, `extractSandboxMode`, `verify-entrypoint.*output`,
  `wire.*sandbox`: zero matches besides PR #111's own one-line deferral.
  Not a duplicate.

**Learning signals (STEP 1.1)**: `main`'s real 9-row ledger is blind to the
real backlog (same blindness PRs #42/#59/#109/#111 already name — not
re-derived mechanically here). Real GitHub state gives `zeroMergeStreak:
true` (0/≥30 recent PRs merged) → this session biases to a **tiny,
one-conceptual-change, easily-reviewable candidate** per STEP 1.1's own
rule, which the selected candidate satisfies (4 files, +180/-3 lines, zero
touch to `dream.config.json`, `entrypoint.ts`'s existing exported functions,
or any evaluation gate).

## Candidates considered (1–5 each: fit / novelty / testability / measurability / production-value / reviewability)

| # | Candidate | Fit | Novelty | Testability | Measurability | Prod-value | Reviewability | Total |
|---|---|---|---|---|---|---|---|---|
| 1 | **Selected**: wire `classifySandboxDiagnosticity` into `verify-entrypoint(s)` output via new `extractSandboxMode` + `formatEntrypointLine` | 5 | 4 | 5 | 5 | 4 | 5 | 28 |
| 2 | Re-run/extend PR #88's 36/40-PR automerge-eligibility audit for the now-larger backlog | 3 | 1 | 4 | 4 | 2 | 3 | 17 |
| 3 | A 5th verdict / further `classifyEntrypointResult` extension for a new failure mode | 3 | 2 | 4 | 3 | 3 | 3 | 18 |
| 4 | Static pre-execution linter over `evaluatorEntrypoints` strings (narrower version of PR #20's supply-chain checker) | 3 | 2 | 4 | 3 | 3 | 3 | 18 |
| 5 | Re-verify `flywheel`'s bin-less-package deficiency live (pure reconfirmation) | 2 | 1 | 5 | 3 | 1 | 4 | 16 |

Candidate #2 scored low on novelty — issue #88 already did the exact audit
8 days ago and explicitly deferred the merge decision to a human; repeating
it with a slightly larger PR count is not a new finding. #3/#4 would touch
`classifyEntrypointResult`/`entrypoint.ts` again, raising the same-file
conflict surface PR #112/#113 already occupies, for a failure mode not yet
observed live. #1 is the only item confirmed novel (zero prior art) and
directly actionable without needing any other open PR to merge first.

## Hypothesis (frozen before implementation)

> Given this repo's `verify-entrypoint`/`verify-entrypoints` CLI commands
> (`packages/cli/src/index.ts`), which currently print a bare
> `<label>: <verdict> (exit <code>) — <reason>` line for every configured
> evaluator entrypoint with no indication of whether a `live` verdict
> carries any evidentiary value about this specific repository, when (a) a
> new pure `extractSandboxMode(cmd)` parser is added to extract a
> `--sandbox <mode>` value from a configured command string, (b) PR #111's
> `classifySandboxDiagnosticity(mode)` classifier is reproduced (credited,
> not claimed as new) in the same new file, and (c) a new
> `formatEntrypointLine(label, cmd, check)` helper wires both into both CLI
> call sites' output, then: a `live` verdict for the `darwin` label whose
> configured command specifies `--sandbox mock` prints an additional
> bracketed annotation stating the result is repo-independent (crediting
> PR #111's 2026-11-01 evidence) and must not be treated as evidence about
> this repository; every other label, and every `darwin` command with any
> other (or no) `--sandbox` value, prints byte-identical output to before
> this change. Subject to: `classifyEntrypointResult`/
> `classifyConfiguredEntrypoints` in `packages/cli/src/entrypoint.ts` stay
> byte-for-byte unmodified; no pre-existing test weakened, removed, or
> modified; `npm test` 0 regressions; zero change to `dream.config.json`;
> zero new I/O/network/credential surface.

Not modified after evaluation began.

## Candidate

4 files: `packages/cli/src/darwin-sandbox.ts` (new, 67 lines — reproduces
PR #111's `classifySandboxDiagnosticity`, cited explicitly in its own header
comment as credited prior art, plus the new `extractSandboxMode`),
`packages/cli/src/darwin-sandbox.test.ts` (new, 55 lines, 10 tests, one
added after the independent critic's finding — see Reward-Hack Check),
`packages/cli/src/index.ts` (+23/-3: new `formatEntrypointLine` helper,
both `verify-entrypoint`/`verify-entrypoints` call sites switched to use
it), `packages/cli/src/index.test.ts` (+40: 4 new tests). ~185 insertions,
3 deletions, one conceptual change, well under the 300-line target.
`packages/cli/src/entrypoint.ts` is untouched — zero overlap with PR
#112/#113's edits to that same file.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), fresh `npm ci && npm run build` at
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`. `LLM_EVAL=blocked`
— `OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY`/`OPENAI_API_KEY` all unset in this
environment; candidate needed none (pure string functions, zero model calls).

| | Baseline (`main@2fba255`) | Candidate |
|---|---|---|
| Test files | 7 | 8 (+1 new file) |
| Tests | 106 passed | **120 passed** (+14, 0 removed/modified) |
| `npm run lint` (eslint) | clean | clean |
| `npm run build` (6 workspaces, `tsc -b`) | clean | clean |
| `dream.config.json` | unchanged | unchanged |

Live, non-simulated receipts against the real, still-unpatched `main`
entrypoint commands (run from a clean working directory, `.metaharness`/
`--sandbox` artifacts removed before/after, `git status --porcelain` clean):

```
$ node packages/cli/dist/bin.js verify-entrypoint darwin \
    --cmd "npx @metaharness/darwin evolve --sandbox real"
darwin: live (exit 0) — produced output
# unchanged from pre-candidate behavior: --sandbox real is not measured
# for repo-independence, so no annotation — correct, not a false positive.

$ node packages/cli/dist/bin.js verify-entrypoint darwin \
    --cmd "npx @metaharness/darwin evolve . --sandbox mock"
darwin: live (exit 0) — produced output [repo-independent: measured
2026-11-01 (PR #111): identical leaderboard/winner/delta for a real repo
path and a nonexistent repo path, both unseeded and with fixed
--generations/--children/--seed — "mock" performs no I/O against the
target and its result carries no information about it — do not treat
this result as evidence about this repository]
```

Both commands were run for real against the real, freshly-installed
`@metaharness/darwin` package (not mocked) — the annotation is driven by
the real CLI's real `live` verdict on real output, not a synthetic fixture.

## Darwin Results (STEP 12-13, bounded evolution of this session's own candidate)

`DARWIN=not-applicable` — same precedent as every prior night on this
surface (#8/#18/#20/#26/#35/#37/#45/#81/#101/#111/#113): `formatEntrypointLine`
and `extractSandboxMode` are small, pure, deterministic functions with no
evolvable parameter space for Darwin's generations×children search.

## Evidence (classified)

- OBSERVATION: PR #111's (2026-11-01) own report explicitly deferred this
  exact wiring as a named next step.
- OBSERVATION: `main`'s `classifyEntrypointResult`/`classifyConfiguredEntrypoints`
  (`packages/cli/src/entrypoint.ts`) have no output-formatting layer — both
  CLI call sites build their log line directly from `${verdict} (exit
  ${code}) — ${reason}`.
- MEASUREMENT: `npm test` 106/106 (baseline) → 119/119 (candidate), 0
  regressions, 0 removed/modified tests.
- MEASUREMENT: live CLI receipts above — annotation fires only for
  `darwin`+`live`+`--sandbox mock`; absent for `--sandbox real` on the same
  label and command shape.
- INFERENCE: because `formatEntrypointLine` is a pure post-processing step
  that never alters `check.verdict`/`check.code` (confirmed by reading the
  diff: the exit-code computation in both call sites still reads from the
  untouched `check` object, not from the formatted string), this change
  cannot alter any existing automation that keys off exit codes — only the
  logged text gains an addendum.
- DECISION: reproduce (not re-derive or re-measure) PR #111's
  `classifySandboxDiagnosticity` verbatim-in-spirit, crediting it explicitly
  in the new file's header comment, rather than claiming independent
  discovery — this session's only new claim is the parsing+wiring.
- REJECTION: considered also wiring in PR #113's `suspicious-misconfigured`
  verdict/`classifyEntrypointResultStrict` for a "more complete" output
  layer. Rejected — that would require modifying `entrypoint.ts`, bundling
  a second unmerged PR's content into this diff, and duplicating work
  without independent value; left as a separate, independently reviewable
  concern (see Recommendation).
- REJECTION: considered marking `--sandbox real` or `--sandbox agent` as
  "likely also" repo-independent by analogy to `mock`. Rejected —
  `classifySandboxDiagnosticity` explicitly returns `repoIndependent: false`
  ("not measured") for every mode except the one literally measured,
  preserving PR #111's own honesty discipline.

## Reward-Hack Check

Self-critique: no benchmark, gold answer, threshold, or evaluation gate
touched (`dream.config.json` untouched; `entrypoint.ts` untouched). No
cherry-picking: both the annotated (`mock`) and unannotated (`real`) live
receipts are reported, including the "no change" case. No hidden cost (full
candidate build+test+two real darwin invocations completed in well under 5
minutes). No undocumented cache — `npx` resolved fresh, package version
unpinned exactly as `main` already has it (pre-existing, tracked defect,
not newly introduced). No evaluator exploited: the annotation is additive
text only; it cannot change a `blocked`/`suspicious-silent` verdict to
`live` or vice versa (confirmed by reading `formatEntrypointLine`: it
returns `base` unchanged for every verdict except `darwin`+`live`, and even
then only appends to the string, never replaces or re-derives `verdict`/
`code`). Checked for duplication across all `evaluation-adapters`-labeled
PRs back to #17 (see Ledger Check) — confirmed none implement this wiring.

**Independent critic**: a fresh general-purpose subagent (separate context,
no exposure to this session's reasoning) independently re-cloned/rebuilt a
baseline worktree at `2fba255` (106/106) and re-ran the working tree
(120/120 — at the time of its review, before the fix below, 119/119),
confirmed `entrypoint.ts`/`dream.config.json` byte-for-byte untouched,
confirmed the PR #111 duplicate-check by actually fetching and inspecting
`origin/dream/2026-11-01-evaluation-adapters`, confirmed `formatEntrypointLine`
only changes the `darwin`+`live` path (verified by direct calls into the
built `dist/`), and confirmed `classifySandboxDiagnosticity` never returns
`repoIndependent: true` for anything but the literal string `'mock'`.
**Verdict: CLEAR.** One non-blocking finding: `extractSandboxMode`'s
original regex (`\S+`) was greedy and would capture `"mock,extra"` whole
instead of `"mock"` for a comma-shaped trailing value — harmless at the
time only because `classifySandboxDiagnosticity` does strict `=== 'mock'`
equality downstream, but worth tightening. **Fixed before finalizing**:
regex narrowed to `[^\s,]+`; a regression test
(`'stops at a comma instead of swallowing trailing non-whitespace...'`)
added to `darwin-sandbox.test.ts`; full suite re-run clean at 120/120
after the fix. No other finding; no reward-hacking, no test weakening, no
scope creep into `entrypoint.ts` or any gate/threshold file.

## Security Review

Zero new execution, network, filesystem, or credential surface:
`extractSandboxMode` is a pure regex match over a string already present in
`dream.config.json`/the CLI's own argv; `formatEntrypointLine` is a pure
string-formatting function over data the existing `exec()` call already
produced. No dependency added, no version bumped, no `.github/`,
`dream.config.json`, gate, or threshold file touched. The two live darwin
invocations used for the Evaluation Receipt carry the same already-known,
already-tracked unpinned-`npx`-version supply-chain exposure as every prior
darwin-touching night (#18/#20/#63) — not newly introduced, not fixed here.
No prompt-injection, agent-impersonation, or cross-agent surface — no LLM
calls anywhere in this candidate or its evidence-gathering.

## Regression Analysis

0 pre-existing tests removed, weakened, or retargeted. `packages/cli/src/entrypoint.ts`
and its test file are untouched (confirmed via `git diff` — not in the
changed-files list). `npm run lint`/`npm run build` clean before and after.

## ADR

None. This is a measurement/tooling addition within the already-decided
evaluator-trust framing of ADR-0001/0002/(unmerged) 0003 — it does not
introduce or change any architectural decision, matching this repo's own
precedent for similar nights (#33/#63/#97/#99/#101/#107/#109/#111/#113 all
skip an ADR for wiring/validation-tooling changes).

## Gist

`GIST=LOCAL` — no `gh gist create`-equivalent tool available to this
session (same constraint every night since 2026-09-10 has recorded via
`gh auth status`: token is repository-scoped; no gist API in the available
GitHub MCP tools). Full report committed at
`docs/dream-cycle/2026-11-07-evaluation-adapters-report.md` instead.

## Scan Findings

**flywheel** — not re-tested tonight; `dream.config.json` on `main` still
has no `flywheel` key (PR #18's fix, unmerged, 56+ days open). Not
re-fixed a third time.

**darwin** — tonight's headline finding, above. The configured `darwin`
command on `main` still has no `<repo>` argument (PR #18's fix, unmerged)
and is still non-idempotent across repeated invocations in the same working
directory (PR #81's finding, unmerged, reconfirmed incidentally tonight
when a leftover `.metaharness/` from an earlier real invocation collided
with a second — cleaned up before committing, not treated as a new finding
since #81 already covers it exactly).

## Competitors

| System | Relevance to "does the harness surface tell a human when a result is non-diagnostic" | Grade |
|---|---|---|
| Harness-Bench (arXiv:2605.27922, May 2026) | A diagnostic benchmark explicitly built to measure how the execution harness itself (not the model) affects results, by fixing the task/budget/timeout/evaluator and varying only the harness — the closest public analog to "annotate whether this evaluation surface is trustworthy for this target," though it benchmarks harnesses against each other rather than annotating individual CLI output lines. | A (official arXiv preprint) |
| OpenHands / SWE-agent / DSPy-GEPA | Named per `dream.config.json`; structurally require the evaluated artifact to interact with the real target before scoring (per PR #111's own comparison table) — this repo's `--sandbox mock` has no such requirement, which is exactly what tonight's annotation now surfaces at the point a human would read it, rather than leaving it buried in a prior report. | A (official docs/repos) |
| ConfigX (ACM, 2021) | Historical, pre-2026, not agent-specific — a static-analysis tool that derives specifications to catch *silent misconfigurations* in traditional software (Apache/vsftpd/PostgreSQL) before they cause silent wrong behavior. Cited as the general pattern this repo's own `suspicious-silent`/`suspicious-misconfigured`/now diagnosticity-annotation lineage (ADR-0002, PR #113, tonight) is a 2026 agent-evaluator-specific instance of — not evidence about this repo, design-precedent only. | A (peer-reviewed/official, though dated) |
| Sakana AI Scientist, AutoGPT lineage | Named per `dream.config.json`; no new claim tonight — not independently re-researched, no bearing on an output-annotation finding. | — |

## Witness

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a`. Following this
repo's established convention (a report never embeds its own
`report_sha256`/`witness` triple inline, since hashing the final file would
be self-referential): the triple is computed once this file reaches its
final committed content, published externally in the issue body, the draft
PR body, and the `LEDGER.md` row — never pasted back into this section.

**Verifier procedure (5 steps, reproducible by anyone):**

1. `git show <this PR's head commit>:docs/dream-cycle/2026-11-07-evaluation-adapters-report.md > report.md`
2. `REPORT_HASH=$(sha256sum report.md | awk '{print $1}')`
3. `SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`
4. `printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'`
5. Compare to the `witness` value published in this PR's description, the
   linked issue, and the `LEDGER.md` row for 2026-11-07 — must be
   byte-identical.

Separately reproducible: `git checkout 2fba255 && npm ci && npm run build
&& npm test` → 106/106; apply this PR's diff → `npm test` → 120/120, 0
regressions; `node packages/cli/dist/bin.js verify-entrypoint darwin --cmd
"npx @metaharness/darwin evolve . --sandbox mock"` → output contains
`repo-independent`; same command with `--sandbox real` → output does not.

## Recommendation

`evaluated: accepted` for tonight's candidate (small, additive, 120/120, 0
regressions, touches no file PR #112/#113 edited, zero `dream.config.json`/
gate/threshold touch). For the human:

1. **The ~60-open/2-merged-ever backlog is a human decision**, already
   tracked in detail by issues #84/#90/#104 and quantified by issue #88
   (36/40 PRs were conflict-free and automerge-eligible 17 days ago, with
   zero `automerge-safe` labels applied since) — not re-litigated here, but
   now 17 days staler than #88's own measurement.
2. **Consider also wiring PR #113's `suspicious-misconfigured`
   verdict/`classifyEntrypointResultStrict`** into the same output layer
   this candidate adds — a natural second step, deliberately not bundled
   here to keep this PR to one conceptual change and zero file-overlap with
   #112/#113.
3. **PR #111's `classifySandboxDiagnosticity` itself should still be
   merged independently of this PR** — tonight's `darwin-sandbox.ts`
   reproduces its content as a necessary dependency (baseline has no such
   file), not as a replacement; merging #111 first and rebasing this PR
   onto it would be the cleaner eventual history, but is not required for
   this PR to stand on its own evaluated merits against `main` today.

This session does not merge, self-approve, apply any auto-merge label, or
self-promote. Human review requested.
