# ADR-032: Request-scoped Today and shared job reads

Status: Accepted for SP2b local code scope, 2026-10-15.

`GET /api/today` adds capabilities, the first 20 announcements, and activity
summaries to the existing overview. All overview fields retain their meanings;
the separate activity, announcement and capability endpoints remain available.
Clients make one request and preserve their existing owner/date/timezone snapshot
key and 60-second refresh. Optional additive fields allow old saved agendas.

Only this verified request shares promises for identical owner/table reads.
There is no cross-request data or authorization cache. Every request still
verifies the bearer JWT and records server-derived activity. The bundle uses
the same service methods as the separate endpoints, with a fixed request time.
Synthetic equivalence/count tests establish nine distinct table reads rather
than sixteen, and one auth/activity pair rather than four pairs.

`GET /api/jobs?scope=all&detailId=<uuid>` optionally returns the existing Queue
page plus a nullable `{ job, generation }` detail and its requested identity.
The server reuses an already owned page row, with an owner-scoped exact lookup
for older/direct links outside that page. CQ1 Queue exclusions remain intact.
Extraction jobs return status without a generation. Missing or foreign results
give no Open target. Generation state and persisted-result verification reuse
the existing mappers and SP2 exact reviewer projection; cancelled jobs publish
no result. Existing list/status/generation endpoints remain compatible.

The website shell and mobile AppActivity provider each own one owner-scoped
reader and adaptive poller. Detail and header consumers share its response;
concurrent refreshes are deduplicated, and cleanup aborts the previous owner.
Active detail polls every three seconds, active list every five, idle every
thirty; hidden/background screens retain their existing pause/wake behavior.
Completed Queue Open keeps an explicit on-demand persisted-result check.
Private job metadata and provider diagnostics are never part of these contracts.
No schema, region, queue, concurrency or remote configuration change is needed.
