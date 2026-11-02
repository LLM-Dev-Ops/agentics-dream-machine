import { describe, it, expect } from 'vitest';
import { classifyEntrypointResult, classifyConfiguredEntrypoints, detectSwallowedPositionalArtifact } from './entrypoint.js';

/**
 * Real stdout captured 2026-11-02 running this repo's literal, unmodified
 * `dream.config.json` darwin entrypoint from repo root: `npx
 * @metaharness/darwin evolve --sandbox real` (no `<repo>` positional). Not a
 * guessed/synthetic fixture.
 */
const DARWIN_SWALLOWED_REPO_STDOUT = `
Darwin Mode — leaderboard
  0.985  baseline  [planner]  safety=1.00  pass=1.00 ◀ winner
  0.985  g1_v0  [planner]  safety=1.00  pass=1.00
  0.985  g1_v1  [toolPolicy]  safety=1.00  pass=1.00
  0.985  g1_v2  [reviewer]  safety=1.00  pass=1.00
  0.985  g1_v3  [toolPolicy]  safety=1.00  pass=1.00
  0.985  g2_v0  [reviewer]  safety=1.00  pass=1.00
  0.985  g2_v1  [planner]  safety=1.00  pass=1.00
  0.985  g2_v2  [contextBuilder]  safety=1.00  pass=1.00
  0.985  g2_v3  [toolPolicy]  safety=1.00  pass=1.00
  0.985  g2_v4  [scorePolicy]  safety=1.00  pass=1.00

Winner: baseline
Lineage: baseline
Delta over baseline: +0.000

Artifacts: /home/user/agentics-dream-machine/--sandbox/.metaharness
`;

/** Real stdout captured 2026-11-02 running the corrected command (`evolve . --sandbox real`). */
const DARWIN_CORRECT_REPO_STDOUT = `
Darwin Mode — leaderboard
  0.985  baseline  [planner]  safety=1.00  pass=1.00 ◀ winner

Winner: baseline
Lineage: baseline
Delta over baseline: +0.000

Artifacts: /home/user/agentics-dream-machine/.metaharness
`;

describe('classifyEntrypointResult', () => {
  it('flags a nonzero exit as blocked (reproduces npx @metaharness/flywheel: no bin field)', () => {
    const r = classifyEntrypointResult({
      code: 1,
      stdout: '',
      stderr: 'npm error could not determine executable to run',
    });
    expect(r.verdict).toBe('blocked');
    expect(r.reason).toContain('could not determine executable to run');
  });

  it('flags exit 0 + empty stdout/stderr as suspicious-silent (reproduces npx @metaharness/redblue)', () => {
    const r = classifyEntrypointResult({ code: 0, stdout: '', stderr: '' });
    expect(r.verdict).toBe('suspicious-silent');
    expect(r.reason).toContain('indistinguishable from');
  });

  it('flags exit 0 + whitespace-only output as suspicious-silent, not live', () => {
    const r = classifyEntrypointResult({ code: 0, stdout: '  \n\t', stderr: '' });
    expect(r.verdict).toBe('suspicious-silent');
  });

  it('treats exit 0 + real stdout as live (reproduces npx @metaharness/darwin --version usage text)', () => {
    const r = classifyEntrypointResult({
      code: 0,
      stdout: 'usage: metaharness-darwin <evolve|bench|security> …',
      stderr: '',
    });
    expect(r.verdict).toBe('live');
  });

  it('treats exit 0 + stderr-only output as live (bench entrypoint may log to stderr)', () => {
    const r = classifyEntrypointResult({ code: 0, stdout: '', stderr: 'warning: slow test detected' });
    expect(r.verdict).toBe('live');
  });
});

describe('detectSwallowedPositionalArtifact', () => {
  it('flags a flag-shaped artifacts directory (reproduces the unfixed darwin entrypoint, 2026-11-02)', () => {
    expect(detectSwallowedPositionalArtifact(DARWIN_SWALLOWED_REPO_STDOUT)).toBe('--sandbox');
  });

  it('does not flag a normal artifacts directory (reproduces the corrected darwin entrypoint)', () => {
    expect(detectSwallowedPositionalArtifact(DARWIN_CORRECT_REPO_STDOUT)).toBeUndefined();
  });

  it('returns undefined when stdout has no Artifacts line', () => {
    expect(detectSwallowedPositionalArtifact('usage: metaharness-darwin <evolve|bench|security> …')).toBeUndefined();
  });
});

describe('classifyConfiguredEntrypoints', () => {
  it('classifies every configured entrypoint, labelled with its key and command, in insertion order', async () => {
    const calls: string[] = [];
    const exec = async (cmd: string) => {
      calls.push(cmd);
      if (cmd === 'npm test') return { code: 0, stdout: '98 passed', stderr: '' };
      return { code: 1, stdout: '', stderr: 'npm error could not determine executable to run' };
    };
    const results = await classifyConfiguredEntrypoints({ bench: 'npm test', darwin: 'npx @metaharness/darwin' }, exec);
    expect(calls).toEqual(['npm test', 'npx @metaharness/darwin']);
    expect(results).toEqual([
      { label: 'bench', cmd: 'npm test', verdict: 'live', code: 0, reason: 'produced output' },
      {
        label: 'darwin',
        cmd: 'npx @metaharness/darwin',
        verdict: 'blocked',
        code: 1,
        reason: 'npm error could not determine executable to run',
      },
    ]);
  });

  it('skips entries with no configured command and never calls exec for them', async () => {
    const exec = async (cmd: string) => ({ code: 0, stdout: cmd, stderr: '' });
    const results = await classifyConfiguredEntrypoints({ bench: 'npm test', redblue: undefined }, exec);
    expect(results.map((r) => r.label)).toEqual(['bench']);
  });

  it('reproduces tonight\'s redblue symlink-dispatch footgun through the configured-entrypoints path', async () => {
    const exec = async () => ({ code: 0, stdout: '', stderr: '' });
    const results = await classifyConfiguredEntrypoints({ redblue: 'npx @metaharness/redblue' }, exec);
    expect(results[0].verdict).toBe('suspicious-silent');
  });

  it('reproduces the unfixed darwin entrypoint (missing positional) as suspicious-misconfigured, not live', async () => {
    const exec = async () => ({ code: 0, stdout: DARWIN_SWALLOWED_REPO_STDOUT, stderr: '' });
    const results = await classifyConfiguredEntrypoints({ darwin: 'npx @metaharness/darwin evolve --sandbox real' }, exec);
    expect(results[0].verdict).toBe('suspicious-misconfigured');
    expect(results[0].reason).toContain('--sandbox');
  });

  it('classifies the corrected darwin entrypoint as live', async () => {
    const exec = async () => ({ code: 0, stdout: DARWIN_CORRECT_REPO_STDOUT, stderr: '' });
    const results = await classifyConfiguredEntrypoints({ darwin: 'npx @metaharness/darwin evolve . --sandbox real' }, exec);
    expect(results[0].verdict).toBe('live');
  });
});
