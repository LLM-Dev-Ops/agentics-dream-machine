# ADR-0003: The ledger parser is bounded to one contiguous table, and `ledger verify` is a required CI gate

- **Status**: Proposed
- **Date**: 2026-09-21
- **Related**: ADR-0001 §"the ledger is the engine's only durable cross-night memory"; `docs/dream-cycle/LEDGER.md` row 2026-09-08 ("ledger verify found 9 schema errors in rows 2-6, not fixed tonight")
- **Deciders**: dream-cycle nightly session (ledger-signals, SCAN=witness/verify), 2026-09-21
- **Tags**: dream-cycle, ledger-signals, witness-every-quantitative-claim, evaluation-is-not-promotion

## 1. Context

`docs/dream-cycle/LEDGER.md` is this engine's only durable cross-night
memory (`packages/ledger/src/index.ts` docstring). `git blame` on the file
shows commit `df9ff404` ("fix(compile): enforce documented hourly cron
floor (#24)", 2026-08-26) bulk-inserted 5 rows (dated 2026-08-22 through
2026-08-26) as a drive-by change unrelated to that PR's stated purpose.
Those rows describe nightly cycles of other repositories (rufield, batvu,
RuVector, openAVO, RVM, ruflo, worldgraph, LatentMesh, MetaHarness,
open-claude-code, "portfolio" numbers 308-311) that do not exist in
`LLM-Dev-Ops/agentics-dream-machine`, and they use two enum values the
ledger schema never declared (`evaluated=partial`; compound `verdict`
values such as `ACCEPT / INCONCLUSIVE`). Running
`dream-machine ledger verify` against the pre-fix file produces exactly 9
schema errors. The night of 2026-09-08 had already found and reported this
("rows 1-6 confirmed 2nd night to reference issues/PRs/repos absent from
this repo; ledger verify found 9 schema errors in rows 2-6") — and left it
unfixed. Two things allowed this to happen and to persist:

1. **No gate existed.** `ledger verify` was implemented and correct
   (`packages/ledger/src/index.ts`) but nothing ran it automatically — a
   drive-by row injection in an unrelated PR merged clean, and the damage
   sat undetected in the engine's only durable memory for 26 days across
   at least 2 acknowledged nights.
2. **The parser has no table boundary.** `parseLedger` treated *every*
   subsequent line in the whole file containing a `|` character as a
   ledger row, forever. This made it unsafe to keep an archival/appendix
   section — including the quarantine record this ADR introduces — in the
   same file without it being silently re-ingested as live rows by any
   tool, present or future.

An independent adversarial critic (a separate subagent, no shared context)
reviewing this fix additionally found that `scripts/dream-nightly.mjs`
derived its auto-appended `priorFates` field via a raw
`tail -n 3 | head -n 1` line-count heuristic on `LEDGER.md` — a second,
untested consumer of the same file that this fix's original appendix
placement would have broken by making it silently read quarantined
foreign data instead of the real last night. Fixed in the same PR (see
Test Contract item 4).

## 2. Decision

1. **Quarantine, never delete or force-normalize.** The 5 contaminated
   rows are moved out of the primary table into a clearly labeled
   "Quarantined rows" section at the end of `LEDGER.md`, preserved
   byte-for-byte inside a fenced code block, with the originating commit
   and reason documented inline. Nothing is deleted (git history retains
   the untouched original regardless) and nothing is coerced into enum
   values these rows never honestly satisfied.
2. **`parseLedger` is bounded to the first contiguous pipe-table.** Once
   the header divider is seen, a blank line or any line not starting with
   `|` ends table parsing. This is the schema the module's own docstring
   already implied ("a fixed 10-column table") — it was simply not
   enforced. This makes it safe to append prose, an appendix, or a
   quarantine section after the table without any tool (old or new)
   re-ingesting it as ledger rows.
3. **`ledger verify` is a required CI gate** (`.github/workflows/ci.yml`,
   "Ledger integrity" step, all Node matrix legs). A future drive-by edit
   that reintroduces schema drift now fails the PR instead of merging
   silently.
4. **Every consumer of `LEDGER.md` must go through the real parser**, not
   ad hoc text heuristics (`tail`/`head`/`grep` on the raw file). Any
   trailing content after the table (quarantine, notes, future
   appendices) is exactly the case a raw heuristic cannot safely ignore.

## 3. Consequences

- **New invariant**: `docs/dream-cycle/LEDGER.md` may contain non-table
  content after its single primary table (fenced quarantine/archival
  sections); tooling must treat everything after the table boundary as
  inert documentation, never as data.
- **CI gate is additive**, not a threshold change — `verifyLedger`'s
  schema rules (VERDICTS, EVALS, date regex) are unchanged, only now
  enforced automatically instead of by hand.
- **`scripts/dream-nightly.mjs`** now derives `priorFates` from
  `@dream-machine/ledger`'s `parseLedger` (last parsed row's `finding`,
  truncated) instead of a raw `tail`/`head` heuristic — more correct
  independent of tonight's fix, and no longer fragile to trailing content.
- **Does not retroactively re-verify or re-adjudicate** the quarantined
  rows' substantive claims (whether e.g. LatentMesh's reported 74.2%
  compute-proxy reduction was itself sound) — that evaluation, if ever
  needed, belongs to the repositories those rows actually describe, not to
  this repo's ledger.
