# ADR-0004: Evaluator entrypoints must also be checked for idempotency — a single "live" verdict is not sufficient trust

- **Status**: Proposed
- **Date**: 2026-09-22
- **Related**: ADR-0002 (entrypoint live/blocked/suspicious-silent classification), ADR-0001 §2.3/§2.4 (evaluation is delegated, never reimplemented; engine must never hard-depend on backends). **Numbering note**: still-open, unmerged PR #18 (2026-09-12) already claims `ADR-0003` (`…darwin-genome-bench-gap`) on its branch; PR #26 (2026-09-17) deliberately skipped `ADR-0003` for the same reason. This ADR follows that precedent and takes `ADR-0004` instead of colliding. `main` itself only has ADR-0001/0002 as of tonight (`2fba255`) — the gap is an artifact of 12 open dream-cycle PRs (#12-#33) none of which have merged since 2026-09-08; a human reconciling that backlog will need to confirm final numbering across branches.
- **Deciders**: dream-cycle nightly session (evaluation-adapters, SCAN=flywheel/darwin), 2026-09-22
- **Tags**: dream-cycle, evaluation-adapters, darwin, evaluator-trust, witness-every-quantitative-claim, evaluation-is-not-promotion

## 1. Context

Tonight's SCAN=darwin probe ran this repo's own configured darwin entrypoint
exactly as `dream.config.json` on `main` still declares it (unpatched — PR #18
fixes this specific command but is still unmerged):
`npx @metaharness/darwin evolve --sandbox real`.

