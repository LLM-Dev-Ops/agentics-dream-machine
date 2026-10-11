/**
 * @dream-machine/compile — automerge workflow trigger-coverage check
 *
 * `.github/workflows/automerge.yml`'s guarded-merge job only re-evaluates
 * when one of its `pull_request_target` trigger types fires. A PR labeled
 * `automerge-safe` while still a draft gets one run that fails (`gh pr merge
 * --auto` rejects drafts); without `ready_for_review` in the trigger list,
 * converting that PR to ready-for-review never re-fires the job, and it is
 * stuck forever. Same "silently stops re-checking" bug class as ADR-0002,
 * applied to the merge guard's own liveness instead of a learning signal.
 */

const REQUIRED_TYPES = ['labeled', 'opened', 'synchronize', 'reopened', 'ready_for_review'] as const;

export interface AutomergeTriggerCheck {
  /** The trigger types found in the workflow's `on.pull_request_target.types` array. */
  types: string[];
  /** Required types absent from the array. */
  missing: string[];
  /** True when every required type is present. */
  ok: boolean;
}

/**
 * Parse the `on.pull_request_target.types` array out of the workflow's raw
 * YAML text (a small regex, not a full YAML parser — no YAML dependency
 * exists in this workspace for one assertion) and check it against the
 * types the guard needs to stay reachable across every draft/label/
 * ready-for-review ordering a human might use.
 */
export function checkAutomergeTriggers(workflowYaml: string): AutomergeTriggerCheck {
  const match = workflowYaml.match(/pull_request_target:\s*\n\s*types:\s*\[([^\]]*)\]/);
  const types = match
    ? match[1]
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const missing = REQUIRED_TYPES.filter((t) => !types.includes(t));
  return { types, missing, ok: missing.length === 0 };
}
