import { describe, it, expect, vi } from 'vitest';
import { fetchMergedPrNumbers, type ExecLike } from './merged-prs.js';

/** A fake `io.exec` shaped like curl's `-w '\n%{http_code}'` output: body, then a
 * trailing newline + status code, exactly what the real curl invocation produces. */
function fakeExec(merged: Record<string, boolean>, opts: { fail?: string[]; crash?: boolean } = {}): ExecLike {
  return vi.fn(async (cmd: string) => {
    if (opts.crash) throw new Error('spawn failed');
    const n = cmd.match(/\/pulls\/(\d+)"/)?.[1] ?? '';
    if (opts.fail?.includes(n)) return { code: 1, stdout: '', stderr: 'curl: (7) Failed to connect' };
    if (!(n in merged)) return { code: 0, stdout: `{"message":"Not Found"}\n404`, stderr: '' };
    return { code: 0, stdout: `${JSON.stringify({ merged: merged[n] })}\n200`, stderr: '' };
  });
}

describe('fetchMergedPrNumbers', () => {
  it('returns null (unknown) for a malformed repo (never shells out)', async () => {
    const exec = fakeExec({ '8': true });
    const r = await fetchMergedPrNumbers('not-a-repo', ['8'], { exec });
    expect(r).toBeNull();
    expect(exec).not.toHaveBeenCalled();
  });

  it('returns null (unknown) when there are no PR numbers to check', async () => {
    const exec = fakeExec({});
    const r = await fetchMergedPrNumbers('o/r', [], { exec });
    expect(r).toBeNull();
  });

  it('returns the set of merged PR numbers, ground-truthed against a curl-shaped exec result', async () => {
    const exec = fakeExec({ '8': true, '9': true, '7': false });
    const r = await fetchMergedPrNumbers('o/r', ['7', '8', '9'], { exec });
    expect(r).toEqual(new Set(['8', '9']));
  });

  it('dedupes repeated PR numbers into a single exec call', async () => {
    const exec = fakeExec({ '8': true });
    await fetchMergedPrNumbers('o/r', ['8', '8', '8'], { exec });
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it('never interpolates the token into the shell command', async () => {
    const exec = fakeExec({ '8': true });
    await fetchMergedPrNumbers('o/r', ['8'], { exec });
    const cmd = (exec as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(cmd).toContain('${GITHUB_TOKEN:-$GH_TOKEN}');
  });

  it('treats one PR failing to look up as "not confirmed merged", not overall unknown', async () => {
    const exec = fakeExec({ '8': true, '9': true }, { fail: ['9'] });
    const r = await fetchMergedPrNumbers('o/r', ['8', '9'], { exec });
    expect(r).toEqual(new Set(['8']));
  });

  it('returns null (unknown) when every request fails outright', async () => {
    const exec = fakeExec({}, { crash: true });
    const r = await fetchMergedPrNumbers('o/r', ['8'], { exec });
    expect(r).toBeNull();
  });

  it('ignores a non-digit PR reference rather than shelling out with it', async () => {
    const exec = fakeExec({ '8': true });
    const r = await fetchMergedPrNumbers('o/r', ['LOCAL', '8'], { exec });
    expect(r).toEqual(new Set(['8']));
    expect(exec).toHaveBeenCalledTimes(1);
  });
});
