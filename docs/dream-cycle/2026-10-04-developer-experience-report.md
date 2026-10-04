# Developer-Experience / CLI,TUI SOTA Report — 2026

## TL;DR

Tonight's rotation (`20261004 % 5 = 4` → `DEEP=developer-experience`,
`SCAN=cli,tui`) found one new, non-duplicate, implementable finding:
`dream-machine tui` ignores the `NO_COLOR` environment variable (the
informal-but-widely-adopted standard at https://no-color.org/, honored by
npm, git, ESLint, Vitest and most modern CLIs) even though `IO.env` is
already plumbed into `run()` for exactly this purpose and was simply never
read. A user with `NO_COLOR` set globally — common in CI logs, accessibility
setups, non-ANSI terminals, log-capture pipelines — still gets raw ANSI
escape codes out of `dream-machine tui` unless they also remember the
tool-specific `--no-color` flag. Candidate: a 7-line `isNoColorEnv()` helper
plus one call-site change in `packages/cli/src/index.ts`, +7 unit tests.
Evaluated on the real suite: 106 → 113 tests, 0 regressions. This is
deliberately **separate** from the already-filed, still-unmerged
`--no-color` fixes (issue #38/PR #39: `verdictColor` leaks ANSI on the
VERDICT column under `noColor:true`; issue #48/PR #49: `--no-color=true` /
`--no-color true` value-forms are ignored by the strict `=== true` flag
check) — this candidate does not touch either of those code paths and does
not re-fix what they already fix.

