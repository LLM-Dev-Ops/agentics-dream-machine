import { describe, it, expect } from 'vitest';
import { classifyOverlap } from './overlap.js';

describe('classifyOverlap', () => {
  it('flags clear overlap when most candidate keywords occur in a prior item (reproduces issue #132\'s darwin-pin rediscovery of PR #18/#20/#63)', () => {
    const r = classifyOverlap(
      ['darwin', 'pin', 'version', 'npx', '@metaharness/darwin'],
      [
        {
          number: 18,
          title: 'security-adversarial: pin the unpinned darwin npx entrypoint',
          body: 'Adds an exact @metaharness/darwin version pin so npx never silently installs a new version.',
        },
        { number: 40, title: 'developer-experience: tui pad() ANSI-safe truncation', body: 'Fixes raw ANSI slicing.' },
      ],
    );
    expect(r.verdict).toBe('overlap');
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0].number).toBe(18);
    expect(r.matches[0].matchedKeywords).toEqual(['darwin', 'pin', 'version', 'npx', '@metaharness/darwin']);
  });

  it('reports clear when no prior item shares enough keywords', () => {
    const r = classifyOverlap(
      ['tui', 'ansi', 'truncation'],
      [{ number: 1, title: 'security-adversarial: pin darwin', body: 'npx version pin' }],
    );
    expect(r.verdict).toBe('clear');
    expect(r.matches).toEqual([]);
  });

  it('does not false-positive on a substring that is not a whole word', () => {
    const r = classifyOverlap(['pin'], [{ number: 2, title: 'add a pineapple icon to the TUI', body: '' }], 1);
    expect(r.verdict).toBe('clear');
  });

  it('sorts multiple matches by score descending, then issue number ascending', () => {
    const r = classifyOverlap(
      ['a', 'b', 'c', 'd'],
      [
        { number: 5, title: 'a b', body: '' },
        { number: 3, title: 'a b c d', body: '' },
        { number: 7, title: 'a b c', body: '' },
      ],
      0.25,
    );
    expect(r.matches.map((m) => m.number)).toEqual([3, 7, 5]);
  });

  it('treats threshold as inclusive (score === threshold still matches)', () => {
    const r = classifyOverlap(['a', 'b'], [{ number: 1, title: 'a', body: '' }], 0.5);
    expect(r.verdict).toBe('overlap');
  });

  it('is clear when given no candidate keywords, even against a matching corpus', () => {
    const r = classifyOverlap([], [{ number: 1, title: 'darwin pin npx version', body: '' }]);
    expect(r.verdict).toBe('clear');
  });

  it('is clear when given no items', () => {
    const r = classifyOverlap(['darwin', 'pin'], []);
    expect(r.verdict).toBe('clear');
  });

  it('matches a keyword whose edge character is not a word character (e.g. a scoped package name)', () => {
    const r = classifyOverlap(['@metaharness/darwin'], [{ number: 1, title: 'pin @metaharness/darwin', body: '' }], 1);
    expect(r.verdict).toBe('overlap');
  });

  it('deduplicates repeated candidate keywords so they do not double-count toward the score', () => {
    const r = classifyOverlap(['darwin', 'darwin', 'pin'], [{ number: 1, title: 'darwin only', body: '' }], 0.6);
    expect(r.verdict).toBe('clear'); // 1/2 matched keywords (after dedupe), below 0.6 threshold
  });
});
