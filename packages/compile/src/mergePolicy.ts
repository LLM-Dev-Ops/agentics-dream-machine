/**
 * Assesses whether this repo's guarded auto-merge policy can ever actually
 * fire, independent of the `automerge-safe` label existing.
 *
 * GitHub refuses to merge — or even enable auto-merge on — a draft pull
 * request (a human must first mark it "Ready for review"). STEP 20-25 of
 * the compiled routine opens every dream-cycle PR as a draft unconditionally
 * ("even a significant result stays draft"). So when both `autoMerge` is
 * configured true and the routine always opens PRs as drafts, the auto-merge
 * pathway is configured but unreachable until a human acts — regardless of
 * label, CI status, or protected-path checks.
 */
export interface MergePolicyInput {
  autoMerge: boolean;
  alwaysOpensDraft: boolean;
}

export interface MergePolicyAssessment {
  reachable: boolean;
  reason: string;
}

export function assessMergePolicyReachability(input: MergePolicyInput): MergePolicyAssessment {
  if (!input.autoMerge) {
    return {
      reachable: false,
      reason: 'autoMerge is disabled in dream.config; every merge is human-review only by design.',
    };
  }
  if (input.alwaysOpensDraft) {
    return {
      reachable: false,
      reason:
        "every dream-cycle PR opens as a draft (this routine's own STEP 20-25), and GitHub does " +
        'not allow merging or enabling auto-merge on a draft pull request — the configured ' +
        'auto-merge pathway cannot fire until a human marks a PR ready for review.',
    };
  }
  return {
    reachable: true,
    reason: 'autoMerge is enabled and PRs are not forced into draft; the guarded pathway can fire once its label/CI/path conditions are met.',
  };
}