The dominant finding on this repo, reconfirmed yet again tonight and now
the subject of this report's actual escalation, is operational rather than
code-level: **0 of 24 `dream/*` PRs have ever merged since 2026-09-08**
(only #8/#9, pre-dating the backlog, ever merged), because the repository's
required `CodeQL / analyze` check has never once passed — root cause filed
26 days ago in issue #10 and reconfirmed on essentially every rotation since
(#31, #36, #40, #42, #46, #52, and now this one) — and it requires a
repo-admin to enable **Settings → Code security and analysis → Code
scanning**, an action no session of this engine can take. Two nights
(2026-10-02, 2026-10-03) have no dream-cycle issue or PR at all; cause
unknown from this session's vantage (no log access to the scheduler).

## What's new

- `packages/cli/src/index.ts`'s `IO` interface has required an `env` field
  since ADR-0001 (v0.1.0) and `bin.ts` has always wired it to the real
  `process.env` — but `run()` never read it anywhere. `grep -rn "io.env"
  packages/cli/src` before tonight's candidate: zero matches outside the
  interface declaration and its two wiring sites (`bin.ts`, `index.test.ts`'s
  `mockIO` stub). The plumbing existed; the behavior it was plumbed for did
  not.
- Reproduced live, byte-for-byte, with the real built CLI (`node
  packages/cli/dist/bin.js tui --path docs/dream-cycle/LEDGER.md`):
  - Baseline, `NO_COLOR=1` set, no `--no-color` flag: **17** lines of output
    contain a raw `\x1b[` escape sequence.
  - Candidate, same invocation: **7** lines do — all of them the
    already-tracked, separately-owned `verdictColor` VERDICT-column leak
    (issue #38/PR #39), confirming the fix is scoped correctly and doesn't
    paper over that pre-existing, independently-filed defect.
  - Candidate, no env var and no flag (default): **17** lines — unchanged,
    confirming no regression to the default colored-output path.
  - Candidate, `NO_COLOR=''` (empty string): **17** lines — correctly
    *not* disabled, matching the spec's explicit "non-empty" requirement
    (`NO_COLOR=0` and `NO_COLOR=false` **do** disable color, per spec; both
    are exercised by new unit tests).
- Backlog reconfirmation (live `mcp__github__list_issues` /
  `list_pull_requests` / `pull_request_read(get_check_runs)` reads against
  the real `LLM-Dev-Ops/agentics-dream-machine` repo tonight): 24 open
  `dream/*` PRs (#12 → #53, excluding gaps), 0 merged; PR #53's (most
  recent, 2026-10-01) `get_check_runs` shows `analyze: failure`,
  `guard-and-merge: skipped` — the auto-merge guard job never even attempts
  to run because its required predecessor is permanently red. Every sampled
  PR's base matches current `main` (`2fba255`) — none are stale or
  conflicting; the sole blocker on all 24 is this one repo-admin setting.

## Hypothesis

> Given the `dream-machine tui` command invoked with the `NO_COLOR`
> environment variable present and non-empty but no `--no-color` flag,
> when the candidate change (reading `io.env.NO_COLOR` into the `tui`
> command's `noColor` decision, per the no-color.org standard) is applied,
> then the rendered dashboard's structural chrome should contain zero ANSI
> escape sequences, relative to the baseline (which emits full ANSI
> regardless of `NO_COLOR`), subject to: all pre-existing tests stay green,
> the explicit `--no-color` flag's existing behavior is unchanged, an
> empty-string `NO_COLOR` does not disable color, and no other command's
> output changes.

Frozen before implementation; not modified after evaluation began.

## Evaluation Receipt

- `npm ci && npm run build`: clean, 6/6 packages, both before and after the
  candidate.
- Baseline `npm test`: **106/106** passed (unchanged since 2026-09-08).
- Candidate `npm test`: **113/113** passed — the 7 new tests, 0 regressions,
  0 skipped, 0 modified assertions in pre-existing tests.
- `npm run lint`: clean, no new warnings.
- Live CLI receipts (not inferred from logs — actual `node
  packages/cli/dist/bin.js` invocations, byte-counted): see "What's new"
  above for the 17 → 7 / 17 / 17 figures across the four scenarios.
- `ledger verify`: still 9 pre-existing schema errors on rows 2-6
  (unchanged since 2026-09-08; fix sits unmerged in PR #33 — not this
  session's candidate, not touched tonight).
- `ledger signals`: `{"zeroMergeStreak": true, "duplicateDirections": [],
  "lowScoreStreak": false, "blockedEvalStreak": false, "nightsConsidered":
  7}` — confirms STEP 1.1's "bias to a tiny, one-parameter,
  easily-reviewable candidate" signal; tonight's candidate is exactly that
  (one env var, one call site, ~11 net lines in `index.ts`).

## Darwin Results

`DARWIN=unavailable` — `npx @metaharness/darwin` is not resolvable from this
session's registry reach (`npm error npx canceled due to missing packages`).
Consistent with every prior night's recorded Darwin status for this repo.
No bounded-evolution run attempted; not inferred or simulated.

## Evidence

- OBSERVATION: `grep -rn "io.env" packages/cli/src` (pre-candidate) → only
  the interface declaration and two wiring sites; zero behavioral reads.
- OBSERVATION: baseline live receipt, `NO_COLOR=1`, no flag → 17 ANSI-bearing
  lines (file: session scratchpad `baseline-tui-nocolor-env.txt`).
- MEASUREMENT: candidate live receipt, same invocation → 7 ANSI-bearing
  lines, all attributable to the separately-filed VERDICT-column defect.
- MEASUREMENT: `npm test` 106 → 113, 0 regressions (vitest output, both
  runs).
- INFERENCE: the 10-line delta between 17 and 7 corresponds exactly to the
  dashboard's structural chrome (border, title, stats line, signals
  footer) that `renderDashboard`'s `noColor` Proxy already gates correctly
  — confirming the candidate's fix operates at the right layer (the CLI's
  flag/env decision, not `renderDashboard` itself, which was already
  correct).
- DECISION: ship the candidate as a draft PR; do not attempt to also fix
  the VERDICT-column leak (issue #38/PR #39) or the `--no-color=true`
  parsing gap (issue #48/PR #49) in the same diff — each already has its
  own open, tested, unmerged fix; bundling would duplicate review surface
  already paid for elsewhere in the backlog.
- REJECTION: considered also wiring a `--color` force-on flag (to let a
  user override a shell-wide `NO_COLOR=1` for this one invocation, per the
  spec's suggested precedence). Rejected as scope creep for tonight's
  one-conceptual-change budget — the CLI has never had a `--color` flag at
  all, so there's no regression, just an existing gap left as-is.

## Reward-Hack Check

No benchmark, gold answer, threshold, or evaluator was touched — this
candidate adds a pure helper function and seven new unit tests against the
real `vitest` suite; it does not modify any existing assertion. Self-check
on every quantitative claim in this report: the 106/113 test counts, the
17/7 ANSI-line counts, and the 24-open/0-merged PR count are all direct
reads from tonight's live `npm test` output, live CLI invocations, and live
`mcp__github__list_pull_requests`/`pull_request_read` calls respectively —
none inferred, none carried over unchecked from a prior night's report.
**CLEAR.**

## Security Review

Change surface: one pure function (`isNoColorEnv`) reading an already-
injected, already-trusted `IO.env` map (no new input source, no new
external call, no filesystem/network access added). No credential,
permission, or trust-boundary change. Not security-sensitive.

## Scan Findings

- **cli**: see "What's new" — `IO.env` plumbed but unused is the finding;
  now wired for exactly one flag (`NO_COLOR`), nothing else added.
- **tui**: `renderDashboard`'s own `noColor` Proxy gating was re-verified
  correct in isolation (empty-ledger render paths); the residual leak is
  confined to `verdictColor()`'s direct reference to the module-level `C`
  table instead of the local Proxy-swapped `c`, already tracked as
  issue #38/PR #39 — reconfirmed present, not newly discovered, not
  fixed here.

## Competitors

npm, git, ESLint, and Vitest (grade A — official docs/source, each
independently confirmed to check `process.env.NO_COLOR`) all honor the
no-color.org convention as a baseline environment-variable override
independent of any tool-specific flag. Sakana AI Scientist, OpenHands,
DSPy/GEPA, SWE-agent, and the AutoGPT lineage were considered per
`dream.config.json#competitors` but none publish material relevant to a
CLI color-convention finding (grade C / not used to support any
quantitative claim here).

## Gist

No `gh gist create`-equivalent tool is available to this session (`gh auth
status` reports an invalid `GH_TOKEN`; the GitHub MCP server has no gist
tool). Same constraint as every prior night. Committed as this file.
`GIST=LOCAL`.

## Witness

```
report_sha256 : b2515bcb915351a386070422c3dcd0914386ef2f4f84d74333c4112754d08447
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : ec140c491af690737efb1ed22bf011167eb6918b5c8ab2115571cbb89126d51a
```

Verifier procedure (reproducible by anyone with this repo and this file):

1. `git rev-parse HEAD` at the start of this session → `session_commit`.
2. `sha256sum docs/dream-cycle/2026-10-04-developer-experience-report.md`
   → `report_sha256` (computed *before* this Witness section's hash values
   are filled in, then the section is rewritten with the result — the
   section's own text is therefore excluded from the hash it reports, by
   construction, same convention as every prior night's report).
3. `printf '%s%s' "$report_sha256" "$session_commit" | sha256sum` →
   `witness`.
4. Compare against the triple recorded above.
5. Optionally re-run `dream-machine witness verify
   docs/dream-cycle/2026-10-04-developer-experience-report.md
   2fba2550182d81b36423447221823e98e227482a <witness>` once the CLI's
   `witness verify` command is available in this checkout's `dist/`.

## Recommendation

1. **Settings → Code security and analysis → enable Code scanning**
   (admin-only; issue #10, 26 days open, reconfirmed tonight) — the single
   action unblocking every open PR's required check, including this one.
2. **Triage the backlog** — 24 open `dream/*` draft PRs, all based on
   current `main`, independently tested. This session adds a 25th; it does
   not reduce the count, because the blocker in (1) is outside this
   session's authority.
3. Investigate the 2026-10-02 / 2026-10-03 gap (no dream-cycle issue or PR
   either night) — not actioned by this session (no access to scheduler
   run history).
4. Consider pausing the nightly cron until review capacity exists, or until
   (1) is resolved — not actioned by this session (infra/schedule change
   outside tonight's bounded scope, same as every prior recommendation of
   this kind).

Evaluated: `attempted and accepted (local evidence): NO_COLOR env support
for dream-machine tui, 113/113 tests, 0 regressions`. Candidate ACCEPT is
independent of, and does not resolve, the repo-level backlog/CodeQL
REJECT-by-infrastructure finding, which remains `INCONCLUSIVE`-by-blocker
pending human action on issue #10.
