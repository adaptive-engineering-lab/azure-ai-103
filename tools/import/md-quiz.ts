/**
 * Import practice-quiz markdown from bank/knowledge/ into the seed bank.
 *
 * Source format (one file per Microsoft Learn module):
 *
 *   # AI-103 Quiz — Module <n>: <module title>
 *
 *   **Source:** <learn.microsoft.com/training/modules/<slug>/ URL>
 *   **Units covered:** <unit> | <unit>
 *   **Domain:** <exam domain> (<weight>) — <optional sub-skill qualifier>
 *
 *   ## Section A — Multiple Choice
 *   **A1.** <question>
 *   A. <option>
 *   B. <option>
 *   C. <option>
 *   D. <option>
 *
 *   ## Section B — True / False
 *   **B1.** <statement>
 *
 *   ## Section C — Scenario Questions
 *   (same shape as Section A)
 *
 *   # Answer Key
 *   ### Section A
 *   **A1 — B.** <rationale, dismissing the other options as "(A)", "(C)", "(D)">
 *   ### Section B
 *   **B1 — False.** <rationale>
 *
 *   ## Score Guide
 *   (prose, ignored)
 *
 * Questions are keyed by their section-qualified label ("A1", "B1", "C1"), not
 * by a bare number: all three coexist in one file and a bare number would
 * collide. Section letters come from the label itself, so a question filed
 * under the wrong heading still lands in the right section.
 *
 * Every section becomes an `mcq` item. Section B's true/false statements use a
 * two-option MCQ (A = True, B = False) — the mcq schema requires only A and B,
 * so no filler distractors have to be invented.
 *
 * IDs are UUIDv5 over "<file stem>#<label>", so re-running the import is
 * idempotent — the same question keeps the same id and the seed CLI's
 * cross-bank duplicate check stays happy. Renaming a file *does* change its
 * ids, and rebalancing which letter is correct does *not*.
 *
 * Study order and the canonical module title come from exams.config.json, not
 * from the file name, so the taxonomy has one source of truth.
 *
 * Usage:
 *   pnpm -C tools import:md               # write the seed file
 *   pnpm -C tools import:md -- --dry-run  # report only, write nothing
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(TOOLS_DIR, '..');
const KNOWLEDGE_DIR = resolve(REPO_ROOT, 'bank', 'knowledge');
const CONTENT_DIR = resolve(REPO_ROOT, 'supabase', 'seed', 'content');

type Domain =
  | 'plan-manage'
  | 'genai-agentic'
  | 'computer-vision'
  | 'text-analysis'
  | 'info-extraction';

const DEFAULT_DOMAIN: Domain = 'genai-agentic';

/**
 * Prose domain names as written in the quiz headers. Matched in order, so the
 * more specific pattern must come first: "Implement generative AI and agentic
 * solutions" would also satisfy a naive /implement/ test.
 */
const DOMAIN_PROSE: ReadonlyArray<[RegExp, Domain]> = [
  [/plan and manage/i, 'plan-manage'],
  [/generative ai and agentic/i, 'genai-agentic'],
  [/computer vision/i, 'computer-vision'],
  [/text analysis/i, 'text-analysis'],
  [/information extraction/i, 'info-extraction'],
];

/**
 * Microsoft Learn modules, keyed by the slug in their `**Source:**` URL.
 *
 * `topic` becomes the module title, so the bank is grouped the way a learner
 * actually studies — by module — rather than by exam-objective phrasing.
 *
 * A module usually belongs to several learning paths, so `paths` lists them
 * all (they become tags) and `primaryPath` is the one it is filed under in the
 * UI. The primary is the path the module was *studied* in — the one that
 * explains its `order:` number — so that grouping the picker by path
 * reproduces the sequence the quiz files were written in. Modules 1-4 were
 * worked through as lp3 and 5-11 as lp2, which is why the eventhouse module
 * is filed under lp3 rather than the more obvious lp4, and the introduction
 * under lp2 rather than lp1. Path ids match exams.config.json → learningPaths.
 */
interface ModuleInfo {
  title: string;
  /** Study order within the exam, 1-30, straight from exams.config.json. */
  order?: number;
  paths: string[];
  /**
   * Omitted for a module that belongs to no path in exams.config.json — it is
   * still worth registering for its canonical title, but it carries no path
   * tag, and the picker renders it without a path label.
   */
  primaryPath?: string;
}

/**
 * Microsoft Learn modules, read from exams.config.json → modules rather than
 * duplicated here. The config is the single source of truth for taxonomy
 * (AI103-Game-Spec.md §5.2), so porting to another exam means editing the
 * config, not this file.
 *
 * Each AI-103 module belongs to exactly one of the four course learning paths,
 * so `paths` and `primaryPath` coincide. The shape keeps both because the
 * importer's tag output distinguishes them, and a future exam may again have
 * modules shared across paths.
 */
