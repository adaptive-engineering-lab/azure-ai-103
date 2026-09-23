import { describe, it, expect, beforeAll } from 'vitest';
import { anonClient } from '../../tools/test-helpers/clients.js';
import {
  findViolations,
  itemsWithBadCorrect,
  report,
  splitPools,
  type AnalysableItem,
  type Pools,
} from '../../tools/seed/lib/answer-distribution.js';

/**
 * AI103-Game-Spec.md §12, risk 4 — applied to the seeded bank.
 *
 * The rule itself lives in tools/seed/lib/answer-distribution.ts and is unit
 * tested against synthetic distributions in tools/unit/, including a
 * DP-700-shaped B skew. This file only wires it to real rows, so a failure
 * here is always about the content, never about the arithmetic.
 *
 * Both gates stay quiet below a minimum sample size — small banks swing
 * wildly by chance, and a gate that sits red for weeks teaches everyone to
 * ignore the file, which is the same reasoning domain-coverage.test.ts
 * documents for its per-type coverage.
 */
describe('Answer-letter distribution (spec §12, risk 4)', () => {
  let pools: Pools;

  beforeAll(async () => {
    const { data, error } = await anonClient().from('questions').select('content');
    expect(error).toBeNull();
    pools = splitPools((data ?? []) as AnalysableItem[]);
    console.log(report(pools));
  });

  it('every item declares a correct letter in A–D', () => {
    const bad = itemsWithBadCorrect([...pools.fourOption, ...pools.twoOption]);
    expect(bad.length, `${bad.length} item(s) have a missing or out-of-range "correct"`).toBe(0);
  });

  it('every item carries a usable options object', () => {
    expect(
      pools.unusable.length,
      `${pools.unusable.length} item(s) have no options object — a schema problem, not a ` +
        `distribution one`,
    ).toBe(0);
  });

  it('answer letters are not skewed', () => {
    const violations = findViolations(pools);
    expect(violations.map((v) => v.message).join('\n'), 'answer-letter distribution').toEqual('');
  });
});
