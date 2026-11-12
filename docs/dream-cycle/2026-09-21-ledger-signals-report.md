# Ledger-Signals SOTA Report — 2026

## TL;DR

The Dream Machine's only durable cross-night memory (`docs/dream-cycle/LEDGER.md`)
was contaminated for 26 days by a drive-by commit that bulk-inserted 5 rows
describing *other repositories'* nightly cycles — rows that fail this repo's
own `ledger verify` schema and were flagged unresolved for 2 consecutive
nights. Root cause: `ledger verify` existed and was correct, but nothing ran
it automatically, and the parser had no table boundary, so any trailing
content in the file was fair game to be silently swept in as "ledger rows."
Tonight: traced the contamination to its origin commit, quarantined it
verbatim (not deleted, not force-normalized), bounded the parser to one
contiguous table, wired `ledger verify` into CI as a required gate, and
fixed a second live consumer (`scripts/dream-nightly.mjs`) that an
independent critic caught would otherwise have been broken by this very fix.

## What's new

- `git blame` + `git show <commit> --stat` used to attribute contamination
  to a specific commit and PR, not just describe the symptom.
- A markdown-table parser hardened to a documented boundary (first
  contiguous table only) instead of "any line with a pipe, forever."
- A regression test that binds directly to the real evidence file
  (`docs/dream-cycle/LEDGER.md`) rather than only to fixtures — so CI now
  fails the instant the real file regresses, not just when a synthetic test
  case does.
- An independent-critic pass (fresh subagent, no shared context) that found
  a real, verified functional regression in code this diff touched only
  indirectly — the value case for tonight's SCAN=witness/verify pairing.

## Hypothesis (frozen before evaluation)

> Given the current `LEDGER.md` (9 rows, 7 of which — rows 2-8 — were
> bulk-inserted by an unrelated commit and reference issues/PRs/repos
> foreign to this repository), when the foreign rows are quarantined into a
> non-tabular, verbatim archival section and `dream-machine ledger verify`
> is wired as a required CI gate, then `ledger verify` should go from 9
> schema errors (exit 1) to 0 errors (exit 0) on the primary table,
> `ledger signals`/`ledger stats` should reflect only this repository's
> genuine nights, and the full existing test suite should remain green
> with 0 regressions — subject to: no historical evidence is deleted (only
> relocated with an explanatory header), and the change touches no
> evaluation/benchmark gold data.

No model calls were required or used to test this hypothesis — it is
fully deterministic (parser logic + a real evidence file), which also
means `LLM_EVAL=blocked` tonight (no `OPENROUTER_API_KEY` configured) did
not constrain candidate selection at all.

## Competitors — how other agentic-research loops handle durable memory/provenance

| System | Durable memory / log mechanism | Integrity safeguard against silent corruption | Grade |
|---|---|---|---|
| Sakana AI Scientist / AI-Scientist-v2 | Growing "archive of knowledge" across iterative discovery runs; papers propose Research Attribution/Process Markup Language for provenance | Community critique (arXiv 2502.14297) explicitly calls for *stronger* provenance/versioning — i.e. acknowledged as an open gap, not solved | B (official repo + peer critique, cross-checked) |
| SWE-agent / SWE-Replay | Full JSON trajectory dump per step; deterministic replay from archived trajectories | Replay-based debugging surfaces bad trajectories after the fact; no CI-time schema gate on the trajectory store itself found in sources | B (arXiv 2601.22129, official repo) |
| DSPy GEPA | Reflective traces feed a Pareto frontier of candidate prompts; ancestry/lineage tracked per candidate | Pareto-front acceptance is itself a quality gate (a mutation must improve before entering memory) — closer in spirit to tonight's "quarantine bad data, don't let it silently become gold" principle, but scoped to prompt candidates, not a cross-run ledger | B (official docs + GitHub, cross-checked) |
| OpenHands | Structured evaluation-harness trajectories; broader literature (Reflexion, Generative Agents, MemGPT) treats episodic memory as retrieved/reflected-upon text | No source found describing an automated schema/integrity gate on the trajectory store analogous to tonight's `ledger verify` CI step | C (docs page + survey papers, single-source per claim) |

**Where this repo now sits relative to the field**: none of the four
surveyed systems' public documentation describes a CI-enforced schema gate
on their durable log specifically to catch cross-run/cross-source
contamination after the fact — DSPy GEPA's Pareto-front acceptance is the
closest analog, but it gates *entry*, not *drift already committed*.
Tonight's fix (quarantine + parser boundary + CI gate + a canary bound to
the real file) is a smaller, more mundane mechanism than any of these
research systems, but it directly closes a gap none of them document
solving either.

