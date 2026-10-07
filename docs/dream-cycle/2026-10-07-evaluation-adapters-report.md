# Evaluation-Adapters / Darwin SOTA Report — 2026-10-07

## TL;DR

Tonight is the **5th** `evaluation-adapters`/SCAN=`flywheel,darwin` rotation
(after PR #18 2026-09-12, #26 2026-09-17, #35 2026-09-22, #45 2026-09-27, #53
2026-10-01 — all still open, draft, unmerged). Tonight's own real, unmocked
reproduction of this repo's configured `darwin` entrypoint
(`npx @metaharness/darwin evolve --sandbox real`, unpatched on `main`)
confirms, for the fifth time, the exact two defects PR #18 already fixes and
PR #35 already detects: (1) the missing `<repo>` positional argument causes
the CLI to misparse `--sandbox` as the repo path, scaffolding a stray
`./--sandbox/.metaharness/...` tree in the checkout root (confirmed again
tonight: a full 3-generation × 8-child run executed for real against that
bogus directory, 24+1 variants, all scoring `0.985`, `Delta over baseline:
+0.000` — exactly matching the tool's own printed warning); (2) re-running the
identical command a second time — with or without PR #18's `<repo>`-arg fix
applied (verified tonight in an isolated scratch copy, both with and without
the fix) — fails with `Error: darwin: autonomous or generated child id
already exists: g1_v0`, flipping `verify-entrypoints`' classification from
`live` to `blocked` with no change in the entrypoint's actual health. No new
code candidate is proposed tonight: both defects already have complete,
evidenced, reviewable fixes sitting unmerged. **The dominant finding tonight
is process, not code**: 26 open `dream/*` draft PRs (#12–#58), 0 merged since
commit `896d2a9`/`2fba255` (PR #8/#9, 2026-09-08) — 29 nights, 26 independent,
non-duplicate, individually-reviewable candidates, zero human review action.
Four prior nights (#40, #42, #46, #52) already escalated this exact crisis at
lower counts (15, 17, 19, 22). Tonight reconfirms it at the highest count yet
and stops short of adding a 27th near-identical escalation PR — see
Recommendation.

## What's new

- Live, real (no mocking) reproduction of PR #18's disclosed `--sandbox/`
  directory-pollution bug, run fresh tonight against the actual unpatched
  `main` `dream.config.json`: first invocation exits 0 and actually executes
  a full bounded-shaped evolution run (3 generations × 8 children + baseline)
  against the bogus directory it just created, every variant scoring
  identically (`0.985`), confirming the tool's own `--sandbox real` warning
  independent of the arg-misparse bug. Second invocation (same command,
  same cwd) exits 1 (`child id already exists: g1_v0`). Artifact removed
  before committing (untracked debris from this session's own probing, not
  part of any candidate).
- New observation not previously recorded: PR #18's own ADR-0003 explicitly
  did not re-verify its `<repo>`-arg fix against a *second* consecutive run
  ("this ADR does not re-verify that specific corrected command"), and PR #35
  (ADR-0004) also stopped short of testing the corrected command. Tonight
  closes that specific gap empirically (isolated scratch copy, not the live
  repo): with PR #18's fix applied (`evolve <repo> --sandbox real`), the
  **first** run is clean (state correctly scoped to `<repo>/.metaharness/`,
  no stray directory) but the **second** identical run still fails identically
  (`child id already exists: g1_v0`) — confirming PR #35's `--idempotency-check`
  capability is still necessary after PR #18 merges, not redundant with it.
  This is new evidence, not a new candidate: both fixes already exist,
  unmerged, and compose correctly together; nothing to build.
- Checked PR #18/#26/#35/#45's diffs directly (not from memory) before
  concluding there is nothing new to implement — standard STEP 2 practice,
  reconfirmed rather than skipped.
- GitHub ground truth via `list_pull_requests`/`list_issues` (not
  reconstructed from `LEDGER.md`, which is stale on `main` since 2026-09-08
  because every night's ledger-append commit lives only on its own unmerged
  branch — issue #15/#29/#32/#42 already diagnosed this exact staleness
  mechanism): **26 open dream-cycle draft PRs** (#12,14,16,18,20,22,24,26,
  28,30,31,33,35,37,39,41,43,45,47,49,51,53,55,57,58 — 25 — plus tonight would
  be the 26th/27th depending on count basis), **20 open dream-cycle issues**,
  **0 merged** since #8/#9 (2026-09-08). `CodeQL` (issue #10, 2026-08-24,
  repo-admin-only) has never passed on `main`.

## Hypothesis (frozen before any implementation)

> Given this repo's own `dream.config.json#evaluatorEntrypoints.darwin`
> command, already shown (PR #18, 2026-09-12) to misparse its missing
> `<repo>` argument and already shown (PR #35, 2026-09-22) to be non-idempotent
> across repeat runs, when the two already-proposed fixes are composed and
> tested together (repo-arg fix + a second consecutive run), the combination
> should still surface non-idempotency on the second run — subject to: no
> modification to `@metaharness/darwin` itself (out of this repo's scope); the
> real evaluator only (no mocked exec results); and no repo state polluted by
> the test (verified in an isolated scratch copy, not the live checkout).
> **Testability gate result**: testable and tested tonight (not a new code
> candidate — confirms both existing unmerged fixes are correct and still
> jointly necessary). `EVALUATED=yes / VERDICT=INCONCLUSIVE` for "is there a
> new evaluation-adapters candidate to build tonight" (answer: no, fixes
> already exist unmerged) is distinct from, and should not be read as, a
> judgment on PR #18/#35's own merits (both independently evidenced ACCEPT in
> their own reports).

## Benchmarks / Evaluation Receipt

Real evaluator: `npm test` (vitest, no candidate diff tonight, so baseline ==
candidate, 106/106 unchanged) plus real subprocess execution of the actual
configured `darwin` entrypoint — no mocking.

**Run 1 — live repo, unpatched `main` config, first invocation:**
```
$ npx --yes @metaharness/darwin evolve --sandbox real
note: --sandbox real (the default) scores variants by this repo's own test
command, which cannot distinguish between mutated harness surfaces ...
Darwin Mode — leaderboard
  0.985  baseline  ... ◀ winner
  0.985  g1_v0 … (24 variants total, g1-g3, all 0.985)
Winner: baseline
Delta over baseline: +0.000
Artifacts: /home/user/agentics-dream-machine/--sandbox/.metaharness
$ echo $?
0
```
Confirmed on disk: `--sandbox/.metaharness/{archive.json,lineage.json,
variants/*,runs/*}` — a real, complete bounded-shaped evolution run executed
against a directory that is not this repository. Removed before committing.

**Run 2 — identical command, same cwd:**
```
$ npx --yes @metaharness/darwin evolve --sandbox real
Error: darwin: autonomous or generated child id already exists: g1_v0
$ echo $?
1
```
`dream-machine verify-entrypoints dream.config.json` independently reproduces
the same flip: `darwin: live` on the first call tonight, `darwin: blocked
(exit 1) — ... already exists: g1_v0` on the immediate second call (raw CLI
transcript, both captured this session).

**Run 3 — isolated scratch copy (`/tmp/.../darwin-candidate-check/repo`),
PR #18's fix applied by hand (repo arg added), first invocation:**
```
$ npx --yes @metaharness/darwin evolve "$SCRATCH" --sandbox real
Darwin Mode — leaderboard
  0.985  baseline ◀ winner
  ...
Delta over baseline: +0.000
Artifacts: $SCRATCH/.metaharness
$ echo $?
0
```
No stray `--sandbox` directory in the parent — confirms PR #18's fix works as
claimed.

**Run 4 — same scratch copy, same fixed command, second invocation:**
```
$ npx --yes @metaharness/darwin evolve "$SCRATCH" --sandbox real
Error: darwin: autonomous or generated child id already exists: g1_v0
$ echo $?
1
```
Confirms PR #35's idempotency check remains necessary even after PR #18
merges — the two fixes are complementary, not overlapping or redundant.

| | Baseline (`main`, `2fba255`) | Tonight |
|---|---|---|
| `npm test` | 106/106 | 106/106 (no candidate diff) |
| `darwin` entrypoint, run 1 | live (exit 0), pollutes cwd | same (unpatched) |
| `darwin` entrypoint, run 2 (same cwd) | blocked (exit 1) | same (unpatched) |
| `darwin` entrypoint, run 1, with PR #18's fix (scratch copy) | n/a | live (exit 0), no pollution |
| `darwin` entrypoint, run 2, with PR #18's fix (scratch copy) | n/a | blocked (exit 1) — PR #35's check still needed |

## Darwin (bounded evolution)

`DARWIN=not-applicable` — no new candidate diff exists tonight to run bounded
Darwin against. Separately, the real darwin entrypoint's *own* unbounded
run (Benchmarks Run 1 above) is this report's SCAN=darwin finding, not a
Step-12 evaluation of a candidate of this session's own authorship.

## Evidence

- OBSERVATION: real darwin entrypoint run twice, live repo, unpatched config
  → live then blocked, `--sandbox/.metaharness/*` created and removed.
- OBSERVATION: PR #18's diff (read in full) adds the missing `<repo>` arg and
  a `flywheel` entrypoint; PR #35's diff (read in full) adds
  `classifyIdempotency`/`--idempotency-check`; PR #45's diff (read in full)
  extracts `entrypointExitCode`; none overlap or conflict with each other.
- MEASUREMENT: isolated scratch-copy test, PR #18's fix applied by hand —
  first run live/clean, second run blocked/collision (Run 3/4 above).
- MEASUREMENT: `list_pull_requests`/`list_issues` — 26 open dream-cycle draft
  PRs, 20 open dream-cycle issues, 0 merged since 2026-09-08.
- INFERENCE: PR #18 and PR #35 are both still correct and both still
  necessary post-merge of either one alone — composing them is additive, not
  redundant.
- DECISION: do not open a new code-candidate PR tonight — both real defects
  already have complete, unmerged fixes; building a third, differently-shaped
  fix for the same bug would itself be a reward-hack-adjacent move (manufacturing
  a "new" PR instead of surfacing that review, not re-discovery, is the
  bottleneck).
- DECISION: do not add a 6th near-duplicate "backlog reconfirmed" issue/PR
  tonight (precedent: #40, #42, #46, #52 already did this at lower counts) —
  instead, escalate directly to the repository owner outside the PR queue
  (see Recommendation), since the PR-queue escalation channel has had 4
  independent attempts and zero effect.

## Reward-Hack Check

No candidate diff exists tonight, so there is nothing to cherry-pick, no
benchmark to weaken, no threshold touched, no gold data at risk. Self-check
on the one judgment call made (not opening another backlog-escalation PR):
this is a process decision about *how* to escalate, disclosed openly here and
in the human-facing notification, not a suppressed or hidden finding — the
full evidence (26 PRs, 20 issues, specific numbers) is in this report, not
summarized away. **Verdict: CLEAR** (vacuously, for the code axis; the
process-decision axis is disclosed, not hidden).

## Security Review

- No code changed tonight — no new tool/MCP authority, credential, or
  filesystem-scope surface.
- Reconfirmed (not newly found): the unpinned `npx @metaharness/darwin`
  invocation (flagged 2026-08-13, 2026-09-08, 2026-09-12, 2026-09-27) remains
  real and unpinned on `main`; a pin fix exists in PR #20 (2026-09-13),
  unmerged.
- `LLM_EVAL=blocked` tonight (no `OPENROUTER_API_KEY` in this session's
  environment) — no model calls anywhere in tonight's evaluation.
- No prompt injection / cross-agent poisoning surface touched — read-only
  GitHub queries (`list_pull_requests`, `list_issues`, `pull_request_read`)
  plus local subprocess execution of a locally-authored, already-reviewed
  config value.

## Scan Findings

**flywheel** — `dream.config.json#evaluatorEntrypoints` on `main` still
declares no `flywheel` key (only `bench`, `darwin`); PR #18 already proposes
`npx metaharness flywheel help`. Nothing new tonight; gap remains tracked,
not rediscovered.

**darwin** — see Benchmarks/Evidence above: both known defects (missing
`<repo>` arg; non-idempotent repeat invocation) reconfirmed live tonight,
including the specific gap (do the two existing fixes compose correctly?)
that neither PR #18 nor PR #35 individually closed — answer: yes, confirmed
tonight, no new code needed.

## Competitors

(Reusing/cross-checking, not re-researching from scratch, the comparisons
already established in the 2026-08-13/09-08/09-12/09-22 reports — no new
external claim is made tonight.)

| System | Relevant practice | Grade |
|---|---|---|
| Terraform / OpenTofu | plan→apply convergence check as prior art for "run twice, verify no drift" (cited 2026-09-22) | A |
| Sakana AI / "Red Queen Gödel Machine" | evaluator-is-the-blind-spot framing (cited 2026-09-08/09-12) | B |
| OpenHands | stuck-detector pattern, not a re-run idempotency check (cited 2026-08-13/09-08/09-22) | B |
| DSPy/GEPA | no documented duplicate-logic or idempotency tooling found (cited repeatedly) | B/C |

## Gist

No `gh gist create`-equivalent tool available to this session (same
constraint recorded every prior night; GitHub access here is MCP tools
scoped to issues/PRs/branches). `GIST=LOCAL` — committed as this file.

## Witness

`dream-machine witness stamp` hashes this file's committed bytes; the stamp
is filled in immediately before commit, over content identical up to this
point (established convention since the 2026-09-19 self-reference lesson,
issue #29).

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-10-07-evaluation-adapters-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "2fba2550182d81b36423447221823e98e227482a" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo `main` HEAD
at the start of tonight's session).

## Recommendation

Human review — but not of a new PR. The single highest-leverage action
available is unchanged from four prior escalations (#40 at 15 PRs, #42 at 17,
#46 at 19, #52 at 22) and is now more urgent at 26:

1. **Triage the 26-PR backlog directly**, starting with the three smallest,
   most load-bearing, longest-waiting fixes: **PR #18** (darwin `<repo>`-arg
   fix + flywheel entrypoint, 2026-09-12, 25 nights old), **PR #35** (darwin
   idempotency detection, 2026-09-22), **PR #45** (tiny refactor,
   2026-09-27) — all three independently reviewable, non-overlapping, and
   re-confirmed correct again tonight.
2. **Decide the CodeQL repo-settings gap** (issue #10, 2026-08-24,
   admin-only, 44 days open, 0/30+ runs ever green) — blocks nothing
   technical but is the longest-standing unresolved item in the backlog.
3. **This repository's automated nightly loop has now independently reached
   the same conclusion five times** (tonight plus #40/#42/#46/#52): it is
   structurally incapable of making further progress on `evaluation-adapters`
   or the backlog itself without a merge decision from a human. Continuing to
   run nightly without a review pass will keep producing correct,
   non-duplicate, individually-small findings that pile up without effect —
   the loop is evidence-producing, not promotion-producing, by design (ADR-0001
   §2.4), and that design is working exactly as specified. The gap is the
   human side of the loop, not the engine.
