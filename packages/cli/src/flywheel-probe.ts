/**
 * Flywheel sanity probe.
 *
 * Every slot-2 "evaluation-adapters" night's compiled routine names
 * `flywheel` as a SCAN dimension alongside `darwin` (`dream.config.json`
 * `slots[2].scan`), but nothing in this repo has ever actually executed
 * `@metaharness/flywheel` — because, unlike `darwin` and `bench`, it has no
 * `bin` field: it is a dependency-free library you call via
 * `runFlywheelGenerations()`, not a shell command you can hand to
 * `classifyEntrypointResult`. The existing `npx @metaharness/flywheel`
 * regression test only proves the *bare CLI invocation* fails (no
 * executable) — it says nothing about whether the library itself works.
 *
 * This module runs the package's own documented quickstart (a toy,
 * deterministic proposer/evaluator pair — zero network, zero model calls)
 * against the real, installed `@metaharness/flywheel` and classifies the
 * result with the same live/suspicious-silent/blocked vocabulary
 * `entrypoint.ts` uses for command-shaped evaluators, so a library-shaped
 * evaluator gets the same observability instead of silently never being
 * checked.
 */
import {
  runFlywheelGenerations,
  meetsPromotionRule,
  makeSigner,
  verifyReplayBundle,
  type Policy,
  type PolicyGenome,
} from '@metaharness/flywheel';
import type { EntrypointCheck } from './entrypoint.js';

export interface FlywheelProbeResult {
  liftCurve: number[];
  promotions: number;
  generationsRun: number;
  replayVerifies: boolean;
}

const TOY_RULES = ['cite sources', 'answer in JSON', 'check units'];

function toyEvaluator(policy: Policy) {
  const hits = TOY_RULES.filter((r) => Object.values(policy).join(' ').includes(r)).length;
  return Promise.resolve({
    primary: hits / TOY_RULES.length,
    noopRate: 1 - hits / TOY_RULES.length,
    costPerWin: 1,
    regressed: false,
  });
}

function toyProposer(base: PolicyGenome, target: string) {
  const missing = TOY_RULES.find((r) => !Object.values(base.policy).join(' ').includes(r)) ?? '';
  return Promise.resolve(`${base.policy[target]} ${missing}`.trim());
}

/**
 * Run the package's own quickstart loop against the real, installed
 * `@metaharness/flywheel`. Pure w.r.t. the outside world: no network, no
 * filesystem, no model calls — `now()` is fixed so the run is deterministic.
 */
export async function runFlywheelSanityProbe(): Promise<FlywheelProbeResult> {
  const result = await runFlywheelGenerations({
    rootPolicy: { reasoning: '', format: '' },
    proposer: toyProposer,
    evaluator: toyEvaluator,
    promotionRule: meetsPromotionRule,
    holdout: { id: 'holdout', items: [1] },
    maxGenerations: 4,
    signer: makeSigner(),
    now: (g: number) => `2026-01-01T00:00:0${g}Z`,
  });
  const verdict = verifyReplayBundle(result.replayBundle);
  return {
    liftCurve: result.liftCurve.map((p) => p.primary),
    promotions: result.promotions.length,
    generationsRun: result.generationsRun,
    replayVerifies: verdict.pass,
  };
}

/**
 * Map a probe result onto the same verdict vocabulary `classifyEntrypointResult`
 * uses, so `flywheel` and `darwin` print through one shared mental model despite
 * being reached by completely different mechanisms (in-process call vs. exec).
 */
export function classifyFlywheelProbe(r: FlywheelProbeResult): EntrypointCheck {
  if (!r.replayVerifies) {
    return {
      verdict: 'blocked',
      code: 1,
      reason: 'runFlywheelGenerations completed but verifyReplayBundle rejected its own receipt',
    };
  }
  if (r.promotions === 0 || r.liftCurve.every((v) => v === r.liftCurve[0])) {
    return {
      verdict: 'suspicious-silent',
      code: 0,
      reason:
        `ran ${r.generationsRun} generation(s), 0 promotions, flat lift curve — ` +
        'indistinguishable from a no-op proposer/evaluator wiring; do not treat as evidence of a working loop',
    };
  }
  return {
    verdict: 'live',
    code: 0,
    reason: `${r.promotions} promotion(s) across ${r.generationsRun} generation(s), replay verified`,
  };
}
