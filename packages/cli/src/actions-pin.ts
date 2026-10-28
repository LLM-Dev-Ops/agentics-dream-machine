/**
 * GitHub Actions supply-chain pinning check.
 *
 * Reproduced 2026-10-28 (security-adversarial night, SCAN=supply-chain): all
 * six of this repo's workflow files (`.github/workflows/*.yml`) reference
 * third-party actions by mutable major-version tag (`@v4`, `@v3`, `@v5`)
 * rather than an immutable commit SHA. A tag is just a ref a maintainer (or
 * anyone who compromises that maintainer's account) can repoint at any time;
 * the next run then executes whatever is at the new commit with this
 * workflow's own permissions. Two of the six files hold real, repo-write
 * credentials (`automerge.yml`: contents:write + pull-requests:write — the
 * one workflow with unattended squash-merge authority; `dream-nightly.yml`:
 * contents:write + issues:write + pull-requests:write), so a repointed tag
 * there is not a hypothetical — it is this engine's own auto-merge/auto-push
 * authority handed to whoever controls the upstream tag at run time. This is
 * the exact failure class behind the real 2025 tj-actions/changed-files
 * compromise (a retargeted tag that shipped a credential-exfiltrating commit
 * to every consumer still pinned by version) and is GitHub's own first
 * hardening recommendation (`docs.github.com/actions/security-guides/
 * security-hardening-for-github-actions#using-third-party-actions`) and
 * OpenSSF Scorecard's `Pinned-Dependencies` check.
 */

// Tolerates an optional surrounding quote (`uses: 'actions/checkout@v4'`),
// which the unquoted version of this regex silently failed to match at all
// (independent critic review, 2026-10-28 — caught before this landed).
// Scope: GitHub Action `owner/repo[/path]@ref` references only. A Docker
// `uses: docker://image@sha256:<64-hex>` reference is a different, digest-
// pinned scheme this repo's workflows do not use today; out of scope rather
// than silently mishandled — see packages/cli/src/actions-pin.test.ts.
const USES_LINE = /^\s*(?:-\s*)?uses:\s*['"]?([^\s@'"]+)@([^\s'"]+)['"]?/;
const FULL_COMMIT_SHA = /^[0-9a-f]{40}$/;

export interface UnpinnedActionRef {
  /** 1-based line number within the scanned text. */
  line: number;
  /** The action/repo path, e.g. "actions/checkout" or "github/codeql-action/init". */
  action: string;
  /** The ref as written after `@`, e.g. "v4" — never a full commit SHA. */
  ref: string;
}

/**
 * Scan workflow YAML text for `uses: <action>@<ref>` lines whose `ref` is not
 * a full 40-character commit SHA. Pure — no I/O, no network, no clock.
 */
export function findUnpinnedActions(yaml: string): UnpinnedActionRef[] {
  const out: UnpinnedActionRef[] = [];
  const lines = yaml.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = USES_LINE.exec(lines[i]);
    if (!m) continue;
    const [, action, ref] = m;
    if (!FULL_COMMIT_SHA.test(ref)) {
      out.push({ line: i + 1, action, ref });
    }
  }
  return out;
}
