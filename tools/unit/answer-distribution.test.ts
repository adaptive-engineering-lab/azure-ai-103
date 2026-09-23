import { describe, it, expect } from 'vitest';
import {
  DEFAULT_THRESHOLDS,
  findViolations,
  itemsWithBadCorrect,
  splitPools,
  tally,
  type AnalysableItem,
  type Letter,
} from '../seed/lib/answer-distribution.js';

/** n four-option items whose correct answer is `letter`. */
function four(letter: string, n: number): AnalysableItem[] {
  return Array.from({ length: n }, () => ({
    content: { options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correct: letter },
  }));
}

/** n true/false items whose correct answer is `letter` (A = True, B = False). */
function two(letter: string, n: number): AnalysableItem[] {
  return Array.from({ length: n }, () => ({
    content: { options: { A: 'True', B: 'False' }, correct: letter },
  }));
}

/** An even spread of `perLetter` items across A–D. */
function uniform(perLetter: number): AnalysableItem[] {
  return [...four('A', perLetter), ...four('B', perLetter), ...four('C', perLetter), ...four('D', perLetter)];
}

describe('splitPools', () => {
  it('keeps true/false items out of the four-option pool', () => {
    // The distinction is the whole point: counting two-option items as
    // four-option ones would manufacture an A/B skew that is not real.
    const pools = splitPools([...four('A', 3), ...two('A', 5)]);
    expect(pools.fourOption).toHaveLength(3);
    expect(pools.twoOption).toHaveLength(5);
    expect(pools.unusable).toHaveLength(0);
  });

  it('treats a three-option item as four-option rather than true/false', () => {
    const pools = splitPools([{ content: { options: { A: 'a', B: 'b', C: 'c' }, correct: 'C' } }]);
    expect(pools.fourOption).toHaveLength(1);
    expect(pools.twoOption).toHaveLength(0);
  });

  it('sets aside items with no usable options', () => {
    const pools = splitPools([
      { content: { options: null, correct: 'A' } },
      { content: { correct: 'A' } },
      {},
    ]);
    expect(pools.unusable).toHaveLength(3);
  });
});

describe('tally', () => {
  it('counts only letters in A–D', () => {
    const counts = tally([...four('A', 2), ...four('E', 3), ...four('B', 1)]);
    expect(counts).toEqual({ A: 2, B: 1, C: 0, D: 0 });
  });
});

describe('itemsWithBadCorrect', () => {
  it('flags missing and out-of-range letters', () => {
    expect(itemsWithBadCorrect([...four('A', 1), ...four('E', 2), { content: {} }])).toHaveLength(3);
  });
});

describe('findViolations — four-option pool', () => {
  it('passes a uniform bank', () => {
    expect(findViolations(splitPools(uniform(25)))).toEqual([]);
  });

  it('stays quiet below the sample size even when badly skewed', () => {
    // 39 items, all B. Real skew, but too small a sample to act on — a gate
    // that fires here would sit red for weeks and be ignored.
    const pools = splitPools(four('B', DEFAULT_THRESHOLDS.minFourOption - 1));
    expect(findViolations(pools)).toEqual([]);
  });

  it('fires the moment the sample size is reached', () => {
    const pools = splitPools(four('B', DEFAULT_THRESHOLDS.minFourOption));
    expect(findViolations(pools).length).toBeGreaterThan(0);
  });

  /**
   * The case this gate exists for: the DP-700 bank, where B was correct in
   * roughly half the items. It must fail loudly.
   */
  it('catches a DP-700-shaped B skew', () => {
    const pools = splitPools([...four('B', 50), ...four('A', 20), ...four('C', 20), ...four('D', 10)]);
    const v = findViolations(pools);
    const over = v.filter((x) => x.kind === 'over');
    expect(over).toHaveLength(1);
    expect(over[0]!.letter).toBe('B');
    expect(over[0]!.share).toBeCloseTo(0.5, 2);
    expect(over[0]!.message).toMatch(/cannot be corrected afterwards/);
  });

  it('catches a starved letter even when nothing dominates', () => {
    // A/B/C at 33% each is under the 40% ceiling, so only the floor catches
    // D being effectively never the answer.
    const pools = splitPools([...four('A', 33), ...four('B', 33), ...four('C', 33), ...four('D', 1)]);
    const v = findViolations(pools);
    expect(v.every((x) => x.kind === 'under')).toBe(true);
    expect(v.map((x) => x.letter)).toEqual(['D']);
  });

  it('reports a letter that is entirely absent', () => {
    const pools = splitPools([...four('A', 34), ...four('B', 33), ...four('C', 33)]);
    const under = findViolations(pools).filter((x) => x.kind === 'under');
    expect(under.map((x) => x.letter)).toContain('D' as Letter);
  });

  it('accepts the widest spread still inside both bounds', () => {
    // 40 / 16 / 12 / 12 over 100 — exactly at the ceiling and above the floor.
    const pools = splitPools([...four('A', 40), ...four('B', 36), ...four('C', 12), ...four('D', 12)]);
    expect(findViolations(pools)).toEqual([]);
  });
});

describe('findViolations — true/false pool', () => {
  it('passes an even split', () => {
    expect(findViolations(splitPools([...two('A', 20), ...two('B', 20)]))).toEqual([]);
  });

  it('stays quiet below its own sample size', () => {
    const pools = splitPools(two('A', DEFAULT_THRESHOLDS.minTwoOption - 1));
    expect(findViolations(pools)).toEqual([]);
  });

  it('catches a lopsided True bias', () => {
    const pools = splitPools([...two('A', 35), ...two('B', 5)]);
    const v = findViolations(pools);
    expect(v).toHaveLength(1);
    expect(v[0]!.pool).toBe('true-false');
    expect(v[0]!.message).toMatch(/"True" is the answer/);
  });

  it('tolerates a mild lean', () => {
    // 60/40 — the source material can reasonably lean this far.
    expect(findViolations(splitPools([...two('A', 24), ...two('B', 16)]))).toEqual([]);
  });

  it('judges the two pools independently', () => {
    // An all-A true/false set must not drag the uniform four-option pool down.
    const pools = splitPools([...uniform(25), ...two('A', 35), ...two('B', 5)]);
    const v = findViolations(pools);
    expect(v.every((x) => x.pool === 'true-false')).toBe(true);
  });
});
