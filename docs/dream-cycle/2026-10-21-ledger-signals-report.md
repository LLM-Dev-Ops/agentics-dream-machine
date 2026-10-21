# Ledger-Signals SOTA Report — 2026-10-21

## TL;DR

This repo has run 40 consecutive nightly Dream Cycle PRs (2026-09-09 → 2026-10-20)
with **zero merges**. Every prior night that named the blocker pointed at the same
three facts (missing `automerge-safe` label, PRs left as drafts, admin-only CodeQL
setting) but never quantified the backlog's actual mergeability. Tonight does: a
real `git merge-tree` dry-run of all 40 open `dream/*` branches against the current
`main` tip (`2fba255`, which already carries the CodeQL permission fix from PR #9)
shows **zero merge conflicts** — every branch merges individually clean. Cross-
referenced against the live automerge guard's protected-path regex, **36 of 40
(90%) are both conflict-free and outside any protected path** — i.e. structurally
eligible for the `automerge-safe` label today, with no code change required. The
backlog is not stuck on conflicts or on code quality; it is stuck entirely on two
missing human actions the workflow has required, unexercised, since day one.

Candidate: `protectedPathBlocked()`, a small pure function in `@dream-machine/ledger`
that mirrors the live automerge guard's regex (byte-for-byte, frozen-baseline
tested) plus a `ledger merge-readiness` CLI subcommand, so this classification is
a reusable, testable tool rather than one-off shell output. 106→114 tests, 0
regressions, build/lint clean.

**Correction**: an earlier draft of this report and the live CLI demo first
reported this as 37/40 (92.5%). This session's own independent critic subagent
caught an off-by-one — 41 fetched branches minus 4 protected is 37, but one of
those 41 branches (`dream/2026-09-26-ledger-signals`) is stale and has no open
PR, so the correct denominator is 40, and 40 − 4 = 36. Corrected everywhere in
this document before publication; flagged in the Reward-Hack Check section.

## What's new

No prior night in this repo computed backlog-wide merge-cleanliness against the
*current* main tip. PR #79 (2026-10-16) checked pairwise conflicts *between* three
ledger-signals branches (not against main) and found real conflicts there — that
finding stands and is not contradicted: branches can conflict with *each other*
while each still merges individually clean against main. PR #83 (2026-10-18) found
and fixed (unmerged) a case-sensitivity/path-depth bypass in the exact regex this
candidate mirrors. PR #69 (2026-10-11) fixed a `ready_for_review` trigger gap in
the same guard. None of the three — nor any of the 40 nights — ran the actual
merge-tree trial across the whole backlog, or separated "would conflict" from
"nobody flipped two switches."

## Hypothesis (frozen before implementation)

