import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { isProtectedPath } from './check-protected-paths.mjs';

// The exact regex this repo's automerge.yml used BEFORE tonight's fix
// (git blob 2fba255, .github/workflows/automerge.yml line 38), pinned
// verbatim as a frozen baseline so this suite documents — and can never
// silently stop reproducing — the bypass it replaces, independent of
// whatever check-protected-paths.mjs does later.
const BASELINE_REGEX =
  /^(\.github\/|packages\/[^/]+\/package\.json$|package\.json$|package-lock\.json$|.*\/safety|.*\/gate|.*(threshold|promotion|scorer).*|SECURITY\.md$)/;

function baselineBlocks(path) {
  return BASELINE_REGEX.test(path);
}

// Paths that must be human-review-only under the documented policy intent
// ("Anything touching a benchmark, gate, threshold, security boundary,
// workflow, or dependency manifest is human-review-only, full stop.").
const MUST_BE_PROTECTED = [
  'package.json',
  'package-lock.json',
  'packages/cli/package.json',
  '.github/workflows/ci.yml',
  'SECURITY.md',
  'packages/cli/src/safetyCheck.ts',
  // --- confirmed bypasses of the pre-fix regex (the actual finding) ---
  'packages/foo/sub/package.json', // nested manifest, >1 dir below packages/
  'packages/cli/src/deps/package.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'npm-shrinkwrap.json',
  'packages/cli/bun.lockb',
  'packages/cli/src/Gate.ts', // PascalCase keyword, case-sensitive miss
  'packages/cli/src/Threshold.ts',
  'packages/cli/src/Safety.ts',
  'packages/cli/src/Scorer.ts',
  'packages/cli/src/PromotionPolicy.ts',
];

// Ordinary source changes a well-behaved auto-merge guard must NOT block,
// so the fix is not simply "protect everything" (that would make the guard
// vacuously safe but useless).
const MUST_STAY_ALLOWED = [
  'README.md',
  'packages/cli/src/index.ts',
  'packages/cli/src/index.test.ts',
  'docs/dream-cycle/LEDGER.md',
  'scripts/termshot.mjs',
];

describe('automerge.yml protected-path guard: baseline (pre-fix) vs candidate', () => {
  it('documents the confirmed bypass: baseline regex misses nested manifests, alt lockfiles, and PascalCase keywords', () => {
    const bypassed = MUST_BE_PROTECTED.filter((p) => !baselineBlocks(p));
    // This is the vulnerability, pinned: these 11 paths sail through the
    // pre-fix guard as "safe to auto-merge" even though they are exactly
    // the dependency-manifest / safety-boundary paths the policy names.
    expect(bypassed).toEqual([
      'packages/foo/sub/package.json',
      'packages/cli/src/deps/package.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'npm-shrinkwrap.json',
      'packages/cli/bun.lockb',
      'packages/cli/src/Gate.ts',
      'packages/cli/src/Threshold.ts',
      'packages/cli/src/Safety.ts',
      'packages/cli/src/Scorer.ts',
      'packages/cli/src/PromotionPolicy.ts',
    ]);
  });

  it('candidate isProtectedPath closes every confirmed bypass, with zero new false positives', () => {
    for (const p of MUST_BE_PROTECTED) {
      expect(isProtectedPath(p), `expected "${p}" to be protected`).toBe(true);
    }
    for (const p of MUST_STAY_ALLOWED) {
      expect(isProtectedPath(p), `expected "${p}" to stay allowed`).toBe(false);
    }
  });

  it('CLI entrypoint (stdin-driven, as invoked from automerge.yml) exits 1 iff any changed path is protected', () => {
    const run = (paths) => {
      try {
        execFileSync('node', [new URL('./check-protected-paths.mjs', import.meta.url).pathname], {
          input: paths.join('\n'),
          encoding: 'utf8',
        });
        return 0;
      } catch (e) {
        return e.status;
      }
    };

    expect(run(['README.md', 'packages/cli/src/index.ts'])).toBe(0);
    expect(run(['README.md', 'packages/foo/sub/package.json'])).toBe(1);
    expect(run(['packages/cli/src/Gate.ts'])).toBe(1);
  });
});
