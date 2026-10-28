import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findUnpinnedActions } from './actions-pin.js';

// This repo's .github/workflows/ directory, resolved relative to this file
// so the test works from any cwd (matches scripts/*.test.mjs precedent from
// PR #93, which reads real repo files the same way).
const workflowsDir = fileURLToPath(new URL('../../../.github/workflows/', import.meta.url));

describe('findUnpinnedActions', () => {
  it('is pure and flags a mutable major-version tag', () => {
    expect(findUnpinnedActions('      - uses: actions/checkout@v4\n')).toEqual([
      { line: 1, action: 'actions/checkout', ref: 'v4' },
    ]);
  });

  it('accepts a full 40-character commit SHA as pinned, Dependabot comment and all', () => {
    expect(
      findUnpinnedActions(
        '      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4\n',
      ),
    ).toEqual([]);
  });

  it('does not treat a 40-character non-hex string as pinned', () => {
    const notAHex = 'g'.repeat(40);
    expect(findUnpinnedActions(`      - uses: actions/checkout@${notAHex}\n`).length).toBe(1);
  });

  it('matches a quoted `uses:` value (independent critic caught the unquoted regex missing this entirely)', () => {
    expect(findUnpinnedActions("      - uses: 'actions/checkout@v4'\n")).toEqual([
      { line: 1, action: 'actions/checkout', ref: 'v4' },
    ]);
    expect(
      findUnpinnedActions(
        '      - uses: "actions/checkout@11d5960a326750d5838078e36cf38b85af677262" # v4\n',
      ),
    ).toEqual([]);
  });

  it('ignores lines that are not `uses:`', () => {
    expect(findUnpinnedActions('      run: echo hi\n      name: build\n')).toEqual([]);
  });

  it('reports the 1-based line number and handles nested action paths (e.g. codeql-action/init)', () => {
    const yaml = ['steps:', '  - run: echo hi', '  - uses: github/codeql-action/init@v3'].join(
      '\n',
    );
    expect(findUnpinnedActions(yaml)).toEqual([
      { line: 3, action: 'github/codeql-action/init', ref: 'v3' },
    ]);
  });

  it('flags every mutable tag reproduced live from this repo pre-fix (frozen baseline, 2026-10-28)', () => {
    // Verbatim `uses:` lines as they existed on main at commit 2fba255,
    // before tonight's fix — pinned here so the vulnerability this candidate
    // closes stays a frozen, checkable fact rather than a one-night claim.
    const BASELINE_USES_LINES = [
      '      - uses: actions/checkout@v4',
      '      - uses: actions/setup-node@v4',
      '      - uses: github/codeql-action/init@v3',
      '      - uses: github/codeql-action/analyze@v3',
      '      - uses: actions/configure-pages@v5',
      '      - uses: actions/upload-pages-artifact@v3',
      '      - uses: actions/deploy-pages@v4',
    ].join('\n');
    const unpinned = findUnpinnedActions(BASELINE_USES_LINES);
    expect(unpinned).toHaveLength(7);
    expect(unpinned.every((u) => /^v\d+$/.test(u.ref))).toBe(true);
  });

  it('out of scope: a Docker digest reference is flagged, not recognized as pinned (documented limitation)', () => {
    // docker://image@sha256:<64-hex> is a different, digest-pinned scheme;
    // this checker targets GitHub Action owner/repo@ref only (see actions-pin.ts).
    // Recorded so this stays a known, intentional scope boundary rather than
    // a silent surprise if a future workflow ever adds a docker:// step.
    const sha256 = 'a'.repeat(64);
    expect(findUnpinnedActions(`      - uses: docker://alpine@sha256:${sha256}\n`)).toHaveLength(
      1,
    );
  });

  it('every real workflow file in .github/workflows/ is pinned to a full commit SHA', () => {
    const files = readdirSync(workflowsDir).filter(
      (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
    );
    expect(files.length).toBeGreaterThan(0); // fails loudly if the path resolution ever breaks
    for (const file of files) {
      const text = readFileSync(join(workflowsDir, file), 'utf8');
      expect(findUnpinnedActions(text), `${file} has an unpinned action`).toEqual([]);
    }
  });
});
