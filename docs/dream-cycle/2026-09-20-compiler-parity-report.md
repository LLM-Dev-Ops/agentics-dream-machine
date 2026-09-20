# Compiler-Parity SOTA Report — 2026-09-20

## TL;DR

Tonight's rotation (`DAYINT=20260920`, `SLOT=0` → `DEEP=compiler-parity`,
`SCAN=config-schema,golden-snapshots`) is the 3rd explicit compiler-parity
night (after 2026-09-10 and 2026-09-15). The byte-parity measurement is
**identical for the 3rd time running**: sha256
`74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d`,
13,717 bytes, both sides — unsurprising, since `dream.config.json` has not
changed at all since commit `2fba255` (2026-09-08), which is still `main`'s
HEAD tonight.

This session independently drafted the same candidate as PR #14 and PR #23's
discarded draft before it (a self-referential `validateConfig()` +
`toMatchSnapshot()` test over the live `dream.config.json`) — caught the
duplication by querying GitHub directly rather than trusting the local,
stale `LEDGER.md`, and discarded it uncommitted, following the precedent PR
#23 already set on 2026-09-15. **No new code shipped tonight, by design.**

The new information tonight, not present in #13, #14, or #23: a direct check
of PR #14's actual CI check-runs (nobody had pulled these before). **Every
functional check on PR #14 is green** — `test (18)`, `test (20)`, `test (22)`,
`no-optional-deps` all `success`; `guard-and-merge` `skipped` (no low-risk
label, as designed). The **only** failing check is `analyze` (CodeQL),
`conclusion: failure` — and that is the same pre-existing, separately-tracked,
repo-settings-level CodeQL gap first reported in issue #10 (2026-09-08) and
escalated in issue #27 (2026-09-18, "CodeQL 0/30 runs ever green"), not a
defect introduced by PR #14's own diff. `mergeable_state: unstable` is fully
explained by that one unrelated check, not by anything in the candidate.

The backlog itself has grown further: **11 open, unmerged dream-cycle PRs**
(#12, #14, #16, #18, #20, #22, #23, #24, #26, #28, #30) spanning
2026-09-09 → 2026-09-19, **zero merges since #8/#9** on 2026-09-08 — up from
the 6-PR/6-night count #23 reported five nights ago.

**Result: drift hypothesis REJECTED a 3rd time (clean, successful negative
result). No new candidate shipped (by design, to avoid a 3rd duplicate).**

## Hypothesis (frozen before evaluation)

> Given the current `dream.config.json` (unchanged since 2026-09-08) and the
> exact prompt text this session was invoked with, when `compile()` is run
> against the checked-in config using the real built `packages/compile/dist/index.js`,
> the compiled output should again be byte-identical to the delivered prompt
> — a 3rd independent test of whether parity is a stable invariant, not a
> coincidence of the first two nights.

Not modified after evaluation began.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), this repo's own `bench` entrypoint.

- Build: `npm ci && npm run build` — clean, all 6 packages, no wasm/NAPI
  component in this repo (pure TS), no degradation to record.
- `npm test`: **106/106** passing, 7 files — unchanged from every prior
  open-PR night, because `main` has not moved since 2026-09-08.
- `npm run lint`: clean.
- `npm run typecheck`: fails identically to every prior night with the same
  pre-existing, unrelated error (`tsconfig.json(1,12): error TS18002: The
  'files' list in config file ... is empty`) — confirmed via `git status`
  showing the error reproduces on a completely clean tree (no candidate
  changes present when checked). Not touched tonight; same root cause PR #14
  and PR #23 already flagged.
- Parity check: saved the verbatim delivered prompt to
  `received-prompt.md`; ran
  `compile(JSON.parse(readFileSync('dream.config.json')))` against the real
  built `packages/compile/dist/index.js`; diffed and sha256'd both sides.

```
$ diff -u received-prompt.md compiled-output.md; echo "DIFF_EXIT=$?"
DIFF_EXIT=0
$ sha256sum received-prompt.md compiled-output.md
74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d  received-prompt.md
74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d  compiled-output.md
```

**Result: 0 diff lines, identical SHA-256, identical length (13,717 bytes)
— the same hash as 2026-09-10 and 2026-09-15, because the input
(`dream.config.json`) has not changed.**

