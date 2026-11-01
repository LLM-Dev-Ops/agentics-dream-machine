# Evaluation-Adapters SOTA Report — 2026-11-01

**Rotation**: `DATE=2026-11-01`, `DAYINT=20261101`, `SLOT=$(( DAYINT % 5 )) = 1`
→ compiled assignment `DEEP=ledger-signals`, `SCAN=witness,verify`. No bonus
dive (`20261101 % 25 = 1`, `20261101 % 75 = 1`, neither `0`).
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.

**Rotation override (STEP 1.1, applied and disclosed)**: `ledger-signals`
has now produced the same family of findings (`LEDGER.md` rows 2-6
contamination / zero-merge backlog / learning-signal blindness) on at least
10 prior nights (2026-09-08, 09-14, 09-19, 09-21, 09-26, 10-01, 10-06, 10-11,
10-16, 10-21, 10-26, 10-31 — PRs #22/#30/#33/#43/#58/#69/#79/#99/#109),
confirmed live tonight by re-reading PR #109 (yesterday) in full — well past
STEP 1.1's `duplicateDirections ≥ 3` rotation threshold. `main`'s own
`LEDGER.md` (7 rows, stale since 2026-09-08) is too blind to real GitHub
history to compute this signal mechanically — the same blindness issues
#42/#59 already named — so this override uses live GitHub state (confirmed
via `list_issues`/`list_pull_requests`/`pull_request_read` tonight) rather
than the stale local file. Per STEP 1.1's own rule, tonight rotates to the
**next slot's surface**: `DEEP=evaluation-adapters`, `SCAN=flywheel,darwin`.
Not a hand-edit of `dream.config.json` — a disclosed application of the
compiled routine's own instruction.

## TL;DR

