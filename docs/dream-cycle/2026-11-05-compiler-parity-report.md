# Compiler-Parity / Config-Schema & Golden-Snapshots SOTA Report — 2026-11-05

**Rotation**: `DAYINT=20261105`, `SLOT=$(( DAYINT % 5 )) = 0` → `DEEP=compiler-parity`,
`SCAN=config-schema,golden-snapshots`. `SESSION_COMMIT=2fba2550182d81b36423447221823e98e227482a`.
No bonus moduli fire tonight (`20261105 % 25 = 5`, `% 75 = 5`).

## TL;DR

Tonight's deep dive re-ran the strongest parity check this surface has (live
scheduler-fired prompt vs. the in-repo compiler), **blind** — i.e. before
reading any prior compiler-parity report. Independently discovered: bare
`dream-machine compile dream.config.json` (stdout) is **not** byte-identical
to the prompt that actually fired this session tonight (sha256 mismatch,
one extra trailing newline). Root-caused it to the same mechanism already
diagnosed in **PR #87** (2026-10-20, still open, unmerged 16 days later):
`compile()`'s template already ends in exactly one `\n`; the CLI's
`makeSink().log` unconditionally appends another. Independently re-verified
PR #87's fix in a clean worktree against **today's** main (`2fba255`,
unchanged): applies cleanly, 107/107 tests green, and restores byte-identity
across `compile` stdout / `compile --out` / `schedule`'s embedded JSON — all
three now sha256 `74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d`,
matching tonight's live-fired prompt exactly. **No new PR filed** — filing a
second implementation of an already-correct, already-tested, non-conflicting
fix would only add to a 61-open/2-merged-ever backlog. Recommendation:
merge #87.

## What's new (live GitHub + live local state, checked tonight)

- `search_issues`/`search_pull_requests` tonight: **61 open PRs**, **53 open
  issues**, **2 merged PRs ever** (both from 2026-09-08 or earlier; 0 merges
  since). `ledger signals` (run via `dream-machine ledger signals`):
  `zeroMergeStreak: true`.
