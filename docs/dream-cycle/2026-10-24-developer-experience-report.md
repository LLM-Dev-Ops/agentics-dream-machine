# Developer-Experience SOTA Report — 2026

## TL;DR

Tonight's rotation computed `SLOT=4` → `DEEP=developer-experience`,
`SCAN=cli,tui`. `dream-machine ledger signals` against this repo's real
(main-branch) ledger returns `zeroMergeStreak: true, duplicateDirections: []`
— so tonight biases to a **tiny, one-parameter, easily-reviewable candidate**
(signal 2), and the formal duplicate-direction signal (signal 1, computed from
`LEDGER.md` on `main`) does **not** fire, because `main`'s ledger only ever
accumulated 2 real nights (2026-08-13 / #7, 2026-09-08 / #8) — every
subsequent night's ledger row lives only inside its own still-unmerged draft
PR branch and has never landed. Reading those unmerged branches directly
(PRs #37–#93) shows the same `--no-color`/`NO_COLOR` finding proposed at
least 5 times (#39, #49, #55 → consolidated as #65, rediscovered again in #75,
reconfirmed in #85) without ever merging — a already-saturated direction this
session deliberately does **not** repeat (Step 2: "do not rediscover a failed
direction unless new evidence justifies reopening it"; no new evidence here).

Instead: a fresh, previously-unreported bug in `packages/cli/src/tui.ts`'s
`pad()` helper. When the dashboard's colorized "signals" footer line (multiple
simultaneous learning-signal warnings, each wrapped in ANSI color codes)
exceeds the box's 76-column interior budget, the old truncation path did
`s.slice(0, n - 1) + '…'` on the **raw** string — including any embedded
`\x1b[NNm` escape sequences. This can and does slice a multi-byte escape code
in half, corrupting the terminal output (an unterminated color escape bleeds
into the rest of the line, including the box's right border) and, separately,
undercounts the real visible truncation budget (raw bytes include invisible
ANSI bytes). The fix (`truncateVisible()`) walks the string, passes ANSI
escapes through whole, counts only visible characters against the budget, and
appends a trailing reset only when an escape was actually consumed — so
no-color output gets zero new bytes.

## What's new

- **Why no prior night caught this**: every existing `tui`/`renderDashboard`
  test in `packages/cli/src/index.test.ts` renders with `noColor: true`. The
  corrupting code path (truncation of a *colorized* line) was never exercised
  by CI. This is a coverage gap, not a regression from a specific prior PR.
- Confirmed via `dream-machine ledger signals --path docs/dream-cycle/LEDGER.md`
  (real tool, not re-derived): `{"zeroMergeStreak": true, "duplicateDirections":
  [], "lowScoreStreak": false, "blockedEvalStreak": false, "nightsConsidered": 7}`.
- Separately (evidence grade A — this repo's own GitHub state, read directly):
  **40 open `dream/*` PRs (#31–#93), 0 merged** since PR #9 (2026-09-08). The
  root blocker is independently diagnosed in issue #10 (CodeQL/GHAS is a
  repo-admin **Settings** gap, not something any PR can fix) and PR #89
  (36/40 of the backlog is merge-clean and not protected-path — the backlog is
  not blocked by anything technical; no human has yet applied the
  `automerge-safe` label or marked a PR ready-for-review). This session does
  not re-litigate that finding tonight — it is already filed and current —
  but surfaces it again in the Recommendation below since it remains this
  repo's single highest-leverage human action.

## Competitors (evidence grade C unless noted)

- **Sakana AI Scientist** — automates the full research-loop (hypothesize →
  code → run → write paper) but has no analogue to this repo's draft-PR /
  human-merge gate; published failure modes include silently editing its own
  eval harness to inflate results — exactly the reward-hack class this
  repo's Step 10–14 critic gate exists to catch.
- **OpenHands** — issue-resolution agent with a sandboxed execution loop;
  unlike this repo, has no durable cross-run ledger/learning-signal memory,
  so it cannot detect its own "duplicate direction" the way
  `learningSignals()` is designed to (when its backing ledger is actually
  merged — tonight's finding is that this repo's own signal is currently
  blind for exactly that reason).
- **SWE-agent** — ACI-based patch generation against real repos; strong at
  the "produce a concrete diff" step this candidate also does, but has no
  equivalent of this repo's independent-critic reward-hack gate or witness
  stamp for reproducibility.
- **DSPy/GEPA** — optimizes prompts/programs against a scored metric;
  relevant parallel to this repo's Darwin stage, not to tonight's
  deterministic, non-model-calling candidate.

## Hypothesis (frozen before implementation)

> Given the Dream Machine TUI's `renderDashboard()` rendering a ledger whose
> learning-signal footer is colorized and long enough to need truncation
> (multiple simultaneous signals active), when `pad()`'s truncation is made
> ANSI-escape-aware (`truncateVisible()`) instead of slicing the raw string,
> then the rendered output should contain zero incomplete ANSI escape
> sequences and the visible (post-strip) line width should stay within the
> box's budget, relative to the current `pad()` baseline — which exhibits
> both defects on the same input — subject to: 0 pre-existing tests
> removed/modified, `npm test`/`lint`/`build` stay green, and plain
> (`noColor: true`) output is byte-identical (no new ANSI injected).

## Evaluation Receipt

Real evaluator: `npm test` (vitest), `npm run lint` (eslint), `npm run build`
(tsc, 6 workspaces) — this repo's actual `bench` entrypoint. `LLM_EVAL=blocked`
(no `OPENROUTER_API_KEY` in this session) — zero model calls needed or used;
this is a deterministic, non-model-calling candidate per the long `LLM_EVAL`
posture.

| | Parent (`2fba255`) | Candidate |
|---|---|---|
| `npm test` | 106/106 | **108/108** (+2, 0 removed/modified) |
| `npm run lint` | clean | clean |
| `npm run build` | clean (6 workspaces) | clean |
| `npm run typecheck` | pre-existing `TS18002` (empty `tsconfig.json` `files`) | identical, reproduced on parent — environmental, same conclusion independently reached by PR #33/#83/#89 |

Manual repro (both before and after the fix, raw bytes inspected): with 3
simultaneous signals active (zero-merge-streak, blocked-eval-streak, 1
duplicate-direction) and color on, parent output contains
`...\x1b[33m⚠ eval blocked streak\x1b[0m   \x1b[33… \x1b[38;5;99m│...` — the
third signal's `\x1b[33m` opener is sliced to `\x1b[33` with no closing `m`.
Candidate output: `...\x1b[33m⚠ 1 duplicate directio…\x1b[0m \x1b[38;5;99m│...`
— well-formed, reset appended.

## Baseline

`main` @ `2fba2550182d81b36423447221823e98e227482a` (PR #9, 2026-09-08-era
CodeQL permissions fix) — 106/106 tests, unchanged since.

## Darwin Lineage

`DARWIN=not-applicable` — a small, deterministic, pure-function fix; no
evolvable population or fitness landscape to search.

## Evidence

- OBSERVATION: every existing `tui`/`renderDashboard` test passes `noColor:
  true`; grep confirms zero existing tests omit it.
- MEASUREMENT: manual repro script against parent code (git-stashed) produces
  a raw, byte-inspected incomplete ANSI escape on the colorized footer line
  under a 3-simultaneous-signal ledger fixture; identical repro against
  candidate code shows no incomplete escapes and a `\x1b[0m` reset is present.
- MEASUREMENT: `npm test` 106/106 → 108/108, diffed by hand (not inferred from
  the count delta) — the two new `it()` blocks are purely appended after the
  last existing `});` in the `tui` describe block; 0 existing lines changed.
- INFERENCE: the defect is a coverage gap (no colorized-truncation test
  existed), not a regression introduced by a specific prior PR.
- DECISION: ACCEPT (see Promotion Gate below).

## Reward-Hack Check

Independent critic subagent (separate context/process, told to reproduce
everything cold, no shared state with the author). **Verdict: CLEAR.**
Independently: diffed scope (only `tui.ts` + appended test block, no
gold/benchmark/snapshot/threshold touched); independently reproduced the
parent-code corruption via its own throwaway repro; independently reproduced
the candidate-code fix; independently reran `npm test` across the
stash/pop boundary confirming 106→108, +2, 0 removed/modified; independently
reran `lint`/`build` clean; independently checked the box-width arithmetic
(`W=78`, interior budget `W-2=76`, full bordered line `76+4=80`) is the real,
unloosened value behind the test's `toBeLessThanOrEqual(80)` assertion, not a
bound tuned to pass; independently fuzzed edge cases (`maxVisible=0`,
all-ANSI input, an escape landing exactly at the truncation boundary, a
non-global-regex `lastIndex` leak hazard) — all correct given current call
sites. One latent, non-blocking, currently-unreachable weakness noted (no
call site ever passes `n≤1` to `pad()`, so `maxVisible≤0` dropping an
already-open color with no reset is dead code today) — not a regression, not
required to fix for ACCEPT.

## Security Review

`truncateVisible()`/`pad()` are pure string functions over already-in-memory
data (ledger markdown already read and parsed); the ANSI regex is fixed and
non-attacker-influenced in shape (bounded `[0-9;]*`, cannot runaway/ReDoS on
adversarial input — it has no nested quantifiers). No new I/O, network, exec,
credential, filesystem, or dependency surface. Does not touch any
evaluation/gate/safety/CI file (confirmed against the live `automerge.yml`
protected-path regex: `packages/cli/src/tui.ts` and
`packages/cli/src/index.test.ts` match none of
`^(\.github/|packages/[^/]+/package\.json$|package\.json$|package-lock\.json$|.*/safety|.*/gate|.*(threshold|promotion|scorer).*|SECURITY\.md$)`).

## Regression Analysis

0 pre-existing tests removed or modified (confirmed by reading the diff hunks
directly, independently re-confirmed by the critic). `npm run lint` clean
before/after. `npm run typecheck`'s pre-existing `TS18002` reproduces
identically on parent and candidate — environmental, unrelated to this
change (same conclusion as PR #33/#83/#89).

## ADR

None — a small, additive bug-fix + tests in one file, not an architectural
decision, per this repo's own ADR convention (same category as PR #58/#69/#79/#81/#89).

## Gist

No `gh gist create`-equivalent tool available to this session. `GIST=LOCAL`.
This file is the full report, byte-identical to what would have been posted.

## Witness

```
report_sha256 : 4f3db93fa38b5a536f8e569db05eaf47dff6124c06f16e700287a1cb91f88a67
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : d0971c392b484efa686a8819e5611538588250068115bdb5d396a593043fa5a7
```

`report_sha256` is `sha256sum` of this file as it stood immediately before
this Witness section was filled in (the inherent self-reference limit of
binding a hash inside the same document it hashes — the same convention
prior nights' reports used). The frozen pre-stamp snapshot is preserved at
`/tmp/dream-gist-2026-10-24.md` for this session; `dream-machine witness
verify /tmp/dream-gist-2026-10-24.md 2fba2550182d81b36423447221823e98e227482a
d0971c392b484efa686a8819e5611538588250068115bdb5d396a593043fa5a7` reproduces
`✓ witness VALID`.

Reproducible: `sha256sum docs/dream-cycle/2026-10-24-developer-experience-report.md`
→ `REPORT_HASH`; `printf '%s%s' "$REPORT_HASH"
"2fba2550182d81b36423447221823e98e227482a" | sha256sum` must equal the
witness below. Independently verifiable with `dream-machine witness verify`.

## Recommendation

1. Merge-eligible, human-review-only (per this repo's own guarded-automerge
   policy: this session does not propose the `automerge-safe` label itself).
2. Standing finding, not re-litigated in depth tonight but still open and
   highest-leverage: a repo admin needs to enable **Code security and
   analysis → Code scanning** (issue #10) and then begin working through the
   36/40 backlog PRs identified merge-clean in PR #89 (starting with the
   smallest, e.g. #53/#61/#71/#76) — the backlog is not blocked by anything
   a PR can fix.
3. Next steps for this specific finding: (a) a human reviewer should spot-check
   the manual repro above against a real terminal (not just the byte-level
   assertions) to confirm no other visual artifact remains; (b) consider
   whether `pad()`'s `maxVisible<=0` dead-path (noted by the critic) deserves
   a defensive comment or a guard, next time this file is touched; (c) audit
   whether any other ANSI-aware string operation in this repo (none found
   tonight — `tui.ts` is the only file matching `\x1b\[`) has the same
   raw-slice hazard.
