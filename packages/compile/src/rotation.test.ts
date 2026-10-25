import { describe, it, expect } from 'vitest';
import { compile, type DreamConfig } from './index.js';

const sample: DreamConfig = {
  repo: 'acme/widget',
  cron: '0 9 * * *',
  slots: [
    { deep: 'a', scan: ['x', 'y'] },
    { deep: 'b', scan: ['x', 'y'] },
    { deep: 'c', scan: ['x', 'y'] },
    { deep: 'd', scan: ['x', 'y'] },
    { deep: 'e', scan: ['x', 'y'] },
  ],
  bonusModuli: { '25': 'bonus-surface' },
};
const prompt = compile(sample);

/** Pins the production template itself: fails immediately if STEP 0 ever reverts to keying SLOT/bonus off DAYINT. */
function extractRotationVariable(compiled: string): string {
  const m = compiled.match(/SLOT=\$\(\(\s*(\w+)\s*%\s*\d+\s*\)\)/);
  if (!m) throw new Error('compiled prompt has no SLOT=$(( VAR % N )) line to extract');
  return m[1];
}
function extractBonusVariable(compiled: string): string {
  const m = compiled.match(/(\w+) % \d+ == 0 {2}→ add/);
  if (!m) throw new Error('compiled prompt has no "VAR % N == 0" bonus line to extract');
  return m[1];
}

describe('production template: SLOT/bonus must key off a monotonic counter, not DAYINT', () => {
  it('compile() emits EPOCHDAY (not DAYINT) as the SLOT rotation variable', () => {
    expect(extractRotationVariable(prompt)).toBe('EPOCHDAY');
  });

  it('compile() emits EPOCHDAY (not DAYINT) as the bonus-trigger variable', () => {
    expect(extractBonusVariable(prompt)).toBe('EPOCHDAY');
  });

  it('compile() still defines EPOCHDAY as days-since-epoch via date -u +%s / 86400', () => {
    expect(prompt).toContain('EPOCHDAY=$(( $(date -u +%s) / 86400 ))');
  });
});

/**
 * compiler-parity finding, 2026-10-25: STEP 0's rotation formula was
 * `SLOT=$(( DAYINT % N ))` with `DAYINT=$(date -u +%Y%m%d)` (YYYYMMDD as an
 * integer). Since 100 ≡ 0 (mod 5), `DAYINT % 5 ≡ (day-of-month) % 5` for
 * every month/year — the "rotation" silently collapsed to day-of-month
 * arithmetic. At every 31-day-month boundary this repeats the previous
 * night's slot (e.g. 2026-10-31 and 2026-11-01 both landed on slot 1); at
 * the Feb→Mar boundary it skips a slot entirely. Same defect for the
 * `bonusModuli` triggers (`DAYINT % 25`, `DAYINT % 75`): both always land on
 * the 25th of the month (every month, every quarter) rather than
 * approximating a sparse "bonus" cadence. These helpers reproduce the bash
 * arithmetic in both the old (`dayint`) and new (`epochDay`) forms so the
 * regression is pinned without any shell/exec dependency.
 */
function dayint(d: Date): number {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return y * 10000 + m * 100 + day;
}

function epochDay(d: Date): number {
  return Math.floor(d.getTime() / 86_400_000);
}

function consecutiveUtcDays(startIso: string, count: number): Date[] {
  const start = new Date(`${startIso}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => new Date(start.getTime() + i * 86_400_000));
}

describe('rotation fidelity: EPOCHDAY vs. the old DAYINT formula', () => {
  const days = consecutiveUtcDays('2026-01-01', 420); // spans every month length at least once
  const slotCount = 5;

  it('OLD formula (day-of-month % 5) repeats or skips a slot at month boundaries', () => {
    const slots = days.map((d) => dayint(d) % slotCount);
    let repeats = 0;
    let skips = 0;
    for (let i = 1; i < slots.length; i++) {
      const expected = (slots[i - 1] + 1) % slotCount;
      if (slots[i] === slots[i - 1]) repeats++;
      else if (slots[i] !== expected) skips++;
    }
    // Reproduces the exact, named near-term case flagged in tonight's report.
    const oct31 = days.find((d) => d.toISOString().startsWith('2026-10-31'))!;
    const nov1 = days.find((d) => d.toISOString().startsWith('2026-11-01'))!;
    expect(dayint(oct31) % slotCount).toBe(dayint(nov1) % slotCount);
    expect(repeats).toBeGreaterThan(0);
    expect(skips).toBeGreaterThan(0);
  });

  it('NEW formula (days-since-epoch % 5) is a true round-robin: every night advances exactly one slot', () => {
    const slots = days.map((d) => epochDay(d) % slotCount);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i]).toBe((slots[i - 1] + 1) % slotCount);
    }
  });

  it('OLD bonus trigger (DAYINT % 25) fires on literally every 25th-of-month, not a sparse bonus', () => {
    const hits = days.filter((d) => dayint(d) % 25 === 0);
    expect(hits.length).toBeGreaterThanOrEqual(13); // ~one per month across 420 days
    for (const d of hits) expect(d.getUTCDate()).toBe(25);
  });

  it('NEW bonus trigger (EPOCHDAY % 25) is not pinned to a single calendar day-of-month', () => {
    const hits = days.filter((d) => epochDay(d) % 25 === 0);
    const datesOfMonth = new Set(hits.map((d) => d.getUTCDate()));
    expect(datesOfMonth.size).toBeGreaterThan(1);
  });
});
