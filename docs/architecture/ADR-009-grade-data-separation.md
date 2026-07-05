# ADR-009 - Grade Data Separation

Date: 2026-07-05

Status: Accepted

## Context

Canvas grade, submission, rubric, outcome, and instructor-feedback data can be
sensitive and can be hidden or incomplete. Reviewer generation should remain
source-faithful and must not accidentally turn grades or feedback into prompt
material.

Future grade planning also needs confidence labels because Canvas grading rules,
drop rules, grading periods, hidden grades, and manual assumptions affect how
exact a projection can be.

## Decision

Grade and submission data remain separate from reviewer source content. Grades
never enter reviewer prompts by default. Future grade projections must include
confidence labels, and official instructor/Canvas calculations remain
authoritative.

## Consequences

- Reviewer source snapshots and grade snapshots use different records and API
  surfaces.
- Future grade planner outputs can be exact only when Canvas rules and visible
  data actually support exact calculation or Canvas What-If verification.
- Instructor comments and feedback attachments require explicit future product
  handling before they can be summarized.
