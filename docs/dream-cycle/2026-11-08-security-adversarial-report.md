# Security-Adversarial / Supply-Chain SOTA Report — 2026-11-08

## Rotation

`DAYINT = 20261108`, `DAYINT % 5 = 3` → `DEEP=security-adversarial`,
`SCAN=redblue,supply-chain`. No bonus moduli (`% 25`, `% 75` both nonzero).
`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (main HEAD,
unchanged since 2026-11-07).

## Ledger Check / Learning Signals

`docs/dream-cycle/LEDGER.md` on `main` still has not gained a row since
2026-09-08 (row 9, PR #8) — because a ledger row only lands on `main` when
its PR merges, and zero dream-cycle PRs have merged since #8/#9. GitHub
issues/PRs now run through #123 (2026-11-07). Confirmed live tonight:
**61 open PRs, all draft, 0 merged since #9**; oldest open PR is #12
(2026-09-09, 60 days). This exact finding has now been independently
reconfirmed by at least 18 prior nights (#19, #27, #36, #42, #46, #58, #60,
#70, #76, #84, #88, #89, #90, #92, #102, #104, #108, #110, #112, #114).
`zeroMergeStreak = true` → tonight is biased toward a tiny, additive,
easily-reviewable contribution, and — per STEP 2 ("do not rediscover a
failed direction") — away from re-deriving a candidate this backlog already
contains unmerged.

**Scope check before building anything** (STEP 2, internal evidence before
research): this repo's `security-adversarial`/`redblue`/`supply-chain`
surface already has, sitting open and unmerged, essentially every
cheap/obvious fix: `automerge-safe` label absence (#20, 2026-09-13),
automerge draft-forever unreachability (#37, 2026-09-23), the guard's
protected-path regex bypass (#83, 2026-10-18), `dream.config.json`'s
exclusion from that same guard (#93, 2026-10-23), the unpinned `darwin`
`npx` entrypoint (#63, 2026-10-08), GitHub Actions `uses:` SHA-pinning
(#103, 2026-10-28), and two generations of `npm audit fix` (#73 2026-10-13,
#115 2026-11-03). Re-deriving any of these tonight would be exactly the
"rediscover a failed direction" the compiled prompt warns against. Tonight
instead asks a question **none of those reports answer**: *if a human sat
down today to clear this backlog, could these 7 PRs actually be merged
in the order they were opened?*

## Deep Dive: real merge-readiness audit of the security-adversarial surface

Fetched all 7 open, non-docs-only security-adversarial candidate PRs
(`#20, #63, #73, #83, #93, #103, #115`) as real branches
(`pull/<N>/head`) against real, live `main` (`2fba255`) — no simulation.

**Step 1 — each PR individually, via `git merge-tree` (no working-tree
checkout needed, deterministic, no side effects):**

| PR | vs `main` | Result |
|---|---|---|
| #20 | static supply-chain pin-check | clean (merge-tree `a1603b5`) |
| #63 | darwin entrypoint pinned | clean (merge-tree `8cfa35d`) |
| #73 | npm audit fix 21→7 (stale, see #114) | clean (merge-tree `968c441`) |
| #83 | protected-path regex bypass fix | clean (merge-tree `6088aff`) |
| #93 | `dream.config.json` guard exclusion fix | clean (merge-tree `7e71e60`) |
| #103 | GH Actions SHA-pinning | clean (merge-tree `b113492`) |
| #115 | npm audit fix 24→21 | clean (merge-tree `288f95e`) |

**Every single PR, taken alone against today's `main`, is 100% conflict-free.**
This on its own is new evidence refining #89's 2026-10-21 finding
(36/40 of a 40-PR *all-surface* sample mergeable) to this specific 7-PR
security-adversarial subset: 7/7 (100%) individually clean.

**Step 2 — sequential stacking, oldest-first (`#20 → #63 → #73 → #83 → #93
→ #103 → #115`), real `git merge --no-edit` on a scratch branch (not pushed,
discarded after measurement):**

- `#20` merges cleanly onto `main`.
- `#63` **conflicts** merging onto `#20` — in `docs/dream-cycle/LEDGER.md`.
  Every one of these 7 PRs appends its own ledger row at the same insertion
  point; any two together conflict there by construction, 100% of the time.
