# Ledger-Signals SOTA Report — 2026-09-16

## TL;DR

Tonight's rotation (`DAYINT=20260916`, `SLOT=1` → `DEEP=ledger-signals`,
`SCAN=witness,verify`) re-entered the exact surface issue #15 (2026-09-11)
opened and PR #23 (2026-09-15) re-confirmed as this repo's dominant risk: a
growing backlog of unmerged dream-cycle candidate PRs. Before drafting any
candidate, this session enumerated every open ledger-signals-relevant fix
already sitting in that backlog (PR #12: `zeroMergeStreak`/`prNumber`
false-positive; PR #16: `nightsSinceLastRow`; PR #22: append-time
`validateRow` gate) and independently reproduced the exact bug PR #12 already
fixed — see Evidence — before discovering it was a duplicate. **No new
candidate is shipped tonight.** The `ledger-signals` surface has no
undiscovered gap left to find with today's evidence; the binding constraint
is human review bandwidth, not missing tooling. `evaluated: yes` (real,
independent verification work was done), `verdict: REJECT` (the hypothesis
that a new, non-duplicate ledger-signals gap exists tonight is rejected), with
the backlog's continued growth as this session's evidence-backed contribution.

## Ledger Check

`docs/dream-cycle/LEDGER.md` on `main` is unchanged since 2026-09-08 (7 dated
rows, last row `2026-09-08`). `FALLBACK=false` — GitHub MCP access works.
Re-checked the fate of the last 7 nights' issues/PRs live (`pull_request_read`
method `get`, not `list_pull_requests`, whose `merged` field is known
unreliable per the 2026-09-11 and 2026-09-13 reports):

| Night | Issue | PR | Live state tonight |
| --- | --- | --- | --- |
| 2026-09-08 security-adversarial | #7 (closed) | #8 | **MERGED** |
| — (same-day correction) | #10 | — | **OPEN** — repo-settings blocker (GHAS/Code Security not enabled), reconfirmed unchanged again tonight (job log still `Code Security must be enabled...`); no code fix possible |
| 2026-09-09 developer-experience | #11 | #12 | **OPEN, draft, unmerged** — 7 nights |
| 2026-09-10 compiler-parity | #13 | #14 | **OPEN, draft, unmerged** — 6 nights |
| 2026-09-11 ledger-signals | #15 | #16 | **OPEN, draft, unmerged** — 5 nights |
| 2026-09-12 evaluation-adapters | #17 | #18 | **OPEN, draft, unmerged** — 4 nights |
| 2026-09-13 security-adversarial | #19 | #20 | **OPEN, draft, unmerged** — 3 nights |
| 2026-09-14 developer-experience | #21 | #22 | **OPEN, draft, unmerged** — 2 nights |
| 2026-09-15 compiler-parity | (none, by design) | #23 | **OPEN, draft, unmerged** — 1 night |

Zero merges and zero closures since PR #8/#9 on 2026-09-08 — **8 calendar
nights, 7 open draft PRs**, up from the 6-night/6-PR count PR #23 recorded
last night. PR #12's own check runs (`get_check_runs`, reconfirmed tonight):
`test` (all 3 Node versions) and `no-optional-deps` green; `analyze`
(CodeQL) failure — the same repo-settings gap as issue #10, not a defect in
PR #12; `guard-and-merge` skipped (draft, no low-risk label). `npm audit`:
**9** advisories (2 critical, 2 high, 3 moderate, 2 low) — unchanged from
2026-09-13, still 100% devDependency-scoped, still fixed by still-open
dependabot PR #1 (now 13 days old).

`ledger verify --path docs/dream-cycle/LEDGER.md` still reports the same
**9 structural errors** on rows 2-6, byte-identical, 4th consecutive check
(2026-09-08, 09-11, 09-14, tonight) with zero action taken — each night
correctly deferred it as "a human decision to rewrite ledger history," but
four consecutive deferrals with no human action is itself now a fact worth
recording plainly: this will not fix itself without either a human editing
`LEDGER.md` directly, or a human merging one of the several already-open PRs
that build the tooling to prevent new instances (PR #22's `validateRow`) —
none of which retroactively cleans rows 1-6.

## Deep Dive: ledger-signals

**Frozen hypothesis:**

> Given the three already-open, already-evaluated ledger-signals candidate
> PRs (#12: `zeroMergeStreak`/`prNumber` correctness; #16:
> `nightsSinceLastRow` staleness signal; #22: append-time `validateRow`
> gate) and this repo's real `LEDGER.md`/`learningSignals()` code as it
> exists on `main` tonight, there exists at least one additional,
> non-duplicate, testable defect or gap in ledger-signal computation that
> none of those three PRs already cover — testable by independently
> re-deriving a candidate from the real code and real ledger data, then
> diffing it against the three open PRs' actual diffs before shipping
> anything.

**Testability gate**: testable — `learningSignals()`/`verifyLedger()` are
pure functions over a real, inspectable ledger; no credentials needed.

**Independent re-derivation** (done before checking GitHub, to keep the
comparison honest): read `packages/ledger/src/index.ts`'s `prNumber()`
(`/#?(\d+)/`, matches the first digit run anywhere in the cell) against the
real `LEDGER.md`'s contaminated rows 2-6, whose PR cells contain
cross-repository references like `rufield#5; dream-machine#24` and `reuse
ruflo#3094, RuView#1696, rvcsi#3; dream-machine#24`. Constructed a concrete
adversarial case: if this repo's own PR `#5` (a real dependabot PR, an
identifier unrelated to `rufield`) were ever passed as `mergedPrNumbers:
Set(['5'])`, `prNumber("rufield#5; dream-machine#24")` returns `"5"` —
attached to an unrelated external repo name with no repo-boundary check —
which would flip `zeroMergeStreak` from `true` to `false` on a ledger where
no real dream-cycle candidate PR has ever merged. Reproduced live:

