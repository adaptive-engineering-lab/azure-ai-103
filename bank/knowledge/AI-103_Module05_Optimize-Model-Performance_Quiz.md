# AI-103 Quiz — Module 5: Optimize generative AI model performance with Microsoft Foundry

**Source:** https://learn.microsoft.com/en-us/training/modules/optimize-generative-ai-model-performance/
**Units covered:** Optimize model output with prompt engineering | Ground your model with Retrieval Augmented Generation | Fine-tune a model for consistent behavior | Compare and combine optimization strategies
**Domain:** Implement generative AI and agentic solutions (30–35%) — Optimize and operationalize generative AI systems / Build generative applications by using Foundry

---

## Section A — Multiple Choice

**A1.** Which four components typically make up a prompt for chat completion models?
A. System message, user message, assistant message, examples
B. Temperature, top_p, max tokens, stop sequence
C. Retrieval, augmentation, generation, evaluation
D. Persona, format, chain-of-thought, few-shot

**A2.** Chain-of-thought prompting is described as a technique primarily intended for:
A. Reasoning models like the o-series, which need explicit step-by-step guidance
B. Non-reasoning models — reasoning models handle step-by-step logic internally
C. Embedding models only
D. Fine-tuned models exclusively

**A3.** What's the general recommendation regarding the `temperature` and `top_p` parameters?
A. Adjust one or the other, not both at the same time
B. Always max out both for creative tasks
C. Always set both to 0 for factual tasks
D. They must always be set to the same value

**A4.** What does "recency bias" refer to in prompt engineering?
A. The model only accepts prompts submitted within the last 5 minutes
B. The model prefers the most recently released tools over older ones
C. Older training data is weighted more heavily than recent data
D. Text near the end of a prompt can have more influence than text at the beginning

**A5.** What are the three steps of the RAG pattern, in order?
A. Generate, Augment, Retrieve
B. Retrieve, Augment, Generate
C. Retrieve, Generate, Augment
D. Augment, Retrieve, Generate

**A6.** What does a cosine similarity value near 1 indicate when comparing two embeddings?
A. The vectors are very dissimilar
B. The embedding model failed to process the input
C. The vectors are very similar
D. The two source documents use identical wording

**A7.** Which Azure AI Search technique combines keyword, semantic, and vector search, and is recommended for generative AI applications?
A. Keyword search
B. Semantic search
C. Vector search
D. Hybrid search

**A8.** What underlying technique does Foundry's fine-tuning use to make training faster and more cost-effective than retraining all of a model's parameters?
A. Chain-of-thought distillation
B. LoRA (Low-Rank Adaptation)
C. Hybrid search indexing
D. Cosine similarity optimization

**A9.** Which fine-tuning type uses preferred/non-preferred response pairs and is computationally lighter than traditional reinforcement learning while being equally effective at alignment?
A. Supervised fine-tuning (SFT)
B. Reinforcement fine-tuning (RFT)
C. Direct Preference Optimization (DPO)
D. Chain-of-thought fine-tuning

**A10.** Per the module's decision framework, what should you do before considering fine-tuning?
A. Evaluate the baseline performance of a standard model against your requirements first
B. Immediately fine-tune without testing anything else, since it's always the most accurate approach
C. Disable prompt engineering entirely
D. Set up Azure AI Search regardless of whether RAG is actually needed

---

## Section B — True / False

**B1.** A well-crafted system message guarantees the model will always comply with its instructions.

**B2.** Few-shot learning refers to providing one or more input/output examples in the prompt, while zero-shot means no examples are provided.

**B3.** RAG can give a model access to information published after its training cutoff date, since it retrieves current data at query time.

**B4.** Fine-tuning with Foundry always requires retraining all of the model's parameters from scratch, which is why it's more expensive than RAG.

**B5.** Leaving the system message blank in fine-tuning training data tends to produce lower-accuracy models, and you should use the same system message at inference time as you did during training.

**B6.** According to the strategy comparison, RAG has the lowest implementation time, complexity, and cost of the three strategies, while prompt engineering has the highest of all three.

---

## Section C — Scenario Questions

**C1.** Your travel-agency chatbot needs to (a) always answer in a very specific, tightly controlled brand voice regardless of how the user phrases their question, and (b) always quote current, real hotel prices and availability from your live catalog. Which combination of strategies best satisfies both requirements?
A. Prompt engineering alone — a sufficiently detailed system message can achieve both
B. Fine-tuning alone, since it embeds behavior into the model's weights
C. Fine-tuning (for consistent brand voice) + RAG (for up-to-date pricing/availability data)
D. RAG alone, since it can also enforce tone and style

**C2.** You've written a detailed system message and several few-shot examples. The model now handles tone and format well, but it keeps inventing hotel names that don't exist in your actual inventory. Following the module's decision framework, what should you do next?
A. Immediately fine-tune the model on your brand voice, since consistency is the issue
B. Nothing further is needed — this is expected behavior
C. Increase the temperature parameter to reduce hallucination
D. Add RAG so the model retrieves and is grounded in your actual hotel catalog data

