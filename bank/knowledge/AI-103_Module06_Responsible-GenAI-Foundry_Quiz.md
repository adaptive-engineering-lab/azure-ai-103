# AI-103 Quiz — Module 6: Implement a responsible generative AI solution in Microsoft Foundry

**Source:** https://learn.microsoft.com/en-us/training/modules/responsible-ai-studio/
**Units covered:** Plan a responsible generative AI solution | Map potential harms | Measure potential harms | Mitigate potential harms | Manage a responsible generative AI solution
**Domain:** Plan and manage an Azure AI solution (25-30%) — Implement responsible AI across generative AI and agentic systems

---

## Section A — Multiple Choice

**A1.** What are the four stages of Microsoft's responsible generative AI process, in order?
A. Map, Mitigate, Measure, Manage
B. Map, Measure, Mitigate, Manage
C. Measure, Map, Mitigate, Manage
D. Manage, Map, Measure, Mitigate

**A2.** The four stages of the responsible generative AI process correspond closely to the functions of which framework?
A. ISO/IEC 27001
B. GDPR
C. NIST AI Risk Management Framework
D. OWASP Top 10 for LLM Applications

**A3.** Within the Map stage, what is the correct order of the four steps?
A. Prioritize, Identify, Test and verify, Document and share
B. Identify, Test and verify, Prioritize, Document and share
C. Identify, Prioritize, Document and share, Test and verify
D. Identify, Prioritize, Test and verify, Document and share

**A4.** A smart kitchen copilot might give inaccurate cooking times (likely to occur often) or provide a lethal poison recipe when prompted (rare, but catastrophic). How does the module say harms should be prioritized?
A. Always rank by severity of impact alone, so the poison recipe is always first
B. Always rank by frequency alone, so inaccurate cooking times are always first
C. Assess both likelihood and impact, taking intended use and potential misuse into account; the final call can be subjective and involve policy or legal experts
D. Prioritize whichever harm is cheapest to fix first

**A5.** What is the main purpose of the initial round of harm measurement in the Measure stage?
A. To create a baseline that quantifies harms so you can track improvements as you apply mitigations
B. To permanently certify the solution as safe
C. To replace the need for red teaming
D. To decide which model to deploy

**A6.** Which of the following is NOT one of the four layers at which harms are mitigated?
A. Model
B. Safety system
C. User experience
D. Network perimeter

**A7.** Which description of Foundry guardrail content filters matches the module?
A. Three severity levels (low, medium, high) across four categories
B. Four severity levels (safe, low, medium, high) across five categories: hate and fairness, sexual, violence, self-harm, and task-adherence
C. A binary pass/fail result across two categories
D. Five severity levels across three categories

**A8.** At which layers do *fine-tuning* and *retrieval augmented generation (RAG)* respectively sit as harm mitigations?
A. Fine-tuning: model layer; RAG: system message and grounding layer
B. Fine-tuning: safety system layer; RAG: model layer
C. Fine-tuning: user experience layer; RAG: safety system layer
D. Both sit in the model layer

---

## Section B — True / False

**B1.** Red teaming is only useful for finding security vulnerabilities, so it doesn't apply to finding harmful content from generative AI.

**B2.** Once you've automated harm testing and measurement, you no longer need to do any manual testing.

**B3.** The module recommends starting with manual testing of a small set of inputs to confirm results are consistent and evaluation criteria are well defined, then automating for larger volumes.

**B4.** Prompt shields in Foundry guardrails use abuse detection to identify attempts to systematically abuse the solution, such as a user trying to subvert the system prompt.

**B5.** Before wide release, the module recommends a phased delivery plan that first releases the solution to a restricted group of users.

---

## Section C — Scenario Questions

**C1.** Testing of your HR assistant reveals two problems: (1) it sometimes states company policy details that are inaccurate, and (2) users can trick it with prompts that try to override its system prompt. Which pair of mitigations best addresses both, mapped to the correct layers?
A. Fine-tune the model (model layer) and add a disclaimer in the UI (user experience layer)
B. Add RAG over trusted policy documents (system message and grounding layer) and enable prompt shields in guardrails (safety system layer)
C. Switch to a larger model (model layer) and raise the temperature (model layer)
D. Add RAG (grounding layer) and rely on the system message alone to stop prompt subversion, since system messages guarantee compliance

