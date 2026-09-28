# Knowledge source — practice-quiz markdown

One file per Microsoft Learn module. `tools/import/md-quiz.ts` reads every
`.md` here except this README and turns it into seed JSON.

Currently six files, covering modules 1–6 (learning path `lp1`) — 98 items:
67 four-option and 31 true/false. Modules 7–30 are unwritten, which is why
three of the five exam domains are still empty in the bank.

## Naming

```text
AI-103_Module<nn>_<Topic>_Quiz.md
```

The file name is **not** load-bearing for taxonomy. Study order, the canonical
module title and the learning path all come from `exams.config.json` →
`modules`, matched on the slug in the file's `**Source:**` URL. The `<nn>` is
there for readability and to keep the directory listing in study order.

Renaming a file *does* change its question ids (they are UUIDv5 over the file
stem), which orphans progress against those questions. Rebalancing which
letter is correct does not.

## File format

````markdown
# AI-103 Quiz — Module <n>: <module title>

**Source:** https://learn.microsoft.com/en-us/training/modules/<slug>/
**Units covered:** <unit> | <unit> | <unit>
**Domain:** <exam domain> (<weight>) — <optional sub-skill qualifier>

---

## Section A — Multiple Choice

**A1.** <question>
A. <option>
B. <option>
C. <option>
D. <option>

## Section B — True / False

**B1.** <statement>

## Section C — Scenario Questions

(same shape as Section A)

---

# Answer Key

### Section A

**A1 — B.** <rationale>. (A) is wrong because… (C) and (D) …

### Section B

**B1 — False.** <rationale>

---

## Score Guide

(prose table; ignored by the importer)
````

Notes:

- Questions are keyed by their **section-qualified label** — `A1`, `B1`, `C1`.
  Numbering restarts per section, so a bare number would collide. Ids are
  UUIDv5 over `<file stem>#<label>`, making re-import idempotent.
- The `**Source:**` URL's slug must match a `slug` in `exams.config.json` →
  `modules`, or the item is tagged with no learning path and falls back to the
  quiz heading for its topic. The importer warns when it cannot find one.
- `**Domain:**` takes everything **before** the em-dash as the exam domain, so
  a sub-skill qualifier after the dash cannot outvote it. Recognised prose:
  *plan and manage*, *generative AI and agentic*, *computer vision*, *text
  analysis*, *information extraction*. An unrecognised or missing line defaults
  to `genai-agentic` with a warning.
- Every section becomes an `mcq` item. Section B uses a two-option MCQ
  (A = True, B = False) — the schema requires only A and B, so no filler
  distractors are needed.
- Section A is difficulty 1, Section B is 1, Section C is 2.
- Options are one per line and must be single-line. Option text caps at 240
  characters, questions at 600, explanations at 1200; the importer truncates
  at a word boundary and warns.
- The answer key is an h1 (`#`), not an h2, with `### Section X` sub-headings. Anything
  from `## Score Guide` onward is ignored.

## Answer-letter distribution

**Author this in from the first draft.** `tests/contract/answer-letter-distribution.test.ts`
gates the seeded bank: no letter may be correct in more than 40% or fewer than
12% of four-option items, and neither True nor False may exceed 65% of the
true/false pool. The gates activate at 40 four-option and 30 true/false items —
both are already live.

It cannot be fixed cheaply after the fact. Explanations name the letters inline
(`(A) reverses the relationship…`), so shuffling options means rewriting the
rationales in step. The DP-700 bank was never repaired for exactly this reason
(AI103-Game-Spec.md §12, risk 4).

The six AI-103 files were rebalanced once, on import, from a 73% B skew to
A 17 / B 17 / C 17 / D 16 and True 16 / False 15. Keep new modules near
uniform as you write them rather than letting the next batch pull it back.

Two conventions that make a later rebalance mechanical, if one is ever needed:

- Reference other options **only** as parenthesised letters — `(A)`, `(B)` —
  never as `option B`, `B is correct`, or `B)`.
- No positional options: nothing that reads `all of the above`, `none of the
  above`, or `both A and B`, since those cannot be moved.

## Workflow

```bash
pnpm -C tools import:md -- --dry-run   # report only, write nothing
pnpm -C tools import:md                # write supabase/seed/content/mcq.json
pnpm -C tools seed:validate            # schema-check the result
pnpm -C tools seed                     # push into Supabase
```

Code-review items are **not** produced from this format — the quizzes carry
no snippets. Author those with `pnpm -C tools author draft`; see
`tools/author/prompts/code-review.md` and AI103-Game-Spec.md §6.2.
