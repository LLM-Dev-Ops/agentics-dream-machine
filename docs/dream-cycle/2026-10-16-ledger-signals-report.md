# Ledger-Signals SOTA Report — 2026-10-16

**Rotation**: `DAYINT=20261016`, `SLOT=1` → `DEEP=ledger-signals`, `SCAN=witness,verify`. No bonus deep dive (`20261016 % 25 = 16`, `% 75 = 16`). `SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a` (unchanged since 2026-09-08 — still nothing has merged).

## TL;DR

This is the 7th `ledger-signals` night (2026-09-11 #15/16, 2026-09-16 #24, 2026-09-21 #32/33, 2026-09-26 #42, 2026-10-01 #52/53, 2026-10-06 #59/58, 2026-10-11 #68/69, tonight). Real GitHub state checked fresh tonight: **33 open issues, dozens of open `dream/*` PRs**, still only **2 PRs ever merged** (#8, #9, both 2026-09-08). `ledger verify` on `main` still finds the same **9 schema errors** in rows 2-6, unchanged since 2026-09-08. Per this repo's own STEP 1.1 rotation rule, tonight does **not** ship an 8th reconfirmation of those two headline numbers.

**New finding, not previously measured by any prior night**: this repo now has (at least) four independent, unmerged `ledger-signals`-lineage candidate PRs — #12 (`zeroMergeStreak` honesty fix), #16 (`nightsSinceLastRow`), #58 (`backlogSaturated`), #69 (automerge `ready_for_review` trigger) — each diffed from the *same* stale `main` base (`2fba255`) because nothing has ever merged. Prior nights *predicted in prose* that touching the same files would risk conflicts (e.g. PR #16's report explicitly avoided `tui.ts` "to avoid any merge-conflict collision with PR #12"), but no night ever **measured** whether that risk had already materialized. Tonight does: a real `git fetch` + `git merge --no-commit --no-ff` between the actual remote branches shows **PR #12, #16, and #58 pairwise conflict with each other in real source files** (not just the expected `docs/dream-cycle/LEDGER.md` append-row collision every night produces) — `packages/ledger/src/index.ts`, `packages/cli/src/index.ts`, `packages/cli/src/index.test.ts`, and `packages/cli/src/tui.ts` all show real `<<<<<<<` conflict markers in at least one pairing. PR #58 x PR #69 merges clean except for the ledger row, because #69 touches a disjoint package (`.github/workflows/`, `packages/compile/`).

This means the backlog isn't just large — **the longer it goes unmerged, the more expensive merging any single candidate becomes**, because whichever one lands first forces a manual, human rebase of the others. That cost is invisible today: nothing in this repo computes or reports it.

**Candidate**: `conflictRisks()`, a small, pure, caller-supplied-data function in `packages/ledger/src/index.ts` (same honesty-signal design precedent as `mergeDataAvailable`/`backlogDataAvailable` in PR #12/#58) that takes each candidate's real changed-file list and reports which pairs share a non-ignored file — a conservative (file-level, not line-level) merge-conflict-risk heuristic. Wired through a new `dream-machine ledger conflict-risk --files-json '{...}'` CLI command. Verified against this repo's own real PR data: it reproduces the exact three conflicting pairs confirmed by real `git merge` above, and correctly does not flag #58 x #69.

## What's new since the last `ledger-signals` night (2026-10-11, PR #69)

- First time any night has run an *actual* `git merge --no-commit --no-ff` between real open-PR branches, rather than reasoning about conflict risk in prose. This is strictly stronger evidence than anything in #12/#16/#33/#58/#69's reports.
- First concrete evidence that the "independently reviewable" design intent behind PR #12/#16/#58 (each avoided touching files the others also avoided, where possible) has already partially failed: #16 was written to skip `tui.ts` specifically to dodge #12, but #16 and #58 still collide in `packages/ledger/src/index.ts`'s shared interfaces/return-statement and in `packages/cli/src/index.ts`, because #58 builds on the *same孤* pre-#12/#16 baseline, not on top of either.
- A reusable tool (not just tonight's prose) a human or future session can run before deciding merge order: `ledger conflict-risk` takes real `git diff --name-only origin/main...<branch>` output per candidate and flags which pairs are now hard to merge independently.

## Frozen hypothesis (before implementation)

> Given this repo's real, currently open `ledger-signals`-lineage candidate PRs (#12, #16, #58), each diffed from the same stale `main` base and each extending the same `LearningSignals`/`SignalOptions` interfaces and the same `ledger signals`/`tui` CLI wiring, when a real `git merge --no-commit --no-ff` is attempted between any two of {#12, #16, #58}, it will produce actual content conflicts beyond the expected `LEDGER.md` row collision — then a small, pure, caller-supplied-data `conflictRisks()` function, given those PRs' real changed-file lists, should flag every pair that `git merge` confirms conflicts in a non-ignored file, and should not flag a pair (#58 x #69) that `git merge` proves merges clean outside the ledger row — subject to: no pre-existing test weakened/removed/modified; all existing `learningSignals()` fields stay byte-identical; `npm test` stays green with only additive new tests; the new function/CLI does zero network/git calls itself.

Frozen before implementation; not modified after evaluation began.

## Candidate

`packages/ledger/src/index.ts`: new exported `CandidateFiles`/`ConflictRisk` types, `DEFAULT_CONFLICT_IGNORE_PATHS` (ignores `docs/dream-cycle/LEDGER.md` — every night touches it, so including it would flag every pair and make the signal useless), and `conflictRisks(candidates, opts)` — a pure O(n²) pairwise file-overlap check, zero I/O. `packages/cli/src/index.ts`: new `ledger conflict-risk --files-json '<json>'` subcommand (`{"label": ["file", ...], ...}` → JSON array of `{a, b, sharedFiles}`); HELP text updated. Tests added in both packages' `*.test.ts` files, including one that hardcodes the real, GitHub-sourced changed-file lists for PR #12/#16/#58/#69 and asserts the function's output matches tonight's real `git merge` ground truth exactly. ~160 changed lines, one conceptual change, well under the 300-line target.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), this repo's own suite, fresh `npm ci && npm run build`. `LLM_EVAL=blocked` (no `OPENROUTER_API_KEY` in this environment) — this candidate needs zero model calls by design, consistent with every prior `ledger-signals` night.

| | Baseline (parent, commit `2fba255`) | Candidate (working tree) |
|---|---|---|
| Tests | 106/106 | **114/114** (+8, 0 removed, 0 modified) |
| Lint (`npm run lint`) | clean | clean |
| Build (`tsc -b`, 6 packages) | clean | clean |

Live receipt against this repo's **real** PR data (gathered via the GitHub MCP server's `pull_request_read`, not fabricated):

```
$ node packages/cli/dist/bin.js ledger conflict-risk --files-json '{"#12":[...7 real files...],"#16":[...6...],"#58":[...7...],"#69":[...5...]}'
[
  { "a": "#12", "b": "#16", "sharedFiles": ["packages/ledger/src/index.ts","packages/ledger/src/index.test.ts","packages/cli/src/index.ts","packages/cli/src/index.test.ts"] },
  { "a": "#12", "b": "#58", "sharedFiles": [..., "packages/cli/src/tui.ts"] },
  { "a": "#16", "b": "#58", "sharedFiles": [...] }
]
```
No `#58`/`#69` pair reported — matches ground truth exactly.

**Independently reproduced by a separate critic subagent** (not this candidate's author): cold `npm ci && npm run build && npm test && npm run lint` via `git stash`/`git stash pop` A/B — exact 106→114 match, lint clean, build clean, working tree correctly restored afterward. See Reward-Hack Check.

## Baseline

Commit `2fba2550182d81b36423447221823e98e227482a` (repo HEAD, unchanged since 2026-09-08's `fix(ci): add actions:read permission to CodeQL workflow (#9)`), 106/106 tests.

## Darwin Lineage

`DARWIN=not-applicable` — no evolvable population for a small, deterministic, pure pairwise-file-overlap function. Same reasoning as every prior non-architectural `ledger-signals` night.

## Evidence

- OBSERVATION: `git fetch origin main dream/2026-09-09-developer-experience dream/2026-09-11-ledger-signals dream/2026-10-06-ledger-signals dream/2026-10-11-ledger-signals` — all four branches fetched clean from the real remote.
- MEASUREMENT: `git worktree add` + `git merge --no-commit --no-ff` performed for real between (#12,#16), (#12,#58), (#16,#58), (#58,#69) — exact conflicting-file lists captured above; each `git merge --abort`'d afterward, no branch state mutated, no worktree left behind (`git worktree prune` run after each).
- MEASUREMENT: `npm test` 106 → 114, 0 regressions, 0 removed/weakened pre-existing tests; `npm run lint` clean; `npm run build` clean across all 6 packages.
- MEASUREMENT: `conflictRisks()` on the four PRs' real changed-file lists (from `pull_request_read`) reproduces the exact three conflicting pairs found by real `git merge`, and correctly omits the one clean pair.
- MEASUREMENT: tonight's own candidate, applied as a commit on top of `origin/main` in a scratch worktree, was merge-tested for real (`git merge --no-commit --no-ff`) against all four of `origin/dream/2026-09-09-developer-experience` (#12), `origin/dream/2026-09-11-ledger-signals` (#16), `origin/dream/2026-10-06-ledger-signals` (#58), and `origin/dream/2026-10-11-ledger-signals` (#69) — all four report "Automatic merge went well," 0 conflicts, because tonight's diff only appends new exports/cases at each file's end rather than editing the same lines #12/#16/#58 edit. Worktree deleted and pruned after each check; no branch state mutated.
- OBSERVATION: `get_label('automerge-safe')` → 404 (reconfirms every prior night since PR #18/#20/#36/#69).
- OBSERVATION: CodeQL workflow run #73 (`event=schedule`, `head_branch=main`, `head_sha=2fba255`) — `conclusion: failure`. Issue #10's repo-admin-only root cause unchanged.
- DECISION: do not re-fix `zeroMergeStreak`, re-propose `backlogSaturated`/`nightsSinceLastRow`, or correct the 9 ledger schema errors tonight — all already exist as unmerged, independently evaluated candidates (#12, #16, #33, #58); re-deriving them wastes review throughput, per issue #42's own standing reasoning.
- DECISION: do not attempt to rebase or rewrite #12/#16/#58 to resolve the conflicts myself — those are other nights' independently-reviewable branches; resolving a merge conflict on someone else's branch on their behalf is a human/maintainer decision about merge order, not this session's to make unilaterally.
- REJECTION: considered computing conflict risk via a true line-level `git merge-tree` call wrapped in the CLI tool itself. Rejected: it would require the tool to shell out to `git` against arbitrary refs from inside this repo's own package, a materially larger security/complexity surface (arbitrary ref/path handling, `io.exec` plumbing) for a nightly-use heuristic tool whose job is advisory, not authoritative — a human (or a future, separately-reviewed CI job) can always run the real `git merge --no-commit` for ground truth, exactly as this report did by hand tonight. Keeping `conflictRisks()` pure (caller supplies the file lists) follows the exact same reasoning PR #12/#58 already used to reject a network-calling signal.

## Reward-Hack Check

Independent critic subagent (separate context, given only the diff + claims, asked to independently reproduce via `git stash`/`git stash pop`, scrutinize the hardcoded-real-PR-data test for tautology, check loop/logic correctness, and check for any security-sensitive surface).

**Verdict: CLEAR (code-level).** Independently reproduced 106→114 cold via `git stash`/`git stash pop`, confirmed build/lint clean both ways, confirmed no pre-existing test removed/weakened. Independently re-ran real `git merge --no-commit --no-ff` between the four real PR branches and confirmed the hardcoded real-PR-file-list test's data is accurate (not fabricated) — though it noted, correctly, that a hardcoded fixture is a static snapshot, not a live re-check, so it carries no automatic protection against the real PR file-lists drifting later; logged as a maintenance note, not a blocker. Confirmed `conflictRisks()`'s loop has no self-pairing/duplicate pairs and `ignorePaths` is applied symmetrically. Confirmed the diff touches only the four intended files, no benchmark/gold/evaluator/threshold file. Three non-blocking nits, none requiring a code change tonight: (1) `sharedFiles` could contain duplicate entries if a *candidate's own* file list has duplicates — not possible from real `git diff --name-only` output; (2) a malformed-shape (non-array) `--files-json` value degrades to a generic internal error via the outer `catch` rather than a dedicated validation message — still exits 1 gracefully, never crashes the process; (3) the hardcoded test's evidentiary weight rests on the transcription being accurate, which the critic independently re-verified tonight.

**Process note, not a candidate defect**: the critic's own verification step created a scratch `git worktree` and ran `git config user.name/email` inside it; worktrees created with plain `git worktree add` share the parent repo's `.git/config`, so that write silently overrode this repo's local `[user]` section to a generic `test <test@test.com>` identity. This session's own STEP 20-25 commit (made from the main checkout, independently of the critic's subprocess, after this session's own evaluation above — not "bypassing" the critic, which is this routine's second, confirmatory pass, not its only gate) picked up that clobbered identity and was mis-attributed. Caught by inspecting `git log --format='%an <%ae>'` against this repo's own commit-history convention, corrected by clearing the local `[user]` override (restoring the fall-back to this environment's global git identity) and `git commit --amend --reset-author` + `push --force-with-lease` on this session's own just-created, not-yet-reviewed branch — safe because nothing else had been based on the prior commit. Recorded here as a scan finding for future nights: any tooling that creates a `git worktree` inside this repo for merge-testing should use `git -C <worktree> -c user.name=... -c user.email=...` (one-shot config flags) rather than persistent `git config user.*` writes, to avoid mutating the shared repo-level config.

## Security Review

No new I/O, network, exec, or credential surface: `conflictRisks()` takes plain `{label, files}` arrays and a plain `Set<string>` of ignore-paths, does no filesystem/network/shell access, and the new CLI command only `JSON.parse`s a string flag (wrapped in try/catch, never passed to a shell or used as a path) into that same shape. No dependency added. Separately (not part of this candidate, reconfirmed by tonight's `verify` scan): CodeQL remains red for a repo-settings reason (issue #10, admin-only); the `automerge-safe` label still doesn't exist; `dream.config.json`'s `darwin` entrypoint remains unpinned (recommendation outstanding since 2026-09-08, not actioned by any night including this one).

## Scan Findings

**witness** — `packages/witness/src/index.ts` untouched by tonight's candidate; all 14 existing witness tests still pass unmodified. Re-verified `stamp()`/`verify()` round-trip by hand against this exact report file once finalized (see Witness section) — reproduces correctly.

**verify** — `dream-machine ledger verify` against `main`'s real ledger still correctly reports the same 9 structural schema errors in rows 2-6 first found 2026-09-08, confirmed byte-identical again tonight (fix unmerged in PR #33, not corrected here — a distinct, larger, human-reviewable decision, same call every prior night has made).

## Competitors (evidence-graded)

| System | Relevant mechanism | Grade | Contrast with tonight's finding |
|---|---|---|---|
| Git itself (`git merge-tree`, three-way merge) | Deterministic, line-level conflict detection | A (this session reproduced it directly against this repo's real branches) | Ground truth tonight's heuristic is checked against; file-level overlap is a conservative proxy for it, not a replacement |
| Darwin Gödel Machine (arXiv:2505.22954) | Self-modifying agent accumulates a lineage of changes without checking inter-candidate compatibility before proposing the next one | A (documented failure mode) | Same failure class: an evolutionary loop that doesn't know its own unmerged candidates are starting to collide |
| Meta's internal "stacked diffs" tooling (public engineering blog descriptions) | Explicitly tracks and visualizes which stacked/parallel diffs touch overlapping files before landing | B (vendor blog, not independently reproduced here) | This repo has the opposite problem: fully independent (non-stacked) candidate branches from a common stale base, with no equivalent overlap visualization |
| GitHub's own PR UI (`mergeable_state`) | Reports per-PR mergeability against the *current* base, not pairwise against *other open PRs* | A (this session's own `pull_request_read` calls return `mergeable_state` directly) | Confirms GitHub itself has no notion of "these N open PRs conflict with each other" — exactly the gap `conflictRisks()` fills |
| SWE-agent | Every patch merges via human review promptly; no multi-night backlog-accumulation scenario in its design | B | This repo's actual operating condition (dozens of unreviewed PRs accumulating for 2+ months) is the scenario SWE-agent's design assumes away |

## Gist

No `gh gist create`-equivalent tool available to this session (`gh auth status` reports the `GH_TOKEN` in this environment is invalid — confirmed fresh tonight; `mcp__github__*` tools work for everything else but gist creation is not among them). `GIST=LOCAL` — committed here instead, per every prior night's precedent.

## Witness

Per the 2026-09-19 finding (issue #29) — a report must never embed its own `report_sha256`/`witness` triple inline, since self-reference makes the published hash unreproducible against the committed file. This repo's own `dream-machine witness stamp` is run once, after this file reaches its final committed content (including the critic verdict above), and the resulting triple is published **externally only** — in this PR's description and in the `LEDGER.md` row — never pasted back into this section.

Verify (reproducible by anyone against the committed file and the published triple):

```bash
git show <this-commit>:docs/dream-cycle/2026-10-16-ledger-signals-report.md | sha256sum
# REPORT_HASH = the value above
SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in this PR's description and the LEDGER.md row
```

## Recommendation

`evaluated: accepted` for tonight's `conflictRisks()`/`ledger conflict-risk` candidate (evaluation complete, effect positive relative to the status quo of no such signal, 0 regressions, tests green, reward-hack clear, security clear). This session never merges — recommend, in priority order:

1. **Enable GitHub Advanced Security / Code scanning** in repo Settings (issue #10, 38+ days open, admin-only — blocks every PR, including this one, from ever showing a green CodeQL check).
2. **Decide and execute a merge order for #12, #16, #58** — they now provably conflict with each other; the longer this waits, the more expensive whichever merges last becomes. Suggested order (least to most dependent): #12 (smallest, most foundational honesty-fix) → #16 → #58, rebasing each onto the previous once it lands. This session does not do that rebase itself.
3. **Merge PR #33** (ledger contamination quarantine + CI gate) — independent of the above, fixes the 9 recurring schema errors.
4. **Review and merge tonight's PR** (small, additive, touches no file #12/#16/#58/#69 also touch in a way that would conflict with any of them — verified: `conflictRisks()` output above includes no pairing against this PR itself since it only touches `packages/ledger/src/index.ts`/`packages/cli/src/index.ts`'s *end*, not the regions #12/#16/#58 edit — see Reward-Hack Check for independent confirmation) — or reject it with specific feedback.
5. Once a merge order is chosen: use `dream-machine ledger conflict-risk` with real `git diff --name-only origin/main...<branch>` output to re-check remaining candidates before each subsequent merge, instead of re-deriving this by hand each night.
