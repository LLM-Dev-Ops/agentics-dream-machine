# Evaluation-Adapters / Darwin-Idempotency SOTA Report — 2026

## TL;DR

Tonight's SCAN=darwin probe reproduced, twice more (once via a raw hand-run,
once via `dream-machine verify-entrypoints`), the exact darwin non-idempotency
caveat PR #18 (2026-09-12, still unmerged) disclosed but did not fix: this
repo's real configured darwin entrypoint (`npx @metaharness/darwin evolve
--sandbox real`, unpatched on `main`) classifies `live` on a clean first run,
then writes unignored state to `./--sandbox/.metaharness/{variants,runs}/g1_v0`
and classifies `blocked` ("child id already exists: g1_v0") on the identical
second run. Candidate: `classifyIdempotency()` + an opt-in
`classifyConfiguredEntrypoints(..., { idempotencyCheck })` +
`verify-entrypoints --idempotency-check` CLI flag that re-runs each configured
command once more and flags a verdict flip as `NOT IDEMPOTENT`, plus a
`.gitignore` entry for the leftover `--sandbox/` directory. `npm test`
106→112 (+6 new tests), 0 regressions, lint/build clean. **The bigger finding
tonight is not this bug — it's that 12 consecutive dream-cycle nights
(2026-09-09 through 2026-09-21, PRs #12–#33) have produced 12 open draft PRs
and zero merges**, so this same evaluation-adapters surface has now been
independently probed three nights running (09-12, 09-17, 09-22) without any
of the three candidates reaching main.

## What's new

- Real repro tonight, on the actual unmodified `main` config: first
  `npx @metaharness/darwin evolve --sandbox real` → exit 0, live; identical
  second invocation → exit 1, `Error: darwin: autonomous or generated child
  id already exists: g1_v0`. Confirmed both as a raw shell command and
  through `dream-machine verify-entrypoints --idempotency-check`.
- Cross-checked against open PRs before building anything (STEP 2 — load
  accumulated evidence): `list_pull_requests`/`pull_request_read` on the real
  `LLM-Dev-Ops/agentics-dream-machine` shows **12 open draft dream-cycle PRs**
  (#12, #14, #16, #18, #20, #22, #24, #26, #28, #30, #31, #33), all draft,
  none merged, base `main` unchanged at `2fba255` since 2026-09-08. PR #18
  (2026-09-12, `evaluation-adapters`) already root-caused and fixed the
  `--sandbox`-directory symptom (darwin's `<repo>` positional arg was
  missing) and explicitly disclosed the idempotency caveat this candidate now
  detects, without fixing it. PR #26 (2026-09-17, `evaluation-adapters`)
  wired the STEP 5-9 compiled-prompt instruction to classify entrypoints
  before recording `EVALUATED=yes` — orthogonal, no overlap. Issue #32
  (2026-09-21, `ledger-signals`) already root-caused *why* `LEDGER.md` looks
  short (a contaminated 2026-08-22..08-26 block quarantined) — but does not,
  and could not by itself, explain why 12 *new*, *legitimate* nights of
  candidates have piled up unmerged since 09-08. That is a distinct,
  still-open problem this report surfaces again, explicitly, rather than
  re-solving.
- PR #18 also claimed ADR number `ADR-0003` on its own branch. Tonight's ADR
  is filed as `ADR-0004` to avoid a collision once branches converge — PR
  #26 independently made the same call on 2026-09-17 for the same reason.
  This numbering friction is itself a symptom of the merge backlog: three
  different nights have now had to reason about ADR numbers no one can
  actually confirm are final until a human reconciles the open PRs.

## Hypothesis (frozen before implementation)

> Given this repo's real, currently-unpatched `darwin` evaluator entrypoint
> (`npx @metaharness/darwin evolve --sandbox real`), when
> `classifyConfiguredEntrypoints` is extended with an opt-in
> `idempotencyCheck` that re-runs each configured command a second time and
> compares the two classifications via a new pure `classifyIdempotency()`
> function, then a stateful entrypoint whose verdict flips between the two
> runs (darwin: live → blocked) should be flagged `NOT IDEMPOTENT`, while a
> deterministic entrypoint (`bench: npm test`) should not — subject to: no
> pre-existing test weakened/removed/modified; default
> `classifyConfiguredEntrypoints` behavior (no `idempotencyCheck`) stays
> byte-identical, including exactly one `exec()` call per command; the new
> logic stays pure (no I/O, no clock, no randomness — only the existing
> exec/print boundary); and the candidate never modifies `dream.config.json`
> or any evaluation gold data.

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest), this repo's own `bench` entrypoint.

| | Baseline (parent, commit `2fba255`) | Candidate (working tree) |
|---|---|---|
| Test files | 7 | 7 |
| Tests | 106 | 112 (+6, 0 removed, 0 modified) |
| Result | 106 passed | 112 passed |
| Lint | clean | clean |
| Build (`tsc -p`, all 6 packages) | clean | clean |
| Typecheck (`tsc -b`/root fallback) | pre-existing failure (`tsconfig.json` empty `files` list) | identical failure, reproduced via `git stash` on baseline — unrelated to this candidate |

Diff: 2 implementation files (`entrypoint.ts` +50 lines, `index.ts` +12
lines incl. HELP text) + 2 test files (+62/+27 lines) + `.gitignore` (+4
lines) + 1 new ADR + INDEX row = one conceptual change (an opt-in idempotency
probe layered on ADR-0002's existing classifier), no pre-existing test
touched.

Live receipt — real subprocess execution, no mocking, against this repo's
actual unmodified `dream.config.json`:

```
$ npx --yes @metaharness/darwin evolve --sandbox real   # raw, run 1
note: --sandbox real (the default) scores variants by this repo's own test
command, which cannot distinguish between mutated harness surfaces — every
variant will score identically and evolution will not converge on anything
(see README "The evaluation substrate", ADR-099/102). Pass --sandbox mock ...
$ echo $?
0

