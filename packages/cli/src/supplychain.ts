/**
 * Supply-chain pin classification for evaluator-entrypoint commands.
 *
 * Flagged in the 2026-08-13 and 2026-09-08 security-adversarial Security
 * Review sections but never turned into a checkable primitive: this repo's
 * own `dream.config.json#evaluatorEntrypoints.darwin` is `npx
 * @metaharness/darwin evolve --sandbox real` — no version pin, no
 * `--no-install`/equivalent install guard. Run literally inside an
 * unattended nightly session, `npx` silently resolves and executes whatever
 * is currently published under that package name at that moment: the
 * package's npm account becomes part of this pipeline's trust boundary with
 * nothing to catch a compromised or typosquatted publish. This is that
 * checkable primitive, mirroring entrypoint.ts's classify-then-wire shape.
 *
 * Pin detection is a heuristic, not a full npm package-spec parser: dist-tags
 * (`@latest`, `@next`, …) and unreffed git/URL specs are deliberately treated
 * as unpinned (they are moving targets), and only the first non-flag token
 * after `npx` is inspected — a multi-package invocation like
 * `npx -p pkg1 -p pkg2 cmd` only assesses `pkg1`. Known limitation, not fixed
 * tonight: no `evaluatorEntrypoints` command in this repo uses `-p`.
 */

export type SupplyChainVerdict = 'not-applicable' | 'pinned' | 'guarded' | 'unpinned';

export interface SupplyChainCheck {
  verdict: SupplyChainVerdict;
  reason: string;
}

// git/URL specs (git+ssh://, git+https://, git://, github:, gitlab:,
// bitbucket:, the scp-like git@host:path shorthand, or a plain https:// tarball
// URL) pin via a `#<ref>` fragment, not '@' — an '@' before that point is
// commonly just embedded auth (git@github.com), not a version marker.
const GIT_OR_URL_SPEC = /^(git\+|git:|github:|gitlab:|bitbucket:|https?:\/\/|git@)/i;

// Dist-tags are mutable pointers, not pins — treating "package@latest" as
// pinned would defeat the point of this classifier (a moving target that
// silently resolves to something different on every run, same failure class
// as the unpinned case). Not exhaustive, but covers npm's common convention.
const MUTABLE_DIST_TAGS = new Set([
  'latest',
  'next',
  'beta',
  'alpha',
  'canary',
  'rc',
  'nightly',
  'dev',
  'experimental',
  'unstable',
]);

// A real semver version or range starts with a digit, optional leading 'v',
// or a range operator followed by one — "1.2.3", "^1.2.3", ">=1.0.0", "v2".
// A bare dist-tag/branch name (letters only) does not match.
const VERSION_LIKE = /^([~^]|>=?|<=?|=)?\s*v?\d/;

function isVersionPinned(pkgSpec: string): boolean {
  if (GIT_OR_URL_SPEC.test(pkgSpec)) {
    const hashIndex = pkgSpec.indexOf('#');
    return hashIndex !== -1 && hashIndex < pkgSpec.length - 1;
  }
  // Scoped packages (@scope/name) always start with '@' for the scope itself,
  // so the pin check must look past that leading '@' for a *later* one
  // (@scope/name@version) rather than mistaking the scope marker for a pin.
  const body = pkgSpec.startsWith('@') ? pkgSpec.slice(1) : pkgSpec;
  const atIndex = body.lastIndexOf('@');
  if (atIndex === -1) return false;
  const suffix = body.slice(atIndex + 1);
  if (MUTABLE_DIST_TAGS.has(suffix.toLowerCase())) return false;
  return VERSION_LIKE.test(suffix);
}

/**
 * Classify one evaluator-entrypoint command string for npx supply-chain
 * pinning. Pure — string parsing only; no I/O, no network, no execution.
 */
export function assessSupplyChainPin(cmd: string): SupplyChainCheck {
  const tokens = cmd.trim().split(/\s+/).filter(Boolean);
  const npxIndex = tokens.indexOf('npx');
  if (npxIndex === -1) {
    return { verdict: 'not-applicable', reason: 'not an npx invocation' };
  }
  const rest = tokens.slice(npxIndex + 1);
  const hasNoInstallGuard = rest.includes('--no-install');
  const pkgSpec = rest.find((t) => !t.startsWith('-'));
  if (!pkgSpec) {
    return { verdict: 'unpinned', reason: 'npx invocation with no discernible package argument' };
  }
  if (isVersionPinned(pkgSpec)) {
    return { verdict: 'pinned', reason: `package spec ${JSON.stringify(pkgSpec)} carries an explicit version pin` };
  }
  if (hasNoInstallGuard) {
    return {
      verdict: 'guarded',
      reason: `package spec ${JSON.stringify(pkgSpec)} has no version pin but --no-install prevents a silent network install`,
    };
  }
  return {
    verdict: 'unpinned',
    reason:
      `package spec ${JSON.stringify(pkgSpec)} has no version pin and no --no-install guard — ` +
      'an unattended run will silently install and execute whatever is currently published under this name',
  };
}

/**
 * Assess every configured evaluatorEntrypoints command (e.g. from
 * dream.config.json) for npx supply-chain pinning. Pure — no I/O.
 */
export function assessConfiguredSupplyChain(
  entrypoints: Record<string, string | undefined>,
): Array<SupplyChainCheck & { label: string; cmd: string }> {
  const results: Array<SupplyChainCheck & { label: string; cmd: string }> = [];
  for (const [label, cmd] of Object.entries(entrypoints)) {
    if (!cmd) continue;
    results.push({ label, cmd, ...assessSupplyChainPin(cmd) });
  }
  return results;
}
