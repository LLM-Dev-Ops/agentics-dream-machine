# Security-Adversarial / Supply-Chain SOTA Report — 2026-10-13

**Rotation**: `DAYINT=20261013`, `SLOT=3` (`20261013 % 5`) → `DEEP=security-adversarial`,
`SCAN=redblue,supply-chain`. No bonus deep dive (`20261013 % 25 = 13`, `% 75 = 63`).
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a` (`main` HEAD, unchanged
since 2026-09-08 — 7th consecutive security-adversarial night this branch head
hasn't moved, confirming again that no dream-cycle PR has merged in that span).

## TL;DR

Seventh `security-adversarial` touch of this repo. 2026-10-08 shipped this
surface's first real fix in six nights (pinning the `darwin` evaluator
entrypoint) and explicitly deferred a second candidate it had scored and
estimated but not built: a non-breaking `npm audit fix` pass, estimated that
night at "2 of 21 advisories fixable without `--force`" (`js-yaml`,
`source-map-js`). Tonight ships that deferred candidate for real, and the
dry-run estimate was wrong in the generous direction: applying `npm audit fix`
(no `--force`) twice to convergence resolves **14 of 21** advisories — not 2 —
because the `js-yaml`/`source-map-js` bump unlocks a cascade of compatible
non-major bumps through the `@typescript-eslint`/`eslint`/`micromatch`/
`fast-glob`/`braces`/`brace-expansion` dependency chain. Net: **21 → 7**
advisories (2 low→0, 3 moderate→3, 13 high→1, 3 critical→3 — the 3 remaining
criticals, plus the residual 1 high and 3 moderate, are 100% the `vitest@5.x`
major-bump chain, correctly left untouched). `package.json` is untouched in
every workspace — this is a lockfile-only change. `vitest` itself stays
pinned at `2.1.9` throughout (confirmed in the lockfile diff), so the `bench`
evaluator entrypoint's behavior is unaffected by construction, not just by
test count.

## What's new since 2026-10-08 (last security-adversarial night)

| Signal | 2026-10-08 | 2026-10-13 (tonight) |
|---|---|---|
| `npm audit` advisories | 21 (3 critical, 13 high, 3 moderate, 2 low) | 21 unchanged pre-fix → **7 post-fix** (3 critical, 1 high, 3 moderate, 0 low) |
| Non-breaking fix estimate vs. reality | dry-run estimated 2/21 fixable (`js-yaml`, `source-map-js`) | **actual applied fix resolves 14/21** — the dry-run undercounted the transitive cascade |
| `darwin` entrypoint pin | Pinned (PR #63, still unmerged) | Unchanged — out of scope tonight, not re-touched |
| `redblue` configured? | No (6th night) | No (**7th** consecutive night, unchanged since 2026-08-13) |
| `automerge-safe` label | 404 (confirmed) | 404 (confirmed again, live tonight) |
| Open dream-cycle draft PRs | 27 (#12-#61), 0 merged since 2026-09-08 | **35** (#12-#71 range, this PR will be #72), 0 merged since 2026-09-08 (35 days) |
| CodeQL (#10) | red, repo-settings gap, not re-checked that night | Reconfirmed live tonight: still `conclusion: failure` on the latest run (run 38229463161, 2026-10-12) |

## Deep Dive: security-adversarial

**Standing findings, reconfirmed, not re-litigated** (full history in the
2026-08-13 → 2026-10-08 reports, `docs/adrs/ADR-0002`, and `LEDGER.md`):

1. `@metaharness/redblue` is not configured in `dream.config.json#evaluatorEntrypoints`
   at all (only `bench`, `darwin`) — 7th consecutive security-adversarial night
   confirming this, unchanged since 2026-08-13's original silent-no-op finding.
