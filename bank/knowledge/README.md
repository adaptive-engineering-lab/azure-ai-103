# Knowledge source — practice-quiz markdown

One file per Microsoft Learn module. `tools/import/md-quiz.ts` reads every
`.md` here except this README and turns it into seed JSON.

Empty right now: the DP-700 quizzes were removed with the port, and the
AI-103 set has not been written yet. This README also keeps the directory
present in git, which the importer needs — it exits cleanly on *no quiz
files*, but throws if the directory itself is missing.

## Naming

```
<order>-AI-103_<Topic>_Quiz.md
```

`<order>` is the module's study order, **1–30**, matching
`exams.config.json` → `modules[].order`. The importer reads it into the
item's `order:` tag, which is what groups the module picker by learning path
in the sequence the course teaches. Numbering that disagrees with the config
will file modules under the wrong path heading.

## File format

```markdown
# AI-103 Practice Quiz — <module title>
Source module: <learn.microsoft.com URL>
AI-103 domains: **<Domain>** (hint) | **<Domain>** (hint)

## Section A — Multiple Choice
**1.** <question>
A. <option>  B. <option>  C. <option>  D. <option>

## Section B — True / False
**11.** <statement> **(True/False)**

## Section C — Scenario / Choose the Best Option
(same shape as Section A)

## Answer Key & Rationale
**1. B — <restated answer>.** <rationale>
**15. C.** <rationale>                  ← letter only
**11. False.** <rationale>              ← true/false
```

Notes:

- The `Source module:` URL's slug must match a `slug` in
  `exams.config.json` → `modules`, or the item is tagged with no learning
  path and falls back to the quiz heading for its topic. The importer warns
  when it cannot find one.
- `AI-103 domains:` takes the **first** bolded domain as the module's
  primary. Recognised prose: *plan and manage*, *generative AI and agentic*,
  *computer vision*, *text analysis*, *information extraction*. An
  unrecognised or missing line defaults to `genai-agentic` with a warning.
- Every section becomes an `mcq` item. Section B uses a two-option MCQ
  (A = True, B = False) — the schema requires only A and B, so no filler
  distractors are needed.
- IDs are UUIDv5 over `<file stem>#<question number>`, so re-importing is
  idempotent: a question keeps its id, and progress against it survives.
  Renaming a file *does* change its ids.
- Aim for a roughly even spread of correct answers across A/B/C/D as you
  write. The DP-700 bank inherited a heavy B bias from its source material
  and it could not be fixed afterwards, because explanations reference the
  letters inline (AI103-Game-Spec.md §12).

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
