/**
 * Every user-facing mention of the exam resolves from here.
 *
 * Before this module the exam name was a literal in nine places — the page
 * title and meta description, the PWA manifest, the home hero, the install
 * prompt, the countdown widget, the Pro page, and both legal pages. The
 * `VITE_EXAM_*` variables in .env.example claimed to drive the titles and
 * meta tags but were read by nothing, so re-skinning meant a grep.
 *
 * The resolver is deliberately pure and takes its environment as an argument,
 * because it has two callers in two runtimes: the browser bundle, which reads
 * `import.meta.env`, and vite.config.ts, which runs in Node and reads
 * `loadEnv()`. Sharing the function is what keeps the manifest, the HTML head
 * and the React tree from drifting apart.
 *
 * Every field falls back to a committed default. A missing or empty variable
 * therefore renders correct AI-103 branding rather than a blank title or a
 * literal `%VITE_EXAM_CODE%` in the tab — which is what Vite's native HTML
 * env substitution would leave behind.
 *
 * Note that the localStorage namespace is NOT derived from any of this. It is
 * a storage contract, not branding: deriving it would mean that editing the
 * exam name silently orphaned every existing user's progress. See
 * lib/storage/namespace.ts.
 */

export interface Branding {
  /** Exam code alone, e.g. for the countdown widget's eyebrow. */
  examCode: string;
  /** Official exam title, as Microsoft writes it. */
  examTitle: string;
  /** Official certification title, without the "Microsoft Certified:" prefix. */
  certTitle: string;
  /** Product name: what the app calls itself. */
  appName: string;
  /** PWA manifest short_name. Home screens truncate past ~12 characters. */
  shortName: string;
  /** Meta description and PWA manifest description. */
  description: string;
}

export const BRANDING_DEFAULTS = {
  examCode: 'AI-103',
  examTitle: 'Developing AI Apps and Agents on Azure',
  certTitle: 'Azure AI Apps and Agents Developer Associate',
} as const;

/** Treat an unset or whitespace-only variable as absent. */
function pick(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function resolveBranding(env: Record<string, string | undefined> = {}): Branding {
  const examCode = pick(env.VITE_EXAM_CODE, BRANDING_DEFAULTS.examCode);
  const examTitle = pick(env.VITE_EXAM_TITLE, BRANDING_DEFAULTS.examTitle);
  const certTitle = pick(env.VITE_CERT_TITLE, BRANDING_DEFAULTS.certTitle);
  return {
    examCode,
    examTitle,
    certTitle,
    appName: `${examCode} Study`,
    shortName: examCode,
    description: `Mobile-first ${examCode} exam prep — quizzes and code-review drills.`,
  };
}

/**
 * `import.meta.env` is replaced statically by Vite in the client build and is
 * undefined when this module is pulled into the Node-side config, so the
 * guard keeps one import working in both places.
 */
const clientEnv: Record<string, string | undefined> =
  typeof import.meta === 'undefined' || !import.meta.env ? {} : import.meta.env;

export const BRANDING = resolveBranding(clientEnv);
