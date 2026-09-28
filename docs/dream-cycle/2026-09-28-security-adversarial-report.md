# Security-Adversarial SOTA Report — 2026

## TL;DR

Tonight's mechanical slot (`DAYINT % 5 == 3`) selects `DEEP=security-adversarial`,
`SCAN=redblue,supply-chain`. Every security-surface signal this scan can reach
(npm audit, CodeQL, redblue entrypoint config) reconfirms a finding already on
record from 2026-08-13 / 2026-09-08 / 2026-09-18 (#10, #27) with no material
change. There is no new, previously-unaddressed, testable security finding
tonight. `EVALUATED=no`, `VERDICT=INCONCLUSIVE`.

The real finding is not about security surfaces — it is about this repository's
own control loop. **19 consecutive `dream-cycle` PRs (#12–#45, 2026-09-09
through 2026-09-27) are open, draft, and unreviewed. Zero have ever merged.**
`main`'s `docs/dream-cycle/LEDGER.md` — the routine's own "durable cross-night
memory" — has not been updated since the 2026-09-08 row (row 9): 19 nights of
evidence exist only on orphaned branches main has never seen. PR #37
(2026-09-23) already root-caused why auto-merge can never fire (draft-forever
PRs + the `automerge-safe` label is never created) and explicitly left the fix
to a human, "well above reviewing this specific PR." Six nights later
(tonight), nothing has changed: the label still 404s, `automerge.yml`'s
`guard-and-merge` job has now skipped 63/63 runs, and CodeQL is still red on
`main` itself (run #52, scheduled, 2026-09-28T07:23:38Z, `conclusion: failure`
— the exact failure mode PR #9 attempted and did not fix, per #10/#27).

## What's new

Nothing, on the security-adversarial surface specifically. What changed since
2026-09-08's row 9 (`ec2052a`/`367f775`-era baseline):

- npm audit: 9 advisories (2 critical, 2 high, 3 moderate, 2 low), up from 8
  (2 critical) on 2026-09-08 — one additional advisory, same severity
  ceiling. **0 vulnerabilities in production dependencies** (`npm audit
  --omit=dev`); all 9 are devDependencies (`vitest`/`esbuild`/`vite` chain,
  `js-yaml` via a dev toolchain). Not new in kind, reconfirmed in degree.
- `dream.config.json` `evaluatorEntrypoints` still has no `redblue` key —
  reconfirms the 2026-09-08 finding verbatim.
- CodeQL: still red, now on a **fresh scheduled run against `main` itself**
  (not just PR heads) — `analyze` job failure, same class of error PR #9
  (2026-09-08) attempted to fix by adding `actions: read` and did not
  resolve (escalated on issue #10, reconfirmed #27 on 2026-09-18: "0/30 runs
  ever green"). Tonight: still 0/N ever green.

None of this clears the testability gate for a *new* candidate: same root
causes, same severity, same scope, no new evidence justifying reopening a
direction already investigated and left open on #10/#19/#27/#36.

## Competitors (context, unchanged from prior nights, Grade C — not
re-verified tonight, carried forward for continuity)

| Competitor | Relevant practice |
|---|---|
| Sakana AI Scientist | Automated paper-writing loop; no reported guarded-merge/backlog-governance mechanism in public materials. |
| OpenHands | Human-in-the-loop PR review is a first-class UX surface, not an afterthought bolted onto CI. |
| DSPy/GEPA | Optimization loop reports a Pareto frontier for a human to pick from — does not attempt autonomous promotion. |
| SWE-agent | Produces patches for human review; no autonomous merge path exists in the reference implementation. |

## Hypothesis

None frozen. STEP 5's testability gate fails before a hypothesis is
warranted: every candidate security finding available to this session tonight
is a reconfirmation of an already-open, already-evidenced finding (#10, #19,
#27, #36/#37), and this repo's own discipline says "Do not rediscover a failed
direction unless new evidence justifies reopening it." No new evidence exists.

## Evaluation

- `npm ci && npm run build`: clean (`buildStep` probe passes).
- `npm test --silent`: **106/106 passed**, `main` @ `2fba255` — unchanged
  baseline, matches PR #45's disclosed baseline exactly.
- `npm audit --omit=dev`: 0 vulnerabilities (prod). `npm audit` (all): 9
  advisories, 2 critical, 2 high, 3 moderate, 2 low, 0 info — all
  devDependency-scoped.
- CodeQL (`workflow_id=codeql.yml`), most recent run: id `36391404082`,
  `event=schedule`, `head_branch=main`, `head_sha=2fba255`,
  `conclusion=failure`, `2026-09-28T07:23:38Z`.
- `automerge.yml` (`Guarded auto-merge`), most recent run: id `36308949790`
  (PR #45), `conclusion=skipped` — consistent with 63/63 historical runs
  never passing the `automerge-safe` label guard (label confirmed absent via
  live `get_label` lookup tonight: 404).
- `LLM_EVAL=blocked` — no `OPENROUTER_API_KEY` in this session; no model-call
  evaluation attempted or fabricated.

No candidate diff was produced tonight (STEP 5 gate: not testable as a *new*
finding). No baseline-vs-candidate comparison applies.

## Darwin Results

`DARWIN=not-applicable` — no candidate to evolve.

## Evidence

- OBSERVATION: `docs/dream-cycle/LEDGER.md` on `main` HEAD (`2fba255`) has 9
  rows, most recent 2026-09-08. `git log --oneline --all | grep -c
  dream-cycle` = 1 (only this session's own upcoming commit will add a
  second — every other night's dream-cycle work lives solely on unmerged
  branches, invisible to `git log --all` on this checkout beyond their PRs).
- MEASUREMENT: `list_pull_requests(state=all)` → 19 open, draft,
  `dream-cycle`-titled PRs (#12,14,16,18,20,22,23,24,26,28,30,31,33,35,37,
  39,41,43,45), 0 merged; 2 closed-unmerged (#8, #9 — #9 was a direct CI fix,
  not evaluated as a dream-cycle candidate).
- MEASUREMENT: `get_label('automerge-safe')` → 404, tonight, 2026-09-28.
- MEASUREMENT: CodeQL `list_workflow_runs`, most recent 3 runs (2 PR heads +
  1 scheduled `main` run), all `conclusion=failure`.
- INFERENCE: the guarded auto-merge pathway described in `dream.config.json`
  (`autoMerge: true`) and in every PR's "Merge Policy" section is dead code
  under current repo state — PR #37 (2026-09-23) reached the same inference
  independently five nights ago and it still holds.
- DECISION: do not open an 20th unreviewed draft PR duplicating a
  reconfirmation of #10/#19/#27/#36/#37's findings. Record tonight as
  `INCONCLUSIVE` with the backlog escalation as the primary artifact, per
  STEP 5 ("If the finding is not testable tonight ... document and file the
  issue").

## Reward-Hack Check

N/A — no candidate diff to critique. Independent-critic review is not
applicable to a no-candidate night.

## Security Review

- No new attack surface touched (no code candidate).
- Supply-chain: 9 dev-only advisories, 0 in production dependency graph —
  same conclusion as row 9, degree only (+1 advisory, same severity ceiling).
- CodeQL red-on-`main` is itself a security-process finding: static analysis
  has not successfully completed on this repository's default branch since
  at least issue #10 was filed. This is now reconfirmed on a `main`-branch
  scheduled run, not just PR-triggered runs — ruling out "only PR context is
  broken" as an explanation.
- No credential exposure, no prompt-injection surface change, no MCP
  authority change tonight.

## Scan: redblue

`dream.config.json` `evaluatorEntrypoints` has no `redblue` key (only `bench`,
`darwin`). Reconfirms the 2026-09-08 finding verbatim — no redblue evaluator
is configured for this repository, so no redblue-specific evidence can be
produced tonight (or any night, until a `redblue` entrypoint is added to
config).

## Scan: supply-chain

`npm audit` (full, all dependency types): 9 advisories — 2 critical, 2 high, 3
moderate, 2 low — 0 in production dependencies (`npm audit --omit=dev` is
clean). All 9 trace to the `vitest@2.x` → `vite`/`esbuild` chain and a pinned
`js-yaml` range inside devDependencies. `npm audit fix` (non-forcing) would
address the `js-yaml` high; the `esbuild`/`vite`/`vitest` chain requires
`--force` (breaking, `vitest@5.x`) — out of scope for a no-candidate night,
flagged for a future evaluation-adapters or developer-experience night to
evaluate the `vitest` major-version bump under real tests.

## Competitors / Next Steps

1. **Human triage of the 19-PR backlog** (#12 through #45) — merge, close, or
   explicitly reject each; every night this continues unaddressed, the
   ledger's own cross-night memory guarantee degrades further (`main` is now
   19 nights of evidence behind its own drafts).
2. **Decide the auto-merge pathway's fate**: either (a) a human creates the
   `automerge-safe` label and a human (not this session) changes STEP 20-25's
   unconditional draft mandate for low-risk candidates, or (b) `autoMerge` is
   set to `false` in `dream.config.json` and the compiled routine stops
   describing a policy that cannot execute.
3. **Root-cause CodeQL red-on-`main`** independently of any dream-cycle
   candidate — PR #9's `actions: read` fix (2026-09-08) did not resolve it;
   issue #10 has been open since and reconfirmed on #27 and again tonight
   with a fresh scheduled-run failure. This is a repo-settings-level
   investigation a maintainer is better positioned to make than another
   nightly candidate diff.

## Witness

Deliberately **not embedded in this file** — writing a hash of this file's own
content back into itself is the exact self-reference bug issue #29
(2026-09-19) found in 6/10 backfilled nights. The witness triple
(`report_sha256`, `session_commit`, `witness`) is computed from this file's
**committed git blob** after this commit lands, and recorded in the ledger row
and PR/issue bodies instead. Verify: `git show <branch-HEAD>:docs/dream-cycle/2026-09-28-security-adversarial-report.md | sha256sum`,
then `printf '%s%s' "$REPORT_HASH" "2fba2550182d81b36423447221823e98e227482a" | sha256sum` —
must equal the witness value recorded in the ledger row for 2026-09-28.
