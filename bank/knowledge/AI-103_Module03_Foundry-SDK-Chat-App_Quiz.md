# AI-103 Quiz — Module 3: Develop a generative AI chat app with Microsoft Foundry

**Source:** https://learn.microsoft.com/en-us/training/modules/foundry-sdk/
**Units covered:** Explore with the model playground | Choose an endpoint and SDK | Generate responses with the Responses API | Generate responses with the ChatCompletions API
**Domain:** Implement generative AI and agentic solutions (30–35%) — Build generative applications by using Foundry

---

## Section A — Multiple Choice

**A1.** Which SDK is required in addition to the Foundry SDK (`azure-ai-projects`) if you want to chat with models via a Foundry project endpoint?
A. Azure Identity SDK
B. OpenAI SDK
C. Azure CLI
D. Azure Storage SDK

**A2.** What format does the Foundry **project** endpoint follow?
A. `https://{resource-name}.openai.azure.com/openai/v1`
B. `https://ai.azure.com/api/{resource-name}`
C. `https://{resource-name}.services.ai.azure.com/api/projects/<project-name>`
D. `https://{project-name}.foundry.azure.com`

**A3.** Which method on an `AIProjectClient` object returns an OpenAI-compatible client you can use to chat with a model?
A. `get_openai_client()`
B. `get_chat_client()`
C. `create_chat_session()`
D. `connect()`

**A4.** Which of these is a Foundry-native capability, accessible via `AIProjectClient`, that has no direct OpenAI SDK equivalent?
A. Sending a chat prompt
B. Retrieving resource connections and managing datasets/indexes
C. Setting the temperature parameter
D. Streaming a response

**A5.** Which authentication method does Microsoft recommend for production applications, regardless of whether you use the Foundry SDK or the OpenAI SDK?
A. API key stored directly in code
B. A shared connection string
C. Anonymous access
D. Microsoft Entra ID

**A6.** What does the Responses API combine into a single, unified experience?
A. ChatCompletions and Assistants API patterns
B. Translator and Speech APIs
C. Content Understanding and Document Intelligence
D. Evaluation and Benchmarking APIs

**A7.** Which parameter links two `responses.create()` calls together so conversation context is automatically maintained?
A. `conversation_id`
B. `session_token`
C. `previous_response_id`
D. `context_window`

**A8.** In the ChatCompletions API, how must you maintain conversational context across multiple turns?
A. By manually appending each user and assistant message to a `messages` list and resending the full list every turn
B. Automatically — the API tracks it for you
C. By passing a `previous_response_id`
D. You cannot maintain context with ChatCompletions

**A9.** When streaming a Responses API call, which event type indicates the stream has finished and lets you capture the final response ID?
A. `response.output_text.delta`
B. `response.completed`
C. `response.started`
D. `response.error`

---

## Section B — True / False

**B1.** The Responses API is stateful, while the ChatCompletions API requires you to manage conversation history manually.

**B2.** Using the Responses API's `previous_response_id` tracking means token usage no longer grows as a conversation gets longer, since the SDK automatically compresses history.

**B3.** Foundry direct models (e.g., Microsoft Phi, DeepSeek) can only be accessed through the ChatCompletions API, not the Responses API.

**B4.** You should generally prefer the plain `OpenAI` client object over the `AzureOpenAI` client object when chatting through the Azure OpenAI v1 endpoint, reserving `AzureOpenAI` for cases where you need a specific Azure OpenAI API version's functionality.

**B5.** The Model playground's **Code** button lets you generate sample code with choices for API (Responses/ChatCompletions), programming language, and SDK.

---

## Section C — Scenario Questions

**C1.** You're building a production app that needs to create and manage AI agents, invoke tools with an approval workflow, and run cloud evaluations against a test dataset — all from the same client library. Which SDK should you build around?
A. The OpenAI SDK, for maximum portability
B. Neither — you must call the REST APIs directly
C. Either — they're functionally identical
D. The Foundry SDK, since it exposes agent management, tool-approval workflows, and cloud evaluations that the OpenAI SDK doesn't provide

