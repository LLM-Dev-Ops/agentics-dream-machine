# Developer Experience SOTA Report — 2026

**Repo:** `LLM-Dev-Ops/agentics-dream-machine` · **Night:** 2026-09-09 · **DEEP:** developer-experience · **SCAN:** cli, tui

## TL;DR

The Dream Machine's own `learningSignals()` — the STEP 1.1 mechanism that is supposed to
bias tonight's candidate selection based on whether recent PRs merged — silently reports
`zeroMergeStreak: true` **every single night, unconditionally**, because neither the CLI's
`ledger signals` command nor the TUI dashboard ever supplies the `mergedPrNumbers` data the
function needs. Confirmed live tonight: PR #8 and PR #9 both merged (verified against GitHub
ground truth), yet `dream-machine ledger signals` on the real ledger reports
`zeroMergeStreak: true`. The candidate makes "no merge data supplied" a distinct, honestly-
labeled state instead of a false positive, and adds a `--merged <csv>` flag so real data can
be supplied.

## What's new

Nothing novel is being invented — this is a correctness fix to an existing, self-referential
control-loop signal. The finding is new: no prior dream-cycle night (2026-08-13,
2026-09-08 — both security-adversarial) touched the `ledger`/`cli`/`tui` packages, so this bug
has never been caught by a prior night's ADR or evidence trail.

## Competitors (evidence-graded)

