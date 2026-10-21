import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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
  protectedPathBlocked,
  AUTOMERGE_PROTECTED_PATH_REGEX,
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

describe('protectedPathBlocked', () => {
  it('matches the real, checked-in automerge.yml protected regex verbatim (regression canary)', () => {
    // Frozen baseline: if a future edit to automerge.yml changes the live regex
    // without updating AUTOMERGE_PROTECTED_PATH_REGEX, this fails instead of the
    // mirror silently drifting from the gate it claims to describe.
    const workflowPath = fileURLToPath(new URL('../../../.github/workflows/automerge.yml', import.meta.url));
    const workflow = readFileSync(workflowPath, 'utf8');
    const liveRegexLine = workflow.split('\n').find((l) => l.includes("protected='"));
    expect(liveRegexLine).toBeDefined();
    const live = liveRegexLine!.match(/protected='(.*)'/)?.[1];
    expect(live).toBe(AUTOMERGE_PROTECTED_PATH_REGEX.source.replace(/\\\//g, '/'));
  });

  it('flags files the live guard would block', () => {
    expect(protectedPathBlocked(['.github/workflows/ci.yml']).blocked).toBe(true);
    expect(protectedPathBlocked(['package.json']).blocked).toBe(true);
    expect(protectedPathBlocked(['package-lock.json']).blocked).toBe(true);
    expect(protectedPathBlocked(['packages/cli/package.json']).blocked).toBe(true);
    expect(protectedPathBlocked(['SECURITY.md']).blocked).toBe(true);
    expect(protectedPathBlocked(['src/promotion-gate.ts']).blocked).toBe(true);
    expect(protectedPathBlocked(['x/safety']).blocked).toBe(true);
  });

  it('does not flag ordinary source/doc/report changes', () => {
    const r = protectedPathBlocked([
      'packages/ledger/src/index.ts',
      'packages/ledger/src/index.test.ts',
      'docs/dream-cycle/2026-10-21-report.md',
      'docs/dream-cycle/LEDGER.md',
    ]);
    expect(r.blocked).toBe(false);
    expect(r.matches).toEqual([]);
  });

  it('reproduces the known, documented bypass gap (PR #83) — intentional, not a candidate bug', () => {
    // The live regex (mirrored here) is case-sensitive and misses a nested
    // manifest. This is the exact gap PR #83 (open, unmerged) proposes to close
    // in automerge.yml itself; this mirror intentionally matches today's live
    // behavior, including its known gap, until that fix lands.
    expect(protectedPathBlocked(['PACKAGE.JSON']).blocked).toBe(false);
    expect(protectedPathBlocked(['nested/dir/package.json']).blocked).toBe(false);
  });

  it('classifies the real changed-file lists of every currently-open dream-cycle PR that hit a protected path', () => {
    // Real data from tonight's `git diff --name-only origin/main...origin/<branch>`
    // against origin/main @ 2fba2550182d81b36423447221823e98e227482a.
    const real: Record<string, string[]> = {
      'dream/2026-09-21-ledger-signals': [
        '.github/workflows/ci.yml',
        'docs/adrs/ADR-0003-dream-cycle-ledger-signals-contamination-containment.md',
        'docs/adrs/INDEX.md',
        'docs/dream-cycle/2026-09-21-ledger-signals-report.md',
        'docs/dream-cycle/LEDGER.md',
        'packages/ledger/src/index.test.ts',
        'packages/ledger/src/index.ts',
        'scripts/dream-nightly.mjs',
      ],
      'dream/2026-10-11-ledger-signals': [
        '.github/workflows/automerge.yml',
        'docs/dream-cycle/2026-10-11-ledger-signals-report.md',
        'docs/dream-cycle/LEDGER.md',
        'packages/compile/src/automergeWorkflowTriggers.test.ts',
        'packages/compile/src/automergeWorkflowTriggers.ts',
      ],
      'dream/2026-10-13-security-adversarial': [
        'docs/dream-cycle/2026-10-13-security-adversarial-report.md',
        'docs/dream-cycle/LEDGER.md',
        'package-lock.json',
      ],
      'dream/2026-10-18-security-adversarial': [
        '.github/workflows/automerge.yml',
        'docs/dream-cycle/2026-10-18-security-adversarial-report.md',
        'docs/dream-cycle/LEDGER.md',
        'scripts/check-protected-paths.mjs',
        'scripts/check-protected-paths.test.mjs',
        'vitest.config.ts',
      ],
      // Clean, unprotected sample from the same real backlog.
      'dream/2026-10-20-compiler-parity': [
        'docs/dream-cycle/2026-10-20-compiler-parity-report.md',
        'docs/dream-cycle/LEDGER.md',
        'packages/compile/src/index.test.ts',
        'packages/compile/src/index.ts',
      ],
    };
    for (const [branch, files] of Object.entries(real)) {
      const expected = branch.endsWith('compiler-parity') ? false : true;
      expect(protectedPathBlocked(files).blocked, branch).toBe(expected);
    }
  });
});
