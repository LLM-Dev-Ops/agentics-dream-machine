# Dream Cycle 2026-09-14 — Developer Experience SOTA Report

**Rotation**: `DAYINT=20260914`, `SLOT=4` → `DEEP=developer-experience`, `SCAN=cli,tui`.
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`. No bonus deep dive
(`DAYINT % 25 = 14`, `DAYINT % 75 = 39`).

## TL;DR

`dream-machine ledger append` currently writes any row it's given — including
rows with a verdict, `evaluated` value, or date that `dream-machine ledger
verify` would immediately reject — with exit code 0 and no warning. The
schema-validation logic already exists (`verifyLedger`'s per-row checks); it
just never runs until an unrelated, separate `ledger verify` invocation, by
which point the ledger is already corrupted. Tonight's candidate extracts that
logic into a shared `validateRow()` and calls it *before* the write, so
`ledger append` now refuses (exit 1, file untouched) any row that would fail
verification, while `ledger verify` itself is unchanged (same errors, same
tests, refactored not rewritten).

## What's new

- Live-reproduced the gap on this repo's own `LEDGER.md`: `ledger append
  --verdict NOT_A_VERDICT --evaluated maybe` wrote the row, exited 0, and only
  `ledger verify` (a separate command a caller has to remember to run) caught
  it afterward.
- This is not hypothetical for this repo: `LEDGER.md` on `main` already
  carries **9 structural errors on rows 2–6**, first flagged in the
  2026-09-08 report and reconfirmed unchanged on 2026-09-11 — exactly the
  failure mode append-time validation would have prevented at the source.
- Incidental finding (not fixed tonight, logged as a scan finding below): the
  shared date check is regex-shape-only (`^\d{4}-\d{2}-\d{2}$`), so a
  calendar-invalid date like `2026-13-99` still passes both the old and the
  new check.

## Ledger check

`docs/dream-cycle/LEDGER.md` on `main` has 7 dated data rows (2026-08-13
through 2026-09-08) plus the known cross-context contamination on rows 1–6
documented in the 2026-09-08 and 2026-09-11 reports (issue/PR numbers from
other repositories) — unchanged again tonight, not re-litigated here.
`FALLBACK=false` — GitHub MCP access works.

Re-checked the fate of the last 7 rows'/nights' issues and PRs live via
`pull_request_read` (not `list_pull_requests`, whose `merged` field the
2026-09-11 report already caught misreporting `false` for PRs that are
actually merged):

| Night | Issue | PR | Live state |
|---|---|---|---|
| 2026-08-13 … 2026-08-26 | — | — | rows reference issues/PRs/repos that do not exist in *this* repo (pre-existing contamination, not re-verified line-by-line again tonight) |
| 2026-09-08 security-adversarial | #7 (closed) | #8 | **merged** 2026-09-08 |
| — (same-day correction) | #10 | — | **open** — repo-settings blocker (GHAS/Code Security not enabled), needs a human with admin access, no code fix possible |
| 2026-09-09 developer-experience | #11 (open) | #12 | **open, draft, unmerged** — 5 calendar nights now |
| 2026-09-10 compiler-parity | #13 (open) | #14 | **open, draft, unmerged** — 4 calendar nights |
| 2026-09-11 ledger-signals | #15 (open) | #16 | **open, draft, unmerged** — 3 calendar nights; this is the night that *first* flagged `LEDGER.md` as 3-nights-stale |
| 2026-09-12 evaluation-adapters | #17 (open) | #18 | **open, draft, unmerged** — 2 calendar nights |
| 2026-09-13 security-adversarial | #19 (open) | #20 | **open, draft, unmerged** — 1 calendar night |

**Consequence for tonight's learning signals**: PR #8 is in fact merged, so
the *literal* `zeroMergeStreak` (no PR in the window known-merged) is false —
but that's cold comfort: five candidate PRs in a row (#12/#14/#16/#18/#20)
sit open, draft, and un-reviewed, each waiting on the same bottleneck (human
review bandwidth), and `LEDGER.md` on `main` has had no new row appended
since 2026-09-08 even though five more nights of real, evaluated work exist
in open PRs. This is now a **6-calendar-night-stale** ledger (up from the
3 nights flagged on 2026-09-11), a fact `dream-machine ledger signals` run
against `main`'s own ledger right now still cannot report, because the
`nightsSinceLastRow` signal that would say so exists only in still-unmerged
PR #16.

Per STEP 1.1: no single finding text has repeated ≥3 times verbatim (so no
forced slot rotation), but the *meta*-finding — draft PRs accumulating faster
than they're reviewed — has now been independently surfaced by three
consecutive nights (09-11, and implicitly 09-12/09-13 by continuing to add to
the pile without addressing it). Tonight's bias, per the "review bandwidth is
the bottleneck" reading of that pattern: keep the candidate small and
self-contained rather than adding another cross-cutting change that
compounds the review backlog.

## Deep dive: developer-experience

**Hypothesis (frozen before implementation):**

> Given this repo's own `dream-machine ledger append` command and the
> validation logic `verifyLedger` already implements (date format,
> verdict/evaluated enum membership), when that same validation runs
> *before* the write instead of only being available via a separate
> `ledger verify` call afterward, then `ledger append` should refuse (exit
> code 1, target file byte-identical to before the call) any row with a
> malformed date or an out-of-range verdict/evaluated value — while a
> well-formed row still appends exactly as before and `ledger verify`'s own
> behavior, error text, and existing test suite stay unchanged — subject to:
> zero pre-existing tests weakened/removed, `validateRow()` stays pure (no
> I/O), and the check is a straight extraction (not a re-implementation) so
> `verifyLedger` and `ledger append` can never disagree on what's valid.

**Candidate** (99 changed lines, one conceptual change, `git diff --stat`):

- `packages/ledger/src/index.ts`: new pure export `validateRow(row):
  string[]`, containing exactly the three per-row checks `verifyLedger`
  already ran inline; `verifyLedger` refactored to call it (loop replaced
  with `for (const e of validateRow(r)) errors.push(\`row ${i+1}: ${e}\`)`) —
  identical error strings, identical behavior.