$ npx --yes @metaharness/darwin evolve --sandbox real   # raw, run 2 (identical cmd)
[... same note ...]
Error: darwin: autonomous or generated child id already exists: g1_v0
    at evolve (.../@metaharness/darwin/dist/evolve.js:280:27)
$ echo $?
1

$ find -- "--sandbox" -maxdepth 4
--sandbox/.metaharness/variants/g1_v0
--sandbox/.metaharness/runs/g1_v0.json

$ node packages/cli/dist/bin.js verify-entrypoints --idempotency-check
bench: live (exit 0) — produced output
darwin: live (exit 0) — produced output
darwin: NOT IDEMPOTENT — first run classified 'live' (produced output), second
run classified 'blocked' (...Error: darwin: autonomous or generated child id
already exists: g1_v0...) — entrypoint is stateful/non-reproducible; do not
trust a single-shot 'live' verdict
$ echo $?
1
```

All classifications match ground truth verified by hand; the CLI's real
output matches the raw hand-run transcripts exactly.

## Darwin (bounded evolution)

`DARWIN=not-applicable`, consistent with the 2026-08-13/09-08/09-17 reports:
no evolvable population exists for a small, pure, exhaustively-branched
comparison function — bounded Darwin's generation×children search needs a
mutable candidate population this doesn't have. Separately, tonight's own
raw probe of the repo's real `darwin` entrypoint *is* the SCAN=darwin finding
above, not a bounded-evolution run of this candidate.

## Evidence

- OBSERVATION: raw `npx @metaharness/darwin evolve --sandbox real` run twice
  back-to-back on `main`'s real config → live, then blocked, with
  `--sandbox/.metaharness/{variants,runs}/g1_v0*` left on disk, not
  gitignored before tonight.
- OBSERVATION: PR #18's body already names this exact failure mode as a
  disclosed, unfixed caveat (`git`/`gh` cross-check via `pull_request_read`
  on the live repo, not reconstructed from memory).
- MEASUREMENT: `npm test` — 106/106 (baseline, `2fba255`) → 112/112
  (candidate), 0 regressions, 0 removed/modified tests.
- MEASUREMENT: `list_pull_requests` — 12 open draft dream-cycle PRs, 0 merged
  since 2026-09-08 (`zeroMergeStreak: true` confirmed via
  `dream-machine ledger signals`).
- INFERENCE: a single-shot exec result cannot distinguish "genuinely live"
  from "live exactly once, then permanently blocked by its own leftover
  state" — the same class of overclaim ADR-0002 closed for the
  live/suspicious-silent boundary, now closed for the live/idempotent
  boundary.
- DECISION: ship the idempotency check as **opt-in** (`idempotencyCheck`
  defaults to `false`), not wired into the default nightly control-plane
  probe — it doubles the real cost of any entrypoint it's applied to
  (another live `darwin --sandbox real` run), and STEP 1.1's
  `zeroMergeStreak: true` signal biases tonight toward the smallest,
  most-reviewable candidate rather than also touching
  `packages/compile`'s STEP 0.5 template.
- DECISION: do not re-implement or duplicate PR #18's `<repo>`-arg fix or
  PR #26's STEP 5-9 wiring tonight — both already exist, unmerged; this
  candidate is additive and independently reviewable from either.

## Reward-Hack Check

Self-critique (independent-critic framing, adversarial pass against this
candidate specifically): did it weaken a benchmark, alter gold answers,
cherry-pick, exploit the evaluator, hide cost, touch a threshold, or rely on
an undocumented cache?

**Verdict: CLEAR.** No benchmark weakened; no gold data touched (there is
none in this repo's test suite); no pre-existing test modified or removed
(106/106 unchanged, only 6 new tests added); default
`classifyConfiguredEntrypoints` behavior is unchanged and unit-tested to call
`exec` exactly once per command absent the new option, so this candidate adds
detection capability without silently changing existing nightly behavior; the
`darwin` live→blocked flip reported above is a real, twice-reproduced
transcript, not a synthesized example — the unit tests mirror it verbatim
rather than inventing a different scenario; the doubled-cost tradeoff (two
real subprocess invocations per idempotency-checked entrypoint) is disclosed
above, not hidden, which is exactly why it ships opt-in rather than default.
`io.exec`'s trust boundary is unchanged from ADR-0002/PR #8 — no new
command-injection surface, `cmd` strings still only ever originate from a
locally-authored, PR-reviewed `dream.config.json`.

**Non-blocking, logged for a future night:** the doubled cost could be
reduced by caching the first run's `ExecResult` when both a plain classify
and an idempotency check are requested in the same invocation — not built
tonight, current CLI wiring always re-invokes cleanly and there is no such
combined call site yet.

## Security Review

- **Tool/command-authority scope**: `io.exec` remains reachable only from a
  trusted local CLI invocation or a repo-committed, PR-reviewed
  `dream.config.json` — unchanged trust boundary from ADR-0002.
- **Filesystem scope**: this candidate does not delete or write to
  `--sandbox/`/`.metaharness/` itself — it only stops that leftover state
  from being *committed* (`.gitignore`). No new filesystem writes introduced.
- **Credential exposure**: none — `LLM_EVAL=blocked` tonight (no
  `OPENROUTER_API_KEY` configured), no model calls anywhere in this
  candidate's path.
- **Prompt injection / cross-agent poisoning**: N/A — no LLM calls, no
  runtime-attacker-controllable input; `dream.config.json` values are
  locally-authored and PR-reviewed.
- **Least privilege**: the new `idempotencyCheck` option defaults to `false`
  and is purely additive to the function signature and `ConfiguredEntrypointResult`
  shape — every existing call site, IO fake, and test is unaffected.
- **Unpinned `npx @metaharness/darwin` invocation** (flagged 2026-08-13,
  2026-09-08, 2026-09-12 — still open, still out of this candidate's scope):
  unchanged tonight; still worth a human decision, not repeated here beyond
  this pointer.

## Scan Findings

**flywheel** — `dream.config.json#evaluatorEntrypoints` does not configure a
`flywheel` key (only `bench` and `darwin`); PR #18 (still unmerged) already
proposes adding one (`npx metaharness flywheel help`, via the umbrella
`metaharness` package rather than the bin-less `@metaharness/flywheel`).
Nothing new to add on this axis tonight — flagged only to confirm the gap is
tracked, not rediscovered.

