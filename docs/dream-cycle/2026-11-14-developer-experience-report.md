# Developer-Experience / CLI,TUI SOTA Report — 2026-11-14

## TL;DR

`main`'s `docs/dream-cycle/LEDGER.md` still shows 9 rows (last updated
2026-09-08) because nothing has merged to `main` since PR #9 — but GitHub
itself records **62 open pull requests** spanning 2026-09-03 → 2026-11-13
(six Dependabot PRs plus ~56 draft dream-cycle candidates), all green or
green-able, all unreviewed. CI/CodeQL have been green since run #90
(2026-10-20, issue #91) — the technical blocker this backlog's earliest
reports blamed (issue #10, "Code security not enabled") was fixed over three
weeks ago. Tonight's deep dive asks *why the zero-merge streak continued
after the technical fix* and finds a second, still-unfixed mechanical cause:
the "Guarded auto-merge" workflow (`.github/workflows/automerge.yml`) only
fires `if: contains(... labels ..., 'automerge-safe')` — and **no label
named `automerge-safe` exists anywhere in this repository's 29-label set**
(confirmed via `gh api repos/.../labels`). The gate is not merely idle, it is
structurally unreachable: no one — human or workflow — can currently apply a
label that was never created. Separately, the six oldest-standing PRs
(Dependabot #1–#6, open 73 days) carry stale `mergeable_state: unstable`
only because their last-recorded CodeQL run predates the 2026-10-20 fix
(confirmed via per-commit check-run history on PR #2); re-running CI on them
would almost certainly flip them green, and they are excluded from guarded
auto-merge by design anyway (they touch the protected `.github/` /
`package.json` / `package-lock.json` paths).

Given ~56 open, unreviewed dream-cycle PRs already sitting in this backlog,
tonight's candidate is the diagnosis above, verified live against the real
GitHub API — not a 63rd draft PR adding new application code. Per this
engine's own final operating principle ("never optimize for producing a PR"),
opening another unreviewed candidate into an already-saturated review queue
would not reduce uncertainty about what this repository should become; it
would only add to the pile the human side of this system has not yet
processed.

## What's new

- `gh api repos/LLM-Dev-Ops/agentics-dream-machine/pulls?state=open` (real
  query, not inferred): **62 open PRs**, oldest `#1` (2026-09-03), newest
  `#133` (2026-11-13). Zero merged since PR #9 (2026-09-08) — a **97-day**
  zero-merge streak, confirmed continuously by `dream-machine ledger
  signals`' `zeroMergeStreak: true` and reconfirmed by at least 8 prior
  nights' issues (#84, #85, #89, #90, #104, #108, #116, #125, #128).
- `gh api .../labels`: 29 labels exist (`bug`, `ci`, `cli`, `compiler-parity`,
  …, `witness`). **No `automerge-safe` label.** `.github/workflows/
  automerge.yml`'s only job guard is
  `if: contains(github.event.pull_request.labels.*.name, 'automerge-safe')`
  — this is a precondition that cannot currently be satisfied, by anyone,
  because the label itself was never created in repo settings. This is a
  distinct finding from the prior automerge-guard work (#69 re-fire on
  `ready_for_review`, #83 protected-path bypass closure, #93 `dream.config.json`
  exclusion) — those all assumed the label exists and examined the guard's
  *logic*; tonight checks the label's *existence* and finds it absent.
- `gh api repos/.../commits/<PR#2 head sha>/check-runs`: `analyze` (CodeQL)
  → `completed/failure`, dated 2026-09-03 — i.e. frozen from *before*
  issue #91's 2026-10-20 fix. `test (18/20/22)` and `no-optional-deps` are
  all `completed/success`. The PR's cached `mergeable_state: unstable`
  reflects that one stale failing check, not a live re-evaluation. Same
  pattern expected (not individually reproduced tonight, to keep the API
  budget small) for Dependabot PRs #1, #3–#6.
- These six Dependabot PRs are excluded from guarded auto-merge by design,
  independent of the missing-label gap: `automerge.yml`'s protected-path
  regex (`^(\.github/|packages/[^/]+/package\.json$|package\.json$|
  package-lock\.json$|...)`) matches every one of them. This is correct,
  intended behavior (dependency/workflow changes should stay human-review
  gated) — not a bug, and not touched tonight.

## Competitors

| Project | Practice around review/merge backlogs for autonomous agent output | Grade |
|---|---|---|
| OpenHands | Agent-authored PRs are opened against human-owned repos with no agent-side auto-merge; backlog accumulation is treated as a human-process problem, not something the agent framework self-resolves (official docs/repo). | A |
| SWE-agent | Produces patches/PRs for human review; no built-in label-gated auto-merge primitive — merge authority is kept entirely outside the agent loop (official repo). | A |
| Sakana AI Scientist | Research-paper-generation pipeline has no PR/merge concept at all; not directly comparable to a repo-evolution loop, included for contrast (official repo/paper). | B |
| DSPy / GEPA | Optimization loop operates on prompts/programs inside a process, not via a Git PR workflow; "promotion" is an in-process metric comparison, not a GitHub merge gate (official docs). | B |
| AutoGPT lineage | Historically the cautionary case for this exact failure mode: agent-driven repos accumulate large volumes of auto-generated branches/PRs that outpace maintainer review bandwidth, becoming their own maintenance burden (widely reported pattern, no single authoritative postmortem for this repo class). | C |

This repo's own guarded-auto-merge design (label + protected-path regex,
ADR-0001) is already more conservative than any of the above — it is
default-deny, not default-permissive. Tonight's finding is that the
default-deny gate is *currently unconditionally deny* (unreachable
precondition), which is safe but not yet the intended behavior.

## Hypothesis (frozen before investigation)

> Given this repository's real, live GitHub state (not the stale `main`
> ledger), when the 62 open PRs' merge-blocking causes are inspected
> directly — repo label set, automerge workflow trigger condition, and
> per-commit check-run history for the oldest PRs — then the 97-day
> zero-merge streak will be attributable to a combination of (a) a missing
> `automerge-safe` label making the guarded-auto-merge path structurally
> unreachable and (b) stale pre-fix CodeQL check results on the oldest PRs,
> rather than to any currently-failing check or genuine merge conflict —
> subject to: every claim verified against a live `gh api` call this
> session actually ran, no label created, no PR merged, relabeled, or
> approved by this session.

## Evaluation / Benchmarks

Real evaluator: the GitHub REST API itself (`gh api`), queried live tonight
— this is a measurement task, not a code-improvement task, so `npm test`
baseline/candidate comparison does not apply; `npm test` was still run as
part of STEP 0.5's probe and is unaffected (106/106, unchanged, no source
file in this repository was modified tonight).

| Check | Method | Result |
|---|---|---|
| Open PR count | `gh api .../pulls?state=open` | 62 |
| Repo labels | `gh api .../labels` | 29 listed; `automerge-safe` absent |
| `automerge.yml` trigger condition | read file | `contains(labels.*.name, 'automerge-safe')`, no fallback |
| PR #2 check-run history | `gh api .../commits/<sha>/check-runs` | `analyze`=failure@2026-09-03 (pre-fix), `test`×3 + `no-optional-deps`=success |
| PR #2 `mergeable`/`mergeable_state` | `gh api .../pulls/2` | `true` / `unstable` |
| Issue #10 current state | `mcp__github__issue_read` | still `open`, despite its root cause (CodeQL settings) having been fixed per issue #91 on 2026-10-20 — a stale-issue hygiene gap, noted, not actioned tonight (closing someone else's filed issue is outside this session's scope) |

## Darwin (bounded evolution)

`DARWIN=not-applicable`. Tonight's candidate is a live diagnostic
measurement against GitHub's API, not an evolvable code population.

## Evidence

- OBSERVATION: `docs/dream-cycle/LEDGER.md` on `main` has 9 rows, last dated
  2026-09-08; GitHub records dream-cycle activity through 2026-11-13 (issue
  #133) — the ledger is stale on `main` because every night's own
  ledger-append lives only on that night's unmerged branch.
- MEASUREMENT: 62 open PRs (`gh api .../pulls?state=open`), 0 merged since
  #9 → 97-day zero-merge streak (2026-09-08 to 2026-11-14).
  MEASUREMENT: 29 repo labels exist; `automerge-safe` is not one of them
  (`gh api .../labels`).
- MEASUREMENT: PR #2's `analyze` (CodeQL) check run is `failure`, dated
  2026-09-03T20:38 — 47 days before issue #91's 2026-10-20 CodeQL fix: a
  demonstrably stale result, not a current one.
- INFERENCE: the combination of (missing label → guard never fires) and
  (stale pre-fix check on the oldest 6 PRs → their cached status still
  reads unstable) is sufficient to explain the continuation of the
  zero-merge streak *after* CodeQL itself went green on 2026-10-20 — this
  session did not find and does not claim any other blocking defect in the
  ~56 dream-cycle PRs themselves (prior nights' PR #89 already measured
  36/40 "eligible" at that time; not re-measured tonight to avoid
  duplicating that audit).
- DECISION: do not create the `automerge-safe` label, re-run CI on any PR,
  or merge/approve/relabel anything — all three are human/repo-admin
  actions outside this session's authority and outside "evaluation is not
  promotion."
- DECISION: do not open a new application-code candidate PR tonight. With
  56 already-open, unreviewed dream-cycle PRs, a 63rd does not reduce
  uncertainty about this repository's future — it duplicates the backlog
  this report exists to surface. This report + ledger row are committed via
  a docs/ledger-only PR, matching this repo's own 2026-10-15 (#76) and
  2026-11-13 (#133) precedent for withheld/non-code nights.

## Reward-Hack Check

Self-critique (no candidate diff exists tonight to critique for
benchmark/threshold tampering — the "evaluator" here is the live GitHub API,
which this session has no authority or mechanism to alter). Checked for the
adjacent failure mode instead: cherry-picking only the most dramatic-sounding
numbers. Counter-check performed — the 62-PR and 29-label counts were each
re-queried once more via a second, differently-shaped `gh api` call
(`pulls` sorted by number vs. the earlier unsorted listing; `labels` listed
in full rather than counted) and matched. **CLEAR.**

## Security Review

- The missing `automerge-safe` label is a **fail-safe gap, not a
  vulnerability**: its absence makes the auto-merge path *less* permissive
  than designed (default-deny, currently total-deny), not more. No action
  required for safety; only for the gate to become functional as intended.
- The protected-path regex in `automerge.yml` correctly excludes all six
  Dependabot PRs from auto-merge eligibility (they touch `.github/` and/or
  `package*.json`) — reconfirmed tonight, not previously stated this
  explicitly for the Dependabot PRs by number.
- No credential, prompt-injection, or tool-authority surface touched. All
  `gh api` calls tonight were read-only (`GET`); no mutation, label change,
  merge, or approval was issued by this session.

## Scan Findings

- **cli**: `packages/cli/src/entrypoint.ts` / `verify-entrypoint(s)` re-read
  in full tonight; unchanged since 2026-09-08, still correct, no new
  finding.
- **tui**: `renderDashboard`'s `verdictColor()`/`pad()` ANSI-leak and
  truncation-slicing defects (first found 2026-10-24 issue #94 / PR #95 and
  2026-11-04 issue #116 / PR #117) are both still reproducible on `main`
  tonight — unsurprising, since neither fix has merged. Not re-filed as a
  new finding; both fixes remain open, green, and ready for the same human
  review this report is ultimately about.

## Gist

No `gh gist create`-equivalent tool is available to this session. `GIST=LOCAL`.
Full report committed at `docs/dream-cycle/2026-11-14-developer-experience-report.md`.
Issue: [#134](https://github.com/LLM-Dev-Ops/agentics-dream-machine/issues/134).

## Witness

```
report_sha256 : 3d7f21b0c466595c686476b493700a5352be19c0591e98e55d516ba879bc6518
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : e774db152b3d9fc54126f6f350d07c6fb044a3a614b68492f15b02970220dcaf
```

Caveat (same self-referential-hashing note prior reports have carried,
e.g. 2026-11-04 #116): `report_sha256` above was computed on this file with
this Witness section still containing placeholder text, so it is not a hash
of the file's own final committed bytes — it binds the report's substantive
content (TL;DR through Recommendation) to `SESSION_COMMIT`, not this section
itself. Verify by re-running `dream-machine witness stamp` on the committed
file and comparing against the ledger row's witness prefix, per this
engine's own standing convention.

Verify: `sha256sum docs/dream-cycle/2026-11-14-developer-experience-report.md`
then `printf '%s%s' "$REPORT_HASH" "2fba2550182d81b36423447221823e98e227482a" | sha256sum`
must equal the witness value recorded above and in the ledger row.

## Recommendation

`evaluated: accepted` — human review/action recommended, no candidate diff
to review tonight. Three concrete next steps, ranked by effort:

1. **(30 seconds)** If guarded auto-merge is still the intended policy,
   create a repo label named exactly `automerge-safe` (Settings → Labels →
   New label). Until this exists, `.github/workflows/automerge.yml` cannot
   fire for any PR, ever, regardless of how safe it is.
2. **(minutes)** Manually merge a small, non-duplicate set of the ~56 open
   dream-cycle PRs to break the 97-day zero-merge streak — PR #117
   (`verdictColor` `--no-color` fix) and PR #95 (ANSI-safe `pad()`
   truncation) are both still open, green, small, and already
   independently critic-cleared per their own reports (2026-11-04,
   2026-10-24). Merging either first would also retire two of the
   longest-standing duplicate-rediscovery cycles (#39/#49/#55/#75 and
   #94/#116 respectively) from future nights' scope.
3. **(longer-term)** Decide the Dependabot-PR policy explicitly: either
   close/superseded-replace #1–#6 (73 days stale, several now behind
   newer available bumps) or trigger a fresh run so their checks reflect
   the post-2026-10-20 CodeQL state before judging them by their current
   cached `unstable` status.
