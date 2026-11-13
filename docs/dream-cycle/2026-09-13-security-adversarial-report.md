# Security-Adversarial / Redblue+Supply-Chain SOTA Report — 2026

## TL;DR

Tonight's rotation (`DAYINT=20260913`, `SLOT=3` → `DEEP=security-adversarial`,
`SCAN=redblue,supply-chain`) turns the "pin or guard the darwin evaluator
entrypoint" recommendation — logged and re-logged on 2026-08-13, 2026-09-08,
and again (with live-execution evidence) on 2026-09-11 — into a checkable,
tested primitive instead of a fourth report re-stating the same prose finding.
Candidate: `assessSupplyChainPin()`/`assessConfiguredSupplyChain()`
(`packages/cli/src/supplychain.ts`, new file) plus a `verify-supply-chain
[config]` CLI command, wired the same way `verify-entrypoints` wires
`classifyConfiguredEntrypoints`. It statically flags any `evaluatorEntrypoints`
command that is an `npx` invocation with no version pin and no `--no-install`
guard — **no subprocess execution required**, so it works even when the
package in question isn't installed. Live receipt against this repo's real
`dream.config.json` tonight: `bench` → **not-applicable** (not npx), `darwin`
→ **unpinned**, exit 1 — matching ground truth verified by hand. An
independent critic caught a real correctness defect in the first draft
(dist-tags and git/ssh specs with embedded `user@host` were misclassified as
"pinned"); fixed before evaluation was finalized, both change and fix
documented under Evidence/Reward-Hack Check below. `npm test`: baseline
**106/106** → candidate **125/125**, 0 regressions. Separately: `npm audit`
now reports **9** advisories (was 8 on 2026-09-08) — a new high-severity
`js-yaml` advisory joined the same all-devDependency set — still fixed by the
same still-unmerged dependabot PR #1 (open 10 days). CodeQL (issue #10) is
still red on `main`, unchanged, confirmed by hand tonight; still a
repo-settings action, not something a code PR can fix.

## What's new

- **The unpinned-`npx`-entrypoint finding now has a machine-checkable form.**
  Three prior nights (2026-08-13, 2026-09-08, 2026-09-11) named this risk in
  prose inside a Security Review section; none shipped a primitive for it —
  the same gap ADR-0002 closed for entrypoint *liveness* a month ago never got
  closed for entrypoint *provenance*. Tonight's `verify-supply-chain` is that
  primitive, and — unlike `verify-entrypoint(s)` — needs no `io.exec` at all,
  so it can run in CI or a pre-commit hook without ever installing or
  executing the package it's inspecting.
- **Independent critique found and this session fixed a real false-negative
  before shipping.** The first draft's pin check was "does the package spec
  contain a second `@` anywhere" — which classifies `pkg@latest` and
  `git+ssh://git@host/repo` (no `#ref`) as **pinned**, when both are moving
  targets (a mutable dist-tag; an unreffed git URL that resolves to whatever
  the default branch currently is). That is the exact wrong-direction error a
  supply-chain checker must not make: reporting a risky config as safe. Fixed
  by excluding a fixed set of known mutable dist-tags and requiring git/URL
  specs to carry a `#ref` rather than trusting any embedded `@`. Full
  before/after in Reward-Hack Check.
- **Reconfirmed, unchanged**: no `redblue` key exists in `dream.config.json`
  tonight (still just `bench`+`darwin`), so there is nothing new to classify
  for the redblue scan specifically; the 2026-08-13 finding (silent no-op via
  the npm bin-symlink footgun) stands, unpatched upstream, out of this repo's
  scope — third consecutive night confirming no change.
- **CodeQL is still red on `main`**, byte-for-byte the same failure issue #10
  already diagnosed (`Code Security must be enabled for this repository to
  use code scanning` — a repo-settings gap, not a workflow-YAML gap).
  Reconfirmed tonight via `actions_list` (`list_workflow_runs`): 6 recorded
  runs, all `conclusion: failure`, most recent `34190907693` on `main@2fba255`
  — the same commit this session's own `SESSION_COMMIT` is built on, 5 days
  later, with no new push to `main` since. Not re-filed (issue #10 remains
  open and accurate); flagged again only so a future night doesn't spend time
  re-diagnosing it.