---
---

# Answer Key

### Section A

**A1 — A.** System message, user message, assistant message, and examples are the four prompt components described. (B) lists model parameters, not prompt components; (C) describes RAG's steps (plus evaluation, which isn't a RAG step either); (D) lists prompt *patterns*, not components.

**A2 — B.** The module explicitly notes chain-of-thought prompting is a technique for **non-reasoning** models — reasoning models (o-series) already handle step-by-step logic internally, so explicitly prompting them to "think step by step" isn't the same kind of technique. This inverted expectation (you'd assume CoT is *for* reasoning models) is a strong exam trap.

**A3 — A.** The general recommendation is to adjust temperature *or* top_p, not both simultaneously — changing both at once makes it harder to reason about the effect on output randomness.

**A4 — D.** Recency bias means text near the *end* of a prompt can carry more influence than text near the beginning — which is why the module recommends repeating a key instruction at the end of a prompt if the model isn't following it consistently.

**A5 — B.** Retrieve (search for relevant info) → Augment (add it to the prompt as context) → Generate (send the augmented prompt to the model). Memorize this order — a question could ask you to sequence RAG steps or identify what happens at a given stage.

**A6 — C.** Cosine similarity measures the angle between two vectors; a value near 1 means the vectors — and therefore the underlying text's meaning — are very similar. This holds even when the exact wording differs, which is the whole point of semantic/vector search.

**A7 — D.** Hybrid search combines keyword, semantic, and vector search and is explicitly called out as the recommended approach for generative AI applications — worth remembering over any single search type alone.

**A8 — B.** LoRA (Low-Rank Adaptation) updates only a smaller subset of important parameters instead of retraining the whole model, which is what makes fine-tuning faster and more cost-effective while preserving quality.

**A9 — C.** DPO aligns the model using preferred/non-preferred response pairs and is explicitly described as computationally lighter than traditional RL while being equally effective. SFT (A) uses labeled prompt-response pairs for well-defined tasks; RFT (B) uses a grader for iterative reward-based feedback on complex/dynamic tasks — a good trio to keep distinct since the exam will likely test "which fine-tuning type for which scenario."

**A10 — A.** The module explicitly warns to always establish a baseline with a standard model first — without one, you can't tell whether fine-tuning actually improved or degraded performance.

### Section B

**B1 — False.** The module explicitly states a system message *influences* the model but doesn't *guarantee* compliance — you should test, iterate, and layer it with other mitigations like content filtering and evaluation.

**B2 — True.** Few-shot (or one-shot for a single example) provides example input/output pairs in the prompt; zero-shot provides none. This terminology trio (zero-shot / one-shot / few-shot) is classic exam recall material.

**B3 — True.** This is exactly why RAG exists as a complement to a model's static training data — it retrieves current information at query time, sidestepping the training cutoff limitation entirely.

**B4 — False.** Fine-tuning in Foundry uses LoRA, which updates only a subset of parameters — not a full retrain from scratch. It's still more expensive than prompt engineering, but the *reason* given for fine-tuning's higher cost in the comparison table is training compute + model hosting, not "retraining every parameter."

**B5 — True.** The module explicitly calls out both points: a blank system message in training data tends to lower accuracy, and you should use the identical system message at inference time that you used during training — inconsistency between the two undermines the fine-tuning benefit.

**B6 — False.** The ranking is inverted here. The comparison table puts prompt engineering at Low across time/complexity/cost, RAG at Medium across all three, and fine-tuning at High across all three — so prompt engineering is the cheapest and fastest of the three, not the most expensive.

### Section C

**C1 — C.** This scenario needs both dimensions the module explicitly separates: fine-tuning for consistent behavior/style (brand voice regardless of phrasing) and RAG for accurate, current factual grounding (real prices/availability). Prompt engineering alone (A) can't guarantee either at a "always" level of reliability, and neither fine-tuning alone (B) nor RAG alone (D) fully covers both requirements — RAG doesn't reliably enforce tone/style, and fine-tuning alone won't reflect live, frequently changing pricing data.

**C2 — D.** This is a textbook RAG trigger: the model already handles tone/format (prompt engineering is doing its job), but it lacks accurate domain-specific knowledge — its own training data doesn't include your actual hotel inventory, so it's fabricating plausible-sounding but false names. That's precisely the failure mode RAG is designed to fix by grounding responses in retrieved real data. Fine-tuning (A) addresses consistency of style, not lack of factual knowledge; raising temperature (C) would make fabrication *worse*, not better.

---

## Score Guide

| Score | Assessment |
|---|---|
| 17–18 / 18 | Strong grasp — ready to move to the next module |
| 13–16 / 18 | Solid, but review the missed concepts before moving on |
| 9–12 / 18 | Gaps remain — reread the relevant unit(s) before retaking |
| ≤8 / 18 | Revisit the full module content before attempting a retake |
