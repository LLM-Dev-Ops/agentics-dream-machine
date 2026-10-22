import { describe, it, expect } from 'vitest';
import {
  emptyLedger,
  parseLedger,
  appendRow,
  renderRow,
  verifyLedger,
  learningSignals,
  verdictStats,
  escapeCell,
  ciGateRecovery,
  LEDGER_COLUMNS,
  type LedgerRow,
  type WorkflowRunSummary,
} from './index.js';

function row(over: Partial<LedgerRow> = {}): LedgerRow {
  return {
    date: '2026-08-13',
    deep: 'security-adversarial',
    finding: 'add indirect prompt injection family',
    issue: '#180',
    pr: '#181',
    evaluated: 'yes',
    verdict: 'ACCEPT',
    effect: 'n=6',
    witness: '398c71a6',
    priorFates: 'first night',
    ...over,
  };
}

describe('ledger round-trip', () => {
  it('empty ledger has the 10-column header + divider', () => {
    const l = emptyLedger();
    expect(l).toContain('| Date |');
    expect(l).toContain('Prior-night fates');
    expect(LEDGER_COLUMNS).toHaveLength(10);
    expect(parseLedger(l).rows).toHaveLength(0);
  });

  it('append then parse recovers the row', () => {
    const l = appendRow(emptyLedger(), row());
    const { rows, warnings } = parseLedger(l);
    expect(warnings).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].verdict).toBe('ACCEPT');
    expect(rows[0].finding).toBe('add indirect prompt injection family');
  });

  it('append adds EXACTLY one row and keeps the schema (property)', () => {
    let l = emptyLedger();
    for (let i = 0; i < 25; i++) {
      const before = parseLedger(l).rows.length;
      l = appendRow(l, row({ date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}` }));
      const after = parseLedger(l).rows.length;
      expect(after).toBe(before + 1);
    }
    expect(parseLedger(l).rows).toHaveLength(25);
    // Header still intact and unique.
    expect((l.match(/\| Date \|/g) ?? []).length).toBe(1);
  });

  it('appends to a ledger that had no trailing newline', () => {
    const l = appendRow('| Date | Deep | Finding | Issue | PR | Evaluated? | Verdict | Effect | Witness | Prior-night fates |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |', row());
    expect(parseLedger(l).rows).toHaveLength(1);
  });

  it('bootstraps a header when appending to empty string', () => {
    const l = appendRow('', row());
    expect(l).toContain('| Date |');
    expect(parseLedger(l).rows).toHaveLength(1);
  });
});

describe('cell escaping', () => {
  it('escapes pipes and newlines so a row cannot break the table', () => {
    const l = appendRow(emptyLedger(), row({ finding: 'a | b\nc' }));
    expect(parseLedger(l).rows).toHaveLength(1);
    expect(renderRow(row({ finding: 'a | b' }))).toContain('a \\| b');
    expect(escapeCell('x\ny')).toBe('x y');
  });
});

describe('verifyLedger', () => {
  it('accepts a valid ledger', () => {
    const l = appendRow(appendRow(emptyLedger(), row()), row({ date: '2026-08-14', verdict: 'REJECT' }));
    const r = verifyLedger(l);
    expect(r.ok).toBe(true);
    expect(r.rowCount).toBe(2);
  });

  it('flags an out-of-range verdict', () => {
    const l = appendRow(emptyLedger(), row({ verdict: 'MAYBE' }));
    const r = verifyLedger(l);
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/verdict/);
  });

  it('flags a bad date and bad evaluated value', () => {
    const l = appendRow(emptyLedger(), row({ date: 'yesterday', evaluated: 'perhaps' }));
    const r = verifyLedger(l);
    expect(r.errors.join()).toMatch(/date/);
    expect(r.errors.join()).toMatch(/evaluated/);
  });

  it('flags a missing header', () => {
    const r = verifyLedger('just some text, no table');
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/header/);
  });
});

describe('learning signals', () => {
  it('detects a zero-merge streak when no PR is known-merged', () => {
    let l = emptyLedger();
    for (let i = 0; i < 14; i++) l = appendRow(l, row({ pr: `#${100 + i}`, verdict: 'INCONCLUSIVE' }));
    const { rows } = parseLedger(l);
    const s = learningSignals(rows, { mergedPrNumbers: new Set() });
    expect(s.zeroMergeStreak).toBe(true);
  });

  it('clears the zero-merge streak when a PR merged', () => {
    let l = emptyLedger();
    for (let i = 0; i < 14; i++) l = appendRow(l, row({ pr: `#${100 + i}` }));
    const { rows } = parseLedger(l);
    const s = learningSignals(rows, { mergedPrNumbers: new Set(['105']) });
    expect(s.zeroMergeStreak).toBe(false);
  });

  it('detects duplicate directions repeated >= 3 times', () => {
    let l = emptyLedger();
    for (let i = 0; i < 3; i++) l = appendRow(l, row({ finding: 'improve router calibration loop' }));
    l = appendRow(l, row({ finding: 'totally different thing here' }));
    const { rows } = parseLedger(l);
    const s = learningSignals(rows);
    expect(s.duplicateDirections.some((d) => d.includes('router'))).toBe(true);
  });

  it('detects a low-score streak (last 3 < 5)', () => {
    const { rows } = parseLedger(appendRow(emptyLedger(), row()));
    expect(learningSignals(rows, { recentScores: [7, 4, 3, 2] }).lowScoreStreak).toBe(true);
    expect(learningSignals(rows, { recentScores: [7, 4, 6] }).lowScoreStreak).toBe(false);
  });

  it('detects a blocked-eval streak', () => {
    let l = emptyLedger();
    for (let i = 0; i < 5; i++) l = appendRow(l, row({ evaluated: 'blocked', verdict: 'INCONCLUSIVE' }));
    const { rows } = parseLedger(l);
    expect(learningSignals(rows).blockedEvalStreak).toBe(true);
  });
});

describe('ciGateRecovery', () => {
  // Real `codeql.yml` run history for LLM-Dev-Ops/agentics-dream-machine,
  // fetched live tonight (2026-10-22) via mcp__github__actions_list — run
  // numbers 84-89 all `failure` (configuration error: "Code Security must be
  // enabled for this repository to use code scanning"), 90-93 all `success`,
  // with zero changes to codeql.yml across the transition. See
  // docs/dream-cycle/2026-10-22-security-adversarial-report.md.
  const realRuns: WorkflowRunSummary[] = [
    { runNumber: 84, conclusion: 'failure' },
    { runNumber: 85, conclusion: 'failure' },
    { runNumber: 86, conclusion: 'failure' },
    { runNumber: 87, conclusion: 'failure' },
    { runNumber: 88, conclusion: 'failure' },
    { runNumber: 89, conclusion: 'failure' },
    { runNumber: 90, conclusion: 'success' },
    { runNumber: 91, conclusion: 'success' },
    { runNumber: 92, conclusion: 'success' },
    { runNumber: 93, conclusion: 'success' },
  ];

  it('detects the real 2026-10-19 -> 2026-10-20 CodeQL recovery', () => {
    const r = ciGateRecovery(realRuns);
    expect(r.recovered).toBe(true);
    expect(r.priorRedStreak).toBe(6);
    expect(r.recoveredAtRunNumber).toBe(90);
    expect(r.currentGreenStreak).toBe(4);
  });

  it('is order-independent (sorts by runNumber itself)', () => {
    const shuffled = [...realRuns].reverse();
    expect(ciGateRecovery(shuffled)).toEqual(ciGateRecovery(realRuns));
  });

  it('reports not-recovered while the gate is still red', () => {
    const r = ciGateRecovery(realRuns.slice(0, 6)); // only the failing prefix
    expect(r.recovered).toBe(false);
    expect(r.priorRedStreak).toBe(0);
    expect(r.recoveredAtRunNumber).toBeUndefined();
    expect(r.currentGreenStreak).toBe(0);
  });

  it('does not claim a recovery when the whole window is already green', () => {
    const allGreen: WorkflowRunSummary[] = [
      { runNumber: 1, conclusion: 'success' },
      { runNumber: 2, conclusion: 'success' },
    ];
    const r = ciGateRecovery(allGreen);
    expect(r.recovered).toBe(false);
    expect(r.currentGreenStreak).toBe(2);
  });

  it('treats non-success conclusions (cancelled, timed_out, null) as red', () => {
    const r = ciGateRecovery([
      { runNumber: 1, conclusion: 'cancelled' },
      { runNumber: 2, conclusion: null },
      { runNumber: 3, conclusion: 'success' },
    ]);
    expect(r.recovered).toBe(true);
    expect(r.priorRedStreak).toBe(2);
    expect(r.recoveredAtRunNumber).toBe(3);
  });
});

describe('verdictStats', () => {
  it('counts verdicts', () => {
    let l = emptyLedger();
    l = appendRow(l, row({ verdict: 'ACCEPT' }));
    l = appendRow(l, row({ verdict: 'REJECT' }));
    l = appendRow(l, row({ verdict: 'INCONCLUSIVE' }));
    l = appendRow(l, row({ verdict: 'INCONCLUSIVE' }));
    const s = verdictStats(parseLedger(l).rows);
    expect(s).toEqual({ ACCEPT: 1, REJECT: 1, INCONCLUSIVE: 2, other: 0 });
  });
});