- **Dream-cycle PR backlog is real and growing.** `list_pull_requests`
  (state=all) tonight: #12 (2026-09-09), #14 (2026-09-10), #16 (2026-09-11),
  #18 (2026-09-12) are all still open/draft/unmerged — a fourth candidate PR
  is about to be added tonight as a fifth. `docs/dream-cycle/LEDGER.md` on
  `main` has been stuck at its 2026-09-08 row this whole time (PR #16 already
  built the `nightsSinceLastRow` signal for exactly this; it just isn't
  merged yet). Not this candidate's to fix — flagged as ledger-check context,
  consistent with PR #16's own recommendation #1.

## Hypothesis (frozen before implementation)

> Given this repo's own `dream.config.json#evaluatorEntrypoints` commands,
> when each command string is passed through a new pure classifier
> `assessSupplyChainPin()` that flags an `npx <pkg>` invocation as `unpinned`
> unless the package spec carries a real version/tag pin (excluding mutable
> dist-tags like `@latest`) or a `#ref`-pinned git/URL spec, or is otherwise
> `guarded` by `--no-install`, then the classifier should correctly report
> this repo's real `bench` entrypoint as `not-applicable` (not npx) and its
> real `darwin` entrypoint as `unpinned`, matching ground truth verified by
> hand — subject to: pure (no I/O, no execution, no network), zero
> pre-existing test weakened/removed/modified, and zero behavior change to
> the pre-existing `verify-entrypoint(s)` commands.

Not modified after evaluation began. (The dist-tag/git-URL hardening below was
applied *before* the evaluation receipt in this report was captured — the
adversarial critique that found the gap ran against the same frozen
hypothesis, which the fix satisfies; it did not require reopening the
hypothesis itself.)

## Benchmarks / Evaluation

Real evaluator: `npm test` (vitest), this repo's own `bench` entrypoint. Fresh
`npm ci && npm run build` at `SESSION_COMMIT` first, to get a clean baseline.

| | Baseline (parent, commit `2fba255`) | Candidate (working tree) |
|---|---|---|
| Test files | 7 | 8 |
| Tests | 106 | 125 |
| Result | 106 passed | 125 passed |
| Lint (`eslint packages`) | clean | clean |
| Build (`tsc -p`, all 6 packages) | clean | clean |

Diff: 1 new file (`supplychain.ts`, 76 lines), 1 new test file
(`supplychain.test.ts`, 14 tests), `index.ts` +20 lines (new command + help
line), `index.test.ts` +49 lines (5 new tests). One conceptual change (a
static supply-chain pin classifier + its CLI wiring). No pre-existing test
touched.

Live receipt — `dream-machine verify-supply-chain` run against the real
`dream.config.json` tonight, fresh build:

```
$ node packages/cli/dist/bin.js verify-supply-chain
bench: not-applicable — not an npx invocation
darwin: unpinned — package spec "@metaharness/darwin" has no version pin and
no --no-install guard — an unattended run will silently install and execute
whatever is currently published under this name
$ echo $?
1
```

