# B37.1 pre-APK study experience polish — 2026-09-28

**Verdict: PARTIAL.** Starting branch `b25-3-3-ai-first`, HEAD `ad5e85e`. No EAS build, production migration, production API deployment, or B38 implementation in this task. The preexisting untracked `apps/mobile/.gitignore` and `tmp/` were left untouched.

## Scope and implementation

The user's latest clarification controls export: **generated Activities in Library support PDF, DOCX and PPTX; Reviewers support PDF only.** Quiz and Tasks-tab assignment exports are outside this scope. Earlier requested Reviewer Word/PowerPoint and Quiz formats were removed from the student-facing menu.

Reviewer generation can return constrained `bold`, `underline`, and `highlight` marks over existing text. Validation rejects missing, overlapping, punctuation-only, and overly broad emphasis. Rendering uses the AI marks and does not infer emphasis from keywords. Existing Reviewers without metadata still render.

New Matching generation requires 3–6 unique one-to-one pairs; the right-side options are shuffled and every pair is scored, with partial pair credit and no recall credit for a revealed answer. Historical one-term Matching stays readable. Quiz UI adds Previous/Next, direct question overview, Skip, a draggable slider with preview, answer reveal, resume and completed review. New owner-scoped RPC/schema changes persist position, skipped/revealed/assisted state and scoring. Generated Quiz content remains separate from attempts, and learner question DTOs keep the answer key server side.

Generated Activity output now has separate locally autosaved student responses and completion, overlaid onto Library status; draft edit autosave remains. Activity exports use the saved response, with PDF worksheet, Word document, and PowerPoint slide layouts. The PDF exporter paginates long content. No new AI call is required to export.

## Verification

The full mobile suite passed (701/701), full API suite passed (1069/1069, three existing skips), and mobile/API/engine typechecks passed. API lint and the production build passed after granting read access needed by the sandboxed toolchain. Full mobile lint passed with four existing `import/first` warnings outside changed files; focused changed-mobile lint passed cleanly. The engine build passed, but its full eval runner failed on a Windows Node ESM import of `packages/shared/src/quiz-capacity` (extensionless resolution); the focused Reviewer emphasis test passed. The forward SQL migrations are `20260928130000_quiz_study_state.sql` and `20260928130001_matching_blocks.sql`, after the existing canonical-source migration.

On realme RMX3151 (`PB6DWWEIHAUCMZOR`), an existing CC16 generated reflection Activity accepted `This is my study response.`, showed In progress, then Completed; after force-stop/relaunch, the Library status and text remained. Activity PDF, DOCX and PPTX saved to Android Documents and were pulled for inspection. PDF rendered as one readable page; its text and the ZIP/XML contents of DOCX and PPTX include the response. The PPTX contains three slides. An existing VPN Reviewer exported to a readable four-page PDF. Windows Office COM could not launch in this restricted logon session (`80070520`), so opening the Activity DOCX/PPTX in Office remains unverified. Android Downloads root rejected folder write permission; Android Documents succeeded. A PDF footer glyph fallback found during inspection was corrected in source after the device export.

## Open gates

- New Quiz SQL/API are not deployed; the production-backed dev client cannot physically accept new Matching, navigation, reveal, completion and retake yet.
- Offline Quiz questions remain viewable from the local Library copy, but active attempts and scoring still require the server. The requested offline attempt persistence is incomplete.
- No fresh Reviewer with AI emphasis or new multi-pair Matching Quiz was generated and visually accepted on the device.
- Activity task structures outside the tested generated reflection and format opening in Word/PowerPoint are not fully physically accepted.
- The new database migration and API have not had production acceptance or a matching physical dev-client run.

Stay on B37.1 until these gates pass. B38 is next only after B37.1 passes, then production Canvas lifecycle acceptance, one new EAS preview APK, and final physical acceptance. B37 remains PARTIAL.