const MODULES: Record<string, ModuleInfo> = loadModules();

function loadModules(): Record<string, ModuleInfo> {
  const configPath = resolve(REPO_ROOT, 'exams.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
    exams: Array<{
      modules?: Array<{ slug: string; title: string; pathId?: string; order?: number }>;
    }>;
  };
  const modules = config.exams[0]?.modules ?? [];
  if (modules.length === 0) {
    warn(`${configPath}: no "modules" array; every quiz will fall back to its own heading for a topic`);
  }
  const out: Record<string, ModuleInfo> = {};
  for (const m of modules) {
    out[m.slug] = {
      title: m.title,
      ...(m.order !== undefined ? { order: m.order } : {}),
      paths: m.pathId ? [m.pathId] : [],
      ...(m.pathId ? { primaryPath: m.pathId } : {}),
    };
  }
  return out;
}

/** Pull the module slug out of a learn.microsoft.com/training/modules/<slug>/ URL. */
function moduleSlugFromUrl(url: string | undefined): string | undefined {
  return url?.match(/\/training\/modules\/([^/?#]+)/)?.[1];
}

/** Section A recalls facts, Section C reasons about a scenario. */
const DIFFICULTY_BY_SECTION: Record<Section, 1 | 2 | 3> = { A: 1, B: 1, C: 2 };

const LIMITS = {
  mcqQuestion: 600,
  mcqOption: 240,
  explanation: 1200,
} as const;

type Section = 'A' | 'B' | 'C';

/**
 * The answer key is written as an h1 in the source files, so it is not matched
 * by a `## ` pattern. Shared by the question and answer parsers, which must
 * agree on exactly where the questions stop.
 */
const ANSWER_KEY_HEADING = /^#{1,2}\s+Answer Key.*$/m;

interface ParsedQuestion {
  /** Section-qualified question label as written in the file: "A1", "B3", "C2". */
  label: string;
  section: Section;
  prompt: string;
  options?: Record<'A' | 'B' | 'C' | 'D', string>;
}

interface ParsedAnswer {
  label: string;
  /** 'A'–'D' for multiple choice, 'True'/'False' for section B. */
  verdict: string;
  explanation: string;
}

interface BankItem {
  id: string;
  type: 'mcq';
  domain: Domain;
  topic: string;
  difficulty: 1 | 2 | 3;
  source: 'bank';
  tags: string[];
  content: Record<string, unknown>;
}

const warnings: string[] = [];
const warn = (msg: string): void => {
  warnings.push(msg);
};

/** RFC 4122 §4.3 name-based UUIDv5 (SHA-1), so ids are stable across runs. */
function uuidv5(name: string, namespace: string): string {
  const nsBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1').update(nsBytes).update(Buffer.from(name, 'utf8')).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Fixed namespace for this bank — arbitrary but must never change. */
const NS = '6f9619ff-8b86-d011-b42d-00c04fc964ff';

/** Strip the markdown the schemas forbid, leaving readable plain text. */
function plain(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.+?)\]\((.+?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function capped(value: string, limit: number, label: string): string {
  if (value.length <= limit) return value;
  warn(`${label}: ${value.length} chars exceeds ${limit}; truncated at a word boundary`);
  const cut = value.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function parseDomain(body: string, file: string): Domain {
  const prose = body.match(/^\*\*Domain:\*\*\s*(.+)$/m)?.[1];
  if (!prose) {
    warn(`${file}: no "**Domain:**" header line; defaulted to ${DEFAULT_DOMAIN}`);
    return DEFAULT_DOMAIN;
  }
  // A header may qualify the domain with the sub-skill it sits under, after an
  // em-dash ("Plan and manage… — Implement responsible AI across generative AI
  // and agentic systems"). Only the part before the dash is the exam domain;
  // matching the whole line would let the qualifier win.
  const primary = prose.split(/\s[—–]\s/)[0]!;
  for (const [re, domain] of DOMAIN_PROSE) if (re.test(primary)) return domain;
  warn(`${file}: unrecognised domain "${plain(primary)}"; defaulted to ${DEFAULT_DOMAIN}`);
  return DEFAULT_DOMAIN;
}

function parseQuestions(body: string, file: string): ParsedQuestion[] {
  const out: ParsedQuestion[] = [];
  // Everything before the answer key is question material. Slicing here rather
  // than per-section means the last question of a section cannot run on into
  // the next heading or into the key.
  const region = body.slice(0, body.match(ANSWER_KEY_HEADING)?.index ?? body.length);

  // A question runs from its "**A1.**" marker to the next marker or heading.
  // `$(?![\s\S])` is end-of-input; plain `$` would match every line end under
  // /m, and JS has no \Z.
  const qRe = /^\*\*([ABC])(\d+)\.\*\*\s*([\s\S]*?)(?=^\*\*[ABC]\d+\.\*\*|^#{1,3}\s|$(?![\s\S]))/gm;
  for (const m of region.matchAll(qRe)) {
    // The label carries its own section, so it is the section of record — a
    // stray "**B3.**" under the Section A heading files itself correctly.
    const section = m[1] as Section;
    const label = `${m[1]}${m[2]}`;
    const raw = m[3]!.trim();

    if (section === 'B') {
      out.push({ label, section, prompt: plain(raw) });
      continue;
    }

    const optRe = /^([A-D])\.\s+(.+)$/gm;
    const options = {} as Record<'A' | 'B' | 'C' | 'D', string>;
    let promptEnd = raw.length;
    for (const o of raw.matchAll(optRe)) {
      if (o.index! < promptEnd) promptEnd = o.index!;
      options[o[1] as 'A'] = plain(o[2]!);
    }
    const missing = (['A', 'B', 'C', 'D'] as const).filter((k) => !options[k]);
    if (missing.length > 0) {
      warn(`${file} ${label}: missing option(s) ${missing.join(', ')}; skipped`);
      continue;
    }
    out.push({ label, section, prompt: plain(raw.slice(0, promptEnd)), options });
  }
  return out;
}

function parseAnswers(body: string, file: string): Map<string, ParsedAnswer> {
  const map = new Map<string, ParsedAnswer>();
  const keyStart = body.match(ANSWER_KEY_HEADING);
  if (!keyStart) {
    warn(`${file}: no "Answer Key" heading; every question in this file is unanswerable`);
    return map;
  }
  let chunk = body.slice(keyStart.index! + keyStart[0].length);
  // The score-guide table below the key is prose, not answers.
  const scoreGuide = chunk.match(/^##\s+Score Guide/m);
  if (scoreGuide) chunk = chunk.slice(0, scoreGuide.index);

  // Two shapes:
  //   **A1 — B.** rationale
  //   **B1 — False.** rationale
  // The lookahead stops at the next entry, at a "### Section X" sub-heading, or
  // at a rule — without the heading case the last rationale of each section
  // would swallow the heading that follows it.
  const re =
    /^\*\*([ABC]\d+)\s*[—–-]\s*(?:([A-D])|(True|False))\.\*\*\s*([\s\S]*?)(?=^\*\*[ABC]\d+\s|^#{1,3}\s|^---|$(?![\s\S]))/gm;
  for (const m of chunk.matchAll(re)) {
    const label = m[1]!;
    const verdict = (m[2] ?? m[3])!;
    map.set(label, { label, verdict, explanation: plain(m[4] ?? '') });
  }
  return map;
}

function buildItems(file: string, body: string): BankItem[] {
  const stem = file.replace(/\.md$/, '');
  const domain = parseDomain(body, file);
  const headingTitle = plain(body.match(/^#\s+(.+)$/m)?.[1] ?? stem).replace(
    /^AI-103 (?:Practice )?Quiz\s*[—–-]\s*(?:Module \d+:\s*)?/,
    '',
  );
  const sourceUrl = body.match(/^\*\*Source:\*\*\s*(\S+)/m)?.[1];

  // The module is the unit of study, so it is the topic. Prefer the canonical
  // Learn title over the quiz heading, which is hand-typed and drifts.
  const slug = moduleSlugFromUrl(sourceUrl);
  const info = slug ? MODULES[slug] : undefined;
  if (slug && !info) {
    warn(`${file}: module "${slug}" is not in MODULES; using the quiz heading as topic and tagging no learning path`);
  } else if (!slug) {
    warn(`${file}: no parsable "**Source:**" URL; using the quiz heading as topic`);
  }
  const topic = info?.title ?? headingTitle;
  // Study order comes from exams.config.json, which is the single source of
  // truth for taxonomy (AI103-Game-Spec.md §5.2). Deriving it from the file
  // name instead would mean two places to keep in step, and renaming a file
  // would silently refile the module.
  if (info && info.order === undefined) {
    warn(`${file}: module "${slug}" has no "order" in exams.config.json; the module picker will fall back to alphabetical order`);
  }
  const orderTag = info?.order !== undefined ? `order:${info.order}` : undefined;
  const pathTags = (info?.paths ?? []).map((p) => `path:${p}`);
  const moduleTag = slug ? `module:${slug}` : undefined;
  const primaryPathTag = info?.primaryPath ? `primary-path:${info.primaryPath}` : undefined;

  const questions = parseQuestions(body, file);
  const answers = parseAnswers(body, file);
  const items: BankItem[] = [];

  for (const q of questions) {
    const a = answers.get(q.label);
    if (!a) {
      warn(`${file} ${q.label}: no answer-key entry; skipped`);
      continue;
    }
    const difficulty = DIFFICULTY_BY_SECTION[q.section];
    // Keyed by the section-qualified label, not a bare number — A1, B1 and C1
    // all coexist in one file and would otherwise collide on the same id.
    const id = uuidv5(`${stem}#${q.label}`, NS);
    const tags = [
      domain,
      slugify(topic),
      `level-${difficulty}`,
      ...(orderTag ? [orderTag] : []),
      ...(moduleTag ? [moduleTag] : []),
      ...pathTags,
      ...(primaryPathTag ? [primaryPathTag] : []),
    ];
    // Provenance is carried by `topic` and the module/path tags and rendered
    // by SourceLine, so the URL is not repeated inside the explanation.
    const explanation = capped(a.explanation, LIMITS.explanation, `${file} ${q.label} explanation`);

    if (q.section === 'B') {
      if (a.verdict !== 'True' && a.verdict !== 'False') {
        warn(`${file} ${q.label}: section B answer is "${a.verdict}", expected True/False; skipped`);
        continue;
      }
      items.push({
        id,
        type: 'mcq',
        domain,
        topic,
        difficulty,
        source: 'bank',
        tags,
        content: {
          question: capped(`True or false? ${q.prompt}`, LIMITS.mcqQuestion, `${file} ${q.label} question`),
          options: { A: 'True', B: 'False' },
          correct: a.verdict === 'True' ? 'A' : 'B',
          explanation,
        },
      });
      continue;
    }

    if (!/^[A-D]$/.test(a.verdict)) {
      warn(`${file} ${q.label}: answer "${a.verdict}" is not A–D; skipped`);
      continue;
    }
    const options = Object.fromEntries(
      (['A', 'B', 'C', 'D'] as const).map((k) => [
        k,
        capped(q.options![k], LIMITS.mcqOption, `${file} ${q.label} option ${k}`),
      ]),
    ) as Record<'A' | 'B' | 'C' | 'D', string>;

    items.push({
      id,
      type: 'mcq',
      domain,
      topic,
      difficulty,
      source: 'bank',
      tags,
      content: {
        question: capped(q.prompt, LIMITS.mcqQuestion, `${file} ${q.label} question`),
        options,
        correct: a.verdict,
        explanation,
      },
    });
  }
  return items;
}

function main(): void {
  const dryRun = process.argv.includes('--dry-run');
  const files = readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith('.md') && f !== 'README.md').sort();
  if (files.length === 0) {
    console.error(`No .md files in ${KNOWLEDGE_DIR}`);
    process.exit(1);
  }

  const all: BankItem[] = [];
  for (const file of files) {
    const items = buildItems(file, readFileSync(resolve(KNOWLEDGE_DIR, file), 'utf8'));
    const trueFalse = items.filter((i) => Object.keys(i.content.options as object).length === 2).length;
    console.log(
      `${file.padEnd(46)} ${String(items.length).padStart(3)} items  ` +
        `(${items.length - trueFalse} four-option, ${trueFalse} true/false)  → ${items[0]?.domain ?? '—'}`,
    );
    all.push(...items);
  }

  const seen = new Set<string>();
  for (const item of all) {
    if (seen.has(item.id)) warn(`duplicate id ${item.id} — check for repeated question numbers`);
    seen.add(item.id);
  }

  const trueFalse = all.filter((i) => Object.keys(i.content.options as object).length === 2).length;
  console.log(
    `\nTotal: ${all.length} mcq — ${all.length - trueFalse} four-option, ${trueFalse} true/false, 0 code-review`,
  );
  const byDomain = new Map<string, number>();
  for (const i of all) byDomain.set(i.domain, (byDomain.get(i.domain) ?? 0) + 1);
  for (const [d, n] of [...byDomain].sort()) console.log(`  ${d.padEnd(18)} ${n}`);

  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  ! ${w}`);
  }

  if (dryRun) {
    console.log('\n--dry-run: no files written.');
    return;
  }
  writeFileSync(resolve(CONTENT_DIR, 'mcq.json'), `${JSON.stringify(all, null, 2)}\n`);
  console.log(`\nWrote ${all.length} → supabase/seed/content/mcq.json`);
  console.log('code-review.json left untouched (no code snippets in the source files).');
}

main();
