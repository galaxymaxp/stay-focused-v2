# Thesis Overview

## Project Title

Stay Focused: An AI-Powered Canvas-Integrated Study Productivity Application

## Author

Fely Max Dilinila

## Version History

- **V1:** The `stay-focused` repository, a prototype developed across more
  than 400 commits.
- **V2:** This repository, a clean rebuild with an engine-first architecture.

## V1 Summary

V1 built and validated the core concept of combining Canvas LMS context with
student productivity workflows. It proved that course material, assignments,
and schedules could reduce the context a student must manually provide to an
AI system. It also exposed architectural limits: generation quality was
patched after UI work, mobile behavior was not the primary design constraint,
and authentication client mismatches caused silent Supabase RLS failures.

## V2 Goals

- Establish and test the generation engine before implementing product UI.
- Deliver a mobile-native experience through Expo and React Native.
- Generate study reviewers whose coverage, structure, and usefulness match
  work prepared by a human subject-matter expert.
- Integrate Canvas LMS as the source of academic context and scheduling data.
- Keep generation provider concerns separate from pipeline behavior.

## Engine Contribution

V1 was the exploratory prototype that established feasibility and revealed
where generation, application, and integration concerns were too closely
coupled. V2 is the refined architecture: its completed Stage 0 through Stage 6
engine turns extracted source content into a typed reviewer through explicit
normalization, planning, generation, verification, bounded retry, and assembly
contracts.

This pipeline is a capstone-ready technical contribution because it is
documented and independently testable, not because real-provider quality is
already complete. The dependency-free harness currently passes 176 cases and
helps prevent V1-style regressions such as silently weak reviewers or missing
later source sections. Provider quality evaluation and application integration
remain future work.

V2 also separates AI provider integration from the core engine. The OpenAI
adapter is defined in the server/API layer behind `GenerationProvider`, where
it can be tested with fake clients without changing the pipeline or exposing
credentials to mobile code. This separation improves maintainability and makes
provider-specific failures testable before real network integration.

## Thesis Deliverables

- A working mobile application integrated with Canvas LMS.
- A documented and testable AI generation pipeline.
- Technical documentation covering architecture, implementation, evaluation,
  security, and deployment.
