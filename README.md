# Stay Focused V2

Engine-first rebuild of Stay Focused, a schedule-first student productivity app
with Canvas LMS integration and AI-generated study materials.

## Workspace

- `apps/mobile`: Expo and Expo Router mobile app
- `apps/api`: Next.js 15 App Router API and future web app
- `packages/engine`: Provider-agnostic generation pipeline
- `packages/db`: Supabase client and database types
- `packages/canvas`: Canvas LMS client and types
- `packages/shared`: Shared types, constants, and utilities

## Getting started

```sh
npm install
npm run typecheck
npm run build
```
