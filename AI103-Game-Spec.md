# AI-103 Learning Game — Product Specification

**Version**: 3.0  
**Date**: 2026-09-23  
**Status**: Pre-development. The **engine** described here is shipped and
inherited from the DP-700 build; the **exam taxonomy and content** are the
target, not current behaviour. Each section marks which it is.

> Section numbers are load-bearing. `frontend/src/lib/spacing.ts` cites §9,
> the constitution cites §8 and §13, and the feature specs under `specs/`
> cite §6, §7, and §10.2. Renumber only with a matching sweep.
>
> **Provenance.** This document replaces `DP700-Game-Spec.md`. Section
> numbering is deliberately unchanged from that file so the citations above
> stay valid; only the filename and the exam-specific content moved. The
> archived specs under `specs/` still cite the old filename — they document
> DP-700 work and are correct to do so.

---

## 1. Overview

### 1.1 Product Summary

A mobile-first, gamified web application for preparing for the **Microsoft
Certified: Azure AI Apps and Agents Developer Associate** certification
(Exam AI-103). A curated question bank drives two study modes —
multiple-choice quizzes and code-review drills over real Python SDK calls,
agent tool schemas, and deployment definitions — plus a spaced-repetition
Daily Review that pulls whatever is due today.

AI-103 replaces **AI-102**, which retired on 30 June 2026. The two exams are
not interchangeable: AI-103 folds agentic development into a headline domain,
collapses the old NLP and knowledge-mining domains, and drops the custom
vision / custom language model surface almost entirely in favour of
Foundry-hosted models and Content Understanding. Content written for AI-102
cannot be imported wholesale.

### 1.2 Goals

- Make AI-103 exam prep engaging, bite-sized, and habit-forming
- Cover all five official AI-103 exam domains with structured progression
- Track learner progress and surface weak areas intelligently
- Drill the artifacts the exam actually puts in front of a candidate: Python
  SDK code, JSON tool and analyzer schemas, and deployment configuration

### 1.3 Non-Goals (v1)

- No social/multiplayer features
- No video content
- No native mobile app (PWA is the delivery vehicle)
- No runtime AI. The production app makes no outbound calls to any AI
  provider; see §7.

The last point is worth stating plainly because it reads as a contradiction:
this is an app *about* building AI applications that itself calls no model at
runtime. That is deliberate. Every item is authored offline, reviewed by a
human, and shipped as static JSON, so a session costs nothing, works offline,
and cannot hallucinate an answer key.

Offline support is **shipped** — the PWA precaches the app shell and question
bank, so a session can be completed without a connection (§13, Phase 4).

---

## 2. Target Users

| Persona | Description |
|---|---|
| **The App Developer** | Python developer adding AI features to an existing product; comfortable with SDKs and REST, new to the Foundry surface |
| **The AI-102 Holder** | Certified on the retired exam, re-certifying on AI-103; knows the vision/language services, needs the agentic and Foundry material |
| **The AI Engineer** | Already ships ML or generative features, formalising on Azure; needs the governance, quota, and responsible-AI material more than the SDK material |

All personas share: **mobile-first usage**, **short study sessions
(5–15 min)**, **need for immediate feedback**, and **working Python
literacy** — the exam assumes it, so the code drills may too.

---

## 3. Tech Stack

*Status: shipped. Versions below are read from `frontend/package.json`, not
aspirational.*

### 3.1 Frontend

| Layer | Technology | Rationale |
|---|---|---|
| Framework | React 18 + Vite 5 | Fast builds, large ecosystem, easy deployment |
| Styling | Tailwind CSS 3 | Mobile-first utilities, consistent design system |
| Components | Hand-rolled | No component library; the surface is small enough that a dependency would cost more than it saves |
| Routing | React Router 6 | SPA navigation between game modes |
| State | Zustand 4 | Lightweight global state (session, progress), persisted to localStorage |
| Animations | Framer Motion 11 | Transitions and score reveals; disabled under `prefers-reduced-motion` |
| Syntax highlighting | Shiki 4 | Real grammars for `python`, `json`, `yaml`, `bash` — code-review snippets are highlighted, not plain text |
| Validation | Ajv 8 + ajv-formats | Schema validation in the admin editor and the seed CLI |
| Branding | `src/lib/branding.ts` | Single source for every exam-name mention; shared by the bundle and `vite.config.ts` |
| PWA | vite-plugin-pwa (Workbox) | Precached shell + offline sessions |

The Shiki grammar set changes for AI-103: DP-700 loaded `python`, `sql`,
`kql`, and `json`. AI-103 drops `sql` and `kql` — neither appears in the
skills measured — and adds `yaml` and `bash`. See §6.2.

### 3.2 Backend / API

| Layer | Technology | Rationale |
|---|---|---|
| Database | Supabase (Postgres) | Question bank, user progress, subscriptions |
| Auth | Supabase Auth | Email magic link |
| Edge Functions | Supabase Functions (Deno) | Stripe checkout, billing portal, webhook |

There is no bespoke API tier. The client talks to PostgREST directly, and
row-level security is the authorization boundary.

### 3.2.1 Content Authoring Tooling (Offline, Not Runtime)

