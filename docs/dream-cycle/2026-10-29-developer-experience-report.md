# Developer-Experience / CLI+TUI SOTA Report — 2026

## TL;DR

Tonight's rotation (`SLOT=4` → `DEEP=developer-experience`, `SCAN=cli,tui`, no
bonus moduli: `20261029 % 25 = 4`, `% 75 = 4`) walked into a far more saturated
backlog than `docs/dream-cycle/LEDGER.md` on `main` shows. That file still
ends at row 7 (2026-09-08) because **every single dream-cycle PR since #9 has
gone unmerged** — but live GitHub state shows **46 open `dream/*` PRs** (#12
through #103) spanning 2026-09-09 through last night, each with its own
issue, report, witness stamp, and (mostly) a real, independently-critic-cleared
candidate. Every developer-experience/cli/tui idea this session considered
from first principles tonight — a TUI schema-verify warning, ledger-append
write-time validation, ANSI-safe truncation, NO_COLOR handling, the
`automerge.yml` `ready_for_review` trigger gap — turned out to already be an
open, unmerged PR (#22, #37, #39, #49, #55, #65, #69, #95). Re-implementing
any of them would be pure duplication, not a new finding.

The one genuinely new, non-duplicate, in-scope gap found: PR #57
(2026-10-05, compiler-parity night) added golden-snapshot coverage for two of
the CLI's three machine-readable JSON/line outputs (`ledger signals`,
`verify-entrypoints`) and explicitly logged a third as a deferred follow-up
it deliberately did not bundle in: **`ledger stats`'s JSON output has the
identical substring-only coverage gap**. Tonight closes that specific,
pre-scoped, one-conceptual-change gap. `verdictStats()` (the function behind
`ledger stats`) also backs the TUI dashboard's "nights N · accept/reject/
inconclusive" header line, so this protects both the CLI contract and the
human-facing dashboard from silent drift.

**Result: narrow, genuine gap closed. `evaluated: accepted`.** Separately and
more importantly: this repo's real blocker is not a code bug any nightly
candidate can fix — see "Standing finding" below.

## Rotation

`DATE=2026-10-29`, `DAYINT=20261029`, `SLOT=4` → `DEEP=developer-experience`,
`SCAN=cli,tui`. No bonus deep dives (`%25=4`, `%75=4`, neither 0).
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a` (`main`, `fix(ci):
add actions:read permission to CodeQL workflow (#9)`).

## Ledger Check

`docs/dream-cycle/LEDGER.md` on `main`: 7 rows, ends 2026-09-08. `ledger
verify` (the real tool): 9 pre-existing schema errors in rows 2–6, inherited
from a different repo context before this repo's retargeting — reconfirmed
present, unfixed, same as every prior night since 2026-09-08 (out of scope
tonight; rewriting historical rows to fit a schema that postdates them would
itself be evidence-tampering, not a fix). `dream-machine ledger signals`:
`{"zeroMergeStreak": true, "duplicateDirections": [], "lowScoreStreak":
false, "blockedEvalStreak": false, "nightsConsidered": 7}` — signal fires on
the local ledger alone, but it drastically **undercounts** reality.

Live GitHub state (not just `main`'s stale ledger), read directly tonight via
`mcp__github__list_issues`/`list_pull_requests`/`search_pull_requests`:

- **46 open `dream/*` PRs** (#12–#103), **0 merged since #8/#9** (2026-09-08)
  — a 51-day, 46-PR zero-merge streak, far beyond this tool's own 7-night
  local window.
- Root cause, independently reconfirmed across dozens of nights and
  re-verified fresh tonight: issue **#10** (filed 2026-09-08, still open) —
  GitHub Advanced Security "Code security" was never enabled in this repo's
  settings, which is a repo-admin action no PR can perform. PR #91
  (2026-10-22) reports this flipped and CodeQL went green on 2026-10-20 after
  a 49-day failure streak — re-verified tonight: `get_check_run`/issue
  history consistent, but **0 PRs have merged even in the 9 days since**.
- Second independent blocker, reconfirmed tonight (`get_label` → 404): the
  `automerge-safe` label referenced by `.github/workflows/automerge.yml`'s
  guard condition **has never been created** in this repository. Without it,
  the guarded-auto-merge job's `if: contains(... 'automerge-safe')` can never
  be true, regardless of CI color.
- Third, narrower blocker already diagnosed and fixed in an unmerged PR:
  `automerge.yml`'s trigger list (`labeled, opened, synchronize, reopened`)
  omits `ready_for_review` — PR #69 (2026-10-11, closes #68) adds it with a
  real regression test. Secondary to the first two (a draft PR with no label
  and CI that was red until 10-20 was never going to auto-merge regardless),
  but still an open, correct, tiny, unmerged fix.
- Every dream-cycle PR opens as **draft** by design (this repo's own merge
  policy: "even a significant result stays draft"). GitHub cannot
  auto-merge, or even enable auto-merge on, a draft PR. No PR has ever been
  marked ready-for-review by a human, per PR #85/#89/#94's reconfirmations,
  independently spot-checked tonight on PR #95 and #103 (both still `draft:
  true` as of this session).
- PR #89 (2026-10-21) measured 36/40 open PRs as merge-clean with 0 pairwise
  conflicts as of that date. Not re-run in full tonight (out of
  developer-experience's scope; that audit itself belongs to the
  `ledger-signals` slot, which already reconfirmed the pattern ≥10 times —
  re-diagnosing a 10th+ time would itself be the "rediscover a failed
  direction without new evidence" anti-pattern this engine's own protocol
  forbids).

## Learning Signals

`zeroMergeStreak: true` on the local 7-night window; true a fortiori on the
real 46-PR/51-day window. STEP 1.1 bias: tiny, one-parameter,
easily-reviewable candidate, no model calls. `LLM_EVAL=blocked`
(`OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY` both absent this session) reinforces
the same bias independently.

## Deep Dive: developer-experience (scan: cli, tui)

Five ideas were considered from first principles before checking GitHub, in
this order, each killed by evidence of an existing unmerged PR once checked
live (avoiding the "rediscover a failed/already-found direction" anti-pattern):

1. **TUI should surface `ledger verify` schema errors** (so an operator
   looking at the dashboard sees the 9 pre-existing schema errors instead of
   silent gray-colored unknown-verdict rows). No existing PR title matches
   this exactly — closest is PR #33 (`quarantine contaminated ledger rows + CI
   gate`, 2026-09-21), a stronger, already-authored, unmerged treatment of
   the same underlying problem. Not re-implemented tonight to avoid
   duplicating an existing, more complete candidate.
2. **`ledger append` should validate verdict/evaluated before writing** —
   already PR #22 (2026-09-14, `validate ledger append rows before writing`),
   open, unmerged. Not duplicated.
3. **`pad()`'s truncation slices raw ANSI escapes** — already PR #95
   (2026-10-24, same `developer-experience`/`cli,tui` slot, 5 nights ago),
   open, unmerged, independently critic-cleared. Not duplicated.
4. **`--no-color`/`NO_COLOR` parsing gaps** — independently found and
   re-found **≥6 times** (#37, #39, #49→conflict with #55, consolidated in
   #65, rediscovered #75, reconfirmed #85). Already far past this tool's own
   `duplicateDirections` ≥3 threshold. Not re-filed a 7th time.
5. **`automerge.yml` never re-fires on `ready_for_review`** — already PR #69
   (2026-10-11), open, unmerged, with its own regression test.

With every first-principles idea on the `cli`/`tui` surface already a live
PR, the deep dive turned to **this repo's own prior reports' explicitly
logged, not-yet-picked-up next steps** — the correct place to look per STEP
2 ("load accumulated evidence… do not rediscover a failed direction unless
new evidence justifies reopening it" — this is the inverse: reopening an
*unfinished*, not failed, direction). PR #57's report (2026-10-05) ends with:

> Remaining, not pursued tonight: `ledger stats`'s JSON output has the same
> gap (same `JSON.stringify(..., null, 2)` pattern, same fix shape) — logged
> as a follow-up, deliberately not bundled in to keep this candidate to one
> conceptual change.

Confirmed fresh tonight by reading `packages/cli/src/index.test.ts` on
current `main`: the pre-existing `ledger stats` test (`it('stats', …)`,
~line 127) asserts only `JSON.parse(r.out).ACCEPT` and `.REJECT` — never the
full shape, key set, or exact formatting. No PR in the 46-PR backlog touches
this (`search_pull_requests` for "ledger stats snapshot" → 0 results; local
`grep` for `toMatchSnapshot`/`verdictStats` in the test file → 0 matches
before tonight's change).

## Hypothesis (frozen before implementation)

> Given this repo's `ledger stats` CLI command (JSON via `verdictStats()`,
> consumed by both the CLI directly and the TUI dashboard's stats header),
> when a golden-snapshot test is added against a fixed, deterministic ledger
> fixture, then: the test passes on first run; a realistic format-drift edit
> at the CLI boundary (removing `JSON.stringify`'s pretty-print arguments)
> causes the new snapshot test — but none of the pre-existing property-based
> assertions — to fail; all 106 pre-existing tests keep passing unmodified;
> no evaluation gate, benchmark, threshold, or security boundary is touched.

Not modified after evaluation began. **Confirmed true, not falsified.**

## Candidate

`packages/cli/src/index.test.ts` (+24 lines, pure addition, 0 deletions): one
new `describe('golden-snapshot: ledger stats JSON shape', …)` block with one
`toMatchSnapshot()` test, reusing the file's existing `mockIO`/`sampleRow`
helpers and a 4-row fixture (`ACCEPT`/`REJECT`/`INCONCLUSIVE`/an unrecognized
verdict exercising the `other` bucket). `packages/cli/src/__snapshots__/index.test.ts.snap`
(new, vitest-generated, 9 lines). 2 files, well under the 300-line target,
one conceptual change.

## Evaluation Receipt

Real evaluator: `npm test` (vitest, this repo's configured `bench`
entrypoint). `LLM_EVAL=blocked` (no `OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY`
in this session) — candidate requires zero model calls by design, consistent
with every `LLM_EVAL=blocked` night since 2026-08-13.

| | Baseline (`main` @ `2fba255`) | Candidate |
|---|---|---|
| `npm test` | 106/106 | **107/107** (+1, 0 removed/modified) |
| `npm run lint` | clean | clean |
| `npm run build` | clean (6 workspaces) | clean |
| `npm run typecheck` | pre-existing `TS18002` (empty `tsconfig.json` `files`) | identical — environmental, reproduced on both sides |

Baseline reproduced via `git stash -u` immediately before writing the
candidate (this session, then independently again by a separate critic
subagent).

Adversarial drift injection (the actual falsifiable test), run independently
twice — once by this session, once by a separate critic subagent with no
shared context: changed `packages/cli/src/index.ts`'s `ledger stats` handler
from `JSON.stringify(verdictStats(rows), null, 2)` to
`JSON.stringify(verdictStats(rows))` (dropping the pretty-print arguments —
semantically identical JSON, different exact bytes). Result both times:
**exactly 1 test fails** — the new golden-snapshot test — while all 106
pre-existing tests, including the old `stats` test's `.ACCEPT`/`.REJECT`
property checks, stay green, since `JSON.parse` doesn't care about
whitespace. Reverted both times (`git checkout -- packages/cli/src/index.ts`);
107/107 restored.

Snapshot-fabrication check, run independently twice: deleted
`packages/cli/src/__snapshots__/index.test.ts.snap`, reran `npm test`
(regenerates it), diffed against the version about to be committed —
byte-identical both times.

## Darwin Results

`DARWIN=not-applicable` — no evolvable population for one additive
golden-snapshot test of a pure CLI command's stdout. Consistent with every
prior compiler-parity/golden-snapshots night's call (PR #14, #51, #57).

## Evidence

- OBSERVATION: `packages/cli/src/index.test.ts` on `main` has exactly one
  assertion on `ledger stats`'s output, a two-property check, before tonight.
- OBSERVATION: live GitHub — 46 open `dream/*` PRs, 0 merged since 2026-09-08;
  `automerge-safe` label 404s; issue #10 open since 2026-09-08; PR #91 reports
  CodeQL green since 2026-10-20 with still 0 merges in the 9 days since.
- MEASUREMENT: `npm test` 106→107, 0 regressions (independently reproduced by
  this session and a separate critic subagent via `git stash -u` A/B).
- MEASUREMENT: adversarial drift injection caught by exactly the new test,
  independently reproduced twice.
- MEASUREMENT: snapshot regeneration byte-identical, independently reproduced
  twice.
- INFERENCE: PR #22/#37/#39/#49/#55/#65/#69/#95 remain valid, non-stale,
  non-duplicated candidates for the other `cli`/`tui`-surface gaps this
  session independently rediscovered tonight before checking GitHub.
- DECISION: pick PR #57's own explicitly-deferred, pre-scoped next step
  rather than re-diagnosing the 51-day backlog crisis a further time, to
  produce a genuinely new, tiny, reviewable, non-duplicate candidate.
- REJECTION: considered re-running PR #89's full 40-PR merge-conflict audit;
  rejected as out of `developer-experience`'s scope tonight and not yet
  stale enough (8 days) to justify re-deriving a `ledger-signals`-surface
  finding a 2nd time from a different slot.

## Reward-Hack Check

Independent critic subagent (separate context, fresh/cold, not primed with
this report, instructed to reproduce everything itself and be adversarial).
**Verdict: CLEAR.** Verbatim summary:

> VERDICT: CLEAR. Diff scope: only the test file (+24/−0, pure addition) and
> one new snapshot file — no gate/benchmark/threshold/CI/workflow/security
> file touched. Candidate 107/107, baseline (via `git stash -u`) 106/106,
> matches exactly. Lint/build clean; typecheck's pre-existing `TS18002`
> identical both sides. Independently reproduced the drift-injection claim
> (exactly 1 failure, the new test; the old `.ACCEPT`/`.REJECT` test stays
> blind to it) and reverted cleanly. Test calls the real `run()` dispatcher
> and the real imported `verdictStats()` — no `vi.mock`/`jest.mock` anywhere
> in the file, not tautological. Snapshot regeneration byte-identical. 0
> deletions in the diff — no pre-existing test, gold answer, threshold, or
> benchmark weakened. Fixture's "MAYBE" verdict checked against the real
> `verdictStats()` implementation — accurate, not cherry-picked.

Non-blocking note from the critic: snapshot tests need updating if
`verdictStats`'s legitimate output shape changes intentionally — a normal,
disclosed snapshot-test tradeoff, not a defect.

## Security Review

Pure additive unit test over already-in-memory data (`mockIO`, no real
filesystem/network/exec). No new credential, I/O, exec, or dependency
surface. Touches no path matching `.github/workflows/automerge.yml`'s
protected-path regex. No model calls. Confirmed independently by the critic
subagent.

## Scan Findings

- **cli**: `ledger stats`'s JSON output had the same substring-only coverage
  gap as the two outputs PR #57 already fixed — closed tonight. The
  `--no-color`/`NO_COLOR` family of findings remains the most-duplicated
  direction on this surface (≥6 independent discoveries, 0 merges);
  deliberately not re-filed.
- **tui**: no new finding — PR #95 (2026-10-24, same slot, 5 nights ago)
  already fixed the ANSI-unsafe-truncation bug confirmed still present in
  `main`'s `pad()`; this session independently re-derived the identical bug
  from reading `packages/cli/src/tui.ts` before checking GitHub, then found
  #95 and withheld (same established pattern as PR #75's handling of #65).

## Competitors

| System | Relevant mechanism | Evidence grade |
| --- | --- | --- |
| GitHub CLI (`gh`), `kubectl`, `docker` | Machine-readable (`--json`/`-o json`) output is treated as a versioned contract distinct from the human-formatted default, typically covered by golden/fixture tests rather than substring checks, specifically because scripts and other tools depend on exact shape. Directly analogous to why `ledger stats`'s JSON (not `tui`'s human dashboard) was the right target for a shape-locking test tonight. | A (official, well-documented CLI convention) |
| OpenHands SDK | Third-party technical write-ups describe the agent's conversation state as an immutable event log with deterministic replay — the same principle this repo applies to its own `LEDGER.md`, reinforcing why *write-time* validation (PR #22) and *read-time* shape-locking (tonight's candidate, PR #57) are both needed around a single source of truth. | B (secondary account, not official docs) |
| Prefactor (industry blog, 2026) | Argues quality/behavior can drift on a production agent with zero visible dashboard signal, and recommends action-schema validation specifically for overnight/background agents — exactly this repo's own failure mode (a format change landing silently because every pre-existing assertion was substring-only). | C (single vendor blog, cross-checked against no second source) |
| DSPy/GEPA (public case study, S. Willison/Datasette Agent, 2026-07-02) | Golden-snapshotting a compiled optimizer's rewritten output caught a held-out-accuracy regression that substring checks missed — the general precedent PR #57 already cited and this candidate extends one layer further (CLI stdout, not the compiler's prompt output). | B (public case study, not independently re-run tonight) |

## Standing finding (not this candidate — the real blocker)

Unchanged by tonight's work, reconfirmed live: **46 open, mostly
independently critic-cleared `dream/*` PRs, 0 merged since 2026-09-08 (51
days)**. Root causes are entirely outside any nightly candidate's reach:
(1) issue #10's GHAS/Code-Security repo setting (now reportedly resolved
2026-10-20 per PR #91, but 0 merges even since); (2) the `automerge-safe`
label was never created; (3) no PR has ever been marked ready-for-review by
a human, and every dream-cycle PR opens as draft by this repo's own policy,
so GitHub cannot auto-merge any of them regardless of (1)/(2). This session
cannot create labels, change repo admin settings, or mark a PR
ready-for-review on a human's behalf — and would not self-promote even if it
could. Flagged here, and separately pushed as a direct notification outside
this report, because 46 nights of real, tested, independently-verified work
sitting completely unlanded is the single highest-leverage fact in this
repository right now.

## Issue

#104

## Gist

No `gh gist create`-equivalent available to this session (`gh auth status`:
token invalid; `GIST=LOCAL`, same constraint every night since 2026-09-10).
Committed as `docs/dream-cycle/2026-10-29-developer-experience-report.md`.

## Witness

```
report_sha256 : c5daa200c35a00adffd00b7076a674df931c56f2ff458ff932db69109b2bf7e0
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : 1fbc82ca89a31fbc05e35254ff2060d3c802012739d4baec4ad43b0136752236
```

Reproducible via `dream-machine witness verify`. Verifier procedure:
1. `git show <this-branch-HEAD>:docs/dream-cycle/2026-10-29-developer-experience-report.md | sed -n '1,/^## Witness$/p' | sha256sum` → must equal `report_sha256`.
2. `printf '%s%s' "<report_sha256>" "2fba2550182d81b36423447221823e98e227482a" | sha256sum` → must equal `witness`.
3. Or simply: `dream-machine witness verify docs/dream-cycle/2026-10-29-developer-experience-report.md 2fba2550182d81b36423447221823e98e227482a <witness>`.

## Recommendation

`evaluated: accepted`. Candidate diff in the accompanying draft PR. Three
concrete next steps: (1) a human with repo-admin access creates the
`automerge-safe` label and marks at least one of the oldest, smallest,
already-critic-cleared PRs (#22, #37, #39, #51, #57, #65, #69, #95, this
PR) ready-for-review and merges it, breaking the 51-day zero-merge streak;
(2) re-run PR #89's merge-conflict audit once any PR actually lands, since
every other open PR's branch base will then be stale; (3) if GHAS/Code
Security is intentionally unwanted long-term, close issue #10 explicitly
rather than leaving a resolved-seeming check silently green with no audit
trail of the settings change.
