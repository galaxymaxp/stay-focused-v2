# ADR-011: Fast Testing Surfaces

Status: Accepted

## Context

Testing only through Expo Go on a physical iPhone slows down iteration. The
project needs a faster laptop-based feedback loop while keeping Expo mobile as
the primary product.

## Decision

Use Expo Web as the fast UI testing surface for existing mobile screens. Use
Next.js only for API and future full web app work. Add a Next.js reviewer
playground later only if needed for engine/API inspection.

## Consequences

- UI can be tested quickly in a laptop browser.
- iPhone testing becomes final smoke validation instead of the main loop.
- Web compatibility issues are caught earlier.
- The project avoids prematurely rebuilding V1 as a full browser app.
