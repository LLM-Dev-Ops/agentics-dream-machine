import { describe, it, expect } from 'vitest';
import { classifySandboxDiagnosticity, extractSandboxMode } from './darwin-sandbox.js';

describe('classifySandboxDiagnosticity', () => {
  it('reports mock as repo-independent, with the PR #111 evidence in the reason', () => {
    const r = classifySandboxDiagnosticity('mock');
    expect(r.repoIndependent).toBe(true);
    expect(r.reason).toContain('nonexistent repo path');
    expect(r.reason).toContain('PR #111');
  });

  it('does not claim real is repo-dependent — it was not measured the same way', () => {
    const r = classifySandboxDiagnosticity('real');
    expect(r.repoIndependent).toBe(false);
    expect(r.reason).toContain('not measured');
  });

  it('treats agent and llm-agent the same honest way: not measured, not assumed', () => {
    expect(classifySandboxDiagnosticity('agent').repoIndependent).toBe(false);
    expect(classifySandboxDiagnosticity('llm-agent').repoIndependent).toBe(false);
  });

  it('does not crash on an unknown/typo mode — same honest default applies', () => {
    const r = classifySandboxDiagnosticity('relal');
    expect(r.repoIndependent).toBe(false);
    expect(r.reason).toContain('relal');
  });
});

describe('extractSandboxMode', () => {
  it('extracts a space-separated --sandbox value', () => {
    expect(extractSandboxMode('npx @metaharness/darwin evolve --sandbox real')).toBe('real');
  });

  it('extracts an =-separated --sandbox value', () => {
    expect(extractSandboxMode('npx @metaharness/darwin evolve . --sandbox=mock')).toBe('mock');
  });

  it('extracts --sandbox mock even with trailing flags', () => {
    expect(extractSandboxMode('npx @metaharness/darwin evolve . --sandbox mock --seed 42')).toBe('mock');
  });

  it('returns undefined when no --sandbox flag is present', () => {
    expect(extractSandboxMode('npm test')).toBeUndefined();
  });

  it('returns undefined for an unrelated command containing "sandbox" as plain text', () => {
    expect(extractSandboxMode('echo "no sandbox flag here"')).toBeUndefined();
  });

  it('stops at a comma instead of swallowing trailing non-whitespace into the mode value', () => {
    // Regression test (independent-critic finding, 2026-11-07): the first draft used a
    // greedy \S+ capture, which would have captured "mock,extra" whole instead of "mock".
    expect(extractSandboxMode('npx @metaharness/darwin evolve . --sandbox mock,extra')).toBe('mock');
  });
});
