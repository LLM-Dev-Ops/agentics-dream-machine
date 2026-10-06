# Ledger-Signals SOTA Report — 2026-10-06

**Rotation**: `DAYINT=20261006`, `SLOT=1` → `DEEP=ledger-signals`, `SCAN=witness,verify`. No bonus deep dive (`20261006 % 25 = 6`, `% 75 = 6`). `SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a` (unchanged since 2026-09-08 — nothing has merged since).

## TL;DR

This is the 5th `ledger-signals` night (2026-09-11 #15/16, 2026-09-21 #32/33, 2026-09-26 #42/43, 2026-10-01 #52/53, tonight). Real GitHub state checked fresh tonight: **25 open `dream/*` PRs** (#12 through #57, up from 22 on 2026-10-01) plus 6 dependabot PRs; **only 2 PRs have ever merged** (#8, #9, both 2026-09-08, confirmed via `pull_request_read`). CodeQL is now **63/63 failed runs on record**, including the latest scheduled run directly against `main` (run 61) — issue #10's admin-only root cause, unchanged since 2026-09-08. These two numbers have been independently reconfirmed on every `ledger-signals` night since 2026-09-11; per this repo's own STEP 1.1 learning-signal rule ("a finding repeated in ≥3 prior nights → rotate"), tonight does **not** ship a 6th reconfirmation of the same two numbers as its headline. Instead it closes a concrete, previously-identified, unimplemented gap.

**Candidate**: a `backlogSaturated` learning signal, following the existing `--merged`-style design precedent (PR #12, unmerged): `learningSignals()` gains an explicit, caller-supplied `openCandidateCount` option (never fetched over the network — no I/O, stays pure) and reports `backlogSaturated: true` once it reaches a configurable `backlogThreshold` (default 10), with `backlogDataAvailable` distinguishing "unknown" from "confirmed not saturated." Wired through `ledger signals --open N` and `tui --open N`. This is plumbing toward issue #42's recommendation #5 ("wire STEP 1's ledger check to also query open `dream/*` PRs... not implemented tonight") — **it does not close that gap tonight**: per the independent critic below, nothing in `packages/compile/src/index.ts` (the compiler that generates this very nightly prompt) or any workflow yet tells a future session to compute the real count and pass `--open`. The signal is correct and available; nothing calls it unattended yet. That is honestly the same state PR #12's `--merged` flag has been in since 2026-09-09.

## What's new since the last ledger-signals night (2026-10-01, PR #53)

- Backlog: 25 open `dream/*` PRs (was 22 on 10-01, 17 on 09-26, 15 on 09-25, 3 on 09-11). Still 0 merged beyond #8/#9.
- CodeQL: 63/63 recorded failures (was 47/47 on 09-26), including run 61 (`event=schedule`, `head_branch=main`, no PR) — reconfirms issue #10's root cause is unchanged.
- `main`'s own `ledger verify` still reports the original **9 schema errors** in rows 2-6 (contaminated rows inherited from a different repo context, flagged 2026-09-08, fix unmerged in PR #33). Reproduced again tonight, not fixed here (out of scope for this candidate — fixing ledger *data* and adding a *signal* are separate, independently reviewable changes; conflating them would make this diff larger and harder to review).
- `learningSignals()`'s `zeroMergeStreak` false-positive (defaults `true` whenever no merge data is supplied, fixed in unmerged PR #12) is also reproduced tonight, also not re-fixed here — PR #12 already fixes it correctly; shipping a second competing fix would duplicate unreviewed work, the exact mistake a 2026-09-26 session caught itself making and withheld.
- New, not previously reported: tonight's `verify-entrypoints` run against the real `dream.config.json` found the `darwin` evaluator entrypoint classifies **live** (exit 0) for the first time in this repo's history — this environment now has npm registry network access (unlike 2026-09-08's `blocked`/not-locally-cached result). Running the real, unpinned `npx @metaharness/darwin evolve --sandbox real` command for real (not `--no-install`, since that is what `verify-entrypoints` is specified to run) reproduced two already-known, already-reported, still-unfixed defects live for the first time in this environment:
  1. The stray `--sandbox/.metaharness/` directory bug (issue #17, fix in unmerged PR #18) — the entrypoint misparses its own `--sandbox` flag as a positional `<repo>` argument. Removed after confirming it held no files; not committed.
  2. The subprocess printed `Error: darwin: autonomous or generated child id already exists: g1_v0` to stderr yet exited **0** — `classifyEntrypointResult` correctly calls this `live` per its own documented contract (exit 0 + output = live, not silent), but a real `Error:` line surviving to a `live` verdict is worth flagging for a future `redblue`/`verify` night: not a defect in tonight's candidate, not fixed tonight (different surface, would widen this diff).

## Frozen hypothesis (before implementation)

> Given this repo's own `learningSignals()` (`packages/ledger/src/index.ts`), which already has one precedent (the unmerged `--merged` flag in PR #12) for making a signal honest about "unknown" vs "confirmed negative" input, when an explicit, caller-supplied `openCandidateCount` is added following the identical pattern, then `learningSignals()` should report `backlogSaturated: true` once that count reaches `backlogThreshold` (default 10) and `backlogDataAvailable: false` (never a false "not saturated") when the count is omitted — subject to: the function stays pure (no I/O, no network call fetches the count itself — the 2026-09-26 night's `fetch()`/proxy failure is the documented reason why), no pre-existing test weakened/removed/modified, and the real count supplied against this repo's actual GitHub state tonight (25) correctly reports `backlogSaturated: true` at the default threshold.

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest), this repo's own suite, fresh `npm ci && npm run build`.

| | Baseline (parent, commit `2fba255`, current `main`) | Candidate (working tree) |
|---|---|---|
| Test files | 7 | 7 |
| Tests | 106 | **114** (+8, 0 removed, 0 modified) |
| Result | 106 passed | 114 passed |
| Lint (`npm run lint`) | clean | clean |
| Build (`tsc -b`, 6 packages) | clean | clean |
| `typecheck` | pre-existing `TS18002` (empty root `tsconfig.json` files list) | **identical** pre-existing error, reproduced on a clean `git stash` of this diff — not a regression |

Diff: 5 files changed, ~115 changed lines (one conceptual change: an explicitly-supplied backlog-saturation signal), well under the 300-line target.

Live receipt against this repo's real `main`-branch ledger and tonight's real GitHub-sourced count (25 open `dream/*` PRs, gathered via the GitHub MCP `list_pull_requests` tool, not fabricated):

```
$ node packages/cli/dist/bin.js ledger signals --path docs/dream-cycle/LEDGER.md --open 25
{
  "zeroMergeStreak": true, "duplicateDirections": [], "lowScoreStreak": false,
  "blockedEvalStreak": false, "nightsConsidered": 7,
  "backlogDataAvailable": true, "backlogSaturated": true
}

$ node packages/cli/dist/bin.js ledger signals --path docs/dream-cycle/LEDGER.md --open 5
{ ..., "backlogDataAvailable": true, "backlogSaturated": false }

$ node packages/cli/dist/bin.js ledger signals --path docs/dream-cycle/LEDGER.md
{ ..., "backlogDataAvailable": false, "backlogSaturated": false }   # honest "unknown", never a false "not saturated"

$ node packages/cli/dist/bin.js tui --path docs/dream-cycle/LEDGER.md --no-color --open 25
...
│ ⚠ zero merges in 7 nights   ⚠ backlog saturated (25 open, unreviewed)        │
```

See Reward-Hack Check below for the independent critic's full verdict (CLEAR, 1 scoping caveat, 2 nits — all addressed before this report was finalized).

## Darwin

`DARWIN=not-applicable` — a small, pure, fully-branch-covered signal addition has no evolvable population; bounded Darwin is reserved for candidates with a real fitness landscape.

## Evidence

- OBSERVATION: `learningSignals()` has had no signal reflecting GitHub's real open-PR backlog since this repo's founding; issue #42 (2026-09-26) named this gap explicitly as recommendation #5 and it was not implemented across 2 subsequent `ledger-signals` nights (#42 itself, #52 on 10-01).
- MEASUREMENT: 25 open `dream/*` PRs tonight (GitHub ground truth, `list_pull_requests`); `npm test` 106→113, 0 regressions; `ledger signals --open 25` correctly reports `backlogSaturated: true`; `--open 5` correctly reports `false`; no flag reports `backlogDataAvailable: false`.
- INFERENCE: the design precedent set by PR #12 (explicit flag, no network fetch) generalizes correctly to a second signal with the same honesty property, without re-introducing the `fetch()`/proxy failure mode a 2026-09-26 session discovered the hard way.
- DECISION: do not also fix the 9 ledger schema errors or the `zeroMergeStreak` false-positive tonight — both already have an independent, unmerged, previously-evaluated fix (PR #33, PR #12 respectively); shipping a third overlapping diff would make all three harder to review, not easier.
- REJECTION: a network-fetched version of this signal (calling the GitHub API directly from `packages/cli`) — rejected for the same reason PR #12's author rejected it: this environment's proxy requires `NODE_USE_ENV_PROXY=1` for Node's `fetch()` or a `curl`-shelling `io.exec` wrapper, adding a fragile, environment-dependent dependency to what should stay a pure, five-minute-to-review function.

## Reward-hack check

**Independent critic** (separate subagent, not this candidate's author, given no prior context about this specific diff): **CLEAR**, with one important scoping caveat and two non-blocking nits, all three acted on before publishing this report:

- Verdict, independently reproduced (not trusted from this session): fresh `npm ci && npm run build && npm test && npm run lint` — build clean, originally 113/113 (now 114/114 after the fix below), lint clean. `learningSignals` confirmed to have no `fetch`/`fs`/`process`/`Date.now`/`Math.random` — purity holds. No existing assertion weakened, no threshold/gold data altered self-servingly; `backlogThreshold` defaults to 10 (matching the point several prior nights flagged "review queue, not candidate quality, is the bottleneck"), not reverse-engineered from tonight's count of 25. Boundary-tested at 9/10, no off-by-one. No duplication found elsewhere in the repo.
- **Scoping caveat (not a defect, addressed above in TL;DR/Candidate)**: like PR #12's `--merged`, this signal isn't yet wired into the compiled routine prompt or any workflow — so it doesn't make a real nightly session pass `--open` automatically tonight. Corrected: this report no longer claims to close issue #42's recommendation #5, only to make closing it possible.
- **Nit, fixed**: `parseNumberFlag` silently accepted negative/fractional `--open` values as "available" data. Fixed — now requires a non-negative integer (`Number.isInteger(n) && n >= 0`), with 2 new regression tests (`--open -5`, `--open 10.5` both correctly report `backlogDataAvailable: false`). Tests now 114/114.
- **Nit, fixed**: a test name overclaimed "from real GitHub-sourced data" for a hardcoded `--open 25` call with no real API call in the test — renamed to "supplies a caller-provided open-candidate count."
- **Nit, fixed**: the CLI `--help` text's explanatory paragraph was inserted mid-table, breaking the aligned command list — moved below the full command list.

## Security review

No new I/O, network, exec, or credential surface — `openCandidateCount` is a plain number passed through existing pure-function and CLI-flag plumbing, same trust boundary as the existing `--merged` design. Separately (not part of this candidate, see "What's new"): tonight is the first night this environment's `npx @metaharness/darwin` entrypoint resolved and executed over the network — reconfirming a standing, previously-flagged (2026-09-08) finding that `dream.config.json`'s `darwin` entrypoint is unpinned (no version, no `--no-install` guard), so an unattended nightly run executes whatever is currently published at that package name. Not fixed tonight (a `dream.config.json` edit is a distinct, human-reviewable decision, as the 2026-09-08 report already concluded).

## Scan findings (SCAN=witness, SCAN=verify)

- **witness**: `dream-machine witness stamp`/`verify` round-trip correctly against tonight's report once stamped (see Witness section); all 14 witness unit tests still pass. No defect found. Per the 2026-09-19 finding (issue #29) that a report must never embed its own witness triple inline before being stamped, this report's Witness section is filled in last, over content identical up to that point, and verified against the committed file, not an in-memory draft.
- **verify**: `dream-machine ledger verify` against `main`'s real ledger still correctly reports the pre-existing 9 schema errors (rows 2-6, contaminated, fix unmerged in PR #33) — correct behavior given the fix is unmerged, not a new defect. `verify-entrypoints` against the real `dream.config.json` found `bench: live` (unchanged) and, newly, `darwin: live` (previously `blocked` — see "What's new" for the live-reproduction findings this surfaced).

## Competitors (evidence-graded)

| System | Relevant mechanism | Grade | Contrast with tonight's finding |
|---|---|---|---|
| This repo's own PR #12 (unmerged, 2026-09-09) | `mergeDataAvailable` distinguishes "no data" from "confirmed zero" for `zeroMergeStreak` | A (in-repo, reproducible) | Direct design precedent tonight's `backlogDataAvailable` extends to a second signal |
| DSPy GEPA (`stanfordnlp/dspy`) | Reflective optimizer explicitly tracks whether execution-trace feedback was actually collected, rather than treating absence as a negative result | A (official docs) | Same honesty-about-missing-data principle, applied here to backlog size instead of trace feedback |
| Sakana AI Scientist | Reviewer-flagged provenance/versioning gap in its cross-iteration "archive of knowledge" (arXiv:2502.14297) | B | Analogous risk class: a learning signal that can't tell "no data" from "good news" is exactly this kind of silent archive gap |
| OpenHands | Ephemeral per-run session state, no durable cross-run learning-signal analog | B | Has no equivalent mechanism to carry this exact defect, because it has no equivalent memory |
| SWE-agent | Every patch merges via human review; no autonomous multi-night backlog-accumulation concept | B | This repo's actual operating condition (25 unreviewed PRs, 0 merged) is the scenario SWE-agent's design assumes away entirely |

## Gist

No `gh gist create`-equivalent tool available to this session (`gh auth status` reports the `GH_TOKEN` in this environment is invalid; consistent with every prior night's record). `GIST=LOCAL` — committed here instead, per standing precedent.

## Witness

Per the 2026-09-19 finding (issue #29) — a report must never embed its own `report_sha256`/`witness` triple inline, since that self-reference makes the published hash unreproducible against the actual committed file (6 of 10 backfilled reports failed exactly this way). This repo's own `dream-machine witness stamp` is run once, after this file reaches its final committed content, and the resulting triple is published **externally only** — in this PR's description and in the `LEDGER.md` row — never pasted back into this section.

Verify (5 steps, coreutils only, reproducible by anyone against the committed file and the published triple):

```bash
git show <this-commit>:docs/dream-cycle/2026-10-06-ledger-signals-report.md | sha256sum
# REPORT_HASH = the value above
SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in this PR's description and the LEDGER.md row
```

## Recommendation

`evaluated: accepted` for tonight's `backlogSaturated` candidate (evaluation complete, effect positive relative to the status quo of no signal at all, 0 regressions, tests green, reward-hack clear — critic's scoping caveat and nits addressed, not waived — security clear). This session never merges — recommend, in priority order:

1. **Enable GitHub Advanced Security / Code scanning** in repo Settings (issue #10, 28 days open, 63/63 runs failed, admin-only — blocks every PR, including this one, from ever showing green CI).
2. **Merge PR #33** (ledger contamination removal + `ledger verify` CI gate) — fixes the root of the 9 recurring schema errors several nights have independently reconfirmed.
3. **Merge PR #12** (`zeroMergeStreak` honesty fix) — small, self-contained, already critic-cleared on 2026-09-09, and the direct design ancestor of tonight's candidate.
4. Review and merge tonight's PR (small, additive, no existing behavior changed) — or reject it with specific feedback; either outcome produces more signal than another night sitting unopened in the queue.
5. **Not done tonight, explicitly flagged by the independent critic**: wire `packages/compile/src/index.ts`'s compiled STEP 1/1.1 instructions (and PR #12's `--merged`) to actually tell a future nightly session to run `gh pr list --label dream-cycle --state open --json number | jq length` (or the GitHub MCP equivalent) and pass the result via `--open`/`--merged` — only then does this signal (and PR #12's) affect a real unattended run instead of just being available for one. Left for a future `ledger-signals` or `compiler-parity` night as its own reviewable diff, consistent with keeping tonight's candidate small.
6. Consider pinning `dream.config.json`'s `darwin` entrypoint to an exact version with `--no-install`/`-y` semantics made explicit — tonight is the first night this repo's environment actually executed it unpinned over a live network connection (see Security Review).
