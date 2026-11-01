/**
 * Darwin sandbox-mode diagnosticity.
 *
 * Measured 2026-11-01 (DEEP=evaluation-adapters, rotated from ledger-signals
 * per STEP 1.1's duplicateDirections signal — see this night's report;
 * SCAN=darwin, extending SCAN=verify's "witness every quantitative claim"
 * discipline to ADR-0003's own figures): `npx @metaharness/darwin@0.12.1
 * evolve <repo> --sandbox mock [--generations N --children M --seed S]`
 * produces a byte-identical leaderboard, winner, and delta whether `<repo>`
 * is this repo's real worktree or a path that does not exist on disk at
 * all — reproduced 4 times tonight (unseeded defaults and ADR-0003's own
 * seeded bounded params `--generations 3 --children 4 --seed 42`, each
 * against both a real path and a nonexistent one).
 *
 * This is a stronger, more decisive version of two prior findings:
 * ADR-0003 (2026-09-12, unmerged in PR #18) inferred "no differentiating
 * bench signal" from a generic auto-generated bench task; the 2026-10-27
 * genome-overlap finding (PR #101) inferred "no causal path" from zero
 * textual overlap between darwin's 7 genome surfaces and this repo's
 * source. Neither tested whether the target even needs to exist. Tonight's
 * measurement does: `--sandbox mock`'s result is a pure function of
 * (seed, generations, children) and performs no I/O against the target at
 * all — not merely "low signal for this repo," but structurally incapable
 * of being evidence about any specific target. `--sandbox real` was not
 * re-tested tonight (ADR-0003 and PR #101 cover it); it is deliberately
 * excluded from this classification until independently measured the same
 * way, rather than assumed to behave identically.
 */

export interface SandboxDiagnosticity {
  /** True only for a mode measured, by direct repeated experiment, to ignore the target entirely. */
  repoIndependent: boolean;
  reason: string;
}

/**
 * Pure — no I/O, no process spawn. Classifies whether a given darwin
 * `--sandbox` mode is known, by direct empirical measurement (not
 * inference), to produce output independent of the target repo's
 * existence or content. Only `'mock'` has been measured this way; every
 * other mode returns `repoIndependent: false` meaning "not measured
 * either way" — absence of evidence is not evidence of dependence, so this
 * never asserts a mode is repo-*dependent* without having tested that too.
 */
export function classifySandboxDiagnosticity(mode: string): SandboxDiagnosticity {
  if (mode === 'mock') {
    return {
      repoIndependent: true,
      reason:
        'measured 2026-11-01: identical leaderboard/winner/delta for a real repo path and a ' +
        'nonexistent repo path, both unseeded and with fixed --generations/--children/--seed — ' +
        '"mock" performs no I/O against the target and its result carries no information about it',
    };
  }
  return {
    repoIndependent: false,
    reason: `sandbox mode "${mode}" was not measured for repo-independence tonight — do not assume ` +
      'it is repo-dependent OR repo-independent without running the same real-vs-nonexistent-path test',
  };
}
