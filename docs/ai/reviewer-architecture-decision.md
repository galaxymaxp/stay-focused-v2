# Reviewer Engine — Architecture Decision Record  
  
**Status:** Decided, not yet built  
**Supersedes:** V1 multi-stage composer pipeline AND the V1 “redesign” spec (fixed cards-per-chunk Study Pack Compiler)  
**Context:** Stay Focused V2 — `packages/engine` (vendor-agnostic), called via `apps/api`  
  
-----  
  
## Why the previous approaches were abandoned  
  
The V1 composer pipeline collapsed (composer_leakage, prompt wording bleeding into output, unstable partial-save). Its replacement spec — a chunked Structured-Outputs compiler with a **fixed 5–8 cards per chunk** cap — was never built because it repeated the original sin: it imposed an **output shape (a card count) before reading the input’s real structure**. Multi-section sources (e.g. 7-phase SDLC) lose later sections under this model.  
  
Confirmed live during this session: generating a reviewer “freely” (with model judgment, no binding contract) reproduces the bug **by hand** — the model silently editorializes, keeps what it finds interesting, and drops sections. An audit of a generated IT Security reviewer covered ~6 of 15 source sections. **The failure is the absence of a binding coverage contract, not the model.**  
  
-----  
  
## The two independent quality axes (the core insight)  
  
V1 conflated these. They are separate and must be handled separately:  
  
1. **Coverage** — is every source section present?  
1. **Value-add** — does it teach beyond the raw source (explanations, analogies, exam predictions)?  
  
Decisions made this session:  
  
- **Coverage → locked at maximum: total fidelity.** Every source section appears, full treatment, no editorial dropping. The generator is NOT permitted to decide a section matters less.  
- **Value-add → grounded-only in the default artifact, enrichment is opt-in.** See below.  
  
-----  
  
## The decision: grounded-first, enrichment opt-in  
  
The reviewer **always generates a grounded-only artifact first** (the trustworthy core). Enrichment (exam-target predictions, memory hooks, analogies) is a **separate, user-requested layer generated on top of the grounded reviewer** — never silently blended in.  
  
Rationale:  
  
- **Trust is the whole game for a study tool.** A student must be able to trust every line traces to their actual course material. Unverifiable content mixed into notes is a liability (they might study something the professor never said).  
- Enrichment has real study value but is **unverifiable** — exactly the category that let V1 drift/leak. Solving it by **sequencing + consent** (student sees grounded version, then consciously opts into aids) means added content can never masquerade as source material.  
- **Usage-friendly:** the expensive enrichment pass only runs when requested. Most reviewers may never trigger it.  
  
-----  
  
## Architecture — five stages  
  
```  
Stage 1  Structure detection      → outline (the real section list of THIS source).  
                                     No cards yet. This is the step every V1 version  
                                     skipped or faked. Card/section counts are an  
                                     OUTPUT of detection, never an input.  
  
Stage 2  Grounded generation      → reviewer content, per detected section,  
                                     total fidelity, every line traceable to source.  
                                     Volume follows the section's actual content,  
                                     NOT a fixed per-chunk cap.  
  
Stage 3  Validation               → (a) COVERAGE: outline section count ==  
                                     output section count; every section represented.  
                                     A section with no content = hard failure.  
                                     (b) GROUNDEDNESS: every claim traces to a source  
                                     span; untraceable statements rejected.  
                                     Both are MACHINE-CHECKABLE (replaces V1's broken  
                                     "minimum total card count" check).  
  
Stage 4  Assembly                 → the grounded reviewer. This is the DEFAULT artifact  
                                     the student receives.  
  
  — student reads it, then optionally taps "Add study aids" —  
  
Stage 5  Enrichment (opt-in)      → exam-target predictions, memory hooks, analogies.  
                                     Generated AGAINST the already-grounded reviewer  
                                     (anchored to validated content, not invented from  
                                     nothing). Tagged as enrichment. NEVER merged into  
                                     or overwriting the grounded core. Independently  
                                     validatable. Only runs on request.  
```  
  
### Why Stage 5 generating “against” the grounded reviewer matters  
  
Even the opt-in additions are anchored to validated content — the analogy for a concept is built on the grounded definition that already passed validation. Enrichment with a leash, not invention from scratch.  
  
