# Compiler-Parity / Config-Schema & Golden-Snapshots SOTA Report — 2026-11-15

**Rotation**: `DATE=2026-11-15`, `DAYINT=20261115`, `SLOT=$(( DAYINT % 5 )) = 0`
→ `DEEP=compiler-parity`, `SCAN=config-schema,golden-snapshots`. No bonus
moduli fire tonight (`20261115 % 25 = 15`, `% 75 = 15`).
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.

## TL;DR

Tonight's own rotation is itself a live instance of the still-unmerged
2026-10-25 finding (issue #96 / PR #97): `SLOT=$(( DAYINT % 5 ))` collapses
to day-of-month arithmetic, so every 5th day-of-month lands on
`compiler-parity`. Verified live tonight: under the already-proposed
`EPOCHDAY` fix, tonight's assignment would have been `SLOT=2`
(`evaluation-adapters`), not `compiler-parity` — a concrete, falsifiable,
real-time demonstration of the exact bug PR #97 fixed 21 days ago.

Rather than author a 5th compiler-parity source diff on ground already
well-mined (four prior nights — #87, #97, #107, #127 — each produced a
real, independently-evidenced, still-open fix; the residual candidates
those nights explicitly scored and rejected — `adrConvention.pad`
range-checking, `evaluatorEntrypoints` key restriction, `scan`-tuple-length
enforcement, duplicate-`deep` detection — remain rejected for the same
reasons they gave, not re-litigated here), tonight's candidate is an
**integration check that had never been run**: do the four independent,
non-conflicting, individually-"mergeable_state:clean" compiler-parity PRs
actually merge together as a set? Verified live: **yes** — one trivial,
expected `LEDGER.md` append-order conflict across all three merge steps,
zero conflicts anywhere in source, and the combined test suite passes
**134/134** (106 baseline + 28 new, 0 regressions), lint clean, build
clean, no golden-snapshot drift beyond what PR #97 itself already
regenerated.

## Ledger Check (STEP 1) + Learning Signals (STEP 1.1)

`docs/dream-cycle/LEDGER.md` on `main` ends at row 9 (2026-09-08) — ledger
rows 2–6 are still the pre-existing cross-repo contamination flagged every
night since 2026-09-08, still unfixed, out of scope tonight. Live GitHub
state (not the stale local ledger), measured directly tonight with
`list_pull_requests(state=open/closed, perPage=100)`, not inferred from any
prior night's report text:

- **55 open PRs** (54 draft dream-cycle PRs #12–#135 + 6 non-draft
  Dependabot PRs #1–#6), **14 closed-unmerged** dream-cycle PRs, **2 ever
  merged** (#8, #9 — both from this repo's first two real nights,
  2026-08-13 and 2026-09-08). Zero merges in the 68 days since. This
  independently reconfirms, with a fresh direct count rather than trusting
  last night's cited figure, the same zero-merge-streak every recent
  night's report documents from its own slot (most explicitly #134,
  2026-11-14, which also root-caused one mechanical reason: the
  `automerge.yml` guard requires a repo label, `automerge-safe`, that does
  not exist among this repo's 29 labels — a `developer-experience`-scope
  finding, not re-litigated here).
- **61 open issues** (#74–#134 shown on the first page alone).
- `zeroMergeStreak: true`, unchanged for months, repeated far past the
  3-night learning-signal threshold. Per STEP 1.1 this biases tonight away
  from adding a 5th small, easily-overlooked compiler-parity diff to an
  already-15-deep backlog, and toward evidence that makes the *existing*
  backlog more mergeable or better understood — which is what the
  integration check below does.

## Deep Dive — reading every prior compiler-parity PR's actual diff, not titles

Pulled live via `pull_request_read get_diff`/`get`, not inferred:

| PR | Date | Fix | `mergeable_state` (tonight) | Still unapplied on `main`? |
|---|---|---|---|---|
| #87 | 2026-10-20 | `compile`/`schedule` CLI stdout had a doubled trailing `\n` | `pending` (no CI run recorded) | Yes — confirmed by reading `main`'s current `packages/cli/src/index.ts` |
| #97 | 2026-10-25 | `SLOT`/bonus triggers keyed off `DAYINT` (`YYYYMMDD`) collapse to day-of-month arithmetic (`100 ≡ 0 mod 5/25/75`); fixed via monotonic `EPOCHDAY` | `clean` | Yes — confirmed: `main`'s `step0Context()` still defines only `DAYINT`, still divides by it |
| #107 | 2026-10-30 | `validateConfig()` silently accepted type-malformed optional fields (`autoMerge:"false"` is JS-truthy → wrong rendered merge-policy text) | `clean` | Yes — confirmed: `main`'s `config.ts` has none of these guards |
| #127 | 2026-11-10 | `bonusModuli` *values* (not just keys) unvalidated → compiled prompt could render `→ add [object Object]`/`null`/empty | `clean` | Yes — confirmed: `main`'s `bonusModuli` loop still only reads `Object.keys(...)` |

All four are self-described as "independent of and non-conflicting with"
the others in their own PR bodies. That claim had never been tested as a
set — each night verified its own diff against `main@2fba255` in isolation,
never against the other three open compiler-parity branches together.

**Residual candidates already considered and rejected by prior nights, not
re-raised tonight without new justification** (from PR #107's and #127's
own 5-candidate scoring tables): `adrConvention.pad` range-check and
`evaluatorEntrypoints`-key restriction both presuppose PR #107's own
unmerged type-guard scaffold (building them tonight on bare `main` would
mean re-deriving most of #107's diff — the exact high-duplication-risk
reason #127 gave for skipping the first of these); `scan`-tuple-length
enforcement was scored cosmetic (no broken runtime output for any array
length ≥ 1); duplicate-`deep`-name detection was scored ambiguous (could be
intentional). Re-confirmed tonight by re-reading `main`'s current
`config.ts` in full: none of PR #107's guards are present, so all four
residual candidates still carry the same duplication/ambiguity problems
their own nights identified.

## Hypothesis (frozen before implementation)

> Given the four open, independently-authored compiler-parity PRs (#87,
> #97, #107, #127), each individually reporting `mergeable_state: clean`
> against `main@2fba255` and each claiming non-conflict with the others in
> its own PR body: merging all four together, in date order, on top of
> `main@2fba255` should apply with no conflict beyond the `LEDGER.md`
> append (an expected textual collision from each PR adding its own row at
> the same file position, not a semantic conflict), and the combined test
> suite should pass with zero regressions relative to each PR's own
> independently-reported count — subject to: no test file edited to force
> a pass, the merge performed with ordinary `git merge` (no `-X ours`/
> `-X theirs`), and the resulting build/lint/test run for real rather than
> inferred.

**Tested. Confirmed true, not falsified — see Evaluation Receipt.**

## Candidate

**None shipped as a source diff tonight.** Tonight's candidate *is* the
integration check itself — a measurement, not a code change — consistent
with this surface's own precedent for a "docs/ledger only" night (#76/#77,
2026-10-15: "compiler-parity confirmed clean … no new candidate"; #124,
2026-11-08: "merge-readiness audit … docs/ledger only"). This report and
one `LEDGER.md` row are the only tracked-file changes on this branch.

## Evaluation Receipt

Real evaluator: `npm test` (vitest, this repo's own configured `bench`
entrypoint), `npm run lint`, `npm run build` — run for real against an
actual local four-way `git merge`, not inferred from reading diffs.
`LLM_EVAL=blocked` (no `OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY` in this
session's environment) — this candidate needs zero model calls by design.

Procedure (reproducible by anyone with push access to fetch the four
branches):

```bash
git fetch origin dream/2026-10-20-compiler-parity dream/2026-10-25-compiler-parity \
  dream/2026-10-30-compiler-parity dream/2026-11-10-compiler-parity
git checkout -b audit 2fba255
git merge --no-edit origin/dream/2026-10-20-compiler-parity   # fast-forward, clean
git merge --no-edit origin/dream/2026-10-25-compiler-parity   # LEDGER.md conflict only
# resolve: keep both rows, in date order; git add + commit
git merge --no-edit origin/dream/2026-10-30-compiler-parity   # LEDGER.md conflict only
# resolve the same way
git merge --no-edit origin/dream/2026-11-10-compiler-parity   # LEDGER.md conflict only
# resolve the same way; packages/compile/src/config.ts and index.test.ts
# auto-merged cleanly (non-overlapping lines) with no conflict markers at all
npm run build   # clean, all 6 packages
npm run lint    # clean
npm test --silent
```

| | Baseline (`main@2fba255`) | #87 alone | #87+#97+#107+#127 combined |
|---|---|---|---|
| Test files | 7 | 8 | 9 |
| Tests | 106 | 107 | **134** (+28, 0 removed/modified) |
| Result | 106 passed | 107 passed | **134 passed** |
| Lint | clean | — | clean |
| Build (6 packages) | clean | — | clean |
| Conflicts | — | — | 3× trivial `LEDGER.md` append-order only; 0 in any source file |

28 = 1 (#87) + 7 (#97) + 13 (#107) + 7 (#127), matching each PR's own
independently-reported delta exactly — the combined count is additive, not
short of the sum, which is itself evidence none of the four silently
clobbered another's test.

**Live, concrete demonstration that tonight's own rotation is an active
instance of PR #97's bug** (not inferred — computed tonight, independently
of the PR #97 report's text):

```
$ node -e "const e=Math.floor(Date.now()/86400000); console.log('EPOCHDAY',e,'mod5',e%5)"
EPOCHDAY 20772 mod5 2
$ node -e "console.log('DAYINT mod5', 20261115 % 5)"
DAYINT mod5 0
```

Under the current (buggy) `DAYINT`-based formula, tonight computed `SLOT=0`
→ `compiler-parity` (this report). Under PR #97's already-proposed,
already-tested, still-unmerged `EPOCHDAY` fix, tonight would have computed
`SLOT=2` → `evaluation-adapters` instead. This is the same mechanism #97
characterized in the abstract 21 days ago, now observed concretely on the
exact date it predicted would be affected.

Golden-snapshot check: `npx vitest run packages/compile` on the combined
merge passes with no `-u` update needed — the snapshot PR #97 already
regenerated for `EPOCHDAY` is the one the combined tree uses; no further
drift from stacking #107/#127 on top of it.

## Baseline

Commit `2fba2550182d81b36423447221823e98e227482a`. 106/106 tests. This is
the common ancestor of every open dream-cycle PR in the repo — nothing has
merged since #9, so every branch, including all four audited tonight,
still diffs cleanly against it individually; tonight is the first time they
were checked as a combined set.

## Darwin Results

`DARWIN=not-applicable` — `npx --no-install @metaharness/darwin --version`
confirms the package is not locally installed tonight, consistent with
every prior night back to #9. A merge-compatibility audit has no evolvable
population for bounded Darwin's generations×candidates search regardless.

## Evidence

- OBSERVATION: live `list_pull_requests` (perPage=100, both `open` and
  `closed` states): 55 open (49 dream-cycle draft + 6 Dependabot), 14
  closed-unmerged, 2 ever merged (#8, #9). 61 open issues on the first
  page.
- OBSERVATION: `pull_request_read get_diff` on #87/#97/#107/#127 confirms
  each fix is still fully live/unapplied on `main`'s actual current source
  (read directly, not assumed from the PR's own claim).
- MEASUREMENT: local four-way merge of #87→#97→#107→#127 onto
  `main@2fba255`: 3 conflicts total, all in `LEDGER.md`'s append point, 0
  in any source or test file; `packages/compile/src/config.ts` and
  `index.test.ts` (touched by multiple PRs) auto-merged with no conflict
  markers.
- MEASUREMENT: combined build clean (6/6 packages), combined lint clean,
  combined `npm test` 134/134 (106 + 28, matching the exact sum of each
  PR's own independently reported delta).
- MEASUREMENT: `EPOCHDAY % 5 = 2` vs. `DAYINT % 5 = 0` computed live
  tonight (2026-11-15) — a concrete, dated confirmation of PR #97's
  abstract 420-day-window claim, now observed on a specific real date
  rather than only projected.
- INFERENCE: because the only conflicts are a single append-only ledger
  file (textually inevitable whenever two PRs each add one row at the same
  position, not a semantic disagreement), a human reviewer merging these
  four PRs in sequence would spend at most three one-line conflict
  resolutions, not a source-level reconciliation — materially lowering the
  perceived cost of clearing this specific slice of the backlog.
- DECISION: do not re-attempt any of the four candidates prior nights
  already scored and rejected on this surface (see Deep Dive) without new
  evidence changing their scoring.
- DECISION: ship no source diff tonight — the integration check is the
  evidence; fabricating a cosmetic fifth `config.ts` edit just to have "a
  candidate" would itself be the kind of low-value, duplicative backlog
  growth STEP 1.1's zero-merge signal warns against.

## Reward-Hack Check

Self-critique (no candidate author/diff to assign an independent critic
to — tonight's "evaluator" is a local `git merge` plus this repo's own real
`npm test`/`lint`/`build`, none of which this session altered). Checked
specifically: did the merge procedure use any conflict-resolution flag that
could silently prefer one side and hide a real conflict (`-X ours`/
`-X theirs` — not used, confirmed by re-reading the exact commands run
above); were any of the 134 passing tests from a prior PR weakened or
skipped to make the combination pass (no — `git diff --stat` across the
combined merge shows only additions beyond each PR's own individual diff,
and the per-file test counts sum exactly); was the `EPOCHDAY`/`DAYINT`
computation re-derived independently tonight rather than copied from PR
#97's report text (yes — computed fresh via `node -e`, shown above, not
pasted from the PR body). **CLEAR.**

## Security Review

No new runtime attack surface: the only actions tonight were a local,
unpushed four-way `git merge` among already-reviewed candidate branches
(each previously security-reviewed in its own report) and this repo's
existing, unmodified `npm test`/`lint`/`build` commands. No `.github/` file,
lockfile, or evaluation/gate/safety path touched by tonight's own diff
(docs + one ledger row only). No LLM calls, no externally-sourced/
untrusted data consumed, no credential surface. The merge was never pushed
to any remote branch other than this session's own `dream/` branch, and
this session does not merge, self-approve, or apply any automerge label.

## Regression Analysis

0 pre-existing tests removed, weakened, or retargeted — tonight's own
tracked-file diff is docs + one ledger row only. The combined-merge
evaluation above is read-only evidence about *other* already-open PRs; it
does not alter any of their source.

## ADR

None. No architectural decision tonight — an integration/compatibility
measurement among already-decided, already-reviewed candidates, not a new
design choice.

## Scan Findings

**config-schema** — unchanged tonight; PR #107's type-guard scaffold and
PR #127's `bonusModuli`-value guard remain the two open fixes, both
reconfirmed still fully applicable to `main` and to each other (see
Evaluation Receipt — they auto-merge with zero conflict). No new
config-schema gap found tonight beyond what #107/#127 already filed, and
the residual gaps those two nights named (`evaluatorEntrypoints` key
restriction, `adrConvention.pad` range) remain correctly deferred for the
reasons given in Deep Dive.

**golden-snapshots** — the committed `metaharness` fixture snapshot is
consistent across all four merged PRs with no further drift
(`npx vitest run packages/compile` on the combined tree needs no `-u`).
The self-referential snapshot over this repo's *own* `dream.config.json`
remains PR #14's unmerged contribution (confirmed still open, not
duplicated tonight — this session checked `list_pull_requests` for #14
before considering any self-referential-snapshot candidate, specifically
because the 2026-10-25 report records that exact duplication trap).

## Competitors

| Project | Practice relevant to tonight's finding | Grade |
|---|---|---|
| OpenHands, SWE-agent (official repos/docs) | Merge authority is kept entirely outside the agent loop; neither ships a "verify N open bot-authored branches merge together as a set before recommending merge order" step — this repo's own backlog scale (55 open PRs, 2 ever merged) is large enough that the gap is self-inflicted, not a capability either competitor claims to solve | A (source), C (direct relevance — neither needs this at this backlog size) |
| Sakana AI Scientist (arXiv 2408.06292) | Documents sandboxing/reproducibility lessons for self-modifying systems; no documented cross-candidate merge-compatibility check | A (source), C (relevance) |
| DSPy/GEPA | Optimizer loop produces one promoted program per run, not parallel independent PR branches accumulating across months | B |
| AutoGPT lineage | Widely-reported cautionary pattern: agent output accumulating faster than review/merge bandwidth — exactly this repo's observed state (55 open, 2 merged, 68 days) | C |

No A-grade prior art changes tonight's recommendation; this is a
repo-internal backlog-integration measurement, not a capability gap
relative to any competitor.

## Gist

No `gh gist create`-equivalent available to this session (consistent with
every prior night's recorded constraint). `GIST=LOCAL`, committed as this
file.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so — same
documented convention as every prior night's report — the stamp cannot be
written *inside* the file it stamps. The hash below is computed on this
report's content exactly as it stood immediately before this section was
filled in.

```
session_commit: 2fba2550182d81b36423447221823e98e227482a
report_sha256 : 5d2fae353991d0d232f96d84dae736c290b84d1a51234d0d5f5f42bf66b79420
witness       : b172396c0e1efc155bd7566adca61a57e5969191cddf47c3d07c85309c42d4f0
```

Cross-checked against this repo's own `dream-machine witness stamp` CLI
output — identical.

5-step verifier anyone can reproduce: (1) fetch the four branches named
above and run the exact merge procedure in Evaluation Receipt against
`session_commit`; (2) confirm 134/134 tests pass, clean lint, clean build,
and exactly 3 trivial `LEDGER.md` conflicts with 0 source conflicts; (3)
independently compute `EPOCHDAY=$(( $(date -u +%s) / 86400 ))` on
2026-11-15 UTC and confirm `EPOCHDAY % 5 = 2 ≠ DAYINT % 5 = 0`; (4)
recompute `sha256sum` of this report file with the Witness section's
placeholder lines blanked, then
`printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum`, and check it
equals the `witness` value recorded in `LEDGER.md`/the PR body; (5) confirm
`session_commit` is reachable from `main`'s history
(`git merge-base --is-ancestor 2fba255 main`).

## Recommendation

`evaluated: accepted` for the integration-compatibility hypothesis (effect
positive: verified zero semantic conflicts and a clean combined build/lint/
134-test run across four independent candidates that had never been tested
together; no regression; receipt-reproducible). For the human:

1. **Highest-leverage action available right now**: merge PR #97
   specifically. It fixes the exact mechanism that assigned this very
   session `compiler-parity` again tonight instead of `evaluation-adapters`
   — the clearest possible demonstration that this specific unmerged fix
   has a live, dated, real-world consequence, not just a 420-day synthetic
   projection.
2. Given tonight's verified compatibility: #87, #97, #107, and #127 can be
   merged in any order (or all four in one sitting) with no source
   conflict — only the trivial, expected `LEDGER.md` append collision,
   resolved identically each time (keep both rows, date order). This
   directly reduces the reviewer-side cost that the zero-merge-streak
   signal has flagged for months.
3. Separately (not this session's call, and out of `compiler-parity`
   scope): issue #134's root-caused `automerge-safe`-label gap and the
   draft-PR-cannot-auto-merge limitation (#97's own Merge Policy section)
   are the actual structural blockers behind the 68-day/55-PR backlog this
   report measures but does not attempt to fix.

This session does not merge, self-approve, apply any automerge-eligibility
label, or self-promote.