- Separately (`git merge-tree pr-83 pr-93`): `#83` and `#93` **also**
  conflict directly in `.github/workflows/automerge.yml` itself — not just
  the ledger. #93's own report (2026-10-23) describes itself as "continuing
  #83's probe," but its branch was built against `main` directly rather than
  rebased on #83, so the two PRs ship two independent, divergent rewrites of
  the same guard script/workflow and cannot both land as-is.

## Hypothesis (frozen before measurement)

> Given the 7 open security-adversarial-surface PRs on this repo's real
> GitHub remote, when each is checked individually against current `main`
> via `git merge-tree` and then stacked sequentially in open-date order via
> real `git merge`, then every PR will merge cleanly in isolation (extending
> #89's partial-backlog sample to 100% for this surface) **and** the
> sequence will hit a conflict by the second merge, falsifying any assumption
> that "individually mergeable" implies "this backlog can be fast-forwarded
> through in bulk" — subject to: no PR's diff is modified, no working-tree
> changes are pushed, and the audit itself makes no code change to this
> repo's packages.

**Confirmed true, not falsified**, on both halves.

## Evaluation Receipt

Real evaluator: `git merge-tree` / `git merge` (deterministic, not a
simulation, not model-assisted — `LLM_EVAL=blocked`, no `OPENROUTER_API_KEY`
in this container, and none needed for this measurement). Commands and raw
`merge-tree` write-tree OIDs are listed in the Deep Dive table above and are
independently reproducible by anyone with push-level `git fetch` access to
the 7 PR refs and `main`. This repo's own `npm test` was not re-run tonight
because this candidate makes **zero changes to `packages/*`** (docs + ledger
only) — baseline `106/106` (confirmed earlier this session via a clean
`npm ci && npm run build && npm test`) is unaffected and unclaimed as
"improved" here.

## Darwin Results

`DARWIN=not-applicable` — this is a git-state measurement with no mutable
source population; same precedent as every prior non-architectural night.

## Evidence

- MEASUREMENT: 7/7 individual `git merge-tree` checks against live `main`,
  all clean (OIDs recorded above).
- MEASUREMENT: sequential stack hits a real conflict at PR #2 of 7
  (`LEDGER.md`), reproduced via actual `git merge`.
- MEASUREMENT: `git merge-tree pr-83 pr-93` — two independent conflicts
  (`automerge.yml`, `LEDGER.md`) between two PRs whose own reports describe
  one as extending the other.
- INFERENCE: the `LEDGER.md` conflict class is structural and will recur for
  *any* 2+ PRs from this pipeline merged together, not specific to these 7 —
  because every nightly PR appends a row at the same file position by
  design (STEP 25). Flagged as a process property, not a bug in any single
  PR.
- DECISION: recommend a merge order to the next human triage pass (below)
  rather than attempting to resolve the conflicts myself — rewriting another
  night's PR branch to resolve a merge conflict is outside this session's
  own-candidate scope and risks silently altering evidence another night
  already witnessed and stamped.

## Reward-Hack Check

Independent critic pass (self-adversarial, since this candidate makes no
source change there is no "weakened test" surface to check): confirmed (a)
every OID/result above was generated by an actual `git` command run tonight
against the real remote, not asserted from memory; (b) no PR's branch
content was altered, no ledger row was force-resolved or hidden; (c) no
benchmark/gate/threshold file was touched by this audit; (d) the "100%
individually clean" claim is not cherry-picked — all 7 open
security-adversarial PRs that exist today were included, not a subset
chosen to flatter the result. **Verdict: clear.**

## Security Review

- No new code, no new runtime surface, no credential/network/exec change.
- The audit itself only reads already-public PR refs and `main` via
  authenticated, scoped GitHub access already granted to this session; no
  write occurred to any of the 7 PR branches.
- Confirms (again) that `automerge-safe` is not a repo label
  (`get_label` → not found) and that all 146 recorded `automerge.yml` runs
  have `conclusion: skipped` — the guarded-automerge control has never once
  evaluated a real PR past its own top-level label gate. This is the same
  standing finding #18/#20/#37 established; not re-claimed as new tonight,
  only reconfirmed as still true before building on it.

## Scan Findings

**redblue**: no `@metaharness/redblue` key configured in `dream.config.json`
(unchanged since 2026-08-13); no new redblue-specific finding tonight —
scope was the promotion-gate backlog itself, already adversarially probed
by #82/#92.

**supply-chain**: this entire Deep Dive is supply-chain-adjacent — it
measures whether the pipeline that is supposed to move vetted, tested
changes into `main` can actually do so in bulk once a human starts
approving. The answer tonight: not without manual conflict resolution, even
for PRs whose code changes don't overlap at all (the conflicts are 100%
ledger-row and, for #83/#93, workflow-file overlap — not divergent `src/`
changes). `npm audit --omit=dev` remains 0/0/0/0/0 (reconfirmed via this
session's earlier `npm ci`); full-tree advisory count not re-measured
tonight (owned by #73/#115, last measured 5 days ago, correctly not
re-litigated as a new candidate per STEP 2).

## Competitors

| System | Backlog/merge-train analogue | Grade |
|---|---|---|
| Mergify / GitHub merge queue | Purpose-built to serialize exactly this class of conflict (re-test each PR against the current queue head, one at a time) — the gap this repo's `automerge.yml` has, since it never re-checks against a moving target once more than one PR is `automerge-safe`-eligible at once | A (official docs, merge-queue re-run-on-conflict behavior) |
| Dependabot | Groups its own PRs to avoid exactly this kind of mutual lockfile conflict (`.github/dependabot.yml` groups already configured in this repo) — the dream-cycle pipeline has no equivalent grouping for its own ledger-row-append conflict | A (official repo config, already present) |
| Sakana AI Scientist | Cited in every prior security-adversarial report for self-modifying-harness risk; not directly applicable — tonight's finding is about *throughput* of a correctly-bounded pipeline, not about the pipeline escaping its bounds | A (vendor, previously cited) |
| OpenHands / SWE-agent / DSPy-GEPA / AutoGPT lineage | No public documentation found describing a backlog/merge-train conflict-rate measurement for autonomously generated PRs specifically | C (absence) |

## Gist

`GIST=LOCAL` — no `gh gist create`-equivalent tool available to this session
(GitHub access is via MCP tools scoped to issues/PRs/branches on
`LLM-Dev-Ops/agentics-dream-machine`; same constraint as every prior night).
Committed as this file,
`docs/dream-cycle/2026-11-08-security-adversarial-report.md`.

## Witness

`dream-machine witness stamp` hashes this exact file's raw committed bytes,
so the stamp cannot be written inside the file it stamps. Filled in
immediately before commit, over content identical up to this point.
Reproduce with:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-11-08-security-adversarial-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a`. Deliberately not
self-embedding `REPORT_HASH`/`WITNESS` inside this file — issue #29
(2026-09-19) found exactly that self-reference bug in 6/10 backfilled nights.
Both values are published only in the PR body and the `LEDGER.md` row,
computed from this file's actual committed bytes.

## Recommendation

Human review — this is a docs/ledger-only night, not eligible for
auto-merge consideration under any config (touches no protected path, but
also carries no code for a gate to evaluate). Concrete next steps, not done
tonight:

1. **Fix the two blockers every recent night has already filed**: create
   the `automerge-safe` label (issue #20/#37) and enable GitHub Advanced
   Security / Code scanning in repo Settings (issue #10, open 61 days) —
   both are one-time, human-only, repo-admin actions no session action can
   substitute for.
2. **Merge order for this surface's 7 PRs**, given tonight's conflict map:
   land `#20` first (isolated), then for each subsequent PR, re-resolve only
   the `LEDGER.md` conflict (trivial — keep both rows) before merging; pick
   **one** of `#83` or `#93` to land, then rebase the other's distinct fix
   (nested-manifest/case-sensitivity vs. `dream.config.json` exclusion — both
   real, non-overlapping gaps) on top rather than discarding either.
3. **Re-run `npm audit fix` fresh at merge time**, not from #73/#115's
   snapshot — #114 already measured 3 weeks of review latency adding 13 new
   advisories to a previously-"7" count; the same decay applies to whichever
   of #73/#115 is chosen.
4. Consider a merge-queue-style re-test-on-conflict mechanism (see
   Competitors) if this pipeline's throughput is meant to ever exceed
   one-PR-at-a-time human triage.
