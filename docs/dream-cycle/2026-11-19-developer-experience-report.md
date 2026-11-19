# Dream Machine SOTA Report — Developer Experience (2026-11-19)

**Rotation**: `DAYINT=20261119`, `SLOT=4` → `DEEP=developer-experience`, `SCAN=cli,tui`.
`DAYINT % 25 = 19`, `DAYINT % 75 = 19` — no bonus deep dive.
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a` (`main` tip, unchanged since PR #9, 2026-09-08).

## TL;DR

Guarded auto-merge (ADR-0001) is not singly but **doubly** structurally unreachable. PR #135
(2026-11-14) found cause (a): the `automerge-safe` label the guard's `if:` condition requires
has never existed in this repo. Tonight reconfirms (a) is still true five nights later, and adds
cause (b), independently sufficient on its own: every dream-cycle PR is opened as **draft**
(per this routine's own STEP 20-25, "even a significant result stays draft"), and GitHub's
auto-merge mechanism cannot be enabled on a draft PR at all. Even if a human created the label
today and applied it to every open PR, zero would merge, because none of them are marked ready
for review. Live evidence from PR #143 (tonight's newest backlog entry, pushed 2026-11-18): all
7 required checks green, including CodeQL, and `guard-and-merge` itself ran and **skipped** —
confirming the label gate fires as designed, correctly, every time, against a PR it can never
reach regardless. The zero-merge streak is 72 days (PR #9 merged 2026-09-08 → today), ~69 open
dream-cycle PRs, 0 merged. This is the 3rd+ consecutive developer-experience-surface night to
touch this exact backlog (#89, #105, #117, #125, #135 precede it) — per this repo's own learning
signal ("a finding repeated in ≥3 prior nights → rotate"), **no new code candidate is proposed
tonight**; this is a docs/ledger-only diagnostic night, same category as #76/#121/#133/#135.

## What's new tonight vs. PR #135

PR #135 diagnosed cause (a) only and recommended "a human could apply `automerge-safe` after
review." Tonight's finding is that doing *only* that would still not unblock a single PR: cause
(b) (draft state) is independently fatal to `gh pr merge --auto` / `enablePullRequestAutoMerge`,
per GitHub's own documentation (Grade A — official source), and this routine's own compiled
instructions guarantee every PR it opens satisfies cause (b) permanently. The two causes are
AND-gated, not alternatives: the backlog needs **both** a label created **and** a per-PR human
decision to mark specific PRs ready for review before guarded auto-merge can ever fire for
anyone, under the routine as currently compiled.

## Hypothesis (frozen before this report's conclusions section was written)

> Given this repository's live GitHub state (not the stale 9-row `main` ledger) and its
> `.github/workflows/automerge.yml` guard, when the newest backlog PR's live check-run history,
> label set, and draft state are inspected directly, then the 72-day/69-PR zero-merge streak
> will be attributable to two independently-sufficient, currently-both-true structural causes —
> missing `automerge-safe` label (reconfirmed) and universal draft state (newly isolated) — with
> CI/CodeQL itself fully green and not a contributing cause, subject to: every claim verified
> against a live `gh`/API call or the built `dream-machine` CLI this session actually ran this
> session, no label created, no PR merged/undrafted/approved/relabeled by this session, no new
> application code proposed.

## Evidence Log

| # | Claim | Grade | Source |
|---|---|---|---|
| 1 | `automerge-safe` label absent from repo | A | live `get_label` → 404, this session, 2026-11-19 |
| 2 | PR #143 (newest backlog PR, pushed 2026-11-18) check-runs: CodeQL success, 3× test success, no-optional-deps success, analyze success, `guard-and-merge` **skipped** | A | live `pull_request_read get_check_runs`, this session |
| 3 | PR #143 is `draft: true`, `mergeable_state: clean` | A | live `pull_request_read get`, this session |
| 4 | 69 open PRs titled `dream-cycle ...`, spanning #12→#143, 0 `merged: true`; last merge was #9 (2026-09-08) | A | live `list_pull_requests`, this session, cross-checked against `git log` on `main` |
| 5 | Issue #10 (Code security / GHAS repo-setting gap) still open; CodeQL now green per PR #91 (2026-10-22) — issue #10 itself is stale on that point | A | live `issue_read`, this session |
| 6 | GitHub auto-merge cannot be enabled on a draft PR; must call `markPullRequestReadyForReview` first | A | GitHub/Harness official docs (see Sources) |
| 7 | `dream-machine ledger signals` (built CLI, this commit): `zeroMergeStreak: true`, `nightsConsidered: 7` | A (MEASUREMENT, real tool) | `node packages/cli/dist/bin.js ledger signals --path docs/dream-cycle/LEDGER.md`, this session |
| 8 | `dream-machine ledger verify`: 9 schema errors in rows 2-6 (verdict/evaluated enum violations), unfixed since row 9 (2026-09-08) flagged them | A (MEASUREMENT) | same CLI, this session |
| 9 | Industry pattern: agent-authored PR volume outpacing reviewer capacity is a widely-reported 2026 phenomenon (not unique to this repo) | B | secondary trade-press summaries of named studies; see Sources |

Evidence classification: items 1-5, 7-8 are OBSERVATION/MEASUREMENT (live tool/API output, not
inferred). Item 6 is INFERENCE from an authoritative but non-live-tested source (no mutating
auto-merge call was attempted against a real PR — doing so, even if expected to fail, would be
an unnecessary mutating call against shared GitHub state and was avoided deliberately). Item 9 is
context, not load-bearing for the verdict.

## Testability Gate (STEP 5-9)

Testable tonight: yes, entirely via live, read-only `gh`/MCP GitHub API calls and the repo's own
built CLI — no model calls needed (`LLM_EVAL=blocked`, no `OPENROUTER_API_KEY`, matches every
prior night). No application-code candidate is proposed; `npm test` baseline reconfirmed
unaffected (106/106, unchanged from PR #9's tip — see Evaluation Receipt).

## Candidate

**None.** Five directions were scored before this one was selected as a diagnostic, non-code
night:

| Candidate | Fit | Novelty | Testability | Measurability | Prod-value | Reviewability | Total |
|---|---|---|---|---|---|---|---|
| **1. Isolate draft-state as 2nd independent auto-merge blocker (selected)** | 5 | 4 | 5 | 5 | 5 | 5 | 29 |
| 2. Re-fix `--no-color=true`/`verdictColor` (already fixed in unmerged #49/#117) | 3 | 1 | 5 | 5 | 2 | 5 | 21 |
| 3. Hunt a new, undiscovered `tui.ts`/`index.ts` bug | 3 | 2 | 4 | 4 | 2 | 4 | 19 |
| 4. New backlog-integration branch (6th attempt after #18/#65/#89/#125/#129/#137) | 4 | 1 | 3 | 3 | 3 | 2 | 16 |
| 5. CLI help-text/schema drift scan | 2 | 3 | 3 | 3 | 2 | 4 | 17 |

Candidate 1 is selected without override — it scores highest and, per the ledger's own
≥3-recurrence signal, further code fixes to this surface (candidates 2-4) would duplicate
already-diagnosed, already-unmerged work rather than reduce uncertainty. Candidates 2 and 4 are
explicitly the kind of "finding repeated in ≥3 prior nights" the learning signal exists to stop.

## Evaluation Receipt

Real evaluator: live GitHub API (via MCP `github` tools) for GitHub-state claims; this repo's
own built `dream-machine` CLI (`npm run build`, this commit, clean) for ledger claims; `npm test`
for the regression baseline.

```
npm run build                 clean (6 workspaces)
npm test                      106/106 passing (0 regressions — 0 source files touched)
node .../bin.js ledger verify 9 schema errors, rows 2-6 (pre-existing, reconfirmed, not fixed)
node .../bin.js ledger signals  zeroMergeStreak: true, nightsConsidered: 7
gh (MCP) get_label automerge-safe        404 — absent
gh (MCP) pull_request_read #143 checks   7/7 green, guard-and-merge: skipped
gh (MCP) list_pull_requests (100, desc)  69 open dream-cycle PRs, #12..#143, 0 merged
gh (MCP) issue_read #10                  state: open
```

No candidate diff exists, so there is nothing to A/B against a baseline; the "evaluation" here is
the live-state measurement itself, re-queried where practical (label check + check-run read are
two independent calls that corroborate each other: a label-only cause would not explain
`guard-and-merge` *running and skipping* on a PR whose checks are otherwise all green — it
explains it exactly).

## Baseline

`main` @ `2fba2550182d81b36423447221823e98e227482a` (tip since PR #9, 2026-09-08). 106/106 tests.
`docs/dream-cycle/LEDGER.md` at 9 rows, 9 schema errors in rows 2-6, unchanged.

## Darwin Lineage

`DARWIN=not-applicable` — no evolvable code population; this is a live-infrastructure
measurement, not a code-fitness question. `@metaharness/darwin` remains unexercised tonight
(consistent with every prior developer-experience night).

## Reward-Hack Check

Independent self-critique (no candidate diff exists to tamper with a benchmark or threshold, so
the surface area for reward-hacking is the evidence-gathering itself): every numeric claim above
was produced by a tool call this session actually ran and is reproducible by re-running the same
call — none is inferred from a prior PR's claims without re-verification (PR #135's 62-open-PR
and 29-label counts were explicitly *not* reused; today's 69-open-PR count and label-404 were
independently re-queried). No evaluation gate, threshold, or gold answer exists in scope to weaken
— the finding is entirely external to this repo's own evaluator. CLEAR.

## Security Review

No new exec/network/filesystem/credential surface. Every GitHub call this session made was
read-only (`get_label`, `pull_request_read`, `list_pull_requests`, `issue_read`); no label was
created or applied, no PR was merged, undrafted, approved, or relabeled, no mutating
`enablePullRequestAutoMerge`/`gh pr merge` call was attempted (deliberately — see Evidence Log
item 6's caveat). This finding does not touch `.github/workflows/automerge.yml` or any other
protected path.

## Regression Analysis

0 source files changed. Only this report and `docs/dream-cycle/LEDGER.md` (+1 row).

## ADR

None. This is a diagnostic finding plus a process recommendation for a human (and, if this
routine's maintainer agrees, a future change to the *compiled routine's own* STEP 20-25 default —
not something this session can decide or implement unilaterally), not an architectural decision
about the repository's code.

## Competitors (context, not benchmarked against this repo's specific backlog)

| Project | Autonomous PR creation | Merge gating observed in practice | Grade |
|---|---|---|---|
| Sakana AI Scientist | Generates full research-cycle artifacts/PRs | Positioned for human-reviewed publication, not autonomous merge | C |
| OpenHands | Opens PRs from agent sessions | Resolver/action patterns default to human review; some orgs wire auto-merge for narrow, labeled cases | B |
| DSPy/GEPA | Optimizes prompts/programs, not typically PR-driven | N/A — usually library-internal, not a PR-gated workflow | C |
| SWE-agent | Produces patches for SWE-bench-style tasks | Benchmark-submission oriented, not continuous-repo auto-merge | C |
| AutoGPT lineage | General autonomous task execution | No standard built-in guarded-merge primitive; a known cautionary example of under-governed autonomy | C |

Industry-wide, 2026 trade coverage (Grade B, secondary sources, see Sources) documents the same
shape of problem this repo exhibits directly: agent-authored PR volume growing faster than human
review throughput, with much agent work merging with little or no human review *when organizations
choose to allow it* — this repo's guard is stricter than that default (requires both a label and
non-draft state), which is why it fails safe (total backlog) rather than failing open (unreviewed
merges). That is a sound design choice; the gap found tonight is that the two preconditions are
jointly unreachable as currently compiled, not that the policy itself is wrong.

Sources:
- [Automatically merging a pull request](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/automatically-merging-a-pull-request)
- [Harness Code — Auto merge PR](https://developer.harness.io/code-repository/2.0/use-harness-code/pull-requests/auto-merge-pr.md)
- [GitHub Marketplace — Enable Pull Request Automerge](https://github.com/marketplace/actions/enable-pull-request-automerge)
- [thenewstack.io coverage of agentic-PR review throughput studies](https://thenewstack.io/?p=22833309)
- [Tessl — There aren't enough chaperones for all your coding agents](https://tessl.io/blog/there-arent-enough-chaperones-for-all-your-coding-agents)

## Recommendation (for human review — this session recommends, never decides or executes)

1. A repo admin or maintainer creates the `automerge-safe` label (necessary, but per finding (b),
   *not* sufficient on its own).
2. For specific, already-green, no-protected-path backlog PRs the maintainer has actually
   reviewed (e.g. #49, #95, #117 — all touch only `packages/cli/src/*` and tests, all green), the
   maintainer marks them **ready for review** and applies the label together, in that order —
   only then can `guard-and-merge` actually run its merge step instead of skipping.
3. Separately: consider whether this routine's own compiled STEP 20-25 ("even a significant
   result stays draft") should gain a narrow, human-approved exception — e.g. a config flag a
   maintainer sets, never the session itself — for candidates meeting strict criteria, so the
   guarded-auto-merge path ADR-0001 designed is reachable by *something*, someday, without this
   session ever making that call itself.
4. Given 69 open PRs and growing by ~1-2/night, consider pausing or slowing the nightly cadence
   (or dedicating a human-triage session) until the backlog is worked down — more diagnostic
   nights alone will not shrink it.

## Witness

```
report_sha256 : 1fbfeedfa697457843f4c20c33230fd877426da246d1a825bb0da3e7b60d99a2
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : 7b4ae7661cbc1345df9aeedca21ffdfa37d0237d109ef5070e13f86b8cfe2e14
```

Self-referential-hashing caveat (same convention as issue #116's report, PR #117/#135): the
`report_sha256` above was computed by `dream-machine witness stamp` over this file as it stood
**before** this Witness section's three values were pasted back in. Verify against that
pre-stamp content: `git show <this-PR-HEAD>~1:docs/dream-cycle/2026-11-19-developer-experience-report.md`
is not available (single-commit PR), so verify instead by re-running
`node packages/cli/dist/bin.js witness stamp <this-file> 2fba2550182d81b36423447221823e98e227482a`
against the file as committed and confirming the `witness` line matches the one embedded above —
`dream-machine witness verify` performs exactly that check in one step:
`node packages/cli/dist/bin.js witness verify docs/dream-cycle/2026-11-19-developer-experience-report.md 2fba2550182d81b36423447221823e98e227482a 7b4ae7661cbc1345df9aeedca21ffdfa37d0237d109ef5070e13f86b8cfe2e14`.