The **first** invocation in a clean working tree exits 0 with real stdout
(`live` under ADR-0002's classifier — correctly). But the package misparses
`--sandbox` (already root-caused and fixed, pending merge, by PR #18: the
command is missing its required `<repo>` positional argument, so the CLI
treats the `--sandbox` flag itself as that positional and writes unignored
variant/run state to a literal `./--sandbox/.metaharness/...` directory in the
invoking cwd — confirmed again tonight: `--sandbox/.metaharness/variants/g1_v0`,
`--sandbox/.metaharness/runs/g1_v0.json`). On every subsequent invocation of
the **identical** command it then refuses to reuse the generated child id:

```
Error: darwin: autonomous or generated child id already exists: g1_v0
```

— exit 1, correctly classified `blocked` by ADR-0002's classifier. Both
classifications are individually correct. The problem is what a *single*
run tells you: `dream-machine verify-entrypoints` run once today says
`darwin: live`; the exact same command run again five minutes later (or on
tomorrow night's control-plane discovery, STEP 0.5) says `darwin: blocked`,
with no change to the entrypoint's actual availability — only to leftover
local state the tool itself created and never cleans up. ADR-0002 built the
classifier assuming a single exec result is enough input; tonight shows one
sample can't distinguish "genuinely live" from "live exactly once."

**This is not a new discovery.** PR #18's own Reward-Hack Check already
disclosed this exact failure mode as a known, unfixed caveat: "a second
consecutive darwin run in the same working directory can fail with 'child id
already exists' … an upstream idempotency gap … not introduced or fixed
here." Nine nights later, no code exists to detect it automatically — PR #18
fixed the *arg-misparse* symptom (and, once merged, the state directory will
be named `.metaharness/` instead of the literal `--sandbox/` reproduced
tonight) but did not address the underlying non-idempotency, which will
persist under the corrected invocation too: a `<repo>`-arg-correct
`npx @metaharness/darwin evolve . --sandbox real` still writes a `g1_v0` child
id on first run and still refuses to reuse it on a second identical
invocation (this ADR does not re-verify that specific corrected command,
since redoing PR #18's still-unmerged config change is out of scope — but
nothing in PR #18's evaluation receipt shows a second consecutive run was
ever attempted, which is exactly the gap tonight's candidate closes at the
classifier level regardless of which exact command string is configured).
Tonight's candidate operationalizes that disclosed-but-unactioned caveat into
an automated, opt-in check rather than leaving it as a line of prose no
future night's session is forced to re-read.

Confirmed independently of this repo's CLI: running the raw command by hand
twice in a row reproduces the identical live→blocked flip (see the 2026-09-22
gist Evaluation Receipt for both raw transcripts).

## 2. Decision

Add an opt-in **idempotency check** to the entrypoint-classification pipeline
(`packages/cli/src/entrypoint.ts`):

- `classifyIdempotency(first, second)` — pure, compares two
  `EntrypointCheck`s from back-to-back runs of the *same* command; returns
  `{ idempotent, reason }`.
- `classifyConfiguredEntrypoints(entrypoints, exec, { idempotencyCheck })` —
  when the new option is set, runs each configured command a second time and
  attaches the `IdempotencyCheck` to that entrypoint's result.
- CLI: `dream-machine verify-entrypoints --idempotency-check` re-runs each
  command once more and prints `<label>: NOT IDEMPOTENT — <reason>` for any
  entrypoint whose verdict changed between the two runs; a non-idempotent
  result scores like `blocked` for the command's exit code.

Default behavior is unchanged (`idempotencyCheck` defaults to `false`) — this
is additive, matching ADR-0002's own precedent (`IO.exec` stayed optional).
`.gitignore` gains `--sandbox/` so the darwin package's leftover state can no
longer be accidentally committed by a future night that runs it before this
ADR's fix lands.

## 3. Consequences

- **A "live" verdict from a single run is downgraded to a hypothesis, not a
  fact, for any entrypoint that can carry local state.** Nightly runs that
  want a trustworthy `darwin` signal must pass `--idempotency-check`; STEP 0.5
  control-plane discovery in the compiled nightly prompt is not updated to
  pass it by default tonight — see Alternatives — so this ADR ships the
  *capability*, and wiring it into the default nightly probe is next-step
  work, explicitly deferred rather than rushed.
- **No behavior changed for `bench: npm test`**, confirmed idempotent
  (deterministic, no local state) whenever exercised tonight.
- **Doubles the cost of any entrypoint it's applied to.** For `darwin`
  specifically that means two real `--sandbox real` runs, which per the
  package's own printed warning "cannot distinguish between mutated harness
  surfaces" anyway (a second, orthogonal finding — see Recommendation in
  tonight's gist) — cheap for tonight's purposes, but not something to apply
  unconditionally to every entrypoint without weighing runtime cost.
- **Does not patch `@metaharness/darwin`** (out of this repo's scope, a
  third-party package) and does not delete or work around its `--sandbox/`
  state directory automatically — only stops it from being committed.

## 4. Alternatives Considered

- **Wire `--idempotency-check` into the default `verify-entrypoints` call
  used by STEP 0.5 control-plane discovery, tonight.** Rejected: doubles
  every future night's darwin cost (a real `--sandbox real` run) for a signal
  most nights won't act on differently; ships as an explicit opt-in instead,
  revisit once a few more nights of `darwin` receipts exist.
- **Auto-clean `--sandbox/` before each darwin invocation.** Rejected:
  silently deleting another tool's state directory on its behalf is exactly
  the kind of undocumented workaround `witness-every-quantitative-claim`
  warns against — `.gitignore` (don't let it pollute the repo) is the
  minimal safe fix; state cleanup, if wanted, belongs in a follow-up that
  documents it explicitly.
- **Treat the second-run failure as its own new verdict (e.g.
  `non-idempotent` alongside `live`/`blocked`/`suspicious-silent`).**
  Rejected for now: `IdempotencyCheck` is kept as a separate, optional field
  rather than folded into `EntrypointVerdict`, so ADR-0002's three-verdict
  contract (and everything that pattern-matches on it) stays unchanged;
  revisit if idempotency checking becomes the default.

## 5. Test Contract

1. `classifyIdempotency` is pure and unit-tested for the agreeing and
   diverging cases (`packages/cli/src/entrypoint.test.ts`).
2. `classifyConfiguredEntrypoints` unit-tested with `idempotencyCheck: true`
   reproducing tonight's exact darwin live→blocked flip via a mocked `exec`,
   and unit-tested to call `exec` exactly once per command (no behavior
   change) when the option is omitted.
3. `verify-entrypoints --idempotency-check` CLI-level test reproduces the
   same flip end-to-end and asserts `NOT IDEMPOTENT` appears in output; a
   second CLI test asserts the flag's absence never prints `NOT IDEMPOTENT`
   and never double-invokes `exec`.
4. Live receipt against this repo's real `dream.config.json`
   `evaluatorEntrypoints` tonight: `node packages/cli/dist/bin.js
   verify-entrypoints --idempotency-check` on the real, unmodified darwin
   entrypoint reproduces `darwin: live` then `darwin: NOT IDEMPOTENT` with
   the real captured stderr — matching the raw hand-run transcripts.
5. No pre-existing test weakened, removed, or modified; `npm test` baseline
   106/106 → candidate 112/112, 0 regressions; `npm run lint` and
   `npm run build` both clean on the candidate.

## 6. References

- `packages/cli/src/entrypoint.ts` (`classifyEntrypointResult`, ADR-0002).
- Tonight's gist, Evaluation Receipt section — both raw `npx @metaharness/darwin
  evolve --sandbox real` transcripts (first run live, second run blocked),
  and the `--sandbox/.metaharness/{variants,runs}/g1_v0*` state confirmed on
  disk (Grade A — reproduced directly, this session).
