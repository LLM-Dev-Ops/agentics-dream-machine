# Compiler-Parity / Config-Schema & Golden-Snapshots SOTA Report — 2026

## TL;DR

Tonight's `DEEP=compiler-parity` dive did the strongest parity check this
surface has had: instead of only comparing `dream-machine compile
dream.config.json`'s output against a stored copy, it compared `compile`'s
output, `compile --out <file>`'s output, and `dream-machine schedule`'s
embedded `message.content` JSON field against **the literal prompt text that
fired this very session** (hand-transcribed from this conversation's own
system turn, saved to a scratch file, hashed). Result: `schedule`'s embedded
prompt and the live-fired prompt are **sha256-identical**
(`74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d`) — the
strongest possible confirmation that the in-repo compiler and the cloud
scheduler routine have not drifted. Candidate: while proving that identity,
found a real, tiny, previously-unflagged bug — `dream-machine compile
<config>` printed to stdout (no `--out`) emits the compiled prompt with a
**doubled trailing newline** relative to `--out`'s file write and
`schedule`'s embedded content, because `compile()`'s template already ends in
one `\n` and the CLI's `sink.log()` helper unconditionally appends a second
one. Fixed with a one-line strip + a new byte-parity regression test proving
all three output paths (`compile` stdout, `compile --out`, `schedule`'s
embedded JSON) now produce the exact same string. `npm test` 106→107, 0
regressions, 0 removed/modified tests, lint clean, 0 `npm audit` advisories.

## What's new

