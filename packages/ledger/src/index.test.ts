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
  LEDGER_COLUMNS,
  type LedgerRow,
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

  it('surfaceStreak is null below the default threshold of 3', () => {
    let l = emptyLedger();
    l = appendRow(l, row({ deep: 'ledger-signals', finding: 'a' }));
    l = appendRow(l, row({ deep: 'ledger-signals', finding: 'b' }));
    const { rows } = parseLedger(l);
    expect(learningSignals(rows).surfaceStreak).toBeNull();
  });

  it('surfaceStreak fires at exactly the threshold and counts the full trailing run', () => {
    let l = emptyLedger();
    l = appendRow(l, row({ deep: 'compiler-parity', finding: 'unrelated earlier night' }));
    for (let i = 0; i < 4; i++) l = appendRow(l, row({ deep: 'ledger-signals', finding: `distinct wording ${i}` }));
    const { rows } = parseLedger(l);
    expect(learningSignals(rows).surfaceStreak).toEqual({ deep: 'ledger-signals', count: 4 });
  });

  it('surfaceStreak only counts the trailing run — an interruption resets it', () => {
    let l = emptyLedger();
    for (let i = 0; i < 5; i++) l = appendRow(l, row({ deep: 'ledger-signals' }));
    l = appendRow(l, row({ deep: 'security-adversarial' }));
    l = appendRow(l, row({ deep: 'developer-experience' }));
    const { rows } = parseLedger(l);
    expect(learningSignals(rows).surfaceStreak).toBeNull();
  });

  it('surfaceStreak threshold is configurable via SignalOptions', () => {
    let l = emptyLedger();
    for (let i = 0; i < 2; i++) l = appendRow(l, row({ deep: 'ledger-signals' }));
    const { rows } = parseLedger(l);
    expect(learningSignals(rows, { surfaceStreakThreshold: 2 }).surfaceStreak).toEqual({
      deep: 'ledger-signals',
      count: 2,
    });
  });

  it('REAL DATA: duplicateDirections misses this repo\'s own 7-night ledger-signals history, surfaceStreak catches it', () => {
    // The real `finding` text of every issue/PR on LLM-Dev-Ops/agentics-dream-machine
    // explicitly tagged "ledger-signals:" in its title, read live from GitHub
    // tonight (2026-10-26), in order: #15/16, #32/33, #42/43 (then a real
    // 2026-10-01 self-rotation away from this surface, per this same STEP 1.1
    // rule, on issue/PR #52/53 — not reproduced here since it is a different
    // `deep` value), then #58/59, #68/69, #78/79, #88/89. Each finding is
    // worded differently enough that no 6-word-normalized prefix repeats
    // >= 3x, so duplicateDirections (finding-text based) stays empty across
    // the whole sequence — even though the same `deep` surface repeats 7x.
    const realNights: Array<{ deep: string; finding: string }> = [
      { deep: 'ledger-signals', finding: "main's LEDGER.md is 3 nights stale behind open PRs #12/#14" },
      { deep: 'ledger-signals', finding: 'contamination traced, quarantined, CI gate added' },
      {
        deep: 'ledger-signals',
        finding: '17 open PRs / 0 merged in 18 days reconfirmed; STEP 1.1 signals blind to unmerged backlog (self-demonstrated)',
      },
      { deep: 'ledger-signals', finding: 'backlogSaturated signal (issue #42 rec #5, plumbing only)' },
      { deep: 'ledger-signals', finding: 'automerge guard never re-fires on ready_for_review (stuck-forever gap)' },
      {
        deep: 'ledger-signals',
        finding: 'real git-merge conflicts confirmed between PR #12/#16/#58 + conflictRisks() tool',
      },
      {
        deep: 'ledger-signals',
        finding: 'real git merge-tree audit of all 40 open dream-cycle PRs: 36/40 (90%) eligible + merge-readiness CLI',
      },
    ];
    let l = emptyLedger();
    for (const n of realNights) l = appendRow(l, row(n));
    const { rows } = parseLedger(l);
    const s = learningSignals(rows);
    expect(s.duplicateDirections).toEqual([]); // the existing, unmodified signal: blind to this.
    expect(s.surfaceStreak).toEqual({ deep: 'ledger-signals', count: realNights.length }); // the new one: not blind.
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
