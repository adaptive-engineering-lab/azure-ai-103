/**
 * Answer-letter distribution analysis. AI103-Game-Spec.md §12, risk 4.
 *
 * The DP-700 bank inherited a heavy bias toward B from its source material —
 * B was correct in roughly half of it. It was never fixed, because fixing it
 * means shuffling the options *and* rewriting the letter references inside the
 * explanations ("B is correct because…"), which cannot be done safely by
 * pattern matching. By the time the skew was visible it was already baked in.
 *
 * So for AI-103 this is a first-pass authoring constraint rather than a
 * cleanup task, and this module is the rule that keeps it honest as the bank
 * grows. A learner who notices that B is usually right has been handed a way
 * to pass the drill without knowing the material, which defeats the product.
 *
 * The logic is pure and free of any database dependency so it can be unit
 * tested against synthetic distributions — including a DP-700-shaped skew —
 * without standing up a Supabase stack. The contract test feeds it real rows.
 */

export const LETTERS = ['A', 'B', 'C', 'D'] as const;
export type Letter = (typeof LETTERS)[number];

export interface Thresholds {
  /** Below this many four-option items, the four-option gate reports only. */
  minFourOption: number;
  /** Below this many true/false items, that gate reports only. */
  minTwoOption: number;
  /**
   * Uniform is 25%. Deliberately loose: this catches a systemic authoring
   * habit, not natural variation. DP-700's ~50% for B fails it comfortably.
   */
  maxShare: number;
  /** A letter that is almost never right is as exploitable as one that usually is. */
  minShare: number;
  /** True/false: 50/50 expected, with room for the source material to lean. */
  maxShareTwo: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  minFourOption: 40,
  minTwoOption: 30,
  maxShare: 0.4,
  minShare: 0.12,
  maxShareTwo: 0.65,
};

export interface AnalysableItem {
  content?: { options?: Record<string, unknown> | null; correct?: string | null } | null;
}

export type Counts = Record<Letter, number>;

export interface Pools {
  /** Items offering three or more options; expected uniform across A–D. */
  fourOption: AnalysableItem[];
  /** True/false items (A = True, B = False); expected 50/50. */
  twoOption: AnalysableItem[];
  /** Items with no usable options object — a data problem, not a distribution one. */
  unusable: AnalysableItem[];
}

/**
 * Split items by option count.
 *
 * Option count is variable by design: true/false items carry only A and B
 * rather than inventing two filler distractors (spec §6.1, §15.6). Counting
 * them in the four-option pool would manufacture an A/B skew that isn't real,
 * so they are kept separate and judged against 50/50.
 */
export function splitPools(items: AnalysableItem[]): Pools {
  const pools: Pools = { fourOption: [], twoOption: [], unusable: [] };
  for (const item of items) {
    const opts = item.content?.options;
    const n = opts ? Object.keys(opts).length : 0;
    if (n >= 3) pools.fourOption.push(item);
    else if (n === 2) pools.twoOption.push(item);
    else pools.unusable.push(item);
  }
  return pools;
}

export function tally(items: AnalysableItem[]): Counts {
  const counts: Counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const item of items) {
    const c = item.content?.correct;
    if (c && (LETTERS as readonly string[]).includes(c)) counts[c as Letter] += 1;
  }
  return counts;
}

/** Items whose `correct` is missing or outside A–D. A schema problem. */
export function itemsWithBadCorrect(items: AnalysableItem[]): AnalysableItem[] {
  return items.filter((i) => {
    const c = i.content?.correct;
    return !c || !(LETTERS as readonly string[]).includes(c);
  });
}

export interface Violation {
  pool: 'four-option' | 'true-false';
  letter: Letter;
  share: number;
  kind: 'over' | 'under';
  message: string;
}

/**
 * Evaluate both pools. Returns an empty array when the bank is within
 * tolerance *or* still below the sample size at which a gate switches on —
 * small banks swing wildly by chance, and a gate that sits red for weeks
 * teaches everyone to ignore it.
 */
export function findViolations(pools: Pools, t: Thresholds = DEFAULT_THRESHOLDS): Violation[] {
  const out: Violation[] = [];

  const four = pools.fourOption.length;
  if (four >= t.minFourOption) {
    const counts = tally(pools.fourOption);
    for (const letter of LETTERS) {
      const share = counts[letter] / four;
      if (share > t.maxShare) {
        out.push({
          pool: 'four-option',
          letter,
          share,
          kind: 'over',
          message:
            `"${letter}" is correct in ${pct(share)} of ${four} four-option items, over the ` +
            `${pct(t.maxShare)} ceiling. Fix it while authoring — the DP-700 bank proved this ` +
            `cannot be corrected afterwards, because explanations name the letter inline.`,
        });
      } else if (share < t.minShare) {
        out.push({
          pool: 'four-option',
          letter,
          share,
          kind: 'under',
          message:
            `"${letter}" is correct in only ${pct(share)} of ${four} four-option items, under ` +
            `the ${pct(t.minShare)} floor. A letter that is almost never right is as ` +
            `exploitable as one that usually is.`,
        });
      }
    }
  }

  const two = pools.twoOption.length;
  if (two >= t.minTwoOption) {
    const counts = tally(pools.twoOption);
    for (const letter of ['A', 'B'] as const) {
      const share = counts[letter] / two;
      if (share > t.maxShareTwo) {
        out.push({
          pool: 'true-false',
          letter,
          share,
          kind: 'over',
          message:
            `"${letter === 'A' ? 'True' : 'False'}" is the answer in ${pct(share)} of ${two} ` +
            `true/false items, over the ${pct(t.maxShareTwo)} ceiling. Balance the statements ` +
            `while authoring rather than letting learners guess the more common answer.`,
        });
      }
    }
  }

  return out;
}

function pct(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

/** Console table for the test output, so the shape is visible on every run. */
export function report(pools: Pools, t: Thresholds = DEFAULT_THRESHOLDS): string {
  const lines: string[] = [''];
  const rows = (counts: Counts, total: number, letters: readonly Letter[]) =>
    letters.map((l) => {
      const share = total === 0 ? 0 : counts[l] / total;
      return `    ${l}  ${String(counts[l]).padStart(4)}  ${pct(share).padStart(6)}  ${'#'.repeat(
        Math.round(share * 50),
      )}`;
    });

  lines.push(`  Four-option items (${pools.fourOption.length}) — uniform is 25% each`);
  lines.push(...rows(tally(pools.fourOption), pools.fourOption.length, LETTERS));
  lines.push('');
  lines.push(`  True/false items (${pools.twoOption.length}) — A = True, B = False, 50/50`);
  lines.push(...rows(tally(pools.twoOption), pools.twoOption.length, ['A', 'B']));
  lines.push('');
  if (pools.fourOption.length < t.minFourOption) {
    lines.push(
      `  Four-option gate inactive: ${pools.fourOption.length}/${t.minFourOption} items.`,
    );
  }
  if (pools.twoOption.length < t.minTwoOption) {
    lines.push(`  True/false gate inactive: ${pools.twoOption.length}/${t.minTwoOption} items.`);
  }
  if (pools.unusable.length > 0) {
    lines.push(`  ${pools.unusable.length} item(s) had no usable options object.`);
  }
  lines.push('');
  return lines.join('\n');
}
