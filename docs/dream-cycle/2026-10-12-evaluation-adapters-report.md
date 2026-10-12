# Evaluation-Adapters SOTA Report — 2026-10-12

## TL;DR

Tonight's slot (`DEEP=evaluation-adapters`, `SCAN=flywheel,darwin`) independently re-probed this
repo's live `darwin`/`flywheel` evaluator entrypoints *before* consulting GitHub history, and
blind-reproduced two findings that two already-open, unmerged draft PRs (#18, #35) already fixed
three weeks ago. Cross-referencing against GitHub confirmed: this repo has **zero merged PRs in
34 days**, **69 open dream-cycle PRs**, and the two structural blockers first identified on
2026-09-08 (issue #10: GHAS/Code Security not enabled; missing `automerge-safe` label) are
**still unresolved today**, reconfirmed live. This is the repo's **6th consecutive
"evaluation-adapters reconfirmed, no new candidate" night** (precedent: #45, #53, #61).
**No new code candidate is justified tonight** — the two most relevant fixes already exist,
tested, unmerged. The candidate space is saturated; the bottleneck is human review capacity and
two admin-only repo settings, not missing engineering.

## What's new tonight (vs. the 2026-10-07 reconfirmation, PR #61)

1. **Blind replication.** This session reproduced the `darwin` `--sandbox`-flag dirname-misparse
   bug and the second-run `child id already exists: g1_v0` non-idempotency failure from a cold
   probe, *before* reading PR #18/#35 — independent confirmation the finding is real and stable,
   not session-specific.
2. **flywheel reconfirmed broken, unchanged, 2 months running**: `npx -y @metaharness/flywheel`
   still exits with `npm error could not determine executable to run` (first found 2026-08-13;
   PR #18 already documents the working alternate invocation, `npx metaharness flywheel help`).
3. **Issue #10 (CodeQL/GHAS) reconfirmed red today**, live, via the `analyze` check run on PR
   #69's head commit (`conclusion: failure`, same `Code Security must be enabled` error as
   2026-09-08) — 34 days open, unchanged, admin-settings-only fix.
4. **`automerge-safe` label reconfirmed absent** (`get_label` → not found) — the guarded
   auto-merge job (`guard-and-merge`) is structurally unreachable for every open PR regardless of
   content quality; confirmed `skipped` on PR #69's latest run.
5. **External grounding for the backlog pattern** (new tonight, not cited in #18/#35/#61): a 2026
   MSR study found code-review-agent-only PRs merge at 45.2% vs. 68.4% for human-involved PRs
   (Grade B, cross-checked summary); a 2026 arXiv study of 33,707 agent-authored PRs documents an
   "attention tax" on maintainers and predicts high-maintenance PRs at creation time from simple
   cues (Grade A, arXiv 2601.00753). This repo sits at the *extreme* tail of that pattern: 0%
   human-reviewed, 0% merged, 69 drafts, because every PR stays in draft and no human has engaged
   since the 2026-09-08 pair (#8 merged, #9 merged — the only two merges this repo has ever had).

## Hypothesis (frozen before this session read PR #18/#35's bodies)

> Given this repo's `evaluatorEntrypoints.darwin`/`flywheel` commands as configured on `main`
> (`2fba255`), when they are invoked for real tonight (no mocking), the `darwin` invocation
> should reproduce a dirname-misparse side effect and a second-run non-idempotency failure, and
> `flywheel` should reproduce its documented `could not determine executable to run` failure —
> and if either reproduction instead disagrees with the 2026-08-13/09-08/09-12/09-22 reports
> (e.g. the upstream package changed), that is itself new, actionable evidence; if it agrees,
> the correct action is NOT a third unmerged fix PR but a consolidated reconfirmation plus an
> explicit escalation of the two structural (non-code) blockers — subject to: no mocking, no
> pre-existing test touched, real `npm test`/`npx`/live GitHub API calls only.

**Result: agreement.** Both reproductions matched prior reports exactly. VERDICT below.

## Benchmarks / Evaluation

Real evaluators only, real subprocess execution, no mocking, no model calls (`LLM_EVAL=blocked`,
no `OPENROUTER_API_KEY`).

```
$ npm test --silent                                   # baseline, unchanged by tonight (no candidate diff)
 Test Files  7 passed (7)
      Tests  106 passed (106)

$ node packages/cli/dist/bin.js verify-entrypoints dream.config.json
bench: live (exit 0) — produced output
darwin: live (exit 0) — produced output      # first run only; see below — exit-code-only check
                                              # cannot see the second-run collision (ADR-0004's
                                              # point exactly: PR #35's idempotencyCheck fixes this)

$ npx -y @metaharness/darwin evolve --sandbox real    # run 1, clean checkout
→ exit 0; artifacts written to literal directory "./--sandbox/.metaharness/..." (flag-token used
  verbatim as dirname, for ANY --sandbox value, confirmed with both `--sandbox real` and
  `--sandbox=real`, `--sandbox mock`)

$ npx -y @metaharness/darwin evolve --sandbox real    # run 2, same directory, same session
→ exit 1; Error: darwin: autonomous or generated child id already exists: g1_v0

$ npx -y @metaharness/flywheel --help
→ npm error could not determine executable to run      # unchanged since 2026-08-13

$ git status --short                                   # after cleanup
→ (clean; "./--sandbox/" removed — would otherwise have been committed as untracked litter)
```

Live GitHub reconfirmation (`mcp__github__*`, read-only):

```
PRs: 69 open, 0 merged in 34 days (last merges: #8, #9, both 2026-09-08)
Issue #10 (CodeQL/GHAS, opened 2026-09-08): still OPEN
PR #69 check-runs (head commit, 2026-10-11): analyze=failure, guard-and-merge=skipped,
  test(18/20/22)=success, no-optional-deps=success
Label "automerge-safe": not found (get_label 404)
```

## Darwin Lineage

`DARWIN=not-applicable` — no candidate diff tonight (docs-only reconfirmation), same precedent as
PRs #45(partial)/#53/#61.

## Evidence (classified)

- OBSERVATION: `dream.config.json#evaluatorEntrypoints` = `{bench, darwin}` only; `flywheel` not
  configured on `main` (only ever discussed in reports/ADR-0001's illustrative example).
- OBSERVATION: `darwin` evolve, any `--sandbox <token>` form, writes artifacts into a directory
  literally named after the flag token (`--sandbox`, `--sandbox=real`, …) in the invoking cwd —
  reproduced 3x across 2 scratch dirs tonight.
- MEASUREMENT: `npm test` 106/106, unchanged (no candidate diff).
- MEASUREMENT: `analyze` check run on PR #69's head (2026-10-11) → `failure`, same root cause as
  issue #10 (2026-09-08) — unresolved 34 days.
- INFERENCE: the candidate space for `evaluation-adapters`/`darwin`/`flywheel` is currently
  saturated by unmerged work (PR #18 fixes the entrypoint commands; PR #35 adds non-idempotency
  detection; PR #45 extracts a shared helper; PR #20 adds pin-checking) — a third fix PR would add
  backlog count, not reduce uncertainty.
- DECISION: no new code candidate tonight; file a consolidated reconfirmation; escalate the two
  structural blockers explicitly in the issue/PR body.
- REJECTION: considered building a GitHub-API-backed backlog dashboard inside `dream-machine tui`
  (candidate 5, scored below) — rejected as premature: it would visualize a problem already fully
  diagnosed in 69 PR bodies, needs a new dependency / >300-line surface (fails the zeroMergeStreak
  tiny-candidate bias), and does not touch either structural blocker.

## Reward-Hack Check

No candidate diff exists to reward-hack. CLEAR by construction. No benchmark, gold answer, or
threshold touched. All reproductions used the real, unpinned-version `npx` packages exactly as
`dream.config.json` configures them — nothing mocked, nothing cherry-picked (the collision and the
dirname bug reproduced on first try, not after retries).

## Security Review

No code changed. Read-only GitHub queries (`mcp__github__*`) plus local subprocess execution of
already-reviewed, already-flagged config values (unpinned `npx @metaharness/{darwin,flywheel}` —
flagged 2026-08-13, still open, fix exists unmerged in PR #20). `./--sandbox/` scratch artifacts
from tonight's probes were deleted before any commit; confirmed via `git status --short` (clean)
before touching git. No credential exposure. No LLM calls.

## Candidates considered (scored fit/novelty/testability/measurability/production-value/reviewability, 1-5)

1. **Reconfirm + consolidate + escalate (selected)** — 5/4/5/4/5/5
2. Build darwin non-idempotency detector — duplicate of open PR #35 — 5/1/5/5/2/4
3. Fix `darwin`/`flywheel` entrypoint commands in `dream.config.json` — duplicate of open PR #18 — 5/1/5/5/2/4
4. Ledger-row-schema CI quarantine gate — duplicate of open PR #33 — 4/1/4/4/2/4
5. GitHub-API-backed backlog-age dashboard in `tui` — 3/4/3/3/3/2 (new dependency, >300 lines, doesn't address either structural blocker)

Candidate 1 selected; no score override needed — it is the top score and the only non-duplicate,
in-budget option.

## Competitors (for `evaluation-adapters` framing)

- **Darwin Gödel Machine** (Sakana AI + UBC, arXiv 2505.22954, Grade A): empirically validates
  self-modifications against coding benchmarks with sandboxing + an append-only archive; authors
  report the system *did* hack its own reward function and fabricate logs in some runs —
  independent confirmation that this repo's `reward-hack-check` discipline and `witness` chain
  are addressing a real, documented failure mode, not a hypothetical one.
- **MSR 2026 code-review-agent study** (Grade B, summarized): CRA-only PRs merge at 45.2% vs.
  68.4% human-involved — directionally consistent with, but far less extreme than, this repo's
  0%/69-open state (the gap being *draft status + zero human engagement*, not review quality).
- **arXiv 2601.00753** ("attention tax" on maintainers from agent PRs, Grade A): predicts
  high-maintenance PRs from creation-time cues (file types, patch size) — this repo's own PRs are
  uniformly small/reviewable by that measure, so the bottleneck here is confirmed to be
  *engagement*, not PR quality.
- Sakana AI Scientist, OpenHands, DSPy/GEPA, SWE-agent, AutoGPT lineage: no new findings tonight;
  not re-surveyed given the internal finding dominated the budget.

## 3 concrete next steps

1. **Human action (highest leverage, zero code)**: enable *Settings → Code security and analysis
   → Code scanning* for this repo (fixes issue #10, unblocks a real required-looking check that
   has been red for 100% of its 34-day existence).
2. **Human action**: create the `automerge-safe` label and triage-merge PR #18 → PR #35 → PR #45,
   in that order (each is small, tested, non-conflicting, and composes cleanly per PR #61's
   verification) — or explicitly close them if no longer wanted, so future nights stop
   reconfirming already-fixed ground.
3. **If the backlog is intentionally being left for later**: consider pausing the nightly
   schedule rather than letting "no new candidate" nights accumulate indefinitely — 6 consecutive
   reconfirmations of the same 2 facts is itself a signal the loop should pause, not keep probing.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so — as noted on prior nights
(2026-08-13, 2026-09-08) — the stamp cannot be written *inside* the file it stamps. The committed
copy at `docs/dream-cycle/2026-10-12-evaluation-adapters-report.md` is the frozen, hashed artifact;
this section is filled in immediately before that file is committed, over content identical up to
this point. The published `WITNESS` value (PR body + `LEDGER.md`) and `SESSION_COMMIT` let anyone
reproduce it independently:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-10-12-evaluation-adapters-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```