Confirmed by hand: `dream.config.json`'s real `darwin` command is `npx
@metaharness/darwin evolve --sandbox real` — no `@version`, no
`--no-install`. Matches ground truth. `verify-entrypoint`/`verify-entrypoints`
(pre-existing commands) re-run unchanged, unaffected by this diff.

## Darwin (bounded evolution)

Not run. `DARWIN=not-applicable` — same reasoning as every prior night that
shipped a small, pure, exhaustively-branched function: bounded Darwin's
generations×children search needs a mutable candidate population this doesn't
have (PR #18, 2026-09-12, already demonstrated on this exact repo that a
generic one-task bench suite can't differentiate genome mutations even when a
population exists).

## Evidence

- OBSERVATION: `dream.config.json#evaluatorEntrypoints` on `main` tonight:
  `bench: "npm test"`, `darwin: "npx @metaharness/darwin evolve --sandbox
  real"` — no `redblue` key, darwin unpinned, unchanged from 2026-09-08 and
  2026-09-11 (PR #18's fix for this same line is still unmerged).
- OBSERVATION (GitHub MCP, `pull_request_read` method `get`): PR #8 and #9
  both `merged: true` (contradicting `list_pull_requests`'s `merged: false`
  for the same two PRs — the same MCP-surface discrepancy PR #16 already
  flagged on 2026-09-11; reconfirmed independently tonight, not re-litigated).
  PRs #12, #14, #16, #18 all `state: open`, `draft: true`, `merged: false`.
- OBSERVATION (GitHub MCP, `actions_list` `list_workflow_runs` for
  `codeql.yml`, branch `main`): 6 runs, all `conclusion: failure`; most recent
  `34190907693` on `2fba255`, unchanged since issue #10 was filed 2026-09-08.
- MEASUREMENT: `npm test` — 106/106 (baseline) → 125/125 (candidate), 0
  regressions, 0 removed/modified tests, independently re-run after the
  hardening fix below (not just before it).
- MEASUREMENT: `npm audit --json` on a fresh `npm ci` — 9 advisories (2
  critical, 2 high, 3 moderate, 2 low; was 8 on 2026-09-08 — a new high
  `js-yaml` advisory), 100% inside `eslint`/`vitest`/`vite`/`esbuild`/`js-yaml`
  devDependencies (`prod: 13`, all internal `@dream-machine/*` workspace
  packages; `dev: 269`). Fix path unchanged: dependabot PR #1, still open,
  now 10 days (created 2026-09-03).
- INFERENCE: the critical CVE (Vitest UI arbitrary file read/execute,
  `<3.2.6`) is still not exercised by this repo's `npm test` (`vitest run`,
  never `--ui`) — narrow, unchanged exposure, third night confirming it.
- OBSERVATION (independent critic, first draft): `assessSupplyChainPin`'s
  pin check (`body.includes('@')`) misclassified `npx cowsay@latest` and `npx
  git+ssh://git@github.com/user/repo.git` (no ref) as `pinned` — a dist-tag
  and an unreffed git URL are both moving targets, not pins. Verbatim
  critic quote: "This is exactly the failure mode … a spec that merely
  contains an `@` character that isn't a real version pin."
- DECISION: fix `isVersionPinned` to (a) exclude a fixed set of known mutable
  dist-tags (`latest`, `next`, `beta`, `alpha`, `canary`, `rc`, `nightly`,
  `dev`, `experimental`, `unstable`) and require the version suffix to look
  like a real semver/range (`/^([~^]|>=?|<=?|=)?\s*v?\d/`); (b) for git/URL
  specs, require a `#ref` fragment rather than trusting any `@` (which is
  commonly embedded auth, `git@host`). Re-ran the full receipt above after
  the fix — 106→125 already reflects the corrected version.
- DECISION: disclose, not silently paper over, one known remaining
  limitation surfaced by the same critique: a multi-package `npx -p pkg1 -p
  pkg2 cmd` invocation only inspects `pkg1` (the first non-flag token).
  Locked into a dedicated test (`supplychain.test.ts`) rather than left
  untested, documented in the file's header comment. No `evaluatorEntrypoints`
  command in this repo uses `-p` tonight, so this does not change tonight's
  live receipt; flagged as a follow-up, not fixed (would need flag-arity
  awareness for `-p`/`--package` and every other npx flag that consumes a
  value — a materially larger parser than tonight's one-conceptual-change
  scope).
- REJECTION: considered also editing `dream.config.json`'s `darwin` line
  directly (pin or `--no-install`-guard it for real). Rejected tonight: PR
  #18 (open, unmerged) already edits that exact line for an unrelated bug
  (missing `<repo>` positional argument); editing it again from an
  independent branch would create an unforced merge-conflict surface between
  two otherwise-independent, separately-reviewable candidates. A
  `dream.config.json` content change stays a distinct, human-reviewable
  decision, same reasoning given on 2026-09-08 and 2026-09-11.