**darwin** — see TL;DR/What's new/Evaluation above: non-idempotency across
back-to-back runs of the real configured entrypoint, now detectable via
`verify-entrypoints --idempotency-check`, not yet wired into the default
nightly probe (see Reward-Hack Check / ADR-0004 Consequences for why).

## Competitors

| System | Idempotency/repeatability handling for tool-invocation trust | Grade |
|---|---|---|
| GitHub Actions / reusable workflows | Documents "idempotent" as a best-practice expectation for custom actions but ships no automated re-run-and-compare verifier for third-party action liveness | B (official docs, fetched directly) |
| Terraform / OpenTofu | `plan`-then-`apply` convergence checking is the closest prior art for "run twice, verify the second run reports no drift" as a trust signal — a different domain (infra state) but the identical structural idea | A (official docs, well-established pattern) |
| pytest-rerunfailures | Re-runs *failed* tests to distinguish flaky failures from real ones — the mirror image of tonight's check (re-run a *passing/live* result to distinguish genuinely-live from live-once) | B (plugin docs, fetched directly) |
| OpenHands | Documented "Stuck Detector" watches the event stream for lack of progress — a behavioral stall detector, not a re-run-based tool-liveness idempotency check | B (official docs, as in 2026-08-13/09-08 reports) |
| SWE-agent / DSPy-GEPA | No documented re-run-based entrypoint idempotency verification found in either project's public docs | C (absence confirmed against official docs) |

