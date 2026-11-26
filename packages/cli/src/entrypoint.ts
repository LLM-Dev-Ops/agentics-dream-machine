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
 * Diff two `git status --porcelain` snapshots and return the top-level paths
 * that are new in `after` but absent from `before` — i.e. paths a command
 * created as a side effect of running it. Pure — no I/O.
 *
 * Reproduced 2026-11-26 (ledger-signals night; rotated to evaluation-adapters
 * per the ledger's own "a finding repeated >=3 prior nights -> rotate to the
 * next slot's DEEP surface" learning signal, since ledger-schema/zero-merge
 * findings had already recurred across PRs #12/#16/#22/#30/#33/#58/#79/#99/
 * #109/#121/#129/#139 without landing — reconfirmed live via the GitHub API
 * this session, NOT from local `git log` or the stale 9-row `main`-branch
 * ledger, which only goes up to PR #9 and does not itself contain these
 * numbers; see the committed report's evidence table): this repo's own
 * configured `darwin`
 * entrypoint (`npx @metaharness/darwin evolve --sandbox real`) writes a
 * non-gitignored `--sandbox/.metaharness/` state tree straight into
 * `process.cwd()`. A second invocation in the same working tree then fails
 * ("autonomous or generated child id already exists: g1_v0") — so merely
 * liveness-probing this entrypoint once can poison a later real run of it in
 * the same session, and the leftover directory is a `git add -A` /
 * accidental-commit hazard `classifyEntrypointResult`'s exit-code-only
 * verdict says nothing about.
 */
export function diffWorkingTree(beforePorcelain: string, afterPorcelain: string): string[] {
  const topLevelPaths = (porcelain: string): Set<string> => {
    const paths = new Set<string>();
    for (const line of porcelain.split(/\r?\n/)) {
      if (line.length <= 3) continue;
      const rest = line.slice(3).split(' -> ').pop() ?? '';
      const top = rest.trim().split('/')[0];
      if (top) paths.add(top);
    }
    return paths;
  };
  const before = topLevelPaths(beforePorcelain);
  const after = topLevelPaths(afterPorcelain);
  return [...after].filter((p) => !before.has(p)).sort();
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
