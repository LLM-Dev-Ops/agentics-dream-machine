# ADR-0003: Bounded Darwin evolution against this repo has no differentiating bench signal — corrected entrypoint syntax, unresolved genome/task fit

- **Status**: Proposed
- **Date**: 2026-09-12
- **Related**: ADR-0001 §2.3 ("Evaluation is delegated, never reimplemented"),
  §2.4 (optional-backend degradation); ADR-0002 (entrypoint liveness
  classification) — this ADR documents a class of correctness gap that
  ADR-0002's live/blocked/suspicious-silent classifier cannot see by
  construction: a command can be `live` (exit 0, real output) while still
  evaluating the wrong thing entirely.
- **Deciders**: dream-cycle nightly session (evaluation-adapters,
  SCAN=flywheel/darwin), 2026-09-12
- **Tags**: dream-cycle, evaluation-adapters, darwin, flywheel, evaluator-trust,
  witness-every-quantitative-claim

## 1. Context

Tonight's DEEP=`evaluation-adapters` dive re-examined this repo's own
`dream.config.json#evaluatorEntrypoints.darwin` command
(`npx @metaharness/darwin evolve --sandbox real`) for real, using the real
package. Two independent, reproducible defects were found:

1. **Missing required `<repo>` argument.** `@metaharness/darwin evolve`'s CLI
   takes `evolve <repo> [--generations N] ... [--sandbox real|mock|agent] ...`
   with `<repo>` as a required positional. This repo's configured command
   never supplied one, in either its 2026-08-13 (`--sandbox mock`) or
   2026-09-03 (`--sandbox real`, commit `cbc82e6`) form. The CLI does not
   error on a missing `<repo>` — it silently consumes the *next token*,
   including a flag-shaped one, as the repo path. Reproduced twice tonight:
   `evolve --sandbox real` created a directory literally named `--sandbox/`
   in the invoking working directory; `evolve --help` created `--help/`. Every
   unattended nightly run of this entrypoint has therefore been evolving
   against an empty just-created directory, never against this repo, while
   still reporting `live` (exit 0, real leaderboard output) to ADR-0002's
   classifier — a command can be live and still be evaluating nothing real.
