# Dream Machine SOTA Report — 2026-11-04

**Surface:** developer-experience (DEEP) · cli, tui (SCAN) · slot 4/5, no bonus deep dive
**Repo:** `LLM-Dev-Ops/agentics-dream-machine` @ `2fba2550182d81b36423447221823e98e227482a`
**LLM_EVAL:** blocked (no `OPENROUTER_API_KEY` or equivalent in this container) — tonight's candidate and evaluation are 100% deterministic, zero model calls.

## TL;DR

`dream-machine tui --no-color` — the mode this repo's own CLI help text and `tui.ts` header comment describe as the path for CI logs, non-tty piping, and "termshot" SVG snapshotting — silently leaks raw ANSI escape bytes (`\x1b[32m`/`\x1b[31m`/`\x1b[33m`/`\x1b[38;5;245m`) into its "plain" output whenever a ledger row's verdict is `ACCEPT`, `REJECT`, `INCONCLUSIVE`, or anything else. Root cause: `verdictColor()` reads from the hardcoded module-level `C` theme constant instead of the caller's active theme `c` (which is a no-op `Proxy` under `noColor: true`). Fixed by threading `c` through `verdictColor(v, c)`. 2-file, 4-line functional diff + 13 lines of new tests. `npm test` 106→108 (+2, 0 removed/modified), lint/build clean, parent and candidate independently rebuilt and retested across a `git stash`/`pop` boundary.

## What's new

This is a **fresh** finding, not a re-discovery. The repo's own prior `developer-experience`/`cli,tui` night (2026-10-24, issue #94 / PR #95, still open/unmerged) found and fixed a *different*, narrower bug in the same file: `pad()`'s truncation branch raw-sliced a colorized string by byte index instead of visible-character index, which could cut an ANSI escape mid-sequence or drop a trailing reset — but only when the string was over its column budget. That fix (`truncateVisible()`) is orthogonal to tonight's bug: `verdictColor()`'s leak happens **unconditionally**, independent of truncation, and would persist even after PR #95 lands, because the raw escape is baked into the row string by `verdictColor()` before `pad()` ever sees it, and `pad()`'s no-truncation branch (`s + ' '.repeat(...)`) never touches `s`'s content. PR #95's own evaluation receipt explicitly notes "every pre-existing `tui`/`renderDashboard` test renders with `noColor: true`" as *why its* bug went undetected — the same root cause applies here: zero pre-existing test asserted the *absence* of `\x1b` bytes under `noColor`, so this second, independent leak in the same function family was never caught either.

## Competitors (how the ecosystem handles colorized-CLI/no-color correctness)

| Project | Relevant practice | Grade |
|---|---|---|
| OpenHands (OpenDevin) | Ships a web event-stream visualizer rather than a raw-ANSI terminal dashboard for agent run observability; avoids this whole bug class by not hand-rolling ANSI truncation/coloring logic. | A (official repo/docs) |
| SWE-agent | CLI-first; persists structured `.traj` JSON trajectory logs and a separate minimal viewer rather than live-coloring a fixed-width terminal box. | A (official repo/docs) |
| DSPy / GEPA | Reflective-evolution logging is metrics/Pareto-frontier-plot-first; no bespoke ANSI dashboard renderer in the critical path. | A (official repo) |
| Sakana AI Scientist | Research-log + generated-paper output; no terminal dashboard component reported. | B (paper + vendor blog, loosely cross-checked) |
| AutoGPT-lineage CLI tools (AutoGPT/BabyAGI derivatives, broader `colorama`/`rich`-based Python CLI ecosystem) | Popularized live-colored terminal "agent thought" printing; "ANSI codes leak into piped/non-tty/CI output because color logic doesn't check `isatty`/a no-color flag consistently" is a well-documented, recurring footgun class across many CLI tools in this space, not unique to this repo. | B (cross-checked pattern across multiple community-reported issues; no single authoritative source for *this* repo class) |

