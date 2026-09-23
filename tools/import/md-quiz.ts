/**
 * Import practice-quiz markdown from bank/knowledge/ into the seed bank.
 *
 * Source format (one file per Microsoft Learn module):
 *
 *   # AI-103 Practice Quiz — <module title>
 *   Source module: <learn.microsoft.com URL>
 *   AI-103 domains: **<Domain>** (hint) | **<Domain>** (hint)
 *
 *   ## Section A — Multiple Choice
 *   **1.** <question>
 *   A. <option>  B. <option>  C. <option>  D. <option>
 *
 *   ## Section B — True / False
 *   **11.** <statement> **(True/False)**
 *
 *   ## Section C — Scenario / Choose the Best Option
 *   (same shape as Section A)
 *
 *   ## Answer Key & Rationale
 *   **1. B — <restated answer>.** <rationale>
 *   **15. C.** <rationale>                  ← letter only
 *   **11. False.** <rationale>              ← true/false
 *
 * Every section becomes an `mcq` item. Section B's true/false statements use
 * a two-option MCQ (A = True, B = False) — the mcq schema requires only A and
 * B, so no filler distractors have to be invented.
 *
 * IDs are UUIDv5 over "<file stem>#<question number>", so re-running the
 * import is idempotent — the same question keeps the same id and the seed
 * CLI's cross-bank duplicate check stays happy.
 *
 * Usage:
 *   pnpm -C tools import:md               # write the seed file
 *   pnpm -C tools import:md -- --dry-run  # report only, write nothing
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

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
 * Microsoft Learn modules, keyed by the slug in their `Source module:` URL.
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
    exams: Array<{ modules?: Array<{ slug: string; title: string; pathId?: string }> }>;
  };
  const modules = config.exams[0]?.modules ?? [];
  if (modules.length === 0) {
    warn(`${configPath}: no "modules" array; every quiz will fall back to its own heading for a topic`);
  }
  const out: Record<string, ModuleInfo> = {};
  for (const m of modules) {
    out[m.slug] = {
      title: m.title,
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

interface ParsedQuestion {
  number: number;
  section: Section;
  prompt: string;
  options?: Record<'A' | 'B' | 'C' | 'D', string>;
}

interface ParsedAnswer {
  number: number;
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
  const line = body.match(/^AI-103 domains?:.*$/m)?.[0];
  if (!line) {
    warn(`${file}: no "AI-103 domain(s):" header line; defaulted to ${DEFAULT_DOMAIN}`);
    return DEFAULT_DOMAIN;
  }
  // Headers may list several domains; the first is the module's primary one.
  const first = line.match(/\*\*(.+?)\*\*/)?.[1] ?? line;
  for (const [re, domain] of DOMAIN_PROSE) if (re.test(first)) return domain;
  warn(`${file}: unrecognised domain "${plain(first)}"; defaulted to ${DEFAULT_DOMAIN}`);
  return DEFAULT_DOMAIN;
}