> Given the 40 open `dream/*` Dream Cycle PR branches and the current `main` tip
> `2fba2550182d81b36423447221823e98e227482a` (which already carries the CodeQL
> `actions:read` permission fix from PR #9), when each branch is (a) merge-tested
> via `git merge-tree --write-tree origin/main origin/<branch>` and (b) its real
> changed-file list is classified against the live automerge guard's
> protected-path regex, then a nonzero number of branches will be found
> simultaneously conflict-free and unprotected — i.e. structurally eligible for
> the `automerge-safe` label today — subject to: no test weakened, no gold data
> touched, `protectedPathBlocked()` mirrors the live regex byte-for-byte (verified
> against a frozen baseline test reading the real committed `automerge.yml`), and
> the full `npm test` suite stays green with only additive new tests.

Not modified after evaluation began.

## Benchmarks / Evaluation

Real evaluator: `git merge-tree` (git 2.43.0, local, against the real fetched
`origin/main` and all 41 fetched `origin/dream/*` refs — one extra stale branch,
`dream/2026-09-26-ledger-signals`, has no corresponding open PR and is excluded
from backlog counts) + `npm test` (vitest) for the code candidate. `LLM_EVAL=blocked`
(no `OPENROUTER_API_KEY`) — zero model calls, by design; this finding is
deterministic git + static regex analysis, needing none.

**Backlog-wide audit (the finding):**

| Metric | Value |
|---|---|
| Open `dream/*` PRs audited | 40 |
| Merge-clean against `main`@`2fba255` | **40 / 40 (100%)** |
| Merge-conflicted against `main` | 0 |
| Touch a protected path (live regex) | 4 / 40 (`#33`, `#69`, `#73`, `#83`) |
| Clean **and** unprotected (automerge-eligible today) | **36 / 40 (90%)** |

Full per-branch CSV and the branch→PR legend are in the committed copy of this
report, `docs/dream-cycle/2026-10-21-ledger-signals-report.md` (this PR).

**Code candidate receipt:**

| | Parent (`2fba255`) | Candidate |
|---|---|---|
| `npm test` | 106/106 | **114/114** (+8, 0 removed/modified) |
| `npm run lint` | clean (exit 0) | clean (exit 0) |
| `npm run build` | clean (6 workspaces) | clean |
| `npm run typecheck` | pre-existing `TS18002` (empty `tsconfig.json` `files`) | identical, reproduced on parent — unrelated |
| Live CLI demo vs. real `git merge-tree` ground truth | n/a | exact match |

Diff: 5 files (4 code + this report), +181/−1 code, one conceptual change (a
pure protected-path mirror + CLI surface), well under the 300-line target.

## Darwin (bounded evolution)

`DARWIN=not-applicable`. This is a deterministic measurement + a small pure
classifier, not an optimization over a metric with an evolvable population.
Bounded Darwin was not run.

## Evidence

OBSERVATION (40 open draft PRs, 0 merged since `#9`; `git branch -r` confirms
41 local `dream/*` refs) → MEASUREMENT (`git merge-tree` 40/40 clean;
protected-path regex hits 4/40; `npm test` 106→114) → INFERENCE (grade A,
locally reproducible: the backlog is blocked by the guard's own
by-design human-gate, not by conflicts or code quality) → DECISION (ship the
reusable classifier + the one-time audit; do not automate the label
application, which would cross the "never self-promote" line).

## Reward-Hack Check

Independent critic subagent (separate context, no shared state with the
author, told to reproduce everything cold rather than trust the claims).
**Verdict: CLEAR, with one required fix, applied.** The critic independently
reproduced the baseline/candidate test counts (106→114, 0 regressions, 0
pre-existing tests weakened or removed — confirmed by diffing the test files,
not inferred from the count alone), independently verified the regex mirror
is byte-for-byte identical to the live `automerge.yml` line (including its
case-sensitivity, i.e. its known bypass gap is faithfully mirrored, not
hidden), and independently re-ran `git merge-tree` + the protected-path
classification on a 20-branch sample across all 5 DEEP surfaces and both
months, getting an exact match. It found **a genuine off-by-one in the
headline number**: 37/40 was computed as 41 fetched branches minus 4
protected, then mislabeled against the 40-branch (post-stale-exclusion)
denominator without re-subtracting the stale branch from the eligible count.
Correct figure: 40 − 4 = **36/40 (90%)**. Fixed everywhere in this document
and the committed report before this PR was opened. No benchmark/gold data
was touched, no test was weakened, no cherry-picking, no exploitation of the
evaluator, no hidden cost — the underlying git commands are real,
independently reproduced, and not fabricated or approximated.

## Security Review

The candidate is a pure function over caller-supplied `string[]` plus a CLI
flag parsed with `JSON.parse` inside a `try/catch` (existing pattern in this
file, e.g. `ledger append`'s flags) — zero new I/O, network, exec, or
credential surface, and zero new dependency. It does not touch
`.github/workflows/automerge.yml` or any gate/threshold/benchmark file. The
backlog audit itself ran only read-only `git` commands against already-fetched
refs and read-only GitHub list/read API calls — no label, review, merge, or
write action was taken against any PR or issue. `npm audit` on `main` is
unchanged by this diff (tracked separately by PR #73, not duplicated).

## Scan Findings

**witness**: this repo's own witness-stamp convention (established 2026-08-13,
reaffirmed 2026-09-08) already documents that a report's hash cannot be
computed over a file containing its own hash — the Witness section of a
to-be-hashed report must describe the convention and defer the actual
`REPORT_HASH`/`WITNESS` values to the PR body and `LEDGER.md` row, never embed
them in itself. PR #30 (2026-09-19, open/unmerged) separately tracks a
"witness self-reference bug" — not re-diagnosed tonight, but this report
follows the same non-circular convention to avoid reproducing it.

**verify**: `dream-machine ledger verify` on the committed `LEDGER.md` → 9
schema errors (rows 2–6, bulk-inserted foreign-repository rows). PR #33
(2026-09-21, open/unmerged) already proposes quarantining these; not
duplicated here, only reconfirmed.

## Competitors / prior art (evidence grade)

- **GitHub's own `mergeable_state`/`mergeable` API field** (A — official, used
  tonight to corroborate `unstable` on sampled PRs, consistent with "blocked on
  required-review", not "has merge conflicts" — this session's GitHub tools do
  not expose a plain per-PR conflict boolean distinct from check-run state,
  which is exactly why the real `git merge-tree` trial was necessary instead of
  trusting the API field alone).
- **Mergify / Kodiak (merge-queue bots)** (B — vendor docs): both solve
  precisely this class of problem (auto-merge once criteria are met) via a
  continuously re-evaluated queue; this repo's `automerge.yml` is a
  hand-rolled, label-gated, single-shot version of the same idea, correctly
  scoped down per its own ADR-0001 guardrails (protected-path exclusion, human
  label requirement).
- **Dependabot's own auto-merge** (A — official): same "label + required
  checks" pattern; notably 6 of this repo's open PRs are dependabot PRs not
  examined by tonight's cycle (out of scope — the Dream Machine's own
  candidates, not a dependency-bump audit).