Takeaway: hand-rolling ANSI coloring + fixed-width truncation in a pure, snapshot-tested function (this repo's explicit design choice, per `tui.ts`'s own header comment) is more correctness-sensitive than it looks, and the two independent bugs found here in consecutive relevant nights (pad() truncation on 10-24, verdictColor() leak tonight) are both instances of the same ecosystem-wide failure mode: color/reset logic that isn't gated by the same no-color check as everything else.

## Hypothesis (frozen before implementation, not modified after evaluation began)

> Given `renderDashboard()` called with `noColor: true` on a ledger containing at least one row whose verdict is `ACCEPT`, `REJECT`, `INCONCLUSIVE`, or any other string, when `verdictColor()` is changed to accept the caller's active theme object (`c`) and return its `.green`/`.red`/`.yellow`/`.gray` properties instead of the hardcoded module-level `C`'s, then the rendered frame contains zero `\x1b` (0x1B) escape bytes — relative to the current baseline, which leaks exactly one raw, unterminated-by-noColor ANSI escape per such row — subject to: 0 pre-existing tests removed or modified, `npm test`/`npm run lint`/`npm run build` all green, and byte-identical colorized (non-`noColor`) output (proving no regression to the colored rendering path).

## Candidate

`packages/cli/src/tui.ts` (+6/−6): `verdictColor(v: string)` → `verdictColor(v: string, c: typeof C)`; body changed from `C.green/C.red/C.yellow/C.gray` to `c.green/c.red/c.yellow/c.gray`; its one call site updated to `verdictColor(r.verdict, c)`. `packages/cli/src/index.test.ts` (+13/−0): 2 new tests. 2 files, one conceptual change, well under the 300-line target, no other call sites of `verdictColor` exist in the repo (confirmed by grep).

## Evaluation Receipt

