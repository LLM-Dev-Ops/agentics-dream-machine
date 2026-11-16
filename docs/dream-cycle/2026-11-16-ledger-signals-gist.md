# Ledger Signals SOTA Report — 2026

## TL;DR

`docs/dream-cycle/LEDGER.md`'s `verifyLedger()` validates each row's `date`
field with a shape-only regex (`/^\d{4}-\d{2}-\d{2}$/`), which silently
accepts calendar-nonsense like `2026-13-99` or `2026-02-30`. This gap was
disclosed — but never fixed — in PR #22's 2026-09-14 evaluation receipt, and
no subsequent night (across 11+ PRs on this surface) closed it. Tonight ships
a 47-line fix: a pure `isValidCalendarDate()` helper that round-trips the
parsed date through `Date.UTC` construction, wired into `verifyLedger`'s
existing per-row date check. 110/110 tests (was 106/106, +4 additive, 0
removed/weakened). Live A/B repro: the same bad-date row passes on baseline,
is flagged on the candidate.

## What's new

Nothing novel at the systems-research level — this is a small, internal
correctness fix. What's new *for this repository* is that the gap has sat
disclosed-but-unfixed for 63 days (2026-09-14 → 2026-11-16) across at least
11 PRs that touched the same file area (`packages/ledger/src/index.ts`) for
other reasons (append-time gating, quarantine, learning signals,
surfaceStreak) without ever picking up this specific, already-flagged
one-line defect.

## Competitors (how others validate structured logs at write time)

All grade C (general knowledge, not freshly re-verified this cycle — budget
was spent on internal archaeology instead; see Evaluation).

| System | Relevant pattern |
|---|---|
| OpenHands | Typed `Event`/`Action` dataclasses validated at construction, not just at read time — same "validate at the boundary" principle this fix applies. |
| DSPy / GEPA | Typed `Signature`s and assertions reject malformed structured outputs before they enter the trace, rather than only being caught by a downstream metric. |
| SWE-agent | Trajectory logs are JSON validated against a schema in the evaluation harness, but (per public issue reports) that validation has historically been shape-only in places, missing semantic constraints similar to this repo's gap. |
| Sakana AI Scientist | Experiment logs/trees are not documented as schema-validated at write time; drift has been reported anecdotally in community discussion. |
| AutoGPT lineage | Historically loose logging with publicly reported schema-drift issues over its history — the closest cautionary analog to what already happened here with rows 2-6. |

## Hypothesis (frozen before implementation)

> Given `docs/dream-cycle/LEDGER.md` and this repo's `verifyLedger()`, when
> the `date` field's validation is changed from a shape-only regex to a
> calendar-valid check (round-tripping through `Date.UTC`), then
> `ledger verify` should newly reject rows with an impossible calendar date
> (e.g. month 13, day 99, Feb 30, or Feb 29 in a non-leap year) that
> currently pass silently, while every currently-valid row (including the
> pre-existing 7 genuine rows and the 5 already-known-bad rows 2-6, whose
> *date* fields are themselves well-formed) continues to evaluate exactly as
> before — subject to: zero pre-existing tests weakened, removed, or
> retargeted; the function stays pure (no I/O, no clock, no randomness);
> `npm test` stays green with only additive tests; no duplication of any
> already-open PR's work (checked via `gh api search/code` for
> "isValidCalendarDate" and "calendar-valid" — 0 hits beyond PR #22's prose
> disclosure).

**Tested. Confirmed true, not falsified.**

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest), fresh `npm ci && npm run build`. No
model calls needed — `LLM_EVAL=blocked` is irrelevant here by design.

| | Baseline (`main@2fba255`) | Candidate |
|---|---|---|
| Tests | 106/106 | **110/110** (+4, 0 removed/modified) |
| Lint | clean (exit 0) | clean (exit 0) |
| Build (6 workspaces) | clean | clean |
| Typecheck | pre-existing `TS18002` (empty root `tsconfig.json` files list) | identical, reproduced on parent — environmental, unrelated |
| `ledger verify` (real `docs/dream-cycle/LEDGER.md`, 9 rows) | 9 errors, exit 1 | **9 errors, exit 1 — unchanged** (rows 2-6's already-known errors are untouched; their `date` fields are well-formed, only `verdict`/`evaluated` are out-of-enum) |

Live A/B repro (not inferred — real CLI invocations against a scratch copy
of the real ledger):

```
$ node packages/cli/dist/bin.js ledger append --path scratch.md \
    --date 2026-13-99 --deep test --finding "bogus calendar date" \
    --verdict ACCEPT --evaluated yes
appended row to scratch.md (verdict=ACCEPT)   # `ledger append` has no
                                                # pre-write gate on main
                                                # (that's PR #22/#109's
                                                # territory, not this fix)

# BASELINE verify of the resulting file:
$ node packages/cli/dist/bin.js ledger verify --path scratch.md
✗ ledger has 9 error(s):   # <- row 8 (2026-13-99) NOT flagged

# CANDIDATE verify of the identical file:
$ node packages/cli/dist/bin.js ledger verify --path scratch.md
✗ ledger has 10 error(s):
  ...
  - row 8: date "2026-13-99" is not a valid calendar date (YYYY-MM-DD)
```

Diff: 2 files, +47/-2, one conceptual change (shape-regex → calendar-valid
round-trip). Darwin: `DARWIN=not-applicable` — deterministic, no evolvable
parameter space.

## Witness

```
session_commit: 2fba2550182d81b36423447221823e98e227482a
report_sha256 : <computed at stamp time, see below>
witness       : <computed at stamp time, see below>
```

Verify (5 steps, coreutils only):
```
curl -sL <RAW_GIST_URL> -o report.md
REPORT_HASH=$(sha256sum report.md | awk '{print $1}')
printf "%s%s" "$REPORT_HASH" "2fba2550182d81b36423447221823e98e227482a" | sha256sum | awk '{print $1}'
# ^ this value MUST equal the published WITNESS
```

## Next steps (3 concrete)

1. Human: the 97-day, 20+-PR, zero-merge backlog on this repo (tracked by
   issues #84/#90/#104, independently reconfirmed by PR #137/#129/#125's
   integration audits) is the real binding constraint on this surface, not
   candidate quality — this session does not re-litigate it, only flags it
   again with fresh evidence (0 merges as of 2026-11-16).
2. If/when PR #33's quarantine+CI-gate and PR #22/#109's append-time
   validation land, this fix's `isValidCalendarDate` should be the single
   shared date check both call — confirmed today there is no duplication to
   reconcile (grep/search returned 0 hits for this exact function name).
3. Unexplored: whether `scripts/dream-nightly.mjs`'s own date handling (not
   touched tonight) has the same shape-only assumption anywhere outside the
   ledger module.
