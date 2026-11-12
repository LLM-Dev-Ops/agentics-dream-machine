# Evaluation-Adapters SOTA Report — 2026

**Repo:** `LLM-Dev-Ops/agentics-dream-machine` · **Night:** 2026-11-12 · **DEEP:** evaluation-adapters · **SCAN:** flywheel, darwin · **Slot:** 2 · **Session commit:** `2fba255`

## TL;DR

This repo's configured `darwin` evaluator entrypoint (`npx @metaharness/darwin evolve --sandbox real`) is the subject of four prior, still-unmerged nightly PRs (#101, #111, #113, #123) that progressively diagnosed why Darwin runs against this repo carry little evolutionary signal. PR #111 (2026-11-01) measured that `--sandbox mock` is **repo-independent** (byte-identical output for a real repo path and a nonexistent one) but explicitly declined to test `--sandbox real` the same way, leaving it "deliberately excluded... until independently measured." Tonight closes that gap: `--sandbox real`, with a correct `<repo>` positional, **is** repo-path-dependent (real vs. nonexistent target produce different, deterministic, reproducible pass-rates — 0.985/pass=1.00 vs 0.235/pass=0.00). It is simultaneously, and separately, non-discriminating across mutated genome variants within a run (delta +0.000 for all 9 variants, both runs) — which is not a new finding; it is the exact behavior `@metaharness/darwin`'s own README documents and attributes to its own ADR-099 ("behavioural manifold is degenerate... measured: nicheEntropy = 0"). Tonight's contribution is a focused, empirically-grounded classifier extension plus a reproducible receipt, not a rediscovery of the degenerate-manifold claim.

## What's new

- First direct, repeatable measurement of `--sandbox real`'s repo-*path* dependence for this specific repo (as opposed to its already-documented variant-*discriminating* power, which is a different property and was already known via upstream docs + PR #101's genome-overlap analysis).
- A `classifySandboxDiagnosticity('real', …)` branch (pure, zero-I/O) reporting `repoIndependent: false` from direct evidence rather than the honest "not measured" default PR #111/#123 shipped.
- A clean, reproducible A/B receipt anyone can re-run (see Witness below), plus a determinism check (same real path, same seed, cleaned `.metaharness/`, byte-identical repeat).
- A secondary, un-actioned observation (not implemented tonight — see Next Steps): re-running the same seeded `--sandbox real` command without first removing the prior run's `<repo>/.metaharness/` work tree throws `Error: darwin: autonomous or generated child id already exists: g1_v0` — an idempotency hazard for any future CI/evaluator-entrypoint automation that invokes this command more than once against the same checkout.

## Competitors / prior art (grade noted per claim)

- **Darwin Gödel Machine (Sakana AI + collaborators, ICLR 2026, arXiv:2505.22954)** — Grade A (official paper, open-sourced at github.com/jennyzzt/dgm). Gates self-modification behind a staged real-benchmark evaluation (10→60→200 SWE-bench tasks) and sandboxes all execution; its entire validity argument rests on the assumption that benchmark score increase tracks real coding capability — exactly the assumption this repo's `--sandbox real` degenerate-manifold problem violates for *this* harness's own test suite as an evaluator.
- **`@metaharness/darwin` upstream README (installed v0.14.0, Grade A — official, first-party)** — "By default the sandbox runs the repo's test command, which is independent of the harness surfaces — so the behavioural manifold is degenerate (measured: nicheEntropy = 0, ADR-099)." This is the authoritative, first-party confirmation of the variant-non-discrimination half of tonight's finding; this repo's own `dream.config.json` still runs the degenerate default (`--sandbox real`, no override).
- **"Who Grades the Grader? Co-Evolving Evaluation Metrics and Skills for Self-Improving LLM Agents" (arXiv:2607.12790, 2026)** — Grade B (preprint, cross-checked via secondary summary, not independently re-derived). Treats evaluation metrics as inevitably gameable and reports a concrete case of a skill gaming a rubric's tag counter — directly analogous to why this repo's prompt mandates an independent critic and a reward-hack check (Steps 10/12) rather than trusting a single evaluator's score.
- **"Reward Hacking as Equilibrium under Finite Evaluation" (arXiv:2603.28063, 2026)** — Grade B (preprint). Distinguishes a Goodhart regime (evaluator unaffected by the agent) from a Campbell regime (capable agent degrades evaluation faster than it can be improved). This repo's darwin entrypoint sits squarely in a degenerate-but-not-adversarial case: no agent is gaming the evaluator, the evaluator simply cannot discriminate at all for this harness, so delta stays at exactly 0.000 rather than drifting toward a hacked high score.
- **Out-of-band evaluator design (arXiv:2607.25152, 2026)** — Grade C (single-source aggregator summary, not independently verified). Argues an evaluator should check real-world ground truth as a separate process rather than trust the agent's own transcript; relevant context for why this repo's `classifyEntrypointResult`/`classifySandboxDiagnosticity` family treats entrypoint output as something to classify and distrust by default rather than accept at face value.

