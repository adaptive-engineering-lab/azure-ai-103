# AI-103 Quiz — Module 4: Develop generative AI apps that use tools

**Source:** https://learn.microsoft.com/en-us/training/modules/use-generative-ai-tools/
**Units covered:** What are tools? | Use the code_interpreter tool | Use the web_search tool | Use the file_search tool | Use the function tool
**Domain:** Implement generative AI and agentic solutions (30–35%) — Build agents by using Foundry / Build generative applications by using Foundry

---

## Section A — Multiple Choice

**A1.** By default, who decides which tool (if any) to use when multiple tools are provided to a model?
A. The developer must specify the exact tool to use for every prompt
B. The model chooses based on the prompt, which you can guide (but not fully dictate) with instructions and tool selection rules
C. Tools are always used in the order they're listed in the tools array
D. All available tools are always called together on every request

**A2.** Which tool gives the model a sandboxed Python runtime to generate and execute code?
A. `web_search`
B. `function`
C. `file_search`
D. `code_interpreter`

**A3.** Which of the following is a documented limitation of the `code_interpreter` tool?
A. It supports unlimited execution time with no timeout
B. It cannot access common libraries like pandas or numpy
C. Its sandboxed environment has no external network access
D. It always requires a dedicated GPU

**A4.** Which tool is best suited for answering questions that require fresh information not present in the model's training data, such as very recent news?
A. `code_interpreter`
B. `web_search`
C. `file_search`
D. `function`

**A5.** What must you do before you can use the `file_search` tool to ground responses in your own documents?
A. Create a vector store and upload your files to it
B. Nothing — the model automatically indexes any file mentioned in the prompt
C. Convert the files to Python objects using `code_interpreter`
D. Register the files as custom functions

**A6.** Which parameter would you include in a `responses.create()` call to see which passages the `file_search` tool matched, for debugging and traceability?
A. `tools=["debug"]`
B. `verbose_search=True`
C. `trace=True`
D. `include=["file_search_call.results"]`

**A7.** When the model wants to use the `function` tool, what actually happens?
A. The model directly executes your application's code
B. The model returns a structured function-call request; your application code executes the function and returns the output
C. The function runs entirely inside the model's own sandbox, the same as `code_interpreter`
D. Function calling isn't supported by the Responses API

**A8.** What must your application send back to the model after running a function it requested?
A. A new system prompt
B. Nothing further — the model already has the result
C. A `function_call_output` item containing the `call_id` and the result
D. A new vector store ID

**A9.** For enterprise-scale agent scenarios that need to search across large quantities of data spread across multiple separate data stores, what does the module recommend considering instead of (or in addition to) a single `file_search` vector store?
A. The Foundry IQ knowledge store solution
B. `code_interpreter` combined with pandas
C. `web_search` only
D. A single, very large vector store

**A10.** Which best describes a key difference between `code_interpreter` and the `function` tool?
A. `code_interpreter` executes model-generated code in a Microsoft-managed sandbox, while `function` calls developer-defined code that your own application executes
B. They are functionally identical — just different names for the same feature
C. `function` only works with the ChatCompletions API, never the Responses API
D. `code_interpreter` can call external APIs directly, while `function` cannot

---

## Section B — True / False

**B1.** You can guide (but not fully force) which tool the model chooses by using the Instructions (system prompt) parameter and tool selection rules.

**B2.** The `web_search` tool guarantees consistent, identical results every time the same query is run, since it always pulls from a fixed snapshot of the web.

**B3.** `file_search` retrieves passages by matching exact keywords from the query against your documents, so a question phrased differently from the source text will not find it.

**B4.** Because the `function` tool returns structured calls that your own code executes, you never need to validate the function arguments the model provides — they're guaranteed correct.

**B5.** `code_interpreter`'s sandboxed environment has common libraries like pandas, numpy, and matplotlib pre-installed.

---

## Section C — Scenario Questions

**C1.** You're building an assistant that must answer "What's our current PTO carryover policy?" strictly from your company's official HR policy PDF, and you also need the ability to show which passage supported the answer. Which tool and configuration fits best?
A. `web_search`, since HR policy might change over time
B. `code_interpreter`, to parse the PDF programmatically
C. `file_search`, with the policy PDF uploaded to a vector store and `include=["file_search_call.results"]` for traceability
D. The `function` tool, calling a custom `get_pto_policy()` function

