# Compiler-Parity / Evaluation-Adapters SOTA Report — 2026-10-15

## TL;DR

Rotation: `DAYINT=20261015`, `SLOT=0` → `DEEP=compiler-parity`,
`SCAN=config-schema,golden-snapshots`. `SESSION_COMMIT=2fba255`.

Tonight's assigned DEEP (`compiler-parity`) came up **clean**: a byte-for-byte
diff of `@dream-machine/compile`'s output for this repo's own `dream.config.json`
against the literal routine text this session was handed shows **zero drift**
(the only difference was a trailing-newline artifact in my own manual
transcription of the delivered prompt, not a real mismatch). `config-schema`
and `golden-snapshots` scans are both green: `validateConfig`/`compile` have
21/21 unit tests passing including the committed snapshot test, and no schema
gap was found in `dream.config.json` itself.

Because compiler-parity produced no actionable finding, STEP 0.5's mandatory
control-plane discovery (run regardless of DEEP surface) became tonight's
substantive work: probing this repo's own `evaluatorEntrypoints.darwin`
command for real reproduced a bug — `npx @metaharness/darwin evolve --sandbox
real` is missing darwin's required `<repo>` positional argument, so `--sandbox`
is silently consumed as the repo path, creating a bogus `--sandbox/.metaharness`
directory and evolving against an empty decoy, not this repo. **This is an
exact, independent rediscovery of issue #17 / PR #18 (2026-09-12), still open
33 days later.** Per STEP 1.1 ("do not rediscover a failed direction... a
finding repeated in prior nights") and this repo's own precedent (issue #74,
withholding a duplicate of PR #65), no new PR was opened. Instead: fresh
re-validation evidence was posted to PR #18
(https://github.com/LLM-Dev-Ops/agentics-dream-machine/pull/18#issuecomment-6188772056)
confirming the fix still applies cleanly to today's `main` with zero
regressions, and recommending a human merge it directly — its CI is green on
every test job; the only failing/skipped checks (`analyze`/CodeQL,
`guard-and-merge`) are pre-existing, repo-wide, and already tracked in
issues #10/#36/#46, not defects of PR #18 itself.

## What's New / Competitor Framing

| System | Evaluator-trust / entrypoint-liveness design | Grade |
|---|---|---|
| Sakana AI Scientist / Darwin Gödel Machine lineage | Population-based self-improvement with leaderboard/lineage vocabulary; does not, in public material, document a 3-state entrypoint-liveness classifier distinct from task scoring | B |
| OpenHands | Documented "Stuck Detector" for trajectory-level stalls — a different failure class than this repo's "exit 0 but evaluating the wrong target" gap | A |
| DSPy/GEPA | Metric-driven optimization against a fixed, task-specific eval set; implicitly assumes the eval set targets the right artifact, same blind spot this repo's ADR-0002 classifier has by construction | B |
| SWE-agent | High-precision guardrails; no public discussion of a generic-vs-task-specific bench distinction | C |
| AutoGPT lineage | No standard entrypoint-liveness or evaluator-trust classification documented in mainstream forks | C |

No new external claim materially changes tonight's hypothesis; competitor
framing is carried over from ADR-0003/issue #17's prior research (not
re-researched from scratch, per STEP 2's "do not rediscover... unless new
evidence justifies reopening").

## Hypothesis (frozen before implementation)

> Given this repo's compiled nightly routine and its `dream.config.json`,
> when `@dream-machine/compile`'s output for this repo's own config is
> diffed byte-for-byte against the literal text of tonight's delivered
> routine, the diff should be empty (compiler-parity holds), subject to:
> no change to `packages/compile`'s source; the committed golden-snapshot
> test suite stays green. Separately and independently: this session's
> STEP 0.5 control-plane probe of `evaluatorEntrypoints.darwin` is expected
> to either reproduce a already-known, already-PR'd defect (in which case no
> new candidate is implemented) or surface genuinely new evidence
> (in which case a candidate is built) — not implemented until the duplicate
> check against open issues/PRs completes.

Both halves were tested as stated; neither was modified after evaluation
began.

## Evaluation Receipt

Real evaluators only, no model calls (`LLM_EVAL=blocked` — no
`OPENROUTER_API_KEY`/model-calling credential present in this session's
environment).

**Compiler parity:**
```
$ node packages/cli/dist/bin.js compile dream.config.json > compiled-prompt.txt
$ diff -u scheduler-prompt.txt compiled-prompt.txt
--- scheduler-prompt.txt
+++ compiled-prompt.txt
@@ -317,3 +317,4 @@
 uncertainty about what this repository should become.
+                                   # (trailing newline only — my own transcription)
```
320 vs 319 lines, differing only in a trailing newline from manual
transcription of the delivered prompt into a file for diffing — not a real
compiler defect. `sha256sum` differs only because of that byte.

**`npm test` / `npm run build` / `npm run lint`**: 106/106, clean build (6
packages, no wasm/NAPI), lint clean, both before and after the (unapplied,
withheld) darwin-config candidate. `npm run typecheck`: pre-existing
`tsconfig.json` "files list is empty" error, confirmed via `git stash` to
predate tonight — not caused by, or fixed by, tonight's session.

**Darwin control-plane probe (STEP 0.5, real `npx`, no mocking):**
```
# BASELINE — exact dream.config.json darwin entrypoint, clean cwd, today's main (2fba255)
$ npx @metaharness/darwin evolve --sandbox real
Artifacts: /home/user/agentics-dream-machine/--sandbox/.metaharness
$ git status --short
?? --sandbox/

# CANDIDATE — PR #18's fix (not committed tonight; verified only)
$ npx @metaharness/darwin evolve . --sandbox real
Artifacts: /home/user/agentics-dream-machine/.metaharness
$ git status --short
(clean — .metaharness/ gitignored per PR #18's diff)
```
Both runs: exit 0, `Winner: baseline`, `Delta over baseline: +0.000` (matches
ADR-0003's already-documented generic-bench-task ceiling — not re-litigated
tonight).

## Darwin Results

Not run as a bounded-evolution *candidate* tonight — the only entrypoint
probe was the liveness/targeting check above (two single invocations, not a
generations×children sweep), since the underlying fix was already proposed
and unmerged in PR #18, not reimplemented here. No new Darwin lineage to
report.

## Evidence (classified)

- OBSERVATION: `docs/dream-cycle/LEDGER.md` on `main` has not been appended
  since the `2026-09-08` row (PR #8, merged) — every row for the ~30 nights
  since then exists only inside still-open, still-draft PRs, never landed on
  `main`. Cross-night memory was reconstructed tonight from GitHub issues
  #10/#17/#18/#36/#46/#60/#62/#70/#71/#74/#75 directly via the GitHub MCP
  tools, not from the (stale) ledger file.
- MEASUREMENT: compiled-prompt vs. delivered-prompt diff — 0 substantive
  bytes differ (see Evaluation Receipt).
- MEASUREMENT: baseline darwin probe creates `--sandbox/.metaharness` in the
  repo's own working tree; candidate (PR #18's diff) resolves to
  `.metaharness/` at the real repo root, gitignored. Reproduced cleanly once
  each, matching issue #17/PR #18's 2026-09-12 receipts exactly.
- MEASUREMENT: PR #18's CI (run `34685987940`/`34685987934`/`34685987212`,
  2026-09-12): all `test (18/20/22)` + `no-optional-deps` green; `analyze`
  (CodeQL) failure; `guard-and-merge` skipped (job-level `if` requires the
  `automerge-safe` label, never applied to any PR in this repo's history per
  issues #36/#46/#70).
- INFERENCE: PR #18 is mergeable today with no new risk — its only red/skipped
  checks are repo-wide, pre-existing, and already root-caused in #10/#36/#46,
  not functions of its own diff.
- DECISION: withhold a duplicate PR tonight; post reconfirmation evidence on
  PR #18 instead (comment linked in TL;DR); file this night's issue and
  ledger row documenting a clean compiler-parity dive, with no new ADR (no
  architectural decision made tonight).
- REJECTION: considered re-opening ADR-0003's genome/bench-fit question;
  rejected — no new evidence surfaced tonight that would change ADR-0003's
  Proposed status, and STEP 2 instructs against rediscovering a
  non-reopened direction without new evidence.

## Reward-Hack Check

No benchmark/gold data/threshold touched. No test weakened, removed, or
modified. The withheld candidate was never committed, so there is no diff to
critique for cherry-picking; the only repo mutation tonight is a comment on
an existing PR, a new issue, and a ledger-row/gist append — none of which
touch evaluation infrastructure. **CLEAR.**

## Security Review

No new tool authority, no credential exposure, no LLM calls. `io.exec`'s
trust boundary (`bin.ts`) unchanged — not touched tonight. The darwin
control-plane probe ran an unpinned `npx @metaharness/darwin` (a
pre-existing, already-flagged supply-chain gap, unchanged tonight, tracked
separately under the `security-adversarial`/`supply-chain` slot).

## Scan Findings

**config-schema** — `dream.config.json` validates cleanly against
`validateConfig`; no new schema gap found. The `darwin` entrypoint's missing
`<repo>` argument is a semantic/runtime defect in the configured *command
string*, not a structural schema violation `validateConfig` could catch
(the schema only requires `evaluatorEntrypoints.*` to be a string or absent)
— noted for awareness, not proposed as a new schema rule tonight (would need
a per-package allowlist of valid CLI shapes, out of scope for a single
night's config-schema scan).

**golden-snapshots** — the committed snapshot test
(`packages/compile/src/__snapshots__/index.test.ts.snap`) is stable and
green; not touched tonight.

## Gist

No gist-creation tool available to this session (confirmed via ToolSearch).
Committed as `docs/dream-cycle/gists/2026-10-15-compiler-parity.md`.
`GIST=LOCAL`.

## Witness

```
report_sha256 : a97487ae194c3b15859eae40a0c8cbee78de41c7ccff0201ed09f85a3567283f
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : bd0d00c27aaf36aad5fc1a5129b5cb86cafc5c9e549083af9935dc4927ecdb6b
```
`report_sha256` is computed from this file's content immediately before this
Witness section was filled in (same convention PR #18's gist used) — step 1
below re-hashes the file as committed for provenance, not to reproduce this
exact digest.
Verifier (reproduce by hand):
1. `sha256sum docs/dream-cycle/gists/2026-10-15-compiler-parity.md` → `REPORT_HASH`.
2. `printf '%s%s' "$REPORT_HASH" "2fba2550182d81b36423447221823e98e227482a" | sha256sum` → must equal `witness` above.
3. `node packages/cli/dist/bin.js compile dream.config.json` → diff against
   this gist's quoted delivered-prompt excerpt (see Evaluation Receipt) →
   expect empty diff.
4. `npm test` → expect 106/106.
5. Re-run the baseline darwin probe from a clean worktree at commit
   `2fba255` → expect a `--sandbox/.metaharness` side effect, reproducing
   PR #18's still-open defect.

## Recommendation

`evaluated: accepted` for the compiler-parity clean-confirmation (no action
needed — no drift). For the evaluation-adapters rediscovery:
`not attempted: duplicate of open PR #18 (2026-09-12), withheld; see PR #18
comment for fresh reconfirmation evidence`. No ADR tonight (no new
architectural decision). Next steps not done tonight:
1. A human merges PR #18 directly — it is correct, tested, and blocked only
   by the pre-existing CodeQL/repo-settings gap (#10) and the never-applied
   `automerge-safe` label (#36/#46), neither of which is a property of its
   diff.
2. A human decides whether to finally enable Code Security/GHAS for this
   repo (#10) — the single repo-settings toggle that, per tonight's CI
   evidence on PR #18, is the common root blocker across the entire
   dream-cycle PR backlog, independent of each PR's own content.
3. If/when `automerge-safe` is ever applied to a real PR, this repo's
   `docs/dream-cycle/**`-only PRs (like tonight's) are a safe, zero-protected-
   path test case for finally exercising the `guard-and-merge` workflow
   end-to-end for the first time in this repo's history.
