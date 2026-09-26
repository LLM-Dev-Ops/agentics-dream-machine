/**
 * Live GitHub merge-state lookup for the ledger's `zeroMergeStreak` signal.
 *
 * `@dream-machine/ledger`'s `learningSignals()` was always correct: given a
 * `mergedPrNumbers` set, it reports the streak accurately (unit-tested both
 * ways). But the CLI's `ledger signals` command never populated that option,
 * so `!merged` in the library's own short-circuit always evaluated true —
 * every night, `zeroMergeStreak` read `true` whenever the trailing window
 * contained any PR reference at all, regardless of whether those PRs had
 * actually merged. Confirmed 2026-09-26: PR #8 (this repo's most recent
 * dream-cycle candidate) merged 2026-09-08, yet `ledger signals` still
 * reported `zeroMergeStreak: true` — a false alarm the 2026-09-08 report had
 * already used, unknowingly, to justify picking a smaller candidate.
 *
 * This module supplies the missing ground truth via the GitHub REST API,
 * shelled out through the *existing* `io.exec` injection (the same one
 * `entrypoint.ts` uses for live process execution) rather than a raw
 * `fetch()`. That is not a style choice: `fetch()` was tried first and
 * empirically failed in this repo's own nightly sandbox — Node's built-in
 * fetch does not honor `HTTPS_PROXY` without `NODE_USE_ENV_PROXY=1` (Node
 * >=22.21; this repo declares `engines.node >= 18`), so it bypassed the
 * environment's egress proxy, reached GitHub directly, and got a real 401
 * for a placeholder credential the proxy would otherwise have substituted.
 * `curl` already respects `HTTPS_PROXY` correctly (verified live against
 * this repo's real PR #8/#9), so it is the portable choice: it works the
 * same way whether a token is a live secret (production) or proxy-injected
 * (this sandbox). The token is passed to curl via inherited shell
 * environment (`${GITHUB_TOKEN:-$GH_TOKEN}`), never interpolated into the
 * command string, so it never appears in a spawned argv/log line.
 *
 * Degrades to the previous "unknown" behavior — never a thrown error —
 * whenever there is no `io.exec`, no token, or every lookup fails.
 */

export interface ExecLike {
  (cmd: string): Promise<{ code: number; stdout: string; stderr: string }>;
}

export interface FetchMergedOptions {
  exec: ExecLike;
}

const SAFE_REPO = /^[\w.-]+\/[\w.-]+$/;

/**
 * Resolve which of `prNumbers` are actually merged, via GitHub's REST API.
 * Returns `null` ("unknown", never "confirmed zero") when there is no way to
 * check — malformed repo, no PR numbers, or every request fails outright —
 * so callers can distinguish "checked, none merged" from "didn't check".
 */
export async function fetchMergedPrNumbers(
  repo: string,
  prNumbers: readonly string[],
  opts: FetchMergedOptions,
): Promise<Set<string> | null> {
  const unique = [...new Set(prNumbers)].filter((n) => /^\d+$/.test(n));
  if (!SAFE_REPO.test(repo) || unique.length === 0) return null;

  const merged = new Set<string>();
  let anyRequestSucceeded = false;
  for (const n of unique) {
    const cmd =
      `curl -sS -o - -w '\\n%{http_code}' ` +
      `-H "Authorization: token \${GITHUB_TOKEN:-$GH_TOKEN}" -H "User-Agent: dream-machine-cli" ` +
      `"https://api.github.com/repos/${repo}/pulls/${n}"`;
    try {
      const r = await opts.exec(cmd);
      if (r.code !== 0) continue;
      const nl = r.stdout.lastIndexOf('\n');
      const status = Number(r.stdout.slice(nl + 1).trim());
      if (status !== 200) continue;
      anyRequestSucceeded = true;
      const body = JSON.parse(r.stdout.slice(0, nl)) as { merged?: boolean };
      if (body.merged) merged.add(n);
    } catch {
      // This PR's lookup failed (network blip, malformed response, ...); it is simply
      // not confirmed merged. Other PRs in the loop still get their own chance.
    }
  }
  return anyRequestSucceeded ? merged : null;
}
