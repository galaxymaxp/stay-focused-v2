# Study Reviewer and Quiz polish (2026-10-10)

Implemented locally on `claude/slack-session-m1o1ea`, based on main
`d9490fb5333804f70887f8905fb15aaf4e36804c`. Work used an isolated clone at
`../study-reviewer-quiz-polish`; the original dirty `stay-focused-v2` tree was
left intact. This report records local acceptance, not a production rollout.

## Result

- Web selections stay local until Check, navigation, Reveal or completion.
  Removing eager draft writes prevents blur/pairing saves from taking the
  single-flight action lock ahead of Check. Check now shows a spinner and
  Checking state while finalization is in flight.
- Identification and modified true/false retain normalized exact grading.
  Their in-quiz feedback is verdict-only; Reveal is unavailable. Final review
  displays accepted answer text, and mobile resolves review questions by ID.
- A forward migration accepts two-pair matching in both answer validation and
  completion scoring. It trims False labels and retains owner locks,
  finalized-answer protection, empty search_path and service-role-only grants.
- Reviewer quiz dialogs on web/mobile suggest an editable title from the
  selected topic or reviewer and count. Optional bounded titles pass through
  the shared request, server validation and persisted generation result.
- Concept/key-point Ask opens the existing composer without requiring a text
  range. It uses the existing selection validation, suggestions and two-follow-up
  limit, and sends no request merely by opening the composer.
- Web shimmer and native pulse are visible and respect reduced motion.
  Assist highlights fade through mounted overlays, with gentler pending marks;
  author emphasis has separate styling. The web selection toolbar has extra
  reader scroll space so it cannot hide the last point in a short reviewer.
- Mobile quiz Previous/Next buttons retain the existing slider and draft-saving
  path. Time formatters and inline date/time displays explicitly use hour12.

## Verification

| Command / check | Status | Result |
| --- | --- | --- |
| `npm ci` | FRESH | Passed |
| `npm run test --workspace @stay-focused/api` | FRESH | 119 files; 1264 passed, 3 skipped |
| `npm run test --workspace @stay-focused/mobile` | FRESH | 78 files; 791 passed |
| `npm run test --workspace @stay-focused/web` | FRESH | 11 files; 68 passed |
| `npm run test --workspace @stay-focused/shared` | FRESH | 10 files; 52 passed |
| `npm run test:workflow --workspace @stay-focused/api` | BLOCKED | Command exits with No test files found; tracked workflow-tests contains only .gitignore |
| `npm run typecheck -- --force` | FRESH | 8/8 tasks, no cache |
| `npm run lint -- --force` | FRESH | 8/8 tasks, no cache; 4 existing mobile import-order warnings |
| `npm run build` | FRESH / CACHED | 8/8 tasks; API/web/mobile fresh, 5 unchanged package tasks cached; native iOS/Android and web export succeeded |
| `git diff --check` | FRESH | Passed |
| `node scripts/web-browser-check.mjs --generation-fixture` | FRESH | Passed; fictional localhost API/Auth only |
| Physical native mobile end-to-end acceptance | NOT RUN | No supported Android control surface in this session |
| Live database migration / deployed API / provider generation | NOT RUN | No remote state changed |

API coverage includes actual PostgreSQL function execution through PGlite for
two-pair save/completion, partial credit and invalid duplicate pairs; strict
identification feedback; optional title validation and checkpoint title
threading. Native renderer tests cover explicit navigation/end disabling,
reordered review-by-ID, verdict-only feedback, concept Ask and custom title
request bodies. Web/mobile formatter tests force an en-GB default locale and
assert twelve-hour output.

The browser run checks immediate identification Check after typing, matching
Check, loading feedback, hidden in-quiz accepted text/Reveal, final five-question
100% score and all correct-answer labels, custom title persistence, navigation
draft recovery, concept Ask, animated shimmer and static reduced motion. It
also covers auth/proxy/session recovery, Queue/Reviewer reopen, Canvas fixture
sync/grades, keyboard navigation and ten major screens in light/dark themes at
390/1440px, plus 720px reflow. It reports zero browser exceptions, zero paid
calls and zero production/provider requests. The result and screenshots are
ignored local artifacts in `.local/website-qa`; build/test logs are outside the
clone as `../quiz-polish-*.log`. The phone final-review screenshot was inspected.

## Failed first attempts and corrections

- Typecheck caught hour12 mistakenly added to numeric toLocaleString calls in
  the initial sweep. Those changes were removed before the fresh passing run.
- Browser screenshot output used URL.pathname, leaving percent-encoded spaces
  on Windows. The harness now uses fileURLToPath.
- An overlapping initial production build and browser dev run interfered with
  Next output. That build was interrupted; browser QA now uses `.next-qa` and
  cleans up its server process tree on Windows. A combined cleanup/cache-delete
  action was rejected by automatic approval review with only "blocked by
  policy" stated. No cache deletion was retried.
- A cached-assist assertion counted the new explicit Ask request. Its assertion
  now runs before Ask, retaining the original cache guarantee.
- Browser interaction found the floating selection toolbar covering the last
  key point. Added reader padding during selection and confirmed the point can
  scroll above the toolbar.
- The workflow suite could not run because this main revision ships no workflow
  test files. The full API suite and production workflow compilation are the
  available local checks; this is not claimed as a workflow runtime pass.

## Remaining rollout and acceptance

Apply `20261009071002_quiz_two_pair_matching.sql` before release, roll out the
shared/server and web/mobile changes, and perform the requested physical mobile
flow: custom title, identification and matching Check, final score/review,
twelve-hour time, loader motion/reduced motion and concept Ask. Live provider
and deployed database behavior remain unverified. No remote push or deployment
was performed in this slice.
