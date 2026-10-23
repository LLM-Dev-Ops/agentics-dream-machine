import { describe, expect, it } from 'vitest';

// The protected-path regex from .github/workflows/automerge.yml BEFORE
// tonight's fix (commit 2fba255, line 38) — pinned verbatim so this bypass
// stays reproducible even if the workflow file changes shape later.
const BASELINE_REGEX =
  /^(\.github\/|packages\/[^/]+\/package\.json$|package\.json$|package-lock\.json$|.*\/safety|.*\/gate|.*(threshold|promotion|scorer).*|SECURITY\.md$)/;

// The same regex AFTER tonight's one-line fix (must stay byte-identical to
// the live `protected=` value in automerge.yml, or this test is testing
// nothing).
const FIXED_REGEX =
  /^(\.github\/|packages\/[^/]+\/package\.json$|package\.json$|package-lock\.json$|dream\.config\.json$|.*\/safety|.*\/gate|.*(threshold|promotion|scorer).*|SECURITY\.md$)/;

describe('automerge.yml protected-path guard: dream.config.json bypass', () => {
  it('BASELINE (pre-fix) does NOT protect dream.config.json — the confirmed bypass', () => {
    expect(BASELINE_REGEX.test('dream.config.json')).toBe(false);
  });

  it('FIXED regex protects dream.config.json', () => {
    expect(FIXED_REGEX.test('dream.config.json')).toBe(true);
  });

  it('FIXED regex introduces no new false positive relative to baseline on ordinary paths', () => {
    const ordinary = [
      'README.md',
      'packages/cli/src/index.ts',
      'packages/cli/src/index.test.ts',
      'docs/dream-cycle/LEDGER.md',
      'scripts/termshot.mjs',
      'dream.config.schema.json', // similarly-named but distinct file; not this guard's concern tonight
    ];
    for (const p of ordinary) {
      expect(FIXED_REGEX.test(p)).toBe(BASELINE_REGEX.test(p));
    }
  });

  it('FIXED regex still protects every case the baseline already covered', () => {
    const alreadyProtected = [
      '.github/workflows/ci.yml',
      'package.json',
      'package-lock.json',
      'packages/cli/package.json',
      'SECURITY.md',
      'packages/cli/src/safety/check.ts',
      'packages/cli/src/gate/check.ts',
    ];
    for (const p of alreadyProtected) {
      expect(BASELINE_REGEX.test(p)).toBe(true);
      expect(FIXED_REGEX.test(p)).toBe(true);
    }
  });
});