## Reward-Hack Check

Independent critic (separate subagent via the `Agent` tool, not this
candidate's author) reviewed the first draft end-to-end: correctness of
`isVersionPinned` across scoped/unscoped/dist-tag/git-URL/local-path specs,
whether any pre-existing test was weakened/removed/modified, false-positive
vs. false-negative risk, command-injection surface, test coverage gaps, and
scope discipline. It independently re-ran `npm test` (and a `git stash` A/B)
to confirm counts itself rather than trusting this report.

**Verdict on the first draft: BLOCKED** — one real blocking defect (the
dist-tag/git-URL false-`pinned` misclassification described above under
Evidence), which this session fixed before finalizing the report, then
re-verified: 125/125 passing, lint clean, live receipt re-captured on the
corrected code. The critic's non-blocking findings (untested dist-tag/git-URL
cases, the `-p`-multi-package gap) are both now covered by dedicated tests
added in the same fix, per its own request; the `-p` gap is disclosed as a
known limitation rather than solved, which is documented, not hidden.

Confirmed independently by the critic before the fix (still true after):
zero pre-existing tests altered; `index.ts`/`index.test.ts` diffs are
additions-only; no `exec`/`spawn`/`fs`/network call anywhere in
`supplychain.ts` (verified by reading the code, and by a dedicated test that
deletes `io.exec` from the IO fake entirely and confirms the command still
works); no cherry-picking; no gold data, threshold, or scoring logic touched.

**No blocking defects remain.**

## Security Review

- **Tool/command-authority scope**: `verify-supply-chain` performs zero
  execution, zero I/O beyond reading the one config file already read by
  every other `dream-machine` command — strictly narrower trust surface than
  `verify-entrypoint(s)`, which does execute configured commands. No new
  attack surface.
- **The finding itself, restated as a security fact, not just a lint
  result**: this repo's real, currently-configured `darwin` evaluator
  entrypoint (`npx @metaharness/darwin evolve --sandbox real`) will, on any
  unattended run where the package isn't already cached, resolve and execute
  whatever is currently published under `@metaharness/darwin` on the npm
  registry at that moment — no pin, no `--no-install` guard. This is the
  third consecutive report to say so in prose; tonight is the first night
  it's also a `1`/`0` exit code a CI job could gate on. Not gated on
  tonight — wiring `verify-supply-chain` into an actual CI/pre-flight check
  is a separate, larger change (see Recommendation).