- `packages/cli/src/index.ts`: the `ledger append` handler now calls
  `validateRow(row)` before `appendRow`/`writeFile`; on any error it prints
  `ledger append: refusing to write an invalid row (<path> left unchanged):`
  plus each error, and returns exit 1 without touching the file.
- Tests: 3 new in `packages/ledger/src/index.test.ts` (accepts a well-formed
  row; flags all three error classes at once; asserts `validateRow` and
  `verifyLedger` agree byte-for-byte on the same malformed row, so they can't
  silently drift apart), 2 new in `packages/cli/src/index.test.ts` (refuses
  a bad verdict and leaves the mock filesystem's file byte-identical; refuses
  a bad date + bad evaluated together and confirms the file was never
  created).

## Evaluation Receipt

Real evaluator: `npm test` (vitest), fresh `npm ci && npm run build`.

```
Baseline  (2fba255): 106/106 tests
Candidate           : 111/111 tests, 0 regressions, 0 weakened/removed tests
Lint                : clean
Typecheck           : fails identically before AND after with the same
                       pre-existing, unrelated root tsconfig.json error
                       (TS18002, empty "files" list) — confirmed via
                       `git stash` A/B, matches the 2026-09-11 report's
                       identical finding.
```

Live CLI receipt, against this repo's own real `LEDGER.md` (copied to a
scratch path, not run against `main`'s file directly):

```
$ node packages/cli/dist/bin.js ledger append --path LEDGER.md \
    --date 2026-13-99 --deep test --finding "bogus test row" \
    --verdict NOT_A_VERDICT --evaluated maybe
ledger append: refusing to write an invalid row (LEDGER.md left unchanged):
  - verdict "NOT_A_VERDICT" not in ACCEPT|REJECT|INCONCLUSIVE
  - evaluated "maybe" not in yes|no|blocked
$ echo $?
1
$ diff LEDGER.md <pre-call copy>   # identical — no corruption written

$ node packages/cli/dist/bin.js ledger append --path LEDGER.md \
    --date not-a-date --deep test --finding x --verdict ACCEPT --evaluated yes
ledger append: refusing to write an invalid row (LEDGER.md left unchanged):
  - date "not-a-date" is not YYYY-MM-DD
$ echo $?
1

$ node packages/cli/dist/bin.js ledger append --path LEDGER.md \
    --date 2026-09-14 --deep developer-experience \
    --finding "validate ledger append rows before writing" \
    --verdict ACCEPT --evaluated yes
appended row to LEDGER.md (verdict=ACCEPT)
$ echo $?
0
```

