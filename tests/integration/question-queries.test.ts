import { describe, it, expect } from 'vitest';
import { anonClient } from '../../tools/test-helpers/clients.js';

describe('Question queries — anonymous, filtered reads (T011 / FR-013, US1 acceptance)', () => {
  const client = anonClient();

  it('Scenario 1: plan-manage returns items with complete metadata', async () => {
    const { data, error } = await client
      .from('questions')
      .select('id, type, domain, topic, difficulty, source, content')
      .eq('domain', 'plan-manage');
    expect(error).toBeNull();
    const rows = data ?? [];
    expect(rows.length).toBeGreaterThan(0);
    // Types present depend on what has been authored. Assert the envelope is
    // complete for whatever is there; per-type coverage is reported by
    // tests/contract/domain-coverage.test.ts rather than gated here.
    const types = new Set(rows.map((r) => r.type));
    expect(types.size, 'domain has at least one item type').toBeGreaterThanOrEqual(1);
    for (const t of types) expect(['mcq', 'code-review']).toContain(t);
    for (const row of rows) {
      expect(row.id, 'id present').toBeTruthy();
      expect(row.topic, 'topic present').toBeTruthy();
      expect(row.difficulty, 'difficulty present').toBeGreaterThanOrEqual(1);
      expect(row.source, 'source present').toMatch(/^(bank|ai-generated)$/);
      expect(row.content, 'content payload present').toBeTruthy();
    }
  });

  it('Scenario 2: fetching by id returns a complete type-specific payload', async () => {
    const { data: anyRow } = await client.from('questions').select('id, type').limit(1).single();
    expect(anyRow).toBeTruthy();
    const { data: row, error } = await client
      .from('questions')
      .select('*')
      .eq('id', anyRow!.id)
      .single();
    expect(error).toBeNull();
    expect(row!.content).toBeTruthy();
    if (row!.type === 'mcq') {
      const c = row!.content as Record<string, unknown>;
      expect(c.question).toBeTruthy();
      expect(c.options).toBeTruthy();
      expect(c.correct).toMatch(/^[A-D]$/);
      expect(c.explanation).toBeTruthy();
    } else if (row!.type === 'code-review') {
      const c = row!.content as Record<string, unknown>;
      expect(c.sub_mode).toBeTruthy();
      expect(c.language).toBeTruthy();
      expect(c.snippet).toBeTruthy();
      expect(c.prompt).toBeTruthy();
      expect(c.options).toBeTruthy();
      expect(c.correct).toMatch(/^[A-D]$/);
      expect(c.explanation).toBeTruthy();
    }
  });

  it('Scenario 3: every item carries a domain and type the app understands', async () => {
    const { data } = await client.from('questions').select('domain, type');
    const rows = (data ?? []) as Array<{ domain: string; type: string }>;
    expect(rows.length).toBeGreaterThan(0);
    const domains = ['plan-manage', 'genai-agentic', 'computer-vision'];
    const types = ['mcq', 'code-review'];
    for (const r of rows) {
      expect(domains, `unknown domain ${r.domain}`).toContain(r.domain);
      expect(types, `unknown type ${r.type}`).toContain(r.type);
    }
  });

  it('filters by domain + type + difficulty', async () => {
    const { data, error } = await client
      .from('questions')
      .select('id, type, domain, difficulty')
      .eq('domain', 'plan-manage')
      .eq('type', 'mcq')
      .eq('difficulty', 2);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    for (const row of data ?? []) {
      expect(row.domain).toBe('plan-manage');
      expect(row.type).toBe('mcq');
      expect(row.difficulty).toBe(2);
    }
  });

  it('filters by topic', async () => {
    // Topics are Microsoft Learn module titles and change as content is
    // authored, so take one from the bank rather than hardcoding it.
    const { data: sample } = await client.from('questions').select('topic').limit(1).single();
    const topic = sample!.topic as string;
    const { data, error } = await client.from('questions').select('id, topic').eq('topic', topic);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    for (const row of data ?? []) expect(row.topic).toBe(topic);
  });
});
