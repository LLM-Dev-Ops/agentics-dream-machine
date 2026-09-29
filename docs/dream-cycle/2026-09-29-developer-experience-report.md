# Developer-Experience / CLI-TUI SOTA Report — 2026

## TL;DR

Tonight's `DEEP=developer-experience`, `SCAN=cli,tui` (slot 4, `DAYINT=20260929`,
no bonus deep dive: `20260929 % 25 = 4`, `% 75 = 54`). Found and fixed a fresh,
previously-unreported bug in `dream-machine`'s CLI flag handling, independent of
the already-known (still-unmerged, PR #39) `verdictColor` ANSI-leak bug: the
`tui` command's `--no-color` flag was read with a strict `flags['no-color'] ===
true` check. `parseArgs`'s `--key val` grammar means `--no-color=true` and
`--no-color true` (space form) both arrive as the *string* `"true"`, not the
boolean `true` — so both of those natural, commonly-tried forms silently left
color **on** while only the bare `--no-color` (no following value) worked.
Candidate: a new pure `flagBool()` helper (`packages/cli/src/index.ts`) that
accepts the boolean and the common truthy string forms (`'true'`, `'1'`,
`'yes'`), used at the one call site. `npm test` 106/106 → 111/111 (+5 net new,
0 removed/modified pre-existing tests), live CLI receipt confirms the fix.

## What's new

- Reproduced tonight, live, against this repo's real `dream-machine` CLI
  binary (`node packages/cli/dist/bin.js tui --path docs/dream-cycle/LEDGER.md
  <flag-form> | cat -v | grep -c '^\['`):
  - `--no-color` (bare): 7 leaked escape pairs (the pre-existing, separately
    tracked `verdictColor` bug — issue #38 / PR #39, unmerged, not touched
    tonight).
  - `--no-color=true`: **17** leaked pairs — same as fully colored output.
    Color was not disabled *at all*.
  - `--no-color true`: **17** — same failure.
  - After tonight's candidate, all three forms read exactly **7** (identical
    to the bare form) — the equals- and space-value forms now behave
    identically to the bare flag, decoupled from the separate, still-open
    `verdictColor` bug.
- Root cause: `packages/cli/src/index.ts`'s `tui` handler used
  `flags['no-color'] === true`. `parseArgs` (same file) is a generic
  `--key val` / `--key=val` / bare-bool parser shared by every flag (`--path`,
  `--out`, `--env`, `--repo`, ...); it cannot itself know `--no-color` is
  meant as a boolean switch, so a value-following form always produces a
  string. Only one call site in the whole `packages/cli/src` tree used this
  strict-boolean pattern (`grep -n "=== true" packages/cli/src` → 1 hit,
  confirmed via ripgrep tonight), so the fix is fully local — no other flag
  needed touching.
- Existing test coverage gap: three pre-existing `tui`/`--no-color` tests
  (lines 282-299 of `index.test.ts` before tonight) only ever exercised the
  bare flag form. No test exercised `--no-color=true` or the space-value form
  — the exact gap that let this ship, structurally identical in kind (not in
  location) to the coverage gap issue #38 found for `verdictColor` five nights
  ago: `--no-color`'s *contract* keeps getting tested narrower than its
  *documented* surface (`--help` text: `tui [--path LEDGER.md] [--no-color]`,
  silent on accepted value forms, but `--key=val` is this CLI's own advertised
  general grammar per `HELP`'s other entries).

## Hypothesis (frozen before implementation)

> Given the `dream-machine` CLI's `tui` command and its `--no-color` flag,
> when the flag-read is changed from a strict `flags['no-color'] === true`
> check to a new `flagBool()` helper that also accepts the string forms
> `'true'`, `'1'`, `'yes'` (in addition to the boolean `true`), then invoking
> `tui --no-color=true` or `tui --no-color true` should render a dashboard
> frame identical (byte-for-byte `stdout`) to the pre-existing, already-working
> bare `tui --no-color` form, while omitting `--no-color` entirely continues to
> render full ANSI color — subject to: 0 pre-existing tests weakened, removed,
> or modified; no other flag's parsing behavior changed; the fix stays a single
> local helper plus its one call site, not a rewrite of `parseArgs` or the
> color system.

Not modified after evaluation began.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), fresh `npm ci && npm run build` on
`2fba2550182d81b36423447221823e98e227482a` (`main` HEAD at session start).

```
Baseline  (2fba255, unmodified): 106/106 tests passing
Candidate                      : 111/111 tests passing, +5 net new, 0 removed, 0 weakened, 0 regressions
lint (npm run lint)            : clean, before and after
typecheck (npm run build, tsc) : clean, before and after
```

Live CLI receipt, baseline vs. candidate (`git stash` / `git stash pop` around
a fresh `npm run build`, real ledger `docs/dream-cycle/LEDGER.md`, counting
raw `\x1b[` escape-sequence starts):

```
                  --no-color   --no-color=true   --no-color true
baseline               7              17                17
candidate               7               7                 7
```

`--no-color` (bare) is unchanged at 7 both before and after — that residual 7
is the separate, still-open `verdictColor` bug (#38/PR #39), correctly *not*
touched or masked by tonight's candidate. The equals- and space-value forms
move from "color fully on" (17, indistinguishable from not passing the flag at
all) to exactly matching the bare form.

## Darwin Results

`DARWIN=not-applicable` — deterministic, single-root-cause parsing bug with one
clear correct answer (accept the flag-value forms the codebase's own general
`--key=val`/`--key val` grammar produces); no evolvable population, consistent
with how prior `developer-experience` nights (#11, #21, #38) treated
comparably small, deterministic fixes.

## Evidence

- OBSERVATION: `tui --no-color=true` and `tui --no-color true` both leave
  color fully enabled (17/17 leaked escape pairs, identical to omitting the
  flag), reproduced live against `main`'s real CLI binary and real ledger,
  pre-candidate.
- OBSERVATION: exactly one `=== true` strict-boolean flag check exists in
  `packages/cli/src` (`grep -rn "=== true" packages/cli/src`), confirming the
  fix's scope is genuinely local and not part of a wider pattern needing a
  bigger rewrite.
- OBSERVATION: 3 pre-existing tests exercised only the bare `--no-color` form;
  0 exercised the equals/space-value forms — the coverage gap that shipped
  this bug.
- MEASUREMENT: baseline 106/106 → candidate 111/111; live receipt
  `--no-color=true`/`--no-color true` 17→7 leaked pairs each; bare form
  unchanged at 7 (decoupled from the separate #38/PR#39 bug).
- INFERENCE: this CLI's own general flag grammar (`--key=val` is documented
  and used throughout `HELP`, e.g. `--env ID`, `--out FILE`) creates a
  reasonable user expectation that *every* flag accepts the equals form with
  an explicit value — a boolean-semantic flag that silently ignores that form
  is a real usability contract break, not a hypothetical one.
- DECISION: implement as one small, exported, independently-unit-tested pure
  function (`flagBool`) rather than special-casing the `tui` command's flag
  read inline, so the same helper is available (not yet wired, see
  Recommendation) if another boolean flag needs the same treatment later.
- REJECTION: considered also rewriting `parseArgs` itself to accept a schema
  of which flags are boolean-typed vs. string-typed, so every future flag gets
  this for free. Rejected for tonight: that is a broader parser-architecture
  change (touches every command's flag handling, not just `tui --no-color`),
  violates the one-conceptual-change/tiny-candidate bias this repo's own
  learning signal calls for after 24 consecutive unmerged dream-cycle PRs (see
  Ledger Check), and is exactly the kind of scope-creep STEP 2 says prior
  nights (e.g. #21) have deliberately held back before.

## Reward-Hack Check

Independent adversarial critic subagent (fresh context, did not author the
change) returned **CLEAR** after: diffing against `HEAD` to confirm 0
pre-existing test lines were removed or modified (only additions); confirming
`flagBool` generalizes correctly (handles `'0'`, `''`, `undefined`, not just
the literal repro strings) rather than being cherry-picked to the exact repro;
confirming no `.skip`/`.only`/mocked assertions or softened thresholds;
confirming no other flag or call site depends on the old strict-`true`
behavior (`flagBool` used exactly once); and independently re-running
`npm run build && npm test` to verify the 106→111 counts itself rather than
trusting the claim.

## Security Review

Not security-sensitive: no new `exec`/shell/network/filesystem/credential
surface — `flagBool` is a pure string/boolean classification function over
data already fully in scope (a parsed CLI flag), with no I/O. No MCP or
tool-permission surface touched. No evaluation gate, benchmark, threshold, or
`.github/` file touched (relevant to the guarded-auto-merge protected-path
check — see Recommendation).

## Scan: cli

1. **(this candidate)** `--no-color=true` / `--no-color true` silently left
   color on — fixed tonight, see above.
2. **Reconfirmed, not fixed tonight**: `flags.help` / `flags.version` (`run()`,
   `index.ts` line ~120/124) use a bare truthy check, not `flagBool` — so
   `--help=false` would (inconsistently, the mirror-image of tonight's bug)
   still show help, since the non-empty string `"false"` is JS-truthy. Very
   low real-world impact (no one meaningfully wants `--help=false` to *not*
   show help), flagged for visibility only; not the same failure class as
   tonight's (that one silently drops a real, useful override — this one
   never fires (nobody would then complain about `--no-color`-style silent
   behavior loss), so not worth bundling into a one-conceptual-change
   candidate).

## Scan: tui

1. **Reconfirmed, not fixed tonight** (issue #38, PR #39, unmerged): the
   `verdictColor()` ANSI-leak bug is still present on `main` — bare
   `--no-color` still leaks 7 escape pairs on the VERDICT column tonight,
   identically to 5 nights ago. Tonight's candidate is decoupled from it by
   design (see Evaluation Receipt) so the two fixes can land independently
   and don't conflict when both eventually merge.
2. No new `tui` rendering bug found beyond the above tonight.

## Ledger Check

`main`'s `docs/dream-cycle/LEDGER.md` (HEAD `2fba255`) still ends at the
2026-09-08 row; 24 more nightly cycles since then (2026-09-09 → 2026-09-28)
each produced an evaluated, evidence-backed report, every one sitting only on
its own open, draft, unmerged PR (#12–#47, verified live via
`list_pull_requests`: 24 open dream-cycle PRs, 0 merged since #8/#9). `ledger
signals` against the real ledger: `{"zeroMergeStreak": true,
"duplicateDirections": [], "lowScoreStreak": false, "blockedEvalStreak":
false, "nightsConsidered": 7}`. `ledger verify` still reports the same 9
pre-existing schema errors in contaminated rows 2-6 (tracked since 2026-09-08,
quarantine fix exists as unmerged PR #33 — not redone tonight).

Per STEP 1.1: `zeroMergeStreak: true` biases tonight toward a tiny,
one-parameter, easily-reviewable candidate — followed (8 lines of production
code, one new pure function, one call-site change). Separately, the specific
"auto-merge is structurally dead because every PR opens as draft" finding has
now been independently reconfirmed 6+ consecutive nights running (#36→#37
through #46→#47, both `developer-experience` and `security-adversarial`
slots) with no code left to write — PR #37 already shipped the compiler-side
honesty fix (report "CONFIGURED, currently UNREACHABLE" instead of a false
"ENABLED" claim) and remains unmerged, unactioned by a human, 6 nights later.
Per the same learning signal ("a finding repeated ≥3 prior nights → rotate
... surface"), tonight deliberately did **not** re-produce a 7th consecutive
restatement of that finding — it is fully evidenced already (see #46/#47) and
adding an 7th identical report has zero marginal evidentiary value. This
report's Recommendation names it once, briefly, without new investigation.

## Competitors

| Project / practice | Relevant approach | Grade | Note |
|---|---|---|---|
| POSIX Utility Syntax Guidelines / GNU `getopt_long` | Long options declare, at registration time, whether they take an argument (`no_argument` / `required_argument` / `optional_argument`) — a boolean flag structurally cannot receive a stray string value in the first place | A (official POSIX/GNU documentation) | Names the *general* fix this repo's own `parseArgs` doesn't attempt (a flag-type schema) — tonight deliberately scoped narrower than this (see Evidence/REJECTION), consistent with the tiny-candidate bias |
| `yargs` (yargs/yargs) | `.boolean('no-color')` explicitly declares a flag's type; the parser then coerces `--no-color=true`/`--no-color false`/bare correctly by construction, no per-call-site coercion needed | B (official docs, cross-checked against README) | Same lesson as GNU getopt, from a JS-ecosystem CLI framework peer; this repo's own hand-rolled `parseArgs` predates any such declaration and tonight's fix works around that at the single affected call site rather than adopting a schema |
| no-color.org (informal `NO_COLOR` standard) | Any non-empty `NO_COLOR` env var suppresses color; `--no-color`-style explicit flags are the CLI-specific analog | A (official spec) | Reconfirms (from issue #38's prior-night finding, not re-verified tonight) that this CLI still has no `NO_COLOR` env-var support, only the flag — unrelated to tonight's specific bug, not actioned |
| Sakana AI Scientist / OpenHands / DSPy-GEPA / SWE-agent / AutoGPT lineage | No public documentation found tonight on CLI boolean-flag-value coercion specifically | — | Considered per STEP 3's mandatory competitor scan; no claim graded, consistent with these projects not publishing CLI-ergonomics-level implementation detail |

## Gist

No `gh gist create`-equivalent tool available to this session (same constraint
every prior night in this repo has recorded — reconfirmed tonight via a fresh
`ToolSearch` of the GitHub MCP server's tools; none creates a gist). Committed
as `docs/dream-cycle/2026-09-29-developer-experience-report.md`. `GIST=LOCAL`.

## Witness

The witness triple for this exact committed file is published externally (PR
body and `LEDGER.md` row only) — never inline in this file itself, per the
self-reference paradox issue #29 (2026-09-19) diagnosed across 6/10 backfilled
nights (embedding the triple here would change this file's own hash after the
fact). Verification, reproducible by anyone:

```bash
REPORT_HASH=$(git show <SESSION_COMMIT_OF_THIS_REPORTS_OWN_COMMIT>:docs/dream-cycle/2026-09-29-developer-experience-report.md | sha256sum | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "<SESSION_COMMIT>" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at the
start of tonight's session, before this candidate's changes). REPORT_HASH and
WITNESS are published in the PR body and the `LEDGER.md` row, both pointing
back at this file by path and commit.

## Recommendation

`evaluated: accepted`.

1. Review/merge one of the 25 open zero-merge `dream-cycle` draft PRs — the
   backlog itself remains the binding constraint on this repo's evolution
   loop, not tonight's or any single candidate's quality. PR #37 in
   particular (`assessMergePolicyReachability`) is the smallest unblock for
   the recurring auto-merge-dead finding and has now been independently
   reconfirmed unmerged across 6 consecutive nights.
2. Consider wiring `flagBool` (or a small schema-driven upgrade to
   `parseArgs` itself, per the GNU-getopt/yargs precedent above) into
   `flags.help`/`flags.version` too, for consistency — not bundled tonight
   (see Scan: cli #2), low priority.
3. PR #39 (`verdictColor` ANSI-leak fix) remains a clean, independent,
   still-open candidate that would take the bare `--no-color` receipt from
   7→0 once merged — orthogonal to and compatible with tonight's change.