## Frozen hypothesis (recorded before implementation)

> Given this repo's configured `darwin` evaluator entrypoint invoked with `--sandbox real` and a *correct* `<repo>` positional argument (fixed `--generations 3 --children 4 --seed 42`), when the target path is a real, existing repo versus a path that does not exist on disk, then the reported leaderboard score and `pass` rate should **diverge** between the two runs — demonstrating `--sandbox real` is repo-path-dependent, unlike `--sandbox mock` (PR #111) — while every genome variant within a single run should continue to **tie exactly** with that run's own baseline (zero evolutionary discriminating signal, consistent with upstream ADR-099's documented degenerate manifold), subject to: (a) the real-path run reproducing byte-identically on repeat once leftover `.metaharness/` artifacts are removed (determinism), and (b) this repo's actual `npm test` result (106/106 passing on session commit `2fba255`) being the ground truth the real-path run's `pass=1.00` reading is checked against.

Hypothesis frozen before any evaluation code was written; not modified afterward.

## Candidates considered (5 proposed, 1 selected)

| # | Candidate | Fit | Novelty | Testability | Measurability | Prod value | Reviewability |
|---|---|---|---|---|---|---|---|
| 1 | **[SELECTED]** Measure + classify `--sandbox real` repo-path-dependence, extend `classifySandboxDiagnosticity` | 5 | 4 | 5 | 5 | 3 | 5 |
| 2 | Fix darwin's swallowed-`<repo>`-positional bug in the configured entrypoint | 5 | 1 | 5 | 5 | 4 | 5 |
| 3 | Wire sandbox classification into `verify-entrypoint(s)` CLI output | 5 | 1 | 4 | 4 | 3 | 4 |
| 4 | Audit the ledger's staleness since 2026-09-08 despite 20+ nights of issues/PRs | 2 | 4 | 3 | 3 | 4 | 3 |
| 5 | Fix `.metaharness/` artifact-collision on same-seed reruns | 4 | 3 | 4 | 4 | 3 | 4 |

Candidates 2 and 3 score low on novelty because they are, respectively, exactly what unmerged PR #113 and unmerged PR #123 already implemented against this same baseline commit — building them again would duplicate, not extend, existing work. Candidate 4 is a real and material finding (explored in Ledger Check, below) but belongs to the `ledger-signals` surface, not tonight's `evaluation-adapters` slot; it is reported but not actioned tonight. Candidate 5 is a legitimate secondary finding surfaced *while measuring* Candidate 1 (see "What's new") and is recorded as a Next Step rather than implemented, to keep tonight's candidate to one conceptual change. Candidate 1 is selected: it is the one direction among the five that is both genuinely novel (fills a gap PR #111 explicitly left open) and fully testable tonight without model calls.

## Evaluation

**LLM_EVAL status:** `blocked` — no `OPENROUTER_API_KEY`/model-calling credential is configured in this session's environment (only `ANTHROPIC_BASE_URL`, which is session infrastructure, not an evaluation credential). Tonight's candidate was deliberately chosen to be fully testable without any model call, per STEP 0.5's credentials-reality-check instruction.

**Real evaluator used:** this repo's own `npm test` (vitest) as the `bench` entrypoint, plus the real, installed `npx @metaharness/darwin@0.14.0 evolve` binary (not mocked, not inferred from logs) as the `darwin` entrypoint under test.

**Parent (baseline) receipt — `npm test` on session commit `2fba255`:**
```
Test Files  7 passed (7)
     Tests  106 passed (106)
  Duration  704ms
```

**Darwin A/B receipt (real `--sandbox real` invocations, not simulated):**
```
$ npx @metaharness/darwin@0.14.0 evolve /home/user/agentics-dream-machine \
    --sandbox real --generations 3 --children 4 --seed 42
...
Darwin Mode — leaderboard
  0.985  baseline  [planner]  safety=1.00  pass=1.00 ◀ winner
  (9 variants, all 0.985, all pass=1.00, delta +0.000)
Winner: baseline   Delta over baseline: +0.000

$ npx @metaharness/darwin@0.14.0 evolve /home/user/this-path-does-not-exist-xyz \
    --sandbox real --generations 3 --children 4 --seed 42
...
Darwin Mode — leaderboard
  0.235  baseline  [planner]  safety=1.00  pass=0.00 ◀ winner
  (9 variants, all 0.235, all pass=0.00, delta +0.000)
Winner: baseline   Delta over baseline: +0.000
```
`diff` of the two full transcripts: only the score/pass lines and the `Artifacts:` path line differ — confirming repo-path-dependence. Re-running the real-path invocation again (after `rm -rf /home/user/agentics-dream-machine/.metaharness`) reproduced the first transcript **byte-identically**, confirming determinism and ruling out flakiness as the explanation for the A/B divergence. Full transcripts preserved at `/home/user/darwin-ab/{real-A.txt,real-B.txt,real-A2.txt}` for this session.

**Candidate implementation receipt:** `npm test` after adding `packages/cli/src/darwin-sandbox.ts` + `darwin-sandbox.test.ts` (see Candidate PR) — see Evaluation Receipt in the PR description for the exact before/after test counts.

## Reward-hack check

No benchmark, gold answer, or threshold was altered. The candidate adds a pure, zero-I/O classification function and a new test file; it does not touch `npm test`'s existing assertions, does not change what darwin itself does, and does not change `classifyEntrypointResult`'s 3-verdict contract (ADR-0002). The empirical A/B receipt was generated by invoking the real, unmodified, installed `@metaharness/darwin` binary — not simulated, not inferred from partial logs, not cherry-picked (both directions of the A/B and the determinism repeat are reported, not just the result that matches the hypothesis).

## Security review

Not security-sensitive: no change to credential handling, tool/MCP authority, filesystem/network scope beyond what `npm test` already exercises, or autonomous mutation capability. The classifier is read-only/pure.

## Witness

- **Session commit:** `2fba2550182d81b36423447221823e98e227482a`
- **Report sha256:** `5b0eca5af973cc788afd9ae02b6e8596b48e623a06c0f03b74104a947a0e57c6`
- **Witness stamp (sha256 of report-sha256 ∥ session-commit):** `aabaa7f833c637b8ff41e0a2a43e942f14ea58fc1b10287e6bda9052178faa61`

**Verifier procedure (reproduce independently):**
1. Check out `LLM-Dev-Ops/agentics-dream-machine` at commit `2fba255` (`git checkout 2fba2550182d81b36423447221823e98e227482a`).
2. Fetch this exact report text (gist URL, below, or the copy committed alongside the candidate PR at `docs/dream-cycle/2026-11-12-evaluation-adapters-report.md`) and compute `sha256sum <file>`; it must equal the Report sha256 above.
3. Compute `sha256sum` of the concatenation `<report-sha256><session-commit>` (no separator, no newline) via `printf '%s%s' <report-sha256> <session-commit> | sha256sum`; it must equal the Witness stamp above.
4. Reproduce the darwin A/B receipt: from a checkout at commit `2fba255`, run `npx @metaharness/darwin@0.14.0 evolve <path-to-checkout> --sandbox real --generations 3 --children 4 --seed 42`, then the same command with a nonexistent path in place of `<path-to-checkout>`. Confirm the leaderboard score/`pass` fields differ (checkout: `0.985`/`pass=1.00`; nonexistent path: `0.235`/`pass=0.00`) and that all variants within each run tie their own run's baseline exactly (`delta +0.000`).
5. Reproduce determinism: `rm -rf <path-to-checkout>/.metaharness` then re-run step 4's first command; the transcript must be byte-identical to the first run.

## Next steps (concrete)

1. Rebase/reconcile this candidate's `darwin-sandbox.ts` against unmerged PR #111/#123 once any of the three merges — they target the same file and are designed (per PR #123's own commit message convention) to be mergeable in sequence, not independently duplicative.
2. Fix the `.metaharness/` same-seed rerun collision (`Error: darwin: autonomous or generated child id already exists`) observed tonight as a side effect of this measurement — a real idempotency hazard for any CI job that calls the configured `darwin` entrypoint more than once against the same checkout without cleaning state first.
3. Separately from tonight's scope: the ledger (`docs/dream-cycle/LEDGER.md`) has not been appended to since 2026-09-08 despite GitHub showing nightly issues through at least #128 (2026-11-11) — because every candidate PR since #8 is unmerged, every candidate's ledger-row addition is stranded on an un-merged branch. This is a `ledger-signals`-surface finding, reported here only because it was directly observed during tonight's Ledger Check step, and is left for that surface's own rotation.
