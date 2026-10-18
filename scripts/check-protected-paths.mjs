#!/usr/bin/env node
// Single source of truth for the guarded auto-merge "protected path" policy
// (see .github/workflows/automerge.yml). Any PR touching a path this
// classifies as protected is human-review-only, full stop — no auto-merge.
//
// This replaced an inline bash/grep regex that had two confirmed gaps:
//   1. It only matched a dependency manifest exactly one directory below
//      `packages/` (or at the repo root), so a manifest nested deeper, or an
//      alternate lockfile (yarn/pnpm/bun/npm-shrinkwrap), was NOT protected.
//   2. Its safety/gate/threshold/promotion/scorer keyword match was
//      case-sensitive, so PascalCase filenames (e.g. `Gate.ts`,
//      `Threshold.ts`) — idiomatic for TypeScript class files — were NOT
//      protected even though they are exactly the category the policy names.

const DEPENDENCY_MANIFEST_NAMES = [
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
];

const DEPENDENCY_MANIFEST_RE = new RegExp(
  `(^|/)(${DEPENDENCY_MANIFEST_NAMES.map((n) => n.replace(/\./g, '\\.')).join('|')})$`,
  'i',
);

const WORKFLOW_PATH_RE = /^\.github\//i;
const SAFETY_KEYWORD_RE = /(safety|gate|threshold|promotion|scorer)/i;
const SECURITY_DOC_RE = /^SECURITY\.md$/i;

/** @param {string} path a repo-relative file path from a PR's changed-files list */
export function isProtectedPath(path) {
  return (
    WORKFLOW_PATH_RE.test(path) ||
    DEPENDENCY_MANIFEST_RE.test(path) ||
    SAFETY_KEYWORD_RE.test(path) ||
    SECURITY_DOC_RE.test(path)
  );
}

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const paths = Buffer.concat(chunks)
    .toString('utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const matched = paths.filter(isProtectedPath);
  if (matched.length > 0) {
    console.log('protected paths touched:');
    for (const m of matched) console.log(`  ${m}`);
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
