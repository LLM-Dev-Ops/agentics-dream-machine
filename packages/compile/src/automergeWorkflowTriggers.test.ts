import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkAutomergeTriggers } from './automergeWorkflowTriggers.js';

const workflowPath = fileURLToPath(new URL('../../../.github/workflows/automerge.yml', import.meta.url));

describe('automerge workflow trigger coverage', () => {
  it("the real checked-in workflow's trigger types include ready_for_review", () => {
    const yaml = readFileSync(workflowPath, 'utf8');
    const result = checkAutomergeTriggers(yaml);
    expect(result.missing).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.types).toContain('ready_for_review');
  });

  it('flags a workflow missing ready_for_review as not ok (regression guard)', () => {
    const stale = 'on:\n  pull_request_target:\n    types: [labeled, opened, synchronize, reopened]\n';
    const result = checkAutomergeTriggers(stale);
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(['ready_for_review']);
  });
});
