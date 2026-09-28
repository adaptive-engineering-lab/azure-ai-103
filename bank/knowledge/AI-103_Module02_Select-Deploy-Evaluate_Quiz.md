# AI-103 Quiz — Module 2: Select, deploy, and evaluate Microsoft Foundry models

**Source:** https://learn.microsoft.com/en-us/training/modules/model-catalog-evaluate/
**Units covered:** Explore the model catalog | Select models using benchmarks | Deploy models to endpoints | Evaluate model performance
**Domain:** Implement generative AI and agentic solutions (30–35%) — Build generative applications by using Foundry

---

## Section A — Multiple Choice

**A1.** Which model type is best suited for a scenario that needs to run on edge devices, prioritizing speed and cost over handling the most complex reasoning tasks?
A. Large Language Model (LLM)
B. Small Language Model (SLM)
C. Reasoning model
D. Embedding model

**A2.** Which model category converts text into numerical representations, enabling semantic search and Retrieval Augmented Generation (RAG)?
A. Embedding models
B. Reasoning models
C. Chat completion models
D. Image analysis models

**A3.** In the Foundry model catalog's Quality index, what does a higher value indicate?
A. Lower cost per token
B. Better compliance with safety policy
C. Faster response latency
D. Stronger overall performance averaged across reasoning, knowledge, QA, math, and coding benchmarks

**A4.** Which benchmark dataset(s) specifically measure code generation capability?
A. GPQA
B. HumanEval+ and MBPP+
C. MATH
D. IFEval

**A5.** For the HarmBench safety benchmark, which statement is correct?
A. A lower Attack Success Rate (ASR) indicates a safer, more robust model
B. A higher Attack Success Rate (ASR) indicates a safer model
C. ASR measures cost per token
D. ASR only applies to embedding models

**A6.** On the WMDP (Weapons of Mass Destruction Proxy) benchmark, what does a *higher* score indicate about a model?
A. The model is safer overall
B. The model demonstrates more knowledge of potentially dangerous capabilities (biosecurity/cybersecurity/chemical security) — a red flag, not a positive
C. The model is cheaper to run at scale
D. The model has stronger general reasoning ability

**A7.** How does Microsoft Foundry calculate a model's "Estimated cost" benchmark?
A. Output tokens only
B. A 1:1 ratio of input to output tokens
C. A 3:1 ratio of input tokens to output tokens
D. Input tokens only

**A8.** Which deployment type is intended specifically for fine-tuned model *evaluation only*, not general production traffic?
A. Global Standard
B. Standard
C. Developer
D. Global Batch

**A9.** Which deployment type offers roughly a 50% discount for large asynchronous jobs completed within 24 hours?
A. Global Provisioned
B. Regional Provisioned
C. Data Zone Standard
D. Global Batch

**A10.** Which authentication method does Microsoft recommend for production scenarios when an application accesses a deployed model?
A. Microsoft Entra ID authentication
B. Authentication key only
C. Shared Access Signature (SAS) tokens
D. Anonymous access

---

## Section B — True / False

**B1.** Groundedness Pro provides a binary (grounded / not grounded) assessment, which is useful when you need a clear factual-accuracy signal.

**B2.** NLP metrics like BLEU, ROUGE, and METEOR all require ground truth/reference text, which makes them especially well suited to open-ended, free-form generation tasks where many valid responses exist.

**B3.** The Foundry Evaluation feature lets you base an evaluation on a Model, an Agent, or a pre-generated Dataset.

**B4.** Defect rate for the protected material and indirect-attack (jailbreak) safety metrics is calculated as (true instances / total instances) × 100.

**B5.** ROUGE emphasizes precision over recall, which is why it's the preferred metric for evaluating machine translation quality.

**B6.** When your application maps to a specific use case like coding or math, you should still prefer the general Quality index over the relevant scenario leaderboard, since it aggregates results across more benchmarks.

---

## Section C — Scenario Questions

**C1.** Your application is a customer-facing chatbot serving EU users. Your organization requires that data remain within an EU data zone at all times, and you want predictable pay-per-token billing rather than reserved throughput capacity. Which deployment type best fits?
A. Global Standard
B. Global Batch
C. Regional Provisioned
D. Data Zone Standard

**C2.** You're evaluating a RAG-based support agent and want an automated metric that tells you whether the agent's answers are actually derived from the retrieved documents (rather than the model speculating), with a clear binary pass/fail signal suitable for a factual-accuracy audit. Which metric fits best?
A. Fluency
B. Coherence
C. Groundedness Pro
D. BLEU

---
---

# Answer Key

### Section A

