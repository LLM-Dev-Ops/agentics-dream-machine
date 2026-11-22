import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Regression guard against this repo's own real `dream.config.json`.
 *
 * Reproduced 2026-11-22 (evaluation-adapters night, SCAN=darwin), live, against the
 * real `@metaharness/darwin` package: `npx @metaharness/darwin evolve --sandbox real`
 * — this repo's configured `darwin` evaluator entrypoint, exactly as it has read since
 * before this repo's first dream-cycle night — has no `<repo>` positional argument.
 * Darwin's CLI (`evolve <repo> [--generations N] ... [--sandbox real|mock|agent|...]`)
 * then consumes the literal token `--sandbox` as that missing `<repo>` argument, so it:
 *   (a) writes its run state into a bogus `./--sandbox/.metaharness/` directory in
 *       whatever cwd it's invoked from, instead of evaluating this repo at all, and
 *   (b) still exits 0 with real stdout, which `classifyEntrypointResult` correctly but
 *       unavoidably classifies `live` — a false positive, since nothing evaluated this
 *       repo's own source.
 * Confirmed by directly running both forms tonight (artifacts under `/tmp`, not
 * committed): the broken form writes to `./--sandbox/.metaharness`; adding `.` as the
 * repo argument writes to `./.metaharness` and evaluates this repo's own `npm test`
 * command as `--sandbox real` is documented to do.
 *
 * This test does not re-run darwin (that needs a real process + network and is already
 * covered, for the entrypoint-classification layer, by `entrypoint.test.ts`). It is a
 * pure, offline check that the configured command string itself cannot regress back
 * into the missing-positional-argument shape: the token immediately following `evolve`
 * must not be a flag.
 */
describe("dream.config.json's own darwin entrypoint", () => {
  it('passes a repo positional argument to `evolve`, not a bare flag', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const configPath = join(here, '..', '..', '..', 'dream.config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    const darwinCmd: string | undefined = config.evaluatorEntrypoints?.darwin;
    expect(darwinCmd).toBeTruthy();

    const afterEvolve = darwinCmd!.replace(/^.*\bevolve\b/, '').trim();
    const firstToken = afterEvolve.split(/\s+/)[0] ?? '';
    expect(firstToken.startsWith('--')).toBe(false);
  });
});
