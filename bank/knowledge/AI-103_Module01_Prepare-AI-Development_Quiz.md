# AI-103 Quiz — Module 1: Plan and prepare to develop AI solutions on Azure

**Source:** https://learn.microsoft.com/en-us/training/modules/prepare-azure-ai-development/
**Units covered:** What is AI? | Microsoft Foundry | Foundry Tools | Developer tools and SDKs | Responsible AI
**Domain:** Plan and manage an Azure AI solution (25–30%)

---

## Section A — Multiple Choice

**A1.** What differentiates Foundry Tools from building a custom generative AI agent for the same task (e.g., sentiment analysis)?
A. Foundry Tools always cost more than agent-based solutions
B. Foundry Tools provide prebuilt, task-specific APIs that are more cost-effective and predictable than relying on generative AI agents alone
C. Foundry Tools require you to train your own model first
D. Foundry Tools can only be accessed through the Azure portal UI

**A2.** In Microsoft Foundry's resource hierarchy, what is the relationship between a Foundry *resource* and Foundry *projects*?
A. One project can span multiple Foundry resources
B. A resource and a project are two names for the same object
C. A Foundry resource can support one or more child projects, with one designated as the default
D. Each Foundry resource can have exactly one project

**A3.** Which two endpoints can you use to interact with models deployed in a Foundry project?
A. The project endpoint (Foundry APIs/SDKs) and the Azure OpenAI endpoint (OpenAI APIs/SDKs)
B. The Azure Portal endpoint and the GitHub endpoint
C. The Content Understanding endpoint and the Translator endpoint
D. Only the Azure OpenAI endpoint — Foundry doesn't expose its own endpoint

**A4.** What is Foundry IQ used for?
A. Creating a single, central MCP-based knowledge connection so agents can draw on multiple knowledge sources
B. Deploying LLMs to production environments
C. Monitoring token usage and cost across a project
D. Managing CI/CD pipelines for model deployment

**A5.** An agent in Microsoft Foundry is defined by combining which three elements?
A. A model, a dataset, and a UI
B. A prompt, a temperature setting, and a max token limit
C. A resource group, a region, and a SKU
D. An LLM, instructions, and tools

**A6.** What is the correct chronological order of names for what is now called "Foundry Tools"?
A. Azure AI Services → Azure Cognitive Services → Foundry Tools
B. Azure Applied AI Services → Foundry Tools (no other prior name)
C. Azure Cognitive Services → Azure AI Services → Foundry Tools
D. Azure ML Services → Azure AI Services → Foundry Tools

**A7.** You need to extract structured fields (totals, line items, dates) from a scanned invoice. Which Foundry Tool is purpose-built for this, as distinct from the more general multimodal Content Understanding tool?
A. Azure Language
B. Azure Document Intelligence
C. Azure Translator
D. Azure Speech

**A8.** Which tool simplifies browsing Foundry project resources, deploying models, and testing agents directly inside an editor?
A. Foundry Toolkit extension for Visual Studio Code
B. GitHub Copilot
C. Azure CLI
D. IntelliCode

---

## Section B — True / False

**B1.** Foundry Tools SDKs are the *only* way to access Foundry Tools functionality — there's no REST API option.

**B2.** A "classic" (hub-based) Foundry project uses a different architecture from the newer project structure this module describes, and Microsoft still documents it separately.

**B3.** Per Microsoft's responsible AI principles, "Transparency" means users should be informed of a model's limitations and, where relevant, given information about confidence in its predictions.

**B4.** Agent tools in Foundry can only use Microsoft's built-in functionality (web search, code interpreter) — third-party and custom tools aren't supported.

---

## Section C — Scenario Questions

**C1.** You're building a customer-support agent that must: (1) answer questions using your company's internal knowledge base, (2) call a custom REST API to check order status, and (3) reason across multi-turn conversations. Which combination of Foundry concepts best supports this?
A. Deploy an LLM only — a single model call handles everything, no agent needed
B. Use only Azure Translator to standardize language before calling the LLM
C. Use Azure Document Intelligence exclusively to cover all three requirements
D. Build an agent combining an LLM + instructions + tools (a custom function/API tool plus a Foundry IQ knowledge connection), with conversation tracking

