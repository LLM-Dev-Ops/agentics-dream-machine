# Security-Adversarial / Supply-Chain SOTA Report — 2026-11-13

## TL;DR

Tonight's rotation (SLOT=3, DAYINT%5=3) assigned DEEP=security-adversarial,
SCAN=redblue,supply-chain. Independent research (no prior-night context read
before building) identified a real, live supply-chain gap: `dream.config.json`'s
`evaluatorEntrypoints.darwin` is `npx @metaharness/darwin evolve --sandbox
real` — unpinned, no `--no-install` guard. `@metaharness/darwin` is confirmed
real and actively published (9 releases in ~2.5 months, latest 3 days before
tonight, single maintainer `ruvnet`). A full candidate was built: a pure
static `auditEntrypointPinning`/`auditConfiguredEntrypoints` classifier in
`packages/cli/src/entrypoint.ts`, wired into `verify-entrypoints` as a
non-blocking WARNING, plus the `dream.config.json` pin itself. It passed its
own bar — 117/117 tests (+11, 0 regressions), lint/build clean — and survived
an independent adversarial critique that caught and required fixing one real
bug (dist-tags like `@latest` were wrongly accepted as pins).

**Then the finding changed shape.** A GitHub check this session performed
*before* finalizing (list_issues/list_pull_requests, not done early enough in
most prior nights per this repo's own history) surfaced that this exact
candidate already exists, twice, more completely, unmerged: PR #20
(2026-09-13, a standalone `supplychain.ts` pin classifier — functionally a
superset of tonight's `auditEntrypointPinning`, since it also handles
git/URL specs via `#ref` and a `MUTABLE_DIST_TAGS` set, which tonight's
first draft did not) and PR #63 (2026-10-08, the literal `dream.config.json`
pin). Both were closed unmerged on 2026-11-12 — **yesterday** — "superseded"
into the still-open integration PR #18, which *does* contain both fixes at
its current head. Shipping a third parallel implementation would deepen,
not reduce, this repo's documented backlog problem (issue #104: "51-day
zero-merge backlog reconfirmed"; 61+ open dream-cycle issues as of tonight).

