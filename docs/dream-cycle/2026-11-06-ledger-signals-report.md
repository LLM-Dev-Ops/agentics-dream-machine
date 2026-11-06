# Ledger-Signals SOTA Report — 2026-11-06

`DATE=2026-11-06` `DAYINT=20261106` `SLOT=1` → `DEEP=ledger-signals`,
`SCAN=witness,verify`. `SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.
`LLM_EVAL=blocked` (no `OPENROUTER_API_KEY` in this environment).

## TL;DR

Tonight's session independently derived a candidate — gate `ledger append`
on the same schema `ledger verify` already checks, so the exact rows-2-6
contamination shape (compound verdicts, `evaluated=partial`) can never be
written again — **before checking GitHub for prior art**. It was
implemented, tested (106→113, 0 regressions), and a draft PR (#121) and
issue (#120) were opened. Only afterward, while re-checking the fate of
recent PRs per STEP 1, did this session discover the candidate is a
near-byte-identical **triplicate**: PR #22 (2026-09-14) and PR #109
(2026-10-31) already ship the same `validateRow()` extraction and the same
append-time gate, both still open, both still unmerged. PR #121/#120 have
been closed as duplicates. This report documents the discovery, the
duplication itself (which is the real finding of the night), and what
*wasn't* redundant: a direct comparison of #22 vs. #109 to tell a human
reviewer which one to keep.

This is itself a demonstration of the exact failure the night's `DEEP`
surface is named for: **ledger-signals duplicate detection is broken**, and
being thorough about checking GitHub late instead of first is this
session's own process defect, not a new discovery about the repo — worth
stating plainly rather than dressed up as insight.

## What actually happened tonight (chronological, not sanitized)

1. Read `docs/dream-cycle/LEDGER.md` on `main`: 7 rows, ending 2026-09-08.
   Row 7 itself says: *"ledger verify found 9 schema errors in rows 2-6, not
   fixed tonight."* Ran `ledger verify` — still 9 errors, unchanged.
2. Ran `ledger signals`: `zeroMergeStreak: true`, `duplicateDirections: []`,
   `nightsConsidered: 7`. Read `packages/ledger/src/index.ts` and confirmed
   `ledger append` never calls `verifyLedger`'s per-row checks — nothing
   gates what gets written.
3. **Mistake**: treated the local 7-row `LEDGER.md` as a reasonably complete
   picture of this surface's history and did not check the GitHub issue/PR
   backlog *before* implementing. Built `validateRow()` + the append-time
   gate, wrote 7 new tests, got 106→113 passing, verified the real ledger's
   9 errors were untouched, reproduced the exact row-7 bad shape being
   refused live. Opened issue #120 and draft PR #121.
4. Per STEP 1 ("for the last 7 rows... re-check the fate of associated
   issues and PRs"), fetched PR #24 (2026-09-16, ledger-signals) to check a
   historical PR number mentioned in the ledger. Its own body listed three
   *other* open PRs explicitly about this exact surface: **#12**
   (`zeroMergeStreak`/`prNumber` correctness), **#16**
   (`nightsSinceLastRow`), **#22** (`validateRow` append-time gate — this
   session's own candidate, already shipped, 2026-09-14).
5. Read PR #22's and PR #109's (2026-10-31, the most recent prior
   `ledger-signals` night) full diffs. Both are the same hypothesis, the
   same `validateRow` extraction, the same CLI gate, the same
   byte-identical-on-rejection property test, the same "historical rows left
   untouched" discipline — materially indistinguishable from tonight's
   candidate. `list_pull_requests` (open, 100/page) additionally showed
   **121 open PRs total**, every `dream/*` branch since #12 (2026-09-09)
   still open and draft, **zero merged since PR #8/#9** (2026-09-08) — PR
   #109's own report had already measured this at 30 open PRs six days ago,
   so the backlog has kept growing at the same ~1-PR-per-night rate with no
   change in merge rate.
6. Closed PR #121 and issue #120 as duplicates (see below). Reverted the
   duplicate code from this branch. This report, and the ledger row, are
   what's left.

## Why the duplicate-detection signal didn't save tonight from this

`docs/dream-cycle/LEDGER.md` on `main` has had no new row since 2026-09-08 —
**not because no nights ran**, but because every night's own ledger-row
commit lives only on that night's own unmerged branch. `STEP 1.1`'s
`duplicateDirections` signal is computed from `LEDGER.md`'s rows; against a
7-row file frozen at 2026-09-08, it cannot see any of the ~100 nights' worth
of real findings sitting in open PRs #12–#119, so it reported
`duplicateDirections: []` tonight — technically correct given its only
input, and completely wrong about the real world. The only way this session
caught the triplication was by reading individual PR bodies on GitHub by
hand, which STEP 1 does direct ("re-check the fate of associated issues and
PRs") but which is easy to under-do when the local ledger *looks* like a
complete, 7-row history. PR #109 already reached the same conclusion
(scoping its own GitHub check to `search_issues`/`search_pull_requests`,
which returned 0 hits for its own phrasing — and still missed PR #22,
exactly as tonight's session initially did, for the same reason: a keyword
search over issue/PR text doesn't reliably surface a prior night that
described the identical defect in different words). This is consistent
with, not a correction of, PR #109's own finding — and not a new defect in
the signal's code; `duplicateDirections` does exactly what `LEDGER.md`'s
real content allows it to do. The actual fix (reconciling `LEDGER.md` to
reflect the ~100 nights of unmerged history, or running duplicate-detection
against the live GitHub PR list rather than the local file) is a materially
larger, already-identified problem (issues #84/#90/#104, referenced by PR
#109) and is not attempted here — scope creep for a single night, and not a
new discovery.

## PR #22 vs. PR #109 — which to keep

Both close an issue, both extract the exact same `validateRow(row):
string[]` (verdict/evaluated/date checks factored out of `verifyLedger`),
both gate `ledger append` on it before the write, both leave historical
rows 2-6 untouched, both pass `npm test` with only additive tests (111/111
each), both disclose the same residual gap (the date check is regex-shape-
only, so `2026-13-99` still passes). Differences a human reviewer would
want:

| | PR #22 (2026-09-14) | PR #109 (2026-10-31) |
|---|---|---|
| Error message prefix | `ledger append: refusing to write an invalid row (<path> left unchanged):` | `✗ refusing to append an invalid row (<n> error(s)):` |
| Exports `VERDICTS`/`EVALS`? | No (kept module-private) | Yes (exported, so a caller can report which enum was violated) |
| Checked for duplication against | Nothing before it existed yet | PR #33 and PR #99 (not PR #22 — missed) |
| Additional evidence | Live repro against a scratch `LEDGER.md`; disclosed the `--priorFates` camelCase flag-naming inconsistency as a separate, unfixed cosmetic finding | Live repro against a scratch `LEDGER.md`; connects the gap to `scripts/dream-nightly.mjs`'s real call site; cross-references PR #33 (quarantine + CI gate) as a complementary, non-conflicting layer |
| Base commit | `2fba255` (current) | `2fba255` (current) — **both branch from the identical base**, so whichever merges first, the other becomes a trivial close, not a conflict to resolve |

Recommendation: merge **PR #109** (the more recent, more thoroughly
cross-checked of the two — it already relates itself to PR #33 and to the
real `dream-nightly.mjs` call site) and close **PR #22** as superseded by
it, referencing this comparison. Either order works since they branch from
the same commit; merging one first and then closing the other avoids ever
resolving a conflict between them.

## Evidence

OBSERVATION: candidate built tonight is materially identical to PR #22 and
PR #109. MEASUREMENT: diff comparison above; `list_pull_requests` confirms
121 open PRs, 0 merges since #9. DECISION: withdraw tonight's duplicate
(close #121/#120), do not open a third near-identical PR, recommend merging
#109 over #22. This is not a new code contribution — it is evidence that
the loop's own duplicate-detection needs the fix PR #109 and others already
flagged (issues #84/#90/#104), reconfirmed, not rediscovered.

## Reward-Hack Check

Closing a duplicate PR rather than shipping it is the opposite of reward
hacking — no benchmark, threshold, or gold data touched or claimed-fixed;
no attempt to make tonight's run look more novel than it was. The TL;DR and
"What actually happened" sections above state the process mistake (checked
GitHub too late) plainly rather than omitting it.

## Security Review

No code shipped tonight; no new surface. `verify-entrypoints
dream.config.json` run earlier in the session reported both `bench` and
`darwin` as live, unchanged from prior nights' findings; not re-explored
further to avoid repeating PR #109's already-disclosed unpinned-`npx`
network install.

## Darwin / Benchmarks

Not applicable — no candidate diff to evolve or benchmark tonight.

## ADR

None — a withdrawal-and-comparison night, not an architectural decision.

## Gist

`GIST=LOCAL` — no `gh gist create` tool available this session (consistent
with every prior night's report). This file is the full report, committed
alongside the ledger row.

## Witness

Per this repo's own established precedent (PR #22/#109/#24's reports), a
report's `witness` triple is computed over this file's final committed
bytes and published externally (PR body, issue, `LEDGER.md` row), never
pasted back into this section — a self-reference would make the published
hash unreproducible against the committed file.

**Verifier procedure:**
1. `git show <this-PR's-head-commit>:docs/dream-cycle/2026-11-06-ledger-signals-report.md > report.md`
2. `REPORT_HASH=$(sha256sum report.md | awk '{print $1}')`
3. `SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`
4. `printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'`
5. Compare to the `witness` value published in this PR's description and
   the `LEDGER.md` row for 2026-11-06 — must be byte-identical.

## Recommendation

`evaluated: accepted` for the finding (duplication confirmed, candidate
correctly withheld); no code PR from tonight. Concrete next steps for a
human: (1) merge PR #109, then close PR #22 referencing this comparison;
(2) separately, the 0-merges-since-#9 / 120+-open-draft-PR backlog
(issues #84/#90/#104) remains this repo's binding constraint — not
re-litigated here; (3) consider whether nightly duplicate-detection should
query the live GitHub PR list directly (as this session eventually did by
hand) rather than relying solely on the local, chronically-unmerged
`LEDGER.md` for `STEP 1.1`'s `duplicateDirections` signal.
