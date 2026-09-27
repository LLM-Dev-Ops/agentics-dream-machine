/**
 * Entrypoint-liveness classification.
 *
 * Reproduced 2026-08-13 (security-adversarial night, SCAN=redblue): running
 * `npx @metaharness/redblue <any subcommand>` — the exact command this repo's
 * own `dream.config.json` documents as the SCAN=redblue evaluator entrypoint —
 * exits 0 with zero bytes on both stdout and stderr, for every subcommand
 * tried. The package's CLI guards its dispatch with the classic ESM idiom
 * `import.meta.url === \`file://${process.argv[1]}\``, which fails once the
 * executable is reached through the symlink npm/npx always create for a
 * package's `bin` entry, so the dispatch body silently never runs. Exit 0 +
 * silence is indistinguishable from "ran clean, zero findings" to anything
 * that only checks the exit code — exactly what STEP 5-9 of the compiled
 * nightly prompt would otherwise do. Any evaluator entrypoint result should
 * route through here before the pipeline is allowed to record EVALUATED=yes.
 */

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

export type EntrypointVerdict = 'live' | 'suspicious-silent' | 'blocked';

export interface EntrypointCheck {
  verdict: EntrypointVerdict;
  code: number;
  reason: string;
}

/** Classify a completed entrypoint invocation. Pure — no I/O. */
export function classifyEntrypointResult(r: ExecResult): EntrypointCheck {
  if (r.code !== 0) {
    return {
      verdict: 'blocked',
      code: r.code,
      reason: r.stderr.trim() || `exited ${r.code} with no stderr`,
    };
  }
  if (r.stdout.trim() === '' && r.stderr.trim() === '') {
    return {
      verdict: 'suspicious-silent',
      code: r.code,
      reason:
        'exit 0 with empty stdout and stderr — indistinguishable from "ran clean, zero findings"; ' +
        'do not record EVALUATED=yes from this result alone',
    };
  }
  return { verdict: 'live', code: r.code, reason: 'produced output' };
}

/**
 * Map a verdict to the scriptable exit code ADR-0002 defines (live=0 < blocked=1 <
 * suspicious-silent=2, so `Math.max` over several results yields the worst one). Extracted
 * 2026-09-27: `verify-entrypoint` and `verify-entrypoints` (packages/cli/src/index.ts) each
 * duplicated this exact ternary — flagged as a non-blocking follow-up in the 2026-09-08
 * report ("extract a shared helper") and left untouched by every evaluation-adapters night
 * since (#18, #26, #35). Pure — no I/O.
 */
export function entrypointExitCode(verdict: EntrypointVerdict): number {
  return verdict === 'live' ? 0 : verdict === 'blocked' ? 1 : 2;
}

/** One configured evaluator entrypoint's classification, labelled with its config key + command. */
export interface ConfiguredEntrypointResult extends EntrypointCheck {
  label: string;
  cmd: string;
}

/**
 * Run every configured evaluatorEntrypoints command (e.g. from dream.config.json)
 * through {@link classifyEntrypointResult}. This is the wiring ADR-0002 §3 named
 * and explicitly deferred: "does not yet auto-wire evaluatorEntrypoints through
 * the classifier inside the compiled prompt itself." Entries with no command are
 * skipped. Execution order follows Object.entries insertion order; each command
 * runs sequentially so a hanging entrypoint doesn't obscure which label stalled.
 */
export async function classifyConfiguredEntrypoints(
  entrypoints: Record<string, string | undefined>,
  exec: (cmd: string) => Promise<ExecResult>,
): Promise<ConfiguredEntrypointResult[]> {
  const results: ConfiguredEntrypointResult[] = [];
  for (const [label, cmd] of Object.entries(entrypoints)) {
    if (!cmd) continue;
    const r = await exec(cmd);
    results.push({ label, cmd, ...classifyEntrypointResult(r) });
  }
  return results;
}
