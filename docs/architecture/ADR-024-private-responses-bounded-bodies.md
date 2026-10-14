# ADR-024: Owner-data API responses are private/no-store; request bodies are stream-capped before allocation

Status: accepted for local H3 scope (2026-10-13); owner deployment pending.

## Context

H1-04 found missing explicit cache policy on source/version and processing-job
responses carrying owner academic content. H1-05 found bounded JSON readers
allocating the complete request through Request.text() before byte validation.
Missing or misleading Content-Length defeated the allocation bound. H3 was
queued for these two findings; the legacy review endpoint is separate owner work.

## Decision

Owner-data responses without an existing cache policy use Cache-Control:
private, no-store for every success/error branch, including safe not-found and
authentication denial. Reuse existing response/CORS helpers so status, body and
CORS behavior are preserved. Existing no-store policies remain sufficient and
unchanged for this slice; experience and internal-token responses already carry
private/no-store.

Use the framework-neutral readBoundedText helper at each existing text-reader
byte cap. Retain earlier content-type and Content-Length checks; reject declared
numeric lengths above the cap. Count actual stream bytes and cancel immediately
at overflow before retaining that chunk or reading further. Release the reader
lock and decode bounded bytes with a fatal UTF-8 decoder. Null bodies produce
the same empty string as Request.text(); callers retain their established empty
body acceptance/denial. Map overflow and encoding/JSON failure to existing caller
responses. Transport read failures retain the caller's previous exception path.

## Consequences and verification

Private content cannot be intentionally retained by compliant shared caches;
accepted body buffering is bounded by the route's existing cap, independent of
Content-Length. Authentication, RLS, ownership, quota and result publication are
unchanged. No dependency, migration, mobile, response-body or legacy-route change.

Tests cover exact caps, multi-byte and split UTF-8, invalid encoding, null bodies,
missing/misleading/oversized declared length and cancellation before later reads.
All bounded routes have overflow regressions; each newly protected route has
success and 401/404 header coverage. FRESH gates: forced typecheck 7/7 tasks, 0 cached; forced lint 7/7 tasks,
0 cached, 0 errors / 4 existing mobile import warnings; shared 133/133 in 12
files; API 1,734 passed / 3 skipped in 145 files; API build 35/35 pages,
16 steps / 1 workflow; diff check PASS (0 whitespace errors). Mobile tests
and Android export are NOT APPLICABLE (mobile unchanged).

Code commits: `e2f2d1c` (shared reader), `ca6e48d` (14 bounded readers and regressions),
`d2a2ba8` (15 owner-response route files and regressions). Production response headers remain
UNVERIFIED (owner to confirm). Rollout and device acceptance are owner steps.