**VERDICT: REJECT** (tonight's candidate, for merge/promotion) —
not for a defect, but for duplication of equivalent-or-better unmerged work.
**No new code PR opened tonight.** This report, the ledger row, and the
PR-body/head-SHA integrity finding below are tonight's actual deliverable,
following this repo's own 2026-10-15 precedent (issue #76: "darwin-arg
duplicate of #18 withheld (docs/ledger only)").

## What's new

- `@metaharness/darwin` versions on the real npm registry run `0.7.1` →
  `0.14.0`, with `0.10.1`–`0.14.0` published between 2026-09-01 and
  2026-11-10 (9 releases, ~2.5 months), maintained solely by `ruvnet
  <ruv@ruv.net>` — the same author/org as this repo's own upstream
  (`https://github.com/ruvnet/dream-machine`). This is the first night to
  confirm via `npm view` (not just prose) that the package is real, live,
  and under active, single-maintainer control — the concrete shape of the
  supply-chain risk repeatedly flagged since 2026-08-13.
- `npm audit --json` on a fresh `npm ci` tonight: **21 advisories (2 low, 12
  moderate, 4 high, 3 critical)**, 100% confined to
  `eslint`/`vitest`/`@vitest/coverage-v8`/`vite`/`esbuild`/`tinypool`
  devDependencies (`prod: 13`, all internal `@dream-machine/*` workspace
  packages; `dev: 269`). This count has grown monotonically across nights
  this session is aware of (8 → 21), consistent with issue #114's own title
  ("npm-audit-fix decay under review latency (PR #73 '7' is now 20)") —
  reconfirming that pattern, not discovering it.
- **PR #18 integrity finding (new tonight):** PR #18's own description
  states "exact remote head `f296e5034541f6e603bcd468e8406fdd6392852d`" with
  specific quantitative claims (132/132 tests, two hosted CI run IDs,
  MetaHarness/Darwin/Flywheel scores) attached to that commit. The PR API's
  actual `head.sha` is `ed97cb897029f82223d76ebe8fcac6979f67a55f` — a
  *different*, newer commit. `list_commits` on the branch confirms
  `f296e50…` (2026-11-12T17:14:19Z) has four more commits stacked after it,
  ending at `ed97cb89…` (2026-11-13T00:06:13Z, "integrate PR #87 compiler
  output parity"). The PR body's "2026-11-12 integration update" section is
  therefore **stale relative to the PR's own current head** — its specific
  test-count/CI-run claims are not verifiably about the code a reviewer
  would actually be merging. This is exactly the `witness-every-quantitative-
  claim` discipline this repo's own `dream.config.json#extraDisciplines`
  names, found to be violated in the repo's highest-profile open PR.
- Confirmed by reading the actual file content at the real current head
  (`ed97cb89…`, via `get_file_contents`, not trusting the PR body prose):
  `dream.config.json#evaluatorEntrypoints` there is `{"bench": "npm test",
  "darwin": "npx --yes @metaharness/darwin@0.10.3 evolve . --sandbox real",
  "flywheel": "npx --yes metaharness@0.4.2 flywheel help"}` — the darwin pin
  (PR #63's fix) is genuinely present. `packages/cli/src/supplychain.ts` is
  genuinely present (PR #20's fix) and is more complete than tonight's first
  draft (see Evidence). One difference worth a human's attention: PR #18
  uses `--yes` (auto-confirm install) where PR #63's own original candidate
  and tonight's rejected candidate both used `--no-install` (never install).
  `--yes` + a pin is a defensible, different tradeoff (always resolves the
  *pinned* version, accepting the install cost) but is NOT the same safety
  property as `--no-install` (never silently installs at all) — not raised
  as a defect, since no prior report compared the two guards explicitly.
- `docs/dream-cycle/LEDGER.md` on `main` has 9 rows, last dated 2026-09-08.
  Real GitHub issue numbers run to at least #130 (2026-11-12). The ledger —
  this repo's stated "durable memory across nights" — has been stale for
  **~66 calendar nights**. This is a re-confirmation, at a new severity, of
  the exact pattern issues #108/#120 already named ("ledger append accepts
  schema-invalid rows"); not fixed tonight (out of scope: this is the
  `ledger-signals` surface's job, not `security-adversarial`'s, and rewriting
  ledger history was explicitly declined by the 2026-09-08 report for the
  same reason). Flagged again here because it directly explains why STEP 1's
  "last 14 rows" check was nearly meaningless tonight — the real cross-night
  state lives in GitHub issues/PRs, not in this file.

## Hypothesis (frozen before implementation, superseded by the duplication finding — preserved verbatim for the record)

> Given this repo's own `dream.config.json#evaluatorEntrypoints.darwin` entry
> (`npx @metaharness/darwin evolve --sandbox real` — an unpinned invocation of
> an actively-published, single-maintainer third-party npm package), when a
> new pure static audit function (`auditEntrypointPinning`/
> `auditConfiguredEntrypoints`, `packages/cli/src/entrypoint.ts`) is added
> that flags any configured `npx <pkg>` entrypoint command lacking both an
> exact version pin and a `--no-install` guard, wired into the existing
> `verify-entrypoints` CLI command as an additional WARNING line, and
> `dream.config.json`'s `darwin` entry is pinned to its exact current
> published version (`@metaharness/darwin@0.14.0`) with `--no-install` added,
> then: (a) the audit correctly flags the pre-candidate `darwin` command as
> unpinned and the post-candidate command as pinned, verified by unit tests;
> (b) `npm test` passes with 0 regressions relative to baseline commit
> `2fba2550182d81b36423447221823e98e227482a` (106/106); (c) the existing
> `bench`/`darwin` liveness classification behavior is unchanged — subject
> to: no pre-existing test weakened/removed/modified, the new audit function
> stays pure, and `dream.config.json`'s `bench` entry and all other keys are
> untouched.

All three predictions were confirmed true for the built candidate (see
Evaluation Receipt). The hypothesis was correct; the candidate still does
not ship, because an equivalent-or-better version of it already exists,
unmerged, elsewhere in this same repository.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), this repo's own `bench` entrypoint.
Baseline: commit `2fba2550182d81b36423447221823e98e227482a` (`main` HEAD),
106/106 tests, 7 files.

| | Baseline (parent) | Candidate (working tree, built then withheld) |
|---|---|---|
| Tests | 106/106 | 117/117 (+11, 0 removed/modified) |
| Lint | clean | clean |
| Build (`tsc -b`, 6 packages) | clean | clean |
| `verify-entrypoints dream.config.json` | `bench: live`, `darwin: blocked` | identical (pin + `--no-install` is a no-op on today's liveness ground truth, by design) |

Diff size: 5 files, 180 insertions / 4 deletions (184 changed lines) — one
conceptual change, under the 300-line target. Not committed (see TL;DR).

Live receipt (real subprocess execution, not simulated), both before and
after the candidate edit:
```
$ node packages/cli/dist/bin.js verify-entrypoints dream.config.json
bench: live (exit 0) — produced output
darwin: blocked (exit 1) — npm error npx canceled due to missing packages and no YES option: ["@metaharness/darwin@0.10.2"]   # pre-candidate (unpinned)
darwin: blocked (exit 1) — npm error npx canceled due to missing packages and no YES option: ["@metaharness/darwin@0.14.0"]   # post-candidate (pinned)
```
Ground truth matches hand-verification both times; the `--no-install` +
exact-pin combination preserves today's safe fail-closed behavior rather
than relying on it as an unstated side effect of `npx`'s non-interactive
default (which is what today's unpinned command was actually, silently,
depending on).

## Darwin (bounded evolution)

`DARWIN=not-applicable`. Not run — no evolvable population for a small, pure,
exhaustively-branched classifier (same reasoning as every prior
non-architectural security-adversarial night). Separately: the real
`@metaharness/darwin` package itself was deliberately never executed
unguarded tonight (see Security Review) — this report's "Darwin" section
refers to this pipeline's own bounded-evolution step, not a run of the
third-party package under evaluation.

## Evidence

- OBSERVATION: `npm view @metaharness/darwin versions/time/maintainers
  --json` — real package, 35 published versions, latest `0.14.0`
  (2026-11-10), sole maintainer `ruvnet`.
- OBSERVATION: `mcp__github__list_issues`/`list_pull_requests` on the real
  `LLM-Dev-Ops/agentics-dream-machine` — 61+ issues, dozens of open PRs,
  none reflected in `LEDGER.md` past row 9 (2026-09-08).
- MEASUREMENT: `npm test` — 106/106 (baseline) → 117/117 (candidate, before
  withholding), 0 regressions, 0 removed/modified tests. `npm run lint` and
  `npm run build` clean both sides.
- MEASUREMENT: `npm audit --json` — 21 advisories (3 critical), 100% dev-only,
  `prod: 13`/`dev: 269`.
- OBSERVATION: PR #18 `head.sha` (`ed97cb89…`) ≠ the commit SHA
  (`f296e50…`) its own body cites as "exact remote head"; `list_commits`
  confirms 4 commits separate them.
- OBSERVATION: `get_file_contents` at the real current head confirms PR #18
  already contains both the darwin pin (PR #63) and the supply-chain
  classifier (PR #20, as `packages/cli/src/supplychain.ts`), the latter
  functionally broader than tonight's first-draft candidate.
- INFERENCE: tonight's candidate, built from a clean-room read of this
  repo's code and `main`'s history (not the open-PR backlog), independently
  re-derived a finding and a fix that two prior nights (2026-09-13,
  2026-10-08) had already produced and partially merged-forward into PR #18.
  This is itself evidence of how hard this repo's own backlog makes it to
  tell "new finding" from "re-discovery" without an explicit, disciplined
  GitHub-state check *before* committing to build — which this report adds
  as a Recommendation.
- DECISION: withhold the built candidate code from any PR; ship only this
  report + the ledger row, per the 2026-10-15 (`#76`) "docs/ledger only"
  precedent for a confirmed duplicate.
- REJECTION: candidate rejected for promotion. Reason recorded precisely so
  a future night does not need to re-derive it: *not* a test failure, *not*
  a reward-hack, *not* a security defect in the candidate itself — pure
  duplication of equivalent-or-better unmerged work already in PR #18.

## Reward-Hack Check

Independent critic (separate subagent, not this candidate's author)
reviewed the diff before the duplication finding changed its disposition.
**Found one real BLOCKING defect**, now fixed and independently re-verified:
`auditEntrypointPinning` originally treated any `@`-suffix as a pin,
including moving dist-tags (`@latest`, `@next`, `@beta`, `@canary`) — exactly
the failure mode the audit exists to catch, and the critic noted the first
test suite conveniently never exercised it. Fixed: the suffix after the
final `@` must match `/^\d+\.\d+/` to count as pinned. Re-verified: 117/117
passing, new tests cover `latest/next/beta/canary` for scoped and unscoped
specs, plus a prerelease-semver-is-still-a-pin case. Critic's second pass
independently re-read the fixed file and re-ran the tests: **VERDICT: CLEAR**.

Three non-blocking notes from the critic, logged as follow-ups rather than
fixed (now moot — the candidate itself is withheld, but recorded for
whoever eventually reconciles PR #18 vs. tonight's independent rediscovery):
1. Only the first `npx` token in a command string is audited; a
   multi-invocation command (`npx a && npx b`) would only assess the first.
   Not exploitable against any `evaluatorEntrypoints` command in this repo
   today (none use `&&`/multiple invocations).
2. `--no-install` + an exact pin can hard-fail (not just warn) on a runner
   whose cache lacks that exact version — self-detected by the existing
   liveness classifier (`blocked`, not silent), confirmed by tonight's own
   live receipt above, not a regression.
3. The hardcoded version string will rot as `@metaharness/darwin` keeps
   publishing — a human-maintained constant, acknowledged, same class of
   limitation as PR #63's own `@0.10.3` pin (already superseded by
   `0.14.0` in the 35 days since that PR was opened — concrete evidence
   this limitation is real, not hypothetical).

For comparison, PR #20's independently-built `supplychain.ts` (now living in
PR #18) already handles dist-tags correctly via an explicit `MUTABLE_DIST_TAGS`
set from the start, and additionally handles git/URL specs via `#ref` —
tonight's candidate did not attempt the git/URL case at all. This is concrete
evidence that the existing unmerged work is strictly more complete, not just
earlier.

## Security Review

- **Tool/command-authority scope**: unchanged from every prior night —
  `io.exec`/the equivalent trust boundary only ever runs a command from a
  locally-authored, PR-reviewed `dream.config.json` or a direct CLI
  invocation. No new remote/network attack surface introduced by the
  (withheld) candidate.
- **The real supply-chain risk itself, reconfirmed with harder evidence
  than any prior night**: `npx @metaharness/darwin evolve --sandbox real`,
  as literally configured on `main` tonight, is an unpinned invocation of a
  real, actively-published (9 releases/~2.5 months), single-maintainer npm
  package. This session did not execute that literal command, or any
  `--yes`-guarded variant (including PR #18's `npx --yes
  @metaharness/darwin@0.10.3 evolve . --sandbox real`), for real — both
  would genuinely fetch and run third-party code with unknown behavior
  inside this session's sandbox, which this report treats as out of bounds
  for a nightly evaluation to do unguarded. Verification was limited to
  `npm view` (registry metadata only, no install) and reading file
  contents via the GitHub API (no execution).
- **Credential exposure**: none. No secrets handled by anything touched
  tonight. `LLM_EVAL=blocked` (no `OPENROUTER_API_KEY` configured in this
  session) — consistent with every candidate tonight requiring zero model
  calls, by design.
- **GitHub-auth note**: the local `gh` CLI's `GH_TOKEN` is invalid
  (`gh auth status` fails) in this session, but `mcp__github__get_me`
  confirms the MCP GitHub tools are authenticated as `nicholas-ruest`.
  `FALLBACK=false` for issue/PR operations. Gist creation has no available
  tool (MCP or otherwise) in this session — `GIST=LOCAL`, same as every
  prior night.
- **Prompt injection / cross-agent poisoning**: N/A — no LLM calls, and
  every GitHub body/title read tonight (PR #18's included) was treated as
  data to verify against the actual code/commits, not as instructions.
- **Least privilege**: unaffected — no capability changes attempted tonight
  beyond what was already withheld.

## Scan Findings

**redblue** — No new information tonight; `dream.config.json#evaluatorEntrypoints`
still configures no `redblue` key (only `bench`/`darwin` on `main`; PR #18 adds
`flywheel`, still no `redblue`). The 2026-08-13 silent-no-op finding for
`@metaharness/redblue` stands, unpatched upstream, out of this repo's scope.

**supply-chain** — `npm audit` on a clean `npm ci` tonight: **21 advisories
(2 low, 12 moderate, 4 high, 3 critical)**, 100% confined to
`eslint`/`vitest`/`@vitest/coverage-v8`/`vite`/`esbuild`/`tinypool`
devDependencies (`prod: 13`, 0 third-party runtime deps; `dev: 269`). This
count has risen from 8 (2026-09-08) to 21 tonight — consistent with issue
#114's already-documented "decay under review latency" pattern (dependabot's
fix PR sitting open while new advisories accrue faster than review
throughput). Separately, and the night's main thread: the `darwin`
evaluator entrypoint's unpinned, actively-maintained third-party dependency
— see Security Review and the PR #18 integrity finding above.

## Competitors

| System | Unpinned-third-party-execution / supply-chain-pin handling in an autonomous pipeline | Grade |
|---|---|---|
| Dependabot / Renovate | Both default to pinning exact versions in lockfiles and flag advisory ranges; neither has a documented check for an *unpinned shell invocation* (e.g. bare `npx pkg`) embedded in automation config outside a manifest — a different, narrower problem than tonight's finding | A (official docs) |
| OpenHands | Documents sandboxed, container-scoped tool execution but no documented static audit of *which third-party CLI invocations are version-pinned* before an autonomous run | B (absence confirmed against official docs) |
| Sakana AI Scientist | Research pipeline runs LLM-generated code in a sandbox; no documented supply-chain pin-auditing of its own tooling dependencies, as distinct from sandboxing the generated code itself | C (secondary source) |
| SWE-agent | Guardrails focus on cost/lint/syntax; no documented check for unpinned subprocess invocations of third-party packages | C |
| GitHub's own Actions `uses:`-pin-to-SHA convention | The closest direct analogue to tonight's finding — GitHub's own security hardening guidance recommends pinning Actions to a commit SHA rather than a tag, for exactly the "trust the publisher's current HEAD" risk this report describes for `npx`. This repo's own issue #102/#103 already proposed exactly this for its *workflow* `uses:` refs (16 refs, 6 workflows) — unmerged, same backlog pattern as PR #18 | A (official GitHub docs, directly analogous, already independently proposed inside this repo) |

## Gist

This report. No `gh gist create`-equivalent tool is available to this
session (GitHub access is via MCP tools scoped to issues/PRs/branches on
`LLM-Dev-Ops/agentics-dream-machine`; no gist-creation tool present) — same
as every prior night. Published as a local artifact
(`/tmp/dream-gist-2026-11-13.md`), committed into the PR as
`docs/dream-cycle/2026-11-13-security-adversarial-report.md`. `GIST=LOCAL`.

## Witness

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-11-13-security-adversarial-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at the
start of tonight's session). REPORT_HASH and WITNESS are computed over the
committed copy of this exact file and published in the PR body and the
`LEDGER.md` row.

## Recommendation

Human review of the draft (docs/ledger-only) PR. Concrete next steps, not
done tonight:

1. **Merge PR #18** (or whichever of its constituent PRs is cleanest to
   land first) rather than any further standalone darwin-pin/supply-chain
   candidate — it already contains a strictly more complete version of
   tonight's rejected candidate, reports `mergeable_state: clean` against
   current `main` as of tonight, and closing it resolves PR #20, #63, and
   several others simultaneously.
2. **Resolve the PR #18 body/head-SHA drift** before merging: either refresh
   the "2026-11-12 integration update" section to describe the actual
   current head (`ed97cb89…`) with claims re-verified against it, or note
   explicitly which claims are stale. A PR whose own description can't be
   trusted to describe its own current diff undermines exactly the
   `witness-every-quantitative-claim` discipline this repo names.
3. **Add a pre-build GitHub-state check to this pipeline's own STEP 2/3**
   (a process change, not a code change): tonight's candidate would not
   have been built at all if `list_issues`/`list_pull_requests` had been
   checked for topic overlap *before* writing code rather than after. STEP
   2 currently only reads `docs/dream-cycle/` and `docs/adrs/` (both stale
   relative to GitHub); it should also check open issues/PRs for the
   night's `DEEP`+`SCAN` labels before freezing a hypothesis.
4. **Decide the `--no-install` vs. `--yes`+pin tradeoff explicitly** for the
   `darwin` entrypoint once PR #18 (or a successor) is under real review —
   not raised as a blocking defect in either PR, but worth a one-line
   decision record so a future night doesn't have to re-derive which guard
   this repo intends.
5. `LEDGER.md` is ~66 nights stale (last row 2026-09-08; real GitHub
   activity runs through at least 2026-11-12/#130). Not corrected tonight —
   backfilling 66 nights of history is a larger, separate decision, and
   this finding is itself now a 3rd-or-later consecutive flag of ledger
   staleness (ledger-signals surface's issues #108/#120 already cover the
   write-time validation half of this problem). If this repeats again,
   the learning-signal threshold ("a finding repeated in ≥3 prior nights →
   rotate to the next slot's DEEP surface") should trigger `ledger-signals`
   as tonight's *actual* surface, not `security-adversarial`.
