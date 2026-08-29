# Reviewer UI Handoff Context

Persistent context for work on the Stay Focused V2 Reviewer experience. This is
reference material, not a task list. It records what the reviewer is, what has
been validated, and the UI principles that reviewer work must respect.

Canonical product and acceptance state lives in `docs/current-state.md`,
`docs/roadmap.md`, and `docs/ai/current_sprint.md`. Where this document and
those files disagree, they win. Always inspect the repository before changing
anything; do not treat a commit hash quoted here as current.

## Repository

The active repository is:

```txt
C:\Projects\stay-focused-v2
```

Primary branch: `main`.

A second copy previously existed under
`OneDrive\Documents\Projects\stay-focused-v2`. Its contents were deleted on
2026-08-29 because that copy was both corrupt and materially stale: its `.git`
directory had lost `HEAD`, `config`, and `index` so Git did not recognise it as
a repository, its only refs were an obsolete `codex/hosted-processing-prototype`
branch, and its `apps/mobile/src` held 64 files against 91 in the real
repository. Every file that existed only there was build or cache output
(`.next-onedrive-stale*`, `.swc`, `.vercel/node`, `.workflow-test-artifacts`);
no source, documentation, configuration, or migration was lost. An empty
directory may remain until the OneDrive sync process releases its handle.

Do not work from a OneDrive-hosted copy of this project. The repository is kept
outside OneDrive deliberately, after earlier sync-induced corruption.

## What the reviewer is

Stay Focused V2 is a mobile-first student productivity application built around
Canvas LMS. The mobile app is Expo, React Native, Expo Router, and TypeScript in
strict mode. The backend is Next.js App Router with Supabase, Canvas
integration, OpenAI, and durable reviewer processing jobs.

The Reviewer Maker is the central capstone feature. Its journey is:

```txt
select source content
→ preview
→ generate
→ processing
→ read reviewer
→ save
→ Study Library
→ reopen
```

Two paths reach it. The Canvas path is the capstone demonstration path; the PDF
import path is the established fallback and must keep working whenever shared
reviewer UI changes.

## Validated architecture

These behaviours are implemented and physically accepted. UI work must preserve
them rather than reinterpret them.

**Server structure is authoritative.** A synchronized Canvas source resolves to
server-owned structured blocks. The mobile client does not parse Canvas content
or infer structure. Blocks stay in the order the server returns; they are never
reordered by client identifier or alphabetically. The server may mark blocks
`selectedByDefault`, and the app honours that default. Blocks may also be marked
unselectable, in which case they display as context only.

**Selection is an ordered subset.** Students select, deselect, and clear blocks.
The current server safeguard is a maximum of 250 selected blocks; a selection of
zero blocks cannot proceed.

**Selective preview is a distinct server step.** The selection is not fed into
generation. It is sent to a server selective-preview endpoint that resolves the
authoritative source text and returns a preview session and resolution
fingerprint:

```txt
selected blocks
→ server selective preview
→ validated preview session
→ generation
```

**Preview is bound to the selection that produced it.** Changing the selection
invalidates the preview, and generation may not proceed from the stale one. In
the mobile client this is enforced by `clearPreviewState`, which every selection
change routes through. A new preview is required before generating again.

**Generation is durable and single-pathed.** Canvas generation reuses the
existing reviewer-job system; there is no second Canvas-specific path. Jobs
survive leaving the flow, force-stop, and relaunch, and are recovered through
Processing from real persisted server state. Source freshness is revalidated, so
a changed or expired source can require a new preview.

**Provenance is immutable.** A reviewer job creates or reuses an immutable
reviewer-source snapshot that carries through generation, the completed
reviewer, save, and Study Library reopen. Reopening a saved reviewer does not
regenerate it. Do not weaken this for simpler UI code.

## What the Reviewer Reader can actually show

The Reader renders a `ReviewerOutput` and nothing else is guaranteed. That
payload carries the reviewer title, ordered sections, and per-section ordered
items whose `sourceCore` holds an explanation and key points, plus metadata:
`sourceTitle`, `sourceKind` (`document` / `presentation` / `webpage` /
`plain-text` / `unknown`), section counts, coverage / grounding / leakage status
and score, and an optional `reviewerQualityStatus`. It carries **no course, no
timestamp, and no saved state**, so anything of that kind must be passed in by
the screen that owns it.

