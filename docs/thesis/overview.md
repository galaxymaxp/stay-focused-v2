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

## Thesis Deliverables

- A working mobile application integrated with Canvas LMS.
- A documented and testable AI generation pipeline.
- Technical documentation covering architecture, implementation, evaluation,
  security, and deployment.
