import { describe, it, expect } from 'vitest';
import { validateItem } from '../../src/lib/admin/validators';

describe('Admin item validation (feature 013, FR-007)', () => {
  it('accepts a two-option true/false mcq', () => {
    const result = validateItem('mcq', {
      id: '00000000-0000-4000-8000-000000000001',
      type: 'mcq',
      domain: 'genai-agentic',
      topic: 'foundry-sdk',
      difficulty: 1,
      source: 'bank',
      content: {
        question: 'True or false? A Foundry project scopes model deployments and connections.',
        options: { A: 'True', B: 'False' },
        correct: 'A',
        explanation: 'It does.',
      },
    });
    expect(result.valid).toBe(true);
  });

  it('rejects an MCQ missing the explanation field', () => {
    const result = validateItem('mcq', {
      id: '00000000-0000-4000-8000-000000000002',
      type: 'mcq',
      domain: 'plan-manage',
      topic: 'prepare-azure-ai-development',
      difficulty: 2,
      source: 'bank',
      content: {
        question: 'q',
        options: { A: 'a', B: 'b', C: 'c', D: 'd' },
        correct: 'A',
        // explanation intentionally missing
      },
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => /explanation/.test(e.reason))).toBe(true);
    }
  });

  it('rejects an item with an unknown domain', () => {
    const result = validateItem('code-review', {
      id: '00000000-0000-4000-8000-000000000003',
      type: 'code-review',
      domain: 'not-a-domain',
      topic: 't',
      difficulty: 1,
      source: 'bank',
      content: {
        sub_mode: 'find-the-bug',
        language: 'python',
        snippet: 'x',
        prompt: 'y',
        options: { A: 'a', B: 'b', C: 'c', D: 'd' },
        correct: 'A',
        explanation: 'z',
      },
    });
    expect(result.valid).toBe(false);
  });

  it('requires the correct letter for MCQ to be A/B/C/D', () => {
    const result = validateItem('mcq', {
      id: '00000000-0000-4000-8000-000000000004',
      type: 'mcq',
      domain: 'genai-agentic',
      topic: 't',
      difficulty: 1,
      source: 'bank',
      content: {
        question: 'q',
        options: { A: 'a', B: 'b', C: 'c', D: 'd' },
        correct: 'E',
        explanation: 'x',
      },
    });
    expect(result.valid).toBe(false);
  });
});