- **False-negative risk (addressed, not eliminated)**: the classifier is a
  heuristic, not a full npm/git spec parser (see the `-p`-multi-package
  limitation above, and the file's own header comment). It should be read as
  "flags the common unpinned shapes," not as a formal guarantee.
- **Credential exposure**: none — no secrets handled, no `LLM_EVAL` touched
  (no model calls in this candidate).
- **Prompt injection / cross-agent poisoning**: N/A — no LLM calls;
  `dream.config.json` values are locally-authored/PR-reviewed, not
  attacker-controllable runtime input, same trust boundary as
  `verify-entrypoint(s)`.
- **CodeQL / repo-settings gap (issue #10, reconfirmed, not actioned)**: see
  What's new — a repo-admin action (`Settings → Code security and analysis`),
  not a code change this or any dream-cycle session can make.

## Scan Findings

**redblue** — `dream.config.json#evaluatorEntrypoints` still has no `redblue`
key (third consecutive night confirming this); the 2026-08-13 finding (npm
bin-symlink footgun causing a silent no-op) stands, unpatched upstream,
out of this repo's scope.

**supply-chain** — Two independent angles tonight: (1) the `darwin`
entrypoint's unpinned-`npx` risk, now backed by a tested, machine-checkable
classifier instead of only prose (see TL;DR/Evidence); (2) `npm audit`: 9
advisories (was 8), 100% confined to devDependencies, fix already sitting
unmerged as dependabot PR #1 (now 10 days open). Both findings are
reconfirmations-with-new-evidence of prior nights' work, not net-new
discoveries — consistent with STEP 2's "do not rediscover a failed direction
unless new evidence justifies reopening it" (here, the new evidence is the
shipped primitive itself, and the critic-found defect in it).

## Competitors

| System | Static supply-chain pin/provenance checking for agent tool invocations | Grade |
|---|---|---|
| OpenHands | Sandboxed execution + documented tool allowlisting; no published static pre-execution check for unpinned package specs inside a configured tool command | B (official docs, fetched directly) |
| SWE-agent | Guardrails (cost, syntax, lint+revert) target code-quality regressions; no documented supply-chain/pin check on the tools it shells out to | C (secondary source) |
| DSPy/GEPA | No documented tool-invocation supply-chain check; scope is metric-based prompt/weight optimization, not tool provenance | B (absence confirmed against official docs) |
| AutoGPT-lineage | Community failure catalogs document agents installing/executing arbitrary packages via shell tools with no pin enforcement found | C |
| Sakana AI Scientist | Executes generated experiment code in a sandbox; reviewed materials describe container isolation, not static pin-checking of invoked package specs | C (secondary source, not independently reproduced) |
| npm's own `npm audit`/`npm ci --ignore-scripts` ecosystem tooling (not an agent, included for contrast) | Checks *installed* dependency vulnerabilities and can suppress install scripts, but has no notion of "is this ad-hoc `npx` invocation in my own automation pinned" — a different problem this candidate targets | A (official docs) |

No A-grade academic source was found describing "static pin-checking of an
autonomous agent's own configured tool-invocation strings" as a named,
studied technique — narrow enough that the closest comparisons are
inferences from each system's general sandboxing/guardrail model, treated as
informative only, per this repo's own evidence-grading discipline.

## Gist

No `gh gist create` tool available to this session (same constraint as every
prior night — GitHub access is via MCP tools scoped to issues/PRs/branches on
`LLM-Dev-Ops/agentics-dream-machine`, no gist-creation tool present).
Committed instead as
`docs/dream-cycle/2026-09-13-security-adversarial-report.md`, following the
naming convention actually present on `main` (the still-unmerged
`docs/dream-cycle/gists/` subdirectory convention introduced by PR #18 is not
adopted here, to avoid a second divergent layout before either is reviewed).
`GIST=LOCAL`.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so the
stamp cannot be written *inside* the file it stamps. The committed copy at
`docs/dream-cycle/2026-09-13-security-adversarial-report.md` is the frozen,
hashed artifact; this section is filled in immediately before that file is
committed, over content identical up to this point. Anyone can independently
reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-09-13-security-adversarial-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at the
start of tonight's session, before this candidate's changes).

## Recommendation

Human review of the draft PR. Concrete next steps, not done tonight:

1. **Wire `verify-supply-chain` (and `verify-entrypoints`) into an actual CI
   gate or pre-flight check**, not just an opt-in CLI primitive — the same
   "next step, deferred" shape ADR-0002 named for entrypoint liveness a month
   ago now applies to entrypoint provenance too.
2. **Pin or `--no-install`-guard `dream.config.json`'s real `darwin`
   entrypoint.** Recommended three nights running (2026-08-13, 2026-09-08,
   2026-09-11); PR #18 already touches this exact line for a different bug
   (missing `<repo>` arg) — whoever reviews PR #18 could fold the pin in at
   the same time and close out all three open recommendations on that one
   line.
3. **Clear the growing dream-cycle PR backlog** (#12, #14, #16, #18, and now
   this one) — or explicitly reject/close some of them. `LEDGER.md` on `main`
   is now 5 real nights behind actual nightly work; PR #16 already built the
   signal (`nightsSinceLastRow`) that makes this visible, it just isn't
   merged.
4. **Repo-admin: enable Code Security / code scanning** (issue #10) so
   CodeQL goes green — a settings action, not a PR, per issue #10's own
   recommendation, reconfirmed unchanged tonight.
5. **Merge (or let dependabot auto-merge) PR #1**, resolving all 9 current
   `npm audit` advisories including two criticals — a session action, not
   something this session does itself.