- **`parseLedger`'s new table boundary is a silent one**: content after
  the boundary produces no warning if it is non-empty and was not
  intended as an appendix (e.g. an accidental blank line before a
  legitimate new row would silently drop that row from every
  `verify`/`signals`/`stats`/TUI view with zero diagnostic). Flagged as
  Alternatives Considered below and left as explicit follow-up work, not
  fixed tonight (keeps this candidate to one conceptual change).

## 4. Alternatives Considered

- **Force-normalize the contaminated rows into the existing enum** (pick a
  single verdict per row, map `partial` → `yes`). Rejected: the rows do
  not describe this repository's history at all — normalizing them would
  launder foreign data into looking like genuine local evidence, which is
  worse than the schema violation it would silence.
- **Delete the contaminated rows outright.** Rejected: destroys evidence
  of a real incident (the drive-by injection) that other engineers/future
  nights should be able to see and learn from; git history alone is a
  weaker guarantee of discoverability than an in-repo record.
- **Leave the rows in the primary table and loosen `verifyLedger`'s enum
  to accept `partial`/compound verdicts.** Rejected: this is the "weaken
  the check to get a favorable result" failure mode this repo's own
  disciplines explicitly forbid — it would legitimize exactly the pattern
  that caused the contamination, for every future night.
- **Emit a warning instead of silently truncating parse at the table
  boundary.** Deferred, not rejected — a real gap (see Consequences); left
  for a future night since it is a separate, smaller enhancement rather
  than part of tonight's frozen hypothesis.

## 5. Test Contract

1. `parseLedger` stops at the first blank/non-`|`-leading line after the
   header divider; a trailing appendix containing literal `|` characters
   is never parsed as additional rows
   (`packages/ledger/src/index.test.ts`).
2. A regression canary loads the real `docs/dream-cycle/LEDGER.md` at test
   time and asserts `verifyLedger` returns zero errors — this ties CI
   directly to the actual evidence file, not just to fixtures
   (`packages/ledger/src/index.test.ts`).
3. `dream-machine ledger verify --path docs/dream-cycle/LEDGER.md`: 9
   errors / exit 1 (parent, pre-fix) → 0 errors / exit 0, 3 rows
   (candidate, post-fix) — receipt reproduced by hand.
4. `scripts/dream-nightly.mjs`'s new `priorFates` derivation manually
   verified against the real post-fix ledger: returns the actual last
   row's finding text, not quarantined data (no automated test — the
   script has no existing test harness; out of scope to build one
   tonight).
5. No pre-existing test weakened, removed, or modified; `npm test`
   baseline 106/106 → candidate 108/108, 0 regressions. `npm run lint`
   clean. `npm run typecheck`'s pre-existing failure (empty `files` list
   in `tsconfig.json`) reproduced identically on the parent commit —
   unrelated to this candidate.

## 6. References

- `git blame docs/dream-cycle/LEDGER.md` and `git show df9ff404 --stat`
  (Grade A, reproduced directly against this repo).
- `docs/dream-cycle/LEDGER.md`, row 2026-09-08, `Prior-night fates` column
  (this repo's own prior finding, Grade A).
- Independent critic subagent review of this candidate's diff (Grade A,
  reproduced directly; found and blocked on the `dream-nightly.mjs` issue
  before this ADR's Decision §4 was added).
