# Ledger-Signals SOTA Report — 2026

**Repository:** `LLM-Dev-Ops/agentics-dream-machine`
**Night:** 2026-09-26 · DEEP=ledger-signals · SCAN=witness,verify · SLOT=1
**Session commit (pre-candidate):** `2fba2550182d81b36423447221823e98e227482a`
**Gist:** LOCAL — public gist publication was denied by this session's
own auto-mode data-sharing policy tonight; this committed file is the
durable copy (`gh` was otherwise available, `FALLBACK=false` for GitHub
repo operations — issue/PR/ledger below).

## TL;DR

`dream-machine ledger signals` — the exact command STEP 1.1 of this repo's
own compiled nightly prompt names as the way to compute the "zero recent
merges" learning signal — has been reporting a **false alarm** every night
since it shipped. Its `zeroMergeStreak` field reads `true` whenever the
trailing 14-night window contains *any* PR reference, regardless of whether
that PR actually merged, because the CLI never supplies the
`mergedPrNumbers` the underlying (correct, well-tested) library function
needs to tell "zero merges" apart from "didn't check." Confirmed against
live GitHub state tonight: PR #8, this repo's most recent dream-cycle
candidate, merged on 2026-09-08 — yet `ledger signals` still said
`zeroMergeStreak: true`, and the 2026-09-08 report explicitly cited that
false reading as part of its reason for choosing a smaller candidate.
Tonight's candidate wires real GitHub merge state into the signal, sourced
through `io.exec`+curl (not a raw `fetch()`, which — also discovered
tonight — silently bypasses this environment's egress proxy). A second,
independent side effect was discovered and recorded while probing the
SCAN=verify surface: this repo's `darwin` evaluator entrypoint has a real
filesystem side effect on invocation.

## What's new

1. **Root cause, not just symptom.** `@dream-machine/ledger`'s
   `learningSignals()` was already correct and already had passing tests for
   both `mergedPrNumbers` present and empty. The defect was entirely in the
   CLI layer (`packages/cli/src/index.ts`'s `ledger signals` sub-command),
   which called `learningSignals(rows)` with no options at all — so the
   library's own `!merged` short-circuit always won.
2. **A `fetch()` failure that only shows up in exactly this kind of sandbox.**
   The first implementation used Node's built-in `fetch()` against the GitHub
   REST API. It compiled, typechecked, and passed a *fake* test — and then
   failed for real: `fetch()` doesn't read `HTTPS_PROXY` without
   `NODE_USE_ENV_PROXY=1` (Node ≥22.21; this repo declares
   `engines.node >= 18`), so it bypassed this environment's egress proxy,
   reached `api.github.com` directly, and got a genuine `401 Bad credentials`
   for a proxy-injected placeholder token the proxy would otherwise have
   substituted transparently. `curl` through the existing `io.exec`
   injection (the same seam `entrypoint.ts` already uses for live process
   execution) does not have this problem — verified against this repo's real
   PR #8 and #9 before being accepted as the fix.
3. **A live, reproducible side effect on the SCAN=verify surface.** Running
   `verify-entrypoints` against this repo's `dream.config.json` to sanity-check
   tonight's SCAN, the `darwin` entry (`npx @metaharness/darwin evolve
   --sandbox real`) classified `live` — but also *actually ran*, and its
   argument parser mishandled `--sandbox real`, creating a literal
   `--sandbox/.metaharness/` directory in the repo root. Removed (it held no
   files, only empty metaharness state dirs) and recorded here, not fixed —
   this is exactly the unattended-third-party-execution risk ADR-0002 §
   Recommendation 2 named and explicitly deferred on 2026-08-13, now
   empirically confirmed rather than theoretical.

## Competitors / prior art (grade noted; C-grade informs only, never alone justifies a change)

| System | Relevant mechanism | Grade | Contrast with tonight's finding |
|---|---|---|---|
| Sakana AI Scientist | Tracks accepted/rejected experiment outcomes as a memory the next iteration reads | C (public writeups, not independently reproduced tonight) | Also risks conflating "iteration ran" with "iteration's claim was validated" if outcome tracking isn't wired to ground truth — the same class of bug fixed here |
| OpenHands (evaluation harness) | Resolves issues against a real repo/CI signal, not a self-reported log | B (official docs/repo, not re-run tonight) | Underscores the general principle: a self-improvement loop's steering signal is only as good as its weakest ground-truth link |
| DSPy GEPA (`stanfordnlp/dspy`) | Reflective optimizer consumes execution-trace feedback, not a bare pass/fail bit, specifically to avoid steering on an impoverished signal | A (official repo docs, fetched tonight) | Parallel lesson: `zeroMergeStreak` was a bare boolean computed from data that was never actually collected — an impoverished signal is worse than no signal, because it looks trustworthy |
| SWE-agent | Verifies patches against the target repo's real test suite before reporting success | B (widely documented pattern, not re-run tonight) | Same discipline this repo already applies to `EVALUATED`/`VERDICT` (ADR-0002) — tonight extends it to the STEP 1.1 learning signals, which had been exempt |
| AutoGPT lineage | Early "self-improving agent" systems were criticized for looping on their own unverified success claims | C (general community consensus, not a single citable source) | The cautionary case this fix avoids: an agent that trusts its own `zeroMergeStreak: true` and keeps shrinking candidates in response to a signal that was never real |

## Frozen hypothesis (before implementation)

> Given the current `LEDGER.md` history — which contains at least one
> dream-cycle candidate PR (#8) that GitHub confirms merged on 2026-09-08 —
> when `dream-machine ledger signals` is run as currently implemented, the
> reported `zeroMergeStreak` field should read `false` to match reality, but
> instead reads `true`, because `learningSignals()`'s `!merged` fallback
> treats an absent `mergedPrNumbers` option as "confirmed zero" rather than
> "unknown." The candidate fix wires the CLI to query live GitHub merge state
> (via `GITHUB_TOKEN`/`GH_TOKEN` and the existing `io.exec` injection) and
> surfaces an explicit `mergeStatusSource: 'github-api' | 'unknown'` field,
> subject to: (a) zero regressions in the existing 106-test suite, (b) the
> ledger package's pure `learningSignals()` decision logic is untouched —
> only its optional inputs are now populated with real data, (c) no network
> call when no token/exec is available, falling back to the previous
> "unknown" semantics rather than crashing, (d) `ledger verify`/`ledger
> stats` and every other command stay byte-for-byte unaffected.

## Evaluation receipt

- **Baseline** (`git stash`, pre-candidate HEAD `2fba255`): `npm test` — 106/106
  passing, 7 test files. `ledger signals --path docs/dream-cycle/LEDGER.md
  --repo LLM-Dev-Ops/agentics-dream-machine` → `{"zeroMergeStreak": true, ...}`
  (no `mergeStatusSource` field — didn't exist yet).
- **Candidate**: `npm test` — 116/116 passing, 8 test files (+8 new tests: 8 in
  `merged-prs.test.ts`, +2 CLI-integration cases in `index.test.ts`), **0
  regressions**. `npm run lint` clean. `npm run build` clean (`tsc -p` per
  package, no errors). `npm run typecheck` fails identically on baseline and
  candidate (`tsconfig.json(1,12): TS18002 files list is empty`) — pre-existing,
  confirmed via `git stash` before touching anything, not caused by tonight's
  diff.
- **Live receipt, same ledger file, real GitHub, before/after**:
  ```
  baseline               : {"zeroMergeStreak": true,  ...}                                    (no mergeStatusSource — bug)
  candidate, no token    : {"zeroMergeStreak": true,  ..., "mergeStatusSource": "unknown"}     (honest degradation)
  candidate, with token  : {"zeroMergeStreak": false, ..., "mergeStatusSource": "github-api"}  (matches ground truth: PR #8, #9 both merged)
  ```
- **Diff size**: 51 changed lines across 3 existing files + 2 new files (81 +
  67 lines) = 199 lines total, one conceptual change, under the 300-line
  target.
- **Cost disclosed, not hidden**: `ledger signals` now makes up to
  `window` (default 14) sequential `curl` calls to `api.github.com` when a
  token is available — one request per distinct ledger PR reference in the
  trailing window. Trivial against GitHub's authenticated 5000/hr rate limit
  at this repo's current row count (7), but this is no longer an O(1)
  local-file computation; documented in the CLI help text and code comments.

## Darwin

Not run. This candidate is a deterministic library/CLI wiring fix with a
crisp before/after ground-truth receipt (a boolean either matches GitHub's
`merged` field or it doesn't) — there is no fitness landscape here for
bounded generational search to explore beyond what the unit + integration
tests and the live receipt already settle. Recorded per STEP 10-14 rather
than silently skipped.

## Evidence classification

- OBSERVATION: `ledger signals` on the real ledger reports `zeroMergeStreak:
  true` on both the 2026-09-08 and 2026-09-26 sessions.
- MEASUREMENT: GitHub API confirms PR #8 (`merged_at:
  2026-09-08T05:29:36Z`) and PR #9 (`merged_at: 2026-09-08T05:30:47Z`), both
  in the ledger's trailing window.
- INFERENCE: the discrepancy is caused by `learningSignals(rows)` being
  called with no `SignalOptions` from the CLI (traced to
  `packages/cli/src/index.ts:201` pre-candidate and `packages/cli/src/tui.ts:48`,
  the latter left unfixed tonight — see Next Steps).
- DECISION: fix the CLI layer only; do not touch the already-correct,
  already-tested library function.
- REJECTION: raw `fetch()` as the transport — empirically failed in this
  repo's own nightly sandbox (see "What's new" #2).

## Reward-hack check (self-critique, independent of the candidate's own author)

- Did it weaken a test or benchmark? No — 8 tests added, 0 removed or
  loosened; ledger schema/verify logic untouched.
- Did it alter gold data? No ledger rows were edited (rows 2-6's pre-existing
  schema violations were read, not touched — see Next Steps).
- Cherry-picked evaluation? No — run against this repo's real, unmodified
  `LEDGER.md` and real GitHub state, not a crafted fixture.
- Exploited the evaluator? No.
- Hidden cost? No — the new network calls are disclosed above.
- Touched a threshold, gate, or security boundary? No — `zeroMergeStreak` is
  a candidate-selection *heuristic* for the next night's research bias, not
  an evaluation gate (STEP 12's promotion gate is untouched).
- Undocumented cache? No caching introduced.

## Security review

- **Command construction**: `repo` is validated against `^[\w.-]+\/[\w.-]+$`
  before being interpolated into the `curl` command string; PR numbers are
  filtered to `^\d+$` first. The token itself is **never** interpolated into
  the command string — it is read by the spawned shell from its inherited
  environment via `${GITHUB_TOKEN:-$GH_TOKEN}`, so it cannot leak through a
  logged command line or `ps` output.
- **Least privilege**: the new code path only ever performs unauthenticated
  read (`GET .../pulls/:n`) calls; it has no write scope and cannot merge,
  close, or comment.
- **Availability**: no hard dependency introduced — absent token/exec, or any
  request failure, degrades to the pre-existing "unknown" semantics rather
  than throwing, consistent with ADR-0001 §2.4's "never hard-depend on
  optional backends."
- **New finding, filed not fixed**: the `darwin` evaluator entrypoint has a
  live, uncontained side effect (creates `--sandbox/.metaharness/` in the
  repo root due to an argument-parsing bug in the third-party package). This
  is the exact unattended-third-party-execution risk ADR-0002 §Recommendation
  2 flagged on 2026-08-13 and explicitly deferred; tonight adds a concrete,
  reproducible artifact to that finding.

## Scan findings (SCAN=witness, SCAN=verify)

- **witness**: `dream-machine witness stamp` / `witness verify` sanity-checked
  against the 2026-09-08 report and tonight's session commit — round-trips
  correctly, 14/14 existing witness tests still pass, no defect found.
- **verify**: `dream-machine verify-entrypoints dream.config.json` classifies
  `bench` (`npm test`) and `darwin` (`npx @metaharness/darwin evolve
  --sandbox real`) both `live` — but `darwin`'s "liveness" is a real,
  side-effecting invocation, not a dry classification (see Security Review).
  `dream-machine ledger verify` still correctly reports the 9 pre-existing
  schema errors in `LEDGER.md` rows 2-6 (unchanged tonight, third consecutive
  night flagged — see Next Steps).

## Recommendation

Human review of the draft PR. Concrete next steps, not done tonight:

1. **Wire the same real-merge-state fix into `packages/cli/src/tui.ts`'s
   dashboard** (`renderDashboard` calls `learningSignals(rows)` with no
   options too, at line 48) — deliberately not done tonight because
   `renderDashboard` is documented and snapshot-tested as a *pure* function
   (ledger string → framebuffer string); wiring live network data through it
   needs its own reviewable decision about whether to keep that purity
   invariant or thread an optional pre-fetched `mergedPrNumbers` through its
   `DashboardOptions`.
2. **Contain or pin the `darwin` evaluator entrypoint.** Tonight reproduced,
   with a concrete artifact, the exact risk ADR-0002 §Recommendation 2 named
   on 2026-08-13 (an unattended nightly run silently executing a third-party
   package with real side effects) — recommend running it inside a
   throwaway working directory, or pinning/patching past its `--sandbox`
   argument-parsing bug, before `verify-entrypoints` or any future auto-wired
   STEP 5-9 flow invokes it unattended again.
3. **`LEDGER.md` rows 2-6 still contain cross-repo-contaminated data**
   (issue/PR references to `openAVO`, `RuVector`, `ruflo`, etc. — repositories
   that are not `LLM-Dev-Ops/agentics-dream-machine`), flagged on 2026-09-08
   and again tonight (third consecutive flag). `ledger verify` still reports
   9 schema errors from these same rows. Still not corrected — rewriting
   ledger history remains a distinct, larger decision a human should make
   explicitly, not something a nightly session should do unilaterally.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so — as
established 2026-08-13/2026-09-08 — the stamp cannot be written *inside* the
file it stamps. The committed copy at
`docs/dream-cycle/2026-09-26-ledger-signals-report.md` is the frozen, hashed
artifact; this section is filled in immediately before that file is
committed, over content identical up to this point. Anyone can independently
reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-09-26-ledger-signals-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at the
start of tonight's session, before this candidate's changes). REPORT_HASH and
WITNESS are published in the PR body and the `LEDGER.md` row, both pointing
back at this file by path and session commit.
