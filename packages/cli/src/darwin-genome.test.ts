import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assessGenomeRelevance, DARWIN_GENOME_SURFACES } from './darwin-genome.js';

describe('assessGenomeRelevance', () => {
  it('returns null for any label other than darwin — the finding is darwin-specific', () => {
    expect(assessGenomeRelevance('bench', [])).toBeNull();
    expect(assessGenomeRelevance('flywheel', [{ path: 'x.ts', content: 'planner' }])).toBeNull();
  });

  it('reports not relevant when none of the 7 genome surfaces appear in the source', () => {
    const r = assessGenomeRelevance('darwin', [
      { path: 'index.ts', content: 'export function run() { return 1; }' },
    ]);
    expect(r?.relevant).toBe(false);
    expect(r?.overlap).toEqual([]);
    expect(r?.reason).toContain('none of');
  });

  it('reports relevant and names the matching surface(s) when overlap is found', () => {
    const r = assessGenomeRelevance('darwin', [
      { path: 'policy.ts', content: 'export class ToolPolicyAdapter { tool_policy() {} }' },
    ]);
    expect(r?.relevant).toBe(true);
    expect(r?.overlap).toEqual(['tool_policy']);
    expect(r?.reason).toContain('tool_policy');
  });

  it('checks across all given files, not just the first', () => {
    const r = assessGenomeRelevance('darwin', [
      { path: 'a.ts', content: 'nothing relevant here' },
      { path: 'b.ts', content: 'class Reviewer { reviewer() {} }' },
    ]);
    expect(r?.overlap).toEqual(['reviewer']);
  });

  it('lists all 7 known darwin genome surfaces', () => {
    expect(DARWIN_GENOME_SURFACES).toHaveLength(7);
  });
});

describe('assessGenomeRelevance — regression guard against this repo\'s own real source', () => {
  it(
    "confirms the 2026-10-27 finding still holds: agentics-dream-machine's own source " +
      'contains zero of darwin\'s 7 genome surfaces. If this ever flips to true, darwin ' +
      'evaluation may have become viable for this repo and the finding in ' +
      'docs/dream-cycle/2026-10-27-evaluation-adapters-report.md needs re-measuring, ' +
      'not silent acceptance.',
    () => {
      const here = dirname(fileURLToPath(import.meta.url));
      const packagesDir = join(here, '..', '..'); // packages/cli/src -> packages
      const sourceFiles: { path: string; content: string }[] = [];

      for (const pkg of readdirSync(packagesDir, { withFileTypes: true })) {
        if (!pkg.isDirectory()) continue;
        const srcDir = join(packagesDir, pkg.name, 'src');
        let entries: ReturnType<typeof readdirSync>;
        try {
          entries = readdirSync(srcDir, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const entry of entries) {
          if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) continue;
          // darwin-genome.ts itself necessarily contains all 7 surface names as literal
          // data (the DARWIN_GENOME_SURFACES array + doc comments) — scanning it would be
          // a self-own-goal false positive, not evidence that darwin's genome is wired
          // into this repo's actual behavior. Exclude it from the corpus being checked.
          if (entry.name === 'darwin-genome.ts') continue;
          const path = join(srcDir, entry.name);
          sourceFiles.push({ path, content: readFileSync(path, 'utf8') });
        }
      }

      // Sanity check the walk itself found real files, so a refactor that moves
      // `packages/*/src` can't silently pass this test by scanning nothing.
      expect(sourceFiles.length).toBeGreaterThan(5);

      const result = assessGenomeRelevance('darwin', sourceFiles);
      expect(result?.relevant).toBe(false);
      expect(result?.overlap).toEqual([]);
    },
  );
});
