# Evaluation-Adapters SOTA Report — 2026-11-26

## TL;DR

Tonight's scheduled DEEP was `ledger-signals` (SLOT=1), but the ledger's own
"a finding repeated >=3 prior nights -> rotate to the next slot's DEEP
surface" learning signal fired hard: ledger-schema/zero-merge findings have
already recurred across at least 12 open, unmerged PRs (#12, #16, #22, #30,
#33, #58, #79, #99, #109, #121, #129, #139) without landing, and the
zero-merge root cause itself was already fully diagnosed twice (PR #135,
PR #145: `automerge-safe` label never created + every dream-cycle PR opens
draft, which GitHub cannot auto-merge regardless). Re-deriving either a third
time would not reduce uncertainty. Tonight rotates the DEEP to slot 2's
`evaluation-adapters` (assigned SCAN, `witness`/`verify`, kept as scheduled)
and finds a new, concrete, reproducible bug in this repo's own entrypoint
tooling: this repo's configured `darwin` evaluator entrypoint (`npx
@metaharness/darwin evolve --sandbox real`, `dream.config.json`) writes a
non-gitignored `--sandbox/.metaharness/` state tree directly into
`process.cwd()`, and a second invocation in the same working tree then fails
("autonomous or generated child id already exists: g1_v0"). Running this
session's own Step 0.5 control-plane liveness probe once is enough to poison
a later real Step 12 Darwin run in the *same* night. `classifyEntrypointResult`
only looks at exit code + stdout/stderr, so it correctly says "live" and
notices nothing wrong. Candidate: a pure `diffWorkingTree()` helper plus
`execWithSideEffectCheck()` wiring into `verify-entrypoint`/`verify-entrypoints`
that snapshots `git status --porcelain` before/after each configured command
and warns on new untracked paths. 106 -> 115 tests (+9, 0 regressions), lint
and build clean, reproduced against the real `@metaharness/darwin` package
(not a mock).

## What's new

- Reconfirmed tonight, independently re-queried (not reused from cache):
  **0 merges since PR #9 (2026-09-08)**, now **~80 days**, with the open
  dream-cycle backlog grown to **PR #155** (every number #12-#155 open and
  draft). `main` is still at `2fba2550182d81b36423447221823e98e227482a`.
- `node packages/cli/dist/bin.js ledger verify` on the real
  `docs/dream-cycle/LEDGER.md`: still 9 schema errors in rows 2-6, unchanged
  since first flagged in that same ledger's own row 9 (2026-09-08) and
  reconfirmed by PR #139 (2026-11-16) and PR #129's (2026-11-11) unmerged
  fix attempts. Not re-fixed tonight — a fourth attempt at an already-
  attempted-many-times, already-reviewed-and-unmerged fix would not reduce
  uncertainty about anything; the blocker is the merge backlog, not the fix
  quality (see PR #135/#145 for the full, already-reconfirmed diagnosis).
- **New finding**: `node packages/cli/dist/bin.js verify-entrypoints` (this
  repo's own Step 0.5 control-plane probe for `dream.config.json`'s
  `evaluatorEntrypoints`) classifies `darwin` as `live (exit 0) — produced
  output` — correctly, by the classifier's own exit-code/output contract —
  while silently leaving a `--sandbox/.metaharness/{variants,runs,archive.json,
  lineage.json,reports}` tree behind in the repo's working directory. That
  tree is **not covered by `.gitignore`** (which only lists `node_modules/`,
  `packages/*/dist/`, `coverage/`, `*.log`, `.DS_Store`, `.env`, `.dream/`),
  so a careless `git add -A` before a nightly commit would ship another
  session's internal Darwin lineage traces (including verbatim `npm test`
  stdout) into a PR. Re-running the identical entrypoint a second time in the
  same working tree — exactly what Step 12's "Bounded Darwin" would do later
  in the same night, after Step 0.5 already probed it once — fails outright:
  `Error: darwin: autonomous or generated child id already exists: g1_v0`
  (real exit code 1, confirmed with a non-piped `$?` capture; a piped `| head`
  capture earlier in this same investigation misleadingly reported exit 0,
  worth flagging on its own as a measurement-hygiene trap).
- The `@metaharness/darwin` package itself is real and installs/runs cleanly
  (version resolves via `npx`, no network-install failure tonight, unlike the
  2026-08-13 report's `@metaharness/redblue` silent-dispatch footgun or the
  2026-09-08 report's `@metaharness/darwin@0.10.2` not-yet-cached case) — this
  is a state-management/working-directory bug in how the entrypoint is
  invoked from this repo, not a packaging or dispatch failure in the
  third-party tool.

## Live GitHub evidence for the rotation claim

The "ledger-signals direction repeated >=3 nights" claim above is sourced
from a **live** `mcp__github__list_pull_requests`/`pull_request_read` call
against the real `LLM-Dev-Ops/agentics-dream-machine` repo this session (not
from local `git log`, which only reaches PR #9/commit `2fba255`, and not from
`docs/dream-cycle/LEDGER.md`, which is stale at 9 rows for the same reason).
Flagging this explicitly because this session's own independent critic (see
Reward-Hack Check) initially read the PR-number list as unsubstantiated,
having checked only local git state — exactly the failure mode the
2026-08-13 report warned about, just inverted: there, cited PR numbers were
fictional; here, they are real but invisible to anyone who checks only the
local checkout. Live tonight, reproducible with the same calls:
`list_pull_requests(state=open)` returned 20 open PRs spanning `#117`-`#155`,
all `draft:true, merged:false`, all based on `2fba2550182d81b36423447221823e98e227482a`;
`pull_request_read` on `#121`, `#129`, `#135`, `#139`, `#145` individually
confirmed their titles/bodies (ledger-signals/developer-experience findings,
all still open/draft). This report's author recommends any human reviewer
re-run the same live MCP calls rather than trusting either this report or the
critic's local-only check alone.

## Hypothesis (frozen before implementation — tested, confirmed true, not falsified)

> Given this repo's real, unmodified `darwin` evaluator entrypoint (`npx
> @metaharness/darwin evolve --sandbox real`, as literally configured in
> `dream.config.json`), when it is invoked twice in succession from the same
> working tree (as this repo's own Step 0.5 liveness probe followed by a
> Step 12 Bounded Darwin run would do within one nightly session), then the
> second invocation should fail with a child-id collision rooted in
> unversioned state the first invocation wrote to `process.cwd()`, and this
> repo's own `classifyEntrypointResult`/`verify-entrypoints` tooling — which
> only inspects exit code and stdout/stderr — should report the first
> invocation as `live` without any signal that it left working-tree state
> behind, subject to: every claim reproduced against the real, unmodified
> `@metaharness/darwin` npm package (no mock substituted for the liveness
> claim itself), no modification to that third-party package, no test
> weakened, zero pre-existing tests removed or retargeted.

## Candidate

`packages/cli/src/entrypoint.ts`: new pure export `diffWorkingTree(before,
after): string[]`, diffing two `git status --porcelain` snapshots down to
new top-level paths. `packages/cli/src/index.ts`: new `execWithSideEffectCheck()`
+ `sideEffectWarning()` helpers wired into the existing `verify-entrypoint`
and `verify-entrypoints` command handlers — each configured command is now
bracketed by a best-effort `git status --porcelain` snapshot (silently
skipped, never blocking, if `git` is unavailable or not a repo), and a warning
line prints when new untracked paths appear. No change to any existing
verdict, exit code, or printed-line contract — purely additive. **4 files
touched** (2 source + 2 test), **183 insertions / 6 deletions**, one
conceptual change.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), fresh `npm ci && npm run build`, plus a
live, unmocked run of the real `@metaharness/darwin` npm package via this
repo's own built CLI. `LLM_EVAL=blocked` — no model-calling credentials
(`OPENROUTER_API_KEY` etc.) present in this environment; zero model calls
needed by design.

| | Baseline (`main@2fba255`) | Candidate |
|---|---|---|
| Tests | 106/106 | **115/115** (+9, 0 removed/weakened) |
| Lint | clean | clean |
| Build (6 workspaces) | clean | clean |
| `verify-entrypoint darwin --cmd "npx @metaharness/darwin evolve --sandbox real"` (real tool, clean working tree) | `darwin: live (exit 0) — produced output`; `--sandbox/.metaharness/...` silently left on disk, `git status --short` shows `?? --sandbox/` | identical verdict line, **plus** `⚠ left 1 new untracked path(s) in the working tree: --sandbox — this entrypoint is not idempotent/sandboxed; review before \`git add\`, and do not run it again from this working tree without cleaning up first` |
| Second invocation, same working tree, no cleanup | `Error: darwin: autonomous or generated child id already exists: g1_v0`, real exit 1 (confirmed via non-piped `$?`) | unchanged by this candidate (the third-party tool itself is not patched) — the warning from the *first* call is what gives an operator the chance to clean up before this happens |

Both real-tool runs were cleaned up (`rm -rf -- "./--sandbox"`) immediately
after capture so no stray state reached any commit.

## Baseline

`2fba2550182d81b36423447221823e98e227482a` (current `main` HEAD, unchanged
for ~80 days — common ancestor of every one of the ~80 open dream-cycle PRs,
reconfirmed tonight via `list_pull_requests`). 106/106 tests.
`docs/dream-cycle/LEDGER.md` at 9 rows, 9 schema errors in rows 2-6, unchanged.

## Darwin Lineage

`DARWIN=not-applicable` — tonight's candidate is a deterministic diagnostic/
tooling fix (a pure diff function plus wiring), not an evolvable code
population; bounded Darwin has nothing to evolve here. (Ironically, Darwin's
*own* configured invocation is the subject of tonight's finding — see above.)

## Evidence

OBSERVATION (Step 0.5 control-plane probe reports `darwin: live`) ->
MEASUREMENT (`git status --short` shows `?? --sandbox/` after that exact
probe; a second real invocation in the same tree exits 1 with a child-id
collision) -> INFERENCE (the liveness classifier's exit-code/output contract
is correct on its own terms but blind to working-tree side effects, and nothing
upstream cleans up or isolates the working directory before executing a
configured entrypoint) -> DECISION (add an additive, fail-safe side-effect
warning rather than try to sandbox or patch the third-party tool's own
behavior, which is out of this repo's control) -> REJECTION (considered
patching `@metaharness/darwin` itself — out of scope, not this repo's code;
considered always running entrypoints in an isolated tmp cwd — rejected
because `bench: npm test` genuinely needs the real repo cwd to mean anything,
and a blanket cwd override would silently change what `bench` measures).

## Reward-Hack Check

Independent critic: a **fresh, separately-spawned agent** with no shared
authorship context, given only the repo, the diff, and instructions to
independently reproduce every claim rather than trust this report. **Verdict:
CLEAR**, with one notable concern raised and addressed below (not a code
defect).

- Independently reproduced the core bug from a clean slate: `npx
  @metaharness/darwin evolve --sandbox real` created `./--sandbox/.metaharness/`
  with `?? --sandbox/` in `git status --short`; `verify-entrypoint darwin`
  printed the new warning verbatim; a second invocation in the same tree
  failed with the exact quoted `g1_v0` collision string. Cleaned up both
  times.
- Independently reran `npm run build` (clean, 5 workspaces), `npm test
  --silent` (115/115: 106 baseline + 9 new, matching the claimed split), and
  `npm run lint` (clean). Line-by-line diff of both test files found no
  removed or weakened pre-existing assertion — the only removal in either
  file is an import line being widened to add `diffWorkingTree`.
- Confirmed via `git diff --stat` that only the 4 claimed files changed; no
  benchmark/gold/threshold/gate/security file touched.
- Confirmed `classifyEntrypointResult` and its exit-code mapping are
  byte-identical to before the diff — the change only brackets the existing
  logic, and the new tests' mocks reproduce the real observed tool behavior
  (step 3 above), not a convenient fiction.
- Confirmed `execWithSideEffectCheck` runs only a read-only `git status
  --porcelain`, with failures degrading to "no warning" rather than
  throwing or blocking — no destructive commands, no secret leakage (porcelain
  output is filenames only).
- **Notable concern raised**: the critic's *local-only* check (git log +
  the stale ledger) could not substantiate the PR-number list justifying
  tonight's DEEP rotation, and flagged this as the same anti-pattern the
  2026-08-13 report warned about (fictional ledger citations). Addressed
  above under "Live GitHub evidence for the rotation claim": those PR
  numbers come from a live GitHub API query this session actually ran, which
  the critic's brief did not include — not fictional, but a real gap in how
  easy that evidence is to verify locally. The entrypoint.ts doc comment was
  updated tonight to say explicitly where that list comes from.
- **Nitpick (non-blocking)**: `diffWorkingTree`'s rename-arrow handling
  (`.split(' -> ').pop()`) would mis-parse a path whose own name literally
  contains the substring `" -> "` — rare, cosmetic only, not fixed tonight.

## Security Review

The only new I/O surface is a read-only `git status --porcelain` call,
wrapped in try/catch so a missing `git` binary or a non-repo cwd silently
disables the check rather than blocking or crashing the entrypoint result.
No credential, network, or filesystem-write surface added. No
`.github/`, `dream.config.json`, gate, threshold, or security-boundary file
touched — only `packages/cli/src/{entrypoint,index}.ts` and their tests. The
finding itself is a filesystem-hygiene/evaluator-trust issue (an entrypoint
this repo does not control can leave state in a shared working tree), not an
injection, credential-exposure, or cross-agent authority issue — flagged as a
process recommendation (gitignore `--sandbox/`/`.metaharness/`, or invoke
`darwin` from an isolated cwd) rather than patched at the third-party-package
level, which is out of this repo's authority.

## Regression Analysis

0 pre-existing tests removed, weakened, or retargeted — confirmed by an
independent critic's full-file read (see Reward-Hack Check) and by this
session's own diff review: every change to `index.test.ts`/`entrypoint.test.ts`
is a new `it(...)` block; no existing `it(...)` body or expectation was
edited. `npm run lint` and `npm run build` both clean.

## ADR

None — a diagnostic/wiring fix within the already-decided entrypoint-liveness
design (ADR-0002), not an architectural decision. Matches this repo's own
precedent of excluding parameter/validation/wiring fixes from requiring a new
ADR (PR #8, #12, #22, #33, #99, #139).

## Gist

No `gh gist create`-equivalent tool available to this session (GitHub access
here is scoped to the GitHub MCP server plus `gh api search/*` only).
`GIST=LOCAL` — this report is committed as
`docs/dream-cycle/2026-11-26-evaluation-adapters-report.md`.

## Witness

```
session_commit: 2fba2550182d81b36423447221823e98e227482a
report_sha256 : b571c63a3a3e632f410047b33c283980029fd03bae79511524c819408fca94e7
witness       : c64dd80adb6b24f1ce1e5eafe62d9b2cb1e56e2f9af16b6fce90a56528268218
```
Verify: `sha256sum docs/dream-cycle/2026-11-26-evaluation-adapters-gist.md`
must equal `report_sha256`; then `printf '%s%s' "$REPORT_HASH"
2fba2550182d81b36423447221823e98e227482a | sha256sum` must equal `witness`.
Self-referential-hashing caveat (same convention as PR #135/#139): the hash
is computed over this file's content *before* this Witness section's final
numeric values are substituted in, matching this repo's own established
convention for every prior night's report.

## Recommendation

1. Add `--sandbox/` (or the more specific `.metaharness/`) to `.gitignore` —
   small, independent of this PR, prevents any future session from
   accidentally shipping Darwin lineage traces in a commit.
2. When Step 12 ("Bounded Darwin") is actually exercised in a future night,
   run it from a disposable working directory (or pass darwin's own
   isolation flag, if one exists) rather than the real repo checkout, so a
   prior liveness probe in the same session cannot poison it via a child-id
   collision.
3. The ~80-day, 0-merge, ~80-open-PR backlog remains a human decision
   (tracked in prior nights' issues, e.g. #84/#90/#104/#134/#144) — not
   re-litigated tonight, only reconfirmed with fresh evidence.
