# Ledger-Signals SOTA Report — 2026

## TL;DR

The Dream Machine's own ledger (`docs/dream-cycle/LEDGER.md`) has carried **9
schema errors in rows 2–6** since the 2026-09-08 run first detected and
reported them — and never fixed them, because nothing in the write path
stopped a non-conforming row from landing in the first place. Tonight's
candidate closes that gap: `ledger append` now validates `Verdict` /
`Evaluated?` / `Date` against the same schema `ledger verify` checks, and
refuses to write a non-conforming row unless `--force` is passed. This
doesn't touch the historical rows (no gold-data rewrite); it stops the
*next* occurrence of the exact defect class the repo already diagnosed on
itself two months ago and then let recur.

## What's new

- `@dream-machine/ledger` gains an exported `validateRow(row): string[]`,
  factored out of `verifyLedger`'s per-row loop (same error strings, same
  rules — `verifyLedger` now calls it, so there is exactly one place the
  schema is defined).
- `dream-machine ledger append` calls `validateRow` before writing. On a
  violation it prints the errors, exits 1, and writes nothing — fail closed,
  not fail silent. `--force` is the documented escape hatch for an
  intentionally historical/compound row.
- This is a self-referential finding: the control loop's OWN durable memory
  (the ledger) was the thing with the defect, under the night's assigned
  surface (`ledger-signals`) and scan (`witness`, `verify`).

## Competitors / prior art (how other agent loops guard their own state)

| System | Durable cross-run memory | Write-time validation | Grade |
|---|---|---|---|
| Sakana AI Scientist | experiment log + paper drafts | no enum-schema gate reported on the log itself (A — official repo/paper describes the pipeline, not a ledger validator) | A |
| OpenHands | event stream / trajectory JSON | schema-typed `Event` objects enforced by the Python event bus at construction time, not post-hoc lint (A — official docs/source) | A |
| DSPy / GEPA | optimizer trace + Pareto program archive | Pareto archive entries are structurally constructed by the optimizer, not hand-appended text, so the failure mode this finding targets (free-text drift) doesn't apply the same way (B — paper + repo cross-checked) | B |
| SWE-agent | trajectory `.traj` JSON | JSON schema is enforced by the serializer, not a separate linter (A — official repo) | A |
| AutoGPT lineage | memory store (vector/JSON) | historically no enum-constrained ledger; closer to this repo's original gap (C — general community knowledge, not freshly verified tonight) | C |

Pattern: every A/B-grade competitor enforces its durable-memory schema **at
construction/write time**, not via a separate post-hoc verifier the way this
repo's `ledger append` did until tonight. This repo had the verifier
(`ledger verify`) but not the gate — it could detect the defect (and did, in
writing, on 2026-09-08) but had no mechanism to prevent it from recurring.
Tonight's candidate is this repo catching up to that pattern on its own
most safety-critical piece of state.

## Hypothesis (frozen before evaluation)