2. CodeQL has never passed on this repository (issue #10, a repo-admin
   Code-Security-settings gap, not a workflow-code problem). Reconfirmed live
   tonight via `actions_list` against the `codeql.yml` workflow: the most
   recent run (`38229463161`, triggered by PR #71's 2026-10-12 push) is
   `status: completed, conclusion: failure`. No new evidence beyond what #10
   already states — re-confirmed rather than re-argued.
3. The dream-cycle PR backlog is now ~35 open drafts, 0 merged since
   2026-09-08 (35 days). `automerge-safe` label returns 404 (`get_label`
   called live tonight) — still does not exist as a repository label.
   **New this-night observation, not previously spelled out this explicitly**:
   reading `.github/workflows/automerge.yml` directly shows the guard's
   protected-path regex (`^(\.github/|packages/[^/]+/package\.json$|package\.json$|package-lock\.json$|...)`)
   explicitly disqualifies **any** `package-lock.json` change — including
   tonight's own candidate — from auto-merge eligibility, independent of the
   already-known missing-label and draft-PR blockers. Three independent gates
   (label doesn't exist, PR opened as draft, lockfile changes are
   protected-path) would each alone keep this PR human-review-only; this is
   belt-and-suspenders by design, not a bug, and this session does not
   propose changing it.

## Candidates (5 proposed, 1 selected)

| # | Candidate | Fit | Novelty | Testability | Measurability | Prod. value | Reviewability | Avg |
|---|---|---|---|---|---|---|---|---|
| **C1 (selected)** | Apply non-breaking `npm audit fix` (defer `--force`/vitest 5.x) | 5 | 3 | 5 | 5 | 3 | 5 | **4.33** |
| C2 | Configure `redblue` entrypoint via `@metaharness/darwin security bench` | 4 | 3 | 2 | 2 | 3 | 2 | 2.67 |
| C3 | `npm audit fix --force` (vitest 5.x, breaking) | 4 | 3 | 4 | 5 | 4 | 1 | 3.5 — rejected: breaking major bump to the `bench` evaluator's own toolchain is exactly the kind of risky, hard-to-review change this repo's own discipline (one conceptual change, small diff) argues against shipping unreviewed; also duplicates dependabot PR #1's open scope |
| C4 | Create `automerge-safe` label + undraft path | 2 | 1 | 3 | 3 | 4 | 2 | 2.5 — excluded on authority grounds again (PR #37/#47/#62 precedent: this session does not have standing to change merge policy unilaterally) |
| C5 | Escalate CodeQL repo-settings gap (comment only) | 3 | 1 | 1 | 1 | 3 | 5 | 2.33 |

C1 selected: it is the exact candidate 2026-10-08's report scored (4.33, "next
candidate") and deliberately deferred to keep that night's PR to one
conceptual change. Tonight has no reason to re-score from scratch — the
scoring stands, and shipping a deferred, already-vetted candidate rather than
inventing a new one keeps the backlog from growing with yet another
unreviewed direction.

## Hypothesis (frozen before implementation)

> Given this repo's 21 `npm audit` advisories (3 critical, 13 high, 3
> moderate, 2 low), all 100% devDependency-scoped, when `npm audit fix`
> (without `--force`) is run to convergence, then the advisory count should
> drop to only the subset requiring a semver-major bump (the `vitest@5.x`
> chain: `tinypool`, `vitest`, `@vitest/coverage-v8`, `@vitest/mocker`,
> `esbuild`, `vite`, `vite-node`) — subject to: zero `package.json` changes in
> any workspace, `vitest`'s own resolved version must stay unchanged (so the
> `bench` evaluator entrypoint's behavior cannot regress by construction, not
> only by observed test count), `npm test` shows 0 regressions, and no
> benchmark/gold-data/threshold file is touched.

## Evaluation Receipt

Real evaluator only, no mocking, both runs via this repo's own `bench`
entrypoint (`npm test`).

- `npm ci && npm run build`: clean, all 6 workspace packages, baseline and
  candidate.
- `npm audit --json`, fresh `npm ci`, **baseline** (commit `2fba255`, before
  any fix): 21 advisories — 2 low, 3 moderate, 13 high, 3 critical. Identical
  breakdown to 2026-10-08's recorded baseline (no drift in 5 days).
- `npm audit fix` (no `--force`), run twice to convergence (1st pass: 21→8;
  2nd pass: 8→7, one residual `brace-expansion` advisory needed a second
  pass) → **candidate**: 7 advisories — 0 low, 3 moderate, 1 high, 3 critical.
  All 7 remaining require `--force` (confirmed via `npm audit fix --dry-run`
  and `npm audit` itself, both post-fix): `tinypool` (critical),
  `@vitest/coverage-v8` (critical), `vitest` (critical), `@vitest/mocker`
  (moderate), `esbuild` (moderate), `vite` (moderate/high — nested), `vite-node`
  (moderate) — the single `vitest@5.x` major-bump chain.
- `git diff --stat`: only `package-lock.json` changed (662 lines: 248
  insertions, 414 deletions). Zero `package.json` files touched in any
  workspace (`git diff --stat package.json packages/*/package.json` empty).
- `grep '"node_modules/vitest":' package-lock.json` post-fix: `"version":
  "2.1.9"` — **unchanged**, confirms the `bench` entrypoint's own dependency
  did not move; this is a structural guarantee, not just an empirical test
  count.
