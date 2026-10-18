# ADR-043: Save reviewer images with the offline Library

Date: 2026-10-18
Status: Implemented locally for OI1; owner rollout/device acceptance pending.

## Decision

Save private image files under Expo FileSystem's documentDirectory in
`offline-images/<encoded owner>/<encoded artifact>/`. This survives app restarts
and ordinary OS cache eviction. Gallery copies remain a separate optional Save
image action. Use the existing lazy-loaded expo-file-system/legacy module;
there is no dependency, permission, runtime or versionCode change.

Use image kind, a stable hash of image ID (or section/page source reference for
legacy snapshots), and a hash of the reviewer artifact updatedAt version for
filenames. Repeated identities across sections share one file and retain their
section associations. MIME determines the extension. Signed URL strings never
participate in keys or persistence. Original display metadata, external credit,
license and public attribution links persist, without private Storage URLs.

Append local SQLite migration v9 with an owner/artifact manifest table. Each
manifest has a body version and unique generation token, discovery progress,
retry clock and records containing key/kind/source reference/private local path,
bytes, pending/stored/failed/skipped_cap status, attempts and attribution.
Existing text remains available while the manifest is pending. Successful empty
discovery distinguishes text-only reviewers from unexamined reviewers.

After text persistence, schedule an asynchronous device queue. Startup Library
catch-up and reader image arrival also trigger it. An owner flight and shared
queue keep at most two byte downloads active. Retry clocks persist with bounded
exponential backoff (30 seconds to one hour). App lifecycle stop and sign-out
drain work; restart resumes from SQLite. This uses no native background service,
connectivity dependency, Wi-Fi-only setting or new external search policy.

Reuse FX1b owner reads to obtain fresh exact snapshot/figure URLs; a combined
owner GET supplies current validated external references. Never fall back to a
stale signed URL when the owner read fails. Shared download validation rejects
non-2xx, missing/non-image MIME and empty files for offline copies. Download to
a generation-specific .part file, validate, then move before publishing stored
status. Recheck generation/body under the publication lock so removed or replaced
bodies cannot be resurrected. Network downloads do not hold the text-write lock.

Cap retained image bytes at **40 MiB per reviewer** and **500 MiB across the app**.
Forty MiB accommodates many bounded page/figure images while limiting a single
reviewer's footprint; 500 MiB allows several image-heavy reviewers without
unbounded accumulation on student phones. Preserve a reading-order prefix and
mark the remaining images skipped_cap; text is always kept. At most two temporary
downloads can coexist outside the retained-byte cap; oversized files are discarded
after validation. A quiet existing-token line says **Some images need a connection**
for incomplete/capped manifests. Caps do not trigger gallery changes or silent
eviction of other reviewers.

Readiness requires current text, completed discovery and every non-capped image
stored. Capped reviewers can be ready with that line; failed/pending images cannot.
Storage totals include stored image bytes. All three image controls prefer private
files and preserve original labels, zoom, course-source priority and attribution;
online missing files retain the existing remote behavior. Network-dependent Ask
and replacement actions keep their existing offline guards.

## Cleanup and consequences

Invalidate image manifests and remove private folders on artifact removal,
explicit supersession, version replacement/newer summary, clearBodies and owner
purge. Auth sign-out already invokes the owner purge after stopping catch-up.
Explicit owner not_found removes the local artifact; authenticated unavailable
source evidence removes previews while keeping text. Failed/partial discovery
does not establish deletion. A filesystem failure cannot roll back invalidation
of readable rows; subsequent clear/replacement retries the private folder.

No server API, remote migration, RLS, bearer authentication, gallery permission or
provider contract changes. Offline files reflect the last accepted owner state;
remote deletion can be learned only on a successful owner reconciliation.
**PAR1:** the website has no offline mode and is not changed by OI1.

See [OI1 acceptance](../ai/acceptance/oi1-offline-reviewer-images.md) for local
evidence and excluded owner work. Production and physical-device behavior remain
UNVERIFIED (owner to confirm).
