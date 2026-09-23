import { describe, it, expect } from 'vitest';
import { pickRandom } from '../../src/lib/questions/pick';
import type { McqQuestion } from '../../src/lib/questions/types';

function mkMcq(id: string, difficulty: 1 | 2 | 3 = 1): McqQuestion {
  return {
    id,
    type: 'mcq',
    domain: 'genai-agentic',
    topic: 'Use Apache Spark in Microsoft Fabric',
    difficulty,
    content: {
      question: 'q?',
      options: { A: 'a', B: 'b', C: 'c', D: 'd' },
      correct: 'A',
      explanation: 'because.',
    },
  };
}

// Deterministic RNG so ordering assertions are stable.
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const pool = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => mkMcq(id));

describe('pickRandom', () => {
  it('returns exactly `count` items when the pool is large enough', () => {
    expect(pickRandom(pool, 4, seededRng(1))).toHaveLength(4);
  });

  it('returns the whole pool when it is smaller than `count`', () => {
    const out = pickRandom(pool.slice(0, 2), 10, seededRng(1));
    expect(out).toHaveLength(2);
  });

  it('returns an empty array for an empty pool', () => {
    expect(pickRandom([], 5, seededRng(1))).toEqual([]);
  });

  it('never repeats an item within one pick', () => {
    const ids = pickRandom(pool, 6, seededRng(7)).map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('varies the order across seeds', () => {
    const a = pickRandom(pool, 6, seededRng(1)).map((q) => q.id);
    const b = pickRandom(pool, 6, seededRng(42)).map((q) => q.id);
    expect(a).not.toEqual(b);
  });

  it('ignores difficulty — a level-3 item is as likely as any other', () => {
    // Difficulty is inferred by the importer, not stated by the source, so
    // selection must not weight by it.
    const mixed = [mkMcq('easy', 1), mkMcq('hard', 3)];
    const picked = pickRandom(mixed, 2, seededRng(3)).map((q) => q.id).sort();
    expect(picked).toEqual(['easy', 'hard']);
  });

  it('does not mutate the pool', () => {
    const before = pool.map((q) => q.id);
    pickRandom(pool, 3, seededRng(9));
    expect(pool.map((q) => q.id)).toEqual(before);
  });
});
