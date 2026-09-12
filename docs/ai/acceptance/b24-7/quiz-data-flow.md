# B24.7 data flow

```mermaid
flowchart TD
  A[Owned prepared course material] --> B[Source blocks and verified headings]
  R[Owned Reviewer source relationships] --> A
  B --> C[Deterministic QuizPlan]
  C --> D[Structured candidate generation]
  D --> E[Shape and exact-evidence validation]
  E --> F[Independent correctness and set verification]
  F -->|Failed slots only, at most two repairs| D
  F -->|All requested questions accepted| G[Transactional saved Quiz and private keys]
  G --> H[Owner-scoped immutable attempt history]
  H --> I[Draft selection then locked final answer]
  I --> J[Deterministic answer evaluation and immediate feedback]
  J --> K[Completed result]
  K --> L[Topic performance and weak areas]
  L --> M[Reviewer section or source region navigation]
  G --> N[Library saved Quiz]
  K --> N
  N -->|Read only, no generation| H
```

Generation runs on the existing processing-job/Workflow architecture. Plan and
accepted-question checkpoints are private. A job result contains only the saved
Quiz ID; keys and evidence never cross the unanswered API boundary. The worker
rechecks source ownership before transactional completion; the database refuses
completion after cancellation or lease loss.

Public `quizzes.questions` and the learner projection contain only IDs, question
type, prompt, options, selection instruction and difficulty. Topic labels,
source evidence and explanations are omitted before answer finalization because
even a topic heading can reveal an answer. Feedback unlocks only the finalized
question. Starting over creates a new attempt, retaining all prior results.
