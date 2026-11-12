import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  emptyLedger,
  parseLedger,
  appendRow,
  renderRow,
  verifyLedger,
  validateRow,
  learningSignals,
  verdictStats,
  escapeCell,
  LEDGER_COLUMNS,
  type LedgerRow,
} from './index.js';

const REAL_LEDGER_PATH = fileURLToPath(
  new URL('../../../docs/dream-cycle/LEDGER.md', import.meta.url),
);

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

  it('bounds parsing to the first table: a blank line ends the table, so trailing markdown (an archive/quarantine section, prose with a literal "|") is never swept in as rows', () => {
    const l =
      appendRow(emptyLedger(), row()) +
      '\n## Quarantined rows (foreign-repo contamination)\n\n' +
      '| 2099-01-01 | not-a-real-night | injected via drive-by PR | #999 | #999 | yes | ACCEPT | n/a | deadbeef | should never be parsed |\n';
    const { rows, warnings } = parseLedger(l);
    expect(rows).toHaveLength(1);
    expect(warnings).toEqual([]);
    expect(verifyLedger(l).rowCount).toBe(1);
  });

  it('the real repository ledger (docs/dream-cycle/LEDGER.md) verifies clean — regression canary against ledger contamination', () => {
    const md = readFileSync(REAL_LEDGER_PATH, 'utf8');
    const r = verifyLedger(md);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });
});

describe('validateRow', () => {
  it('accepts a well-formed row', () => {
    expect(validateRow(row())).toEqual([]);
  });

  it('flags an out-of-range verdict, evaluated, and date on the same row', () => {
    const errors = validateRow(row({ verdict: 'NOT_A_VERDICT', evaluated: 'maybe', date: 'yesterday' }));
    expect(errors).toHaveLength(3);
    expect(errors.join()).toMatch(/verdict/);
    expect(errors.join()).toMatch(/evaluated/);
    expect(errors.join()).toMatch(/date/);
  });

  it('agrees with verifyLedger on the same malformed row (shared validator, not a re-implementation)', () => {
    const bad = row({ verdict: 'MAYBE' });
    const fromValidateRow = validateRow(bad);
    const fromVerifyLedger = verifyLedger(appendRow(emptyLedger(), bad)).errors;
    expect(fromVerifyLedger).toEqual(fromValidateRow.map((e) => `row 1: ${e}`));
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
    expect(s.mergeDataAvailable).toBe(true);
  });

  it('reports merge data as unknown (not a false zero-merge positive) when mergedPrNumbers is omitted', () => {
    // Regression: previously `zeroMergeStreak` defaulted to `true` whenever no
    // merge data was supplied, indistinguishable from a real, confirmed streak —
    // exactly the state this repo's own CLI/TUI callers were in before tonight.
    let l = emptyLedger();
    for (let i = 0; i < 14; i++) l = appendRow(l, row({ pr: `#${100 + i}` }));
    const { rows } = parseLedger(l);
    const s = learningSignals(rows);
    expect(s.zeroMergeStreak).toBe(false);
    expect(s.mergeDataAvailable).toBe(false);
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

  it('nightsSinceLastRow is null when `today` is not supplied', () => {
    const { rows } = parseLedger(appendRow(emptyLedger(), row({ date: '2026-09-08' })));
    expect(learningSignals(rows).nightsSinceLastRow).toBeNull();
  });

  it('nightsSinceLastRow is null on an empty ledger even with `today`', () => {
    expect(learningSignals([], { today: '2026-09-11' }).nightsSinceLastRow).toBeNull();
  });

  it('nightsSinceLastRow is 0 when the last row is today', () => {
    const { rows } = parseLedger(appendRow(emptyLedger(), row({ date: '2026-09-11' })));
    expect(learningSignals(rows, { today: '2026-09-11' }).nightsSinceLastRow).toBe(0);
  });

  it('nightsSinceLastRow reports the real gap (this repo: 2026-09-08 -> 2026-09-11 is 3)', () => {
    const { rows } = parseLedger(appendRow(emptyLedger(), row({ date: '2026-09-08' })));
    expect(learningSignals(rows, { today: '2026-09-11' }).nightsSinceLastRow).toBe(3);
  });

  it('reports backlog data as unknown (not "not saturated") when openCandidateCount is omitted', () => {
    const { rows } = parseLedger(appendRow(emptyLedger(), row()));
    const s = learningSignals(rows);
    expect(s.backlogDataAvailable).toBe(false);
    expect(s.backlogSaturated).toBe(false);
  });

  it('flags backlog saturation once openCandidateCount reaches the threshold', () => {
    const { rows } = parseLedger(appendRow(emptyLedger(), row()));
    expect(learningSignals(rows, { openCandidateCount: 9 }).backlogSaturated).toBe(false);
    const saturated = learningSignals(rows, { openCandidateCount: 10 });
    expect(saturated.backlogDataAvailable).toBe(true);
    expect(saturated.backlogSaturated).toBe(true);
  });

  it('honors a custom backlogThreshold', () => {
    const { rows } = parseLedger(appendRow(emptyLedger(), row()));
    expect(learningSignals(rows, { openCandidateCount: 3, backlogThreshold: 3 }).backlogSaturated).toBe(true);
    expect(learningSignals(rows, { openCandidateCount: 2, backlogThreshold: 3 }).backlogSaturated).toBe(false);
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
