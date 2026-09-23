# AI-103 · Authoring Prompt Addendum — Code Review Items

Append this section to the base authoring prompt.

---

## Additional schema: code-review

```
### code-review
{
  "id": "<generate a new UUIDv4>",
  "type": "code-review",
  "domain": "<domain slug>",
  "topic": "<topic string from allowed list>",
  "difficulty": <1 | 2 | 3>,
  "tags": ["<domain slug>", "<topic-slug>", "level-<difficulty>", "<sub_mode>"],
  "source": "ai-generated",
  "content": {
    "sub_mode": "<find-the-bug | what-does-this-do | fill-the-blank>",
    "language": "<python | json | yaml | bash>",
    "snippet": "<the code block — 8 to 20 lines — escaped as a JSON string>",
    "prompt": "<one sentence — what the learner must do — ≤ 200 chars>",
    "options": {
      "A": "<option text — ≤ 240 chars>",
      "B": "<option text — ≤ 240 chars>",
      "C": "<option text — ≤ 240 chars>",
      "D": "<option text — ≤ 240 chars>"
    },
    "correct": "<A | B | C | D>",
    "explanation": "<why correct is right AND why top distractor is wrong — 2–4 sentences, no markdown>"
  }
}
```

AI-103 states that the candidate has "experience developing apps by using
Python", and the artifacts the exam puts in front of them are SDK calls and
the JSON that configures them. `language` maps accordingly:

| Value    | Use for                                                             |
| -------- | ------------------------------------------------------------------- |
| `python` | Foundry SDK, Agent Framework, Search, Content Understanding clients |
| `json`   | Tool and function schemas, analyzer definitions, index + skillsets  |
| `yaml`   | Deployment and CI/CD definitions, prompt templates                  |
| `bash`   | `az` CLI provisioning, deployment, role assignment                  |

There is no `sql` or `kql`. Neither appears anywhere in the AI-103 skills
measured; both were DP-700 inheritances and have been removed from the
`CodeReviewLanguage` union.

---

## Code-review quality rules (in addition to the shared rules)

1. **One flaw only** (`find-the-bug`): introduce exactly one deliberate error.
   Do not hide two bugs — the learner should be able to reason to one
   correct answer unambiguously.

2. **One blank only** (`fill-the-blank`): use exactly one `___BLANK___`
   placeholder. Multi-blank snippets are out of scope for v1.

3. **Realistic snippets**: snippets must look like code a learner would
   actually write against a Foundry project — a real client construction, a
   real tool definition, a real deployment step. Avoid toy examples.

4. **Plausible distractors**: all four options must be things a learner
   who partially understands the topic would consider. Avoid options that
   are obviously nonsensical.

5. **Snippet length**: 8–20 lines. Long enough to be realistic;
   short enough to read in under 30 seconds on mobile.

6. **No markdown in explanation**: plain sentences only. No code fences,
   no bold, no bullet points inside the explanation field.

7. **Escape correctly**: the `snippet` field is a JSON string. Use `\n`
   for newlines and `\"` for any double-quotes inside the snippet.

8. **Pin the SDK generation.** The Foundry Python surface has moved. The
   current shape is `project.agents.create_version(agent_name=...,
   definition=PromptAgentDefinition(...))`; the classic shape is
   `project_client.agents.create_agent(model=..., name=...,
   instructions=...)`. Decide which generation a snippet targets and stay in
   it. A snippet that mixes them has an accidental bug on top of the intended
   one, which makes the item unanswerable.

9. **Difficulty calibration for code-review**:
   - **Level 1**: obvious flaw or simple recall (which credential type a
     managed identity needs; what `temperature` controls)
   - **Level 2**: requires knowing which option fits a scenario (when an
     MCP tool needs `require_approval`, when hybrid search beats vector
     search)
   - **Level 3**: exam trap — the snippet looks correct but violates a
     non-obvious constraint (retrieval results fetched but never placed in
     the prompt; an embedding dimension that mismatches the index)

---

## High-value code-review scenarios (ready to author)

Starting points for `find-the-bug` and `fill-the-blank`. Each maps to a real
exam trap. **Verify behaviour against current Microsoft Learn documentation
before shipping** — Foundry moves quickly and several of these surfaces are
preview. Record the doc date you authored against.

### Authentication and project setup (plan-manage)

- `AzureKeyCredential(os.environ["FOUNDRY_KEY"])` used for a workload
  deployed with a managed identity — the keyless objective wants
  `DefaultAzureCredential`, and a static key is a rotation liability
