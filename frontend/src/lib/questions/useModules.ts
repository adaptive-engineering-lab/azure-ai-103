import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { LEARNING_PATHS, primaryLearningPathId } from './types';
import type { Domain, Question } from './types';

export interface ModuleOption {
  /** The Microsoft Learn module title — stored as the item's `topic`. */
  topic: string;
  domain: Domain;
  count: number;
  /**
   * Study order, from the leading number on the source markdown filename
   * (`3-AI-103_Foundry-SDK_Quiz.md` → 3). Undefined when the file was not
   * numbered.
   */
  order?: number;
  /**
   * The learning path this module is filed under — the one it was studied in,
   * which is also what makes `order` consecutive within a group. Modules
   * belong to several paths; this is the single one worth showing.
   */
  pathTitle?: string;
  /** True on the module that opens a path's run, i.e. the one to head. */
  startsPath?: boolean;
}

/**
 * Flag the module that opens each learning path's run, in study order.
 *
 * Modules with no path at all — standalone ones like Copilot for warehouses,
 * which Learn files under no path — are skipped rather than treated as a
 * break. They sit inside another path's numbering, and comparing only against
 * the immediately preceding module made one of them split its neighbours into
 * two runs, so the same path heading was drawn twice.
 *
 * Mutates and returns the list it is given; callers pass a freshly sorted one.
 */
export function markPathSections(sorted: ModuleOption[]): ModuleOption[] {
  let lastPath: string | undefined;
  for (const m of sorted) {
    if (!m.pathTitle) continue;
    m.startsPath = m.pathTitle !== lastPath;
    lastPath = m.pathTitle;
  }
  return sorted;
}

/** Read `order:<n>` out of an item's tags. */
function readOrder(tags: string[] | null): number | undefined {
  const tag = tags?.find((t) => t.startsWith('order:'));
  if (!tag) return undefined;
  const n = Number(tag.slice('order:'.length));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * The modules that actually have items of a given type, with counts.
 *
 * Derived from the bank rather than from a fixed list, so a module appears in
 * the picker the moment its first question is seeded and disappears if the
 * last one is removed. Tallied client-side — Postgres `distinct` is not
 * expressible through PostgREST's REST surface, and the payload is two short
 * columns over a bank in the low hundreds.
 */
export function useModules(type: Question['type']) {
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase()
      .from('questions')
      .select('topic, domain, tags')
      .eq('type', type)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
          setModules([]);
        } else {
          const tally = new Map<string, ModuleOption>();
          for (const row of (data ?? []) as { topic: string; domain: Domain; tags: string[] | null }[]) {
            const hit = tally.get(row.topic);
            if (hit) {
              hit.count += 1;
              continue;
            }
            const pathId = primaryLearningPathId(row.tags ?? undefined);
            tally.set(row.topic, {
              topic: row.topic,
              domain: row.domain,
              count: 1,
              order: readOrder(row.tags),
              pathTitle: pathId ? LEARNING_PATHS[pathId] : undefined,
            });
          }
          // Study order first; unnumbered modules fall to the end, alphabetical.
          setModules(
            markPathSections(
              [...tally.values()].sort(
                (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.topic.localeCompare(b.topic),
              ),
            ),
          );
          setError(null);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type]);

  return { modules, loading, error };
}
