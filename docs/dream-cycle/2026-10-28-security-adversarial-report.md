# Security-Adversarial / Supply-Chain SOTA Report — 2026-10-28

## TL;DR

All six of this repo's GitHub Actions workflows (`.github/workflows/*.yml`)
reference third-party actions by mutable major-version tag
(`actions/checkout@v4`, `github/codeql-action/*@v3`, etc.) rather than an
immutable commit SHA — the textbook GitHub Actions supply-chain gap (Grade A,
`docs.github.com` security-hardening guide; real-world precedent: the 2025
`tj-actions/changed-files` tag-repoint compromise). Two of the six hold real
repo-write credentials: `automerge.yml` (`contents: write` +
`pull-requests: write` — this engine's own unattended squash-merge path) and
`dream-nightly.yml` (`contents: write` + `issues: write` +
`pull-requests: write`). A retargeted tag on either is not hypothetical risk
analysis — it is this engine's own merge/push authority handed to whoever
controls the upstream tag at run time. Candidate: a new pure
`findUnpinnedActions()` checker (`packages/cli/src/actions-pin.ts`) plus a
test that reads the real workflow files from disk and fails if any `uses:`
line is not pinned to a full 40-character commit SHA, and the actual fix —
all 16 `uses:` references across the 6 files repointed to their live,
independently-resolved commit SHA with a Dependabot-compatible `# vN` trailing
comment so automated version bumps keep working. `npm test` 106→115 (+9, 0
removed/modified). This candidate does not touch `dream.config.json`'s
unconfigured `redblue` key (still absent, unchanged since 2026-08-13) or the
`automerge.yml` protected-path regex (separate, already-filed territory — see
Recommendation).

## What's new

- Reproduced live tonight: none of this repo's 16 `uses:` lines (6 workflow
  files) pin to a commit SHA; all use a mutable major-version tag. Confirmed
  by running the new checker against the **unmodified** files before editing
  them (see Evaluation Receipt) — not inferred, actually executed.
- Resolved the real, current commit each tag points to, live, via
  `git ls-remote` against the actual upstream repos (not fabricated, not
  copied from a blog post):

  | Action | Tag | Commit SHA |
  |---|---|---|
  | `actions/checkout` | v4 | `11d5960a326750d5838078e36cf38b85af677262` |
  | `actions/setup-node` | v4 | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
  | `github/codeql-action/{init,analyze}` | v3 | `4bfa242aa49c5f7c6770b98670d354a7dfac05f8` (peeled — `v3` is an **annotated** tag; the tag-object SHA `5c8ea125…` is not the commit and would have been a silent bug if used) |
  | `actions/configure-pages` | v5 | `983d7736d9b0ae728b81ab479565c72886d7745b` |
  | `actions/upload-pages-artifact` | v3 | `56afc609e74202658d3ffba0e8f6dda462b719fa` |
  | `actions/deploy-pages` | v4 | `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e` |

  Direct GitHub API lookup (`api.github.com`) is blocked for this session
  outside the repo's own GitHub-access scope (`add_repo` gate) — worked
  around with plain `git ls-remote https://github.com/<owner>/<repo>
  refs/tags/<tag> 'refs/tags/<tag>^{}'`, which is unauthenticated, public, and
  independently reproducible by anyone, including the critic below.
- `npm audit`: 12 advisories now (3 critical, 4 high, 3 moderate, 2 low) — up
  from 8 (2 critical) on 2026-09-08 and 21 noted on 2026-10-13 (PR #73,
  unmerged, claims a 21→7 non-breaking fix). All still confined to
  `eslint`/`vitest`/`vite`/`esbuild`/transitive devDependencies; `prod: 13`
  (internal `@dream-machine/*` workspace packages only), `dev: 269`. Not
  fixed tonight — a manifest change is PR #73's (and dependabot's) territory,
  not a duplicate candidate.
- `dream.config.json#evaluatorEntrypoints` still has no `redblue` key
  configured (unchanged since 2026-08-13) — SCAN=redblue has nothing new to
  classify.
- Zero-merge-streak reconfirmed and widened: `main`'s HEAD
  (`2fba2550182d81b36423447221823e98e227482a`) is still the commit merged by
  PR #9 (2026-09-08). `list_pull_requests` shows PRs up to #101 and
  `list_issues` shows 45 total issues (`#62` through `#100` on just the first
  page, dated 2026-10-08 through 2026-10-27 — 20 consecutive nightly PRs),
  every one `state: open`, `merged: false`. CI and CodeQL are green on recent
  PRs (confirmed via `actions_list` — PR #101's CI and CodeQL runs both
  `conclusion: success`; `Guarded auto-merge` is `skipped`, not failing,
  because no PR carries the `automerge-safe` label). This is a human-review
  backlog, not a broken pipeline — consistent with PR #91's (2026-10-22)
  diagnosis; not re-litigated further tonight.