`enrichment` is always `null` by design - stage 3 instructs the model to leave
it empty - so the Reader has no beyond-source layer to render.

The real shape of generated reviewers is narrower than the schema allows. In
every recorded live run, each section holds exactly one item whose title equals
the section title, and most items carry key points with an empty explanation.
A Reader that renders section title, then item title, then an `Explanation`
label, therefore repeats itself three times over real data. Design for that
shape: section heading, optional prose, key points.

Grounding and coverage scores exist but are evaluation data. `Grounding: 1.00`
reads to a student as a correctness guarantee the system does not make, so the
Reader reports `Grounded` / `Limited grounding` from `groundingStatus` and shows
no number. A saved or legacy payload with no recognisable grounding status gets
no status at all.

## What a saved reviewer actually carries

Study Library is not a view of a reviewer job. It reads the persisted reviewer
record, and that record is narrower than the journey that produced it. The list
endpoint returns `id`, `title`, `sourceMetadata` (`sourceMode`,
`sourceCharacterCount`, an optional `pdfPageCount`, an optional `sourceLabel`),
`sectionCount`, `createdAt`, and `updatedAt` - nothing more. Opening one adds
`reviewerOutput` and, for Canvas reviewers only, a `sourceProvenance` summary
(`sourceSnapshotId`, `sourceTitle`, `sourceCount`, `selectedBlockCount`,
`wasEdited`, `generatedAt`, `parserVersions`, `ocrVersions`). Source health is a
further, explicitly requested call to `/api/reviewers/:id/source-status`.

Consequences that keep being rediscovered:

**There is no course.** No saved-reviewer field carries one, on the client or in
`packages/db`. A Library card cannot show course context without a schema
change.

**There is no grounding in the list.** Grounding lives inside `reviewerOutput`,
which the list endpoint does not return, so a grounding badge on a list card
would have to be fabricated. Grounding belongs to the Reader.

**The selected-block count is detail-only.** It is real, but it arrives with the
opened reviewer, not the list, so it reaches the student through the Reader's
`context` rather than through a list card.

**`createdAt` is the saved time.** `updatedAt` moves when a reviewer is renamed,
which answers no question a student asks of a shelf, so `createdAt` is the
timestamp shown and `updatedAt` is not displayed.

**Legacy and partial records are normal.** A reviewer can be saved with a blank
title, no `sourceLabel`, no `pdfPageCount`, and no provenance. Presentation must
degrade by omission - never `Unknown course`, `0 selected blocks`, or `N/A`.

Reopening a saved reviewer is a plain `GET /api/reviewers/:id` handed straight to
the Reader. No job is created, no Processing screen is involved, and no snapshot
is mutated. Do not route reopen through generation to simplify UI code.

## Provenance presentation policy

Snapshot identifiers, parser and OCR versions, and synchronized-source health
are real and are kept in the model. They are debugging material, not study
material, so they are presented as secondary: collapsed behind a `Source
details` disclosure below the document, never above it and never as the first
thing a reopened reviewer shows. Student-facing provenance is the short source
line (source name and kind) plus, where the Reader has it, the selected-block
count. Numeric grounding and coverage scores stay out of Study Library entirely.

Surrounding context comes from the screen, and each screen holds a different
amount. Canvas selection knows the course name, the source title, and the
selected block count. Study Library knows `sourceMetadata.sourceMode`,
`sourceLabel`, and, for Canvas reviewers, `sourceProvenance.selectedBlockCount`.
Processing knows only `job.source.displayName` - it has no course. The Reader
takes all of this as one optional `context` object and simply omits what it is
not given, which is what keeps a reopened saved reviewer from looking degraded.

## Physical acceptance already recorded

The Canvas selective reviewer was physically accepted on a realme RMX3151 running
Android 13. The accepted run selected three of nine returned blocks, produced a
durable job that completed 1/1 with coverage and grounding both 1.00, recovered
through Processing after force-stop, saved, and reopened from Study Library
without regeneration. Its snapshot records exactly three ordered paragraph
blocks in source order, with no OCR and `wasEdited = false`.

Treat the reviewer engine and the Canvas selective architecture as established.
The open work is presentation quality, not correctness.

