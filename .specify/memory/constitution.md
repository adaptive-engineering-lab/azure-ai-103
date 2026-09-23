<!--
SYNC IMPACT REPORT
==================
Version change: 2.0.0 → 3.0.0
Bump rationale: MAJOR. The product is retargeted from Exam DP-700
(Fabric Data Engineer Associate) to Exam AI-103 (Azure AI Apps and
Agents Developer Associate). Principle II fixed the domain set to the
three official DP-700 domains; it is now the five official AI-103
domains. Redefining a principle in a backward-incompatible way is,
per the governance policy, a MAJOR bump.

Modified principles:
- II. "Domain-Aligned Content Integrity" — domain set rebound to the
  five AI-103 domains; the retired flashcard and product-ID item types
  dropped from the enumeration (see spec §6.4).

Other principles unchanged in title and intent.

Sections updated:
- Title: "DP-700 Learning Game Constitution" → "AI-103 Learning Game
  Constitution".

Templates: no template edits required. CLAUDE.md unchanged.

Spec sync: DP700-Game-Spec.md replaced by AI103-Game-Spec.md in the
same change set. Section numbering deliberately preserved so the §8,
§9, and §13 citations in this file and in frontend/src/lib/spacing.ts
remain valid; those citations were repointed to the new filename.
The archived feature specs under specs/ still cite the old filename
and are correct to do so — they document the DP-700 build.

Deferred / TODOs: none. The AI-103 taxonomy is settled in spec §5.2;
implementation is tracked as spec §13 Phase 5.
-->

# AI-103 Learning Game Constitution

## Core Principles

### I. Mobile-First, Thumb-Friendly UX

Every screen MUST be designed at 375px width first and scaled up; primary
interactive controls MUST live within the bottom 60% of the viewport. Dark
mode is the default theme. Streak, XP, and session progress MUST remain
visible during any active session. Gestures (swipe left/right on flashcards,
tap to flip, swipe up to advance) MUST have equivalent on-screen controls
for accessibility and desktop use.

**Rationale**: The product's three personas all share short, on-the-go study
sessions on phones. Designing for desktop first or hiding progress signals
breaks the habit-forming loop the product depends on.

### II. Domain-Aligned Content Integrity

Every question item MUST carry an explicit `domain`, `topic`,
`difficulty`, and `source` field as defined in the spec's data model. The
domain set is fixed to the five official AI-103 exam domains
(`plan-manage`, `genai-agentic`, `computer-vision`, `text-analysis`,
`info-extraction`); new domains require a constitution amendment. AI-generated content
MUST be tagged `source: "ai-generated"` and MUST NOT be promoted into the
seeded bank without human review.

**Rationale**: Exam alignment is the product's reason to exist. Untagged or
mis-tagged content silently corrupts the spaced-repetition queue, the
weak-area dashboard, and the level-progression gates.

### III. AI as an Authoring Tool, Not a Runtime Dependency

The production runtime MUST NOT make outbound calls to any AI provider.
Claude is used **only** by the maintainer, offline, to draft and refine
question-bank entries. All AI-authored items MUST be validated against
the JSON schemas in AI103-Game-Spec.md §8, reviewed by a human, tagged
`source: "ai-generated"`, and committed to the seed bank before reaching
users. Any future proposal to add a runtime AI feature ("Explain more",
on-demand generation, weak-area summaries) requires an amendment of
this constitution and a fresh review of cost, rate-limit, and
key-handling controls.

**Rationale**: Keeping AI out of the runtime removes an entire class of
failure modes — leaked API keys, runaway spend, latency spikes, and
factual drift between the curated bank and on-demand content. The
bank is the single source of truth that learners study against.

### IV. Secrets Stay Server-Side

The Anthropic API key, any service-role Supabase keys, and any third-party
credentials MUST NEVER appear in client bundles, repository files, or
client-side environment variables. All privileged calls MUST go through
Vercel Edge Functions. Supabase tables MUST have Row-Level Security
enabled before exposure to the client; the `anon` key is the only
Supabase credential permitted in the frontend.

