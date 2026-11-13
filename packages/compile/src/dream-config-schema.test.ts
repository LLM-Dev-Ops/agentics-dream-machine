import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateConfig, type DreamConfig } from './config.js';

// Closes the config-schema gap flagged, but not implemented, by the
// 2026-09-10 compiler-parity night (PR #14): dream.config.json previously had
// no external JSON Schema for editor-time validation/autocomplete, only the
// TypeScript DreamConfig interface + runtime validateConfig(). This test
// keeps packages/compile/dream.config.schema.json honest against both:
// drift from the TS interface, and drift from the live dream.config.json.

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const readRepoFile = (rel: string) => readFileSync(`${repoRoot}${rel}`, 'utf8');

// Mirrors the DreamConfig interface in ./config.ts. Interfaces don't exist at
// runtime, so this list is the drift guard: add a field there, add it here.
const DREAM_CONFIG_FIELDS = [
  'repo',
  'cron',
  'slots',
  'bonusModuli',
  'controlPlaneProbes',
  'buildStep',
  'evaluatorEntrypoints',
  'adrConvention',
  'competitors',
  'extraDisciplines',
  'ledgerPath',
  'branchPrefix',
  'labels',
  'autoMerge',
].sort();

interface JsonSchema {
  required: string[];
  properties: Record<string, unknown>;
}

describe('dream.config.schema.json', () => {
  const schema = JSON.parse(readRepoFile('packages/compile/dream.config.schema.json')) as JsonSchema;

  it('is valid JSON with the expected top-level shape', () => {
    expect(schema.required).toBeInstanceOf(Array);
    expect(schema.properties).toBeTypeOf('object');
  });

  it('declares exactly the DreamConfig fields, plus the editor-only "$schema" pointer', () => {
    const schemaFields = Object.keys(schema.properties)
      .filter((k) => k !== '$schema')
      .sort();
    expect(schemaFields).toEqual(DREAM_CONFIG_FIELDS);
    expect(schema.properties).toHaveProperty('$schema');
  });

  it('requires exactly the fields validateConfig treats as mandatory', () => {
    // validateConfig() errors when repo, cron, or slots is missing/invalid;
    // every other field is optional (withDefaults() fills a default).
    expect([...schema.required].sort()).toEqual(['cron', 'repo', 'slots']);
    const missingRepo = validateConfig({ cron: '0 8 * * *', slots: [{ deep: 'x', scan: ['y'] }] } as Partial<DreamConfig>);
    expect(missingRepo.ok).toBe(false);
  });

  it("the live dream.config.json's keys are all modeled in the schema", () => {
    const liveConfig = JSON.parse(readRepoFile('dream.config.json')) as Record<string, unknown>;
    for (const key of Object.keys(liveConfig)) {
      expect(schema.properties, `unmodeled key "${key}" in dream.config.json`).toHaveProperty(key);
    }
  });

  it('the live dream.config.json still validates against validateConfig()', () => {
    const liveConfig = JSON.parse(readRepoFile('dream.config.json')) as DreamConfig;
    const v = validateConfig(liveConfig);
    expect(v.ok, v.errors.join('; ')).toBe(true);
  });
});