**A1 — B.** SLMs (like Phi-4, Llama 3 8B) trade deep reasoning power for efficiency, cost-effectiveness, and the ability to run on lower-end/edge hardware. LLMs (A) are the opposite trade-off. (C) and (D) are task-specific categories, not a speed/cost-vs-capability axis.

**A2 — A.** Embedding models (e.g., Ada, Cohere) convert text into numerical vector representations used for semantic search, recommendations, and RAG retrieval — not for generating conversational text.

**A3 — D.** The Quality index averages accuracy scores across multiple benchmark datasets (reasoning, knowledge, QA, math, coding) into a single normalized 0–1 value. It says nothing directly about cost (A) or latency (C) — those are separate benchmark categories entirely.

**A4 — B.** HumanEval+ and MBPP+ are the code-generation-specific datasets. GPQA (A) is graduate-level multi-discipline QA, MATH (C) is mathematical reasoning, and IFEval (D) tests instruction-following — a good reminder to memorize which dataset maps to which skill, since "which benchmark tests X" is a classic recall question.

**A5 — A.** Lower ASR = safer/more robust, since ASR measures how often adversarial prompts successfully elicit unsafe content. This is a common gotcha because with most "quality" metrics higher = better, but ASR is an attack-success metric, so the direction flips.

**A6 — B.** WMDP is unusual: a *higher* score means the model knows *more* about dangerous capabilities (bio/cyber/chemical security) — which is undesirable from a safety standpoint. This inverted-direction benchmark is a prime exam trap; don't assume "higher is better" applies universally across all benchmark categories.

**A7 — C.** Estimated cost combines input and output token pricing using a 3:1 input:output ratio to produce one comparable number. Memorize this ratio specifically — a question could ask you to interpret or recompute an estimated cost figure.

**A8 — C.** Developer deployments exist specifically to evaluate fine-tuned models, not to serve production traffic — a subtle but testable distinction versus Standard/Global Standard, which are general-purpose.

**A9 — D.** Global Batch deployments give ~50% cost savings for large asynchronous jobs processed within a 24-hour window — trading turnaround time for cost, a good fit for non-interactive batch workloads.

**A10 — A.** Microsoft Entra ID authentication is recommended for production; authentication keys are supported but treated as the less secure alternative. (C) isn't a Foundry deployment auth mechanism; (D) is never appropriate.

### Section B

**B1 — True.** Groundedness Pro specifically offers a binary grounded/not-grounded verdict, distinct from scalar groundedness scoring, and is useful where you need a hard pass/fail for factual accuracy.

**B2 — False.** NLP metrics do require ground truth, but that's exactly *why* they're **less** suitable for open-ended generation — there's no single "correct" reference text to compare against when many valid responses exist. The module explicitly states this limitation.

**B3 — True.** The three evaluation bases in Foundry are Model (system generates outputs during eval), Agent (evaluating agent responses), and Dataset (evaluating pre-generated outputs already present in the data).

**B4 — True.** This is the exact formula given for protected material and indirect attack (jailbreak) defect rate — worth memorizing verbatim since it could appear as a "which formula" question.

**B5 — False.** ROUGE emphasizes **recall** over precision (good for summarization, where covering key points matters most). BLEU is the metric more associated with machine translation, using n-gram comparison. Mixing up ROUGE vs. BLEU's primary use case is a very testable confusion.

**B6 — False.** It is the other way round. The module recommends starting with the relevant scenario leaderboard (reasoning, coding, math, QA, groundedness) when your application maps to a specific use case, and falling back to the general-purpose Quality index only when it does not. Breadth of aggregation is not the deciding factor — task fit is.

### Section C

**C1 — D.** Data Zone Standard keeps data within a specific data zone (matching the EU compliance requirement) while still billing pay-per-token (matching "predictable, not reserved-throughput" billing). Global Standard (A) doesn't guarantee data-zone residency; Regional Provisioned (C) uses reserved PTUs, not pay-per-token; Global Batch (B) is for async batch jobs, not a live chatbot.

**C2 — C.** Groundedness Pro is purpose-built for exactly this: verifying responses are based on provided context rather than the model speculating, with a binary output suitable for an audit trail. Fluency (A) and Coherence (B) assess writing quality, not factual grounding. BLEU (D) needs reference text and isn't designed to assess groundedness against retrieved context.

---

## Score Guide

| Score | Assessment |
|---|---|
| 17–18 / 18 | Strong grasp — ready to move to the next module |
| 13–16 / 18 | Solid, but review the missed concepts before moving on |
| 9–12 / 18 | Gaps remain — reread the relevant unit(s) before retaking |
| ≤8 / 18 | Revisit the full module content before attempting a retake |
