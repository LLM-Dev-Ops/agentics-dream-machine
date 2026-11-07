/**
 * Darwin sandbox-mode diagnosticity — wired into the CLI's human-readable output.
 *
 * `classifySandboxDiagnosticity` reproduces the finding and implementation shipped
 * in PR #111 (2026-11-01, `packages/cli/src/darwin-sandbox.ts`, still unmerged at
 * this session's baseline commit `2fba255`): running the real
 * `npx @metaharness/darwin@0.12.1 evolve <repo> --sandbox mock` against this repo's
 * real worktree and against a path that does not exist on disk at all produced a
 * byte-identical leaderboard/winner/delta in both an unseeded run and a run with
 * ADR-0003's own seeded bounded parameters (`--generations 3 --children 4 --seed
 * 42`) — `mock` sandbox mode performs no I/O against its `<repo>` argument and its
 * result carries no information about it. That measurement and this function are
 * NOT this session's own novel finding; they are reproduced here, byte-for-byte
 * logically (credited to PR #111), only because this session's candidate must be
 * evaluated against the real `main` baseline, which does not yet contain PR #111.
 *
 * What IS new tonight (2026-11-07, DEEP=evaluation-adapters, SCAN=flywheel,darwin):
 * `extractSandboxMode` and the wiring in `packages/cli/src/index.ts` that actually
 * surfaces this classification in `verify-entrypoint`/`verify-entrypoints`' output —
 * the specific follow-up PR #111's own report named and deliberately deferred
 * ("Wiring classifySandboxDiagnosticity into verify-entrypoints' human-readable
 * output... is a natural, small follow-up — not built tonight").
 */

export interface SandboxDiagnosticity {
  /** True only for a mode measured, by direct repeated experiment, to ignore the target entirely. */
  repoIndependent: boolean;
  reason: string;
}

/**
 * Pure — no I/O, no process spawn. Only `'mock'` has been measured this way (PR #111,
 * 2026-11-01); every other mode returns `repoIndependent: false` meaning "not measured
 * either way" — absence of evidence is not evidence of dependence, so this never
 * asserts a mode is repo-*dependent* without having tested that too.
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
 * `evaluatorEntrypoints.darwin`. New tonight (2026-11-07) — no prior PR parses this
 * out of the command string itself; PR #111 only ever classified a `mode` value
 * already known from the shell command it ran manually. Returns `undefined` when no
 * `--sandbox` flag is present (e.g. the real, still-unpatched `main` command, which
 * has no `<repo>` argument at all but does carry `--sandbox real`).
 */
export function extractSandboxMode(cmd: string): string | undefined {
  const m = cmd.match(/--sandbox[ =]+([^\s,]+)/);
  return m?.[1];
}