## The five reviewer surfaces

Reviewer UI work spans one journey, not five unrelated pages:

```txt
1. Canvas block selection
2. Selective Preview
3. Processing
4. Reviewer Reader
5. Study Library
```

Design decisions should hold across all of them.

## Visual character

Stay Focused should feel warm, studious, quiet, focused, deliberate, and
mobile-native — closer to a reading room than a SaaS dashboard. It should not
resemble a crypto dashboard, a gaming UI, a neon AI product, or stock
Material/Bootstrap.

Brand tokens live in `apps/mobile/src/design/tokens.ts`. The accent is `#d7aa38`
and the light canvas is `#f6f4ef`. Gold is an accent, not a surface: use it for
the primary action, active and selected state, and key emphasis.

**Flat content, chrome may be glass.** Study content stays flat — selection
rows, preview text, processing information, reviewer sections, and Study Library
cards use warm solid surfaces, subtle warm borders, restrained shadows, soft
corners, and typographic hierarchy. Long reading content does not belong inside
translucent cards. Glass treatment is for navigation and floating chrome only.

**Typography** uses the existing setup — an Aptos / Segoe UI / SF Pro-like system
stack. Do not add font binaries for reviewer work. Establish hierarchy through
size and weight rather than decoration, and keep reviewer body text comfortable
for extended phone reading.

**Icons** use the app's existing Lucide-style outline set. No emoji as UI
iconography, and no second icon family for one screen.

**Interaction.** Touch targets are at least 44px (`hitTarget.min`). Selection is
never communicated by colour alone — a checkbox or icon state must carry it.
Disabled controls must look disabled. Respect safe areas and avoid nested
scrolling.

**Copy** is calm, direct, specific, and honest: `3 of 9 blocks selected`,
`Processing reviewer`, `Grounded`, `Save reviewer`, `Open reviewer`. Not
`Amazing!`, `AI magic!`, or `You're all set!`. Buttons state what they do.

**Grounding language** must never overstate. Where grounding data actually
exists, `Grounded` and `Limited grounding` are appropriate. Never claim
`100% accurate`, `Guaranteed`, or `Verified by AI`, and never fabricate a
grounding status, a metadata field, or a progress value for visual completeness.

## Screen-level intent

**Canvas selection** should answer, almost immediately: what source am I
viewing, what can I select, how much have I selected, and what do I do next. The
source is the content; the surrounding UI should not compete with it. Heading
hierarchy must stay visible when a source contains headings — the accepted
fixture happened to contain only paragraphs, which is not a reason to drop
hierarchy support. Selected blocks may use restrained gold accenting; they must
not each become a card.

**Selective Preview** should read as a second stage rather than more of the
selection list. The distinction to communicate is that selection is what the
student chose and preview is what the server resolved from that choice. The text
must be readable enough to inspect before generating, and stale preview state
must not appear valid.

**Processing** should answer what is processing, whether the job is really
running, what progress is real, whether it is safe to leave, and how to open the
result. Use actual job state. Do not simulate activity, invent ETAs, or add
cancellation that the system does not really support. Because jobs are durable,
telling the student that processing continues after leaving is accurate.

What a processing job actually carries is narrower than it looks. `ProcessingJobStatusView`
exposes status, a server-owned stage, `progress` (`completedUnits`, `totalUnits`,
`unitLabel` of `pages` or `sections`, and a `message`), `source` (display name,
`sourceKind`, mime type, and optional byte/character/page counts), timestamps,
`errorCode` / `safeErrorMessage` / `retryable`, `resultAvailable`, and
provenance. It carries **no course**: `canvasCourseId` is accepted when a job is
created but never returned in the status view, so Processing cannot show course
context without a backend change. Cancel and retry are both real server
operations (`POST /api/jobs/:id/cancel`, `POST /api/jobs/:id/retry`), so both
affordances are honest. There is no percentage field — any percentage must be
computed from the two unit counts or not shown at all.

**Reviewer Reader** is the payoff and should read as a well-designed study
document. Priority runs title, source and grounding context, section title,
section explanation, key points, then secondary metadata. Do not wrap every
paragraph in a card or let metadata overpower the material.

**Save** semantics are unchanged; the UI only needs to make state legible
(`Save reviewer`, `Saving...`, `Saved`). Do not introduce duplicate saves or
alter provenance as part of a visual change.

