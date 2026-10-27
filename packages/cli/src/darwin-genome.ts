/**
 * Darwin genome ↔ target-repo relevance check.
 *
 * Measured 2026-10-27 (evaluation-adapters night, SCAN=darwin): `@metaharness/darwin`
 * evolves a fixed set of 7 synthetic agent-harness policy files — `context_builder.ts`,
 * `tool_policy.ts`, `score_policy.ts`, `reviewer.ts`, `retry_policy.ts`,
 * `memory_policy.ts`, `planner.ts` — inside its own `.metaharness/variants/*` workspace.
 * Those files are never written into, nor read by, the repo it's pointed at. Under
 * every sandbox mode this repo's `dream.config.json` can reach without real-LLM spend
 * (`real`: scores by the target's own test command; `mock`: static synthetic params;
 * `agent`: Darwin's own built-in synthetic "find the buggy file" task), no mutation to
 * those 7 files can ever change the target repo's own test outcome unless the target
 * repo's source already contains code shaped like those surfaces.
 *
 * `docs/dream-cycle/2026-10-27-evaluation-adapters-report.md` confirmed, by direct grep,
 * that `agentics-dream-machine`'s own source (`packages/*\/src`) contains zero of the 7
 * identifiers — this corrects ADR-0003's (proposed, unmerged in PR #18) open conjecture
 * that a hand-authored bench suite would fix Darwin's lack of evolutionary signal: no
 * bench suite targeting this repo's test command can create that causal path, regardless
 * of how it's authored, because nothing in the suite can make the test command read
 * Darwin's genome files in the first place.
 *
 * This module turns that one-night observation into a standing, pure, zero-I/O check so
 * a future change to this repo's own source (or a future Darwin version with a different
 * genome) can be verified against the same claim instead of re-measuring it by hand.
 */

/** Darwin v0.12.1's fixed set of evolvable agent-harness genome surfaces. */
export const DARWIN_GENOME_SURFACES = [
  'context_builder',
  'tool_policy',
  'score_policy',
  'reviewer',
  'retry_policy',
  'memory_policy',
  'planner',
] as const;

export interface GenomeRelevance {
  relevant: boolean;
  overlap: string[];
  reason: string;
}

/**
 * Pure — no I/O. Checks whether any of Darwin's known genome-surface identifiers
 * appear anywhere in the given source files. Returns `null` for any label other than
 * `'darwin'`: the finding is specific to Darwin's genome model, not a general claim
 * about other evaluator entrypoints.
 */
export function assessGenomeRelevance(
  label: string,
  sourceFiles: readonly { path: string; content: string }[],
): GenomeRelevance | null {
  if (label !== 'darwin') return null;
  const overlap = DARWIN_GENOME_SURFACES.filter((surface) =>
    sourceFiles.some((f) => f.content.includes(surface)),
  );
  return {
    relevant: overlap.length > 0,
    overlap,
    reason:
      overlap.length > 0
        ? `genome surface(s) ${overlap.join(', ')} appear in this repo's own source — ` +
          `darwin's mutations may be causally connected to its test outcome; the 2026-10-27 ` +
          `"no signal" finding may no longer apply and should be re-measured`
        : `none of darwin's ${DARWIN_GENOME_SURFACES.length} evolvable genome surfaces ` +
          `(${DARWIN_GENOME_SURFACES.join(', ')}) appear anywhere in the given source — under ` +
          `real/mock/agent sandbox mode, no bench suite targeting this repo's own test command ` +
          `can make a genome mutation causally affect that command's outcome`,
  };
}