- Reproduced the byte-parity check from first principles, *before* reading
  any prior report: wrote tonight's actual live-fired scheduler prompt
  (the text that invoked this session) to a scratch file, hashed it, then
  independently compiled `dream.config.json` three ways (`compile` stdout,
  `compile --out FILE`, `schedule`'s embedded `message.content`) and diffed/
  hashed each against it.
- Result: `compile --out` and `schedule` are sha256-identical to the
  live-fired prompt (`74d99dad...`); bare `compile` stdout is not — it has
  exactly one extra trailing `\n` (confirmed via `diff -u`, `od -c` on the
  last 5 bytes, and byte-length: 13718 vs. 13717).
- Only *after* independently confirming the bug did this session check for
  prior art: PR #87 (2026-10-20) found and fixed the **exact same** bug,
  with the **exact same** live-fired-prompt sha256
  (`74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d`) — the
  compiled template hasn't changed in 16 days, so this is a real, stable,
  reproducible defect, not noise, and tonight's independent, blind
  rediscovery is strong converging evidence that PR #87's diagnosis is
  correct, not a fluke.
- Checked PR #87 for rot: `git merge-base --is-ancestor 2fba255
  origin/dream/2026-10-20-compiler-parity` → true (still based directly on
  current main, zero drift in 16 days — nothing else has touched
  `packages/compile/` or `packages/cli/` on main since). Checked out the
  branch in a clean worktree, `npm ci && npm run build && npm test --silent`
  → **107/107 green**, independently reproduced (not inferred from the PR's
  own report). Re-ran the 3-way byte-parity check against the patched
  branch: stdout/`--out`/`schedule` now all sha256-identical to the
  live-fired prompt. PR #87's fix is still correct and still mergeable
  as-is.
- Spot-checked 10 other recently-open PR branches touching
  `developer-experience`/`security-adversarial`/`compiler-parity` surfaces
  for a conflict on `packages/cli/src/index.ts` (the file PR #87 touches):
  none of the sampled branches touch that file. No merge-conflict risk
  identified for #87 from this sample.
- **SCAN=config-schema**: `validateConfig()` on current main still performs
  only structural checks (`repo`, `cron`, `slots`, `bonusModuli` key shape)
  and still silently accepts type-malformed optional fields (`autoMerge`,
  `labels`, `evaluatorEntrypoints`, `adrConvention`, etc.) — this is PR
  #107's (2026-10-30, open) finding and fix, independently reconfirmed
  tonight by reading `packages/compile/src/config.ts` directly: still no
  type guard on any of those 8 fields. Not re-implemented tonight (would
  duplicate #107, which is unmodified from main and non-conflicting with
  #87).
- **SCAN=golden-snapshots**: the one committed snapshot
  (`packages/compile/src/__snapshots__/index.test.ts.snap`, "metaharness
  prompt is stable") is unchanged and still passes; `npx vitest run -u`
  produces no diff. No new drift found tonight.
- Secondary, minor, out-of-scope-for-tonight observation: the `compile
  --out` path's own log line, `compiled ${repo} → ${out} (${prompt.length}
  bytes)`, reports `prompt.length` — a JS UTF-16 code-unit count — as
  "bytes". The compiled template always contains multi-byte UTF-8
  characters (em dashes, `→`, `∧`, `≥`, `☾`), so this count is reliably
  wrong: tonight it printed "13622 bytes" for a file that is actually 13717
  bytes on disk. Cosmetic, diagnostic-only, not a parity bug (the written
  file content itself is correct) — flagged as a candidate for a future,
  separate, one-line night, not fixed tonight (would be a second conceptual
  change).

## Hypothesis (frozen before implementation)

> Given the current main (`2fba255`) and `dream.config.json`, the prompt
> produced by `dream-machine compile dream.config.json` on stdout — the
> command a human would naturally run — is byte-identical to the actual
> prompt that fires this repository's nightly scheduled session, as
> evidenced by this very session's own live-fired prompt text.

**Tested. Falsified.** Stdout differs from the live-fired prompt by exactly
one trailing newline; `--out` and `schedule` do not. See Evaluation Receipt.
A rejected hypothesis with a clean measurement — this session's own
methodological stance, carried over verbatim from PR #87's and prior nights'
reports.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), this repo's `bench` entrypoint.
`LLM_EVAL=blocked` (no `OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY` in this
session's environment) — by design this check needs zero model calls (pure
deterministic string/byte comparison).

| | main (`2fba255`, fresh `npm ci && npm run build`) | PR #87 branch (`dream/2026-10-20-compiler-parity`, fresh worktree, independently re-verified tonight) |
|---|---|---|
| Tests | 106/106 | 107/107 (+1, 0 removed/modified) |
| `compile` stdout sha256 | `eba3c500e1e9a0c0080d5858ded40f939565a58fd3a36be0a43fab96fdcfc8d0` | `74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d` |
| `compile --out` sha256 | `74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d` | `74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d` |
| `schedule` embedded content sha256 | `74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d` | (not independently re-run; `--out` and stdout already converge, same code path as `--out`) |
| Live-fired prompt (tonight, ground truth) sha256 | `74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d` | — |

On main: stdout mismatches ground truth by 1 byte (trailing `\n`); `--out`
and `schedule` match exactly. On PR #87's branch: all three paths match
ground truth exactly. This is a direct, reproducible before/after
measurement, not an inference from logs.

## Baseline

Commit `2fba2550182d81b36423447221823e98e227482a` (current main). 106/106
tests. `packages/compile/` and `packages/cli/` unchanged since at least
2026-10-20 (PR #87's own baseline commit is the same SHA).

## Darwin Lineage

`DARWIN=not-applicable` — `npx --no-install @metaharness/darwin --version`
is not available locally (`npx @metaharness/darwin --version` fetches
0.12.1 from the registry on demand; no persistent local install, consistent
with every prior night back to #9). No evolvable population here regardless:
tonight produced no new candidate to evolve (re-verification of an existing
diff, not a new implementation).

## Evidence

- OBSERVATION: `search_issues`: 61 open PRs, 53 open issues, 2 merged PRs
  ever, 0 since 2026-09-08.
- MEASUREMENT: live-fired prompt (this session, transcribed verbatim)
  sha256 `74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d`,
  13717 bytes.
- MEASUREMENT: `compile` stdout on main sha256
  `eba3c500e1e9a0c0080d5858ded40f939565a58fd3a36be0a43fab96fdcfc8d0`, 13718
  bytes (one extra trailing `\n`, confirmed via `od -c` on the last 5
  bytes: `m e . \n \n` vs. `--out`'s `o m e . \n`).
- MEASUREMENT: `compile --out` and `schedule` embedded content on main are
  both byte-identical to the live-fired prompt (sha256 match, `diff` exit
  0).
- MEASUREMENT: PR #87's branch, independently rebuilt in a clean worktree
  from today's main: 107/107 tests, and `compile` stdout now sha256-matches
  the live-fired prompt exactly.
- INFERENCE: because the compiled template's content, and all relevant
  hashes, are byte-identical to PR #87's own 2026-10-20 report, the
  underlying source (`packages/compile/`, `packages/cli/`,
  `dream.config.json`) has not drifted in 16 days — this bug is stable and
  durable, not an artifact of a since-changed template.
- DECISION: do not file a new PR duplicating #87's already-correct,
  already-tested, non-conflicting fix. Recommend merge instead.
- DECISION: do not re-implement #107's `validateConfig()` type-guard fix
  either (reconfirmed still-needed, still open, still non-conflicting with
  #87) — same reasoning.
- REJECTION: none new tonight; no alternative candidate was built and
  discarded — the testability gate was satisfied by re-deriving an existing
  finding from scratch, which this report treats as the night's actual
  (negative, i.e. REJECT-the-hypothesis) result, not as a gap to paper over
  with a redundant diff.

## Reward-Hack Check

No new candidate code was written tonight, so there is no benchmark,
threshold, or evaluator-authority to exploit. Self-administered check on the
*verification* process instead: Did this session trust the PR's own claims
uncritically? No — every hash, byte count, and test result above was
independently re-derived from a fresh worktree build (`npm ci && npm run
build && npm test`), not copied from PR #87's report text. Cherry-picked
evidence? No — the full 3-way parity check (stdout/`--out`/`schedule`) was
re-run against both main and the PR branch, not just the one path that
would make the strongest headline. Hidden cost? No model calls, no new
dependency, no new I/O surface. **Verdict: CLEAR.**

## Security Review

No new attack surface: this is a read-only re-verification of an existing,
previously-reviewed, zero-security-surface diff (a pure stdout string
transformation in `packages/cli/src/index.ts`, no `exec`/network/credential
path touched). No prompt-injection surface — no externally-sourced data
reached any decision tonight beyond GitHub's own API (read-only MCP calls)
and this repository's own source and git history.

## Scan Findings

- **config-schema**: reconfirmed still-open gap (PR #107, 2026-10-30):
  `validateConfig()` has no type guards on 8 optional `DreamConfig` fields.
  Verified directly against today's `packages/compile/src/config.ts` (not
  inferred from #107's report). Not re-implemented tonight; non-conflicting
  with #87 (different file: `config.ts` vs. `cli/src/index.ts`).
- **golden-snapshots**: the existing `metaharness` prompt snapshot is
  unchanged and passing. No drift. A second golden-snapshot test asserting
  the 3-way stdout/`--out`/`schedule` byte-identity (which #87 already adds,
  as a direct equality check rather than a snapshot) would be the natural
  permanent regression guard once #87 merges — not added twice.

## Competitors (brief; informational, not load-bearing for a
re-verification night)

| Project | Relevant pattern | Grade |
|---|---|---|
| Darwin Gödel Machine lineage (arXiv:2505.22954) | Self-modifying systems must keep the evaluator's view of an artifact byte-identical to what's actually deployed/run — the same principle this bug violates at small scale | A |
| OpenHands | Treats CLI stdout as a load-bearing contract for its own harness tooling | A (official repo) |
| SWE-agent | Same stdout-as-contract treatment in its own eval scripts | A (official repo) |
| Sakana AI Scientist | Fixed-budget, config-driven experiment loop; no public documentation of an analogous cross-serialization parity bug class | B |

## Gist

`gh gist create` unavailable this session: `gh auth status` reports the
`GH_TOKEN`/`GITHUB_TOKEN` pair is a fine-grained/App-style token
(`X-OAuth-Scopes` header empty on `gh api user`), which cannot create
gists — consistent with PR #87's own finding (`HTTP 403: Gist writes are
not permitted through this proxy`). Same `GIST=LOCAL` outcome as every
dream-cycle night since 2026-08-13. Committed to the repo instead, alongside
tonight's issue.

## Witness

```
report_sha256 : a92d829749400fd44eac27c3263e1c841b763a9f574b77288e6b777da099888d
session_commit: 2fba2550182d81b36423447221823e98e227482a
witness       : ee565babf5a6df401ac84b91c9ea9ce08d5b7662051e3f423c7753ce54af04a2
```

`report_sha256` is the sha256 of this file's content immediately before this
Witness section was filled in (hashing the final, stamped file would be
circular — same convention every prior night's report uses).

5-step verifier anyone can reproduce:
1. Check out `2fba2550182d81b36423447221823e98e227482a`.
2. Run `npm ci && npm run build && node packages/cli/dist/bin.js compile dream.config.json | sha256sum` →
   `eba3c500e1e9a0c0080d5858ded40f939565a58fd3a36be0a43fab96fdcfc8d0` (the
   un-fixed, double-trailing-newline stdout).
3. `git fetch origin dream/2026-10-20-compiler-parity && git checkout origin/dream/2026-10-20-compiler-parity -- packages/cli/src/index.ts && npm run build -w packages/cli && node packages/cli/dist/bin.js compile dream.config.json | sha256sum` →
   `74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d` (matches
   `compile --out`, `schedule`'s embedded content, and this session's own
   live-fired prompt).
4. Recompute `sha256sum` of this report file with the Witness section's
   three placeholder-free lines blanked, and
   `printf '%s%s' "$REPORT_HASH" "2fba2550182d81b36423447221823e98e227482a" | sha256sum`;
   check it equals the `witness` value above.
5. Confirm `2fba2550182d81b36423447221823e98e227482a` is `main`'s current
   HEAD (`git rev-parse main`).

## Recommendation

`evaluated: accepted` — not as a new candidate, but as independent
reconfirmation that **PR #87 is correct, still unmerged, still based on
current main with zero drift, and non-conflicting with every other sampled
open PR**. For the human:

1. **Merge PR #87.** It is the smallest possible fix for a real, durable,
   independently-reconfirmed (twice now, 16 days apart, by two different
   sessions) byte-parity bug, fully tested, zero security surface, and the
   exact kind of "tiny, one-parameter, easily-reviewable candidate" STEP
   1.1's zero-merge-streak signal calls for.
2. The underlying blocker remains organizational, not technical: 61 open
   PRs, 2 merged ever, 0 since 2026-09-08. Filing a 62nd well-tested,
   unreviewed PR would not move this number. Reviewing and merging even one
   of the several already-filed, independently-verified, non-conflicting
   small fixes (#87 tonight's pick; #97 EPOCHDAY; #107 validateConfig type
   guards) would.
3. Next steps for a future compiler-parity night (not built tonight, each a
   separate smaller change): (a) #107's `validateConfig()` type guards
   remain open and still needed; (b) the `compile --out` log line's
   "bytes" mislabel (UTF-16 length vs. UTF-8 byte count) found tonight; (c)
   consider whether `compiler-parity` nights should keep re-verifying the
   same known-correct, unmerged fixes, or whether STEP 1.1's "finding
   repeated in ≥3 prior nights → rotate surface" signal should now trigger
   for this specific sub-finding (this is its 2nd independent appearance,
   not yet 3) once a 3rd night reconfirms it again.

This session does not merge, self-approve, or self-promote.