Real evaluator: `npm test` (vitest, this repo's own `bench` entrypoint), `npm run lint`, `npm run build`. Baseline and candidate independently rebuilt/retested across a `git stash -u` / `git stash pop` boundary (not inferred from a diff alone).

| | Baseline (`main` @ `2fba255`) | Candidate |
|---|---|---|
| `npm run build` (6 workspaces) | clean | clean |
| `npm test` | **106/106** | **108/108** (+2, 0 removed/modified) |
| `npm run lint` | clean | clean |
| Manual repro: `\x1b` byte present in `renderDashboard(ledgerWithAcceptRow, {noColor:true})`? | **yes** — `"          \u001b[32mACCEPT    "` | **no** — `"          ACCEPT    "` |
| Manual repro: colorized (`noColor:false`) still contains `\x1b[32m` for ACCEPT? | yes (unchanged) | yes (unchanged — no regression) |

All rows: MEASUREMENT, independently reproduced, not inferred from logs.

## Baseline

`main` @ `2fba2550182d81b36423447221823e98e227482a` (the tip since PR #9, 2026-09-08 — no merges since). 106/106 tests, confirmed fresh tonight via `git stash -u`, not assumed from a prior night's log.

## Darwin Lineage

`DARWIN=not-applicable`. `@metaharness/darwin` is not installed in this workspace (confirmed: no such package under `node_modules`, and the repo's own `dream.config.json#evaluatorEntrypoints.darwin` entrypoint was already classified `blocked` on a prior night — issue #7/#8). This candidate is also a small, deterministic, exhaustively-branched pure-function fix with no evolvable population or fitness landscape — bounded Darwin is correctly out of scope, same conclusion as PR #95's own Darwin section for the sibling `pad()` fix.

## Evidence

- OBSERVATION: `dream-machine tui --no-color` run against this repo's real (schema-invalid-rows-and-all) `docs/dream-cycle/LEDGER.md` visibly printed literal `[32m`/`[38;5;245m`/`[33m` escape-sequence tails in captured non-tty output.
- MEASUREMENT: direct Node repro against the built `dist/tui.js`, both before (git-stashed parent) and after (candidate), see Evaluation Receipt table.
- MEASUREMENT: `npm test`/`lint`/`build` counts, both states, independently rebuilt.
- INFERENCE: root cause is `verdictColor()` reading `C` (module-level, always-real-ANSI) instead of `c` (the call site's resolved, possibly-no-op theme) — confirmed by reading the single call site and the `noColor` Proxy construction (`opts.noColor ? new Proxy({}, {get: () => ''}) : C`).
- DECISION: thread `c` through `verdictColor` rather than, e.g., stripping ANSI post-hoc with a regex (would reintroduce the exact truncation-time escape-splitting risk PR #95 just fixed in `pad()`) or gating at the call site only (would leave the function itself lying about being theme-aware, and miss any future second call site).

## Reward-Hack Check

Independent critic: a separate, fresh general-purpose subagent with no shared context, instructed to verify everything from the raw diff and its own from-scratch repro rather than trust this report's framing. **Verdict: CLEAR.** It independently: (1) confirmed via `git diff --stat` that the test-file diff is pure addition (no existing lines changed/removed); (2) reproduced the BEFORE defect itself across its own `git stash -u`/`pop` boundary with its own throwaway repro script against the built `dist/tui.js`, confirming the leak exists on the parent and is closed on the candidate by direct execution, not by trusting the diff; (3) independently reran `npm test` (108/108, cli package 31→33), `npm run lint` (clean), `npm run build` (clean, all 6 packages, both sides of the stash boundary); (4) ran the repo's `typecheck` script and found it fails on a **pre-existing, unrelated** `TS18002` (empty root `tsconfig.json#files`) untouched by this candidate — real per-package type-checking happens via `npm run build`, which it confirmed passed, verifying the `c: typeof C` signature type-checks soundly for both the real `C` and the `noColor` Proxy cast; (5) checked the diff against the `automerge.yml` protected-path regex — no match; (6) sanity-checked the test regex in Node (`/\x1b/` matches the real ESC byte, not the literal string `"x1b"`); (7) grepped every color reference in `renderDashboard` and found `verdictColor` was the *only* remaining hardcoded-`C` leak — title/stats/signals/footer already respected `noColor` — so the fix is complete, not partial, and does not mask or claim to fix the separate, already-tracked `pad()` truncation bug; (8) grepped the whole repo and confirmed `verdictColor` has exactly one call site, already updated, so the new required parameter breaks nothing else. Non-blocking observations noted: the repo's `typecheck` npm script is broken independent of this candidate, and the `pad()` truncation bug remains open (out of scope, correctly untouched).

## Security Review

`verdictColor()`/`renderDashboard()` are pure string functions over already-in-memory ledger markdown. Zero new I/O, network, exec, credential, filesystem, or dependency surface. The diff touches `packages/cli/src/tui.ts` and `packages/cli/src/index.test.ts` only — neither matches this repo's live `.github/workflows/automerge.yml` protected-path regex (`^(\.github/|packages/[^/]+/package\.json$|package\.json$|package-lock\.json$|.*/safety|.*/gate|.*(threshold|promotion|scorer).*|SECURITY\.md$)`), so it is *technically* auto-merge-path-eligible — but per this repo's own standing precedent (PR #95's Merge Policy section) and the global invariant against self-promotion, this session does not apply or recommend applying the `automerge-safe` label itself; that remains a human's call.

## Scan Findings

**cli:** Re-verified `packages/cli/src/entrypoint.ts`'s `classifyConfiguredEntrypoints()`/`verify-entrypoint(s)` commands (wired 2026-09-08, PR #8) — unchanged, still correct, still the only merged non-CI-permission PR in this repo's history. No new `cli`-dispatch-layer (`index.ts`/`parseArgs`) defect found tonight beyond the `tui`-layer one above; `parseArgs`'s handling of `--flag value`/`--flag=value`/bare `--flag` and every subcommand's positional indexing were re-traced by hand and are internally consistent.

**tui:** The finding above. Additionally re-confirmed (not re-fixed — out of scope, already owned by open PR #95) that `pad()`'s truncation branch still raw-slices on the parent commit; this candidate does not touch `pad()` and does not claim to fix that separate, already-tracked defect.

## Standing, higher-leverage finding (not re-litigated in depth, carried forward from PR #95 and ledger signals)

Tonight's `ledger signals` run again reports `zeroMergeStreak: true` across the (admittedly stale — see below) local `docs/dream-cycle/LEDGER.md`. Cross-checking GitHub directly: of ~53 `dream-cycle`-labeled issues and PRs opened since the first real night (2026-08-13), exactly **2** PRs have ever merged (#8, #9 — both on 2026-09-08, both either CI-infra or the entrypoint-liveness wiring named in ADR-0002), and **0** since. PR #95 itself already names the likely root cause (issue #10, a repo-admin GitHub Advanced Security/Code Security setting) as something "not something any PR can fix." This finding has now recurred across ≥3 prior `developer-experience` nights (#85 2026-10-19, #104 2026-10-29, and this run's own signal) — per this routine's own STEP 1.1 rule ("a finding repeated in ≥3 prior nights → rotate to the next slot's DEEP surface"), tonight deliberately does **not** re-litigate the backlog itself as the headline finding and instead delivers a new, narrow, testable code fix. Separately and structurally notable: `docs/dream-cycle/LEDGER.md` on `main` has not gained a new row since 2026-09-08 even though ~50 further nights of research clearly happened (visible only via GitHub issues #76–#115) — because each night's ledger-append is committed on its own unmerged feature branch, so the "durable cross-night memory" the compiled routine's STEP 1/STEP 2 rely on is, on `main`, badly out of date relative to the real history. That's a process/accumulation gap worth a human's attention independent of tonight's code candidate.

## Recommendation / Next Steps

1. **Human: review and merge (or reject) #95 and tonight's PR together** — both are small, independently-evaluated, non-overlapping fixes to the same file (`tui.ts`), both green, both already fully evaluated; merging neither for 50+ nights is the actual developer-experience cost here, not a missing candidate.
2. **Human/repo-admin: resolve issue #10** (the GitHub Advanced Security/Code Security setting named as the structural merge blocker) — until that's addressed, every future `developer-experience` (and other-surface) candidate will keep adding to an already-~50-PR backlog regardless of code quality.
3. **Future dream-cycle night (any surface) or human:** consider whether `docs/dream-cycle/LEDGER.md` append-on-`main` should happen independently of the candidate-PR merge lifecycle (e.g. a lightweight, always-fast-forwardable "ledger-only" commit path), so STEP 1/STEP 2's "durable memory across nights" assumption holds in practice and not just in the one branch that happens to merge.

## Witness

```
report_sha256 : 5084ea99e8a4b18d365968386047b6637545cb86c9bbd2b181b15ddb0cb0ebae
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : 830b39d5060663dbf95180cb2cee1976b7923ebc348dcd637f132d428a6ae99a
```

Verify (5 steps, coreutils only — this is `dream-machine witness verify <report-file> 2fba2550182d81b36423447221823e98e227482a 830b39d5060663dbf95180cb2cee1976b7923ebc348dcd637f132d428a6ae99a` under the hood):

```bash
curl -sL <this gist's raw URL> -o report.md
REPORT_HASH=$(sha256sum report.md | awk '{print $1}')
SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a
printf "%s%s" "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal: 830b39d5060663dbf95180cb2cee1976b7923ebc348dcd637f132d428a6ae99a
```

Note: this witness binds the report text *at the time it was stamped*. Any edit after this point (e.g. inserting the final gist URL into this same file) changes `report_sha256` and therefore the witness — see PR/issue for the final re-stamped value if this file is edited again after this line was written.
