# Compiler-Parity SOTA Report — 2026-09-15

## TL;DR

Tonight's rotation (`DAYINT=20260915`, `SLOT=0` → `DEEP=compiler-parity`,
`SCAN=config-schema,golden-snapshots`) independently re-derived, byte-for-byte,
the exact same measurement as the still-open 2026-09-10 night (issue #13, PR
#14): the delivered nightly prompt and `compile(dream.config.json)` are
identical (sha256 `74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d`
both sides). This is now a **3rd consecutive confirmation** of compiler
parity (implicitly on 2026-08-13/2026-09-08's clean `validateConfig()` runs,
explicitly on 2026-09-10, and again tonight).

Before writing a candidate, tonight's session queried GitHub directly (the
local `docs/dream-cycle/LEDGER.md` on `main` is silently 6 nights stale — see
below) and discovered that the candidate this session had independently built
— a new test asserting `validateConfig(liveConfig).ok` and golden-snapshotting
`compile(liveConfig)` — duplicates PR #14 (2026-09-10) almost line-for-line:
same rotation slot, same session commit ancestry (`2fba255`), same hypothesis,
same sha256, same test strategy. **The duplicate candidate was discarded,
uncommitted, before push** — see Reward-Hack / Duplication Check.

**No new PR opened tonight.** Opening a second implementation of an
already-accepted, already-evaluated, merely-unmerged fix would not reduce
uncertainty about this repository — it would add redundant review load,
directly against this routine's own operating principle ("Never optimize for
producing a PR. Optimize for reducing uncertainty."). `evaluated: yes` (real,
independent, reproduced),`verdict: inconclusive` for tonight's own marginal
contribution (no new code), while the underlying drift hypothesis itself is
cleanly **REJECTED** (no drift, 3rd time).

## The bigger finding: a 7-night, zero-merge backlog

This is the more important discovery of the night, and it explains why
tonight almost produced a duplicate. Querying GitHub (not just the local,
stale `LEDGER.md`) shows:

| Night | Slot/Deep | Issue | PR | State |
| --- | --- | --- | --- | --- |
| 2026-09-08 | security-adversarial | #7 | #8 | **MERGED** |
| — | (CodeQL fix) | — | #9 | **MERGED** |
| 2026-09-09 | developer-experience | #11 | #12 | OPEN (draft, unmerged) |
| 2026-09-10 | compiler-parity | #13 | #14 | OPEN (draft, unmerged) |
| 2026-09-11 | ledger-signals | #15 | #16 | OPEN (draft, unmerged) |
| 2026-09-12 | evaluation-adapters | #17 | #18 | OPEN (draft, unmerged) |
| 2026-09-13 | security-adversarial | #19 | #20 | OPEN (draft, unmerged) |
| 2026-09-14 | developer-experience | #21 | #22 | OPEN (draft, unmerged) |
| 2026-09-15 (tonight) | compiler-parity | this report | none (by design) | n/a |

Six consecutive nights, six open draft PRs, **zero merges since 2026-09-08**.
`main` is still at commit `2fba255` — the exact commit every one of those six
nights (and tonight) started from, because nothing has advanced it. This
matches this repo's own learning signal, already named in
`dream.config`-derived prompt STEP 1.1: *"zero of the last 14 candidate PRs
merged → bias to a tiny, one-parameter, easily-reviewable candidate."* Every
one of the six open PRs already fits that description (66, 108, 112, and
similarly small diffs per their own receipts) — the bottleneck is human
review bandwidth, not candidate size or quality.

This exact staleness was already identified and evaluated on 2026-09-11
(issue #15, PR #16, "ledger-signals: main's LEDGER.md is 3 nights stale").
Tonight's contribution is not a new fix (PR #16 already proposes
`nightsSinceLastRow`) but a fresh, larger data point: the staleness has now
**doubled from 3 to 6 nights** since that finding, with no merges in between,
and it caused this session to nearly duplicate work. Recommend treating this
as the standing top-priority human action across the whole rotation, not
scoped to any one surface.

## Hypothesis (frozen before evaluation)

> Given the current `dream.config.json`, the exact prompt text this session
> was invoked with, and PR #14's identical 2026-09-10 hypothesis, when
> `compile()` is run against the checked-in config using the real built
> `dist/index.js`, the compiled output should again be byte-identical to the
> delivered prompt — testing whether parity is a stable invariant across
> repeated nights, not a one-time coincidence.

## Evaluation Receipt

