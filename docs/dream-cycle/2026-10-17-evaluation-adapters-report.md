# Dream Cycle 2026-10-17 — evaluation-adapters SOTA report

`DATE=2026-10-17` `DAYINT=20261017` `SLOT=2` → `DEEP=evaluation-adapters`,
`SCAN=flywheel,darwin`. No bonus deep dive (`20261017 % 25 = 17`, `% 75 = 17`).
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.

## TL;DR

`@metaharness/darwin`'s evolutionary evaluator is **non-idempotent even when
invoked correctly** (`evolve <repo> --sandbox mock|real`, `<repo>` arg
included, as PR #18/#20 already propose fixing): the *first* invocation in a
working directory succeeds and writes `.metaharness/runs/g1_v0.json`; every
*subsequent* invocation in the same directory — regardless of `--seed` —
fails with `Error: darwin: autonomous or generated child id already exists:
g1_v0`, exit 1. Prior nights (#17, #34) only reproduced a collision via the
*misconfigured* command (`--sandbox` consumed as the `<repo>` arg). Tonight
confirms the collision is structural to `@metaharness/darwin` itself, not an
artifact of the config bug — so fixing `dream.config.json`'s missing `<repo>`
arg (PR #18/#20) does **not** make the darwin entrypoint safe to invoke twice
in one session (e.g. a STEP 0.5 control-plane probe followed by a STEP 12
Bounded Darwin evaluation) or reused across nights in a persistent workspace.

**Candidate shipped tonight**: `classifyEntrypointResult` (this repo's own
ADR-0002 classifier) now recognizes this exact failure signature and reports
it as `blocked` + a new `staleState: true` field with an actionable reason
("leftover state from a prior run... clean `.metaharness/`... retry before
concluding the entrypoint itself is down"), instead of an undifferentiated
`blocked`. `npm test` 106→108 (+2, 0 removed/modified), live-verified against
the real `npx @metaharness/darwin` package (not simulated).

**What's new vs. prior nights**: #17 (2026-09-12) found the missing `<repo>`
arg; #34 (2026-09-22) disclosed non-idempotence as a caveat of the *same*
misconfigured invocation; #44/#45 (2026-09-27) extracted a shared exit-code
helper; #60 (10-07) and #70 (10-12) reconfirmed the same findings a 5th and
6th time with no new candidate. Tonight is the first night to (a) prove the
non-idempotence survives the *correct* invocation and is seed-independent,
and (b) ship a small, additive classifier fix for it rather than a 7th
reconfirmation.

## Ledger Check

`docs/dream-cycle/LEDGER.md` on `main` still ends at row 9 (2026-09-08) — 40
days of nightly runs have produced zero merged ledger rows, because every
PR that carries one (including the one this session opens) stays open.
`ledger verify` still reports the same 9 structural errors in rows 2-6 first
found 2026-09-08 (a fix exists, unmerged, PR #33 — not touched tonight).
`ledger signals` against that stale file reports `zeroMergeStreak: true`,
`duplicateDirections: []` — the `[]` is itself informative: the signal can
only see the 9 rows actually on `main`, so it cannot detect the real,
far-larger duplication visible on GitHub (see below). This matches issue
#42's and #78's prior finding that STEP 1.1 signals are blind to the
unmerged backlog; not re-litigated further tonight since #78 (2026-10-16)
already shipped real tooling (`conflictRisks()`) against this exact gap.

Real GitHub state checked fresh tonight (`list_issues`, `list_pull_requests`,
`pull_request_read` — not the unreliable `merged` field on the list
endpoint, which reports `false` for PRs individually confirmed `merged:
true`; ground truth came from `pull_request_read` per PR):

- **34 open issues**, **42 open draft PRs** (`dream/*` branches, #1 through
  #79).
- **Zero merges since 2026-09-08.** Only PR #7, #8, #9 ever merged to `main`
  (all same day, founding week). PR #9 was merged by the repo's human owner;
  nothing since.
- Every PR checked tonight (#79, #76, #71, #65, #63, #58, #45, #24, #18) is
  still `state: open`, `draft: true`, `merged: false`.
- `evaluation-adapters` nights specifically: #17 (fix exists), #34 (caveat),
  #44/#45 (helper), #53/#61/#71 ("reconfirmed, no new candidate" ×3), #70
  ("6th reconfirmation... backlog saturated"). Tonight is the 7th
  `evaluation-adapters` night and the first since #44/#45 to ship new,
  non-duplicate code.

This session does not attempt to resolve the backlog itself (not a code
change) — see Recommendation.

## Deep Dive: evaluation-adapters (SCAN: darwin, flywheel)

### darwin — live-reproduced tonight, three invocations

```
$ rm -rf .metaharness
$ npx @metaharness/darwin evolve . --sandbox mock   # run A: fresh state
Darwin Mode — leaderboard
  0.875  g2_v5  [contextBuilder]  safety=1.00  pass=0.80 ◀ winner
  ...
Winner: g2_v5
Artifacts: /home/user/agentics-dream-machine/.metaharness
EXIT=0

$ npx @metaharness/darwin evolve . --sandbox mock   # run B: same cwd, no cleanup
Error: darwin: autonomous or generated child id already exists: g1_v0
EXIT=1

$ npx @metaharness/darwin evolve . --sandbox mock --seed 2   # run C: different seed
Error: darwin: autonomous or generated child id already exists: g1_v0
EXIT=1
```

`--seed` does not change the id-collision outcome — the failure is a
property of the persisted `.metaharness/runs/g1_v0.json`, not of the RNG
stream. Also reconfirmed tonight (separately): `dream.config.json`'s
*actual configured* command — `npx @metaharness/darwin evolve --sandbox
real` (no `<repo>` arg) — still misparses `--sandbox` itself as the `<repo>`
positional, writing state to a literal `./--sandbox/.metaharness/` directory
in the repo root rather than `./.metaharness/` (issue #17's finding,
unfixed on `main`, fix sitting unmerged in PR #18/#20). First invocation of
*that* broken form also "succeeds" (exit 0, prints the `--sandbox real`
sandbox-mode warning to stderr) and is correctly classified `live` by this
repo's own `classifyEntrypointResult` — masking that nothing useful ran.
Second invocation of the *same* broken command then hits the identical
`g1_v0` collision. Both the misconfigured and the corrected invocation
converge on the same underlying defect.

### flywheel — reconfirmed unchanged

```
$ npx -y @metaharness/flywheel
npm error could not determine executable to run
EXIT=1
```

Unchanged since 2026-08-13 (the first-ever dream-cycle night here): the
package ships no `bin` field, so `npx` cannot resolve an executable. This is
an external-package deficiency (`ruvnet/metaharness`'s flywheel release, not
this repo) with no local fix available — `classifyEntrypointResult` already
correctly classifies it `blocked` with the real npm error text. No new
finding tonight; re-verified live rather than assumed from a prior report.

## Hypothesis (frozen before implementation)

> Given the real `npx @metaharness/darwin` package installed fresh tonight,
> when `evolve . --sandbox mock` (a correct invocation, `<repo>` arg
> included) is run twice in the same working directory — with a different
> `--seed` on the second run — the second invocation will fail with the same
> `child id already exists` error already seen (2026-09-22, issue #34) only
> via the broken `--sandbox`-as-repo invocation; then a small, pure,
> additive extension to this repo's own `classifyEntrypointResult`
> (`packages/cli/src/entrypoint.ts`) should classify that specific failure
> signature as `blocked` with a new `staleState: true` flag and an
> actionable remediation reason, distinguishable from a generic entrypoint
> failure — subject to: no pre-existing test weakened, removed, or modified;
> the existing `EntrypointVerdict`/`EntrypointCheck` contract stays
> backward-compatible (only an optional field added); `npm test` stays green
> with only additive new tests; zero new I/O, network, or dependency surface.

Not modified after evaluation began.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), fresh `npm ci && npm run build` at
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`. `LLM_EVAL=blocked`
— no `OPENROUTER_API_KEY` in this environment; zero model calls, by design.

| | Baseline (`2fba255`) | Candidate |
|---|---|---|
| Tests | 106/106 | **108/108** (+2 new, 0 removed/modified) |
| Lint (`eslint` on changed files) | clean | clean |
| Build (`tsc` ×6 workspaces) | clean | clean |
| `npm audit` | 21 advisories (2 low/3 moderate/13 high/3 critical), 100% devDependency-scoped | unchanged (candidate touches no dependency) |

Live receipt (not simulated) against the real `@metaharness/darwin` package,
captured above under "Deep Dive." The candidate's new test fixture uses the
*exact* stderr text captured from tonight's real run B, not a paraphrase.
Re-ran the real CLI end-to-end after rebuilding:

```
$ npx @metaharness/darwin evolve . --sandbox mock >/dev/null 2>&1   # prime stale state
$ node packages/cli/dist/bin.js verify-entrypoint darwin \
    --cmd "npx @metaharness/darwin evolve . --sandbox mock"
darwin: blocked (exit 1) — Error: darwin: autonomous or generated child id already
exists: g1_v0
    at evolve (...)
    at async main (...) — this is leftover state from a prior run in this same
working directory, not a genuine entrypoint failure; clean the tool's local state
directory (e.g. `.metaharness/`) or run in a fresh working directory, then retry
before concluding the entrypoint itself is down.
CLI_EXIT=1
```

`.metaharness/` and the stray `--sandbox/` directory were removed after
testing; neither is committed (both already covered by nothing in
`.gitignore` tracking them because neither existed before tonight's
reproduction — confirmed `git status --short` clean of them post-cleanup).

## Darwin Results (bounded evolution, STEP 12-13)

`DARWIN=not-applicable`. Tonight's candidate is a small, deterministic, pure
addition to a classifier (one new branch + one regex) — there is no
meaningful population of mutations to evolve for a change this shape, same
precedent as #78 (2026-10-16).

## Evidence

- **OBSERVATION**: `npx @metaharness/darwin evolve . --sandbox mock` run
  twice in the same cwd — first exit 0, second exit 1, identical error both
  with and without `--seed 2`.
- **MEASUREMENT**: `npm test` 106/106 → 108/108 (vitest, full suite, 0
  skipped/removed).
- **INFERENCE**: the collision is caused by `.metaharness/runs/g1_v0.json`
  persisting from the first run and darwin never generating a fresh child id
  or detecting/reusing an existing one; `--seed` does not influence id
  generation for the first child.
- **DECISION**: ship the classifier extension; do not attempt to patch
  `@metaharness/darwin` itself (wrong repo/scope, same precedent as
  ADR-0002 §4) or to change `dream.config.json`'s darwin command (PR
  #18/#20's territory — unmerged, would create a conflicting diff on the
  same line for no benefit, since this candidate touches a different file).
- **REJECTION**: considered wrapping the configured darwin command in
  `rm -rf .metaharness &&` inside `dream.config.json` itself. Rejected
  tonight: (a) it would collide with PR #18/#20's own pending edit to the
  same config key, worsening the exact "backlog PRs now conflict with each
  other" problem #78 measured yesterday; (b) it treats the symptom (stale
  dir) rather than making the *diagnosis* durable across any future
  entrypoint, not just darwin's specific message text.

## Reward-Hack Check

Self-critique first, then an **independent critic subagent** (separate
context, given only the diff + repo, no prior exposure to this report's
reasoning), asked to review adversarially, re-run the suite independently,
and check for test-weakening, scope creep into eval/CI, and classifier
over-reach.

**Verdict: CLEAR**, one non-blocking design concern. The critic confirmed:
no pre-existing test weakened, removed, or altered (`entrypoint.test.ts`
diff is pure addition — two new `it()` blocks appended, nothing else
touched); the `staleState` branch is structurally unreachable when
`r.code === 0` (nested inside the existing `if (r.code !== 0)` block) and
`staleState` is `undefined` on every non-matching `blocked` case (verified
against the existing "unrelated blocked verdict" test); independently
re-ran `npm run build && npm test` cold and confirmed 108/108, 0 failures;
confirmed the diff touches no evaluation gate, benchmark threshold,
gold-answer file, or CI config (only `packages/cli/src/entrypoint.ts`,
its test, this report, and one `LEDGER.md` row).

**The one flagged concern** (design limitation, not a defect): the
`STALE_STATE_PATTERN` regex is a pure substring match on stderr text with
no corroborating signal (it does not inspect `.metaharness/` state or
confirm a prior run actually occurred) — so it cannot distinguish "benign
rerun collision" from a hypothetical future darwin bug that emits the
*identical* string for a genuinely different root cause (e.g. a hashing
bug or a race condition inside darwin itself). The critic's recommendation,
recorded here rather than acted on tonight (it does not block merging and
no such alternate-cause failure has ever been observed): this
classification is heuristic, and an automated pipeline should not use
`staleState: true` as the sole, unattended basis for dismissing a `blocked`
verdict without a human or secondary check. A false negative (missing a
real collision) still falls back to the pre-existing generic `blocked`
behavior, never silently to `live`, so the asymmetric failure mode remains
safe. No cache, undocumented shortcut, or evaluator-internal mutation
involved — the candidate is a pure function over an `ExecResult` already
produced by a real process.

## Security Review

Zero new I/O, network, exec, or credential surface — `classifyEntrypointResult`
remains a pure function (`ExecResult` in, `EntrypointCheck` out). No
dependency added or version bumped. Reconfirmed, not part of this candidate:
CodeQL `analyze` remains red on `main` for the same repo-settings reason as
issue #10 (40+ days open, admin-only — see Recommendation); `npm audit`
unchanged at 21 advisories, 100% devDependency-scoped (security-adversarial's
territory, PR #73 already proposes a fix, unmerged, not duplicated here).

## Scan Findings

**darwin** — see Deep Dive above: non-idempotence confirmed structural
(survives a correct invocation, seed-independent); classifier fix shipped.

**flywheel** — reconfirmed unchanged (`npm error could not determine
executable to run`); no local fix available; no new finding.

## Competitors

| Project | Grade | Relevance |
|---|---|---|
| Darwin Gödel Machine (arXiv:2505.22954v3, UBC/Vector Institute/Sakana AI, ICLR 2026) | A (peer-reviewed-track preprint, official) | Direct conceptual neighbor of `@metaharness/darwin`'s "archive + self-modification + downstream eval" design; the public paper does not document its own archive's idempotency or run-id collision behavior under repeat invocation — the same blind spot tonight's finding closes locally, confirming this is an industry-wide under-specified corner, not a quirk unique to this one package. |
| "Don't Blame the Large Language Model: How Agent Harness Evolution Shapes Coding Agent Quality" (arXiv:2607.03691, 2026 preprint) | B (preprint, cross-checked only against its own abstract/summary, not independently reproduced) | Argues benchmarks rarely control for agent-harness version, making it hard to attribute a result to the model vs. the harness — directly supports pinning *and* diagnosing harness-level failure modes (like tonight's) separately from model/benchmark signal. |
| AgentForge (2026 preprint, name as reported by search tooling) | C (single-source, unrefereed, one sample per agent reported) | Claims a network-isolated sandbox per evaluation attempt that only propagates results after success — the sandboxing pattern that would have prevented tonight's `.metaharness/` state leak by construction (fresh sandbox per run). Cited as design inspiration only, not as evidence of anything about this repo. |
| SWE-agent / SWE-bench lineage | B (widely cited, established executable-repair benchmark; no source found specifically on run-ID idempotency handling) | Named per this repo's own `dream.config.json` competitor list; no new claim made about it tonight beyond noting the gap in available sources. |
| OpenHands, DSPy/GEPA, AutoGPT lineage | — (no new claim tonight) | Named per `dream.config.json`; not independently re-researched tonight — no bearing on a darwin-entrypoint-state finding. |

## Gist

No `gh gist create`-equivalent tool available to this session (same
constraint as most recent nights — no gist-creation tool in this session's
toolset). `GIST=LOCAL` — committed as this file,
`docs/dream-cycle/2026-10-17-evaluation-adapters-report.md`.

## Witness

Per precedent (issue #29, 2026-09-19): a report never embeds its own
`report_sha256`/`witness` triple inline, since self-reference makes the
published hash unreproducible against the committed file. `dream-machine
witness stamp` is run once this file reaches its final committed content,
and the resulting triple is published externally only — in this PR's
description and in the `LEDGER.md` row — never pasted back into this
section.

Verify (reproducible by anyone against the committed file and the published
triple):

```bash
git show <this-commit>:docs/dream-cycle/2026-10-17-evaluation-adapters-report.md | sha256sum
# REPORT_HASH = the value above
SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in this PR's description and the LEDGER.md row
```

## Recommendation

`evaluated: accepted` for tonight's candidate (small, additive, 108/108,
live-verified). In priority order, unchanged in substance from every
`evaluation-adapters`/`ledger-signals`/`security-adversarial` night since
2026-09-16 (PR #24) because none of it has been acted on in 40+ days and the
cost of waiting is compounding (PR #78 proved real PRs now conflict with
each other on `main`'s stale base):

1. **Enable GitHub Advanced Security / Code scanning** in repo Settings →
   Code security and analysis (issue #10, admin-only, 40 days open, every
   recorded CodeQL run on `main` has failed since the workflow was added).
   No PR from any future dream-cycle session can fix this — it is a
   one-click account setting.
2. **Triage the 42 open draft PRs.** Zero have merged or closed since PR #9
   (2026-09-08). Suggested starting order, carried from #78: #12 → #16 →
   #58 (these three provably conflict with each other; land one, rebase the
   rest), then #33 (ledger contamination fix), then #18/#20 (darwin `<repo>`
   arg — tonight's candidate is independent of and compatible with this
   one), then the remainder by inspection.
3. **Decide what to do about the 7× `evaluation-adapters` reconfirmation
   pattern itself.** This repo's own STEP 1.1 rule ("repeated ≥3 nights →
   rotate") has been triggered for this surface since at least #60
   (2026-10-07) and no night, including this one, has overridden the
   deterministic `DAYINT % 5` slot assignment to actually rotate away from
   it — because the natural 5-night rotation already revisits every surface
   regularly regardless, and literally switching `DEEP` mid-cycle would just
   pre-empt tomorrow's slot one night early. If the real intent was
   something else, that is worth the human owner's judgment call, not a
   fourth consecutive agent guessing silently.
4. **Review and merge tonight's PR.** Small, additive (`packages/cli/src`
   only, +2 tests), conflicts with none of #18/#20/#33/#12/#16/#58 (touches
   `entrypoint.ts`/`entrypoint.test.ts`, a different file from all of them).

This session does not merge, self-approve, or self-promote. Human review
requested.
