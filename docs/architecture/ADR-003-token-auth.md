# ADR-003: Use Token-Based JWT Authentication

## Status

Accepted

## Context

Cookie-based authentication does not work consistently in Expo and React
Native. V1 also experienced silent RLS failures because requests used the
wrong Supabase client type and did not carry the expected user identity.

## Decision

All clients use token-based Supabase authentication. Mobile access and refresh
tokens are stored in Expo SecureStore, and authenticated requests send the JWT
as a bearer token. Cookies are not part of the authentication contract.

## Consequences

- RLS receives the correct user identity on web and mobile.
- The system has no cross-platform cookie handling.
- Token storage and refresh behavior must be implemented explicitly.
- Server code must distinguish user-scoped and service-role clients.