- **Sakana AI Scientist / OpenHands / SWE-agent lineage** (C — single-source
  framing): none of these published pipelines model "a candidate backlog that
  never gets a merge decision" as a first-class failure mode the way this
  repo's own ADR-0001 merge policy does; this is this repo's own design
  question, not one borrowed from the literature.
- **DSPy/GEPA** (C): optimizes a program against a metric with a human-free
  loop — explicitly the wrong shape here, since ADR-0001 requires a human in
  the loop for exactly this decision, not a target to optimize away.

## Appendix: full per-branch audit data

Raw `git merge-tree --write-tree origin/main origin/<branch>` (exit 0 = clean)
+ `git diff --name-only origin/main...origin/<branch>` + protected-path-regex
hit count, for every fetched `dream/*` branch, against `origin/main` @
`2fba2550182d81b36423447221823e98e227482a`:

```csv
branch,merge_clean,exit_code,changed_file_count,protected_hit
dream/2026-09-09-developer-experience,true,0,7,0    # PR #12
dream/2026-09-10-compiler-parity,true,0,4,0         # PR #14
dream/2026-09-11-ledger-signals,true,0,6,0          # PR #16
dream/2026-09-12-evaluation-adapters,true,0,6,0     # PR #18
dream/2026-09-13-security-adversarial,true,0,6,0    # PR #20
dream/2026-09-14-developer-experience,true,0,6,0    # PR #22
dream/2026-09-15-compiler-parity,true,0,2,0         # PR #23
dream/2026-09-16-ledger-signals,true,0,2,0          # PR #24
dream/2026-09-17-evaluation-adapters,true,0,6,0     # PR #26
dream/2026-09-18-security-adversarial,true,0,2,0    # PR #28
dream/2026-09-19-developer-experience,true,0,16,0   # PR #30
dream/2026-09-20-compiler-parity,true,0,2,0         # PR #31
dream/2026-09-21-ledger-signals,true,0,8,1          # PR #33 (.github/workflows/ci.yml)
dream/2026-09-22-evaluation-adapters,true,0,9,0     # PR #35
dream/2026-09-23-developer-experience,true,0,6,0    # PR #37
dream/2026-09-24-developer-experience,true,0,4,0    # PR #39
dream/2026-09-25-compiler-parity,true,0,2,0         # PR #41
dream/2026-09-26-ledger-signals,true,0,6,0          # stale, no open PR — excluded from the 40/36 counts
dream/2026-09-26-ledger-signals-audit,true,0,2,0    # PR #43
dream/2026-09-27-evaluation-adapters,true,0,5,0     # PR #45
dream/2026-09-28-security-adversarial,true,0,2,0    # PR #47
dream/2026-09-29-developer-experience,true,0,4,0    # PR #49
dream/2026-09-30-compiler-parity,true,0,5,0         # PR #51
dream/2026-10-01-evaluation-adapters,true,0,2,0     # PR #53
dream/2026-10-04-developer-experience,true,0,4,0    # PR #55
dream/2026-10-05-compiler-parity,true,0,4,0         # PR #57
dream/2026-10-06-ledger-signals,true,0,7,0          # PR #58
dream/2026-10-07-evaluation-adapters,true,0,2,0     # PR #61
dream/2026-10-08-security-adversarial,true,0,3,0    # PR #63
dream/2026-10-09-developer-experience,true,0,5,0    # PR #65
dream/2026-10-10-compiler-parity,true,0,2,0         # PR #67
dream/2026-10-11-ledger-signals,true,0,5,1          # PR #69 (.github/workflows/automerge.yml)
dream/2026-10-12-evaluation-adapters,true,0,2,0     # PR #71
dream/2026-10-13-security-adversarial,true,0,3,1    # PR #73 (package-lock.json)
dream/2026-10-14-developer-experience,true,0,2,0    # PR #75
dream/2026-10-15-compiler-parity,true,0,2,0         # PR #76
dream/2026-10-16-ledger-signals,true,0,6,0          # PR #79
dream/2026-10-17-evaluation-adapters,true,0,4,0     # PR #81
dream/2026-10-18-security-adversarial,true,0,6,1    # PR #83 (.github/workflows/automerge.yml)
dream/2026-10-19-developer-experience,true,0,2,0    # PR #85
dream/2026-10-20-compiler-parity,true,0,4,0         # PR #87
```

