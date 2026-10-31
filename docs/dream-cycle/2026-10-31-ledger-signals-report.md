# Ledger-Signals SOTA Report — 2026-10-31

`DATE=2026-10-31` `DAYINT=20261031` `SLOT=1` → `DEEP=ledger-signals`,
`SCAN=witness,verify`. No bonus deep dive (`20261031 % 25 = 6`,
`20261031 % 75 = 6`, neither `0`). `SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.

## TL;DR

`docs/dream-cycle/LEDGER.md` on `main` has carried 9 `ledger verify` schema
errors (compound verdicts like `ACCEPT / INCONCLUSIVE`, an undeclared
`evaluated=partial`, in rows 2-6) since at least 2026-09-08 — flagged that
night, reconfirmed every `ledger-signals` night since (2026-09-21 / PR #33,
2026-10-26 / PR #99), still unfixed on `main` because nothing here ever
merges. PR #33 already proposes the right fix for the *existing* bad rows
(quarantine them, bound the parser, gate CI) — but it does not touch the
*write path* that let them in, and real GitHub history shows that write path
is exercised by this repo's own automation (`scripts/dream-nightly.mjs` calls
`dream-machine ledger append` directly). Reproduced live tonight: `ledger
append --verdict "ACCEPT / INCONCLUSIVE" --evaluated partial` succeeds (exit
0) against a copy of the real ledger and writes a 10th schema-invalid row —
the exact contamination pattern, replayable today, through the one tool this
repo's own nightly script uses to write its memory. Candidate: `ledger
append` now validates a row against the same schema `ledger verify` checks,
and refuses (exit 1, file untouched) before ever writing an invalid one.
`npm test` 106→111, 0 regressions. This does not replace PR #33 — it closes a
different, earlier point in the same failure chain (entry, not post-hoc
detection), and is small enough to review independently of it.

## Ledger Check (STEP 1)

`docs/dream-cycle/LEDGER.md` on `main`: 7 rows, ending 2026-09-08 (PR #8,
merged). Confirmed via `mcp__github__get_file_contents` at `ref=main` tonight
— byte-identical to the local checkout; not stale relative to `main`, but
`main` itself is 30+ nights behind this repo's real GitHub activity.

Real GitHub state checked fresh tonight (`list_issues`, `list_pull_requests`,
`pull_request_read`, `search_issues`, `search_pull_requests` — not inferred):

- **49 open issues** (#48–#106, one per dream-cycle night from 2026-09-29 to
  2026-10-30) and **30 open draft `dream/*` PRs** (#49–#107), every one
  sampled individually confirmed `draft: true`, `merged: false`. **Zero
  merges since PR #9** (2026-09-08, the CodeQL-permissions fix, confirmed
  `merged: true` via per-PR read — the list endpoint's `merged` field is
  unreliable at the list level, consistent with PR #81's prior finding).
  Reconfirmed, not re-litigated — issues #84/#90/#104 already track this
  backlog in detail.
- `search_issues`/`search_pull_requests` for "ledger append validate schema
  compound verdict partial corruption" / "validateRow ledger append schema":
  **0 hits**. Not a duplicate of any open issue or PR.
- PR #33 (2026-09-21, ledger-signals, issue #32): quarantines the 5
  contaminated rows verbatim, bounds `parseLedger` to the first contiguous
  table, adds `ledger verify` as a required CI gate, and fixes
  `scripts/dream-nightly.mjs`'s raw `tail|head` `priorFates` heuristic to use
  the real parser. Still open, unmerged, 40 days old as of tonight. **Does
  not modify `ledger append`** — confirmed by reading its full diff tonight
  (5 files: `ci.yml`, `ADR-0003`, its own report, `LEDGER.md`,
  `packages/ledger/src/index.ts` + test, `scripts/dream-nightly.mjs`; no
  `index.ts` hunk touches the `ledger append` CLI command in
  `packages/cli/src/index.ts`, and no hunk adds row validation before a
  write). Tonight's candidate is additive to, not a replacement for, PR #33.
- PR #99 (2026-10-26, ledger-signals, issue #98): adds a `surfaceStreak`
  learning signal; its report independently reconfirms "the same 9
  structural errors... unmerged (PR #33)... not duplicated here." Does not
  touch `ledger append` either.
- Incidental, not part of tonight's candidate: `verify-entrypoints
  dream.config.json` run live tonight to exercise the SCAN=`verify` surface
  executed the repo's literal, still-unpinned `darwin` entrypoint
  (`npx @metaharness/darwin evolve --sandbox real`) for real — it installed
  `@metaharness/darwin@0.12.1` over the network and wrote a `./--sandbox/`
  directory into the repo root (24 generic agent-genome variants + a
  `winner.json`, unrelated to this repo's own source — consistent with issue
  #100's "zero textual overlap" finding). This is the same unpinned-`npx`
  risk PR #63 (2026-10-08) already proposes to fix, reproduced again
  tonight, Nth time. Deleted (`rm -rf`) before any commit; not in this PR's
  diff; not re-fixed tonight (already a reviewable, unmerged PR — not
  duplicated).

**Learning signals (STEP 1.1), computed against `main`'s real 7-row ledger**
via `dream-machine ledger signals`: `zeroMergeStreak: true`,
`duplicateDirections: []`, `lowScoreStreak: false`, `blockedEvalStreak:
false`, `nightsConsidered: 7`. `zeroMergeStreak=true` is consistent with the
real 0-merges-since-#9 state confirmed above → biases tonight to a tiny,
one-parameter, easily-reviewable candidate (applied: 71 lines, one
conceptual change, additive only).

## Load Accumulated Evidence (STEP 2)

Read `docs/dream-cycle/LEDGER.md`, `docs/adrs/INDEX.md` + ADR-0001/0002, both
reports committed on `main` (2026-08-13, 2026-09-08). Since no post-2026-09-08
report or ADR ever reached `main`, read PR #33's and PR #99's full diffs/
bodies directly from GitHub tonight specifically to confirm this candidate
does not re-propose either of theirs — see Ledger Check above.

## Hypothesis (frozen before implementation)

> Given `dream-machine ledger append` (`packages/cli/src/index.ts`), when a
> row is appended whose `verdict` or `evaluated` value falls outside the
> schema `ledger verify` already enforces (`ACCEPT|REJECT|INCONCLUSIVE` /
> `yes|no|blocked`), the command currently writes it anyway and exits 0 —
> reproducing the exact rows-2-6 contamination pattern through this repo's
> own write path (`scripts/dream-nightly.mjs` calls this same command).
> Adding the same per-row schema check `ledger verify` already uses, run
> *before* the write, should make `ledger append` refuse (exit 1, file
> byte-identical to before the call) for an invalid row while leaving every
> valid append unaffected — subject to: no existing test weakened, removed,
> or retargeted; `verifyLedger`'s schema itself unchanged (not loosened); the
> validation logic is shared (not reimplemented) between `verifyLedger` and
> the new append-time check, so they cannot drift; `npm test` stays green
> with only additive tests. Not modified after evaluation began.

## Candidate

`packages/ledger/src/index.ts`: extracted the existing per-row checks inside
`verifyLedger`'s `forEach` into a new exported `validateRow(row): string[]`
(same three checks, same messages, now reused instead of duplicated);
`VERDICTS`/`EVALS` exported (previously module-private) so the CLI can report
precisely which enum a bad value violated. `packages/cli/src/index.ts`: the
`ledger append` handler calls `validateRow(row)` before `appendRow`/
`writeFile`; on any error it prints each one and returns exit 1 without
touching the file. `packages/ledger/src/index.test.ts` (+20 lines, 3 new
tests) and `packages/cli/src/index.test.ts` (+20 lines, 2 new tests). 4
files, +71/-11, one conceptual change (validate-before-write), well under the
300-line target.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), this repo's own `bench` entrypoint,
against a fresh `npm ci && npm run build` at
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.
`LLM_EVAL=blocked` — no model-calling credentials in this environment; this
candidate needed none (pure deterministic validation logic).

| | Baseline (parent, `2fba255`) | Candidate |
|---|---|---|
| Tests | 106 passed | **111 passed** (+5, 0 removed, 0 modified) |
| `npm run lint` | clean | clean |
| `npm run build` (6 workspaces) | clean | clean |
| `npm run typecheck` | pre-existing `TS18002` (empty root `tsconfig.json` `files` list) | identical, reproduced on parent — environmental, unrelated (same conclusion as PR #33/#63) |

Live, non-inferred reproduction (both runs against a throwaway copy of the
real `docs/dream-cycle/LEDGER.md`, not a fixture):

```
# Parent (before the candidate):
$ node packages/cli/dist/bin.js ledger append --path baseline-ledger.md \
    --deep ledger-signals --finding repro \
    --verdict "ACCEPT / INCONCLUSIVE" --evaluated partial
appended row to baseline-ledger.md (verdict=ACCEPT / INCONCLUSIVE)   # exit 0
$ node packages/cli/dist/bin.js ledger verify --path baseline-ledger.md
✗ ledger has 11 error(s)   # 9 pre-existing + 2 new, from the row just written

# Candidate (after the fix), identical command:
$ node packages/cli/dist/bin.js ledger append --path candidate-ledger.md \
    --deep ledger-signals --finding repro \
    --verdict "ACCEPT / INCONCLUSIVE" --evaluated partial
✗ refusing to append an invalid row (2 error(s)):
  - verdict "ACCEPT / INCONCLUSIVE" not in ACCEPT|REJECT|INCONCLUSIVE
  - evaluated "partial" not in yes|no|blocked                        # exit 1
$ diff docs/dream-cycle/LEDGER.md candidate-ledger.md   # byte-identical, no diff
$ node packages/cli/dist/bin.js ledger append --path candidate-ledger.md \
    --deep ledger-signals --finding repro-good --verdict INCONCLUSIVE --evaluated yes
appended row to candidate-ledger.md (verdict=INCONCLUSIVE)           # exit 0, valid append still works
```

The 9 pre-existing errors in rows 2-6 remain in both runs — this candidate
does not touch historical data (that is PR #33's scope, deliberately not
re-done here).

## Baseline

`main` @ `2fba2550182d81b36423447221823e98e227482a` — 106/106 tests, every
open dream-cycle PR branches from this same commit; nothing has ever merged.

## Darwin (bounded evolution, STEP 12–13)

`DARWIN=not-applicable`. The candidate is a small, deterministic,
purely-additive validation check with no evolvable parameter space —
same precedent as PR #33/#63/#81/#89/#99. Not run; not a stop condition.
(The literal `darwin` entrypoint was exercised incidentally by tonight's
`verify-entrypoints` SCAN probe — see Ledger Check; unrelated to this
candidate, cleaned up, not part of this diff.)

## Evidence

- **OBSERVATION**: `ledger append`'s CLI handler (`packages/cli/src/index.ts`)
  constructs a `LedgerRow` from CLI flags and calls `appendRow`/`writeFile`
  directly — no call to `verifyLedger` or any row check — read directly from
  source before writing any code tonight.
- **OBSERVATION**: `scripts/dream-nightly.mjs` (this repo's own nightly
  automation entrypoint) invokes exactly this command
  (`packages/cli/dist/bin.js ledger append`) to write its row.
- **MEASUREMENT**: live reproduction — `ledger append` with a compound
  verdict and `evaluated=partial` (the literal rows-2-6 contamination
  pattern) succeeds, exit 0, against both a throwaway copy and (dry-run
  only, never written) the real ledger shape.
- **MEASUREMENT**: `npm test` 106/106 (baseline, parent) → 111/111
  (candidate), 0 regressions, 0 removed/modified tests (confirmed by reading
  the diff hunks).
- **MEASUREMENT**: post-fix, the identical bad-row command now exits 1 and
  the target file is byte-for-byte unchanged (`diff` confirms); a
  schema-valid append immediately after still succeeds, exit 0.
- **INFERENCE**: PR #33's CI gate (`ledger verify` in `ci.yml`) only runs
  when CI runs on a pushed branch/PR — it catches contamination after a bad
  row is already committed, and only if that CI workflow itself ever
  executes against a given push. Validating inside `ledger append` itself
  catches it at the moment of writing, in any context (CI, a human's
  terminal, this repo's own `dream-nightly.mjs` automation) with no
  dependency on CI having run first. The two are complementary layers, not
  alternatives — late-stage detection (PR #33) and early-stage prevention
  (tonight), together.
- **DECISION**: ship the append-time check as a small, additive,
  backward-compatible change; do not quarantine or touch the existing rows
  2-6 (PR #33's scope, already reviewable, not re-done here); do not add a
  CI gate (also PR #33's scope).
- **REJECTION**: considered loosening `verifyLedger`'s enum to accept
  `partial`/compound verdicts instead, so the pre-existing rows would stop
  erroring. Rejected outright — this is exactly the "weaken the check to
  get a favorable result" failure mode this repo's own disciplines forbid,
  and the same conclusion PR #33's ADR-0003 already reached independently.

## Reward-Hack Check

Self-critique, proportionate to a 71-line additive change: no benchmark,
gold answer, or threshold touched; no cherry-picking (the pre-existing 9
errors are reported as still-unfixed, not hidden or claimed-fixed); no
evaluator exploitation (`npm test` run unmodified, both before and after);
no hidden cost; no undocumented cache (`npm ci` fresh, `npm run build`
fresh). Checked specifically for the one way this candidate *could* overstate
impact — implying it fixes the rows-2-6 contamination — and the TL;DR,
Evidence, and Evaluation Receipt sections all explicitly state it does not;
the live repro above shows the 9 pre-existing errors persist unchanged.
Checked for duplication against PR #33/#99 by reading their full diffs
tonight (see Ledger Check) — confirmed neither touches `ledger append`.
CLEAR.

## Security Review

Not a security-sensitive surface in the traditional sense (no prompt
injection, credential, or MCP/tool-authority change). Soft integrity
relevance: `LEDGER.md` is this engine's only durable cross-night memory
(ADR-0001), and every STEP 1.1 learning signal (`zeroMergeStreak`,
`duplicateDirections`, `lowScoreStreak`, `blockedEvalStreak`) reads it —
a write path that can silently inject out-of-schema values is a soft
data-integrity gap feeding a decision-relevant history, not an attacker-
exploitable one (the CLI's caller is this repo's own trusted automation /
a human operator, not untrusted input). Zero new I/O, network, exec, or
credential surface — `validateRow` is a pure function over an
already-in-memory object. No dependency added. No `.github/`,
`dream.config.json`, or gate/threshold file touched — out of scope for the
guarded auto-merge label regardless.

## Regression Analysis

0 pre-existing tests removed, weakened, or retargeted — `index.test.ts`
(both packages) diffs are pure additions. `npm run lint`/`npm run build`
clean before and after. `npm run typecheck`'s pre-existing `TS18002`
(root `tsconfig.json` has an empty `files` list) reproduces identically on
the parent commit — environmental, unrelated to this candidate, same
conclusion independently reached by PR #33 and PR #63.

## ADR

None. This is a validation/correctness fix within the already-decided
ledger design (ADR-0001's "ledger is the only durable cross-night memory";
the `verifyLedger` schema itself, already decided, is reused, not redefined)
— not a new architectural decision. Matches this repo's own precedent
(PRs #33/#63/#97/#99/#107 all skip an ADR for parameter/validation/data-
correctness fixes).

## Gist

No `gh gist create`-equivalent tool available to this session (`gh` CLI
unavailable; the GitHub MCP tools available here have no gist API).
`GIST=LOCAL` — this file, committed at
`docs/dream-cycle/2026-10-31-ledger-signals-report.md`, is the full report.

## Scan Findings

**witness** — `dream-machine witness stamp`/round-tripped tonight against a
throwaway file; mechanics reconfirmed consistent with the documented
self-reference constraint (a report cannot embed its own hash — see Witness
section below). No new witness-module finding; `packages/witness`'s own
14-test suite is untouched and green.

**verify** — `ledger verify --path docs/dream-cycle/LEDGER.md` reconfirmed,
byte-for-byte, the same 9 structural errors first reported 2026-09-08,
unfixed on `main` (unmerged fix: PR #33, open 40 days). Separately,
exercising this repo's configured `verify-entrypoint`/`verify-entrypoints`
classifiers (the tool this SCAN item is named for) against `dream.config.json`
tonight classified both `bench` and `darwin` as **live** — `darwin`
specifically because, unlike several prior nights, the sandboxed environment
tonight *could* reach the registry and installed `@metaharness/darwin@0.12.1`
for real (see Ledger Check for what that run actually did and why it was not
kept).

## Competitors — durable memory / append-time integrity

| System | Append-time (not just post-hoc) validation of its durable log/memory | Grade |
|---|---|---|
| OpenHands | Structured event-stream trajectories; a documented "Stuck Detector" watches for behavioral repetition, but no documented schema gate on what gets appended to the trajectory store itself | B (official docs, cross-checked against 2026-09-08/2026-10-26 citations) |
| DSPy / GEPA | A candidate must clear Pareto-front acceptance before entering the tracked lineage — the closest public analogue to "validate before it becomes memory," though scoped to prompt-candidate selection, not a generic row-schema check | B (official docs, cross-checked) |
| SWE-agent / SWE-Replay | Full JSON trajectory dump per step, replayed for debugging after the fact — no append-time schema validation found in public sources; integrity is post-hoc (replay), like PR #33's CI gate | B (arXiv 2601.22129, official repo) |
| Sakana AI Scientist | Growing knowledge archive across runs; independent literature (arXiv 2502.14297) explicitly flags provenance/versioning as an open gap, not solved | B (official repo + peer critique) |

None of the four surveyed systems' public documentation describes validating
a durable-log entry *at the moment of writing* the way tonight's candidate
does for this repo's ledger — DSPy/GEPA's Pareto-front gate is the closest
analogue, and it is scoped to candidate selection, not a generic schema
check on a persistent append-only log.

## Witness

Per the 2026-09-08/2026-09-21/2026-10-26 precedent: a report never embeds its
own `report_sha256`/`witness` triple inline, since self-reference would make
the published hash unreproducible against the committed file. The triple is
computed once this file reaches its final committed content (immediately
before commit) and published externally — in this PR's description, the
linked issue, and the `LEDGER.md` row — never pasted back into this section.

**Verifier procedure (5 steps, coreutils + git only):**

1. `git show <this-PR's-head-commit>:docs/dream-cycle/2026-10-31-ledger-signals-report.md > report.md`
2. `REPORT_HASH=$(sha256sum report.md | awk '{print $1}')`
3. `SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`
4. `printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'`
5. Compare to the `witness` value published in this PR's description, the
   linked issue, and the `LEDGER.md` row for 2026-10-31 — must be
   byte-identical.

## Recommendation

`evaluated: accepted` for tonight's candidate (small, additive, 111/111,
0 regressions, backward-compatible, not a duplicate of PR #33/#99). Concrete
next steps, not done tonight:

1. **Review/merge PR #33** (quarantine + parser boundary + CI gate for the
   existing 9 errors) **and tonight's PR together** — they address the same
   root incident at two different points (entry vs. detection) and do not
   appear to touch the same lines of `packages/ledger/src/index.ts` (PR #33
   edits `parseLedger`; tonight edits `verifyLedger`'s row-check extraction
   and `appendRow`'s caller) — not independently confirmed for a textual
   merge conflict; a human reviewer should check both before merging either.
2. **The 0-merges-since-#9 / 30-open-draft-PR backlog is a human decision**,
   not re-litigated here — issues #84/#90/#104 already track it in detail.
3. **Consider whether `ledger append` should also become a CI-invokable
   dry-run mode** (`--check`, exit-code only, no write) so PR #33's CI gate
   and tonight's append-time check compose into one invariant: no commit
   reaching `main` can ever contain a row that `ledger verify` would reject.
   Not built tonight — a materially separate, small follow-up.

This session does not merge, self-approve, apply any auto-merge label, or
self-promote. Human review requested.
