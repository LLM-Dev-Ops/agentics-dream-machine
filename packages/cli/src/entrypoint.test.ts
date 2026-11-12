import { describe, it, expect } from 'vitest';
import { classifyEntrypointResult, classifyConfiguredEntrypoints, classifyIdempotency } from './entrypoint.js';

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

  it('does not run each command twice, or attach idempotency, unless idempotencyCheck is requested', async () => {
    let calls = 0;
    const exec = async () => {
      calls += 1;
      return { code: 0, stdout: 'ok', stderr: '' };
    };
    const results = await classifyConfiguredEntrypoints({ bench: 'npm test' }, exec);
    expect(calls).toBe(1);
    expect(results[0].idempotency).toBeUndefined();
  });

  it(
    "reproduces tonight's darwin --sandbox real state-pollution bug: live on a clean first run, " +
      'blocked on the identical second run, flagged non-idempotent',
    async () => {
      let calls = 0;
      const exec = async () => {
        calls += 1;
        if (calls === 1) return { code: 0, stdout: 'g1_v0 scored', stderr: '' };
        return {
          code: 1,
          stdout: '',
          stderr: 'Error: darwin: autonomous or generated child id already exists: g1_v0',
        };
      };
      const results = await classifyConfiguredEntrypoints(
        { darwin: 'npx @metaharness/darwin evolve --sandbox real' },
        exec,
        { idempotencyCheck: true },
      );
      expect(calls).toBe(2);
      expect(results[0].verdict).toBe('live');
      expect(results[0].idempotency).toEqual({
        idempotent: false,
        reason:
          "first run classified 'live' (produced output), second run classified 'blocked' " +
          '(Error: darwin: autonomous or generated child id already exists: g1_v0) — entrypoint is ' +
          "stateful/non-reproducible; do not trust a single-shot 'live' verdict",
      });
    },
  );
});

describe('classifyIdempotency', () => {
  it('reports idempotent when both runs agree', () => {
    const live = { verdict: 'live' as const, code: 0, reason: 'produced output' };
    const r = classifyIdempotency(live, live);
    expect(r).toEqual({ idempotent: true, reason: "both runs classified 'live'" });
  });

  it('reports non-idempotent when verdicts diverge between runs', () => {
    const first = { verdict: 'live' as const, code: 0, reason: 'produced output' };
    const second = { verdict: 'blocked' as const, code: 1, reason: 'boom' };
    const r = classifyIdempotency(first, second);
    expect(r.idempotent).toBe(false);
    expect(r.reason).toContain("first run classified 'live'");
    expect(r.reason).toContain("second run classified 'blocked'");
  });
});