function parseQuestions(body: string, file: string): ParsedQuestion[] {
  const out: ParsedQuestion[] = [];
  const sectionRe = /^## Section ([ABC])\b.*$/gm;
  const marks = [...body.matchAll(sectionRe)];

  for (const [i, mark] of marks.entries()) {
    const section = mark[1] as Section;
    const start = mark.index! + mark[0].length;
    const end = i + 1 < marks.length ? marks[i + 1]!.index! : (body.match(/^## Answer Key/m)?.index ?? body.length);
    const chunk = body.slice(start, end);

    // A question runs from its "**N.**" marker to the next one (or chunk end).
    // `$(?![\s\S])` is end-of-input; plain `$` would match every line end
    // under /m, and JS has no \Z.
    const qRe = /^\*\*(\d+)\.\*\*\s*([\s\S]*?)(?=^\*\*\d+\.\*\*|$(?![\s\S]))/gm;
    for (const m of chunk.matchAll(qRe)) {
      const number = Number(m[1]);
      const raw = m[2]!.trim();
      if (section === 'B') {
        out.push({ number, section, prompt: plain(raw.replace(/\*\*\(True\/False\)\*\*/i, '')) });
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
        warn(`${file} Q${number}: missing option(s) ${missing.join(', ')}; skipped`);
        continue;
      }
      out.push({ number, section, prompt: plain(raw.slice(0, promptEnd)), options });
    }
  }
  return out;
}

function parseAnswers(body: string, file: string): Map<number, ParsedAnswer> {
  const map = new Map<number, ParsedAnswer>();
  const keyStart = body.match(/^## Answer Key.*$/m);
  if (!keyStart) {
    warn(`${file}: no "## Answer Key" section; every question in this file is unanswerable`);
    return map;
  }
  const chunk = body.slice(keyStart.index! + keyStart[0].length);

  // Three observed shapes:
  //   **1. B — restated answer.** rationale
  //   **15. C.** rationale
  //   **11. False.** rationale
  const re =
    /^\*\*(\d+)\.\s*(?:([A-D])(?:\s*[—–-]\s*[^*]*?)?|(True|False))\.?\*\*\s*([\s\S]*?)(?=^\*\*\d+\.|^---|$(?![\s\S]))/gm;
  for (const m of chunk.matchAll(re)) {
    const number = Number(m[1]);
    const verdict = (m[2] ?? m[3])!;
    map.set(number, { number, verdict, explanation: plain(m[4] ?? '') });
  }
  return map;
}

function buildItems(file: string, body: string): BankItem[] {
  const stem = file.replace(/\.md$/, '');
  const domain = parseDomain(body, file);
  const headingTitle = plain(body.match(/^#\s+(.+)$/m)?.[1] ?? stem).replace(
    /^AI-103 Practice Quiz\s*[—–-]\s*/,
    '',
  );
  const sourceUrl = body.match(/^Source module:\s*(\S+)/m)?.[1];

  // The module is the unit of study, so it is the topic. Prefer the canonical
  // Learn title over the quiz heading, which is hand-typed and drifts.
  const slug = moduleSlugFromUrl(sourceUrl);
  const info = slug ? MODULES[slug] : undefined;
  if (slug && !info) {
    warn(`${file}: module "${slug}" is not in MODULES; using the quiz heading as topic and tagging no learning path`);
  } else if (!slug) {
    warn(`${file}: no parsable "Source module:" URL; using the quiz heading as topic`);
  }
  const topic = info?.title ?? headingTitle;
  // The leading number in the filename is the order the modules are meant to
  // be worked through, so carry it into the bank — it is not derivable from
  // anything else once the file name is gone.
  const orderPrefix = stem.match(/^(\d+)/)?.[1];
  if (!orderPrefix) {
    warn(`${file}: filename has no leading number; the module picker will fall back to alphabetical order`);
  }
  const orderTag = orderPrefix ? `order:${Number(orderPrefix)}` : undefined;
  const pathTags = (info?.paths ?? []).map((p) => `path:${p}`);
  const moduleTag = slug ? `module:${slug}` : undefined;
  const primaryPathTag = info?.primaryPath ? `primary-path:${info.primaryPath}` : undefined;

  const questions = parseQuestions(body, file);
  const answers = parseAnswers(body, file);
  const items: BankItem[] = [];

  for (const q of questions) {
    const a = answers.get(q.number);
    if (!a) {
      warn(`${file} Q${q.number}: no answer-key entry; skipped`);
      continue;
    }
    const difficulty = DIFFICULTY_BY_SECTION[q.section];
    const id = uuidv5(`${stem}#${q.number}`, NS);
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
    const explanation = capped(a.explanation, LIMITS.explanation, `${file} Q${q.number} explanation`);

    if (q.section === 'B') {
      if (a.verdict !== 'True' && a.verdict !== 'False') {
        warn(`${file} Q${q.number}: section B answer is "${a.verdict}", expected True/False; skipped`);
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
          question: capped(`True or false? ${q.prompt}`, LIMITS.mcqQuestion, `${file} Q${q.number} question`),
          options: { A: 'True', B: 'False' },
          correct: a.verdict === 'True' ? 'A' : 'B',
          explanation,
        },
      });
      continue;
    }

    if (!/^[A-D]$/.test(a.verdict)) {
      warn(`${file} Q${q.number}: answer "${a.verdict}" is not A–D; skipped`);
      continue;
    }
    const options = Object.fromEntries(
      (['A', 'B', 'C', 'D'] as const).map((k) => [
        k,
        capped(q.options![k], LIMITS.mcqOption, `${file} Q${q.number} option ${k}`),
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
        question: capped(q.prompt, LIMITS.mcqQuestion, `${file} Q${q.number} question`),
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