- Build: `npm ci && npm run build` — clean, no wasm/NAPI degradation.
- Baseline: `npm test` → 106 passed, 7 files (unchanged from all six prior
  open-PR nights, since `main` hasn't moved).
- Procedure: saved the verbatim received prompt; ran
  `compile(JSON.parse(readFileSync('dream.config.json')))` from the built
  `packages/compile/dist/index.js`; diffed and sha256'd both sides.
- **Result: `diff` exit 0, 0 lines changed; sha256
  `74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d` both
  sides.** Evidence grade: A (reproducible, first-party, in this repo, right
  now, 3rd independent confirmation).
- A local candidate test (schema + no-throw + golden-snapshot of the live
  config) was written and verified working — including mutation tests
  proving it is a real gate (breaking `slots[0].deep` or `cron` reliably
  failed it) — then **discarded, never committed**, on discovering PR #14
  already contains materially the same test, unmerged, since 2026-09-10.

## Darwin Results

Not attempted: no tunable parameter, consistent with every prior
compiler-parity/ledger-signals night.

## Evidence

- MEASUREMENT: sha256 parity holds, 3rd consecutive night (A-grade).
- OBSERVATION: local `LEDGER.md` on `main` ends at 2026-09-08 (row 9); GitHub
  shows issues #11–#21 and PRs #12–#22 for six subsequent nights, all open.
- OBSERVATION: this session's first-drafted candidate was a near-duplicate of
  PR #14 (same slot, same session commit, same hypothesis, same sha256).
- INFERENCE: the review/merge bottleneck, not candidate quality, is now the
  binding constraint on this repository's evolution loop; further nights on
  the same starting commit will keep re-discovering the same low-hanging
  findings already sitting in the backlog.
- DECISION: do not open a duplicate PR tonight; escalate the backlog via a
  comment on the most relevant existing thread (#13) instead of new issue
  noise, since issue #15 already tracks the staleness signal itself.
- REJECTION: the frozen drift hypothesis is REJECTED (no drift found) for the
  3rd consecutive time — a clean, successful negative result.

## Reward-Hack / Duplication Check

Before discarding, the draft candidate was reviewed by an independent critic
subagent (not this candidate's author): confirmed purely additive, no
existing test/threshold touched, snapshot non-trivial (pinned ~320 real
lines), mutation-tested as a real gate. It was discarded not for any quality
defect but strictly because an equivalent, already-accepted, unmerged
candidate (PR #14) already exists — publishing a second one would be
reward-hacking the *appearance* of productivity (a new PR) against this
routine's actual objective (reducing uncertainty about the repo). No reward
hacking detected in either the discarded candidate or the decision to not
publish it.

## Security Review

No security-sensitive surface touched. No code shipped tonight.

## Scan: config-schema

Confirms PR #14's finding: `DreamConfig` and the live `dream.config.json`
remain in sync (`validateConfig()`: 0 errors, 0 warnings). PR #14's deferred
next-step (an external `dream.config.schema.json` JSON Schema file for
editor tooling) remains open and undone — not attempted tonight, to avoid
scope creep into a second, larger candidate while the review backlog is
already this deep.

## Scan: golden-snapshots

Confirms PR #14's finding: only the synthetic `metaharness` fixture is
golden-snapshotted in `packages/compile`; PR #14's own candidate (still
unmerged) would add the second entry for the live config. No other package
has snapshot coverage of deterministic output. Unchanged since 2026-09-10.

## Competitors

Unchanged from PR #14's table (Sakana AI Scientist, OpenHands, DSPy/GEPA,
SWE-agent, AutoGPT lineage) — no new competitor research conducted tonight,
since the deep-dive's substantive question (does compiler parity hold, and
is there a reviewable regression test for it) already has a well-evidenced
answer sitting in the backlog. Re-researching competitors for an unchanged
question would not reduce uncertainty.

## Gist

No `gh gist create` tool available to this session (same constraint as every
prior night). Committed as
`docs/dream-cycle/2026-09-15-compiler-parity-report.md`. `GIST=LOCAL`.

## Witness

```
report_sha256 : 7be55a8894c2cb2e3c71741cd5572e1fddceb3791518a5d0cdff410b2ccc9475
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : 3be1f299ae20fd14995eb8f0486da48c819cc174f39ce7f32dbadb5d92a22344
```
Verify: `sha256sum docs/dream-cycle/2026-09-15-compiler-parity-report.md`
(taking the pre-witness-section content this hash was computed against, i.e.
this file up to and not including this Witness block's stamped values —
consistent with the convention used in the 2026-09-10 and 2026-09-11
reports), then
`printf '%s%s' "$REPORT_HASH" "2fba2550182d81b36423447221823e98e227482a" | sha256sum`
must equal the witness above.

## Recommendation

1. **Human action (highest priority, repo-wide, not surface-specific):**
   triage and merge (or explicitly close with reason) the six open
   dream-cycle PRs (#12, #14, #16, #18, #20, #22) before the next rotation
   runs. Every additional night against the same frozen `main` commit
   increases the odds of further duplicate work.
2. **Process fix worth considering:** since `LEDGER.md` append-only edits
   from independent branches sharing the same base commit are prone to
   merge friction, consider merging PR #16 (`nightsSinceLastRow` signal)
   first, specifically because it is the one that would let a future
   session's STEP 1.1 check surface this exact staleness automatically
   instead of relying on a live GitHub query an agent might skip (as this
   session's first pass nearly did).
3. **Next measurement, once the backlog clears:** re-run tonight's parity
   check against the *next* real `dream.config.json` edit (if any lands via
   the merged backlog) to confirm the golden-snapshot test in PR #14 actually
   catches a real, non-synthetic drift event when one finally occurs.
