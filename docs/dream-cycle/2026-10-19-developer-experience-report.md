# Developer Experience / Compiler-Parity SOTA Report — 2026-10-19

**Rotation**: `DAYINT=20261019`, `SLOT=4` → `DEEP=developer-experience`,
`SCAN=cli,tui`. No bonus deep dive (`20261019 % 25 = 19`, `% 75 = 69`).
`SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.

## TL;DR

No new implementation candidate tonight. The `developer-experience` surface's
one live finding (`--no-color`/`NO_COLOR` ANSI leak) is already fixed, tested,
and consolidated in open PR #65 (119/119 tests) — a fourth attempt would be a
sixth repetition of the same finding (#39, #49, #55, #65, #75), which STEP 1.1's
learning signal explicitly says to stop doing. The `compiler-parity` rotation
target (`darwin` arg-parsing bug) is likewise an exact duplicate of open PR #18
(37 days unmerged), reconfirmed clean per #76.

Tonight's actual contribution is a **direct, dated reconfirmation that the
repository's single merge gate (CodeQL / GitHub Advanced Security) is still
failing today**, 41 days after issue #10 first diagnosed it as a repo-admin
settings gap that no PR can fix — plus the first exact count of how large the
resulting backlog has grown.

## What's new since the last check (issue #10, 2026-09-08)

- **CodeQL still red, confirmed live today.** Workflow run
  [39215505207](https://github.com/LLM-Dev-Ops/agentics-dream-machine/actions/runs/39215505207)
  (`CodeQL`, run #88, `schedule` trigger, `main@2fba255`, started
  `2026-10-19T07:21:54Z`): `conclusion: failure`. Same failure mode as every
  recorded run since 2026-09-03 (issue #10 lists runs #3, #9, #10, #13, #15 as
  `failure`; this adds run #88, six weeks later, same result).
- **Zero merges since the day issue #10 was filed.** `gh`/MCP PR listing
  (`state=all`, 46 PRs total, #1–#83) shows exactly two `merged_at` entries,
  both `2026-09-08T05:2x:xxZ` — PR #8 (dream-cycle 2026-09-08) and PR #9 (the
  `actions:read` fix issue #10 itself disproves as sufficient). Nothing has
  merged in the 41 days since.
- **Backlog, counted exactly today:** 44 open PRs — 38 open draft `dream-cycle`
  PRs (#26→#83, one per night since 2026-09-17, with a handful of
  reconfirmation gaps) **plus 6 Dependabot PRs (#1–#6)** for routine action-pin
  bumps that are *also* stuck, confirming the gate blocks all merge traffic,
  not just this session's own candidates. 0 closed-unmerged (nothing has even
  been rejected — everything just accumulates).
- **At least three already-validated, ready-to-merge candidates are sitting in
  the backlog for this reason alone**, not for lack of review-worthiness:
  - PR #65 (2026-10-09): consolidates #39/#49/#55's `--no-color`/`NO_COLOR`
    fixes into one 21-line diff, 119/119 tests, reward-hack clear,
    `mergeable_state: "unstable"`.
  - PR #18 (2026-09-12, 37 days old): fixes `darwin` evaluatorEntrypoint's
    missing `<repo>` arg; reconfirmed live and unchanged by #76 on 2026-10-15.
  - PR #83 (2026-10-18): closes an automerge-guard path-allowlist bypass
    (CICD-SEC-5-shaped), 109/109 tests — itself correctly self-blocked from
    auto-merge because it touches `.github/`, but still needs a human merge.

## Frozen hypothesis

> Given `main`'s CodeQL workflow run history and open PR #65's
> `mergeable_state`, when both are inspected today (2026-10-19), then CodeQL
> should still report `conclusion: failure` and PR #65 should still show a
> non-clean `mergeable_state`, consistent with issue #10's 2026-09-08
> repo-admin-only diagnosis remaining unaddressed — falsifiable by either
> going green/clean, which would mean the gap was closed since.

Frozen before inspection; not modified after. **Confirmed true** (see
Evaluation Receipt) — hypothesis was not falsified.

## Evaluation Receipt

- Baseline/candidate: N/A — no code diff tonight. The "evaluation" is a live
  inspection, not a benchmark run.
- `npm ci && npm run build`: clean. `npm test`: **106/106 passing** (fresh
  checkout, `main@2fba255`), matching PR #65's stated baseline exactly.
- `npm run lint`: clean. `npm audit --omit=dev`: 0 vulnerabilities
  (production deps; the 21-advisory count referenced elsewhere is
  devDependencies-only, tracked separately by #62/#72).
- `LLM_EVAL=blocked` — no `OPENROUTER_API_KEY`/model-call credential present
  in this session's environment. Confirms the long `LLM_EVAL=blocked` streak
  STEP 1.1 asks to react to; tonight's finding needed no model call.
- GitHub MCP tool access: live (read `get`/`list`/`search` calls succeeded
  against `LLM-Dev-Ops/agentics-dream-machine`). `gh` CLI itself:
  `GH_TOKEN` invalid in this session (`gh auth status` fails) — **only gist
  publication falls back to local** (`GIST=LOCAL`); issue/PR filing used the
  GitHub MCP tools directly, so `FALLBACK` does not apply to this run's
  publication steps.

## Darwin Results

Not run. No candidate exists to evolve; STEP 9's "produce a CONCRETE
candidate" gate was not cleared (the only testable finding on this surface is
an exact duplicate of an already-open, already-evaluated PR).

## Evidence log

- OBSERVATION: `codeql.yml` run #88 on `main@2fba255`, triggered by the
  Monday 07:00 UTC schedule, `conclusion: failure`.
- OBSERVATION: PR list for this repo, `state=all`, 46 total PRs, 2 `merged_at`
  non-null (both 2026-09-08), 44 open, 38 open+draft, 0 closed-unmerged.
- MEASUREMENT: `npm test` 106/106 on fresh `main` checkout tonight.
- INFERENCE (grade A — reproduced directly against this repo's own GitHub
  Actions history, not a secondary source): the CodeQL failure and the 41-day
  merge freeze are the same incident issue #10 described; it has not been
  remediated.
- DECISION: no new implementation candidate opened tonight for
  `developer-experience` or `compiler-parity`; this finding is filed as a
  reconfirmation with new dated evidence instead.
- REJECTION: a sixth `--no-color` PR, and a second `darwin`-arg PR, were
  both considered and explicitly rejected as pure duplication of already-open,
  already-tested work (#65, #18) per STEP 1.1.

## Reward-Hack Check

**N/A / clear.** No candidate diff exists tonight to weaken a benchmark,
alter gold data, or exploit an evaluator. The only "measurement" is a public
GitHub Actions run's recorded conclusion and a PR listing's `merged_at`
field, both read verbatim, neither of which this session can influence.

## Security Review

The underlying gap is itself security-relevant: GitHub Advanced Security /
Code Scanning being disabled at the repository-settings level means no
CodeQL analysis has ever actually completed on this codebase (0 green runs
on record since 2026-09-03), independent of whatever `security-adversarial`
nights have found through other means. This is a coverage gap, not a new
vulnerability introduced by this session. No credentials, tool authority, or
filesystem/network scope were touched tonight.

## Competitors / prior art (brief, C-grade — not load-bearing for the finding)

A merge pipeline whose sole blocking signal is a perpetually-red required
check is a known anti-pattern in CI design discussions around merge queues
(GitHub's own merge-queue and branch-protection docs explicitly warn against
making a non-passing check "required" without a working remediation path).
Agent frameworks with human-gated merge loops (OpenHands, SWE-agent) default
to flagging a stuck required check back to a human rather than retrying
indefinitely — the same recommendation this report makes.

## Recommendation (3 concrete next steps)

1. **Human action, repo-admin only:** enable *Settings → Code security and
   analysis → Code scanning* (GitHub Advanced Security) for this repository,
   then re-run the CodeQL workflow on `main` to confirm green. No PR can do
   this.
2. Once green, merge the three ready, already-evidenced candidates in the
   backlog in dependency order: #83 (security/guard fix, touches
   `.github/`, human-review-only regardless) → #65 (`--no-color`/`NO_COLOR`,
   closes #39/#49/#55 as superseded, net backlog **−2**) → #18 (`darwin` arg
   fix). Merging the Dependabot PRs (#1–#6) first is lowest-risk and
   validates the gate end-to-end before touching anything with a real diff.
3. If Advanced Security is intentionally not wanted on this repo, remove
   `codeql.yml` (or make it non-required) instead of leaving a permanently
   failing check as the thing every future dream-cycle night has to explain
   away — issue #10 already recommended this as the fallback option.

## Witness

```
session_commit: 2fba2550182d81b36423447221823e98e227482a
report_sha256 : f3c084840228a05dd20bf021004e2c607b93867bd397e2626b74102d1e5250c7
witness       : 02ff0940f3ac26843bd037345a2999d98660b02730c19118d7200e09b274f762
```

Verifier procedure (reproducible by anyone):

1. `git show <PR-head-sha>:docs/dream-cycle/2026-10-19-developer-experience-report.md > /tmp/report.md`
2. `sha256sum /tmp/report.md` → must equal `report_sha256` above.
3. Confirm `session_commit` (`2fba2550182d81b36423447221823e98e227482a`) is
   the `main` HEAD this session branched from
   (`git merge-base --is-ancestor 2fba2550182d81b36423447221823e98e227482a main`).
4. `printf '%s%s' "$(sha256sum /tmp/report.md | awk '{print $1}')" \
   "2fba2550182d81b36423447221823e98e227482a" | sha256sum` → must equal
   `witness` above.
5. Independently re-check the primary claim: open
   https://github.com/LLM-Dev-Ops/agentics-dream-machine/actions/workflows/codeql.yml
   and confirm the most recent run's conclusion, and check PR #65's current
   `mergeable_state` via the GitHub API or UI.