-----  
  
## The grounded-only content rules (Stage 2)  
  
- **May** reorganize and explain: group related terms, clarify relationships the source implies, surface structure.  
- **May NOT** add facts the source does not contain: no invented stats, no exam-likelihood guesses, no analogies, no outside scaffolding. Those all belong to Stage 5.  
- Tone: faithful organization of the source, not a transcription dump AND not free editorializing.  
  
-----  
  
## Eval fixtures (carried from V1, already canonical)  
  
Any build must pass all three — they span the hard cases:  
  
- **IT Security** (~5,900 chars) — bullet-heavy survey, 15 sections  
- **7 Phases of SDLC** (~8,997 chars) — multi-section process (the section-dropping killer)  
- **M1 Arnis** (~3,436 chars) — short source  
  
Quality benchmark of record: the historical “Sound and Audio” reviewer (comprehensive coverage, worked examples, multiple practice sections, answer key).  
  
Build discipline (matches engine pipeline history): **contract → evals first → implementation.** Because the engine is pure/deterministic, coverage + groundedness can be asserted in evals before the algorithm exists.  
  
-----  
  
## Architectural placement  
  
- All five stages live in `packages/engine` — vendor-agnostic, no OpenAI/Supabase/env vars.  
- The OpenAI provider boundary stays inside `apps/api`.  
- Exposed via the existing authed `/api/review` route (JWT Bearer, per the Stage 6.2 auth convention).  
  
-----  
  
## Build sequence — the heavy-lifters, in dependency order  
  
The order is set by dependency, not preference: each generator is an input to the next.  
Build upstream-first or you build command centers for content that doesn’t exist yet.  
  
1. **Review generation** — FIRST. Hardest, highest-risk (V1 died here), and its  
   architecture (structure-detection → grounded generation → validation → opt-in  
   enrichment) becomes the reusable TEMPLATE for every generator below.  
1. **Quiz generation** — depends on (1). A quiz generates FROM the grounded reviewer,  
   not from raw source. This is the fix for both known quiz bugs:  
- “drafts should be immediately quizzable without a separate generation step”  
- “quiz question quality” — quiz inherits grounded, validated content.  
1. **Task generation** — depends on the generation discipline from (1)–(2). Greenfield  
   and simpler; reuses grounding + validation patterns. Extract actionable tasks from  
   Canvas/sources.  
1. **Notifications** — depends on (3) and module/deadline data existing. Cannot notify  
   about content the generators haven’t produced. (Vercel Cron hourly scanner +  
   delivery preferences + in-app center.)  
1. **Task scheduling / the clock** — LAST. Consumes outputs of (1)+(3): schedules review  
   blocks and tasks around deadlines. Contract already drafted (see scheduler notes:  
   today-placement + spillover preview; overdue → Need Attention; honest overflow;  
   splitting allowed with min-block floor; urgency-first via pressure score). Do NOT  
   build until its inputs exist.  
  
## Open items to RESOLVE before building step 1 (review generation)  
  
These are the reviewer-internal specs needed to start the first heavy-lifter:  
  
1. Define the section / card schema concretely (reverse-engineered from a grounded  
   reviewer we both approve).  
1. Specify the groundedness validator mechanism (how each statement cites its source span).  
1. Specify Stage 1 structure-detection output format (the outline schema the coverage  
   validator binds to).  
1. Write evals for all three fixtures (IT Security, SDLC, Arnis) asserting coverage +  
   groundedness.  
1. Then the Codex build prompts — sequential, minimal surface area.  
  
Note: items 1–5 above are ONLY for step 1. Quiz/task/notification/scheduler each get  
their own spec pass when their turn comes — do not spec them now, they’ll reuse the  
reviewer template and shouldn’t be designed before it exists.  
  
-----  
  
## Side decision (design, parked)  
  
Reviewer UI direction: **calm Stay Focused base + one bold signature per surface.** The reviewer’s signature = the structure-detection hero (shows the detected source shape). Principle to add to design memory: *“Calm by default, one deliberate bold signature per surface. Reduce overwhelm ≠ remove personality.”* Parked — not this session’s priority.  
