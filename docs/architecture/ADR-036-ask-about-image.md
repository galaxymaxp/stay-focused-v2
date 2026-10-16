# ADR-036: Ask about an image

Date: 2026-10-16
Status: Accepted for local SA2 code scope; rollout and physical acceptance pending.

## Context

Students need to ask what a displayed picture is, what its parts mean and how it
relates to the lesson. SA1 already supplies an organized Ask thread, grounding,
bounded follow-ups, ephemeral caching and accessible answer reveal on both clients.
This action does not search for a new image or alter canonical reviewer content.

## Decision

Use the existing `ask` study action with an optional `image: { kind, id }`
reference. Keep its existing reviewer/section/block/content-hash verification and
question/follow-up limits. Reject client URLs, bytes and extra fields. Bump Study
Tools to v3; include section, image kind and exact image ID in session cache keys.
Text Ask retains its four suggestions. Image Ask has four separate static chips:
What is this?, What does it mean?, Explain the parts, Why is it in this lesson?

Resolve images only after server bearer authentication and owner reviewer reads.
The server-only service client is required: the private buckets deliberately grant
no authenticated client reads, and snapshot locators have explicit column grants.
Never grant client access or accept a client storage locator. Repeat owner,
accepted source, section citation and current-version checks before downloading:

- Snapshots expose their existing ready-row UUID. A read-only snapshot probe
  validates the exact accepted original and cited page; a matching owner/source
  row supplies the private object path. No reservation, render or dispatch runs.
  Objects use snapshot UUID / lease UUID paths, not owner-prefixed paths.
- Figures use immutable existing UUIDs, complete extraction receipts, exact
  accepted-original availability and canonical section citations. Objects retain
  their existing owner-prefixed paths.
- External visuals expose an opaque SHA-256 digest of the stored owner, artifact,
  version, section, image URL and updated timestamp. This identifies the current
  composite-key row without a new migration. It is not an authorization token.
  The server repeats all scoping checks and permits only HTTPS upload.wikimedia.org
  with no credentials, port or redirects. Replacements invalidate old references.

Reject raster input above **3 MiB**; do not silently crop or substitute a picture.
Check PNG/JPEG/GIF/WebP signatures before sending inline bytes through the existing
Responses `generateWithImage` adapter. Reuse VL3's server fetcher and bound its
stream even when Content-Length is absent. No new dependency or storage write is
needed. Snapshot and figure bytes are downloaded with server credentials after
scoping, never supplied by a student or fetched through their proposed URL.

Send bounded section reviewer text, cited context, question and prior turns with
the image. Include Wikimedia title/credit/license as untrusted context. Require
SA1 markdown-lite organization and honest source/mixed/general grounding; external
image interpretations cannot be labelled source-only. Never follow instructions
embedded in the image. Keep the existing model selection, token budget, error
mapping and 20/minute warm-instance burst guard. The baseline Study Tools route
has no durable quota or usage/cost ledger; this change does not claim to add one.

All inline and zoom surfaces open the same Ask panel with a thumbnail, text field
and two follow-ups. Existing formatter, session cache, press/completion reveal,
manual-scroll guard and Reduce Motion apply. Offline controls are disabled with
the existing message. Public shared visuals link to sign-in with the original
share return path; shared readers perform zero model calls and expose no private
course images. Public snapshot serialization remains unchanged.

## Consequences and verification

New clients tolerate responses without image IDs by disabling the action until
the compatible API is deployed. Coordinate v3 clients/API at owner rollout.
Closing Ask discards its cache, as before. Three MiB rejects may require a future
separately scoped downscale path if real images exceed it. No migration or new
native module is introduced. Mocked owner-denial/storage/provider and inline/zoom
client tests plus fresh serial workspace gates are recorded in
[SA2 acceptance](../ai/acceptance/sa2-ask-about-image.md). Deployed behavior,
provider interpretation quality and physical acceptance remain UNVERIFIED.
