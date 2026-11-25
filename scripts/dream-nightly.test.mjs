import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tonight } from './dream-nightly.mjs';

describe('scripts/dream-nightly tonight()', () => {
  it("this repo's real dream.config.json is valid (invalid=false)", () => {
    const ctx = tonight();
    expect(ctx.invalid).toBe(false);
    expect(ctx.deep).toBeTruthy();
  });

  it('a schema-invalid config degrades honestly instead of throwing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dream-nightly-test-'));
    const badConfigPath = join(dir, 'bad.dream.config.json');
    writeFileSync(badConfigPath, JSON.stringify({ repo: 'LLM-Dev-Ops/agentics-dream-machine', cron: 'not-a-cron', slots: [] }));
    const prevConfig = process.env.DREAM_CONFIG;
    process.env.DREAM_CONFIG = badConfigPath;
    try {
      const ctx = tonight();
      expect(ctx.invalid).toBe(true);
      expect(ctx.errors.length).toBeGreaterThan(0);
    } finally {
      if (prevConfig === undefined) delete process.env.DREAM_CONFIG;
      else process.env.DREAM_CONFIG = prevConfig;
    }
  });
});