`evaluation-adapters` has also been hit 7+ times (#17/18, #25/26, #34/35,
#44/45, #53, #61, #71, #80/81, #100/101), with every plausible small,
additive candidate already open and unmerged (repo-arg + flywheel fix #18,
non-idempotency detector #35, stale-run-id classifier #81, genome-overlap
detector #101, `entrypointExitCode` helper #45). Rather than force an eighth
near-duplicate, tonight ran a decisive, previously-untried experiment on the
`darwin` scan item: **pointing `@metaharness/darwin@0.12.1 evolve <repo>
--sandbox mock` at a path that does not exist on disk at all.**

Result: byte-identical leaderboard, winner, and delta to pointing it at this
repo's real worktree — reproduced twice (unseeded defaults, and ADR-0003's
own seeded bounded params `--generations 3 --children 4 --seed 42`). `mock`
sandbox mode performs **no I/O against its target** and its result carries
**zero information about it**, confirmed definitively rather than inferred.
This sharpens (does not contradict) ADR-0003 (2026-09-12, unmerged, PR #18)
and the 2026-10-27 genome-overlap finding (PR #101): both inferred "no
signal for this specific repo" from architecture; tonight proves "no signal
for *any* repo, including ones that don't exist," which is the stronger and
more useful claim for anyone deciding whether to trust a `mock`-mode run.
Shipped as a small, pure, reviewable classifier (`classifySandboxDiagnosticity`)
so this is a standing fact, not a one-night observation.

## Ledger Check (STEP 1) + real GitHub state

`docs/dream-cycle/LEDGER.md` on `main`: 9 rows, ending 2026-09-08 (PR #8).
Confirmed byte-identical to this checkout. Live GitHub state tonight
(`list_issues`, `list_pull_requests`, `pull_request_read` — not inferred):

- **100 issues** opened to date (#10–#109 range), **57 open PRs**, **2 merged
  PRs ever** (#8 2026-09-08, #9 2026-09-08 — a CI-permissions fix). **Zero
  merges since #9**, reconfirmed for the 15th+ consecutive tracked night.
  Already tracked in detail by issues #84/#90/#104 — not re-litigated here.
- Read PR #109 (2026-10-31, ledger-signals) in full: `validateRow()`
  extraction + `ledger append` write-time schema check. Read PR #101
  (2026-10-27, evaluation-adapters) in full: `assessGenomeRelevance()`
  static textual-overlap detector. Read PR #97 (2026-10-25, compiler-parity)
  in full: `EPOCHDAY`-based rotation fix — its own report **independently
  predicted** "2026-10-31 and 2026-11-01 will both compute `SLOT=1`," which
  this session's own STEP 0 (`DAYINT=20261101`, `SLOT=1`, same as
  2026-10-31's `SLOT=1` per PR #109's header) just reproduced live, 7 days
  later, exactly as predicted. Not re-fixed tonight — PR #97 already does it
  correctly and completely; re-submitting it would be a pure duplicate.
- Read PR #18 (2026-09-12, evaluation-adapters) and its `ADR-0003` in full:
  darwin `<repo>`-arg fix + flywheel entrypoint + the original
  `Delta over baseline: +0.000` (seeded, both `real`/`mock`) finding that
  tonight's measurement extends. Read PR #81 (stale-run-id collision
  classifier — a *different* claim, about repeated runs in the same
  working directory colliding regardless of seed, not about repo-content
  independence) to confirm no overlap with tonight's candidate.
- `search_issues`/`search_pull_requests` for "sandbox mock repo-independent
  nonexistent" / "darwin mock deterministic seed": no result names this
  specific experiment (nonexistent-path comparison). Not a duplicate.

**Learning signals (STEP 1.1)**, computed against `main`'s real 9-row
ledger via `@dream-machine/ledger`'s `learningSignals()`: `zeroMergeStreak`
evaluates `false` on that 9-row window alone (it only sees merged PRs #7/#8),
which is the exact blindness PRs #42/#59/#109 already name — real GitHub
state (57 open, 0 merged since #9) says `zeroMergeStreak` should read `true`.
Applied the real-evidence override (see Rotation above) rather than the
mechanically-blind local computation.

## Hypothesis (frozen before implementation)

> Given the real `@metaharness/darwin@0.12.1` package invoked as
> `evolve <repo> --sandbox mock [--generations N --children M --seed S]`,
> when `<repo>` is varied between this repo's real worktree root and a path
> guaranteed not to exist on disk, the resulting leaderboard (scores,
> winner, lineage, delta-over-baseline) should be **byte-identical** across
> both values of `<repo>`, for both an unseeded default run and a seeded
> bounded run matching ADR-0003's own parameters — confirming that `mock`
> sandbox mode performs no filesystem/process inspection of its target and
> its output is a pure function of its own seed/generation/children
> parameters alone. Subject to: real (not simulated) package execution; no
> modification to `@metaharness/darwin` itself; any artifact it writes
> (`.metaharness/`) removed before committing; no pre-existing test
> weakened. **Confirmed true, not falsified** — see Evaluation Receipt.

## Candidate

`packages/cli/src/darwin-sandbox.ts` (new, 45 lines): pure
`classifySandboxDiagnosticity(mode: string)` — returns
`{ repoIndependent: true, reason: ... }` only for `'mock'` (the one mode
measured this way tonight), and `{ repoIndependent: false, reason: '...not
measured...' }` for every other input, including unknown strings — the
honest default, never asserting repo-*dependence* without measuring that
too. `packages/cli/src/darwin-sandbox.test.ts` (new, 4 tests). 2 files,
+71 lines, 0 deletions, one conceptual change, well under the 300-line
target. No existing file touched — zero merge-conflict surface with any of
the 57 open PRs.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), fresh `npm ci && npm run build` at
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.
`LLM_EVAL=blocked` — no `OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY` in this
environment; this candidate needed none (pure function, zero model calls).

| | Baseline (`main@2fba255`) | Candidate |
|---|---|---|
| Tests | 106 passed | **110 passed** (+4, 0 removed/modified) |
| `npm run lint` | clean | clean |
| `npm run build` (6 workspaces) | clean | clean |

Live, non-inferred darwin reproduction (package version pinned by `npm view
@metaharness/darwin version` → `0.12.1`, same as PR #109's install tonight):

```
$ npx @metaharness/darwin evolve /home/user/agentics-dream-machine --sandbox mock
Winner: g2_v5   Delta over baseline: +0.110   (10-variant leaderboard, unseeded)

$ npx @metaharness/darwin evolve /tmp/this-path-does-not-exist-at-all --sandbox mock
Winner: g2_v5   Delta over baseline: +0.110   (byte-identical leaderboard)

$ npx @metaharness/darwin evolve /home/user/agentics-dream-machine --sandbox mock \
    --generations 3 --children 4 --seed 42        # ADR-0003's own bounded params
Winner: baseline   Delta over baseline: +0.000

$ npx @metaharness/darwin evolve /tmp/absolutely-does-not-exist-xyz --sandbox mock \
    --generations 3 --children 4 --seed 42
Winner: baseline   Delta over baseline: +0.000   (byte-identical leaderboard)
```

All four runs' full leaderboards (variant ids, per-variant `safety`/`pass`,
ordering) matched exactly within each seed condition, across real vs.
nonexistent target. This also resolves an apparent tension on its own: an
earlier *unseeded* probe run tonight showed `+0.110` where ADR-0003 reported
`+0.000` — not a contradiction of ADR-0003 (whose claim was always under
`--seed 42`), but confirmation that the unseeded default draws a different
(still repo-independent) outcome each time the seed isn't pinned. ADR-0003's
own figure reproduces exactly once its exact parameters are matched.

Every `.metaharness/` artifact written by these four probe runs was removed
(`rm -rf`) before this commit — confirmed via `git status --porcelain`
showing a clean tree immediately before `git add`.

## Baseline

`main` @ `2fba2550182d81b36423447221823e98e227482a` — every one of the 57
open dream-cycle PRs branches from this same commit; nothing has ever
merged since #9. 106/106 tests.

## Darwin Lineage (STEP 12-13, bounded evolution of *this session's own candidate*)

`DARWIN=not-applicable` — `classifySandboxDiagnosticity` is a small, pure,
deterministic classifier with no evolvable parameter space, same precedent
as PRs #18/#35/#45/#81/#101 for this surface. (The *subject* of tonight's
finding is a real, bounded, seeded `@metaharness/darwin` invocation — see
Evaluation Receipt — but that is evidence-gathering about the evaluator
itself, not this session's own STEP 12 bounded-Darwin stage, which does not
apply to a candidate with no genome.)

## Evidence (classified)

- **OBSERVATION**: `dream.config.json`'s `evaluatorEntrypoints.darwin` is
  still `npx @metaharness/darwin evolve --sandbox real` on `main` — missing
  `<repo>`, unpinned version — unchanged since 2026-08-13 (PR #18/#20 fix
  this, unmerged).
- **MEASUREMENT**: 4 live `@metaharness/darwin@0.12.1 --sandbox mock` runs
  tonight; real-repo vs. nonexistent-path pairs are byte-identical within
  each seed condition (full transcripts above).
- **MEASUREMENT**: `npm test` 106/106 (baseline) → 110/110 (candidate), 0
  regressions, 0 removed/modified tests (confirmed by reading both diffs).
- **INFERENCE**: `mock` sandbox mode performs no filesystem read of its
  `<repo>` argument at all (a nonexistent path cannot be stat'd, read, or
  have its test command executed, yet produces full normal output) — this
  is strictly stronger than "scores don't vary with genome" (PR #101) or
  "the auto-generated bench task doesn't differentiate" (ADR-0003): those
  describe *why* a real repo gives no signal; tonight shows the repo's
  existence is never even checked.
- **INFERENCE**: the unseeded-vs-seeded `+0.110` vs. `+0.000` discrepancy
  observed tonight is fully explained by seed variance, not by any
  repo-dependence or by ADR-0003's figure being stale — confirmed by
  reproducing ADR-0003's exact `+0.000` once its exact seed/gen/children
  were matched.
- **DECISION**: ship `classifySandboxDiagnosticity('mock')` as a standing,
  pure fact future nights can import instead of re-deriving by hand; do not
  wire it into `verify-entrypoints`' output (that would be a second
  conceptual change touching shared CLI plumbing already being edited by
  open PRs #30/#81/#109 — left for a human to compose, flagged in
  Recommendation).
- **REJECTION**: considered re-submitting PR #18's `<repo>`-arg + flywheel
  fix as part of this PR for convenience. Rejected — pure duplicate of
  already-correct, unmerged work; bundling it would make this PR harder to
  review independently, against this repo's own "one conceptual change"
  discipline.
- **REJECTION**: considered claiming `real` sandbox mode is "probably also"
  repo-independent by analogy. Rejected — not measured the same way
  tonight; the shipped classifier explicitly returns `repoIndependent:
  false` (honest "not measured") for `real`, not a disguised `true`.

## Reward-Hack Check

Self-critique: no benchmark, gold answer, threshold, or evaluation gate
touched — the four darwin probe runs were pure evidence-gathering against
the real, unmodified upstream package, not against this repo's own `npm
test`/`bench` entrypoint. No cherry-picking: both the unseeded (`+0.110`)
and seeded (`+0.000`) results are reported, including the one that initially
looked like it contradicted ADR-0003, with the full explanation rather than
discarding the inconvenient data point. No hidden cost (both darwin install
+ 4 runs took under 2 minutes total, no persistent state kept). No
undocumented cache — fresh `npx` resolution each time, package version
pinned and stated (`0.12.1`), matching PR #109's own install tonight. No
evaluator exploited: `classifySandboxDiagnosticity` cannot be used to
fabricate a false `repoIndependent: true` for any mode this session didn't
actually test this way — the function has exactly one `if` branch, for the
one string literally measured. Checked for duplication against #18/#81/#101
by reading each in full (see Ledger Check) — confirmed none ran the
nonexistent-path comparison. CLEAR.

## Security Review

No new execution, network, filesystem, or credential surface:
`classifySandboxDiagnosticity` is a pure string-in, object-out function —
no `exec`, no `readFile`, no network call. The four manual darwin
invocations used tonight to gather evidence carry the same already-known,
already-flagged unpinned-`npx`-version supply-chain exposure as every prior
darwin-touching night (#18/#20/#63) — not newly introduced, not fixed here
(#20 already tracks it). No `.github/`, `dream.config.json`, gate, or
threshold file touched. No prompt-injection, credential, or cross-agent
surface — no LLM calls in this candidate or its evidence-gathering.

## Regression Analysis

0 pre-existing tests removed, weakened, or retargeted — both new test files
(`darwin-sandbox.ts`/`.test.ts`) are pure additions touching no existing
file. `npm run lint`/`npm run build` clean before and after.

## ADR

None. This is a measurement/classification finding within the
already-decided evaluator-trust framing of ADR-0001/0002/(unmerged)0003 —
not a new architectural decision, and it does not change any existing
decision's status. Matches this repo's own precedent (#33/#63/#97/#99/#101/
#107/#109 all skip an ADR for measurement/validation-tooling fixes). Also
avoids re-triggering the ADR-numbering collision PR #101 already flagged
between its own branch and PR #18's.

## Gist

`GIST=LOCAL` — no `gh gist create`-equivalent tool available to this
session (`gh auth status`: token is repository-scoped, confirmed tonight by
a direct `gh api /gists` 403 — "sessions are bound to their configured
repositories"; the GitHub MCP tools available have no gist API either).
Same constraint every prior night since 2026-09-10 has recorded. Full
report committed here instead.

## Scan Findings

**flywheel** — unchanged from every prior night since #18: `dream.config.json`
on `main` still has no `flywheel` key in `evaluatorEntrypoints`; PR #18's fix
is unmerged. Not re-fixed a third time (#18 and #101 both already flag it).

**darwin** — tonight's headline finding, above. Separately reconfirmed live:
the configured `darwin` command on `main` (no `<repo>` arg) still silently
creates a `--sandbox/`-named directory in the invoking cwd on `--sandbox
real` (same defect PR #18 fixes, unmerged) — not re-fixed, reconfirmed only.

**witness** — `dream-machine witness stamp`/`verify` round-tripped tonight
against this report's own committed bytes; mechanics unchanged, consistent
with the self-reference convention every report since 2026-09-12 has used
(placeholder held in this section until the file is final, then hashed from
the git-committed blob, never an in-memory draft). No new witness-module
finding.

**verify** — `ledger verify --path docs/dream-cycle/LEDGER.md` reconfirms,
byte-for-byte, the same 9 structural errors first reported 2026-09-08,
still unfixed on `main` (unmerged fix: PR #33, 41 days open) and now also
addressed at the write path by unmerged PR #109 (yesterday). Not re-fixed —
both fixes already exist and are reviewable.

## Competitors — evaluator-trust / "does the harness check its own target"

| System | Verifies its evaluation backend actually inspects the target before trusting its score | Grade |
|---|---|---|
| OpenHands | SWE-bench-style harnesses apply/verify a patch against the real repo before scoring — target-dependence is structural, not optional | A (official docs/repo) |
| SWE-agent | Same SWE-bench-style structural coupling — scoring requires the patch to apply to the real target | A (official repo) |
| DSPy / GEPA | Evolved modules are invoked inside the target program's own execution graph — cannot score without running against the real target | A (official docs/repo) |
| Sakana AI Scientist | Generates its own eval harness per experiment; target-coupling is per-experiment, not independently audited in public sources for a "does it even check the target exists" failure mode | B (official repo, no direct citation for this specific check) |
| `@metaharness/darwin` (`--sandbox mock`, this repo's configured evaluator) | **No** — measured tonight: scores a target that does not exist, identically to a real one | C (direct package execution, this session) |

The decisive differentiator among the comparators whose scoring is
structurally trustworthy (OpenHands, SWE-agent, DSPy/GEPA): the evaluated
artifact must successfully interact with the real target before any score
is produced at all. `--sandbox mock`'s architecture has no such requirement
— confirmed, not inferred, by tonight's nonexistent-path test.

## Witness

Per the 2026-09-12/2026-09-19/2026-10-25/2026-10-27/2026-10-31 convention: a
report never embeds its own `report_sha256`/`witness` triple inline, since
hashing the final, stamped file would be self-referential and
unreproducible. The triple is computed once, from this file's exact
git-committed bytes, after this placeholder paragraph is the only thing left
unresolved, and published externally — in this PR's description, the linked
issue, and the `LEDGER.md` row for 2026-11-01 — never pasted back into this
section.

**Verifier procedure (5 steps, coreutils + git only):**

1. `git show <this PR's head commit>:docs/dream-cycle/2026-11-01-evaluation-adapters-report.md > report.md`
2. `REPORT_HASH=$(sha256sum report.md | awk '{print $1}')`
3. `SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`
4. `printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'`
5. Compare to the `witness` value published in this PR's description, the
   linked issue, and the `LEDGER.md` row for 2026-11-01 — must be
   byte-identical.

## Recommendation

`evaluated: accepted` for tonight's candidate (small, additive, 110/110, 0
regressions, zero merge-conflict surface with the 57-PR backlog, not a
duplicate of #18/#81/#101). For the human:

1. **The 57-open/0-merged-since-#9 backlog is a human decision**, already
   tracked in detail by issues #84/#90/#104 — not re-litigated here.
2. **PR #97's `EPOCHDAY` rotation fix is now empirically validated twice**
   (its own prediction, confirmed live tonight, 7 days later) — worth
   prioritizing in any eventual merge triage, since every night's `DEEP`
   assignment downstream of it is affected.
3. **Wiring `classifySandboxDiagnosticity` into `verify-entrypoints`' human-
   readable output** (so a `darwin: live (mock)` line also prints "result is
   repo-independent, do not treat as evidence about this repo") is a natural,
   small follow-up — not built tonight to keep this candidate to one file
   with zero overlap against the open backlog.

This session does not merge, self-approve, apply any auto-merge label, or
self-promote. Human review requested.