> Given the Dream Machine's existing `docs/dream-cycle/LEDGER.md` and CLI,
> when `ledger append` validates `Verdict`/`Evaluated?`/`Date` against the
> same enum `ledger verify` already checks and refuses to write on violation,
> then attempting to append the exact malformed shape found in rows 2–6
> (e.g. `verdict="ACCEPT / INCONCLUSIVE"`, `evaluated="partial"`) should be
> rejected with exit code 1 and the ledger file left byte-for-byte unchanged,
> while every row that was previously accepted by `ledger verify` continues
> to be accepted by `ledger append`'s new gate (no regression on the
> conforming path), and the pre-existing 9 historical errors in rows 2–6
> remain exactly 9 (the candidate must not silently rewrite history to look
> like it fixed something it didn't).

## Benchmarks / Evaluation

Evaluator: `npm test` (vitest), plus the repo's own `ledger verify` /
`ledger append` CLI against both a synthetic ledger and the real
`docs/dream-cycle/LEDGER.md`.

**Baseline** (`git stash`, i.e. commit `2fba255`):
- `npm test`: **106/106 passed**, 7 test files.
- `npm run typecheck`: fails — `tsconfig.json(1,12): error TS18002: The
  'files' list in config file ... is empty.` (pre-existing, unrelated to
  this finding — confirmed by re-running on the unmodified tree).
- `node packages/cli/dist/bin.js ledger verify --path docs/dream-cycle/LEDGER.md`:
  **9 errors**, all in rows 2–6 (compound `Verdict`/`Evaluated?` values).
- Repro: `ledger append --verdict "ACCEPT / INCONCLUSIVE" --evaluated partial`
  on the baseline CLI **succeeds (exit 0)** and silently writes the
  non-conforming row — this is how rows 2–6 happened.

**Candidate** (this diff, 4 files changed, +83/−10 lines):
- `npm test`: **113/113 passed**, 7 test files (+7 new tests, 0 regressions,
  0 flakes across 2 runs).
- `npm run lint`: clean.
- `npm run typecheck`: same pre-existing failure, verified identical on
  both trees via `git stash`/`git stash pop` — not caused by the candidate.
- `node packages/cli/dist/bin.js ledger verify --path docs/dream-cycle/LEDGER.md`:
  still **9 errors**, byte-identical list — historical rows untouched, as
  the frozen hypothesis required.
- Repro, same command as the baseline repro, against a scratch copy of the
  real ledger: **exit 1**, prints
  `verdict "ACCEPT / INCONCLUSIVE" not in ACCEPT|REJECT|INCONCLUSIVE` and
  `evaluated "partial" not in yes|no|blocked`, and the scratch file is
  **byte-identical before/after** (`diff` reports no difference). `--force`
  verified to still allow the historical/compound case when a human
  explicitly opts in.

Effect size: this is a binary defect-class closure, not a continuous metric
— before: write-time acceptance rate of the row-7-reported bad shape = 100%
(1/1 repro); after: 0% (1/1 repro), with the detection path (`ledger
verify`) unchanged and unweakened.

## Darwin

Not run. The candidate is a single conceptual change (factor validation out
of `verifyLedger`, call it from `ledger append`) with no tunable parameter
space to evolve — bounded Darwin would have nothing to mutate. Recorded as
`DARWIN=skipped (no parameter space)`, not blocked or inconclusive.

## Reward-hack check

- Did not touch `verifyLedger`'s rules, `VERDICTS`/`EVALS` vocab, or any
  test's expected values — same enum, same error strings.
- Did not rewrite or "fix" the 9 historical errors to manufacture a clean
  `ledger verify` run — confirmed identical error count/content pre/post.
- Did not touch `packages/cli/src/entrypoint.ts`, `witness`, or any
  evaluator entrypoint — `verify-entrypoints dream.config.json` still
  reports `bench: live`, `darwin: live` unchanged.
- No threshold, gate, or CI workflow touched.
- No model calls made or claimed (`LLM_EVAL=blocked`, consistent throughout).

## Security review

`ledger append --force` is a deliberate, documented escape hatch (not a
silent bypass) — it requires an explicit flag a human or script must pass,
and it's the same trust boundary that already existed (anyone who can run
the CLI could already hand-edit the markdown file directly). No new
privilege, no credential, no network call introduced. Least-privilege
unaffected.

## Next steps

1. **CI enforcement**: wire `ledger verify` into the repo's PR workflow so a
   hand-edited `LEDGER.md` (bypassing the CLI entirely) is also caught
   before merge — the append-time gate only protects the CLI path.
2. **Historical remediation (separate PR, separate review)**: decide
   deliberately whether rows 2–6 should be rewritten to the strict schema
   (lossy to the original multi-repo nuance already captured in the
   `Effect`/`Prior-night fates` text) or whether `ledger verify` should gain
   a documented `--since` cutoff that scopes strict checking to the
   post-2026-09-08, single-repo era. Don't conflate this with tonight's gate.
3. **Zero-merge streak** (`learningSignals.zeroMergeStreak = true` over the
   last 7 nights considered): the next several candidates should stay this
   small and this mechanically reviewable until a PR actually merges.

## Witness

- Session commit: `2fba2550182d81b36423447221823e98e227482a`
- Report sha256: `8e9bd6f7b2ae17ebe5d59e74da9da94e70b57daef7c85815a9590d24d1c43f59`
- Witness stamp: `3390d9e565700a3dbdcd6a228d694ba1247fc96f3c0b8b1b7174d29a682a50b2`

(Note: this witness is computed over the report body as it stood immediately
before this Witness section was filled in with real values — i.e. over the
version with `<computed below, then substituted>` placeholders. A verifier
reproducing against the *published* gist text, placeholders already filled,
will need the gist's raw bytes at publish time; this repo's own
`witness verify` is the authoritative check — see step 5.)

Verify procedure (anyone can reproduce):
1. `git -C agentics-dream-machine show 2fba2550182d81b36423447221823e98e227482a --stat` —
   confirms the session's starting commit.
2. Save this gist body (as published) to a file, e.g. `report.md`.
3. `sha256sum report.md` — the session-local pre-fill hash above was
   `8e9bd6f7b2ae17ebe5d59e74da9da94e70b57daef7c85815a9590d24d1c43f59`.
4. `printf '%s%s' "$(sha256sum report.md | awk '{print $1}')" \
   "2fba2550182d81b36423447221823e98e227482a" | sha256sum` — reproduces the
   witness stamp for whatever bytes are in `report.md`.
5. Equivalently: `node packages/cli/dist/bin.js witness verify report.md \
   2fba2550182d81b36423447221823e98e227482a <witness>` from a checkout of
   this repo at that commit.
