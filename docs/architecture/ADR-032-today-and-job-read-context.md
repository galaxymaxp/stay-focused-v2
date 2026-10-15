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

Job status and safe generation projections will use the same verified owner
and persisted-result checks; client polling must share one source per owner.
Private job metadata and provider diagnostics are never part of these contracts.
No schema, region, queue, concurrency or remote configuration change is needed.
