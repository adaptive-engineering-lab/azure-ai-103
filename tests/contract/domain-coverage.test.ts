import { describe, it, expect, beforeAll } from 'vitest';
import { anonClient } from '../../tools/test-helpers/clients.js';

const DOMAINS = [
  'plan-manage',
  'genai-agentic',
  'computer-vision',
  'text-analysis',
  'info-extraction',
] as const;

const TYPES = ['mcq', 'code-review'] as const;

/**
 * T010 / SC-002 / FR-006.
 *
 * The gate is per *domain*: a domain with no questions at all is a hole a
 * learner will walk into — the quiz picker offers it and the progress radar
 * plots an axis for it. That fails the build.
 *
 * Per *type* coverage is reported, not asserted. Code-review items have to be
 * hand-authored with real snippets and the practice-quiz markdown cannot
 * produce them, so a hard gate there would sit red for weeks and teach
 * everyone to ignore this file. The table keeps the gap in view on every run
 * instead.
 */
describe('Domain coverage (T010 / SC-002 / FR-006)', () => {
  let rows: Array<{ domain: string; type: string }>;

  beforeAll(async () => {
    const { data, error } = await anonClient().from('questions').select('domain, type');
    expect(error).toBeNull();
    rows = (data ?? []) as Array<{ domain: string; type: string }>;

    const width = Math.max(...DOMAINS.map((d) => d.length));
    const header = `    ${'domain'.padEnd(width)} ${TYPES.map((t) => t.padStart(12)).join('')}      total`;
    const lines = DOMAINS.map((d) => {
      const cells = TYPES.map(
        (t) => String(rows.filter((r) => r.domain === d && r.type === t).length).padStart(12),
      ).join('');
      const total = rows.filter((r) => r.domain === d).length;
      return `    ${d.padEnd(width)}${cells} ${String(total).padStart(10)}`;
    });
    console.log(['', '  Bank coverage', header, ...lines, ''].join('\n'));

    const gaps = DOMAINS.flatMap((d) =>
      TYPES.filter((t) => rows.filter((r) => r.domain === d && r.type === t).length === 0).map(
        (t) => `${d} × ${t}`,
      ),
    );
    if (gaps.length > 0) {
      console.log(`  ${gaps.length} empty (domain × type) cell(s): ${gaps.join(', ')}\n`);
    }
  });

  it('seeds at least 50 questions', () => {
    expect(rows.length).toBeGreaterThanOrEqual(50);
  });

  for (const domain of DOMAINS) {
    it(`has at least one question in ${domain}`, () => {
      const matches = rows.filter((r) => r.domain === domain);
      expect(
        matches.length,
        `domain "${domain}" has no questions at all — it is offered in the quiz picker and ` +
          `plotted on the progress radar, so it must not be empty`,
      ).toBeGreaterThanOrEqual(1);
    });
  }
});