**C2.** Your team maintains an existing app already built against the OpenAI ChatCompletions API on another platform. You're porting it to use a Foundry-hosted Azure OpenAI model with minimal code changes, and you don't need agents or Foundry-specific project features. Which approach fits best?
A. Rewrite everything using `AIProjectClient` and Foundry-native APIs
B. Use the Responses API exclusively, since ChatCompletions is deprecated
C. Use the OpenAI SDK connected to the Azure OpenAI endpoint, keeping the existing ChatCompletions-based code largely intact
D. This isn't possible — the OpenAI SDK doesn't work with Azure OpenAI endpoints

---
---

# Answer Key

### Section A

**A1 — B.** The module explicitly notes that when using the Foundry SDK for chat, you also need the OpenAI SDK package, because the Foundry SDK's chat client functionality is derived from it. Azure Identity (A) is needed for authentication, not chat itself.

**A2 — C.** The project endpoint format is `https://{resource-name}.services.ai.azure.com/api/projects/<project-name>`. (A) is the *Azure OpenAI* endpoint format instead — a classic "which endpoint" mix-up the exam could test.

**A3 — A.** `get_openai_client()` on the `AIProjectClient` returns an OpenAI-compatible client object you use to submit prompts and get responses. The other method names are invented distractors.

**A4 — B.** Foundry-native operations without an OpenAI equivalent include retrieving resource connections, accessing project configuration, enabling tracing, and managing datasets/indexes. (A), (C), (D) are all inference-time chat operations available through the OpenAI-compatible client, not Foundry-exclusive features.

**A5 — D.** Microsoft Entra ID is the recommended production authentication method across both SDK choices; API keys and token-based auth are supported but are the less-preferred alternatives.

**A6 — A.** The Responses API unifies patterns from the previously separate ChatCompletions and Assistants APIs into one stateful, multi-turn experience.

**A7 — C.** `previous_response_id` links a new `responses.create()` call to a prior response, so the model has access to the earlier turn's context automatically — no manual message-list management required (contrast with A8).

**A8 — A.** Unlike the Responses API, ChatCompletions has no built-in state tracking — your code must append each new user/assistant message to a `messages` list and resend the entire list on every call.

**A9 — B.** The `response.completed` event signals the stream has finished, and its payload includes the response object (with `.id`) you can capture for later use — e.g., as a `previous_response_id`. `response.output_text.delta` (A) fires repeatedly during streaming for incremental text, not completion.

### Section B

**B1 — True.** This is the core distinguishing feature between the two APIs: Responses tracks state via `previous_response_id`; ChatCompletions requires you to manually rebuild and resend the message history each turn.

**B2 — False.** The module is explicit that the SDK helps manage state but does **not** make token usage cheaper — the full context (instructions, current prompt, conversation history, tool schemas/outputs, retrieved documents) is still concatenated and sent on every request. Longer conversations still cost more tokens.

**B3 — False.** The Responses API explicitly supports Foundry direct models (like Microsoft Phi or DeepSeek) when connecting through the project endpoint with the Foundry SDK or `AzureOpenAI` client — it isn't limited to ChatCompletions.

**B4 — True.** The module states you should generally use the plain `OpenAI` client object for the Azure OpenAI v1 endpoint, and only reach for `AzureOpenAI` (which requires specifying `api_version` and `azure_endpoint`) when you need functionality tied to a specific API version.

**B5 — True.** The Code button in the Model playground generates code samples with selectable API, language, and SDK options, pre-populated with your project endpoint, deployment name, and current settings.

### Section C

**C1 — D.** Agent management, tool invocation/approval workflows, and cloud evaluations are explicitly listed as reasons to use the Foundry SDK — the OpenAI SDK doesn't provide these Foundry-specific, project-level features. This is a strong signal for "which SDK" scenario questions: look for agents/evaluations/tracing/governance keywords pointing to Foundry SDK, versus portability/compatibility keywords pointing to OpenAI SDK.

**C2 — C.** This scenario is explicitly the OpenAI SDK's strength: full OpenAI API compatibility, minimal dependency on Foundry-specific concepts, and portability of existing ChatCompletions-based code — connected via the Azure OpenAI endpoint instead of the project endpoint. (B) is a trap: ChatCompletions isn't deprecated, just no longer the *recommended* choice for *new* development.

---

## Score Guide

| Score | Assessment |
|---|---|
| 15–16 / 16 | Strong grasp — ready to move to the next module |
| 11–14 / 16 | Solid, but review the missed concepts before moving on |
| 7–10 / 16 | Gaps remain — reread the relevant unit(s) before retaking |
| ≤6 / 16 | Revisit the full module content before attempting a retake |
