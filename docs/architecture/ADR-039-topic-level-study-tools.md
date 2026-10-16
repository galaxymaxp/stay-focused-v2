# ADR-039: Section-scoped topic levels and Expound

Status: Accepted for RT1 local implementation (2026-10-16).

Use Study Tools section actions at `/api/experience/study-tools/topic`, rather than
block Study Assist. Stable section IDs and explicit canonical block projections
support exact section hashing. This reuses Study Tools' bearer verification,
owner-scoped library reads, 20/minute warm-instance admission, provider/model,
safe errors, size-only logs, grounding labels and SA1 formatting. Neither existing
module has a durable server quota or server result cache; do not claim otherwise.

Input contains only reviewerId, sectionId and action. Original is a client-only
level and is rejected as a server action. The server reads the owner's section;
no client-provided text enters the prompt. All actions stay within that exact
section. Simplify preserves its points in shorter plain language; Explain simply
adds one explicitly illustrative everyday comparison; Expound explains the same
relationships more fully. All use the source label and prohibit new factual
claims. Canonical reviewer storage is never written.

Cache identity includes section content hash, action and topic prompt version,
plus reviewer/section identity and authenticated owner. Exact content equality
also guards fingerprint collisions. Server cache deduplicates in-flight work and
keeps at most 400 successes for 30 minutes per warm instance; it is not durable
or cross-instance. Owner reads happen before every server cache lookup. Clients
persist results through their assist stores (mobile's owner-scoped study_assists
table; versioned browser storage), while level and expansion choices last only
for the reading session. Failed generations are never cached. Context above
18,000 characters fails safely without truncating a topic; output is capped at
6,000 characters / 2,400 tokens (rewrites: 1,600 tokens).

Existing SH1 snapshots carry block assists, not topic results. Do not expand the
snapshot: shared readers retain canonical content and expose sign-in links for
all topic actions, with no model calls. No migration, dependency, deployment or
remote service operation is required for this code slice.
