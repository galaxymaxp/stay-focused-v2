# ADR-030: Course batch Reviewer generation

Date: 2026-10-15
Status: **Deferred at STEP 0; no implementation decision accepted.**

Superseded on 2026-10-16 by [ADR-034](ADR-034-course-batch-generation.md)
after the owner's GA1b answers authorized saved requests and omitted minutes.
The original STEP 0 findings below remain historical evidence.

The authorized product intent is one normal Reviewer per selected eligible
course material, with exact-revision skip logic, server quotas, idempotency,
independent Retry, mobile/web parity and QD1 visibility. It is not a combined
course Reviewer.

The unattended GA1 prompt requires stopping when the implementation contradicts
its prerequisite assumptions. EP1 rejects manual generation with `409 not_ready`
while preparation is pending; its completion wakeup admits only AG1 candidates
under Auto preference, baseline and current-course restrictions. It does not
retain arbitrary explicit manual generation intent. E2 estimates study time
from a saved Reviewer, not generation duration before one exists.

Existing transaction-serialized processing-job quota enforcement is reusable;
the blocker is not absence of server-side caps. Any eventual design must retain
these caps, exact prepared evidence, owner isolation and HTTP 202 acceptance.

Before accepting a design, the owner must resolve whether to add a durable
explicit batch-intent/resumption mechanism independent of automatic admission,
and how to express the confirmation estimate honestly. No placeholder jobs,
preview fallback or fabricated generation-time estimate were introduced.

See [GA1 STEP 0 evidence and exact questions](../ai/acceptance/ga1-course-batch-generation.md).
ADR-019 automatic admission, ADR-026 preparation, ADR-027 saved-first screens,
ADR-028 current/past courses and ADR-029 Queue remain unchanged.
