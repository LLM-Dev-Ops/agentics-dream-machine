/**
 * Darwin sandbox-mode diagnosticity — wired into the CLI's human-readable output.
 *
 * `classifySandboxDiagnosticity`'s `'mock'` branch and `extractSandboxMode` reproduce
 * the finding and implementation shipped in PR #111 (2026-11-01) and PR #123
 * (2026-11-07, `packages/cli/src/darwin-sandbox.ts`), both still unmerged at this
 * session's baseline commit `2fba255`: running the real
 * `npx @metaharness/darwin@0.12.1 evolve <repo> --sandbox mock` against this repo's
 * real worktree and against a path that does not exist on disk at all produced a
 * byte-identical leaderboard/winner/delta in both an unseeded run and a run with
 * ADR-0003's own seeded bounded parameters (`--generations 3 --children 4 --seed
 * 42`) — `mock` sandbox mode performs no I/O against its `<repo>` argument and its
 * result carries no information about it. That measurement and this part of the
 * function are NOT this session's own novel finding; they are reproduced here,
 * byte-for-byte logically (credited to PR #111/#123), only because this session's
 * candidate must be evaluated against the real `main` baseline, which does not yet
 * contain either PR.
 *
 * What IS new tonight (2026-11-12, DEEP=evaluation-adapters, SCAN=flywheel,darwin):
 * the `'real'` branch below. PR #111 deliberately left `--sandbox real` unclassified
 * ("was not re-tested tonight... it is deliberately excluded from this classification
 * until independently measured the same way, rather than assumed to behave
 * identically"). Tonight measured it, with a corrected `<repo>` positional (the
 * configured `darwin` entrypoint in this repo's `dream.config.json` omits it — see
 * PR #113 for that separate bug): `npx @metaharness/darwin@0.14.0 evolve <repo>
 * --sandbox real --generations 3 --children 4 --seed 42` against this repo's real
 * worktree scored `0.985` (pass=1.00), and the identical command against a
 * nonexistent path scored `0.235` (pass=0.00) — different, deterministic (the
 * real-path run reproduced byte-identically on repeat once `.metaharness/` was
 * cleaned), and reproducible. `--sandbox real` is therefore repo-*path*-dependent,
 * unlike `mock`. That is a different property from the sandbox's variant-
 * *discriminating* power, which `@metaharness/darwin`'s own README already documents
 * as degenerate by design ("the behavioural manifold is degenerate... measured:
 * nicheEntropy = 0, ADR-099" — confirmed independently tonight: all 9 genome
 * variants tied their own run's baseline exactly, delta +0.000, in both the real-path
 * and nonexistent-path runs). This branch reports only the repo-path-dependence
 * property it measured; it does not claim discriminating power, which upstream's own
 * docs already settle.
 */

export interface SandboxDiagnosticity {
  /** True only for a mode measured, by direct repeated experiment, to ignore the target entirely. */
  repoIndependent: boolean;
  reason: string;
}

/**
 * Pure — no I/O, no process spawn. `'mock'` (PR #111, 2026-11-01) and `'real'`
 * (tonight, 2026-11-12) have been measured this way; every other mode returns
 * `repoIndependent: false` meaning "not measured either way" — absence of evidence
 * is not evidence of dependence, so this never asserts a mode is repo-*dependent*
 * without having tested that too.
 */
export function classifySandboxDiagnosticity(mode: string): SandboxDiagnosticity {
  if (mode === 'mock') {
    return {
      repoIndependent: true,
      reason:
        'measured 2026-11-01 (PR #111): identical leaderboard/winner/delta for a real repo path and a ' +
        'nonexistent repo path, both unseeded and with fixed --generations/--children/--seed — ' +
        '"mock" performs no I/O against the target and its result carries no information about it',
    };
  }
  if (mode === 'real') {
    return {
      repoIndependent: false,
      reason:
        'measured 2026-11-12: with a correct <repo> positional and fixed --generations/--children/--seed, ' +
        'a real repo path scored 0.985 (pass=1.00) and a nonexistent path scored 0.235 (pass=0.00) — ' +
        'different and, on repeat with cleaned .metaharness/ state, byte-identically deterministic — so ' +
        '"real" DOES perform I/O against its target, unlike "mock". This says nothing about variant-' +
        'discriminating power: all 9 genome variants tied their own run\'s baseline exactly (delta +0.000) ' +
        'in both runs, consistent with the upstream package\'s own documented degenerate manifold (ADR-099, ' +
        'nicheEntropy = 0) — a separate property from repo-path-dependence, not re-litigated here',
    };
  }
  return {
    repoIndependent: false,
    reason:
      `sandbox mode "${mode}" was not measured for repo-independence — do not assume it is ` +
      'repo-dependent OR repo-independent without running the same real-vs-nonexistent-path test',
  };
}

/**
 * Extracts a `--sandbox <mode>` (space- or `=`-separated) value from a configured
 * evaluator-entrypoint command string, e.g. `dream.config.json`'s
 * `evaluatorEntrypoints.darwin`. Reproduced from PR #123 (2026-11-07, unmerged at
 * this session's baseline) — no change tonight. Returns `undefined` when no
 * `--sandbox` flag is present.
 */
export function extractSandboxMode(cmd: string): string | undefined {
  const m = cmd.match(/--sandbox[ =]+([^\s,]+)/);
  return m?.[1];
}