**Rationale**: A leaked Anthropic key is an immediate financial incident.
A missing RLS policy on `user_progress` or `sessions` leaks per-learner
performance data across accounts.

### V. Measurable Quality Gates

Before any merge to `main` that touches user-facing code: Lighthouse
mobile score MUST be ≥ 90 (Performance, Accessibility, Best Practices,
SEO); the PWA manifest and offline shell MUST remain installable; and
new question/flashcard content MUST validate against the JSON schemas
in the spec's data model. Phase exit criteria (Phases 1–4 in the spec)
are not advisory — a phase MAY NOT be declared complete while any
checkbox in its scope remains unchecked.

**Rationale**: "Mobile-first" and "fast" decay silently without numeric
gates. Schema validation is the cheapest way to keep the question bank
honest as both humans and Claude contribute to it.

## Technology & Platform Constraints

The following stack choices are load-bearing and changing any of them
requires a MAJOR version bump of this constitution:

- **Frontend**: React 18 + Vite, Tailwind CSS, shadcn/ui, React Router v6,
  Zustand for global state, Framer Motion for transitions.
- **Backend**: Supabase (Postgres + Auth + Storage) as the system of
  record. No serverless functions are required for v1; if one is added
  later it MUST be justified in the relevant plan's Complexity Tracking
  table.
- **AI (authoring only)**: Anthropic Claude is used by the maintainer
  to draft seed content. The Anthropic key MUST NOT be present in the
  application bundle, edge runtime, or Vercel project environment.
- **Hosting**: Vercel (primary) or Azure Static Web Apps (acceptable
  alternative). CI/CD via GitHub Actions, auto-deploy on merge to `main`.
- **Distribution**: PWA only for v1. Native iOS/Android wrappers are
  out of scope and MUST NOT be added without an amendment.

## Development Workflow & Quality Gates

- **Phased delivery**: Work proceeds in the four phases defined in
  AI103-Game-Spec.md §13. A later phase MUST NOT consume scope from
  an earlier phase without rebaselining the spec.
- **Specs precede code**: Every feature branch MUST originate from a
  spec under `specs/###-feature-name/` produced by `/speckit-specify`,
  with a `/speckit-plan` artifact before implementation tasks are
  generated.
- **Environment hygiene**: Local development uses `.env`; production
  uses Vercel environment variables. `.env` MUST be gitignored.
- **Observability**: Vercel Analytics for frontend signals and Supabase
  logs for data-layer signals are the minimum required telemetry.
  Per-domain answer accuracy MUST be queryable from `user_progress`
  and `sessions`.
- **Review**: All PRs MUST verify compliance with the five core
  principles and cite, when violated, an entry in the plan's Complexity
  Tracking table with a justified rejection of the simpler alternative.

## Governance

This constitution supersedes ad-hoc engineering preferences and informal
conventions. When this document and another artifact (README, ticket,
chat decision) disagree, this document wins until amended.

**Amendment procedure**: Open a PR that edits this file and any
dependent templates in the same commit. The PR description MUST state
the proposed semantic version bump and its rationale. At least one
reviewer MUST approve the amendment in addition to any code review.

**Versioning policy**:
- **MAJOR**: Removing a principle, redefining a principle in a
  backward-incompatible way, or changing a load-bearing stack choice
  listed under "Technology & Platform Constraints".
- **MINOR**: Adding a principle or materially expanding guidance in
  an existing section.
- **PATCH**: Wording, typo, or non-semantic clarifications, including
  model-version refreshes within the same Claude generation.

**Compliance review**: Every `/speckit-plan` run MUST evaluate its
feature against the Constitution Check gate using the principles
above. Unjustified violations block plan acceptance.

**Version**: 3.0.0 | **Ratified**: 2026-05-11 | **Last Amended**: 2026-09-23