**C2.** Your team wants predictable, low-cost sentiment analysis on thousands of customer reviews without building or maintaining a custom LLM prompting pipeline. Which approach best fits the guidance in this module?
A. Build a multi-agent generative AI system with self-critique loops
B. Use Azure Content Understanding pro-mode pipelines
C. Use Azure Language (a Foundry Tool) for sentiment analysis instead of relying on generative AI agents alone
D. Fine-tune a large multimodal model

---
---

# Answer Key

### Section A

**A1 — B.** Foundry Tools exist precisely because off-the-shelf, task-specific APIs are often more cost-effective and predictable than routing everything through a generative AI agent. (A) is unsupported and generally backwards. (C) is wrong — they're prebuilt, no training required. (D) is wrong — they're consumed via tool-specific endpoints/APIs/SDKs, not just the portal.

**A2 — C.** A single Foundry resource can host multiple child projects, one of which is the default. (A) reverses the relationship — a project belongs to one resource. (B) conflates two distinct objects. (D) is a common exam trap; it's "one or more," not "exactly one."

**A3 — A.** The project endpoint uses Foundry-specific APIs/SDKs; the Azure OpenAI endpoint uses OpenAI-compatible APIs/SDKs for models that support that syntax. (B) and (C) name unrelated services. (D) is false — the project endpoint is a primary access path.

**A4 — A.** Foundry IQ centralizes multiple knowledge sources behind a single MCP-based connection so agents don't need a separate integration per source. (B), (C), (D) describe other parts of Foundry (deployment, monitoring, CI/CD) unrelated to knowledge integration.

**A5 — D.** Agent = LLM + instructions (defines responsibilities) + tools (finds knowledge/automates tasks). The other options invent unrelated triads — a classic "sounds plausible" distractor pattern.

**A6 — C.** Order matters here: **Cognitive Services** (original name) → **Azure AI Services** (rename) → **Foundry Tools** (current name). Expect the exam to test this renaming lineage since older docs/SDKs still reference the earlier names.

**A7 — B.** Document Intelligence is specifically for extracting fields from *structured/semi-structured documents* like invoices, receipts, and forms. Content Understanding is the broader multimodal sibling (documents *and* images, video, audio) — the exam will likely test you distinguishing these two. (A), (C), (D) are unrelated modalities.

**A8 — A.** The Foundry Toolkit extension for VS Code is purpose-built for this workflow (browsing resources, deploying models, testing in playgrounds, generating integration code). GitHub Copilot (B) is a general coding assistant, not Foundry-specific.

### Section B

**B1 — False.** The module explicitly states Foundry Tools can also be consumed via REST APIs, not just SDKs.

**B2 — True.** The module calls out that classic (hub-based) Foundry projects use a different architecture and points to separate documentation for them — a good sign the exam may probe whether you know "classic" still exists and differs.

**B3 — True.** This is the textbook description of Transparency: understandability, awareness of limitations, and confidence-score communication. (Don't confuse with Accountability, which is about who is answerable for the system, not what users are told.)

**B4 — False.** Agents can use built-in tools *or* connect to custom/third-party tools via Model Context Protocol (MCP) connections — this is a key exam distinction (built-in vs. MCP-based extensibility).

### Section C

**C1 — D.** All three requirements map directly onto agent components: tools (custom API call), knowledge (Foundry IQ connection to the internal knowledge base), and conversation-tracking as an explicit agent capability. (A) ignores that multi-turn state and tool-calling require an agent, not a bare model call. (B) and (C) each only solve a narrow slice of the problem.

**C2 — C.** This is the exact use case Foundry Tools are positioned for — predictable, cost-effective, prebuilt functionality (Azure Language) instead of an LLM/agent pipeline for a well-defined, high-volume task. (A) and (D) are needlessly complex/expensive for straightforward sentiment analysis. (B) is the wrong tool family — Content Understanding targets multimodal extraction, not text sentiment specifically.

---

## Score Guide

| Score | Assessment |
|---|---|
| 13–14 / 14 | Strong grasp — ready to move to the next module |
| 10–12 / 14 | Solid, but review the missed concepts before moving on |
| 7–9 / 14 | Gaps remain — reread the relevant unit(s) before retaking |
| ≤6 / 14 | Revisit the full module content before attempting a retake |