```
$ node -e "... learningSignals(rows, {mergedPrNumbers: new Set(['5'])}) ..."
BASELINE BUG: zeroMergeStreak = false (should stay true; false because
'rufield#5' masquerades as local PR #5)
```

**Then checked GitHub before implementing a fix** (per STEP 2, "do not
rediscover a failed direction... unless new evidence justifies reopening
it"): PR #12 (2026-09-09) already ships this exact fix, via a different
(and better) mechanism — an explicit `mergeDataAvailable` flag that makes
"no real merge data supplied" its own honest state, plus a `--merged`
CLI flag wired into both `ledger signals` and `tui`. PR #12's approach
supersedes the narrower `prNumber`-regex tightening this session had begun
drafting: even a hardened `prNumber()` regex does not, by itself, fix the
production bug (every real caller omits `mergedPrNumbers` entirely, so
`zeroMergeStreak` defaults `true` regardless of parsing accuracy) — PR #12's
`mergeDataAvailable` gate fixes the actual production defect at its root,
and a `prNumber` regex tightening on top of that would be a strict subset of
what #12 already ships. **This candidate was therefore discarded,
uncommitted, before any diff was written to disk** — the same discipline PR
#23 (2026-09-15) already applied to an unrelated duplicate.

No other new gap was found: `verifyLedger`'s 9 structural errors are
unchanged (confirmed byte-identical to the 2026-09-08 baseline), and no new
`learningSignals()` field beyond `mergeDataAvailable`/`nightsSinceLastRow`
(PR #12/#16) / `validateRow` (PR #22) suggested itself from tonight's fresh
read of the real ledger.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), fresh `npm ci && npm run build` at
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.

```
Baseline (main, 2fba255): 106/106 tests, 7 files
```

No candidate diff exists tonight, so there is no "candidate" row to compare
— the baseline number is reported for the record, matching every one of the
seven prior open-PR nights (main has not advanced since 2026-09-08).

Live receipts, reproduced tonight:

```
$ node packages/cli/dist/bin.js version
0.1.1

$ node packages/cli/dist/bin.js ledger verify --path docs/dream-cycle/LEDGER.md
✗ ledger has 9 error(s)   # byte-identical list to 2026-09-08/09-11/09-14

$ node packages/cli/dist/bin.js ledger signals --path docs/dream-cycle/LEDGER.md
{ "zeroMergeStreak": true, "duplicateDirections": [], "lowScoreStreak": false,
  "blockedEvalStreak": false, "nightsConsidered": 7 }
  # unchanged shape — main does not yet have PR #12/#16's mergeDataAvailable
  # / nightsSinceLastRow fields; this is expected, not a new finding.

$ npm audit --json | jq .metadata.vulnerabilities
{ "info": 0, "low": 2, "moderate": 3, "high": 2, "critical": 2, "total": 9 }
  # unchanged from 2026-09-13
```

## Darwin Results

`DARWIN=not-applicable` — no candidate was shipped tonight; there is no
population to evolve. Consistent with every ledger-signals-surface night to
date (none has run bounded Darwin, since none has produced a mutable
parameter space).

## Evidence

- OBSERVATION (GitHub MCP, `pull_request_read` method `get`, `list_pull_requests`,
  `issue_read`): PR #8/#9 merged; PRs #12/#14/#16/#18/#20/#22/#23 all open,
  draft, unmerged, ages 7/6/5/4/3/2/1 nights; issue #10 still open,
  repo-settings blocker unchanged.
- MEASUREMENT: `prNumber("rufield#5; dream-machine#24")` → `"5"`, a
  cross-repo-contaminated ledger cell misparsed as this repo's own PR
  number — reproduced live (see Deep Dive) before discovering PR #12 already
  supersedes any fix for it.
- MEASUREMENT: `ledger verify` — 9 structural errors, byte-identical to the
  2026-09-08 baseline, 4th consecutive unchanged check.
- MEASUREMENT: `npm audit` — 9 advisories, unchanged from 2026-09-13; `npm
  test` 106/106 on `main`, unchanged since 2026-09-08.
- MEASUREMENT (`get_check_runs`, PR #12): `test`×3 + `no-optional-deps`
  green; `analyze` (CodeQL) failure (repo-settings, not PR #12's fault);
  `guard-and-merge` skipped.
- INFERENCE: the ledger-signals surface's remaining known gaps are fully
  covered by already-open, already-evaluated PRs (#12, #16, #22); the
  binding constraint on this repository's evolution loop is human review
  throughput, not missing candidates or missing tooling.
- DECISION: do not ship a fix that duplicates or is strictly subsumed by an
  already-open PR; do not open a fourth issue restating a finding #15
  already tracks — comment on #15 instead with tonight's incremental data
  point (8 nights, 7 open PRs, up from 6/6 last night).
- REJECTION: the frozen hypothesis ("a new, non-duplicate ledger-signals gap
  exists tonight") is REJECTED — every candidate this session could derive
  from the real code and real ledger was either already shipped (PR #12,
  #16, #22) or a strict subset of an already-shipped fix.

## Reward-Hack Check

N/A in the traditional sense — no candidate diff was produced to critique.
The one thing worth adversarially checking is the decision *not* to ship:
verified that PR #12's `mergeDataAvailable` mechanism does in fact
strictly dominate a `prNumber`-regex-only fix (a regex fix alone leaves the
production defect — `mergedPrNumbers` never being supplied by any real
caller — completely unaddressed; PR #12 fixes that at the call-site level
via `mergeDataAvailable` and does not depend on `prNumber`'s regex being
tightened to be correct in the absence of merge data). This was checked by
reading PR #12's actual diff (`pull_request_read` method `get_files`), not
merely its description, before concluding it is a superset.

## Security Review

No code shipped tonight — no new attack surface. Reconfirmed, unchanged:
`darwin` evaluator entrypoint on `main` remains unpinned (`npx
@metaharness/darwin evolve --sandbox real`, no `<repo>` arg either — both
already diagnosed in PR #18/#20, both still unmerged). No new credential,
network, or filesystem-scope change to report.

## Scan Findings

**witness** — `packages/witness/src/index.ts` unchanged since the clean
review on 2026-09-11 (14 tests, still passing). No new issue found.

**verify** — `ledger verify`'s 9 structural errors (rows 2-6) are now
confirmed unchanged across 4 consecutive nights (2026-09-08, 09-11, 09-14,
tonight) with zero corrective action taken by any of them — each
individually correct to defer as "a human decision," but the compounding
inaction is itself now worth naming plainly in this report rather than
re-deferring silently a 5th time.

## Competitors

No new competitor research conducted tonight — the substantive
ledger-signals question (is there a real gap in this repo's own signal
computation) already has a well-evidenced answer sitting in the backlog
(PR #12/#16/#22's own reports each carry competitor tables for this
surface: OpenHands, SWE-agent, DSPy/GEPA, Sakana AI Scientist, AutoGPT
lineage — none document a directly comparable cross-repo-ledger-contamination
or review-backlog-staleness failure mode as a named, studied technique).
Re-researching an unchanged question would not reduce uncertainty.

## Gist

No `gh gist create` tool available to this session (same constraint as every
prior night — GitHub access is via MCP tools scoped to issues/PRs/branches
on `LLM-Dev-Ops/agentics-dream-machine`, no gist-creation tool present).
Committed as `docs/dream-cycle/2026-09-16-ledger-signals-report.md`.
`GIST=LOCAL`.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so the
stamp cannot be written *inside* the file it stamps (same convention as
every prior report in this series). The committed copy at
`docs/dream-cycle/2026-09-16-ledger-signals-report.md` is the frozen, hashed
artifact; this section is filled in immediately before that file is
committed, over content identical up to this point. Anyone can independently
reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-09-16-ledger-signals-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at
the start of tonight's session, before this report was committed).

## Recommendation

**Top priority, repo-wide, unchanged from #15/#23, now more urgent:**
triage and merge (or explicitly close) the seven open dream-cycle draft PRs
(#12, #14, #16, #18, #20, #22, #23) before another rotation runs. Suggested
order, since later PRs build on or are independent of earlier ones: merge
#12 first (zeroMergeStreak fix, touches `tui.ts`), then #16
(`nightsSinceLastRow`, deliberately avoided `tui.ts` to dodge conflict with
#12), then #22 (`validateRow`, additive), then the remaining
surface-specific PRs (#14, #18, #20, #23) in any order — none of them
touch `packages/ledger/src/index.ts`'s `learningSignals`/`verifyLedger`
functions, so they do not conflict with #12/#16/#22. Separately: a repo
admin should enable Code Security/code scanning (issue #10) and merge or
close dependabot PR #1 (9 advisories, 2 critical). No code change from this
or any future dream-cycle session can resolve either.
