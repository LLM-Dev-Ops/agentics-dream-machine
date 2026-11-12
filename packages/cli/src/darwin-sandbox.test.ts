import { describe, it, expect } from 'vitest';
import { classifySandboxDiagnosticity, extractSandboxMode } from './darwin-sandbox.js';

describe('classifySandboxDiagnosticity', () => {
  it('reports mock as repo-independent, with the PR #111 evidence in the reason', () => {
    const r = classifySandboxDiagnosticity('mock');
    expect(r.repoIndependent).toBe(true);
    expect(r.reason).toContain('nonexistent repo path');
    expect(r.reason).toContain('PR #111');
  });

  it('reports real as repo-dependent, with tonight\'s measured A/B evidence in the reason', () => {
    // Regression test for the 2026-11-12 finding: PR #111/#123 deliberately left 'real'
    // unclassified ("not measured... until independently measured the same way"). Tonight
    // measured it: real path scored 0.985/pass=1.00, nonexistent path scored 0.235/pass=0.00.
    const r = classifySandboxDiagnosticity('real');
    expect(r.repoIndependent).toBe(false);
    expect(r.reason).toContain('0.985');
    expect(r.reason).toContain('0.235');
    expect(r.reason).toContain('DOES perform I/O');
  });

  it('does not conflate real\'s measured repo-path-dependence with variant-discriminating power', () => {
    // The degenerate/delta-+0.000 manifold is a separate, already-documented upstream
    // property (ADR-099); this classifier reports repo-path-dependence only.
    const r = classifySandboxDiagnosticity('real');
    expect(r.reason).toContain('ADR-099');
    expect(r.reason).toContain('delta +0.000');
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
    expect(extractSandboxMode('npx @metaharness/darwin evolve . --sandbox mock,extra')).toBe('mock');
  });
});