## Evaluation (real evaluator, both parent and candidate)

Evaluator entrypoints: `bench: npm test` (deterministic, no model calls),
plus the repo's own `dream-machine ledger verify` CLI as the tool under
test/repair.

| | Parent (HEAD, `2fba255`) | Candidate |
|---|---|---|
| `ledger verify --path docs/dream-cycle/LEDGER.md` | 9 errors, exit 1, rowCount 9 | 0 errors, exit 0, rowCount 3 |
| `npm test` | 106/106 passed | 108/108 passed (+2 new tests) |
| `npm run lint` | clean | clean |
| `npm run typecheck` | pre-existing failure (empty `files` in `tsconfig.json`) | identical pre-existing failure — unrelated to this candidate, reproduced on parent |
| `npm run build` | clean | clean |

Diff size: 5 files, +106/-5 lines (after the critic-driven fix to
`scripts/dream-nightly.mjs`) — one conceptual change (ledger integrity:
trace → quarantine → bound parser → gate CI → fix the second consumer the
critic found).

## Independent critic (adversarial, separate subagent, no shared context)

First pass: **BLOCKED**. Found that `scripts/dream-nightly.mjs` derived its
auto-appended `priorFates` field via `tail -n 3 | head -n 1` on the raw
file — which, after the quarantine appendix was added at file-end, would
have silently returned a quarantined foreign row as "prior fates" for
every future automated append, re-injecting the very contamination this
fix claims to have resolved, into a code path the original diff neither
touched nor tested.

Fix applied: `priorFates` now derives from `@dream-machine/ledger`'s real
`parseLedger`, taking the last parsed row's `finding` field — correct
regardless of what trailing content the file carries. Manually verified
(no existing test harness covers this script) against the real post-fix
ledger: returns the actual last night's finding, not quarantined data.

Second pass verdict: **CLEAR**. No historical data deleted or silently
altered (quarantined rows confirmed byte-for-byte identical to
`git show df9ff404`); `verifyLedger`'s schema rules unchanged (not
weakened); all 9 originally-reported errors addressed, none hidden or
cherry-picked; CI gate has no `continue-on-error`/`|| true`; build/lint/test
independently reproduced by the critic. Two minor (non-blocking) notes
recorded in ADR-0003 §3 as deferred follow-up: (a) the new parser table
boundary is silent — a future accidental blank line before a legitimate
row would drop it with no diagnostic; (b) the new CI step runs redundantly
across all 3 Node matrix legs (harmless).

## Security review

Ledger-signals is not a security-sensitive surface tonight (no prompt
injection, credential, or tool-authority change). The CI gate added is
read-only (`ledger verify` only reads the file; `permissions: contents:
read` already scopes the `test` job in `ci.yml`, unchanged by this PR). No
new secrets, network calls, or filesystem scope introduced.

## Witness

`dream-machine witness stamp` hashes this exact file's raw bytes, so — as
established 2026-08-13/2026-09-08 — the stamp cannot be written *inside*
the file it stamps. The committed copy at
`docs/dream-cycle/2026-09-21-ledger-signals-report.md` is the frozen,
hashed artifact; this section is filled in immediately before that file is
committed, over content identical up to this point. Anyone can
independently reproduce it:

```bash
REPORT_HASH=$(sha256sum docs/dream-cycle/2026-09-21-ledger-signals-report.md | awk '{print $1}')
printf '%s%s' "$REPORT_HASH" "$SESSION_COMMIT" | sha256sum | awk '{print $1}'
# must equal the WITNESS value published in the PR body and LEDGER.md
```

`SESSION_COMMIT = 2fba2550182d81b36423447221823e98e227482a` (repo HEAD at
the start of tonight's session, before this candidate's changes).
REPORT_HASH and WITNESS are published in the PR body and the `LEDGER.md`
row, both pointing back at this file by path and session commit.

## Next steps (concrete, for a future night)

1. Emit a warning (not silent truncation) from `parseLedger` when non-blank
   content follows the detected table boundary and does not look like a
   recognized archival section — closes the minor gap the critic flagged.
2. Extend `dream-machine` with a `ledger last` subcommand so every future
   consumer (including `scripts/dream-nightly.mjs`) has one blessed,
   tested way to get "the most recent parsed row" instead of reimplementing
   it ad hoc.
3. Consider whether `dream.config.json`'s cross-repo "federation" concept
   (implied by the quarantined rows' "portfolio NNN" numbering) is still
   intended for this repo; if not, document that this ledger is
   single-repo-scoped so a future contributor does not reintroduce
   multi-repo rows by design rather than by accident.