Save is owned by each screen, not by the Reader, and the three paths do not
share an implementation. Canvas and the PDF generate screen both hold a
`savedReviewer` summary and disable the control once it is set. Processing held
no such state until 2026-08-29 and would create a second Study Library entry on
a second tap; it now holds `savedReviewerId` for the same purpose. Any new Save
surface needs its own guard - none is inherited. Note that shared `Button`
replaces its label with a spinner while `loading`, so `Saving...` has to be said
in text beside the button rather than on it.

**Study Library** should feel like a collection of finished study material.
Show only fields that actually exist, keep entries scannable, keep them flat
rather than glass, and make reopen obvious. What those fields are, and why
course and grounding are not among them, is recorded under *What a saved
reviewer actually carries*.

**States** are product surface, not placeholders. Prefer contextual language:
`Loading source structure`, `No blocks selected / Select at least one block to
preview.`, `Couldn't load this saved reviewer`. Keep technical detail where it
aids recovery, and do not offer recovery actions the backend cannot perform.

## Implementation conventions

Reuse before adding. Shared primitives live in `apps/mobile/src/components`
(`Screen`, `Card`, `Button`, `TextField`), tokens in
`apps/mobile/src/design/tokens.ts`, and feature code under
`apps/mobile/src/features`. Small shared primitives may be added when they
clearly reduce duplication; do not build a new design-system layer for one pass.

Presentation logic that produces user-visible copy belongs in a testable helper
beside the feature (the pattern used by `canvasBlockSelection.ts` and
`canvasSourcePresentation.ts`), not inline in a large screen component.

`Screen` accepts an optional `footer`. The footer renders as a sibling below the
scroll area rather than floating above it, so scrolling content can never be
obscured by it, and the surrounding safe-area handling applies beneath it.
Screens that pass no footer are unchanged. Use this mechanism for a pinned
primary action rather than adding another one-off implementation, and keep the
footer light: status text plus a single primary control.

## Scope discipline

Reviewer refinement may touch Canvas selection, Selective Preview, Processing,
the Reviewer Reader, Study Library reviewer presentation, and small shared
primitives those screens require. It is not licence to redesign Today, Planner,
Tasks, authentication, Canvas account setup, onboarding, unrelated Courses
screens, or notifications.

Known limitations outside reviewer UI, which reviewer work should not silently
absorb: notification registration, delivery, and routing remain incomplete or
unverified; the Canvas school host still requires an explicit `https://`;
Processing history may not automatically anchor to the newest result — the
notification payload carries a `jobId` and `readNotificationDestination` returns
it, but `app/(app)/processing.tsx` does not read the param, so a notification
tap opens the list rather than that job. Group ordering now places a finished
reviewer above jobs that only need acknowledgement, so this does not block the
capstone journey; deep-linking to a single job remains unbuilt and belongs with
notification work. EAS may show the non-blocking Metro
`watcher.unstable_workerThreads` warning.

## Behaviours that must survive UI changes

```txt
Canvas:    open source → prepare if required → structure loads →
           default selection → change selection → Preview →
           change selection → old Preview invalid → Preview again → Generate

Processing: Generate → durable job created → leave flow → job persists →
            open Processing → same job appears → completion → Open reviewer

Saved:      Save → leave → relaunch → Study Library → reopen → no regeneration
```

The PDF reviewer path must remain usable after any shared reviewer UI change.

## Validation expectations

Reviewer UI work is not accepted because a screenshot looks good. It must
preserve correctness, state transitions, source grounding, durability,
provenance, and save/reopen behaviour.

Run checks proportional to the change: `npm run test`, `npm run typecheck`, and
`npm run lint` for the affected workspace, plus `git diff --check`. Report
results with explicit `FRESH`, `CACHED`, `NOT RUN`, `BLOCKED`, or
`NOT APPLICABLE` labels, and never hide a failed first attempt or a flake.

The mobile workspace carries four accepted pre-existing `import/first` lint
warnings in `src/services/*.test.ts`. They are tolerated only while unchanged;
any new warning is a regression.

Rendered screens should also be inspected. A browser or web-target check is
evidence about layout, not a physical acceptance. Physical Android testing on
the realme RMX3151 remains the strongest acceptance evidence for the capstone
flow, and only a real device run may be described as a physical pass.