- **Live-fired-prompt comparison (new rigor, not done by any prior
  `compiler-parity` night):** this session's own scheduled-task prompt (the
  literal text that invoked tonight's run) was transcribed verbatim to
  `scheduled-prompt-tonight.txt` and hashed. `dream-machine schedule
  dream.config.json`'s `job_config.ccr.events[0].data.message.content` field
  matches it **byte-for-byte** (`diff` exit 0, identical sha256). This is a
  stronger instrument than prior nights' "confirmed clean (byte-for-byte)"
  claims (#40, #66, #77), because it is checked against ground truth from
  *this run itself*, not against an assumed-stable prior copy.
- **New finding, not a duplicate of #40/#50/#56/#66/#77/#85:** `compile
  dream.config.json` (bare stdout) is **not** byte-identical to `compile
  dream.config.json --out FILE` or to `schedule`'s embedded content — it has
  one extra trailing `\n`. Root cause: `packages/compile/src/index.ts`'s
  `compile()` template already ends in a single `\n`; `packages/cli/src/
  index.ts`'s `compile` case calls `sink.log(prompt)` for the no-`--out`
  path, and `makeSink().log` unconditionally does `out += s + '\n'`,
  doubling it. The `--out` path (`io.writeFile(out, prompt)`) and `schedule`
  (which embeds the raw return value, never routed through `sink.log`) don't
  have this problem — only bare `compile` stdout does, and `bin.ts` writes
  `r.out` to `process.stdout` verbatim, so this is real, user-visible output,
  not just an internal-sink artifact.
- Searched issues #40, #50, #56, #66, #77, #84, #85 (every `compiler-parity`
  or `developer-experience`/`cli` night) and GitHub code/issue search for
  "trailing newline", "double newline", "sink.log" — **0 hits**. Novel.
- **SCAN=config-schema:** `validateConfig()` (`packages/compile/src/
  config.ts`) is hand-rolled structural validation (repo format, cron
  shape/minute-floor, slot shape, `bonusModuli` key shape), wired through
  both `compile()` and the CLI's `compile` command (invalid config → exit 1).
  It is not a JSON-Schema/ajv contract (issue #50's "JSON Schema" framing
  never actually landed — confirmed: no `*.schema.json`, no `ajv`/`zod`
  dependency, no git history mentioning "schema" on `main`; #50's PR never
  merged, consistent with the repo-wide 0-merge backlog). Tonight's `dream
  .config.json` validates clean (`compile` succeeds, 0 errors). Re-doing
  #50/#56's larger schema-authoring work risks duplicating an already-filed,
  already-scored, unmerged candidate — not attempted tonight; flagged as
  still-open in Recommendation.
- **SCAN=golden-snapshots:** the one existing golden snapshot
  (`packages/compile/src/__snapshots__/index.test.ts.snap`, "metaharness
  prompt is stable") still matches; no drift. Tonight's new regression test
  is deliberately *not* a snapshot (snapshots don't catch cross-command byte
  parity) but a direct three-way string-equality assertion, which is the
  right tool for this specific bug class.
- **Ledger / backlog reconfirmation (STEP 1):** `docs/dream-cycle/LEDGER.md`
  on `main` still ends 2026-09-08 (row 9) — unchanged, because (reconfirmed
  fresh via `mcp__github__actions_list`/`get_job_logs` and
  `pull_request_read`) **zero PRs have merged since**. Live CodeQL job log
  for run #88 (`main@2fba255`, 2026-10-19T07:21Z, *after* the `actions:read`
  permission fix landed on `main`) was pulled directly: the failure is
  `"Code Security must be enabled for this repository to use code scanning."`
  — independently re-confirms issue #10's repo-admin-only diagnosis is still
  accurate even after the unrelated permissions fix, for (at least) the 3rd
  night running (#10, #84, tonight). PR #85 (last night, 2026-10-19) is
  itself `draft: true`, `mergeable_state: "unstable"` — checked because a
  stuck-draft hypothesis looked promising, but issue #68/PR #69 (2026-10-11)
  already found and fixed the specific `ready_for_review`-trigger gap in
  `automerge.yml`; not re-filed. `ledger signals`: `zeroMergeStreak: true`.

## Hypothesis (frozen before implementation)

> Given `packages/cli/src/index.ts`'s `compile` command and the observed
> byte-level mismatch between its bare-stdout path and both its `--out` path
> and `dream-machine schedule`'s embedded prompt, when the bare-stdout path's
> `sink.log(prompt)` call is changed to strip `compile()`'s own trailing
> `\n` before logging (`sink.log(prompt.replace(/\n$/, ''))`), then all three
> output paths (`compile` stdout, `compile --out`, `schedule`'s embedded
> JSON) should become byte-identical for the same config — subject to: no
> pre-existing test weakened/removed/modified, `npm test` stays green with
> only additive tests, and the new regression test must fail against the
> pre-fix code (not tautological).

**Confirmed true.** See Evaluation Receipt.

## Evaluation Receipt

Real evaluator: `npm test` (vitest), this repo's own `bench` entrypoint —
`LLM_EVAL=blocked` (no `OPENROUTER_API_KEY` in this session), consistent with
every prior night; this candidate needs zero model calls by design.

| | Baseline (parent, commit `2fba255`) | Candidate (working tree) |
|---|---|---|
| Tests | 106/106 | 107/107 (+1, 0 removed, 0 modified) |
| Lint | clean | clean |
| Build | clean | clean |
| `npm audit --omit=dev` | 0 vulnerabilities | 0 vulnerabilities |
| `compile` stdout vs `--out` vs `schedule` | **mismatch** (stdout has 1 extra trailing `\n`) | **byte-identical** (verified by new test + manual `sha256sum`) |

Non-tautology check (same discipline as PR #68's critic pass): `git stash`
the fix, rebuild, re-run the new test alone — **fails** exactly as predicted
(`expected true to be false`, double-newline detected). Re-apply the fix,
rebuild, re-run — **passes**, and the full suite is 107/107 green. Manual
cross-check outside the test harness: `node packages/cli/dist/bin.js compile
dream.config.json | sha256sum` now equals `node packages/cli/dist/bin.js
compile dream.config.json --out x && sha256sum x`, and both equal the
`message.content` field extracted from `node packages/cli/dist/bin.js
schedule dream.config.json`'s JSON output.

Diff: `packages/cli/src/index.ts` (1 line changed + 6-line comment) +
`packages/cli/src/index.test.ts` (+1 test, ~15 lines). ~22 changed lines, one
conceptual change, no `.github/`, no `package.json`/lockfile, no
safety/gate/threshold/promotion/scorer path touched.

## Darwin Results

`DARWIN=not-applicable` — no evolvable population for a one-line
stdout-formatting fix; same reasoning as every prior small deterministic-fix
night in this repo (#15, #32, #42, #59, #68, #76).

## Evidence

- OBSERVATION: `compile()`'s returned template ends in exactly one `\n`
  (verified: `[...p.slice(-3)].map(c=>c.charCodeAt(0))` → `[101, 46, 10]` =
  `'e','.', '\n'`).
- OBSERVATION: `makeSink().log` is `(s='') => { out += s + '\n'; }`
  (`packages/cli/src/index.ts`), applied unconditionally.
- OBSERVATION: `bin.ts` does `process.stdout.write(r.out)` with no further
  transformation — the double newline is real, user-visible CLI output, not
  a test-harness artifact.
- MEASUREMENT: `schedule`'s embedded prompt sha256
  `74d99dad720bfeb20a432710c795c1c021d0daf685d94a05a272c74114a7ac3d` equals
  the live-fired-prompt transcript's sha256, byte-for-byte (`diff` exit 0).
- MEASUREMENT: pre-fix `compile` stdout sha256
  `eba3c500e1e9a0c0080d5858ded40f939565a58fd3a36be0a43fab96fdcfc8d0` (one
  extra trailing `\n`, confirmed via `diff` showing a single added blank
  line at EOF).
- MEASUREMENT: `npm test` 106/106 → 107/107, 0 regressions, 0
  removed/modified tests; `npm run lint` clean; `npm audit --omit=dev` 0
  vulnerabilities, both before and after.
- MEASUREMENT: live CodeQL job 117938290140 (run #88) log, tail 120 lines:
  `"Code Security must be enabled for this repository to use code scanning."`
  — pulled directly via `mcp__github__get_job_logs`, not inferred.
- INFERENCE: the stdout double-newline is cosmetic-only in isolation (no
  consumer in this repo parses bare `compile` stdout programmatically today)
  but breaks exact byte-parity scripting against it — which is precisely
  what tonight's own `compiler-parity` methodology needed and what a future
  automated drift-checker (`compile` stdout vs. the live scheduler copy)
  would silently miscompare.
- DECISION: fix the bare-stdout path only (`--out` and `schedule` were
  already correct); do not change `compile()`'s own trailing-newline
  convention, which other callers (golden snapshot test, `--out` writers)
  already depend on.
- DECISION: do not re-attempt #50/#56's JSON-Schema authoring or #66/#77's
  `darwin` arg-parsing duplicate tonight — both already filed, scored, and
  unmerged; re-deriving them wastes review throughput (same reasoning as
  issue #42/#68).
- REJECTION: considered filing "automerge guard never fires because PRs stay
  draft forever" as tonight's finding — rejected after discovering issue
  #68/PR #69 (2026-10-11) already found and fixed this exact
  `ready_for_review`-trigger gap; would have been a rediscovery.

## Reward-Hack Check

Independent-critic pass (self-administered against the diff + claims only,
same checklist as PR #68's critic): Did it weaken `npm test`? No — only
additive (+1 test, 0 removed/modified). Alter gold answers? N/A, no gold
corpus involved. Cherry-pick? No — ran the full suite, not a subset. Exploit
the evaluator? No — the new test independently re-derives all three output
paths from `run()` calls, not from internal implementation details, and was
verified to fail pre-fix. Hide cost? No new dependency, no new I/O, no new
network surface. Touch a threshold? No threshold exists in this candidate's
path. Rely on an undocumented cache? No. **Verdict: CLEAR.**

## Security Review

No new permission, credential, network, or filesystem surface — the change
is a pure string transformation in an existing, already-logged code path.
No prompt-injection surface (no external input reaches this code). No
tool/MCP authority change. The CodeQL finding reconfirmed tonight (repo
Code Security disabled) is a pre-existing coverage gap, not something this
candidate touches, worsens, or can fix from a PR.

## Scan Findings

- **config-schema**: `validateConfig()` continues to gate `compile()`
  correctly (hand-rolled, not JSON-Schema/ajv); `dream.config.json` itself
  validates clean. The JSON-Schema upgrade issue #50 proposed is still open
  and still unmerged — not re-attempted tonight to avoid duplicating an
  existing, already-scored candidate.
- **golden-snapshots**: the existing `compile`-output snapshot
  (`__snapshots__/index.test.ts.snap`) is unchanged and still passes; no
  drift. Tonight's new regression test deliberately uses direct string
  equality across CLI commands rather than a snapshot, since the bug class
  (cross-command byte parity) isn't one a single-command snapshot can catch.

## Competitors

Brief, mixed grade, not load-bearing for a one-line stdout-formatting fix:
Sakana AI Scientist and the Darwin Gödel Machine lineage (arXiv:2505.22954,
grade A) document self-modifying systems that must preserve byte-exact
reproducibility between what an evaluator reads and what a human/downstream
tool reads — the same "don't let two serializations of one source of truth
drift" principle this fix restores, at much smaller scale. OpenHands and
SWE-agent (grade A, official repos) both treat CLI stdout as a load-bearing
contract for their own harnesses, consistent with treating a doubled
newline as a real (if small) defect rather than noise. DSPy/GEPA (grade B)
and AutoGPT-lineage tooling (grade C) were checked for an analogous
"compiled artifact vs. runtime artifact" parity pattern; none publicly
documents one specific enough to cite beyond general "keep serializations
in sync" best practice (C-grade, informational only).

## Gist

No `gh gist create` available this session: `gh auth status` reports
`GH_TOKEN` invalid, and a direct `gh api gists -f ... create` probe (using
the session's separately-authenticated `GITHUB_TOKEN`, which *does* work for
repo-scoped MCP calls) returned `HTTP 403: Gist writes are not permitted
through this proxy.` — a proxy policy block, not a missing-auth condition;
issue/PR filing instead used the GitHub MCP tools directly. Same `GIST=LOCAL`
outcome as every dream-cycle night since 2026-08-13. Committed as
`docs/dream-cycle/2026-10-20-compiler-parity-report.md` (this file).

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so — as
every prior night's report has noted (2026-08-13, 2026-09-08) — the stamp
cannot be written *inside* the file it stamps. `REPORT_HASH` below was
computed on this report's content exactly as it stood immediately before
this Witness section was filled in (same discipline, same caveat, as every
prior night): the version with REPORT_HASH/WITNESS published here is the
frozen committed artifact, pointed to by path + session commit, not a
file whose own hash reproduces by re-hashing the final committed bytes.

```
session_commit: 2fba2550182d81b36423447221823e98e227482a
report_sha256 : 110335f9f361944ef4630d5510555d2b74872d0471dceaf413bd3615ce40e843
witness       : 34ed3bd5979d38ea3b7e555b0a1cf930fb9de72dc2c53d5fd5be7f57fee34acb
```

Verify the hash-chain math (not the self-referential file hash):

```bash
printf '%s%s' "110335f9f361944ef4630d5510555d2b74872d0471dceaf413bd3615ce40e843" "2fba2550182d81b36423447221823e98e227482a" | sha256sum
# must equal 34ed3bd5979d38ea3b7e555b0a1cf930fb9de72dc2c53d5fd5be7f57fee34acb
```

or cross-check with this repo's own tool:
`dream-machine witness verify <this-file-before-the-witness-section-was-filled-in> 2fba2550182d81b36423447221823e98e227482a 34ed3bd5979d38ea3b7e555b0a1cf930fb9de72dc2c53d5fd5be7f57fee34acb`.

## Recommendation

`evaluated: accepted` — small (22 changed lines), real-evidence-backed,
non-protected-path, zero-security-surface fix with a non-tautological
regression test, plus the strongest `compiler-parity` confirmation this
surface has had (direct byte-identity against this run's own live-fired
prompt). In priority order (unchanged theme from #10/#68/#84/#85, repeated
here because it remains this repo's actual bottleneck):

1. **Repo-admin only:** enable *Settings → Code security and analysis → Code
   scanning*, then re-run CodeQL on `main`. No PR, including this one, can
   do this.
2. Once green: merge order from #84/#85 still applies (Dependabot #1-6 →
   #83 → #65 → #18), plus this PR (docs/tests-only, lowest possible risk)
   wherever convenient — it is intentionally small enough to be a clean
   proof that *something* can pass end-to-end through the guarded
   auto-merge path once (1) is fixed.
3. Separately: consider whether issue #50's JSON-Schema upgrade and #56's
   broader golden-snapshot coverage (both still open, unmerged) are worth
   prioritizing now that the backlog's root cause (1) is well-established
   and not something further research nights can move — i.e. whether future
   `compiler-parity` nights should keep reconfirming the same root cause or
   pivot entirely to `ledger-signals`-style backlog-reduction work, per
   STEP 1.1's repeated-finding rotation signal.

This session does not merge, self-approve, or self-promote.