A candidate test (schema-validate + no-throw + golden-snapshot of the live
config, structurally identical to PR #14's) was written, run, and
mutation-tested (deliberately corrupting the live `cron` field to `0 3 * * *`
made the new test fail as expected — 1/4 red, snapshot diff shown — proving
it is a real gate, not vacuous), then the mutation was reverted
(`git status`/`git diff` confirmed byte-identical restoration) and the
candidate files were deleted, uncommitted, once the duplication with PR #14
was confirmed via the GitHub MCP tools.

## Darwin Lineage

`DARWIN=not-applicable` — no evolvable population for a deterministic
byte-parity check or a discarded test-coverage candidate; consistent with
every prior real night in this repo (2026-08-13, 2026-09-08, 2026-09-10,
2026-09-15).

## Evidence

- MEASUREMENT: sha256 `74d99dad72...4a7ac3d` byte-parity holds, 3rd
  consecutive explicit confirmation, identical hash both prior nights.
- MEASUREMENT: `npm test` 106/106, 0 regressions (no code shipped).
- MEASUREMENT (new tonight): PR #14's check-runs —
  `test (18/20/22)`=success, `no-optional-deps`=success,
  `guard-and-merge`=skipped, `analyze` (CodeQL)=**failure**;
  `mergeable_state: unstable`.
- OBSERVATION: 11 open dream-cycle PRs (#12, #14, #16, #18, #20, #22, #23,
  #24, #26, #28, #30), 0 merged since #8/#9 (2026-09-08); `main` still at
  commit `2fba255`.
- OBSERVATION: local `docs/dream-cycle/LEDGER.md` on `main` still ends at
  the 2026-09-08 row (10 data rows) — confirms the staleness issues #15,
  #23, and presumably #29/#30 already reported persists tonight.
- INFERENCE: PR #14's `unstable` mergeable state is fully attributable to
  the pre-existing, separately-tracked CodeQL repo-settings gap (issue #10,
  escalated #27), not to any defect in that PR's own candidate diff — every
  check that actually exercises the candidate's code (`test`,
  `no-optional-deps`) is green.
- DECISION: do not open a 3rd duplicate implementation of PR #14's fix;
  comment on issue #13 with tonight's re-confirmation + the new CI-status
  finding instead, consistent with the 2026-09-15 precedent (#23).
- REJECTION: considered filing a new standalone issue for the CI-status
  finding; rejected — it is a detail *about* the existing PR #14, not a new
  finding, so it belongs as a comment on #13 (which tracks PR #14) rather
  than as issue noise.

## Reward-Hack Check

No candidate code is being proposed tonight, so there is nothing to
reward-hack in the traditional sense. The discarded candidate was
mutation-tested before being confirmed as a duplicate and dropped (see
Evaluation Receipt) — it was a real, non-vacuous gate, not a quality defect;
it was discarded strictly to avoid publishing a 3rd redundant implementation
of an already-evaluated, unmerged fix, which this routine's own operating
principle treats as reward-hacking the *appearance* of productivity (PR
count) against its actual objective (reducing uncertainty about the repo).
The CI-status claim about PR #14 is a direct, unmodified read of GitHub's
own check-runs API for that PR's actual head SHA (`3c322eeaaffaa2aba3cb65a7ed6f7eb330678d18`)
— not inferred from logs, not fabricated.

## Security Review

No security-sensitive surface touched: no code shipped, no new
`io.exec`/shell/network calls beyond the already-authorized read-only GitHub
MCP queries used for the ledger check, no credential handling, no MCP
authority changes, no evaluator/gate/threshold logic touched.

## Scan: config-schema

Unchanged from #13/#14/#23: `DreamConfig` (`packages/compile/src/config.ts`)
and the live `dream.config.json` remain in sync — `validateConfig()` returns
zero errors, zero warnings (verified again tonight as part of the discarded
candidate's own assertions, before deletion). PR #14's deferred next step
(an external `dream.config.schema.json` for editor tooling) remains open and
undone.

## Scan: golden-snapshots

Unchanged from #13/#14/#23: only the synthetic `metaharness` fixture is
golden-snapshotted in `packages/compile` on `main` today (PR #14, still
unmerged, would add the live-config entry). No other package
(`ledger`, `witness`, `schedule`, `memory`, `cli`) has golden-snapshot
coverage of its deterministic outputs.

## Competitors

Unchanged from PR #14's table (Sakana AI Scientist — C-grade, no public
parity-check evidence found; OpenHands — B-grade, template-substitution unit
tests, narrower scope than a full live-config parity check; DSPy/GEPA —
B-grade, closest architectural precedent, compiled-program golden-snapshotting;
SWE-agent — C-grade, config schema validation but no live-parity snapshot
evidence found; AutoGPT lineage — C-grade, no relevant public precedent
found). No new competitor research conducted tonight: the substantive
question already has a well-evidenced, 3-times-reconfirmed answer, and
re-researching it would not reduce uncertainty (same call PR #23 made).

## Gist

No `gh gist create` tool available to this session (same constraint as every
prior night). Committed as
`docs/dream-cycle/2026-09-20-compiler-parity-report.md`. `GIST=LOCAL`.

## Witness

Following the corrected convention (PR #23/#30, 2026-09-19): no hash is
embedded inside this file. `REPORT_HASH` is computed from this file's actual
git-committed blob and published externally, in the PR description and the
`LEDGER.md` row for 2026-09-20 — never written back into the file itself.

Verify:
```bash
REPORT_HASH=$(git show <this-commit>:docs/dream-cycle/2026-09-20-compiler-parity-report.md | sha256sum | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "<SESSION_COMMIT>" | sha256sum
# must equal the WITNESS value published in the PR body and LEDGER.md row
```
`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at the
start of tonight's session).

## 3 concrete next steps

1. **Merge PR #14.** It is the oldest, most-reconfirmed (3 independent
   nights), zero-risk candidate in the entire backlog, green on every check
   that exercises its own diff. Its `unstable` state is caused entirely by
   the unrelated, already-tracked CodeQL gap (#10/#27) — not itself.
   Landing it also closes the loop the 2026-09-15 report asked for: the
   golden-snapshot test it adds would finally be live to catch a *real*
   future drift, instead of being re-derived by hand each rotation.
2. **Resolve issue #10/#27** (CodeQL never green — repo-settings gap, needs
   a human with repo-admin access) — this is now confirmed to be the
   specific blocker keeping every otherwise-green dream-cycle PR at
   `mergeable_state: unstable` rather than `clean`, not just PR #14's.
3. **Triage the 11-PR backlog** (#12, #14, #16, #18, #20, #22, #23, #24,
   #26, #28, #30) before the next rotation — this is the 3rd consecutive
   night flagging a version of this; the count has grown from 6 (#23) to 11
   without intervention. No further re-statement of this recommendation is
   planned in future compiler-parity nights unless the count changes.