**C2.** A user asks your assistant: "What's the current stock price of Contoso Corp, and can you check my personal order status for order #4521?" Fully handling this requires combining two different tool types. Which pairing is correct?
A. `code_interpreter` (for the stock price) + `file_search` (for order status)
B. Just use `web_search` for both — it can call any API
C. `file_search` (for the stock price) + `code_interpreter` (for the order status)
D. `web_search` (for the current, changing stock price) + the `function` tool (to call your internal order-status API)

---
---

# Answer Key

### Section A

**A1 — B.** The default behavior is model-driven tool selection based on the prompt; you influence (not dictate) this with the Instructions parameter and tool selection rules. (C) and (D) invent behavior not described in the module.

**A2 — D.** `code_interpreter` provides a Python environment where the model can generate and run code dynamically, with access to common libraries.

**A3 — C.** The sandboxed environment explicitly has **no external network access** — a key constraint to remember, since it means `code_interpreter` can't be used to fetch live web data (that's `web_search`'s job). Common libraries (pandas/numpy/matplotlib) *are* available, ruling out (B); there's no GPU requirement mentioned.

**A4 — B.** `web_search` exists specifically to ground responses in current, external information beyond the model's static training data — ideal for fast-changing facts like news, pricing, or policy updates.

**A5 — A.** You must first create a vector store and upload your files to it before `file_search` can retrieve from them — indexing is a prerequisite step, not automatic.

**A6 — D.** `include=["file_search_call.results"]` surfaces the matched passages in the response object, useful for debugging and verifying what grounded the answer.

**A7 — B.** This is the core function-calling pattern: the model never runs your code itself — it emits a structured function-call request, your application executes the actual logic, and you return the result. This is the single most important distinction to hold onto for this tool.

**A8 — C.** You return a `function_call_output` item that includes the `call_id` (matching the model's request) and the function's result, so the model can incorporate it into its next response.

**A9 — A.** The module explicitly flags Foundry IQ as the recommended solution for enterprise-scale agents needing to search large quantities of data across *multiple* data stores — `file_search` with a single vector store is positioned as the simpler, smaller-scale option.

**A10 — A.** `code_interpreter` = model-generated code, executed in a Microsoft-managed sandbox. `function` = developer-defined code, executed by *your* application. Both involve "running code" conceptually, but who writes and who executes the code differs completely — a strong candidate for a "compare these two tools" exam question.

### Section B

**B1 — True.** Tool selection is model-driven by default, but you can steer it using the Instructions parameter and configurable tool selection rules — it's guidance, not a hard override.

**B2 — False.** The module explicitly notes that retrieved content can change over time, so repeated runs of the same query can produce different answers — the opposite of a guaranteed fixed snapshot.

**B3 — False.** `file_search` uses *semantic* retrieval: it matches on meaning rather than requiring exact keyword overlap, which is precisely what lets a differently-phrased question find the right passage. Reading it as plain keyword search is the common mistake.

**B4 — False.** Best practice explicitly warns: never trust tool arguments blindly in production — validate function inputs, since incorrect or unexpected arguments can occur.

**B5 — True.** Common packages like pandas, numpy, and matplotlib are pre-installed in the `code_interpreter` sandbox, per the module's best-practices list.

### Section C

**C1 — C.** This is squarely `file_search`'s use case: grounding answers in your own uploaded documents, with `include=["file_search_call.results"]` giving you the citation/traceability requirement. `web_search` (A) would pull from the public internet, not your internal PDF; `code_interpreter` (B) isn't designed for document retrieval/grounding; the `function` tool (D) would require you to build and maintain a custom function instead of using the built-in retrieval tool made for this exact job.

**C2 — D.** Stock price = fresh, publicly available, frequently changing data → `web_search`. Personal order status = a lookup against your own internal system → the `function` tool calling your custom API. `file_search` and `code_interpreter` aren't suited to either half of this request — file_search needs pre-indexed documents (not live stock prices or live order data), and code_interpreter has no external network or system access.

---

## Score Guide

| Score | Assessment |
|---|---|
| 16–17 / 17 | Strong grasp — ready to move to the next module |
| 12–15 / 17 | Solid, but review the missed concepts before moving on |
| 8–11 / 17 | Gaps remain — reread the relevant unit(s) before retaking |
| ≤7 / 17 | Revisit the full module content before attempting a retake |
