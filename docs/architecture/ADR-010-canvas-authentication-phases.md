# ADR-010 - Canvas Authentication Phases: Personal Access Tokens And OAuth

Date: 2026-07-05

Status: Accepted

## Context

Stay Focused currently has no institution-provided Canvas Developer Key and no
school-wide Canvas token.

Canvas users can generate personal access tokens that grant API access only as
themselves. Those tokens inherit only the permissions available to that Canvas
account and cannot bypass locked, hidden, unpublished, or
permission-restricted content.

The capstone needs a working, testable Canvas integration before
institution-level OAuth approval is available.

## Decision

Phase 5A will accept individually generated Canvas personal access tokens.
Each token belongs to one Canvas user and is encrypted server-side before
storage.

The development environment variable `CANVAS_PERSONAL_ACCESS_TOKEN` is used
only for direct live validation by a developer-owned test account. It is not a
shared runtime credential for all users.

A later production phase will replace or supplement manual PAT entry with
Canvas OAuth using an institution-approved Developer Key.

## Consequences

Positive:

- Canvas integration can be developed and validated now.
- No school-wide token is needed.
- Each user remains limited to their own Canvas permissions.
- Current synchronization logic remains reusable for OAuth.

Negative:

- Users must manually generate and revoke PATs.
- Token setup is less user-friendly.
- Institutions may disable PAT generation.
- PAT rotation and revocation must be handled clearly.
- Broad public production deployment remains dependent on OAuth approval.

Security consequences:

- Tokens must be encrypted with `CANVAS_TOKEN_ENCRYPTION_KEY`.
- Tokens must never be logged or returned.
- No token may be shared across users.
- Disconnect must delete the stored credential.
- Capability checks remain permission-dependent.
