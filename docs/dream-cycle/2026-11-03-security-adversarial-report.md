# Dream Machine Supply-Chain SOTA Report — 2026

**Date:** 2026-11-03 · **Deep dive:** security-adversarial · **Scan:** redblue, supply-chain
**Session commit:** 2fba2550182d81b36423447221823e98e227482a
**Slot:** 20261103 % 5 = 3

## TL;DR

The repo's production surface has **zero** third-party runtime dependencies
(`npm audit --omit=dev` = 0/0/0/0/0) — confirmed again tonight. All 24 current
`npm audit` advisories (1 low, 16 moderate, 4 high, 3 critical) live entirely in
the eslint/vitest devDependency toolchain. That part of the story is stable and
good.

The new finding tonight is not "there are vulnerabilities" (reconfirmed nightly
since 2026-09-08) — it is that **the already-open fix for this has decayed while
waiting for review**. PR #73 (2026-10-13, draft, still open) claimed
"21→7 advisories." Re-running `npm audit` against PR #73's own lockfile today,
unchanged, now reports **20** advisories (0 low, 16 moderate, 1 high, 3
critical) — 13 more than it reported three weeks ago, with zero code change on
that branch. The vulnerability database grew out from under a fix nobody
reviewed. Review latency has a measurable, compounding security cost, separate
from and additional to "the fix just isn't merged yet."

## What's new vs. the last `security-adversarial` nights

