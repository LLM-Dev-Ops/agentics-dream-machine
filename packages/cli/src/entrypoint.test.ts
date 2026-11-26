import { describe, it, expect } from 'vitest';
import { classifyEntrypointResult, classifyConfiguredEntrypoints, diffWorkingTree } from './entrypoint.js';

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
});

describe('diffWorkingTree', () => {
  it('returns [] when nothing changed', () => {
    expect(diffWorkingTree('', '')).toEqual([]);
    expect(diffWorkingTree('?? foo/\n', '?? foo/\n')).toEqual([]);
  });

  it('reproduces the real darwin entrypoint leaving a stray `--sandbox/` tree behind', () => {
    // Exact reproduction, 2026-11-26: `npx @metaharness/darwin evolve --sandbox real`
    // (this repo's own configured `darwin` entrypoint) wrote `--sandbox/.metaharness/...`
    // straight into the repo root on a clean checkout.
    const before = '';
    const after = '?? --sandbox/\n';
    expect(diffWorkingTree(before, after)).toEqual(['--sandbox']);
  });

  it('reports only top-level new paths, de-duplicated and sorted, ignoring pre-existing ones', () => {
    const before = '?? old-untracked/\n';
    const after = ' M old-untracked/file.ts\n?? new-dir/a.ts\n?? new-dir/b.ts\n?? zeta.log\n';
    expect(diffWorkingTree(before, after)).toEqual(['new-dir', 'zeta.log']);
  });

  it('follows rename arrows (`old -> new`) to the new path', () => {
    const before = '';
    const after = 'R  old-name.ts -> renamed.ts\n';
    expect(diffWorkingTree(before, after)).toEqual(['renamed.ts']);
  });

  it('ignores blank lines and lines too short to carry a path', () => {
    expect(diffWorkingTree('', '\n\n?? x\n')).toEqual(['x']);
  });
});