40 branches have an open PR (the `dream/2026-09-26-ledger-signals` row is
excluded, superseded same night by `-audit`/PR #43). All 40 merge clean; 4
touch a protected path; 36 are both clean and unprotected.

## Gist

No `gh gist create`-equivalent tool available to this session. `GIST=LOCAL`.
Full report committed at `docs/dream-cycle/2026-10-21-ledger-signals-report.md`
(this PR), byte-identical to this file.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so — per
the established convention in this repo since 2026-08-13/2026-09-08 — the
stamp cannot be written *inside* the file it stamps without changing the
hash it reports. The committed copy at
`docs/dream-cycle/2026-10-21-ledger-signals-report.md` is the frozen, hashed
artifact; `REPORT_HASH` and `WITNESS` are published in the PR body and the
`LEDGER.md` row, both pointing back at this file by path and session commit.
Anyone can independently reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-10-21-ledger-signals-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "2fba2550182d81b36423447221823e98e227482a" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

## Recommendation

For the human: the 36-PR "clean + unprotected" list in the committed report is
now a literal checklist — mark ready-for-review and apply `automerge-safe` to
any of them to exercise the guard for the first time in this repo's history.
Recommend starting with the smallest, lowest-review-burden ones (#53/#61/#71/
#76 — "no new candidate" nights) to validate the mechanism before the larger
ones. Re-run this audit after each merge: it is a snapshot against one `main`
tip, and several backlog PRs independently touch `docs/dream-cycle/LEDGER.md`
and would collide on that one shared line even though none conflict with
today's `main`. If/when PR #83 merges, update `AUTOMERGE_PROTECTED_PATH_REGEX`
in `packages/ledger/src/index.ts` to match its fixed regex — tonight's mirror
is intentionally the pre-fix, currently-live version, and will silently drift
otherwise (flagged in-code and in this candidate's own test suite).