| Layer | Technology | Rationale |
|---|---|---|
| Markdown importer | `tools/import/md-quiz.ts` | Converts practice-quiz markdown in `bank/knowledge/` into seed JSON. The primary content path. |
| Authoring AI | Anthropic Claude (developer-side) | Drafts and expands bank entries during content production |
| Authoring scripts | Local Node scripts under `tools/` | Generate JSON, validate schemas, seed Supabase |

The production runtime makes **no** outbound calls to any AI provider. Claude
is used by the maintainer to author content offline; the resulting JSON is
reviewed by a human and committed to the seed bank before reaching users.

### 3.3 Hosting & DevOps

| Concern | Choice |
|---|---|
| Hosting | Vercel (`vercel.json`: builds in `frontend/`, publishes `frontend/dist`) |
| CI/CD | GitHub Actions — `data-layer.yml` (schema + seed) and `lighthouse.yml` (perf/a11y gate) |
| Environment | `frontend/.env.local` and `tools/.env.local` locally; Vercel env vars in production |
| Monitoring | Supabase logs |

Both workflows are exam-agnostic and need no change for the port.
`.lighthouserc.json` enumerates route paths and only needs editing if a game
mode is switched off.

---

## 4. Information Architecture

*Status: shipped, unchanged by the port.*

```
/                        → Home / Dashboard
/learn                   → Mode selector
/learn/quiz              → MCQ quiz session
/learn/code-review       → Code review drill
/learn/daily-review      → Spaced-repetition queue (dispatches across modes)
/progress                → Stats, streaks, weak areas
/settings                → Account, preferences
/settings/billing        → Plan view, upgrade / manage
/whats-in-pro            → Pro tier explainer
/sign-in, /auth/callback → Magic-link auth
/legal/privacy, /legal/terms
/admin                   → Question editor (admin-gated)
```

---

## 5. Game Structure

### 5.1 Level System

Levels are XP thresholds, not content gates — every question is available
from the first session.

| Level | Name | XP required |
|---|---|---|
| 1 | **Foundation** | 0 |
| 2 | **Builder** | 500 |
| 3 | **Engineer** | 2,000 |
| 4 | **Architect** | 5,000 |

Thresholds are enforced by `levelFromXp`. The names are a spec-level concept
only — the UI renders the numeric level, so renaming a tier costs nothing.
Renamed from the DP-700 ladder (Foundation / Practitioner / Engineer /
Expert) purely for flavour; the thresholds are identical.

### 5.2 AI-103 Exam Domains

*Status: target. The type system and the `questions_domain_chk` constraint
still carry the DP-700 slugs and must be migrated — see §13, Phase 5.*

Per the study guide, skills measured **as of 16 April 2026**. Slugs are the
canonical identifiers used in the type system, the `questions_domain_chk`
constraint, and every content file.

| Domain | Slug | Weight | Representative topics |
|---|---|---|---|
| Plan and manage an Azure AI solution | `plan-manage` | 25–30% | Model and service selection, Foundry project setup, deployment options, CI/CD integration, quotas and scaling, cost footprint, monitoring and drift, managed identity and keyless auth, private networking, content filters and guardrails, evaluators, tracing and provenance, agent oversight modes |
| Implement generative AI and agentic solutions | `genai-agentic` | 30–35% | Deploying and consuming LLMs / SLMs / multimodal models, RAG, tool-augmented flows, multistep reasoning, Foundry SDK and connectors, agent roles and tool schemas, function calling, conversation memory, MCP tools, multi-agent orchestration, approval flows, prompt engineering, model parameters, reflection and self-critique, token analytics and latency |
| Implement computer vision solutions | `computer-vision` | 10–15% | Image generation from text and reference media, video generation, inpainting and mask-based edits, multimodal visual analysis, captioning, visual question answering, accessibility alt-text, Content Understanding for visual characteristics, video segment analysis, object and region identification, visual content filters, indirect prompt injection via embedded text, visual policy enforcement |
| Implement text analysis solutions | `text-analysis` | 10–15% | Entity / topic / summary / structured-JSON extraction via prompting and Foundry Tools, sentiment and tone, safety and sensitive content detection, Azure Translator and LLM translation flows, domain customization, speech-to-text and text-to-speech for agents, custom speech models, audio-input multimodal reasoning, speech translation |
| Implement information extraction solutions | `info-extraction` | 10–15% | Ingestion and indexing of documents / images / audio / video, semantic + hybrid + vector search, built-in and custom enrichment skills, RAG ingestion flow with OCR, connecting retrieval to agent tools, multimodal OCR + layout + field extraction, Content Understanding analyzers, structured and markdown outputs for downstream reasoning |

Five domains, not three. This is the single most consequential difference
from DP-700 and it ripples: the `Domain` union, the `DOMAINS` array, the
`DOMAIN_LABELS` map, the CHECK constraint, and the progress radar all widen.
`RadarChart.tsx` already derives its axis count from `stats.length`, so the
radar needs no change — but the label wrapping was tuned against three long
labels and should be re-checked at five.

Weights are uneven here, unlike DP-700's flat 30–35% across three domains.
`genai-agentic` alone is a third of the exam, and the three tail domains are
10–15% each. Question targets follow the weights (§12) rather than splitting
evenly.

The full topic lists live in `exams.config.json`, which is the single source
of truth for taxonomy.

### 5.3 Learning Paths and Modules

*Status: target.*