| System | Relevant practice | Grade | Note |
|---|---|---|---|
| DORA / general AI-agent observability research | Dashboards can read "healthy" while agent quality silently drifts; activity counters (PR volume, adoption %) rise while stability metrics (change failure rate, delivery stability) fall — DORA 2024 reports 25% AI-adoption increase correlating with 7.2% lower delivery stability | B | [augmentcode.com/guides/why-ai-agent-metrics-lie](https://www.augmentcode.com/guides/why-ai-agent-metrics-lie) |
| General agent-observability guidance | An agent can look "technically healthy" (200 OK, stable latency) while failing users — the fix is correlating dashboard numbers with the actual decision path, not just surfacing a metric | B | [arize.com/guides/ai-agent-handbook/agent-observability](https://arize.com/guides/ai-agent-handbook/agent-observability/) |
| CLI ecosystem convention (NO_COLOR, TTY detection) | Absence of a capability signal (a non-TTY stream, no `NO_COLOR`) must be handled as its own explicit case, not silently coerced into "on" or "off" | B | [terminfo.dev/fundamentals/color-detection](https://terminfo.dev/fundamentals/color-detection); [no-color.org](https://no-color.org/) convention cross-checked across multiple CLI style guides in the same search |
| Sakana AI Scientist / OpenHands / SWE-agent / AutoGPT lineage | No public documentation found tonight describing how these projects distinguish "no signal data available" from "signal confirmed negative" in their own self-evaluation or review-gating dashboards | C | not independently verified tonight — flagged as a gap, not a claim |
| This repo's own ADR-0002 (2026-08-13) | Precedent for exactly this bug class: an evaluator entrypoint returning exit 0 + silence was "indistinguishable from ran clean, zero findings" until `classifyEntrypointResult` gave silence its own `suspicious-silent` verdict instead of collapsing it into success | A | `docs/adrs/ADR-0002-dream-cycle-security-adversarial-entrypoint-liveness.md`, reproducible in this repo |

## Candidates considered (score = fit + novelty + testability + measurability + production-value + reviewability, each 1–5, max 30)

| # | Candidate | Fit | Novelty | Testability | Measurability | Prod-value | Reviewability | Total |
|---|---|---|---|---|---|---|---|---|
| 1 | **Fix `zeroMergeStreak` false-positive when no merge data supplied; add `--merged` CLI flag** | 5 | 4 | 5 | 5 | 5 | 5 | **29** |
| 2 | NO_COLOR / TTY auto-detection for TUI + CLI color output | 4 | 3 | 4 | 3 | 3 | 4 | 21 |
| 3 | JSON output mode for `tui` command (machine-readable dashboard for CI bots) | 4 | 3 | 4 | 3 | 3 | 3 | 20 |
| 4 | Per-subcommand `--help` text (`ledger --help`, `witness --help`) | 3 | 2 | 3 | 2 | 3 | 3 | 16 |
| 5 | Short flags `-h`/`-v` in `parseArgs` | 3 | 1 | 3 | 2 | 2 | 4 | 15 |

**Selected: #1.** No override of the top score — #1 is both the top score and the only
candidate with direct, in-repo evidentiary backing (tonight's real GitHub check + ADR-0002
precedent) rather than general CLI-ecosystem convention.

## Frozen hypothesis (before implementation)

> Given the Dream Machine's own `docs/dream-cycle/LEDGER.md` (which, per GitHub ground truth
> checked tonight, has PR #8 and PR #9 both merged), when `dream-machine ledger signals` /
> `dream-machine tui` is run today with no merge data supplied, then `zeroMergeStreak` should
> report `false`-with-`mergeDataAvailable:false` (an honest "unknown", not a claim) instead of
> today's `zeroMergeStreak: true` (a false positive) — and when the real known-merged PR set
> is supplied via a new `--merged 8,9` flag, `zeroMergeStreak` should correctly report `false`
> — subject to: no pre-existing test weakened/removed/modified, `learningSignals()` stays pure
> (no I/O, no network calls), and the TUI footer never renders a confirmed-clean state
> ("✓ signals nominal") when merge data is actually unknown.

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest), this repo's own suite. Candidate diff: 109 changed lines
across 5 files (`packages/ledger/src/index.ts` + test, `packages/cli/src/index.ts` +
`tui.ts` + test) — one conceptual change (distinguish "no merge data" from "confirmed zero
merges"), well under the 300-line target.

**Baseline** — commit `2fba255` (current `main` HEAD tonight), fresh `npm ci && npm run build
&& npm test`: **106/106** tests green, 0 pre-existing failures.

**Candidate** — same commit + this diff, `npm run build && npm test`: **111/111** tests green
(+5 net new tests, 0 removed, 0 weakened; one existing test required a forced, non-weakening
adaptation — see Reward-Hack Check in the PR/issue).

**Live receipt against this repo's real ledger** (`docs/dream-cycle/LEDGER.md`), tying the fix
to tonight's independently-verified GitHub ground truth (PR #8 and PR #9 both confirmed merged
via the GitHub MCP `pull_request_read` tool):

```
$ node packages/cli/dist/bin.js ledger signals --path docs/dream-cycle/LEDGER.md
{ "zeroMergeStreak": false, "mergeDataAvailable": false, ... }   # honest "unknown", not a false alarm

$ node packages/cli/dist/bin.js ledger signals --path docs/dream-cycle/LEDGER.md --merged 8,9
{ "zeroMergeStreak": false, "mergeDataAvailable": true, ... }    # correctly confirms real merges

$ node packages/cli/dist/bin.js tui --path docs/dream-cycle/LEDGER.md --no-color
...
○ merge status unknown — pass --merged 8,9

$ node packages/cli/dist/bin.js tui --path docs/dream-cycle/LEDGER.md --no-color --merged 8,9
...
✓ signals nominal
```

Before this candidate, both commands above (no `--merged`, which is how every real caller in
this codebase invoked them) reported `"zeroMergeStreak": true` and rendered
`⚠ zero merges in 7 nights` — a false positive, reproduced live at the start of tonight's
session before any change was made.

**Independent critic** (separate subagent, not this candidate's author): **CLEAR** — no
reward-hacking, no weakened/removed pre-existing tests, no gold-data or threshold changes, no
evaluator exploitation, no hidden cost, no cache/non-determinism. Independently re-ran
`npm test` (111/111) and both live CLI receipts above and confirmed identical output. One
minor untested edge case flagged (`--merged ""` parses to an empty confirmed-zero Set rather
than `undefined`/unknown) — consistent with the documented flag semantics, not a defect,
logged as a follow-up rather than blocking.

## Witness

```
report_sha256 : bc9de32a2b73fdd36758b9a076daf19a4c05146169bc6dc009003c936dd88372
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : eba8cc8239a1760e4e58d35e9b6755fae217a5a0e3d271f83f192fc0ca4077bb
```

Computed with this repo's own `dream-machine witness stamp` tool
(`node packages/cli/dist/bin.js witness stamp <this-file> 2fba2550182d81b36423447221823e98e227482a`).

**Verify (5 steps, coreutils only, reproducible by anyone):**
```
curl -sL <this gist's raw URL> -o report.md
REPORT_HASH=$(sha256sum report.md | awk '{print $1}')
SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a
printf "%s%s" "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal eba8cc8239a1760e4e58d35e9b6755fae217a5a0e3d271f83f192fc0ca4077bb
```
Cross-checked locally with `dream-machine witness verify` against the file at rest before
publication (values match, above).

## Next steps (concrete, 3)

1. Wire a real `gh pr list --state merged` (or GitHub MCP equivalent) data source into a
   thin, non-pure wrapper (analogous to how `verify-entrypoint` already uses injectable
   `io.exec`) so `--merged` can be auto-populated instead of hand-typed — deferred tonight to
   keep the candidate small and match the "no model/network calls needed" bias while
   `LLM_EVAL=blocked`.
2. Apply the same "unknown vs. confirmed-negative" audit to `duplicateDirections`,
   `lowScoreStreak`, and `blockedEvalStreak` — `lowScoreStreak` already correctly defaults to
   `false` for missing data (`opts.recentScores ?? []`), so it is not affected, but this is
   worth a follow-up night to confirm generally rather than assumed.
3. Once #1 above lands, retroactively backfill `mergedPrNumbers` for the one confirmed real
   historical night this repo actually has (2026-09-08 → PR #8 and PR #9 merged) so the TUI's
   own trailing history reads correctly, not just tonight's live run. Row 3 of the ledger
   (2026-08-13, Issue #6 / PR #7) does **not** refer to a real issue/PR in this repo — this
   repo has no PR #7 (confirmed tonight: PRs #1-#6, #8, #9 exist; #7 is an issue, not a PR) —
   consistent with the 2026-09-08 row's own note that earlier rows reference issues/PRs/repos
   absent from this repo. That mislabeling is a separate ledger-hygiene finding, not fixed
   tonight (out of scope for the developer-experience candidate below).
