import { describe, it, expect } from 'vitest';
import { runFlywheelSanityProbe, classifyFlywheelProbe } from './flywheel-probe.js';

describe('runFlywheelSanityProbe', () => {
  it('runs the real, installed @metaharness/flywheel package end to end and reproduces its own documented quickstart output', async () => {
    const r = await runFlywheelSanityProbe();
    expect(r.liftCurve.map((v) => Number(v.toFixed(2)))).toEqual([0, 0.33, 0.67, 1]);
    expect(r.promotions).toBe(3);
    expect(r.generationsRun).toBe(4);
    expect(r.replayVerifies).toBe(true);
  });

  it('is deterministic across repeated real invocations (fixed now(), toy proposer/evaluator)', async () => {
    const a = await runFlywheelSanityProbe();
    const b = await runFlywheelSanityProbe();
    expect(a).toEqual(b);
  });
});

describe('classifyFlywheelProbe', () => {
  it('classifies the real probe output as live', async () => {
    const r = await runFlywheelSanityProbe();
    const check = classifyFlywheelProbe(r);
    expect(check.verdict).toBe('live');
    expect(check.reason).toContain('3 promotion');
  });

  it('flags a flat lift curve (0 promotions) as suspicious-silent, not live', () => {
    const check = classifyFlywheelProbe({
      liftCurve: [0, 0, 0],
      promotions: 0,
      generationsRun: 3,
      replayVerifies: true,
    });
    expect(check.verdict).toBe('suspicious-silent');
    expect(check.reason).toContain('0 promotions');
  });

  it('flags a failed replay verification as blocked, even with nonzero promotions', () => {
    const check = classifyFlywheelProbe({
      liftCurve: [0, 0.5, 1],
      promotions: 2,
      generationsRun: 3,
      replayVerifies: false,
    });
    expect(check.verdict).toBe('blocked');
    expect(check.reason).toContain('verifyReplayBundle rejected');
  });
});