2. **No differentiating bench signal, independent of defect 1 or of sandbox
   mode.** Once corrected to the real repo path, `@metaharness/darwin bench
   create <repo>` (the package's own suite generator) produces a single task
   whose `publicTestCommand`, `hiddenTestCommand`, and `regressionTestCommand`
   are all literally `npm test` — a binary pass/fail signal invariant to every
   one of darwin's mutation dimensions (`planner`, `toolPolicy`, `reviewer`,
   `retryPolicy`, `memoryPolicy`, `contextBuilder`, `scorePolicy`). Bounded
   runs tonight (≤3 generations × ≤4 children, both `--sandbox real` and
   `--sandbox mock`, seed 42) each scored **all 10 evaluated variants
   identically**, `Winner: baseline`, `Delta over baseline: +0.000`. This
   matches darwin's own printed warning (`--sandbox real ... cannot
   distinguish between mutated harness surfaces`) and is not fixed by
   switching sandbox mode — both modes hit the same generic-task ceiling.

ADR-0001 §2.3 names `@metaharness/darwin` as the backend that owns "STEP 12
bounded Darwin evolution" by composition, implying meaningful per-run signal.
That composition is real (the package runs, exits cleanly, produces a real
leaderboard) but currently **structurally unable to produce a non-degenerate
result for this specific repo**, because darwin's genome models agent-runtime
policy knobs that a compiler/ledger/witness toolkit repo has no execution loop
to exercise, and its auto-generated bench suite doesn't vary by them.

## 2. Decision

- **Fix the certain part tonight**: correct `evaluatorEntrypoints.darwin` to
  supply the required `<repo>` argument (`.`), and add the previously-missing
  `flywheel` entry using its real working invocation
  (`npx metaharness flywheel help`, via the umbrella `metaharness` package —
  `@metaharness/flywheel` itself ships no `bin` field, see Alternatives).
  `.metaharness/` (darwin's real per-repo state directory) is added to
  `.gitignore`.
- **Do not fix the genome/bench-fit gap tonight.** Closing it needs a
  hand-authored `--bench <suite.json>` with tasks whose pass/fail criteria
  actually vary by mutated policy dimension — a materially larger, separately
  reviewable change, and arguably a product decision (is bounded Darwin
  evolution *for this repo's own harness policy* even a coherent goal, or is
  darwin only meaningful when composed for a target that *is* an agent
  harness, as `ruvnet/metaharness` itself is?).
- **Record, don't hide, the flat result.** The bounded runs' `Delta over
  baseline: +0.000` outcome is reported as-is in tonight's gist/issue, not
  discarded or reframed as a "clean pass" — consistent with ADR-0002's
  "never equate live with a clean pass" principle, extended here to
  "never equate live with a *correct* pass."

## 3. Consequences

- **This repo's bounded-Darwin stage is currently a placeholder**, in the
  same status class ADR-0001 §2.4 already carved out for
  `LLM_EVAL=blocked` nights: the backend is present, callable, and honestly
  reports `+0.000` rather than fabricating lift — but it cannot yet do the
  job ADR-0001 composed it for. Future darwin-scan nights should not treat a
  flat delta from this repo's default bench suite as evidence that "no
  improvement exists" — it is evidence the *evaluation surface* cannot see
  one yet.
- **ADR-0002's classifier has a documented blind spot**: `live` means
  "produced output, exited 0," never "produced *correct* output." No change
  to the classifier is proposed here — a shape-validation layer would need a
  per-entrypoint expected-output contract, out of scope tonight.
- **New but small maintenance surface**: `.metaharness/` is now gitignored;
  a second consecutive `verify-entrypoints`/darwin run in the same working
  directory without clearing it can fail with "child id already exists" —
  an idempotency caveat of the upstream package, not addressed here, worth a
  nightly-wrapper `rm -rf .metaharness` before invocation.
- **`@metaharness/flywheel`'s bin-less packaging is now correctly routed
  around** via the umbrella `metaharness` CLI; a future `metaharness`
  major-version change to its subcommand surface would silently break this
  entry the same way the missing `<repo>` arg silently broke darwin —
  ADR-0002's classifier is the intended guardrail for exactly that case.

## 4. Alternatives Considered

- **Hand-author a repo-specific bench suite tonight to force real
  differentiation.** Rejected for tonight: materially larger change, needs
  careful task design to avoid becoming an easily-gamed/trivial benchmark
  itself (the reward-hack review this repo's own discipline demands), and
  the research/evaluation time budget for a single night is half of total
  effort. Logged as Next Step 1 in tonight's gist.
- **Switch `--sandbox real` back to `--sandbox mock`** (partially reversing
  commit `cbc82e6`). Rejected: evidence shows sandbox mode is not the
  controlling variable for the flat result (both modes independently hit the
  same generic-bench-task ceiling) — changing it would not fix anything and
  would re-litigate a prior deliberate human decision without cause.
- **Invoke `@metaharness/flywheel`'s `dist/cli.js` directly with `node`
  instead of routing through the `metaharness` umbrella package.** Rejected:
  reproduced live tonight that this "succeeds" (exit 0) while being the exact
  `suspicious-silent` failure mode ADR-0002 exists to catch — the module only
  exports `dispatch()` for a host CLI, it does not self-invoke.
- **Declare tonight's darwin scan `INCONCLUSIVE` and change nothing.**
  Rejected: the `<repo>`-argument defect is an unambiguous, zero-risk,
  reproducible bug independent of the harder genome-fit question — fixing it
  is correct regardless of how the larger question resolves, and leaving a
  known bug unfixed because a *harder*, *related* problem also exists is not
  a reason to withhold the easy, certain fix.

## 5. Test Contract

1. `npm test`: 106/106 before and after, 0 regressions, 0 tests
   weakened/removed/modified.
2. `dream-machine verify-entrypoints` (real, no mocking) against the
   candidate `dream.config.json`: `bench: live`, `darwin: live`,
   `flywheel: live` — all three reproduced tonight (see gist).
3. `dream-machine verify-entrypoints` against the baseline `dream.config.json`
   (git-show'd from commit `2fba255`): reproduces the `--sandbox/`- or
   `--help/`-shaped garbage-directory side effect, confirming the defect
   predates tonight and is not an artifact of tonight's test harness.
4. Bounded Darwin run (`--sandbox mock`, `--generations 3 --children 4
   --seed 42`, repo arg = real worktree root): reproducibly
   `Delta over baseline: +0.000` across all evaluated variants — recorded as
   the honest result, not treated as a passing test of "no improvement
   needed."
5. No pre-existing evaluator entrypoint's classification changed for the
   worse: `bench` was `live` before and after; `darwin` was (incorrectly)
   `live` before and is (correctly) `live` after — no entrypoint newly
   reports `blocked`/`suspicious-silent` as a result of this change.

## 6. References

- ADR-0001 §2.3, §2.4.
- ADR-0002 (entrypoint liveness classification) — this ADR's classifier
  blind-spot observation directly extends it.
- `docs/dream-cycle/gists/2026-09-12-evaluation-adapters.md` — full receipts,
  evidence log, and witness stamp for tonight's session.
- Sakana AI RSI Lab; "Red Queen Gödel Machine: Co-Evolving Agents and Their
  Evaluators" (arXiv:2606.26294) — Grade B, WebSearch synthesis, cited for
  the general "evaluator is the blind spot" framing, not for any specific
  quantitative claim about this repo.