**C2.** Your team has mapped, measured, and mitigated harms, and the red-team results look good. A stakeholder wants to release to all users tomorrow. According to the Manage stage guidance, what is the best response?
A. Agree — good red-team results mean no further planning is needed
B. Release to everyone, and only build the incident response plan if a problem occurs
C. Skip reviews but add a disclaimer to the UI
D. Complete legal, privacy, security, and accessibility reviews, then release in phases to a restricted group, with an incident response plan, a rollback plan, the ability to block harmful responses and abusive users, and a feedback channel

---
---

# Answer Key

### Section A

**A1 — B.** The order is Map, Measure, Mitigate, Manage. The gotcha is that you Measure *before* you Mitigate: you need a baseline to know whether a mitigation actually helped. (A) swaps the middle two stages, which is the most tempting wrong answer.

**A2 — C.** The module notes these stages correspond closely to the NIST AI Risk Management Framework functions. The other options are real frameworks/regulations but aren't the one named.

**A3 — D.** Identify, Prioritize, Test and verify, then Document and share. Testing (red teaming) comes after prioritization, and documenting/sharing is the final step.

**A4 — C.** Prioritization weighs both likelihood and impact, and considers intended use as well as potential misuse. The module's own example shows the tension: poison has higher impact, but inaccurate cooking times are far more frequent. The final determination is a team discussion, sometimes involving policy or legal experts, and can be subjective. (A) and (B) each use only one factor.

**A5 — A.** The goal is an initial baseline that quantifies harms in given usage scenarios, so you can track improvement as you make iterative changes. Measurement doesn't certify safety (B) and complements red teaming rather than replacing it (C).

**A6 — D.** The four layers are Model, Safety system, System message and grounding, and User experience. A network perimeter isn't one of them.

**A7 — B.** Content filters classify content into four severity levels (safe, low, medium, high) across five categories (hate and fairness, sexual, violence, self-harm, task-adherence), per the module. Memorize the counts: 4 levels, 5 categories.

**A8 — A.** Fine-tuning is a model layer mitigation (making responses more relevant and scoped to your scenario). RAG belongs to the system message and grounding layer (retrieving trusted contextual data and including it in prompts). Mixing these two up is a very testable trap.

### Section B

**B1 — False.** The module says red teaming is often used for security vulnerabilities, but extending it to find harmful content from generative AI builds on and complements existing cybersecurity practices. Testers deliberately probe for weaknesses and try to produce harmful results.

**B2 — False.** Even with automated testing, you should periodically perform manual testing to validate new scenarios and confirm the automated solution is performing as expected.

**B3 — True.** Start manual on a small set, confirm consistent results and clear criteria, then automate (possibly with a classification model that evaluates output) for larger volumes.

**B4 — True.** Prompt shields are a safety system layer feature in Foundry guardrails that use abuse detection algorithms to detect systematic abuse, for example attempts to subvert the system prompt.

**B5 — True.** A phased delivery plan to a restricted group lets you gather feedback and find problems before a wider release.

### Section C

**C1 — B.** Problem 1 (factual inaccuracy) is a grounding problem, so RAG over trusted policy documents at the system message and grounding layer. Problem 2 (prompt subversion) is what prompt shields in the safety system layer are for. (A) uses fine-tuning and a disclaimer, which don't directly stop prompt subversion. (C) raising temperature would increase randomness. (D) is wrong because a system message influences the model but doesn't guarantee compliance, so it shouldn't be the only defense.

**C2 — D.** The Manage stage calls for prerelease reviews (legal, privacy, security, accessibility), a phased delivery plan to a restricted group, an incident response plan, a rollback plan, the capability to immediately block harmful responses, the capability to block specific users/applications/IPs, a way for users to report content as inaccurate/incomplete/harmful/offensive, and privacy-compliant telemetry. Good red-team results (A) don't replace operational readiness, and building the incident plan only after a problem (B) is exactly what the guidance warns against.

---

## Score Guide

| Score | Assessment |
|---|---|
| 14-15 / 15 | Strong grasp, ready to move to the next module |
| 11-13 / 15 | Solid, but review the missed concepts before moving on |
| 7-10 / 15 | Gaps remain, reread the relevant unit(s) before retaking |
| 6 or below / 15 | Revisit the full module content before attempting a retake |
