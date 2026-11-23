/**
 * Pre-freeze GitHub issue/PR overlap classification.
 *
 * `packages/compile`'s `step2Evidence()` (PR #143, 2026-11-18, closing recommendation
 * #3 from issue #132) only *instructs* a future night to check for direction-overlap
 * before freezing a hypothesis — it stayed prompt-text-only, deliberately deferring
 * "automate the check, don't just instruct it" as a separate, larger candidate (issue
 * #142's recommendation #1). This is that candidate: a pure classifier a CLI command
 * can run against whatever issue/PR list the caller already fetched (via `gh api`, an
 * MCP tool, etc.) — no HTTP client lives in this package, so the new surface stays an
 * offline, unit-testable function, not a new network/credential code path.
 */

export interface OverlapItem {
  number: number;
  title: string;
  body?: string;
}

export interface OverlapMatch {
  number: number;
  title: string;
  score: number; // fraction of candidateKeywords matched, 0..1
  matchedKeywords: string[];
}

export interface OverlapCheck {
  verdict: 'overlap' | 'clear';
  matches: OverlapMatch[]; // sorted desc by score, then asc by number; score >= threshold only
}

function escapeForRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Classify whether a candidate's keywords overlap with prior issues/PRs.
 * Pure — no I/O. A keyword "matches" an item when it occurs as a whole word
 * (case-insensitive) in that item's title or body. `threshold` is the minimum
 * fraction of candidateKeywords that must match for an item to be reported.
 */
export function classifyOverlap(candidateKeywords: string[], items: OverlapItem[], threshold = 0.5): OverlapCheck {
  const keywords = [...new Set(candidateKeywords.map((k) => k.trim()).filter((k) => k.length > 0))];
  if (keywords.length === 0 || items.length === 0) {
    return { verdict: 'clear', matches: [] };
  }
  // \b only asserts a transition between a \w and a non-\w character, so it's a no-op
  // (silently never matches) on a keyword edge that is itself non-word — e.g. the leading
  // "@" in "@metaharness/darwin" — because both sides of that position are non-word. Only
  // apply \b on edges that are themselves word characters, so word-boundary protection
  // (no "pin" match inside "pineapple") still applies where it can, without silently
  // dropping keywords whose first/last character isn't [A-Za-z0-9_].
  const patterns = keywords.map((k) => {
    const left = /^\w/.test(k) ? '\\b' : '';
    const right = /\w$/.test(k) ? '\\b' : '';
    return { k, re: new RegExp(`${left}${escapeForRegExp(k)}${right}`, 'i') };
  });

  const matches: OverlapMatch[] = [];
  for (const item of items) {
    const text = `${item.title}\n${item.body ?? ''}`;
    const matchedKeywords = patterns.filter(({ re }) => re.test(text)).map(({ k }) => k);
    const score = matchedKeywords.length / keywords.length;
    if (score >= threshold) {
      matches.push({ number: item.number, title: item.title, score, matchedKeywords });
    }
  }
  matches.sort((a, b) => b.score - a.score || a.number - b.number);
  return { verdict: matches.length > 0 ? 'overlap' : 'clear', matches };
}
