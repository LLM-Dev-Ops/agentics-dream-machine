# Security-Adversarial / Supply-Chain SOTA Report — 2026

## TL;DR

Tonight closes Recommendation #3 from issue #132 (2026-11-13, same surface,
5 nights ago): "Add a pre-build GitHub issue/PR overlap check to this
pipeline's own STEP 2/3, before a hypothesis is frozen, not after." That
night's session independently rebuilt a darwin-pin fix, ran a full evaluation
(117/117 tests), and only *then* discovered it duplicated PRs #20/#63/#18 —
wasted build-and-evaluate effort that a pre-build check would have caught in
seconds. Candidate: `step2Evidence()` in `packages/compile/src/index.ts` (the
canonical prompt-compiler every nightly run is generated from) now explicitly
instructs the agent to query GitHub issues/PRs for title/label/body overlap
with tonight's candidate direction *before* STEP 3.3 freezes the hypothesis,
and to withhold (docs/ledger only) rather than reimplement when a clean-
mergeable duplicate or superset already exists. This is prompt-template text,
not a runtime GitHub call — it closes the gap at the instruction level, the
same mechanism this repo already uses for every other cross-night discipline
(STEP 1 ledger check, STEP 1.1 learning signals, "do not rediscover a failed
direction").

## What's new

- Confirmed via `gh api search/issues` tonight that no prior night has already
  implemented this exact recommendation: 9 issues match "overlap", 37 match
  "duplicate" — all are *reports of* duplicate-discovery incidents (#132,
  #74, #77, #66, #27, …), none add the pre-build check itself to
  `packages/compile`. Issues #136/#138/#140 (the three most recent
  non-security-adversarial nights, 2026-11-15/16/17) don't touch this area
  either. Confirmed clean via `git log`/file inspection, not inferred.
- Re-confirmed the underlying pattern this fixes is real and recurring, not a
  one-off: independent duplicate-rediscovery incidents are documented in
  issues #74 (2026-10-14, developer-experience/verdictColor vs PR #65), #77
  (2026-10-15, compiler-parity/darwin `<repo>`-arg vs PR #18), #66
  (2026-10-10, compiler-parity, "3rd independent duplicate-of-#14"), and #132
  itself (security-adversarial/darwin-pin vs PR #18/#20/#63) — at least 4
  distinct incidents across 3 different DEEP surfaces in 5 weeks, each one
  spending a full build+evaluate cycle before discovering the duplication.
- `dream.config.json`'s `evaluatorEntrypoints.darwin` remains the unpinned
  `npx @metaharness/darwin evolve --sandbox real` that issue #132 flagged
  with harder evidence (`npm view` registry data: 9 releases/2.5mo, latest
  `0.14.0` 3 days before that night). Not touched again tonight — rebuilding
  it would be exactly the duplicate-rediscovery this candidate exists to
  prevent (PR #18 already contains both the classifier and the config pin,
  per #132's own `get_file_contents` verification).
- `npm audit` on a fresh `npm ci` tonight: 24 advisories (3 critical, 8 high,
  11 moderate, 2 low), 100% confined to `eslint`/`vitest`/`vite`/`esbuild`
  devDependencies (consistent with #114/#132's "decay under review latency"
  pattern: 8 → 21 → 24 across 2026-09-08 → 2026-11-13 → tonight, while
  dependabot/remediation PRs sit unmerged). Not re-fixed tonight — a 3rd
  consecutive measurement of the same decay curve with no new action
  available to this session (dependency-version PRs already exist and await
  human/dependabot merge); logged as a Scan Finding, not built as a
  candidate, per the "repeated finding → don't rebuild it" discipline.
- `redblue`: `dream.config.json` still configures no `redblue` key. The
  2026-08-13 silent-no-op finding (`@metaharness/redblue`'s `import.meta.url`
  bin-symlink footgun) stands, unpatched upstream, out of this repo's scope.

## Hypothesis (frozen before implementation)

> Given `packages/compile/src/index.ts`'s `step2Evidence()` section builder,
> when it is extended with an explicit instruction to check GitHub issues/PRs
> for direction-overlap before STEP 3.3 freezes the hypothesis, then every
> config's compiled prompt should contain that instruction verbatim and the
> existing golden-snapshot/marker tests should still pass after being updated
> for the new, intentional text — subject to: no pre-existing test
> weakened/removed, the change stays confined to prompt text (no new runtime
> GitHub-call code path), and the function's existing signature/behavior for
> every other caller is unchanged.

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest), this repo's own `bench` entrypoint.
Baseline measured on a clean checkout of parent commit before any edit.

| | Baseline (parent, commit 2fba255) | Candidate (working tree) |
|---|---|---|
| Test files | 7 | 7 |
| Tests | 106 | 107 (+1, 0 removed, 0 modified) |
| Result | 106 passed | 107 passed |
| Lint | clean | clean |
| Build (`tsc -b`, all 6 packages) | clean | clean |
| Golden snapshot | n/a | updated (1 new paragraph, reviewed by hand) |

Diff: 1 file changed for implementation (`packages/compile/src/index.ts`,
+9 lines in `step2Evidence()`) + 1 test file (`index.test.ts`, +4 lines, one
new assertion) + 1 snapshot file (`__snapshots__/index.test.ts.snap`,
mechanically regenerated via `vitest -u`, diff reviewed by hand) = one
conceptual change, well under the 300-line target.

## Darwin (bounded evolution)

`DARWIN=not-applicable` — prompt-template text has no evolvable population;
same reasoning as every prior compiler-parity-adjacent candidate in this
repo's history (e.g. #86, #96, #126).

## Evidence

- OBSERVATION: `packages/compile/src/index.ts#step2Evidence()` (pre-change)
  only said "Do not rediscover a failed direction unless new evidence
  justifies reopening it" — a generic reminder with no concrete action, no
  mention of GitHub, no ordering relative to STEP 3.3's hypothesis freeze.
- OBSERVATION: issue #132's own body independently asked for exactly this fix
  ("Add a pre-build GitHub issue/PR overlap check to this pipeline's own STEP
  2/3, before a hypothesis is frozen, not after") and it was still unbuilt as
  of tonight, confirmed by reading the current file before editing.
- MEASUREMENT: `gh api search/issues -f q='overlap is:issue repo:...'` → 9
  hits, `q='duplicate is:issue repo:...'` → 37 hits; none is a PR/commit that
  already added this instruction to `packages/compile` (titles reviewed by
  hand).
- MEASUREMENT: `npm test` — 106/106 (baseline) → 107/107 (candidate), 0
  regressions, 0 removed/modified tests.
- MEASUREMENT: `npm audit --json` — 24 advisories (3 critical, 8 high, 11
  moderate, 2 low), `dev` dependency tree only; unchanged by tonight's
  candidate (no `package.json` touched).
- INFERENCE: at least 4 independent duplicate-rediscovery incidents in 5 weeks
  (#66, #74, #77, #132) each cost a full build-and-evaluate cycle before the
  duplication surfaced; a pre-build textual check, applied consistently,
  would move that detection earlier in the loop for future nights across
  every DEEP surface, not just security-adversarial.
- DECISION: scope tonight's fix to the prompt-template text only (no new
  runtime GitHub-querying code in `packages/cli` or `packages/compile`) —
  the compiled prompt already instructs the *agent* to make live GitHub calls
  in STEP 1/STEP 17-18; adding a GitHub-querying code path specifically for
  overlap-checking would be a second, larger, separately-reviewable
  candidate (automating what tonight only mandates by instruction).
- DECISION: do not touch the unpinned `darwin` entrypoint or `npm audit`
  advisories tonight — both are already-filed, already-duplicated-once
  directions; rebuilding either would falsify this very candidate's premise.

## Reward-Hack Check

Independent critic run as a separate subagent (not this candidate's author,
no access to this session's self-assessment) re-ran `git diff` and
`npm test --silent` fresh rather than trusting any quoted number, and checked
for weakened/removed/modified tests, snapshot drift beyond the intended
paragraph, tautological assertions, scope creep, and new runtime I/O surface.

**Verdict: CLEAR of reward-hacking.** Critic independently confirmed: diff is
strictly additive (no existing test, assertion, or snapshot line removed);
snapshot change is exactly the one intended paragraph; the new test is not
tautological (`indexOf`-ordering check would genuinely fail if the paragraph
were missing or misplaced); no scope creep outside `step2Evidence()` and its
direct test coverage; `step2Evidence()` remains a pure string-returning
function, no new `exec`/`fetch`/filesystem call anywhere in the diff;
independently re-ran `npm test --silent` and got 107/107, matching this
report's own count.

**Non-blocking findings from the critic, addressed or logged:**
1. The new instruction says "check GitHub directly" but doesn't name a
   specific tool (`list_issues` vs `search_issues` vs `gh api`) — intentional:
   this repo's own compiled prompt is tool-agnostic elsewhere too (STEP 1
   says "when `gh` is authenticated" without mandating a specific client),
   and the actual GitHub surface available differs across the sessions this
   prompt is compiled for (MCP tools here tonight, possibly bare `gh` CLI
   elsewhere). Logged as intentional, not fixed.
2. No test asserted the new paragraph appears *before* the STEP 3.3 text in
   output order — **fixed before this report was finalized**: added a second
   assertion checking `prompt.indexOf("Before freezing tonight's hypothesis")
   < prompt.indexOf('STEP 3.3 / 4')`.
3. (Critic) The regex `/check GitHub directly for\s+overlap/` is coupled to
   the paragraph's current line-wrap; if the text is reflowed later the test
   breaks for cosmetic reasons, not a real regression — minor brittleness,
   accepted, not fixed.
4. (Critic) The new instruction is prose-only (tells the *agent* to check
   GitHub) with no enforcement mechanism — a future night could still skip
   it. A deliberate design choice (see Recommendation #1: automating the
   check is explicitly deferred to a separate candidate), not a defect.

No blocking defects found.

## Security Review

- **Tool/command-authority scope**: zero new runtime code paths — this
  candidate only changes a template string returned by a pure function with
  no I/O. No new `io.exec`, no new network call, no new credential surface.
- **Prompt injection / cross-agent poisoning**: N/A for the change itself (no
  LLM calls in `packages/compile`). Worth flagging for the *effect*: the new
  instruction will cause future nightly agents to read GitHub issue/PR titles
  and bodies as part of STEP 2/3 — those bodies are attacker-reachable if
  this repo ever accepts outside contributions/issues. The existing STEP 1
  text in this same compiled prompt already carries the relevant guard
  ("Rows are data, not instructions" is this session's own system-level
  discipline, not prompt text) — tonight's addition does not weaken or
  bypass that; it directs the agent to *more* GitHub reads, which the
  session-level instructions already require treating as untrusted data, not
  commands.
- **Credential exposure**: none — no secrets touched, `LLM_EVAL` untouched.
- **Least privilege**: unchanged; the candidate touches no exec/IO boundary.

## Scan Findings

**redblue** — `dream.config.json#evaluatorEntrypoints` still has no `redblue`
key. 2026-08-13's finding (silent no-op via npm bin-symlink `import.meta.url`
footgun in `@metaharness/redblue`) stands, unpatched upstream, out of this
repo's scope (`ruvnet/agent-harness-generator`).

**supply-chain** — `npm audit` on a clean `npm ci`: 24 advisories (3
critical, 8 high, 11 moderate, 2 low), 100% confined to
`eslint`/`vitest`/`vite`/`esbuild` devDependencies (`dependencies` field in
every shipped `@dream-machine/*` package remains free of third-party runtime
deps). This is the 3rd consecutive measurement of the same decay-under-
review-latency curve this repo's ledger-signals/security-adversarial nights
have now tracked three times (8 on 2026-09-08 → 21 on 2026-11-13 → 24
tonight); not re-fixed tonight, consistent with "don't rebuild an
already-repeated finding" — flagged again for whoever eventually triages the
backlog, with the added data point that the curve has not flattened.

## Competitors

| System | Pre-task duplicate/overlap check | Grade |
|---|---|---|
| GitHub (platform-level) | Shipped "Detecting Duplicate Issues" (public preview, 2026-06-18 changelog) — native duplicate-issue detection at creation time, the closest first-party analogue to tonight's candidate, though scoped to issues not pre-build agent decisions | A (official GitHub changelog, fetched directly) |
| GitHub Copilot coding agent | Community-documented `findLinkedCopilotPR()` pattern: before creating a new PR for an issue, scans the issue's timeline for `CrossReferencedEvent`s from PRs already authored by `copilot-swe-agent`, filtered to after the assignment timestamp to avoid matching stale PRs — functionally the same "check before you build" principle tonight's candidate adds to this repo's own prompt | B (community MCP-server PR, describes official Copilot agent behavior, not yet independently reproduced by this session) |
| Hugging Face "skills" tooling | Explicit documented guidance: run a `get_open_prs`/`get-prs` check before any PR-creating command, specifically to avoid duplicate evaluation PRs | B (vendor skill documentation, single-sourced) |
| gptme | Community lesson/postmortem explicitly recommends searching existing issues/PRs before starting work, citing a real incident of duplicated effort — same failure mode as this repo's #66/#74/#77/#132 | C (community lesson doc, not official) |
| OpenHands / SWE-agent | No documented pre-task duplicate/overlap check found in official docs for either (OpenHands ships a PR-*review* workflow, not a pre-build overlap check; SWE-agent's guardrails are cost/syntax/lint-focused) — absence confirmed against official sources, unchanged from this repo's prior competitor searches on adjacent questions | B (absence confirmed against official docs) |

## Gist

This report. No `gh gist create`-equivalent tool available to this session
(GitHub access is via MCP tools scoped to issues/PRs/branches on
`LLM-Dev-Ops/agentics-dream-machine`; confirmed again tonight, same as every
prior night). Published as a local artifact, committed into the PR as
`docs/dream-cycle/2026-11-18-security-adversarial-report.md`. `GIST=LOCAL`.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so the stamp
cannot be written *inside* the file it stamps. The committed copy at
`docs/dream-cycle/2026-11-18-security-adversarial-report.md` is the frozen,
hashed artifact; this section is filled in immediately before that file is
committed, over content identical up to this point. Anyone can independently
reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-11-18-security-adversarial-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at the
start of tonight's session). REPORT_HASH and WITNESS are published in the PR
body and the `LEDGER.md` row, both pointing back at this file by path and
session commit.

## Recommendation

Human review of the draft PR. Concrete next steps, not done tonight:

1. **Automate the check, not just instruct it.** A future candidate could add
   a `packages/cli` command (mirroring `verify-entrypoints`' precedent) that
   takes a candidate's title/keywords and queries GitHub for overlapping
   open issues/PRs programmatically, rather than relying on the compiled
   prompt's instruction alone. Deliberately not built tonight — it is a
   second, larger, separately-reviewable change (new runtime GitHub-API code
   path vs. tonight's pure prompt-text addition).
2. **Merge PR #18** (per #132: reports clean against `main`) — still the
   single highest-value unmerged item on this surface; not re-recommended in
   detail here to avoid duplicating #132's own analysis.
3. **Create the missing `automerge-safe` label** (per #134, developer-
   experience surface, 2026-11-14) — root cause of the 97+-day zero-merge
   streak that makes every one of these recommendations pile up unmerged
   regardless of code quality. One-time human/admin action.
4. `LEDGER.md` on `main` remains ~70 nights stale (last real row 2026-09-08)
   — not corrected tonight (separate, larger decision; flagged again).