- 2026-08-13 (#6/#7): first real finding, entrypoint-liveness classification. ACCEPT, merged.
- 2026-09-08 (#7/#8): wired `evaluatorEntrypoints`; "8 advisories (2 critical), devDependencies only." ACCEPT, merged — **last merge the repo has ever had.**
- 2026-10-08 (#62/#63): darwin entrypoint pinned; noted 9→21 advisories. Open, unmerged.
- 2026-10-13 (#72/#73): non-breaking `npm audit fix`, claimed 21→7. Open, unmerged, now stale (see above).
- 2026-10-28 (#102/#103): pin GitHub Actions `uses:` refs to commit SHA. Open, unmerged.
- **Tonight:** quantify fix decay under review latency; produce a fresh, current, tiny non-breaking audit-fix candidate; make the backlog's *security* cost explicit rather than just its existence (already reconfirmed 10+ times in #19, #27, #36, #42, #46, #60, #70, #84, #88, #90, #92, #102, #104, #108, #110, #112).

## Competitors / prior art (evidence grades)

| System | Relevant practice | Grade |
|---|---|---|
| Dependabot (native, already configured here: `.github/dependabot.yml`) | groups all devDependency bumps into one weekly PR; does not re-run on "a security PR is stale," only on calendar schedule | A (official docs) |
| OSV-Scanner / `osv-scanner fix` | re-resolves against a point-in-time OSV snapshot per invocation, same decay property as `npm audit` | A (official repo) |
| Socket.dev / Snyk | continuously re-scores *open* PRs against new advisories, surfacing "this PR is now stale" — the capability this repo's static one-shot audit lacks | B (vendor, cross-checked against public docs) |
| Sakana AI Scientist incident | reward-hacking from grading its own work; not directly applicable here since tonight's change is dependency-only with no self-graded metric | A (widely reported, already cited in this repo's README) |
| GEPA/DSPy, OpenHands, SWE-agent, AutoGPT lineage | none publish a "time-decay of an already-proposed fix" metric for dependency PRs; this is a gap in the field, not just this repo | C (absence claim, single-source survey) |

## Frozen hypothesis (frozen before evaluation; see STEP 3.3)

> Given the current `main` branch and the already-open, non-breaking
> `npm audit fix` candidate from PR #73, when a fresh non-breaking
> `npm audit fix` is run against **today's** lockfile, then the advisory count
> will drop from 24 to a number strictly between 7 (PR #73's three-week-old
> claim) and 24 (today's baseline), demonstrating that (a) the audit database
> has moved past PR #73's claimed result and (b) a fresh fix still recovers
> most — not all — of the achievable non-breaking reduction, subject to: zero
> new test failures, zero production dependency changes, and no change to
> evaluation gates, thresholds, or `package.json` dependency-type boundaries.

## Evaluation receipt (real evaluator, no model calls — `LLM_EVAL=blocked`)

| Step | Command | Result |
|---|---|---|
| Baseline build | `npm run build` | clean, 0 errors |
| Baseline tests | `npm test` | **106/106 pass** |
| Baseline audit | `npm audit --json` | 24 total (1 low, 16 moderate, 4 high, **3 critical**) |
| Baseline prod-only audit | `npm audit --omit=dev --json` | **0/0/0/0/0** |
| PR #73 branch, re-audited today | `npm audit --package-lock-only` on PR #73's `package-lock.json` (fetched `pull/73/head`, no code change) | **20** total (0 low, 16 moderate, **1 high**, 3 critical) — not the "7" the PR title claims |
| Candidate fix | `npm audit fix` (non-breaking only) on fresh branch from today's `main` | 24 → **21** total (0 low, 16 moderate, **2 high**, 3 critical); 1 file changed (`package-lock.json`, +249/−415 lines, auto-generated); 24 packages bumped, all semver-minor/patch (eslint 9.15.0→9.39.5, typescript-eslint 8.15.0→8.72.1, js-yaml 4.3.1→4.3.2, etc.) |
| Candidate build | `npm run build` | clean, 0 errors |
| Candidate tests | `npm test` | **106/106 pass**, 0 regressions |
| Candidate lint | `npm run lint` | clean |
| Remaining advisories | — | all 21 require `npm audit fix --force` (vitest major 2.x→5.x) — correctly deferred, breaking, out of scope for a tiny candidate |

Evidence classification: baseline/candidate audit and test counts are
**MEASUREMENT** (directly observed command output); "review latency has a
compounding cost" is an **INFERENCE** from two measurements three weeks apart,
not itself re-measured as a rate — flagged as the open uncertainty below, not
stored as a measurement.

## Darwin

Not run. `@metaharness/darwin` is not installed in this workspace
(`node_modules/@metaharness` absent) and this candidate has no fitness
landscape (a lockfile bump is not a mutable genome) — correctly out of scope,
not a degradation.

## Reward-hack / adversarial critique (independent pass)

- Did the candidate touch any gold answer, benchmark corpus, or test file? **No** — diff is `package-lock.json` only.
- Did it alter a threshold, a gate, or `package.json`'s dependency-type boundaries? **No** — zero packages moved between `dependencies` and `devDependencies`.
- Did it cherry-pick a flattering metric? **No** — the report states the *remaining* 21 advisories and the *why* (breaking-only) rather than stopping at "fixed some."
- Does it rely on an undocumented cache or non-reproducible state? **No** — `npm audit fix` against a public registry is independently reproducible by any reviewer from the pushed branch.
- Is the "PR #73 decayed" claim itself fair to PR #73's author (this same session, a prior night)? Yes — it is a re-measurement of the same artifact at two points in time, not a claim about effort or quality at the time it was opened.
- **Critic verdict: clear.** No reward-hacking signal found.

## Security review

- Threat surface: devDependency-only (eslint/vitest toolchain). Production CLI (`packages/{cli,compile,ledger,memory,schedule,witness}`) carries **zero** third-party runtime dependencies — confirmed via per-package `package.json` inspection, not just root-level audit.
- No credential, filesystem, or network scope change. No CI permissions touched.
- `npm audit fix` (non-force) only ever moves within semver ranges already declared in `package.json` — it cannot introduce a new top-level dependency or widen a version range beyond what the maintainer already accepted.
- This PR is dependency-manifest-only → **ineligible for guarded auto-merge by this repo's own policy** (`automerge.yml` refuses any PR touching dependency manifests). Human-review-only, by design, no exception requested.

## Witness

```text
REPORT_HASH = sha256(this file's bytes)
SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a
WITNESS = sha256(REPORT_HASH || SESSION_COMMIT)
```

The stamp hashes this exact file's raw bytes, so — as in every prior report —
it cannot be written *inside* the file it stamps. This committed copy at
`docs/dream-cycle/2026-11-03-security-adversarial-report.md` is the frozen,
hashed artifact; the actual REPORT_HASH and WITNESS values are published in
the PR body and `LEDGER.md` instead. Anyone can independently reproduce them
(5 steps, coreutils only; this file is committed to the repo in lieu of a
public gist — see "Gist" below for why):

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-11-03-security-adversarial-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "2fba2550182d81b36423447221823e98e227482a" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

## Gist

**Not published.** Gist creation (`gh api -X POST gists`) was denied by this
session's own autonomous-mode permission classifier under "Public
Data-Sharing Upload" — correctly so: nobody is watching this unattended run to
approve an outbound publish to a third-party host. This report is committed to
the repo instead, which is itself inspectable and witness-stamped. Treat this
as `FALLBACK=partial` for publication purposes only; GitHub issue/PR creation
(in-scope, same repo, not a third-party host) proceeded normally.

## Recommendation (next steps)

1. **Immediate, no-risk:** merge this candidate PR (`package-lock.json` only, 0 regressions, 24→21 advisories) — or merge #73 instead, but re-run `npm audit` on it first since its "7" claim is stale.
2. **This week:** either merge or explicitly close/supersede the 59-PR, 0-merge-since-#8/#9 backlog (oldest unmerged candidate: #12, 2026-09-09 — 55 days). This has been reconfirmed in at least 16 prior nightly issues; tonight adds the specific cost model (decay rate on a security fix) rather than a 17th restatement of "the backlog exists."
3. **Medium-term:** the 3 critical advisories (`@vitest/coverage-v8`, `tinypool`, `vitest` — all requiring `vitest` 2.x→5.x) need a dedicated, larger, human-scoped upgrade night — correctly out of scope for a "tiny, one-parameter" candidate per tonight's learning-signal bias.
