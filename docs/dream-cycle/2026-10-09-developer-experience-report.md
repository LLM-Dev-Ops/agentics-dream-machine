# Developer-Experience / CLI,TUI SOTA Report — 2026

## TL;DR

Tonight's rotation (`DAYINT=20261009`, `20261009 % 5 = 4` → `DEEP=developer-
experience`, `SCAN=cli,tui`; no bonus deep dive: `% 25 = 9`, `% 75 = 59`).

This repo's `--no-color`/`NO_COLOR` TUI contract has three separate,
independently-authored, independently-tested, still-open PRs each fixing a
different facet of the same contract: **#39** (`verdictColor` leaks ANSI on
the VERDICT column even under `--no-color`), **#49** (`--no-color=true` and
`--no-color true` value-forms are silently ignored by a strict `=== true`
check), and **#55** (`tui` never reads the `NO_COLOR` env var at all). None
has merged — this repo has had **zero merges in the last 26+ `dream/*` PRs**
(reconfirmed again tonight; root cause is issue #10, a repo-admin-only
CodeQL gap, 36 days open, already diagnosed and not re-litigated here).

Tonight's finding is not a fourth independent fix. It is that **#49 and #55
textually conflict with each other** — both redefine the exact same
function-insertion point and the exact same call-site line in
`packages/cli/src/index.ts` — reproduced live with a real `git merge`, not
inferred. Whichever of the two a human merges first, the other will arrive
as a real conflict, not a clean fast-forward, adding friction to an already
stalled backlog. The candidate is a single, consolidated diff that applies
the union of all three fixes (`verdictColor` parameterization +
`flagBool` + `isNoColorEnv`, OR'd together at the one call site), evaluated
end-to-end on the real suite and the real CLI binary, intended to let a
human close #38/#39, #48/#49, #54/#55 with one merge instead of three
(and a conflict-resolution step) — reducing the backlog by net 2 PRs rather
than adding a 27th.

## What's new

- Live, reproducible proof of the conflict (not inferred from reading diffs):
  fetched `origin/dream/2026-09-29-developer-experience` (PR #49, head
  `fdd865f`) and `origin/dream/2026-10-04-developer-experience` (PR #55,
  head `33cb363`), both based on `main @ 2fba255`. `git merge` of #49 into a
  scratch branch off `main` fast-forwards cleanly; `git merge` of #55 on top
  of that **fails** with real `CONFLICT (content)` markers in
  `packages/cli/src/index.ts` (both the new-function insertion point and the
  `tui` case's `noColor:` call-site line), `packages/cli/src/index.test.ts`,
  and `docs/dream-cycle/LEDGER.md`. `git merge-tree --merge-base` against
  the actual GitHub-hosted commits reproduces the identical three-file
  conflict non-interactively. Full conflict hunk (`index.ts`):
  ```
  <<<<<<< HEAD (after merging #49)
  export function flagBool(v: string | boolean | undefined): boolean { ... }
  =======
  export function isNoColorEnv(env: ...): boolean { ... }
  >>>>>>> dream/2026-10-04-developer-experience (#55)
  ...
  <<<<<<< HEAD
          sink.log(renderDashboard(md, { noColor: flagBool(flags['no-color']), ... }));
  =======
          const noColor = flags['no-color'] === true || isNoColorEnv(io.env);
          sink.log(renderDashboard(md, { noColor, ... }));
  >>>>>>> dream/2026-10-04-developer-experience
  ```
- PR #39 (`verdictColor`, in `tui.ts`) does **not** textually conflict with
  either #49 or #55 (different file/function) — confirmed via the same
  merge simulation extended to include #39 first. The conflict is
  specifically a #49-vs-#55 problem, both scoped to `index.ts`'s one
  `tui` call site.
- All three PRs' own reports independently reconfirmed the zero-merge
  backlog and each explicitly declined to touch the others' code "to avoid
  duplicating review surface already paid for elsewhere" — a reasonable
  per-night decision that, compounded across three separate nights with no
  human merge in between, is exactly what produced the conflict none of
  them could have seen coming (each was written before the next existed).

## Hypothesis (frozen before implementation)

> Given `packages/cli/src/index.ts`'s `tui` command and `packages/cli/src/
> tui.ts`'s `verdictColor` helper, when a single candidate applies the union
> of PR #39's color-table parameterization, PR #49's `flagBool` flag-value
> coercion, and PR #55's `isNoColorEnv` environment-variable check (OR'd
> with the explicit flag), then: (a) `npm test` passes with 0 regressions
> relative to the `2fba255` baseline; (b) the real CLI binary renders zero
> ANSI escapes for `--no-color`, `--no-color=true`, `--no-color true`, and
> `NO_COLOR=<non-empty>` (env, no flag) alike; (c) the default (no flag, no
> env) and `NO_COLOR=''` paths are unchanged, still colored; subject to: 0
> pre-existing tests weakened or removed, one conceptual change ("the
> no-color contract works completely and consistently"), no new I/O/exec/
> network/credential surface.

Not modified after evaluation began.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), fresh `npm ci && npm run build` on
`main @ 2fba2550182d81b36423447221823e98e227482a`.

```
Baseline  (2fba255, unmodified): 106/106 tests passing
Candidate                      : 119/119 tests passing (+13 net new, 0 removed, 0 weakened, 0 regressions)
lint (npm run lint)            : clean, before and after
typecheck (npm run build)      : clean, before and after
```

Live CLI receipt, baseline vs. candidate (`git stash`/`git stash pop` around
a fresh `npm run build`, real `docs/dream-cycle/LEDGER.md`, counting
`\x1b[`-bearing lines via `grep -c`):

| Scenario                        | Baseline | Candidate |
|----------------------------------|---------:|----------:|
| `--no-color` (bare)              | 7        | **0**     |
| `--no-color=true`                | 17       | **0**     |
| `--no-color true` (space form)   | 17       | **0**     |
| `NO_COLOR=1` env, no flag        | 17       | **0**     |
| `NO_COLOR=''` env (empty)        | 17       | 17 (unchanged, per spec) |
| no flag, no env (default)        | 17       | 17 (unchanged) |

Every row is a direct, repeated invocation of the real built binary
(`node packages/cli/dist/bin.js tui --path docs/dream-cycle/LEDGER.md ...`),
not inferred from source reading.

## Darwin Results

`DARWIN=not-applicable` — this is a deterministic consolidation of three
already-reviewed, already-tested fixes with one clear correct union; no
evolvable population, consistent with how the three source PRs (#39, #49,
#55) and prior `developer-experience` nights treated comparably scoped
fixes.

## Evidence

- MEASUREMENT: `git merge` of PR #55's branch on top of (`main` + PR #49's
  branch) exits 1 with real `CONFLICT (content)` on 3 files, reproduced
  twice (direct `git merge` and `git merge-tree --merge-base`).
- OBSERVATION: PR #39 merges cleanly against either #49 or #55 in isolation
  (different file); the conflict is specifically between #49 and #55.
- MEASUREMENT: `npm test` 106 → 119, 0 regressions (vitest output, both
  runs, this session).
- MEASUREMENT: live CLI ANSI-line counts, baseline vs. candidate, 6
  scenarios (table above) — all match the frozen hypothesis exactly.
- INFERENCE: the conflict exists because both #49 and #55 edited the same
  historical line (`noColor: flags['no-color'] === true`) independently,
  each unaware of the other (each PR's own report explicitly reasons about
  not duplicating #39's scope, but neither anticipates the other, since #55
  postdates #49 by 5 nights with no merge in between to rebase against).
- DECISION: ship the union as one candidate rather than three, and recommend
  in the PR body that a human close #39/#49/#55 in favor of this PR, net
  reducing open-PR count by 2 instead of adding a 4th overlapping one.
- REJECTION: considered leaving #39's `verdictColor` fix out (it doesn't
  conflict with anything, so bundling it is not required to resolve the
  #49/#55 conflict). Included anyway because all three fixes serve one
  user-facing contract ("no-color means no color, however it's requested")
  and a human reviewing "the no-color PR" benefits from one coherent diff
  rather than being left to resolve a 4th relationship (this PR vs. #39)
  on their own.

## Reward-Hack Check

Self-adversarial critique against the diff: `git diff` on
`packages/cli/src/index.test.ts` shows exactly 3 removed lines, all pure
signature extensions (an import list, a function signature, a default-value
relocation) — zero existing assertions removed, weakened, or modified. New
tests cover all 4 named verdict branches plus the fallback/gray branch (not
cherry-picked to one), all three flag value-forms, three `NO_COLOR` value
classes (non-empty numeric, non-empty word, empty-string-must-not-disable),
and two explicit negative guards (default path still colored; empty
`NO_COLOR` still colored) — guarding against a hollow "always strip color"
fix. No gold data, benchmark corpus, threshold, or evaluator file touched.
Every quantitative claim in this report (test counts, ANSI-line counts,
merge-conflict reproduction) is a direct read from this session's own live
`npm test` runs, live CLI invocations, and live `git merge`/`git merge-tree`
commands against the real GitHub-hosted branches — none inferred, none
carried over unchecked from a prior night's report. **CLEAR.**

## Security Review

Change surface: two pure functions (`flagBool`, `isNoColorEnv`) reading
already-injected, already-trusted data (`CliFlags`, `IO.env`); one function
signature narrowed from a closure to an explicit parameter (`verdictColor`).
No new exec/shell/network/filesystem/credential surface. No `.github/`,
evaluation-gate, benchmark, or threshold file touched. Not security-
sensitive.

## Scan Findings

- **cli**: the three-way conflict between #49 and #55 (this report's
  finding) is itself a CLI-tooling-process defect: nothing in this repo
  mechanically detects that two open, independently-green PRs will conflict
  with each other until a human tries to merge both. Not actioned beyond
  this report — a CI job that `git merge-tree`-checks all open `dream/*`
  PRs pairwise would be a reasonable, separate future candidate, flagged
  but not built tonight (scope discipline: tonight's candidate is the
  conflict's *fix*, not a conflict-detection system).
- **tui**: re-verified `renderDashboard`'s own `noColor` Proxy-gating is
  correct in isolation for every other chrome line (border, stats, signals
  footer); the only residual gap was the `verdictColor` closure, now fixed.

## Competitors

| Project / practice | Relevant approach | Grade | Note |
|---|---|---|---|
| no-color.org (informal `NO_COLOR` standard) | Any non-empty `NO_COLOR` disables color, independent of any tool flag | A (official spec) | Confirms both #55's and tonight's env-var behavior |
| GNU `getopt_long` / POSIX utility syntax | A boolean long option is declared `no_argument` at registration time, so it structurally cannot receive a stray value | A (official docs) | Names the *general* fix (`parseArgs` schema) that #49 and tonight both deliberately scope narrower than, consistent with the one-conceptual-change bias |
| `chalk` | Single `Chalk` instance gates every color call; no second always-on table a function could close over by mistake | B (official docs) | Explains the bug class `verdictColor` had — two parallel tables, one function closed over the wrong one |
| Sakana AI Scientist / OpenHands / DSPy-GEPA / SWE-agent / AutoGPT lineage | No public documentation found tonight on CLI flag-conflict detection across concurrent PRs | — | Considered per STEP 3; no claim graded |

## Gist

No `gh gist create`-equivalent tool available to this session (GitHub MCP
server has no gist tool; same constraint as every prior night in this
repo). Committed as this file. `GIST=LOCAL`.

## Witness

```
report_sha256 : <computed and filled in by `dream-machine witness stamp`, see PR body and LEDGER.md>
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : <see PR body and LEDGER.md>
```

Verifier procedure, reproducible by anyone with this repo and this file
(the triple is published externally — PR body and `LEDGER.md` row — never
inline in this file itself, per the self-reference paradox issue #29):

1. `git show <this-report's-own-commit>:docs/dream-cycle/2026-10-09-developer-experience-report.md | sha256sum` → `report_sha256`.
2. `printf '%s%s' "$report_sha256" "2fba2550182d81b36423447221823e98e227482a" | sha256sum` → `witness`.
3. Compare against the triple published in the PR body and `LEDGER.md`.
4. Optionally: `node packages/cli/dist/bin.js witness verify docs/dream-cycle/2026-10-09-developer-experience-report.md 2fba2550182d81b36423447221823e98e227482a <witness>`.

## Recommendation

`evaluated: accepted`.

1. Merge this PR, then close #39, #49, and #55 as superseded (each is
   correctly subsumed; none loses any test coverage — this PR's suite is a
   strict superset). Net effect: backlog **-2** instead of +1.
2. Issue #10 (CodeQL `analyze` has never passed; repo-admin-only setting)
   remains the structural reason zero of 26+ `dream/*` PRs have merged —
   reconfirmed, not re-investigated tonight (already diagnosed, ≥3 prior
   nights).
3. Consider (not built tonight, flagged under Scan Findings/cli): a
   lightweight CI check that runs `git merge-tree` between all pairs of
   open `dream/*` PR heads and flags any that would conflict, so this
   specific failure mode (two independently-green PRs that conflict with
   each other) surfaces before a human attempts the merge, not during it.
