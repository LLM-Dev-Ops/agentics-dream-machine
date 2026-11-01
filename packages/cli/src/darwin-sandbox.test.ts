import { describe, it, expect } from 'vitest';
import { classifySandboxDiagnosticity } from './darwin-sandbox.js';

describe('classifySandboxDiagnosticity', () => {
  it('reports mock as repo-independent, with the real-vs-nonexistent-path evidence in the reason', () => {
    const r = classifySandboxDiagnosticity('mock');
    expect(r.repoIndependent).toBe(true);
    expect(r.reason).toContain('nonexistent repo path');
  });

  it('does not claim real is repo-dependent — it was not measured the same way tonight', () => {
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
