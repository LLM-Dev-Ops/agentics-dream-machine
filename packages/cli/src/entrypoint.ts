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

export interface IdempotencyCheck {
  idempotent: boolean;
  reason: string;
}

/**
 * Compare two classifications of the *same* entrypoint command, run back-to-back.
 * Pure — no I/O.
 *
 * Reproduced 2026-09-22 (evaluation-adapters night, SCAN=darwin): running this
 * repo's own configured darwin entrypoint (`npx @metaharness/darwin evolve
 * --sandbox real`) classifies `live` on a first, clean-state invocation, but the
 * package writes unignored variant state to `./--sandbox/.metaharness/...` and
 * refuses to reuse a generated child id — so the *identical* command classifies
 * `blocked` (`darwin: autonomous or generated child id already exists: g1_v0`)
 * on every run after the first. A single-shot classification can't tell a truly
 * live entrypoint from one that only worked once; only comparing two back-to-back
 * runs surfaces that.
 */
export function classifyIdempotency(first: EntrypointCheck, second: EntrypointCheck): IdempotencyCheck {
  if (first.verdict !== second.verdict) {
    return {
      idempotent: false,
      reason:
        `first run classified '${first.verdict}' (${first.reason}), second run classified ` +
        `'${second.verdict}' (${second.reason}) — entrypoint is stateful/non-reproducible; ` +
        `do not trust a single-shot 'live' verdict`,
    };
  }
  return { idempotent: true, reason: `both runs classified '${first.verdict}'` };
}

/** One configured evaluator entrypoint's classification, labelled with its config key + command. */
export interface ConfiguredEntrypointResult extends EntrypointCheck {
  label: string;
  cmd: string;
  idempotency?: IdempotencyCheck;
}

export interface ClassifyConfiguredEntrypointsOptions {
  /** Run each command twice back-to-back and flag entrypoints whose verdict changes between runs. */
  idempotencyCheck?: boolean;
}

/**
 * Run every configured evaluatorEntrypoints command (e.g. from dream.config.json)
 * through {@link classifyEntrypointResult}. This is the wiring ADR-0002 §3 named
 * and explicitly deferred: "does not yet auto-wire evaluatorEntrypoints through
 * the classifier inside the compiled prompt itself." Entries with no command are
 * skipped. Execution order follows Object.entries insertion order; each command
 * runs sequentially so a hanging entrypoint doesn't obscure which label stalled.
 *
 * With `opts.idempotencyCheck`, each command also runs a second time and the two
 * verdicts are compared via {@link classifyIdempotency} — catching an entrypoint
 * that only classifies `live` because it happens to be running for the first time
 * (see that function's doc for the darwin reproduction this guards against).
 */
export async function classifyConfiguredEntrypoints(
  entrypoints: Record<string, string | undefined>,
  exec: (cmd: string) => Promise<ExecResult>,
  opts: ClassifyConfiguredEntrypointsOptions = {},
): Promise<ConfiguredEntrypointResult[]> {
  const results: ConfiguredEntrypointResult[] = [];
  for (const [label, cmd] of Object.entries(entrypoints)) {
    if (!cmd) continue;
    const r = await exec(cmd);
    const check = classifyEntrypointResult(r);
    let idempotency: IdempotencyCheck | undefined;
    if (opts.idempotencyCheck) {
      const r2 = await exec(cmd);
      idempotency = classifyIdempotency(check, classifyEntrypointResult(r2));
    }
    results.push({ label, cmd, ...check, idempotency });
  }
  return results;
}