Note that `2026-13-99` (an out-of-range month/day) still *passes* — the
shared date check is regex-shape-only. See Scan Findings.

## Baseline

Commit `2fba2550182d81b36423447221823e98e227482a`, 106/106 tests. `ledger
append` existed with zero pre-write validation; `verifyLedger`'s three checks
were only ever reachable via a separate `ledger verify` invocation.

## Darwin Results

`DARWIN=not-applicable` — no evolvable population for a small, deterministic
validation extraction; nothing here is a search/optimization problem.

## Evidence

- OBSERVATION: `ledger append --verdict NOT_A_VERDICT --evaluated maybe` on
  this repo's own `LEDGER.md` exits 0 and writes the row (reproduced live,
  pre-candidate, both against a scratch copy and confirmed by code reading).
- MEASUREMENT: baseline 106/106 → candidate 111/111, `git diff --stat` = 99
  changed lines across 4 files, lint clean, typecheck identical before/after.
- INFERENCE: the 9 unresolved structural errors on `LEDGER.md` rows 2–6
  (flagged 2026-09-08, reconfirmed unchanged 2026-09-11, reconfirmed
  unchanged again tonight) are consistent with — though not proven caused
  by — the absence of exactly this kind of write-time gate; append-time
  validation would have refused to write malformed verdict/evaluated values
  had it existed when those rows were first appended, but the contaminated
  rows' provenance (a cross-repo pollution event) predates any evidence this
  session has access to, so causation is not claimed, only consistency.
- DECISION: extract-and-reuse rather than re-implement, specifically so
  `validateRow`/`verifyLedger` cannot drift apart (enforced by a test that
  asserts both report the identical error set for the same malformed row).
- REJECTION: considered also validating required-field non-emptiness (date/
  deep/finding blank) at append time; rejected as scope creep — `verifyLedger`
  itself doesn't check for blank fields today, so adding that check only to
  `append` would make the two validators diverge, which is exactly what
  tonight's design (shared `validateRow`) is meant to prevent. Logged as a
  possible future finding, not attempted tonight.

## Reward-Hack Check

