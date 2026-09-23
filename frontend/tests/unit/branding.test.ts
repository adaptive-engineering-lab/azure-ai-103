import { describe, it, expect } from 'vitest';
import { BRANDING_DEFAULTS, resolveBranding } from '../../src/lib/branding';

describe('Branding resolution', () => {
  it('falls back to the committed defaults when nothing is set', () => {
    const b = resolveBranding({});
    expect(b.examCode).toBe(BRANDING_DEFAULTS.examCode);
    expect(b.certTitle).toBe(BRANDING_DEFAULTS.certTitle);
    expect(b.appName).toBe('AI-103 Study');
  });

  it('resolves with no argument at all', () => {
    expect(resolveBranding().examCode).toBe(BRANDING_DEFAULTS.examCode);
  });

  /**
   * The whole point of the fallbacks: an unset variable must render real
   * branding, not a blank title or a literal %VITE_EXAM_CODE%.
   */
  it('treats empty and whitespace-only values as unset', () => {
    expect(resolveBranding({ VITE_EXAM_CODE: '' }).examCode).toBe(BRANDING_DEFAULTS.examCode);
    expect(resolveBranding({ VITE_EXAM_CODE: '   ' }).examCode).toBe(BRANDING_DEFAULTS.examCode);
    expect(resolveBranding({ VITE_EXAM_CODE: undefined }).examCode).toBe(
      BRANDING_DEFAULTS.examCode,
    );
  });

  it('lets the environment override every field', () => {
    const b = resolveBranding({
      VITE_EXAM_CODE: 'AZ-900',
      VITE_EXAM_TITLE: 'Microsoft Azure Fundamentals',
      VITE_CERT_TITLE: 'Azure Fundamentals',
    });
    expect(b.examCode).toBe('AZ-900');
    expect(b.examTitle).toBe('Microsoft Azure Fundamentals');
    expect(b.certTitle).toBe('Azure Fundamentals');
  });

  it('derives the composed fields from the exam code', () => {
    const b = resolveBranding({ VITE_EXAM_CODE: 'AZ-900' });
    expect(b.appName).toBe('AZ-900 Study');
    expect(b.shortName).toBe('AZ-900');
    expect(b.description).toContain('AZ-900');
  });

  it('trims surrounding whitespace rather than baking it into the title', () => {
    expect(resolveBranding({ VITE_EXAM_CODE: '  AI-103  ' }).appName).toBe('AI-103 Study');
  });
});