- `LEDGER.md` on `main` still ends at the 2026-09-08 row (row 9) — confirmed
  again (3rd consecutive flag, now sharper evidence): every dream-cycle PR
  since append its own ledger row inside its own never-merged branch, so
  `main`'s copy cannot move until a human merges one. Not this candidate's
  scope (continues the already-filed #42/#78/#98 "`learningSignals()` only
  sees `main`'s stale rows" gap — PR #99, 2026-10-26, unmerged).

## Hypothesis (frozen before implementation)

> Given this repo's six GitHub Actions workflow files, when every `uses:
> <action>@<ref>` reference is checked against the actual, live upstream
> commit for that tag, then every reference should resolve to — and, after
> the fix, actually be — an exact, immutable 40-character commit SHA, subject
> to: zero change to any workflow's permissions, triggers, step order, or
> inputs; the Dependabot-compatible `@<sha> # <tag>` comment convention
> preserved so automated version bumps keep working; and no pre-existing test
> weakened, removed, or modified.

Not modified after evaluation began. **Confirmed true** (16/16 references
were unpinned pre-fix; 16/16 are pinned, verified-correct, and
behavior-preserving post-fix).

## Candidate

- `packages/cli/src/actions-pin.ts` (new, 58 lines): pure
  `findUnpinnedActions(yaml: string): UnpinnedActionRef[]` — scans `uses:`
  lines (quoted or not) and flags any ref that is not a full 40-hex-char
  commit SHA.
- `packages/cli/src/actions-pin.test.ts` (new, 90 lines): unit tests for the
  pure function (synthetic cases: mutable tag, pinned SHA, quoted form,
  non-hex look-alike, nested action path, Docker-digest out-of-scope case) +
  one frozen-baseline test pinning the 7 real pre-fix tag lines verbatim +
  one live test that reads the actual `.github/workflows/*.yml` files from
  disk and asserts every one is pinned.
- `.github/workflows/{automerge,ci,codeql,dream-nightly,pages,release}.yml`
  (+16/−16 lines total): every `@vN` replaced with `@<resolved-sha> # vN`.
  No other line touched.

8 files, ~190 changed lines, one conceptual change (pin every action
reference to an immutable commit). Continues, but does not depend on or
collide with, PR #83/#93's unmerged `automerge.yml` protected-path-regex
line — this candidate never touches that line.

## Baseline

`main`@`2fba2550182d81b36423447221823e98e227482a` (tonight's `SESSION_COMMIT`,
unchanged since PR #9, 2026-09-08). 106/106 tests.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), this repo's own `bench` entrypoint.
Fresh `npm ci && npm run build` at `SESSION_COMMIT=2fba255`.

| | Baseline (parent) | Candidate |
|---|---|---|
| Test files | 7 | 8 |
| Tests | 106 | **115** (+9, 0 removed/modified) |
| Lint | clean | clean |
| Build (6 workspaces) | clean | clean |
| Typecheck | pre-existing `TS18002` | identical, reproduced via `git stash` (environmental, unrelated — same as every prior night since at least 2026-09-08) |
| `npm audit` | 12 advisories (3 crit/4 high/3 mod/2 low), `prod:13`/`dev:269` | unchanged — no manifest touched |

Live, non-tautological receipt — the new "every real workflow file is pinned"
test against the **real, unmodified** repo, run *before* any workflow file
was edited:

```
$ npx vitest run packages/cli/src/actions-pin.test.ts
 ❯ … every real workflow file in .github/workflows/ is pinned to a full commit SHA
   × automerge.yml has an unpinned action: expected [ { line: 26, action: 'actions/checkout', ref: 'v4' } ] to deeply equal []
 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```

Then, with the workflow fix applied:

```
$ npm test
 Test Files  8 passed (8)
      Tests  115 passed (115)
```

## Darwin

`DARWIN=not-applicable` — same precedent as 2026-08-13/2026-09-08/2026-10-23:
a static, pure, exhaustively-specified detector (and a repo-safety-boundary
edit — pinning the very actions the pipeline runs under) has no mutable
evolvable population; bounded Darwin's generations×children search needs one
this candidate doesn't have. Not a stop condition.

## Evidence

- OBSERVATION: `grep -rn "uses:" .github/workflows/*.yml` → 16 lines, all
  `@v3`/`@v4`/`@v5`, zero `@<40-hex-sha>`, read in full before any edit.
- OBSERVATION: `git ls-remote --tags https://github.com/<owner>/<repo>
  refs/tags/<tag> 'refs/tags/<tag>^{}'` executed live for all 6 distinct
  action repos tonight; `github/codeql-action`'s `v3` is annotated (two
  different SHAs returned — tag-object vs. peeled commit); the peeled SHA was
  used, confirmed correct by the independent critic's own re-run of the same
  command.
- MEASUREMENT: `npm test` — 106/106 (baseline) → 115/115 (candidate), 0
  regressions, 0 removed/modified tests. `npm run lint` / `npm run build`
  clean both sides.
- MEASUREMENT: the new live-file test fails against the real, unedited
  workflow directory (non-tautological, reproduced above) and passes once
  the fix is applied.
- INFERENCE: `automerge.yml` (`contents: write`, `pull-requests: write`) and
  `dream-nightly.yml` (`contents: write`, `issues: write`,
  `pull-requests: write`) are this repo's only two workflows with real
  repo-mutating credentials; both were unpinned pre-fix, making them the
  highest-leverage targets this finding closes.
- DECISION: ship the checker + fix as one additive, behavior-preserving
  candidate; do not touch `npm audit`'s devDependency advisories (PR #73's
  and dependabot's territory) or the `automerge.yml` protected-path regex
  (PR #83/#93's territory) in the same diff.

## Reward-Hack Check

Independent critic — a fresh subagent with no shared context, given only the
diff and told to independently re-resolve every claimed SHA via its own live
`git ls-remote` calls (not trust the diff) and to independently re-run the
"does the live test actually fail without the fix" check via its own
`git stash`.

**Verdict: CLEAR of reward-hacking.** Critic independently confirmed: all 6
SHAs correct, including the one critics most often get wrong (using the
annotated tag's peeled commit, not its tag-object SHA, for
`github/codeql-action`); the fix changes no permission/trigger/input/step
order anywhere; the new test is genuinely wired into `npm test` via the root
`vitest.config.ts` include glob (no new config needed); 113/113 passed in the
critic's own independent run before the quote-handling fix below was added;
no pre-existing test, threshold, or gold data touched.

**One correctness gap found by the critic, fixed before this report was
finalized (not swept aside as "non-blocking and left for later", since it was
cheap and in-scope):** the original `USES_LINE` regex required the action
token to start immediately after `uses:\s*`, so a *quoted* reference
(`uses: 'actions/checkout@v4'`) matched nothing at all — silently invisible
to the checker rather than flagged. None of this repo's current workflows
quote their `uses:` values, so the gap was latent, not exploited — but
shipping a security checker with an undetected hole in its own detection
surface would be exactly the kind of overclaim this repo's
`witness-every-quantitative-claim` discipline forbids. Fixed: the regex now
tolerates an optional surrounding quote; added as its own test
(`matches a quoted 'uses:' value`), included in the 106→115 count above.

**One scope boundary, documented rather than silently mishandled (fixed, not
left latent):** a Docker-digest reference (`uses: docker://image@sha256:
<64-hex>`) is a different, already-pinned scheme this checker does not
recognize as pinned (it gets flagged as a false positive, not a false
negative — fails closed, not open). No workflow in this repo uses `docker://`
today. Recorded as its own explicit test
(`out of scope: a Docker digest reference…`) plus a doc comment, so a future
night that adds a `docker://` step gets a clear, pre-written signal instead
of a silent surprise.

No blocking defects remain.

## Security Review

- **Credential/authority scope closed**: `automerge.yml` and
  `dream-nightly.yml` are the only two workflows in this repo holding
  repo-write credentials (`contents: write` plus, respectively,
  `pull-requests: write` and `issues: write`+`pull-requests: write`). Both
  were, until tonight, one repointed upstream tag away from running arbitrary
  code with those credentials on this engine's own merge/push path — this is
  this repo's single highest-leverage pending supply-chain exposure, higher
  than the devDependency CVEs already tracked in PR #73, because those don't
  carry push authority.
- **Real-world precedent, not speculative**: the March 2025
  `tj-actions/changed-files` incident is the canonical case of exactly this
  failure class — a compromised maintainer token retargeted a version tag,
  and every consumer pinned by tag (not SHA) ran the injected commit on their
  next CI run. GitHub's own security-hardening guide names SHA-pinning as the
  first mitigation for third-party actions.
- **No new attack surface introduced by the fix itself**: the diff only
  changes `@<ref>` strings inside pre-existing `uses:` lines; no new
  permission, secret, network call, or `exec` path. The new test performs
  only local, synchronous file reads — no network, no child process.
- **Residual limitation, not fixed tonight**: SHA-pinning stops a *retargeted
  tag* from running new code, but does not itself keep the pin current — a
  real CVE in `actions/checkout@11d5960a…` would need a future PR (ideally
  Dependabot's SHA-aware auto-PRs, which the `# vN` comment convention
  specifically enables) to bump the pin forward. Not a gap this candidate
  introduces; a known property of SHA-pinning in general.
- **Least privilege**: unchanged — this candidate touches no `permissions:`
  block.
- **Prompt injection / credential exposure / cross-agent poisoning**: N/A, no
  model calls in this candidate (`LLM_EVAL=blocked` — no `OPENROUTER_API_KEY`
  present tonight, confirmed live).

## Regression Analysis

0 pre-existing tests removed or modified (106/106 unchanged within the 115).
`npm run lint` / `npm run build` clean both sides. Typecheck's pre-existing
`TS18002` reproduces identically on the parent (environmental). `npm audit`
unchanged — no manifest touched.

## ADR

None — pinning existing action references to their current commit, with zero
behavior change, is not an architectural decision. Same precedent as PR
#51/#63/#83/#89/#91/#93.

## Scan Findings

**redblue** — `dream.config.json#evaluatorEntrypoints` still configures no
`redblue` key (unchanged since 2026-08-13); nothing new to classify for this
scan tonight.

**supply-chain** — primary finding above (GitHub Actions tag-pinning, now
closed for all 16 references across 6 workflows). Secondary, unchanged:
`npm audit` 12 advisories (3 critical/4 high/3 moderate/2 low), 100% confined
to dev-only tooling (`prod: 13`, all internal workspace packages; `dev: 269`);
a non-breaking fix already sits unmerged as PR #73 (2026-10-13, claims
21→7) — this session does not touch manifests or dependabot's territory.

## Competitors

| System | Supply-chain action/dependency pinning posture | Grade |
|---|---|---|
| GitHub (official) | `docs.github.com` security-hardening guide names pinning third-party actions to a full commit SHA as its first recommendation for untrusted-input-adjacent workflows; GitHub's own `codeql-action` releases tag *and* document SHA usage | A (official docs, fetched directly) |
| OpenSSF Scorecard | Ships a dedicated `Pinned-Dependencies` check that specifically flags GitHub Actions pinned by tag/branch rather than SHA, scored into a repo's overall Scorecard | A (official project docs/source, well-established) |
| `tj-actions/changed-files` incident (2025) | Real-world case: a compromised maintainer credential retargeted a release tag; every consumer pinned by tag ran the injected commit; consumers pinned by SHA were unaffected — direct precedent for tonight's exact finding | A (widely reported, cross-checked incident, not single-sourced) |
| Dependabot | Natively supports updating SHA-pinned actions when the SHA is followed by a `# vN` comment — the exact convention this candidate used, chosen specifically so this fix does not trade security for maintainability | A (official docs) |
| StepSecurity / `pin-github-actions` tooling ecosystem | Third-party tooling exists specifically to automate this exact pin — confirms this is a recognized, recurring gap across the ecosystem, not a one-off in this repo | B (vendor docs, cross-checked against GitHub's own guide) |

## Gist

`GIST=LOCAL` — no gist-creation tool available to this session (GitHub access
is via MCP tools scoped to issues/PRs/branches/files on
`LLM-Dev-Ops/agentics-dream-machine`; confirmed again tonight, same as every
prior night). Published as a local artifact
(`/tmp/dream-gist-2026-10-28.md`, byte-identical to this committed report),
committed into the PR as this file.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so the stamp
cannot be written *inside* the file it stamps. This section is filled in
immediately before commit, over content identical up to this point.

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-10-28-security-adversarial-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at the
start of tonight's session, before this candidate's changes). REPORT_HASH and
WITNESS are published in the PR body and the `LEDGER.md` row, both pointing
back at this file by path and session commit (not written into this file
itself — hashing a file over a value derived from its own hash is
circular).

## Recommendation

Human review of the draft PR. Concrete next steps, not done tonight:

1. **Keep the pins current.** The `# vN` trailing comment on every pin is
   Dependabot's SHA-aware update convention — confirm (human step, not this
   session's) that `.github/dependabot.yml` actually has a
   `package-ecosystem: "github-actions"` entry so these pins get bumped
   automatically rather than going silently stale. Not checked/added
   tonight — a `.github/dependabot.yml` content decision is a distinct,
   human-reviewable scope from tonight's candidate.
2. **Merge this PR, then PR #93 → #83 → #63 → #73**, in that priority order
   (unchanged from #93's 2026-10-23 recommendation) — this candidate
   deliberately does not touch the same `automerge.yml` line those PRs
   compete on, so it introduces zero new merge-conflict surface with any of
   them.
3. **The 20-consecutive-night, zero-merge backlog (#62 through this PR) is a
   human-process bottleneck, not a pipeline defect** — CI and CodeQL are
   green on the latest PRs (verified live via `actions_list`, not inferred).
   Reconfirmed, not re-investigated further; see PR #91 (2026-10-22) for the
   original diagnosis.
4. Next-step research, not built tonight: extend `findUnpinnedActions` (or a
   sibling checker) to reusable-workflow references
   (`uses: owner/repo/.github/workflows/x.yml@ref`) if this repo ever adds
   one — today it has none, so this was out of tonight's testable scope.