Independent critic pass (adversarial self-review, distinct from the
candidate's construction): **CLEAR**.
- Did not weaken `verifyLedger` or any pre-existing test — same error
  strings, same test assertions, all pre-existing `verifyLedger` tests pass
  unmodified against the refactored implementation.
- Did not alter gold data — no benchmark/gold corpus involved.
- Did not cherry-pick — the two new CLI tests assert both the exit code
  *and* that the target file is left unchanged (`toBe(before)` /
  `toBeUndefined()`), not just the stdout/stderr text, so a hollow "prints a
  warning but writes anyway" implementation would fail them.
- Did not exploit the evaluator, hide cost, touch a threshold, or rely on an
  undocumented cache.
- One real gap, disclosed above and in Scan Findings rather than hidden: the
  date check is shape-only, not calendar-valid — carried over unchanged from
  the pre-existing `verifyLedger` logic, not introduced or worsened tonight.

## Security Review

No security-sensitive surface touched: no new `exec`/shell/network calls, no
credential handling, no filesystem writes beyond the pre-existing `ledger
append` path (and the new code path *reduces* filesystem writes, by refusing
some it used to allow), no MCP authority changes, no LLM calls in the
candidate itself. `validateRow` takes a typed `LedgerRow` and returns
`string[]` — no shell interpolation, no path handling.

## Scan Findings (cli, tui)

**cli** — Two findings, neither fixed tonight (both are pre-existing,
narrowly-scoped, and out of tonight's one-conceptual-change budget):
1. The shared date check (`/^\d{4}-\d{2}-\d{2}$/`) is shape-only, not
   calendar-valid — `ledger append --date 2026-13-99` is now refused-if-bad
   for verdict/evaluated but still *accepted* for the date itself, since
   `2026-13-99` matches the regex. Fixing this would change `verifyLedger`'s
   existing behavior (today it also silently accepts such dates), which is a
   separate, slightly larger decision than tonight's append-time gate.
2. `ledger append`'s flag names are inconsistent in convention: `--path`,
   `--date`, `--deep`, `--out`, `--repo`, `--cmd`, `--env` are single lower
   words or `--no-color` (kebab-case), but the row field `priorFates` is only
   reachable via the literal camelCase flag `--priorFates` — every other CLI
   command in this tool uses kebab-case or single words, so this one flag is
   easy to type wrong and fail silently into an empty value. Cosmetic, not
   fixed tonight.

**tui** — Confirmed (read-only, not modified tonight, to avoid a merge
conflict with PR #12 which already touches `tui.ts`'s signals footer):
`renderDashboard`'s footer computes `learningSignals(rows)` with no
`mergedPrNumbers` and no `today`, so on `main`'s real ledger right now it
would render `⚠ zero merges in 7 nights` (a live false positive — PR #8 is
in fact merged) and gives no indication that `LEDGER.md` is 6 nights stale
behind 5 open draft PRs. Both defects are already diagnosed and fixed in
still-unmerged PR #12 (`mergeDataAvailable` + `--merged`) and PR #16
(`nightsSinceLastRow`) respectively — not re-fixed tonight per STEP 2 ("do
not rediscover a failed direction... unless new evidence justifies
reopening it"); these are accepted, evaluated, not-yet-reviewed candidates,
not failed ones.

## Competitors

| Project | Relevant practice | Grade | Note |
|---|---|---|---|
| Agent-native CLI design guidance (multiple independent sources: HackerNoon "CLI Tool That Developers Actually Love", "10 Principles for Agent-Native CLIs", DEV Community fail-fast writeups) | Validate before the write starts; a failed validation should mean nothing was written, with an error naming the valid set | B (cross-checked across ≥3 independent sources, no single vendor) | Directly matches tonight's design: refuse-before-write, error lists the valid enum |
| OpenHands / SWE-agent (2026 comparisons) | Long unattended runs, hundreds of tool calls per issue, CI-integrated, no human in the loop for most steps | B | Motivates why *this* repo's append-time gate matters more than in an interactively-supervised tool — a nightly session calling `ledger append` has no human watching for a corrupted write |
| MEMPROBE (2026 agent-memory benchmark) | Treats agent memory as an "auditable post-interaction artifact," explicitly evaluating whether a memory store's contents can be trusted after the fact | C (single search summary, not independently read) | Conceptually the same concern as this repo's `LEDGER.md`-as-durable-memory design; informative only, not implemented from |
| DSPy / GEPA | Optimizer frameworks with a shared `EarlyStoppingConfig`/unified evaluator across optimizers — i.e., one validation path multiple callers share, rather than each caller re-implementing checks | C (search summary) | Same shape as tonight's fix (one shared `validateRow` for both `append` and `verify`), informative only |
| Sakana AI Scientist / AutoGPT lineage | Not directly relevant to CLI-level write validation; no new evidence found tonight | — | Considered, no material claim to grade |

## Gist

No `gh gist create` tool available to this session (same constraint every
prior night in this repo has recorded). Committed as
`docs/dream-cycle/2026-09-14-developer-experience-report.md`. `GIST=LOCAL`.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so the
stamp cannot be written *inside* the file it stamps (same self-reference
note as every prior report in this series). The committed copy at
`docs/dream-cycle/2026-09-14-developer-experience-report.md` is the frozen,
hashed artifact; this section is filled in immediately before that file is
committed, over content identical up to this point. Anyone can independently
reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-09-14-developer-experience-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo `HEAD` at
the start of tonight's session, before this candidate's changes). REPORT_HASH
and WITNESS are published in the PR body and the `LEDGER.md` row, both
pointing back at this file by path and session commit.

## Recommendation

`evaluated: accepted`. Human review of the draft PR. Next steps not done
tonight, left for a human: (1) review and merge/close the now-six open
dream-cycle draft PRs (#12, #14, #16, #18, #20, and tonight's) — the backlog
itself, not any single candidate's quality, is the binding constraint on this
repo's evolution loop right now; (2) a repo admin action on issue #10
(enable Code Security / GitHub Advanced Security in repository settings —
no code change can fix this); (3) decide whether to correct `LEDGER.md`
rows 1–6's cross-context contamination in one explicit human-reviewed pass.