## Current UI status

The Canvas selection and Selective Preview surfaces have had a presentation
pass: the selection count reports against selectable blocks rather than leading
with the 250 safeguard, the limit surfaces only when reached, the preview stage
is named and attributes its text to server resolution, the server-omitted block
count degrades to a countless sentence instead of a fabricated number, the
preview/selection binding is stated in the UI, and the primary Preview and
Create reviewer actions are pinned through the shared `Screen` footer.

Processing has also had a presentation pass: every card states its status in
words before colour, the headline comes from `status` while the live stage
reaches the student through the server's own `progress.message`, counted
progress is shown only from server-reported `completedUnits` / `totalUnits`
with no derived percentage, the durable-processing promise is attached to jobs
that are genuinely still running, a finished reviewer is grouped above jobs that
only need acknowledgement so `Open reviewer` is reachable, failure separates the
server's safe message from its error code, and restoring is distinguished from
having nothing to process. Presentation logic lives in
`apps/mobile/src/features/processing/processingJobPresentation.ts`.

The Reviewer Reader has now had its pass. It renders as a flat document on the
warm canvas rather than nested cards: a masthead of title, one compact source
line, a section count, and a single grounding chip, then sections separated by a
hairline and whitespace. Per-section coverage / source / clean chips are gone;
a section speaks up only when it genuinely failed grounding or was taken
extractively from the source. Item titles that merely repeat the section title
are dropped, an explanation that exactly restates the heading or the sole key
point is not shown twice, and body text moved from 13px to 15px at 1.6 line
height in `textPrimary` (`textMuted` fails AA on the page background at 4.1:1
and is not used for Reader text). The Reader is one component shared by Canvas,
Processing, the PDF generate screen, and Study Library reopen; each passes an
optional `context` and none of them supplies a header title of its own any more.
Presentation logic lives in
`apps/mobile/src/features/reviewer/reviewerReaderPresentation.ts`.

Reader test IDs changed with it: `reviewer-source-faithful-status`,
`reviewer-coverage-status`, and `reviewer-clean-output-status` no longer exist
and are replaced by a single `reviewer-grounding-status`. `reviewer-ready`,
`reviewer-title`, `reviewer-section`, `reviewer-explanation`,
`reviewer-key-point`, and `reviewer-quality-notice` are unchanged.

Study Library has now had its pass. The list reads as a shelf: a flat entry per
saved reviewer carrying title, one source line (`Week 3 announcement · Canvas`),
one scale-and-date line (`18 sections · from 12 pages · Saved Aug 21`), a primary
`Open reviewer`, and a quiet right-aligned `Delete` that still routes through the
existing confirmation. Rename moved off the list into the opened reviewer, where
the student can see what they are renaming, which halved entry height and keeps
roughly four entries on a 375×812 screen. Titles wrap to three lines and source
lines to two before truncating. The header reports a real count instead of the
signed-in email, and the loading, empty, and error states name what failed
(`Couldn't load your Study Library`, `Couldn't open this saved reviewer`) while
keeping the HTTP status and error code on a separate, quieter line. Opening a
reviewer now shows one back control, the Reader, then a saved date with Rename
and Delete, then the collapsed `Source details` disclosure. Library metadata uses
`textSecondary`, never `textMuted`. Presentation logic lives in
`apps/mobile/src/features/library/studyLibraryPresentation.ts`, and the Reader's
source-mode vocabulary is shared through the now-exported
`describeReviewerSourceMode`.

Library test IDs: `study-library-screen`, `study-library-count`,
`study-library-loading`, `study-library-empty`, `study-library-error`,
`study-library-success`, `study-library-reviewer` (with
`study-library-reviewer-title` / `-source` / `-scale`), `study-library-back`,
`study-library-saved-at`, `study-library-rename-card`,
`study-library-rename-input`, `study-library-source-provenance`,
`study-library-source-details-toggle`, `study-library-source-details`,
`study-library-source-status-summary`, `study-library-source-status-loading`,
and `study-library-source-readiness`.

All of this work passes the mobile automated checks and was inspected in a
web-rendered build. **None of it has been physically accepted on Android.** Do
not describe any of this as accepted until a real device run says so.