Course **AI-103T00-A: Develop AI apps and agents on Azure** maps to exactly
four Microsoft Learn learning paths totalling **30 modules** and roughly
**29.6 hours** of content. These are the authoring source for the bank (§12)
and the values behind `LEARNING_PATHS` in
`frontend/src/lib/questions/types.ts`.

| ID | Learning path | Modules | Primary domains |
|---|---|---|---|
| `lp1` | [Develop generative AI apps in Azure](https://learn.microsoft.com/en-us/training/paths/develop-generative-ai-apps/) | 6 | `plan-manage`, `genai-agentic` |
| `lp2` | [Develop AI agents on Azure](https://learn.microsoft.com/en-us/training/paths/develop-ai-agents-azure/) | 9 | `genai-agentic` |
| `lp3` | [Develop natural language solutions in Azure](https://learn.microsoft.com/en-us/training/paths/develop-language-solutions-azure-ai/) | 7 | `text-analysis` |
| `lp4` | [Extract insights from visual data on Azure](https://learn.microsoft.com/en-us/training/paths/insight-visual-data/) | 8 | `computer-vision`, `info-extraction` |

**lp1 — Develop generative AI apps in Azure** (6 modules)

| # | Module | Primary domain |
|---|---|---|
| 1 | Plan and prepare to develop AI solutions on Azure | `plan-manage` |
| 2 | Select, deploy, and evaluate Microsoft Foundry models | `plan-manage` |
| 3 | Develop a generative AI chat app with Microsoft Foundry | `genai-agentic` |
| 4 | Develop generative AI apps that use tools | `genai-agentic` |
| 5 | Optimize generative AI model performance with Microsoft Foundry | `genai-agentic` |
| 6 | Implement a responsible generative AI solution in Microsoft Foundry | `plan-manage` |

**lp2 — Develop AI agents on Azure** (9 modules)

| # | Module | Primary domain |
|---|---|---|
| 7 | Develop AI agents with Microsoft Foundry and Visual Studio Code | `genai-agentic` |
| 8 | Integrate custom tools into your agent | `genai-agentic` |
| 9 | Integrate MCP Tools with Azure AI Agents | `genai-agentic` |
| 10 | Build knowledge-enhanced AI agents with Foundry IQ | `genai-agentic` |
| 11 | Integrate your agent with Microsoft 365 | `genai-agentic` |
| 12 | Build agent-driven workflows using Microsoft Foundry | `genai-agentic` |
| 13 | Develop an AI agent with Microsoft Agent Framework | `genai-agentic` |
| 14 | Orchestrate a multi-agent solution using the Microsoft Agent Framework | `genai-agentic` |
| 15 | Discover Azure AI Agents with A2A | `genai-agentic` |

**lp3 — Develop natural language solutions in Azure** (7 modules)

| # | Module | Primary domain |
|---|---|---|
| 16 | Analyze text with Azure Language in Foundry Tools | `text-analysis` |
| 17 | Develop a text analysis agent with the Azure Language MCP server | `text-analysis` |
| 18 | Develop a speech-capable generative AI application | `text-analysis` |
| 19 | Create speech-enabled apps with Azure Speech in Microsoft Foundry Tools | `text-analysis` |
| 20 | Develop a speech agent with the Azure Speech MCP server | `text-analysis` |
| 21 | Develop an Azure Speech Voice Live Agent in Microsoft Foundry | `text-analysis` |
| 22 | Translate text and speech with Microsoft Foundry Tools | `text-analysis` |

**lp4 — Extract insights from visual data on Azure** (8 modules)

| # | Module | Primary domain |
|---|---|---|
| 23 | Develop a vision-enabled generative AI application | `computer-vision` |
| 24 | Generate images with AI | `computer-vision` |
| 25 | Generate videos with Microsoft Foundry | `computer-vision` |
| 26 | Analyze images with Content Understanding | `computer-vision` |
| 27 | Create a multimodal analysis solution with Azure Content Understanding | `info-extraction` |
| 28 | Create an Azure Content Understanding client application | `info-extraction` |
| 29 | Extract data with Azure Document Intelligence | `info-extraction` |
| 30 | Create a knowledge mining solution with Azure AI Search | `info-extraction` |

"Primary domain" is the module's default filing, not a constraint. A question
carries exactly one `domain`, and individual items from a module may be filed
elsewhere — a quota question inside an agent module belongs to `plan-manage`.
The module itself is recorded in the item's `topic` and in a `module:<slug>`
tag; see §6 and §8.

---

## 6. Game Modes

### 6.1 Multiple Choice Quiz (MCQ)

*Status: shipped. Mechanics unchanged; only content changes.*

**Purpose**: Simulate exam conditions, test applied knowledge.

**Flow**:

1. User selects domain, difficulty, and question count (5 / 10 / 20)
2. Optional: enable timer (45 seconds per question, exam pace)
3. Question displayed with its options
4. On answer:
   - **Correct**: green highlight + explanation
   - **Incorrect**: red on chosen, green on correct + explanation
5. "Next" → advances
6. End screen: score %, time taken, per-domain breakdown, weak domains flagged

**Option count is variable.** Most items carry four options (A–D). Items
derived from true/false source questions carry exactly two (A = True,
B = False). The renderer draws whichever letters the item actually has;
nothing may assume four.

**Question Data Fields**:
```json
{
  "id": "uuid",
  "type": "mcq",
  "domain": "genai-agentic",
  "topic": "Integrate MCP Tools with Azure AI Agents",
  "difficulty": 2,
  "source": "bank",
  "tags": ["genai-agentic", "mcp", "module:connect-agent-to-mcp-tools", "path:lp2", "primary-path:lp2", "order:9", "level-2"],
  "content": {
    "question": "An agent is configured with an MCPTool whose require_approval is set to \"never\". What does that change about how the agent calls the server's tools?",
    "options": {
      "A": "The tools run without pausing for human confirmation",
      "B": "The tools are cached and re-run only when inputs change",
      "C": "The server's authentication step is skipped",
      "D": "The tool list is refreshed on every turn instead of once"
    },
    "correct": "A",
    "explanation": "require_approval governs the human-in-the-loop gate, not auth or caching. Setting it to \"never\" lets the agent invoke the server's allowed_tools directly..."
  }
}
```

**UX Notes**:

- Timer shown as a shrinking ring around the question number
- Keyboard shortcuts on desktop: A/B/C/D
- Results screen shows domain breakdown and a "review missed" CTA

### 6.2 Code Review

*Status: shipped as a mode; **zero items exist**. The language set changes
for AI-103.*

**Purpose**: Drill the artifacts AI-103 actually shows a candidate. The exam
is explicitly Python-based ("you should have experience developing apps by
using Python"), and the day-to-day surface is SDK calls plus JSON schemas.

**Sub-modes**:

| Sub-mode | Task |
|---|---|
| `find-the-bug` | One deliberate flaw in an 8–20 line snippet; identify it |
| `what-does-this-do` | Read the snippet, pick the accurate description |
| `fill-the-blank` | Exactly one `___BLANK___`; pick the only valid completion |

**Languages**:

| Language | What it covers |
|---|---|
| `python` | `azure-ai-projects` (`AIProjectClient`), `azure-identity`, the Responses API via `get_openai_client()`, Microsoft Agent Framework, `azure-search-documents`, Document Intelligence and Content Understanding clients, Speech and Language SDKs |
| `json` | Agent tool and function schemas, Content Understanding analyzer definitions, AI Search index / skillset / indexer definitions, evaluation and content-filter configs |
| `yaml` | Deployment and CI/CD definitions for Foundry projects, prompt templates |
| `bash` | `az` CLI provisioning, deployment, and role assignment |

`sql` and `kql` are removed — neither appears anywhere in the AI-103 skills
measured. This is a change to `CodeReviewLanguage` in
`frontend/src/lib/questions/types.ts` and to the Shiki grammar load in §3.1.

**Data Fields**:
```json
{
  "id": "uuid",
  "type": "code-review",
  "domain": "plan-manage",
  "topic": "Develop AI agents with Microsoft Foundry and Visual Studio Code",
  "difficulty": 2,
  "content": {
    "sub_mode": "find-the-bug",
    "language": "python",
    "snippet": "project = AIProjectClient(\n    endpoint=PROJECT_ENDPOINT,\n    credential=AzureKeyCredential(os.environ[\"FOUNDRY_KEY\"]),\n)\nagent = project.agents.create_version(\n    agent_name=\"support-agent\",\n    definition=PromptAgentDefinition(\n        model=\"gpt-5-mini\",\n        instructions=\"You are a helpful support agent.\",\n    ),\n)",
    "prompt": "This agent is being deployed to a container app with a user-assigned managed identity. Identify the flaw.",
    "options": {
      "A": "The credential should be DefaultAzureCredential so the managed identity is used instead of a static key",
      "B": "create_version should be create_agent",
      "C": "PromptAgentDefinition requires a tools argument",
      "D": "The model name must be a deployment name, not a model name"
    },
    "correct": "A",
    "explanation": "Keyless authentication via managed identity is the pattern the exam expects for deployed workloads; a static key in an env var defeats it and is a rotation liability..."
  }
}
```

**Trap catalogue to author against.** The Foundry SDK has genuine,
exam-relevant footguns that make honest `find-the-bug` items:

- Key-based credential where managed identity / `DefaultAzureCredential` is
  required — the keyless-credential objective in `plan-manage`
- Classic vs current agent API: `agents.create_agent(...)` (classic) against
  `agents.create_version(agent_name=..., definition=PromptAgentDefinition(...))`
  (current). Mixing generations is the most common real error
- Tool schema declaring a parameter the function does not accept, or omitting
  `"type": "object"` from a function-tool `parameters` block
- `require_approval` / `allowed_tools` left wide open on an `MCPTool` where
  the scenario calls for a human gate
- RAG retrieval wired to the model but the grounding result never placed in
  the prompt, so the answer is ungrounded while appearing to use search
- Vector search configured with a mismatched embedding dimension, or hybrid
  search requested without a semantic configuration
- Synchronous iteration over a streamed response, or a missing `await` in the
  async client
- Content filter or evaluator configured but never attached to the deployment

Authoring guidance lives in `tools/author/prompts/code-review.md`, which must
be rewritten for AI-103 — it currently catalogues Fabric traps.

### 6.3 Daily Review

*Status: shipped, unchanged.*

Pulls every item whose `next_review` has come due and dispatches each to its
native mode UI in one session. Capped at `DAILY_REVIEW_CAP` (30) items; an
"extend" action pulls the next batch of the same size. Only the first,
non-extended batch earns the streak bump and the +20 XP bonus, so extending
is unlimited practice without inflating either number.

### 6.4 Retired and never-built modes

Recorded so the history stays legible:

- **Flashcards** — shipped (spec 004), removed 2026-08-06. The DP-700 bank was
  built from practice-quiz markdown whose true/false section imports as a
  two-option MCQ, leaving no producer of flashcard items. Migration
  `0015_drop_flashcards.sql` dropped the type. The same reasoning holds for
  AI-103: the Learn knowledge checks are multiple-choice, so nothing would
  produce flashcards. Not revived.

- **Product Identification** — specified in the DP-700 1.0 draft, never built.
  Replaced by Code Review (spec 006). Worth re-examining for AI-103 and still
  rejected: the Foundry service surface *is* broad enough to justify a
  service-identification drill, but "which service" questions are already
  well-served as MCQs in `plan-manage`, and the mode would need icon assets
  (§15.3). The `product-id` type never existed in the database.

---

## 7. AI-Assisted Content Authoring (Offline)

*Status: shipped as tooling; prompts need AI-103 rewrites.*

Claude is used **by the maintainer**, not by end users. The production app
never calls an AI API.

### 7.1 Content paths

| Path | Use |
|---|---|
| **Markdown import** (primary) | Author a practice quiz as markdown in `bank/knowledge/`, run `pnpm -C tools import:md`. Sections A and C become MCQs, Section B becomes two-option true/false MCQs. IDs are UUIDv5 over `<file>#<number>`, so re-import is idempotent. |
| **Claude drafting** | `pnpm -C tools author draft` for topics the markdown doesn't cover — especially code-review items, which the quiz format does not produce. |

Filenames in `bank/knowledge/` carry a leading number that becomes the item's
`order:<n>` tag and drives the module picker's study order (`useModules.ts`).
Number the AI-103 files **1–30 to match §5.3**, so the picker groups modules
under their learning path in the order the course teaches them. The existing
DP-700 files use a `N-DP-700_Topic_Quiz.md` shape; the AI-103 equivalent is
`N-AI-103_Topic_Quiz.md`.

### 7.2 Authoring Workflow

1. Maintainer runs a local Node script under `tools/author/` that prompts
   Claude with domain, topic, difficulty, existing item IDs to avoid, and the
   JSON schema.

2. Claude returns JSON; the script validates against the schema in §8.
3. Maintainer reviews each item, edits as needed, and commits the reviewed
   JSON to the seed file.

4. `pnpm -C tools seed` writes items into Supabase with `source:
   "ai-generated"` and the human reviewer's initials.

### 7.3 Prompt Design Principles

- Always include: domain, topic, difficulty level, exam context ("AI-103")
- For generation: include existing item IDs to suppress duplicates
- Always request JSON output for generation
- **No sampling parameters.** `temperature`, `top_p` and `top_k` are rejected
  with a 400 on the authoring model (Opus 5); the 2.0 spec named temperatures
  that no code ever set. Depth is controlled by effort, not temperature.
- **Pin the SDK generation.** Foundry's Python surface has moved (classic
  `agents.create_agent` → current `agents.create_version` +
  `PromptAgentDefinition`). Prompts must state which generation an item
  targets, or Claude will mix them and produce snippets whose "bug" is an
  accident rather than the intended one. Every generated snippet is checked
  against current Microsoft Learn documentation before commit.

---

## 8. Data Model (Supabase)

*Status: shipped. One migration is required for the port — the domain CHECK.*

Nineteen migrations under `supabase/migrations/`. Abridged shape:

```sql

-- Question bank (public read; admin-only write)
questions (
  id uuid PRIMARY KEY,
  type text,           -- 'mcq' | 'code-review'
  domain text,         -- 'plan-manage' | 'genai-agentic' | 'computer-vision'
                       -- | 'text-analysis' | 'info-extraction'
  topic text,          -- the Microsoft Learn module the item came from
  difficulty int,      -- 1 (easy) to 3 (hard)
  source text,         -- 'bank' | 'ai-generated'
  reviewer_id text,    -- required when source = 'ai-generated'
  reviewed_at timestamptz,
  content jsonb,       -- shape enforced per type by CHECK
  content_hash text,
  tags text[],         -- module:<slug>, path:<id>, primary-path:<id>, order:<n>
  created_at timestamptz
)

profiles (              -- extends auth.users, auto-created by trigger
  id uuid PRIMARY KEY REFERENCES auth.users,
  display_name text, streak_days int, last_active date, level int
)

user_progress (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles ON DELETE CASCADE,
  question_id uuid REFERENCES questions ON DELETE CASCADE,
  times_seen int, times_correct int,
  last_rating text,    -- 'correct' | 'almost' | 'missed'
  next_review date,    -- spaced repetition
  UNIQUE (user_id, question_id)
)

sessions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles ON DELETE CASCADE,
  mode text,           -- 'mcq' | 'code-review' | 'daily-review'
  topic text, score_pct float, duration_seconds int, completed_at timestamptz
)

subscriptions (...)     -- Stripe plan state
admins (...)            -- gates /admin and question writes
webhook_events (...)    -- Stripe webhook idempotency
```

Every user-scoped table is protected by RLS keyed on `auth.uid()`. The
`questions` table is world-readable so guests can study without an account.

`last_rating` still admits `'almost'`, but no UI produces it since flashcard
self-rating was removed (§6.4). The column and the §9 branch are retained
rather than migrated away.

**Port note.** `questions_domain_chk` in `0001_questions.sql` enumerates the
three DP-700 slugs. Because this port starts from a fresh Supabase project
with an empty bank, edit that migration in place rather than adding a swap
migration — there are no rows to preserve. The `content` shape CHECK is
unchanged: the `mcq` and `code-review` types both survive.

---

## 9. Spaced Repetition Logic

*Status: shipped, unchanged by the port.*

Simplified **SM-2**, implemented in `frontend/src/lib/spacing.ts`:

| Rating | Next Review |
|---|---|
| Correct | `3 × 2^(prior correct answers)` days — 3, 6, 12, 24… |
| Almost | Tomorrow (unreachable today, see §8) |
| Missed | Tomorrow; the interval streak resets |

- Items due for review surface first in any session
- "Daily Review" on the home screen shows what is due today

---

## 10. UX & Design

### 10.1 Design Principles

- **Mobile-first**: layouts designed for 375px width first, scaled up
- **Thumb-friendly**: primary actions in the bottom 60% of the screen
- **Dark mode default**: dark background, accent-forward
- **Progress visible always**: streak, XP, and session progress in view

### 10.2 Key Screens

| Screen | Key Elements |
|---|---|
| **Home / Dashboard** | Daily streak, XP bar, Daily Review hero, quick-start CTAs, bank size |
| **Mode Selector** | Two mode cards (Quiz / Code Review) with live available-item counts |
| **Quiz Session** | Question + tappable options, optional timer ring, explanation panel |
| **Code Review Session** | Highlighted snippet, prompt, four options, explanation |
| **Results Screen** | Score, domain breakdown, XP earned, "Review Missed" CTA |
| **Progress Dashboard** | Five-axis domain radar, streak calendar, focus areas |
| **Admin** | Question CRUD with live schema validation |

The radar goes from three axes to five. `RadarChart.tsx` computes its
geometry from `stats.length`, so this needs no code change — but the label
wrapper (`maxChars`, `LINE_HEIGHT`) was tuned for three labels with generous
horizontal room. At five axes the left and right labels sit closer to the
edge, and the AI-103 domain names are long ("Implement generative AI and
agentic solutions"). Re-check at 375px before calling the port done.

### 10.3 Mobile Gestures

| Gesture | Action |
|---|---|
| Tap option | Select answer |
| Swipe up | Next question (after answering) |

Keyboard equivalents exist for every gesture.

---

## 11. Gamification

*Status: shipped, unchanged.*

| Element | Description |
|---|---|
| **XP Points** | `10 × correct + 50` per completed session; the first (non-extended) Daily Review batch adds `+20` |
| **Daily Streak** | Days in a row with at least one session |
| **Level Badges** | Foundation → Builder → Engineer → Architect (§5.1) |
| **Domain Mastery** | Per-domain accuracy on the progress radar |

---

## 12. Question Bank Seed Plan

*Status: target. The AI-103 bank is empty.*

Target is **200 items**, weighted to the exam's domain weights rather than
split evenly — this differs from DP-700, whose three domains were all
30–35%. Targets use the midpoint of each published band, normalised to 200.

| Domain | Weight | Midpoint | MCQ | Code Review | Total |
|---|---|---|---|---|---|
| `plan-manage` | 25–30% | 27.5% | 38 | 18 | 56 |
| `genai-agentic` | 30–35% | 32.5% | 42 | 25 | 67 |
| `computer-vision` | 10–15% | 12.5% | 20 | 6 | 26 |
| `text-analysis` | 10–15% | 12.5% | 20 | 6 | 26 |
| `info-extraction` | 10–15% | 12.5% | 20 | 5 | 25 |
| **Total** | | | **140** | **60** | **200** |

Code Review is a larger share than under DP-700 (60 of 200, against 40 of
200). AI-103 is an explicitly Python-based exam whose objectives are phrased
as *implement*, *configure*, and *integrate*; a code drill tests that more
honestly than an MCQ does.

**Current bank — 0 items.** The inherited DP-700 bank (352 MCQ items across
20 source quizzes in `bank/knowledge/`) is **discarded, not migrated**. None
of it maps to an AI-103 domain.

Known gaps and risks, in priority order:

1. **Everything.** The bank starts empty. First milestone is 30–50 items,
   which is enough to exercise every mode end to end; 150–200 is where spaced
   repetition starts to feel worthwhile.

2. **`plan-manage` is under-sourced relative to its weight.** It is 27.5% of
   the exam — 56 items — but only 3 of the 30 modules (§5.3) file there
   primarily. Its objectives (quotas, scaling, cost, drift monitoring,
   managed identity, private networking, responsible-AI instrumentation,
   agent oversight) are spread thinly across the agent and generative modules
   rather than concentrated. Harvesting to target means reading modules for
   their governance content specifically, and supplementing from the study
   guide and product documentation rather than from knowledge checks alone.

3. **Code Review starts at zero** and the quiz markdown will not produce it,
   exactly as under DP-700. All 60 items must be authored via `tools/author`
   (§7) against the trap catalogue in §6.2.

4. **Answer-letter distribution.** The DP-700 bank inherited a skew toward B
   from its source material, and correcting it after the fact proved
   impractical because explanations reference letters inline. Distribution is
   therefore a **first-pass authoring constraint** for AI-103, not a cleanup
   task: the importer and the authoring prompts should both target a roughly
   uniform correct-letter distribution, and a contract test should assert it
   stays within tolerance as the bank grows.

5. **Content freshness.** Foundry is moving fast and several modules cover
   preview surfaces (Foundry IQ, A2A, hosted agents). The study guide warns
   that preview features may appear if commonly used. Items should record the
   documentation date they were authored against so a future sweep can find
   the stale ones.

Content sourced from the official Microsoft Learn AI-103 study guide and the
30 course modules, paraphrased rather than copied.

---

## 13. Development Phases

Phases 1–4 are delivered — they built the engine, and the port inherits all
of it. Phase 5 is the AI-103 work. Feature-level specs live under `specs/`
and document the DP-700 build; they remain accurate as engine documentation.

### Phase 1 — Foundation ✅

- [x] Supabase schema + seed (spec 001)
- [x] React app scaffold with routing (spec 002)
- [x] ~~Flashcard mode~~ (spec 004 — shipped, later removed; §6.4)
- [x] MCQ mode (spec 005)
- [x] Supabase Auth + guest migration (spec 003)

### Phase 2 — Core Game ✅

- [x] Code Review mode (spec 006) — replaced Product ID
- [x] Timer for MCQ
- [x] Results screen with domain breakdown
- [x] User progress tracking, streak + XP

### Phase 3 — Content & Personalization ✅

- [x] Authoring scripts under `tools/author/` (spec 009)
- [x] Spaced repetition / Daily Review (spec 008)
- [x] Progress dashboard with radar (spec 007)
- [x] Admin question editor (spec 013)

### Phase 4 — Polish & Launch ✅

- [x] Dark mode + themes (spec 010)
- [x] PWA manifest + offline shell + install prompt (spec 010)
- [x] Pro tier + Stripe plumbing (spec 011)
- [x] Lighthouse gate ≥ 90 (spec 012)

### Phase 5 — AI-103 port (current)

Ordered. Taxonomy and types must land before any seeding, or validation
fails. `template/PORTING_CHECKLIST.md` is the operational companion to this
phase and carries the command-level detail.

**5a — Taxonomy**
- [x] Rewrite `exams.config.json` for AI-103: exam metadata, five domains
      (§5.2), four learning paths and 30 modules (§5.3), question targets
      (§12), `difficultyConfig` without the DP-700 `lp3MaxDifficulty`
      special case
- [x] Update `Domain`, `DOMAINS`, `DOMAIN_LABELS`, `CodeReviewLanguage`, and
      `LEARNING_PATHS` in `frontend/src/lib/questions/types.ts`
- [x] Update the domain enums in the four JSON schemas under
      `frontend/src/lib/admin/schemas/` and
      `specs/001-supabase-schema-and-seed/contracts/`

Landed with 5a because the `Domain` union forced it: the Shiki grammar load
and language labels in `SnippetView.tsx`, the local language union in
`DailyReviewPage.tsx`, the blank-item defaults in `AdminPage.tsx`, the
duplicated domain lists in `aggregate.ts` and `useDomainCounts.ts` (now
derived from `DOMAINS`, so the next port touches one file), the module table
in `tools/import/md-quiz.ts` (now read from `exams.config.json` rather than
hardcoded), and the domain fixtures across 11 test files.

**5b — Database** ✅
- [x] Edit `questions_domain_chk` in `0001_questions.sql` in place (§8)
- [x] Fresh Supabase project; `supabase db push --linked` — 19/19 applied
      to `bybzxeiittjhyeattcrt`, constraint verified from `pg_constraint`

**5c — Content**
- [x] Empty the seed files from `template/seed-content/`
- [ ] Author `bank/knowledge/` markdown for the 30 modules, numbered 1–30
- [x] Rewrite `tools/author/prompts/code-review.md` (landed in 5d)
- [ ] Import, validate, seed to 30–50 items; then grow toward 200 (§12)

**5d — Branding and copy** ✅
- [x] `frontend/index.html` title and description
- [x] `frontend/vite.config.ts` PWA manifest name / short_name / description
- [x] `HomePage.tsx` hero copy — it said "three exam domains"
- [x] `PrivacyPolicyPage.tsx`, `TermsOfServicePage.tsx` exam name
- [x] `frontend/package.json` and `tools/package.json` names
- [x] localStorage namespace (§15.1)
- [x] Sweep remaining user-facing `DP-700` strings outside `specs/`
- [x] Rewrite `tools/author/prompts/code-review.md` for AI-103 (moved up from
      5c — the Fabric trap catalogue was actively misleading)

Branding is no longer a set of literals to sweep. Every user-facing mention of
the exam now resolves from `frontend/src/lib/branding.ts`, which exports a
pure `resolveBranding(env)` plus committed AI-103 defaults. It has two callers
in two runtimes — the browser bundle via `import.meta.env`, and
`vite.config.ts` via `loadEnv()` — which is what keeps the PWA manifest, the
HTML head and the React tree from drifting apart.

The `VITE_EXAM_CODE` / `VITE_EXAM_TITLE` / `VITE_CERT_TITLE` variables in
`.env.example` documented themselves as driving the titles and meta tags but
were read by nothing; they are now real, optional, and fall back to the
defaults so an unset variable renders correct branding rather than a blank
title. `index.html` gets its title, description and storage key injected by a
`transformIndexHtml` plugin, which also removes the last hand-synced copy of
the localStorage key.

The namespace itself is deliberately *not* derived from the exam code: it is a
storage contract, and deriving it would mean renaming the exam silently
orphaned every existing user's progress.

**5e — Verification**
- [ ] Re-check the five-axis radar at 375px (§10.2)
- [ ] Add the answer-letter distribution contract test (§12, risk 4)
- [ ] `pnpm -C frontend build`, `pnpm -C frontend test`, `pnpm -C tools test`
- [ ] Full smoke test per `template/PORTING_CHECKLIST.md` §12

**5f — Deployment prerequisites** (found during 5b, none blocking content work)
- [ ] `frontend/.env.local` does not exist, so the app cannot reach Supabase
      locally. Copy `.env.example` and fill `VITE_SUPABASE_ANON_KEY` with the
      project's publishable key.
- [ ] Supabase Auth URLs are still at their defaults: Site URL is
      `http://localhost:3000` and the redirect allow-list is **empty**, so
      magic-link sign-in will fail on the deployed app. Needs the Vercel
      origin plus `http://localhost:5173/auth/callback` for local testing.
- [ ] `admins` is empty, so `/admin` is unreachable by anyone. Insert a row
      once the first account exists.
- [ ] Both workflows are now registered, but neither has ever executed —
      the repo's only run is the Copilot review. `data-layer.yml` should have
      fired on the `tools/**` push in c1d5493. Confirm a run happens (and
      passes) before treating either as a gate.
- [ ] `CONTACT_EMAIL` in `frontend/src/lib/legal.ts` is still the RFC 2606
      placeholder. The privacy policy promises a working route for access,
      correction and deletion requests.
- [x] Vercel deployed at azure-ai-103-eight.vercel.app: branding injected
      end to end, PWA manifest correct, deep links rewrite, Supabase reachable
      (`questions` query returns 200), no secrets in the bundle, console
      clean after the `vercel.json` rewrite fix in 8c5384a.

---

## 14. Success Metrics

| Metric | Target (3 months post-launch) |
|---|---|
| Daily Active Users | 500+ |
| Avg session length | 8–12 minutes |
| D7 retention | 30%+ |
| Quiz completion rate | 75%+ |
| User-reported exam pass rate | Track via optional survey |

Inherited from the DP-700 spec unchanged. They were never validated against
DP-700 outcomes, so treat them as intent rather than as a forecast.

---

## 15. Resolved Decisions

1. **Auth model**: **Guest mode with local storage.** Anyone can start
   immediately; progress lives in localStorage. The namespace moves from
   `dp700game.*` to `ai103game.*` (`frontend/src/lib/storage/namespace.ts`).
   This is safe precisely because it is a fresh deployment with no existing
   users — there is no stored state to strand, and no migration is written.
   Optional magic-link sign-in migrates local progress into the profile at a
   session boundary.

2. **Pricing**: **Free + paid "Pro" cosmetic tier.** Free includes the full
   question bank and every study mode. Pro unlocks extra themes, advanced
   stats, and the exam-day countdown — non-essential features only. No paid
   feature blocks exam preparation. Stripe stays dormant at launch; the
   billing surface shows "Free plan" for everyone until it is activated.

3. **Azure icons**: **Still not shipped.** The licensing question was moot
   under DP-700 because Product Identification was never built. AI-103 has a
   broader service surface that would make an icon-based drill tempting, and
   the answer is unchanged: no Microsoft icon assets ship with the app
   (§6.4).

4. **Localization**: **English only for v1.** No i18n framework; strings are
   inline. Note that the course is published in 13 languages, so this is a
   deliberate deferral rather than an assumption about the audience.

5. **Accessibility**: **WCAG 2.1 AA on core flows.** "Core" = quiz,
   code review, daily review, sign-in, and guest-to-account migration.
   Settings, progress dashboard, and admin screens are best-effort. Keyboard
   equivalents for every gesture are mandatory app-wide. Lighthouse
   Accessibility ≥ 90 is the numerical gate.

6. **True/false items**: **Two-option MCQs, not a separate type.** The `mcq`
   schema requires only options A and B, so a true/false question needs no
   invented distractors and no new question type.

7. **Five domains, not a merged three.** Collapsing the three 10–15% tail
   domains into one "specialised solutions" axis would keep the radar and the
   existing label layout untouched. Rejected: the domain breakdown on the
   results screen is the app's main diagnostic, and merging would hide that a
   learner is strong on text analysis but weak on information extraction —
   which are different services, different SDKs, and separately weighted on
   the exam.

8. **DP-700 content is discarded, not migrated.** No mapping exists between
   Fabric domains and AI-103 domains. The 352 inherited items are dropped
   with the DP-700 bank (§12).

---

*Spec 1.0 and 2.0 authored for DP-700 (see `git log`). 3.0 rewritten
2026-09-23 for AI-103, against the study guide published 16 April 2026 and
the AI-103T00-A course catalogue.*