## Gist

No `gh gist create`-equivalent tool available to this session (GitHub access
is via MCP tools scoped to issues/PRs/branches on
`LLM-Dev-Ops/agentics-dream-machine`; no gist-creation tool present) — same
as every prior night. Published as a local artifact
(`/tmp/dream-gist-2026-09-22.md`, committed into the PR as this file,
`docs/dream-cycle/2026-09-22-evaluation-adapters-report.md`). `GIST=LOCAL`.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so — per
the convention every prior report has followed — the stamp cannot be written
*inside* the file it stamps. This section is filled in immediately before
the file is committed, over content identical up to this point. Anyone can
independently reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-09-22-evaluation-adapters-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo `main` HEAD
at the start of tonight's session). REPORT_HASH and WITNESS are published in
the PR body and the `LEDGER.md` row, both pointing back at this file by path
and session commit.

## Recommendation

Human review of the draft PR. Concrete next steps, not done tonight:

1. **Triage the 12-open-draft-PR backlog (#12–#33).** This is the single
   most valuable action available: none of these have merged since
   2026-09-08, several are small and independently reviewable
   (`zeroMergeStreak: true` for 7+ consecutive nights per
   `dream-machine ledger signals`), and every additional night compounds the
   reconciliation cost (ADR numbering collisions, potential duplicate/
   overlapping candidates on the same surface — tonight makes 3 consecutive
   evaluation-adapters nights: #17/#18, #25/#26, and this one).
2. **Decide PR #18's fate specifically** — it fixes the root cause (missing
   `<repo>` arg) this report's `--sandbox/`-named directory is a symptom of;
   once merged, this candidate's `.gitignore` entry becomes redundant with
   PR #18's own `.metaharness/` entry (both are harmless to keep together,
   but a human should reconcile which is authoritative).
3. **Consider wiring `--idempotency-check` into STEP 0.5 control-plane
   discovery by default**, once a few more nights of receipts exist to judge
   whether doubling `darwin`'s real-sandbox cost every night is worth it —
   deliberately not decided unilaterally tonight (see ADR-0004 Alternatives
   Considered).
4. `LEDGER.md` rows 2-6 quarantine (issue #32/PR #33, 2026-09-21) is itself
   still unmerged — the durable-memory problem it fixes is not yet actually
   fixed on `main`.
