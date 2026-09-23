import { describe, it, expect } from 'vitest';
import { assessMergePolicyReachability } from './mergePolicy.js';

describe('assessMergePolicyReachability', () => {
  it('is unreachable when autoMerge is disabled, regardless of draft policy', () => {
    for (const alwaysOpensDraft of [true, false]) {
      const r = assessMergePolicyReachability({ autoMerge: false, alwaysOpensDraft });
      expect(r.reachable).toBe(false);
      expect(r.reason).toMatch(/disabled/);
    }
  });

  it('is unreachable when autoMerge is enabled but every PR always opens as a draft', () => {
    const r = assessMergePolicyReachability({ autoMerge: true, alwaysOpensDraft: true });
    expect(r.reachable).toBe(false);
    expect(r.reason).toMatch(/draft/);
    expect(r.reason).toMatch(/does not allow merging or enabling auto-merge on a draft pull request/);
  });

  it('is reachable when autoMerge is enabled and PRs are not forced into draft', () => {
    const r = assessMergePolicyReachability({ autoMerge: true, alwaysOpensDraft: false });
    expect(r.reachable).toBe(true);
    expect(r.reason).toMatch(/can fire/);
  });
});
