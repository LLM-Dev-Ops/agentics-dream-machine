import { describe, it, expect } from 'vitest';
import { assessSupplyChainPin, assessConfiguredSupplyChain } from './supplychain.js';

describe('assessSupplyChainPin', () => {
  it('is not-applicable for a non-npx command (reproduces this repo\'s real bench entrypoint)', () => {
    const r = assessSupplyChainPin('npm test');
    expect(r.verdict).toBe('not-applicable');
  });

  it('flags an unpinned scoped package as unpinned (reproduces this repo\'s real darwin entrypoint)', () => {
    const r = assessSupplyChainPin('npx @metaharness/darwin evolve --sandbox real');
    expect(r.verdict).toBe('unpinned');
    expect(r.reason).toContain('no version pin');
  });

  it('treats a version-pinned scoped package as pinned', () => {
    const r = assessSupplyChainPin('npx @metaharness/darwin@0.10.2 evolve --sandbox real');
    expect(r.verdict).toBe('pinned');
  });

  it('does not mistake the @scope marker itself for a version pin', () => {
    const r = assessSupplyChainPin('npx @metaharness/darwin');
    expect(r.verdict).toBe('unpinned');
  });

  it('treats an unpinned package with --no-install as guarded, not unpinned', () => {
    const r = assessSupplyChainPin('npx --no-install @metaharness/darwin evolve --sandbox real');
    expect(r.verdict).toBe('guarded');
    expect(r.reason).toContain('--no-install prevents');
  });

  it('flags an unpinned unscoped package as unpinned', () => {
    const r = assessSupplyChainPin('npx cowsay hello');
    expect(r.verdict).toBe('unpinned');
  });

  it('treats a version-pinned unscoped package as pinned', () => {
    const r = assessSupplyChainPin('npx cowsay@1.5.0 hello');
    expect(r.verdict).toBe('pinned');
  });

  it('flags a bare npx with no package argument as unpinned', () => {
    const r = assessSupplyChainPin('npx');
    expect(r.verdict).toBe('unpinned');
    expect(r.reason).toContain('no discernible package argument');
  });

  it('treats a dist-tag as unpinned, not pinned (a moving target, not a real pin)', () => {
    expect(assessSupplyChainPin('npx cowsay@latest hello').verdict).toBe('unpinned');
    expect(assessSupplyChainPin('npx @metaharness/darwin@next evolve').verdict).toBe('unpinned');
  });

  it('treats an unreffed git/URL spec as unpinned, not pinned from an embedded auth "@"', () => {
    // git@github.com:user/repo.git-style specs embed "user@host" — that "@" is
    // credentials, not a version marker; with no #ref this resolves to whatever
    // the default branch currently is on every run.
    expect(assessSupplyChainPin('npx git+ssh://git@github.com/user/repo.git').verdict).toBe('unpinned');
    expect(assessSupplyChainPin('npx github:user/repo').verdict).toBe('unpinned');
  });

  it('treats a git/URL spec pinned to a #ref (tag or commit) as pinned', () => {
    expect(assessSupplyChainPin('npx git+ssh://git@github.com/user/repo.git#v1.2.3').verdict).toBe('pinned');
    expect(assessSupplyChainPin('npx github:user/repo#a1b2c3d').verdict).toBe('pinned');
  });

  it('documented limitation: a multi-package -p invocation only assesses the first package', () => {
    // npx -p pkg1 -p pkg2 cmd actually installs both pkg1 and pkg2; this
    // classifier only inspects the first non-flag token. Locking in the
    // current (limited, not falsely-safe) behavior rather than silently
    // claiming full coverage — see the file-level doc comment.
    const r = assessSupplyChainPin('npx -p cowsay@1.5.0 -p left-pad cmd');
    expect(r.verdict).toBe('pinned');
  });
});

describe('assessConfiguredSupplyChain', () => {
  it('assesses every configured entrypoint, labelled with its key and command', () => {
    const results = assessConfiguredSupplyChain({
      bench: 'npm test',
      darwin: 'npx @metaharness/darwin evolve --sandbox real',
    });
    expect(results).toEqual([
      { label: 'bench', cmd: 'npm test', verdict: 'not-applicable', reason: 'not an npx invocation' },
      {
        label: 'darwin',
        cmd: 'npx @metaharness/darwin evolve --sandbox real',
        verdict: 'unpinned',
        reason:
          'package spec "@metaharness/darwin" has no version pin and no --no-install guard — ' +
          'an unattended run will silently install and execute whatever is currently published under this name',
      },
    ]);
  });

  it('skips entries with no configured command', () => {
    const results = assessConfiguredSupplyChain({ bench: 'npm test', redblue: undefined });
    expect(results.map((r) => r.label)).toEqual(['bench']);
  });
});
