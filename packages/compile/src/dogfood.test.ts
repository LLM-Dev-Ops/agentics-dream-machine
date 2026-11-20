import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { compile, validateConfig, type DreamConfig } from './index.js';

// This repo's own dream.config.json is the authoritative input to the cloud
// scheduler routine that fires every night (see ADR-0001). Every other test
// in this package compiles a *fake* config (e.g. the `metaharness` fixture in
// index.test.ts) — none of them exercise this repo's real config, so a
// `dream.config.json` edit (or a `compile()` change) that silently changes
// what the live nightly routine actually says had no automated test to catch
// it before tonight.
const configPath = fileURLToPath(new URL('../../../dream.config.json', import.meta.url));
const ownConfig = JSON.parse(readFileSync(configPath, 'utf8')) as DreamConfig;

describe('dream.config.json (this repo\'s own authoritative config)', () => {
  it('is schema-valid', () => {
    const v = validateConfig(ownConfig);
    expect(v.errors).toEqual([]);
    expect(v.ok).toBe(true);
  });

  it('compiles without throwing', () => {
    expect(() => compile(ownConfig)).not.toThrow();
  });

  it('golden-snapshot: the compiled routine prompt is stable', () => {
    expect(compile(ownConfig)).toMatchSnapshot();
  });
});
