import { describe, it, expect } from 'vitest';
import { validateConfig, compile, type DreamConfig } from './index.js';

/**
 * compiler-parity finding, 2026-10-30 (building on the 2026-10-25 EPOCHDAY
 * report's "next step 2"): `validateConfig()` type-checks `repo`/`cron`/
 * `slots`/`bonusModuli` but silently accepts structurally-wrong-typed
 * optional fields — `autoMerge` as a string, `labels`/`competitors` as a
 * bare string instead of an array, `evaluatorEntrypoints` as a string
 * instead of an object, `branchPrefix`/`ledgerPath` as a number.
 *
 * This is not cosmetic: `compile()`'s merge-policy branch is a plain JS
 * truthiness check on `c.autoMerge`. A config author who writes JSON
 * `"autoMerge": "false"` (a very plausible typo — a string instead of a
 * boolean) gets a *truthy* value, so the compiled nightly routine prompt
 * claims "guarded auto-merge ENABLED" for a target the author intended to
 * keep on human-review-only. `validateConfig()` should catch this before
 * `compile()` ever sees it.
 */

const base: DreamConfig = {
  repo: 'LLM-Dev-Ops/agentics-dream-machine',
  cron: '0 9 * * *',
  slots: [{ deep: 'a', scan: ['x', 'y'] }],
};

describe('validateConfig: type guards on optional fields', () => {
  it('rejects autoMerge as a non-boolean', () => {
    const r = validateConfig({ ...base, autoMerge: 'false' as unknown as boolean });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/autoMerge must be a boolean/);
  });

  it('rejects labels as a bare string instead of an array', () => {
    const r = validateConfig({ ...base, labels: 'dream-cycle' as unknown as string[] });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/labels must be an array of strings/);
  });

  it('rejects competitors as a bare string instead of an array', () => {
    const r = validateConfig({ ...base, competitors: 'Sakana' as unknown as string[] });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/competitors must be an array of strings/);
  });

  it('rejects an array containing a non-string element', () => {
    const r = validateConfig({ ...base, labels: ['ok', 42] as unknown as string[] });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/labels must be an array of strings/);
  });

  it('rejects evaluatorEntrypoints as a string instead of an object', () => {
    const r = validateConfig({ ...base, evaluatorEntrypoints: 'npm test' as unknown as DreamConfig['evaluatorEntrypoints'] });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/evaluatorEntrypoints must be an object/);
  });

  it('rejects an evaluatorEntrypoints value that is not a string', () => {
    const r = validateConfig({ ...base, evaluatorEntrypoints: { bench: 123 as unknown as string } });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/evaluatorEntrypoints\.bench must be a string/);
  });

  it('rejects branchPrefix as a number', () => {
    const r = validateConfig({ ...base, branchPrefix: 123 as unknown as string });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/branchPrefix must be a string/);
  });

  it('rejects ledgerPath as a number', () => {
    const r = validateConfig({ ...base, ledgerPath: 42 as unknown as string });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/ledgerPath must be a string/);
  });

  it('rejects an unrecognized adrConvention string', () => {
    const r = validateConfig({ ...base, adrConvention: 'bogus' as unknown as DreamConfig['adrConvention'] });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/adrConvention must be/);
  });

  it('accepts a well-typed adrConvention pad object', () => {
    const r = validateConfig({ ...base, adrConvention: { pad: 3, dir: 'docs/adrs' } });
    expect(r.ok).toBe(true);
  });

  it('still accepts a fully well-formed config (no false positives)', () => {
    const r = validateConfig({
      ...base,
      autoMerge: true,
      labels: ['dream-cycle', 'research'],
      competitors: ['Sakana AI Scientist'],
      evaluatorEntrypoints: { bench: 'npm test' },
      branchPrefix: 'dream/',
      ledgerPath: 'docs/dream-cycle/LEDGER.md',
      adrConvention: '4-digit',
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });
});

describe('production-relevant consequence: autoMerge:"false" (string) is truthy', () => {
  const malformed = { ...base, autoMerge: 'false' as unknown as boolean };

  it('the raw JS truthiness bug is real: "false" is truthy', () => {
    // This is the exact mechanism the validation gap used to let through:
    // a config author writing the JSON string "false" instead of the
    // boolean false gets a truthy value wherever the field is branched on.
    expect(Boolean(malformed.autoMerge)).toBe(true);
  });

  it('compile() now fails fast on this malformed config instead of silently emitting the wrong merge policy', () => {
    // Before this fix, validateConfig({...}).ok was true for this exact
    // config and compile() went on to emit "guarded auto-merge ENABLED"
    // for an author who intended autoMerge: false. Now compile() throws
    // before it can render the wrong policy text.
    expect(() => compile(malformed)).toThrow(/autoMerge must be a boolean/);
  });
});
