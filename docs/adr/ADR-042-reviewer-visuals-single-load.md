# ADR-042: Load reviewer image URLs together on open

Date: 2026-10-18
Status: Implemented locally for WV1/N7; owner rollout and device checks pending.

## Context and decision

The website loaded an owner-scoped figure availability index and an external
visual index, then waited for each section's IntersectionObserver. Each section
made a figure request or a snapshot probe followed by a render request. Mobile
had the same discovery and scroll-dependent snapshot sequence.

Extend `GET /api/reviewers/[id]/figures`. Preserve `sections[].sectionId` and
`hasFigures`; add signed figures, an already-rendered snapshot or explicit
snapshot state, stored external reference, and external-batch progress. Existing
section routes and `/visuals` remain compatible. The bearer boundary binds the
verified owner. Canonical artifact, version and source ownership and deletion
checks precede private image reads. Citation IDs and accepted-original checks
remain authoritative; no title matching or newer-source substitution.
All cached visual types share the same canonical record, including stored
external references, so an intervening latest-version change cannot mix versions
inside the combined response or add another canonical lookup.

Bulk snapshot discovery resolves the exact accepted original once, reads all
owner/source snapshot rows once, and signs each cited ready page once for 600
seconds. Missing/duplicate/mismatched evidence fails safely. GET never reserves,
dispatches or renders, and never starts external-provider work. No migration,
dependency, credential or deployment change is needed.

Both readers use a shared validated ephemeral DTO and loader. Cached URLs become
available after the initial response. All missing eligible snapshots enter one
background queue with at most three concurrent requests, independent of scroll.
Admission occurs once per section/page per loader lifetime; a rendering response
is reconciled with at most five read-only polls. Cancellation, offline state,
reviewer changes and owner/token changes discard late responses and URLs.
One reader-wide refresh handles source-image errors, including expired/403
signatures; later failures show the unavailable state. DOM image events do not
expose status, so every source-image error gets this bounded treatment.

Website reading order assigns eager loading to the first two images and lazy
loading to the rest, with async decoding and reserved image boxes. The shared
loader preserves legacy external batch fill/polling without delaying cached
course images. Mobile's public health heartbeat retains the reachability guard
without section requests or image URLs. Signed URLs are never saved offline.
IM2 grounding, tap-to-open details, Ask, Save, zoom and dismissal remain.

## Local fixture measurement

Four synthetic sections: one extracted figure, one cached page, one unrendered
page whose mocked render response is ready, and one stored external reference.
These counts exclude image byte downloads, ordinary reviewer content loading,
later health checks, legacy provider fills, and worker time. All sections are
allowed to intersect in the before run; an offscreen section otherwise waits
indefinitely for scrolling. No production URL or academic fixture is used.

| Metric | Before | After |
| --- | ---: | ---: |
| Metadata requests through the missing snapshot URL | 7 | 2 |
| Earliest image URL, including stored external | 1 response | 1 response |
| First course-image URL | 2 sequential responses | 1 response |
| Previously unrendered snapshot URL, immediate mocked completion | 3 sequential responses | 2 responses |
| Cached URL discovery for offscreen sections | Waits for scroll | Initial response |

The after test measures the real shared loader; web/native component tests
verify one open read and consumption without per-section discovery. This is a
request/dependency measurement, not an elapsed-time production benchmark. A
real asynchronous render may require the bounded polls and durable worker time.
Deployment revision, actual perceived speed and device results are
**UNVERIFIED (owner to confirm)**.

## Verification and consequences

See [WV1 acceptance](../ai/acceptance/wv1-reviewer-images.md) for exact fresh
gates, first-attempt failures, commit and owner steps. Bulk URL responses are
larger than the former availability index, bounded to 100 sections and 12
figures per section. Per-section compatibility reads still work. Source and
external fallback priority, safe error logging and private no-store responses
are preserved. No new persistent image cache or render admission budget exists.
