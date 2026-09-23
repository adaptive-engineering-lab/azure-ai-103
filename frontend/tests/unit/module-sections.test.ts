import { describe, it, expect } from 'vitest';
import { markPathSections } from '../../src/lib/questions/useModules';
import type { ModuleOption } from '../../src/lib/questions/useModules';

/** Minimal module in study order; only the fields the grouping reads. */
function mod(order: number, pathTitle?: string): ModuleOption {
  return { topic: `module-${order}`, domain: 'genai-agentic', count: 1, order, pathTitle };
}

/** The orders of the modules that would render a path heading. */
function headed(mods: ModuleOption[]): number[] {
  return markPathSections(mods)
    .filter((m) => m.startsPath)
    .map((m) => m.order!);
}

describe('markPathSections', () => {
  it('heads only the first module of a run', () => {
    expect(headed([mod(1, 'A'), mod(2, 'A'), mod(3, 'A')])).toEqual([1]);
  });

  it('heads each path when they follow one another', () => {
    expect(headed([mod(1, 'A'), mod(2, 'A'), mod(3, 'B'), mod(4, 'B')])).toEqual([1, 3]);
  });

  it('does not let a pathless module split a run in two', () => {
    // The reported bug: Copilot for warehouses belongs to no learning path but
    // is numbered inside the warehouse run, which drew the warehouse heading
    // twice — once at 17 and again at 21.
    const mods = [
      mod(17, 'Implement a data warehouse with Microsoft Fabric'),
      mod(18, 'Implement a data warehouse with Microsoft Fabric'),
      mod(19, 'Implement a data warehouse with Microsoft Fabric'),
      mod(20, undefined),
      mod(21, 'Implement a data warehouse with Microsoft Fabric'),
      mod(22, 'Implement a data warehouse with Microsoft Fabric'),
    ];
    expect(headed(mods)).toEqual([17]);
  });

  it('never heads a module that has no path', () => {
    const mods = markPathSections([mod(1, 'A'), mod(2, undefined), mod(3, 'A')]);
    expect(mods[1]!.startsPath).toBeFalsy();
  });

  it('re-heads a path that genuinely resumes after a different one', () => {
    expect(headed([mod(1, 'A'), mod(2, 'B'), mod(3, 'A')])).toEqual([1, 2, 3]);
  });

  it('handles a list with no paths at all', () => {
    expect(headed([mod(1), mod(2)])).toEqual([]);
  });
});
