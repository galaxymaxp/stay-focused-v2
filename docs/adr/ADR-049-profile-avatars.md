# ADR-049: Private account photos

Status: accepted for local PF1b implementation; migration application is an owner step.

Use the existing bearer-verified API and server-only Supabase service client,
as used for private source snapshots. A private `profile-avatars` bucket allows
JPEG, PNG and WebP, at most 2 MiB. Restrictive Storage policies deny direct
anon/authenticated access even in the presence of unrelated permissive policies.
The API generates `<verified-user-id>/avatar-<uuid>.png`; it accepts no path or
owner from a client. Reads return only a 600-second signed URL and expiry.

`public.user_profiles` stores the current object and update time. RLS and
column grants permit only own-row metadata reads; only the service role writes.
A service-only invoker RPC compares the previous object atomically and records
retired objects for cleanup. A failed cleanup returns a safe error and remains
durable for retry on the next request. Concurrent replacements cannot remove
the winning photo. Uploaded bytes are stored and signed before the pointer
commits; an explicitly rejected commit compensates by deleting the new object.
An uncertain RPC/network result preserves the possibly-current object. A process crash
between Storage and the database can leave an unreferenced private object;
it cannot publish a partial photo. Storage and Postgres have no shared transaction.
No success is returned until persistence and retirement cleanup finish.

The existing API `@napi-rs/canvas` decoder center-crops and resizes to at most
512 square pixels, re-encodes PNG and removes source metadata. Magic bytes and
decoded dimensions are checked. Header dimensions are bounded before decoding
to avoid decompression bombs. Web uses canvas crop before sending; mobile uses
the installed picker with `allowsEditing` and `[1,1]` (iOS is always square).
The server crop also covers mobile web, where picker editing is unavailable.
No new native dependency or auth/session format change.

Display order is uploaded photo, HTTPS `avatar_url`, HTTPS `picture`, initials.
PF1b explicitly supersedes the external roadmap's older provider-first order.
Image errors show initials. Signed URLs remain in a keyed React provider only,
expire locally, refresh one minute before expiry, and are discarded on owner change or
sign-out. They are never written to persistent screen snapshots. Offline loads
show provider metadata or initials without blocking the rest of Settings.
