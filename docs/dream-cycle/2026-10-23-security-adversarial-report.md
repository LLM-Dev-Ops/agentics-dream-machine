# Security-Adversarial / Redblue + Supply-Chain SOTA Report — 2026-10-23

## TL;DR

Tonight's rotation (`DAYINT % 5 == 3`) assigned `DEEP=security-adversarial`,
`SCAN=redblue,supply-chain`, no bonus moduli (`DAYINT % 25`, `DAYINT % 75` both
nonzero). Continuing the same promotion-gate adversarial probe 2026-10-18
(issue #82/PR #83, unmerged) started — "treat `.github/workflows/automerge.yml`'s
guard as the adversary's target" — found a gap that PR #83's own candidate
fix does **not** close: `dream.config.json` is not a protected path under
either the live (pre-#83) regex on `main` or #83's own `isProtectedPath()`
replacement. `dream.config.json` sets `evaluatorEntrypoints` — shell commands
(including an unpinned `npx @metaharness/darwin …` call, PR #63's unmerged
finding) that a future autonomous nightly session executes verbatim — and
this very guard's own `autoMerge`/`labels` policy. A PR touching only that
file could, in principle, carry the `automerge-safe` label and merge without
human review, letting an attacker (or a buggy future candidate) repoint an
evaluator entrypoint at malicious code or tamper with the merge policy
itself. Candidate: add `dream\.config\.json$` to the protected-path
regex, directly on `main`'s current (still-unfixed, #83 unmerged) inline
guard, plus a pinned-baseline regression test. `npm test`: parent 106/106 →
candidate 110/110, 0 regressions. Independent critic (fresh subagent,
no shared context): **CLEAR**. No model calls used or needed
(`LLM_EVAL=blocked`, no `OPENROUTER_API_KEY` present) — deterministic static
analysis, reproducible by anyone with a shell.

## What's new (internal evidence loaded before research)

- `docs/dream-cycle/LEDGER.md` on `main` still has not gained a row since
  **2026-09-08** (row 9, PR #8) — zero merges in 45 days — while dream-cycle
  issues/PRs on GitHub now run through **#91** (2026-10-22). This is the same
  "backlog saturated, 0 merged" signal raised by #42/#46/#58/#68/#70/#71/#76
  and reconfirmed every night since; last night's audit (#89, 2026-10-21)
  measured 36/40 open draft PRs as merge-eligible today with 0 git conflicts.
  Nothing here contradicts that; it is restated, not re-derived, per STEP 2.
- Last night (2026-10-22, issue #90/PR #91, also rotated onto
  security-adversarial) found CodeQL flipped green at run #90 after a 49-day
  failure streak, confirmed on 4 `pull_request`-triggered runs (#90-93) but
  **not yet** on a `schedule`/push-to-`main` run — its own recommendation #1
  defers that confirmation to the next scheduled run, Monday 2026-10-26. Not
  actionable tonight; not re-litigated.
- `dream.config.json#evaluatorEntrypoints` still configures only `bench` and
  `darwin` (confirmed live tonight, `grep -n darwin dream.config.json`) — no
  `redblue` key, unchanged since 2026-08-13/2026-09-08. The 2026-08-13
  `npx @metaharness/redblue` silent-no-op finding stands, unpatched upstream,
  out of this repo's scope.
- `npm audit` on a fresh `npm ci`, `main`@`2fba255`: **21 advisories** (3
  critical, 13 high, 3 moderate, 2 low) — unchanged from issue #62
  (2026-10-08) and issue #72 (2026-10-13); PR #73's non-breaking fix (21→7)
  sits unmerged. Not re-litigated as its own candidate tonight (#73 already
  owns it, nothing new found in it).
- PR #63 (2026-10-08, pin the `darwin` entrypoint) and PR #83 (2026-10-18,
  close the nested-manifest/alt-lockfile/case-sensitivity bypass) are both
  still open/unmerged/draft, based on the same stale `main`@`2fba255`. Tonight's
  candidate is applied directly against `main`'s **current, live** inline
  regex (not against #83's branch) so it does not depend on #83 merging
  first; see Consequences below for the resulting, expected, benign overlap.

## Hypothesis (frozen before implementation)

> Given `automerge.yml`'s protected-path regex as the sole gate between an
> `automerge-safe`-labeled PR and an unattended squash-merge, when the
> changed-files list contains exactly `dream.config.json` — the file this
> repo's own nightly routine treats as authoritative for evaluator commands
> and the merge policy itself — then the guard should classify the PR as
> protected (human-review-only), exactly as it already does for
> `package.json`/`SECURITY.md`/`.github/` — subject to: no increase in false
> positives against ordinary source/doc/test changes (including a
> similarly-named but distinct schema file, e.g. issue #50/PR #51's unmerged
> `packages/compile/dream.config.schema.json`), and no change to the guard's
> permissions, trigger, or base-ref checkout semantics.

Not modified after evaluation began. **Confirmed true, not falsified.**

## Candidate

`.github/workflows/automerge.yml` (+6/−1 lines): adds `dream\.config\.json$`
as one more `|`-alternative inside the existing protected-path regex's `^(...)`
group, plus a 4-line explanatory comment. `scripts/automerge-dream-config.test.mjs`
(new, 51 lines): pins the exact pre-fix regex (verbatim, from `main`@`2fba255`
line 38) as `BASELINE_REGEX`, asserts it does **not** protect
`dream.config.json`; pins the fixed regex as `FIXED_REGEX` (must stay
byte-identical to the live workflow string), asserts it **does**; asserts no
new false positive on 6 ordinary/adjacent paths (including
`dream.config.schema.json`); asserts every case the baseline already
protected still is. `vitest.config.ts` (+1/−1): adds `scripts/**/*.test.mjs`
to `test.include` so this suite runs under the real `npm test` evaluator.
Total: 3 files, ~60 changed lines (target <300 comfortably met, one
conceptual change).

No benchmark, gold answer, or evaluation threshold was touched. Like PR #83
before it, this candidate's own future PR is itself blocked from auto-merge
by the very guard it patches (it touches `.github/`) — by design, not a bug.

## Baseline

Parent (`main` HEAD, commit `2fba2550182d81b36423447221823e98e227482a`):
`npm test` → **106/106 passing**, 7 test files. `npm run build` clean (6
workspaces). `npm run lint` clean.

## Evaluation Receipt

Real evaluator (`npm test`, i.e. vitest), run on branch
`dream/2026-10-23-security-adversarial`:

```
$ npm run build   # clean, 0 errors (6 packages)
$ npm test --silent
 ✓ packages/ledger/src/index.test.ts (16 tests)
 ✓ packages/compile/src/index.test.ts (21 tests)
 ✓ packages/cli/src/index.test.ts (31 tests)
 ✓ packages/cli/src/entrypoint.test.ts (8 tests)
 ✓ packages/memory/src/index.test.ts (9 tests)
 ✓ packages/witness/src/index.test.ts (14 tests)
 ✓ packages/schedule/src/index.test.ts (7 tests)
 ✓ scripts/automerge-dream-config.test.mjs (4 tests)   <- new
 Test Files  8 passed (8)
      Tests  110 passed (110)
$ npm run lint    # clean
$ npm run typecheck
tsconfig.json(1,12): error TS18002: The 'files' list in config file … is empty.
```

**Effect**: 106 → 110 tests, **0 regressions**, 4 new tests. `npm run
typecheck`'s pre-existing `TS18002` warning (empty root `tsconfig.json`
files list) reproduces identically on baseline (`git stash`) and candidate —
confirmed environmental/pre-existing, not caused by tonight's change, same
as every prior security-adversarial night (2026-10-08, 2026-10-13,
2026-10-18). `npm audit --json`: 21 advisories, unchanged by this candidate
(touches no manifest).

No live GitHub Actions run of `automerge.yml` was performed — would require
opening a real PR against a protected branch to trigger
`pull_request_target`, deferred to human review after this PR opens, same
constraint PR #83 documented. The vitest suite is the real, deterministic,
reproducible evaluator for the regex logic itself; the workflow diff is a
minimal, inspectable one-line addition to an already-live string.

## Darwin Lineage

**Skipped, deliberately** — same precedent as PR #83. STEP 12 forbids
bounded Darwin from ever disabling safety or changing a safety/promotion
boundary; this candidate *is* a change to the repo's one merge-gate
boundary, so mutating it automatically would violate the rule the mutation
stage is itself bound by. `DARWIN=not-applicable`.

## Evidence

- OBSERVATION: `dream.config.json` (full file, read live tonight) sets
  `evaluatorEntrypoints.darwin = "npx @metaharness/darwin evolve --sandbox
  real"` and `autoMerge: true`; `automerge.yml`'s protected regex (both
  pre-#83 live and #83's unmerged `isProtectedPath()` candidate) contains no
  pattern matching the literal string `dream.config.json`.
- MEASUREMENT: regex test against the literal path `'dream.config.json'` —
  baseline `false`, candidate `true` (4 new unit tests, `npm test` 106→110,
  0 regressions).
- INFERENCE: this is the same vulnerability class PR #83 named — OWASP/CNCF
  **CICD-SEC-5, Insufficient Pipeline-Based Access Controls** (grade B,
  cross-checked against the same OWASP/Cloudsmith/Palo Alto Networks sources
  #83 cited 2026-10-18) — applied to a path #83's own fix did not cover. No
  CODEOWNERS file exists in this repo (checked live) and no other in-repo
  control was found that would already mitigate this independent of the
  automerge guard.
- No named public CVE/GHSA/incident write-up describes this exact
  "autonomous-agent config file excluded from its own merge gate" shape —
  stated plainly, not overclaimed as reproducing a known disclosure.
- HYPOTHESIS (for next rotation, not claimed tonight, extends #83's own
  open item): a path-string allowlist will keep lagging novel
  config/manifest filenames; a content-aware diff classifier (e.g. "does
  this diff hunk touch `evaluatorEntrypoints`/`autoMerge`/`labels` keys in
  *any* JSON file," not just a hardcoded filename) would close this
  structurally rather than one filename at a time.
- DECISION: ship the one-line regex addition plus pinned regression test as
  a draft, human-review-only PR.

## Reward-Hack Check

Independent critic — a fresh subagent with no shared context, per the
compiled nightly instructions — reviewed the diff cold. **Verdict: CLEAR.**
Findings, verbatim-equivalent: the old regex genuinely does not match
`dream.config.json` (hand-verified against the real pre-fix line); the fix
is correctly anchored inside the existing `^(...)` alternation and
introduces no new false positive (`dream.config.schema.json` stays
unmatched); no previously-protected path becomes unprotected; no
benchmark/gold-data/threshold file touched; the new tests are not
tautological (they separately assert baseline-false, fixed-true,
no-new-false-positive, and all-prior-protections-hold, and were independently
re-run). Two minor, non-blocking notes from the critic: (a) this is an
exact-filename anchor, so a renamed copy of the config would evade it — a
pre-existing limitation shared by `package.json$`/`package-lock.json$`, not
introduced by this patch; (b) only one `dream.config.json` exists in this
repo today, so no nested-copy gap currently matters. Both logged, not fixed,
to keep tonight's diff at one conceptual change.

## Security Review

- Least privilege: `automerge.yml`'s `permissions:` block unchanged; this
  candidate adds no new permission, credential, network, or exec surface —
  it is a one-line addition to a bash string already evaluated in-workflow.
- Trust boundary preserved: the `pull_request_target` + base-sha-checkout
  pattern (unchanged by this diff) still means a PR cannot patch the guard
  and have that patch apply to its own run.
- Attack-surface direction: strictly narrowing — adds one protected path,
  loosens none (independently confirmed by the critic).
- Underlying risk being closed is real and specific to this repo's own
  design: `dream.config.json#evaluatorEntrypoints` is executed, including
  via `npx` (arbitrary package-registry code execution) by a future
  autonomous session with repo-write/push credentials — exactly the kind of
  escalation path `witness-every-quantitative-claim` and
  `evaluation-is-not-promotion` exist to keep a human in the loop for.
- Residual/known limitation: exact-filename anchoring, not content-aware
  (see Evidence/HYPOTHESIS) — flagged as next-step research, not fixed
  tonight.
- Evaluated with no model calls (`LLM_EVAL=blocked` — no
  `OPENROUTER_API_KEY`/model credentials present in this environment),
  confined to deterministic static analysis plus the repo's own real test
  suite.

## Scan Findings

**redblue** (adversarial probe of the promotion gate, continuing #83's
2026-10-18 framing): the finding above. `dream.config.json#evaluatorEntrypoints`
still configures no `redblue` key; the 2026-08-13
`npx @metaharness/redblue` silent-no-op finding is unchanged and unpatched
upstream (out of this repo's scope, different repo).

**supply-chain**: (1) the finding above is itself supply-chain-shaped — an
unreviewed merge path to a file that controls which third-party package a
future session will `npx`-execute. (2) `npm audit` on `main` HEAD: 21
advisories (3 critical/13 high/3 moderate/2 low), unchanged since issue #62
(2026-10-08); still correctly human-review-gated; owned by unmerged PR #73,
not re-litigated. (3) PR #63's `darwin` unpinned-`npx` finding is also still
unmerged and unchanged on `main` tonight.

## Competitors

| System | Pipeline/config self-modification guard | Grade |
|---|---|---|
| GitHub's own guidance on `pull_request_target` | Explicitly documents the exact risk class this repo's guard defends against (a workflow with write-level secrets running against untrusted PR content) and recommends base-ref checkout + path gating — the same pattern this repo already uses and tonight extends | A (official GitHub docs) |
| OWASP CICD-SEC-5 "Insufficient Pipeline-Based Access Controls" | Names config-file-scoped access control gaps (not just code/workflow files) as in-scope for this exact category — directly supports tonight's inference that a non-code config file governing agent behavior belongs on the same protected list as `package.json`/`SECURITY.md` | A (official OWASP project page, same source #83 cited) |
| Sakana AI "The AI Scientist" (cited in ADR-0001 and PR #83) | Documented cases of the agent editing its own experiment harness/config rather than fixing underlying issues — the generic failure mode this repo's guarded auto-merge defends against; unchanged from 2026-08-13/2026-10-18's citation | A (vendor's own write-up) |
| OpenHands | Sandboxed security analyzer (InvariantLab) monitors agent *actions*, not specifically which config files a merge gate excludes from auto-merge review — no documented analogue to tonight's specific finding | B (vendor docs, absence confirmed) |
| SWE-agent, DSPy/GEPA, AutoGPT lineage | No public documentation found addressing self-modification of an agent's own merge/promotion-gate configuration specifically (as opposed to code) — unchanged from 2026-08-13/2026-09-08/2026-10-18's citations | C (absence, not evidence of a different design) |

## Gist

No `gh gist create`-equivalent tool available to this session (`gh auth
status`: `GH_TOKEN` invalid — confirmed live tonight, same as every prior
night). The GitHub MCP tools used for issue/PR creation authenticate
separately and work. `GIST=LOCAL` — this committed file is the published
artifact, same convention as every prior night.

## Witness

`dream-machine witness stamp` (equivalently sha256 twice, by hand) hashes
this exact file's raw bytes, so the stamp cannot be written *inside* the
file it stamps without changing the bytes being stamped. This committed
copy is the frozen, hashed artifact; `REPORT_HASH`/`WITNESS` are published
in the PR body and the new `LEDGER.md` row, both pointing back at this file
by path and `SESSION_COMMIT`. Anyone can independently reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-10-23-security-adversarial-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "2fba2550182d81b36423447221823e98e227482a" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo `main`
HEAD at the start of tonight's session — commit subject: "fix(ci): add
actions:read permission to CodeQL workflow (#9)").

## Recommendation

Human review of the draft PR. Not auto-merge-eligible by this repo's own
policy (touches `.github/`), and should not be — this is exactly the
category of gate/safety-boundary edit that must stay human-review-only.
Concrete next steps, not done tonight:

1. **Merge, in priority order, this PR → PR #83 (closes the broader
   nested-manifest/case-sensitivity bypass; the two will need a small,
   human-resolved merge conflict on the same `automerge.yml` line and on
   `vitest.config.ts`'s identical one-line `test.include` addition, flagged
   explicitly here, not hidden) → PR #63 (pins the `darwin` entrypoint this
   finding shows is worth protecting) → PR #73 (npm audit 21→7).** All four
   are now mutually reinforcing, small, and reviewable.
2. **Content-aware classification**, extending #83's and tonight's
   filename-based approach: detect a diff hunk touching
   `evaluatorEntrypoints`/`autoMerge`/`labels` keys in *any* JSON file, not
   only the one hardcoded filename — closes the structural gap rather than
   one instance of it. Not built tonight (out of this candidate's
   one-conceptual-change budget).
3. **Backlog remains purely human-process** (per PR #91's 2026-10-22
   recommendation #2, reconfirmed, not re-audited tonight): apply
   `automerge-safe` or ready-for-review to any of the ~36 clean candidates
   #89 already measured, starting with the smallest.
4. `LEDGER.md` rows 1-6 (2026-08-22 → 2026-08-26) still reference
   issues/PRs/repositories absent from this repo — flagged again tonight
   (6th+ consecutive night), still a distinct, larger decision left to a
   human (issue #33, 2026-09-21, proposed quarantining them; still
   unmerged).