- `js-yaml`: `4.0.0-4.3.1` (vulnerable range, GHSA-2883-xcg3-v3hh) →
  `4.3.2` (patched). `source-map-js`: `1.0.0-1.2.1` (vulnerable,
  GHSA-68fv-2mgg-jv7q) → `1.2.2` (patched). `@typescript-eslint/*` chain:
  `8.15.0` → `8.71.2` (same major, within the workspace's own `^8.x` range).
- `npm test --silent`: **106/106** both baseline and candidate — 0
  regressions, 0 tests added/removed/modified (this is a lockfile-only
  change; no test file touched).
- `npm run lint`: clean, both states.
- `npm run typecheck`: pre-existing `tsconfig.json` "files list is empty"
  error (`TS18002`), reproduced identically on baseline via `git stash` —
  confirmed **preexisting**, unrelated to this candidate, same error reported
  2026-10-08.
- Independent critic subagent re-derived all of the above from scratch
  (own `npm audit --json`, own `git stash`/baseline re-measurement, own
  `npm test` runs) rather than trusting this report's numbers — see
  Reward-Hack Check.

## Darwin Results

`DARWIN=not-applicable` — the candidate is a single deterministic
`npm audit fix` convergence with no evolvable parameter space (same
reasoning as every prior security-adversarial night that shipped a small,
exhaustively-verified candidate rather than a mutable population).

## Evidence

- OBSERVATION: 2026-10-08's report scored and deferred "non-breaking `npm
  audit fix` (`js-yaml`, `source-map-js`)" as candidate C2 (4.33/5), citing
  only wanting to keep that night's PR to one conceptual change — not any
  defect in the candidate itself.
- MEASUREMENT: `npm audit --json` baseline (tonight, fresh `npm ci`) — 21
  advisories, identical breakdown to 2026-10-08 (no drift).
- MEASUREMENT: `npm audit fix` to convergence (2 passes) — 21 → 7 advisories.
- MEASUREMENT: `npm test` 106/106 unchanged pre/post fix.
- INFERENCE: the 2026-10-08 dry-run estimate ("2 of 21 fixable") undercounted
  because `npm audit fix --dry-run`'s per-advisory "fix available" listing
  does not surface transitive-cascade unlocks the same way actually applying
  and re-resolving does — worth flagging as a general caution for future
  nights that plan a candidate size from a dry-run count alone.
- DECISION: ship the convergent non-breaking fix only; do not run `--force`
  (would bump `vitest` major, duplicating dependabot PR #1's open,
  unreviewed-by-this-session scope, and would touch the `bench` entrypoint's
  own toolchain — a materially bigger, riskier, less reviewable change than
  tonight's).
- DECISION: do not create the `automerge-safe` label, do not touch
  `.github/workflows/automerge.yml`, do not configure `redblue` — all three
  are either human-decision territory (established PR #37/#47/#62 precedent)
  or out of this repo's scope (upstream `@metaharness/redblue` package).

## Reward-Hack Check

Independent critic (separate subagent, not this candidate's author)
re-derived the before/after `npm audit` counts from a fresh `npm ci` +
`git stash` round-trip rather than trusting this report, re-ran `npm test`
on both states, confirmed the diff touches only `package-lock.json`, and
spot-checked `js-yaml`/`source-map-js`'s resolved versions against their
GHSA patched-version ranges.

**Verdict: CLEAR of reward-hacking.** No test, benchmark, gold-data,
threshold, or scoring file touched. `npm audit fix` without `--force` only
ever moves a package to a real newer published version that satisfies the
existing `package.json` semver range — it cannot "fix" an advisory by
rewriting metadata without updating the installed code, and the critic
confirmed the installed `js-yaml`/`source-map-js` versions are genuinely
past their vulnerable ranges, not just relabeled. No hidden cost: the fix
is free (no code behavior change, same `vitest` version, same test count).
No cherry-picking: the 7 advisories that remain unresolved are reported in
full, including that 3 are still critical.

## Security Review

- No new runtime attack surface: strictly reduces `npm audit`'s advisory
  count (21→7) in a devDependency-only workspace (0 production dependencies,
  unchanged since 2026-08-13).
- Supply-chain: closes `js-yaml` CPU-DoS (GHSA-2883-xcg3-v3hh, high) and
  `source-map-js` event-loop DoS (GHSA-68fv-2mgg-jv7q, high) plus 12 further
  transitively-unlocked advisories (`@typescript-eslint/*` chain, `eslint`,
  `@eslint/plugin-kit`, `micromatch`, `fast-glob`, `braces`,
  `brace-expansion`) — none of these are reachable from this workspace's
  production surface (there is none), but a contributor's local `eslint`/
  `tsc` toolchain is now meaningfully narrower.
- Does **not** close the 3 critical advisories (`tinypool` RCE-adjacent
  prototype pollution, `vitest` arbitrary file read, `@vitest/coverage-v8`) —
  these remain, correctly, behind the `vitest@5.x` major bump this candidate
  deliberately did not take. Still not exercised by this repo's `npm test`
  (`vitest run`, never `--ui`), same narrow-live-exposure reasoning as every
  prior night back to 2026-09-08.
- No credential exposure, no prompt-injection surface change (no LLM-calling
  code touched; `LLM_EVAL` not invoked tonight either), no MCP/tool-authority
  change.
- **New this-night finding** (see Deep Dive §3): `.github/workflows/automerge.yml`'s
  protected-path guard explicitly disqualifies this very PR (it changes
  `package-lock.json`) from auto-merge, independent of the already-known
  missing-label and draft-PR blockers. Confirms the guard is layered
  correctly for exactly this kind of change — not a gap, a working control.
- `redblue`/CodeQL/auto-merge-label: reconfirmed unaddressed, explicitly left
  to human decision (Candidates table, C2/C4/C5).

## Scan: redblue

No `redblue` key in `dream.config.json#evaluatorEntrypoints` — 7th
consecutive night confirming this, unchanged since 2026-08-13. The
underlying `@metaharness/redblue` silent-no-op finding stands, unpatched
upstream, out of this repo's scope.

## Scan: supply-chain

`npm audit`: 21 → 7 advisories via non-breaking `npm audit fix` to
convergence (3 critical, 1 high, 3 moderate, 0 low remaining — all behind
the `vitest@5.x` major-bump chain). 0 production-dependency advisories,
unchanged since 2026-08-13. See Evaluation Receipt and Evidence above for
the full before/after and the dry-run-vs-actual discrepancy worth flagging
for future nights.

## Competitors

Carried forward from 2026-10-08/09-28 (Grade C/B, not re-verified tonight —
disproportionate to re-verify for a lockfile-only candidate; no public
material found in passive awareness that would change any grade):

| System | Autonomous dependency-remediation stance | Grade |
|---|---|---|
| Sakana AI Scientist | No documented autonomous dependency-patching pathway; human review load-bearing | C |
| OpenHands | "Stuck Detector" for behavioral stalls; no documented supply-chain auto-remediation practice | B |
| DSPy/GEPA | Metric-based scoring; no documented dependency-patching practice | C |
| SWE-agent | Guardrails intentionally 100%-precision; no documented automated non-breaking-vs-breaking fix triage | C |
| Dependabot (GitHub-native) | Does exactly this triage natively (security updates vs. version updates) — this repo's own dependabot PR #1 (open 40 days, breaking `vitest@5.x` bump) is the direct comparison point; tonight's candidate is the narrower, non-breaking subset dependabot's grouped PR does not offer standalone | A (this repo's own live dependabot PR, directly observed) |

## LLM-Eval Status

`LLM_EVAL=blocked` — `OPENROUTER_API_KEY` not set in this environment. No
model-calling evaluation attempted or fabricated. Consistent with every
prior night back to 2026-09-08.

## Gist

No `gh gist create`-equivalent tool available to this session (confirmed
again tonight: same GitHub-proxy restriction as every prior night).
`GIST=LOCAL` — committed as this report file,
`docs/dream-cycle/2026-10-13-security-adversarial-report.md`.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so the
stamp cannot be written inside the file it stamps. The committed copy at
`docs/dream-cycle/2026-10-13-security-adversarial-report.md` is the frozen,
hashed artifact; this section is filled in immediately before that file is
committed, over content identical up to this point. Anyone can independently
reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-10-13-security-adversarial-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at the
start of tonight's session — unchanged since 2026-09-08). REPORT_HASH and
WITNESS are published in the PR body and the `LEDGER.md` row, both pointing
back at this file by path and session commit.

## Recommendation

`evaluated: accepted`. Human review of the draft PR (lockfile-only change,
21→7 `npm audit` advisories, 0 regressions, independently re-verified by a
separate critic subagent). Next steps not done tonight, in priority order,
unchanged in substance from 2026-10-08 but now one item shorter:

1. Merge or close each of the ~35 open dream-cycle draft PRs (#12-#71,
   including this one) — the standing, escalating, highest-leverage action
   across every surface, not unique to security-adversarial. 35 days, 0
   merges.
2. Decide `npm audit fix --force`'s breaking `vitest@5.x`/`eslint@10`/
   `typescript@7.x` bump (dependabot PR #1, 40 days open) — this closes the
   3 remaining critical advisories but requires evaluating the `bench`
   entrypoint's own toolchain for breakage, a materially bigger review than
   tonight's.
3. Resolve the `automerge-safe` label + draft-forever gap (PR #37's
   diagnosis, unaddressed 20 nights) — tonight additionally confirms the
   protected-path guard in `automerge.yml` would separately block any
   `package-lock.json`-touching PR regardless, so this is strictly a
   human/governance decision, not a 3-line code fix.
4. Enable Code Security in repo Settings to let CodeQL (#10) run at all —
   reconfirmed red again tonight, unchanged since 2026-09-08.

This session does not merge, self-approve, self-promote, or change
repository settings.