- A key committed into the snippet as a literal rather than resolved from
  configuration at all
- `AIProjectClient` pointed at the resource endpoint rather than the
  project endpoint (`.../api/projects/<project>`)
- A model *name* passed where a *deployment* name is required
- `allow_preview=True` omitted on a call that uses a preview-only surface

### Agents and tools (genai-agentic)

- Classic `agents.create_agent(...)` mixed with current
  `PromptAgentDefinition` — the two generations do not compose
- A function tool whose JSON schema declares a parameter the Python
  function does not accept, so every call fails at invocation
- A function-tool `parameters` block missing `"type": "object"`
- `MCPTool(..., require_approval="never")` in a scenario that explicitly
  calls for a human-in-the-loop gate
- `allowed_tools` left unset on an MCP server, exposing every tool the
  server publishes rather than the intended subset
- Tool registered on the client but never passed in `tools=`, so the model
  never sees it and silently answers from parametric knowledge
- A multi-agent orchestration that never awaits the delegated agent's
  result before composing the final answer

### Retrieval and grounding (info-extraction)

- Search executed and results assigned to a variable that is never
  interpolated into the prompt — the answer is ungrounded while the code
  appears to do RAG
- Vector field dimensions that disagree with the embedding model's output
  size, so index creation or upload fails
- Hybrid search requested without a semantic configuration attached
- `top_k` large enough to blow the model's context window with no
  truncation or reranking step
- Chunking applied after embedding rather than before
- A skillset output never mapped to an index field, so enrichment runs and
  is discarded

### Vision and multimodal (computer-vision)

- An image passed as a raw path where the API expects base64 or a URL
- A content filter configured on the resource but never attached to the
  deployment the code actually calls
- Alt-text generation that ignores the accessibility guidance to describe
  function rather than mere appearance
- Image input accepted from an untrusted source with no indirect
  prompt-injection mitigation, where embedded text in the image can steer
  the model

### Text and speech (text-analysis)

- Language detection result never used, so a downstream call runs with a
  hardcoded locale
- Synchronous iteration over a streamed speech response
- A missing `await` in the async client, so a coroutine is truthy and the
  code proceeds on a never-resolved result
- PII detection invoked but the redacted text discarded in favour of the
  original

### Deployment and configuration (plan-manage, `yaml` / `bash`)

- `az` role assignment granting a broader role than the task needs
  (Contributor where a data-plane reader role suffices)
- A deployment that sets capacity/quota without accounting for the rate
  limit the scenario states
- CI workflow that builds with secrets injected at runtime when the client
  bakes them at build time, so the deployed bundle has empty config
- Private networking configured while the client still resolves the public
  endpoint

---

## This authoring run (code-review)

```
Domain    : <domain slug>
Topic(s)  : <topic strings from allowed list>
Sub-mode  : <find-the-bug | what-does-this-do | fill-the-blank>
Language  : <python | json | yaml | bash>
SDK gen   : <current (create_version) | classic (create_agent)>
Difficulty: <1 | 2 | 3>
Count     : <N items>

Existing item IDs to avoid:
< paste UUIDs >

Knowledge-bank files to use as source:
< paste relevant .md file contents >
```

---

## Maintainer checklist — code-review items

Before committing, verify:

- [ ] Snippet is realistic (looks like real Foundry SDK / tool schema / deployment config)
- [ ] Snippet stays within one SDK generation (no `create_agent` + `PromptAgentDefinition` mix)
- [ ] API shape checked against current Microsoft Learn docs, and the doc date recorded
- [ ] `find-the-bug`: exactly one flaw, unambiguously identified by the correct option
- [ ] `fill-the-blank`: exactly one `___BLANK___`, correct option is the only valid completion
- [ ] All four options are plausible to a learner who partially knows the topic
- [ ] Explanation names the flaw, explains why it matters, and names the correct fix
- [ ] Snippet is 8–20 lines
- [ ] `\n` used for newlines in the JSON string (not literal newlines)
- [ ] No markdown in `explanation` field
- [ ] Difficulty level matches the calibration guide above
- [ ] `language` field matches the actual snippet content
- [ ] Tags include the `sub_mode` value (e.g. `"find-the-bug"`)
- [ ] Correct-answer letter chosen to keep the bank's A/B/C/D spread even (AI103-Game-Spec.md §12)
