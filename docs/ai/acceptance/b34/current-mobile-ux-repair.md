# B34 current mobile UX repair

Date: 2026-09-21 (Asia/Manila)

## 1. Starting state

- Branch: `b25-3-3-ai-first`
- Starting HEAD: `e65b7ad`
- Dirty files before B34: none
- Physical device: realme RMX3151, Android 13, ADB serial `PB6DWWEIHAUCMZOR`
- Design references inspected: repository `design/SKILL.md`, `design/readme.md`, foundation guidance for typography, spacing, radii, color, flat/glass use, core Button/Card, GlassTabBar, and the mobile Today reference

## 2. UX architecture audit

### Generate

- Previous architecture: synchronized courses were collapsed into a generic `Choose a course` selector and the first course was selected implicitly.
- Root cause: the mobile composition treated the course collection as form input even though the API already returned owner-scoped persisted `canvas_courses`.
- New architecture: Generate opens as a browser of synchronized course cards. A course opens its instructional-material workspace; activities link to Tasks. Loading, empty-sync, empty-material, retry, and pagination states are explicit.
- Contract defect repaired: material DTOs now expose the latest owner-persisted Reviewer relationship through snapshot items. Quiz is enabled only for that Reviewer and is submitted as `sourceType: reviewer`; titles are never used as identity.

### Reviewer

- Previous rendering: each section heading sat above a rounded card that repeated the block title, while explanation, points, and evidence shared nearly identical styling.
- Duplication cause: section and block titles were rendered unconditionally even when they normalized to the same heading.
- New hierarchy: artifact/course/source identity, numbered topic heading, optional non-duplicate subtopic, readable explanation, tinted Key Points group, and indented labeled detail/example evidence. Long content remains wrapping and unconstrained.

### Generation

- Previous implementation: a layered purple/blue SVG blob/orb with interactive press effects and several continuously animated overlays.
- Replacement options evaluated: (A) native real-time procedural SVG/transform visual; (B) a pre-rendered loop asset.
- Selected approach: A, implemented as a lightweight native-driven study field where source fragments orbit and resolve into a page mark.
- Why: it uses existing React Native/SVG dependencies, adds no video decoder/startup or bundle cost, stops when unfocused/backgrounded, respects reduced motion, and keeps transforms/opacity on the native driver. A pre-rendered loop would have required a final authored video asset and extra playback/runtime behavior not present in the repository.
- Layout: status, 300-point visual, and supporting copy have independent reserved regions. Multiline status changes cannot reposition the visual. Status copy cross-fades/slides; completion resolves to a check-mark state.

### Library

- Previous navigation: static filter buttons triggered a separate API request and replaced the vertical content.
- New paging/navigation: one owner-scoped Library load feeds four always-mounted horizontal pages. Taps scroll natively to a page, horizontal swipes settle the category, and a rounded variable-width indicator interpolates with gesture position. Every page owns vertical scrolling, avoiding a horizontal/vertical manual gesture responder.
- Cards now share one compact anatomy for type, course, wrapped title, updated date, metadata, and navigation affordance. Structural skeletons replace the empty loading canvas.

### Today

- Handle geometry cause: the visible 20-point handle was smaller than the 22-point ring stroke, so the ring visually swallowed it despite a separate 48-point responder.
- Repair: visible diameter is 34 points with a complete 3-point contrasting border; interaction bounds are 56 points and share the same radial center. Explicit z/elevation and shadow keep both handles above the ring without clipping inside the 320-point canvas.

### Motion

- Previous state: screen fade and a few bespoke animations existed, but common actions and rows only changed opacity.
- New motion system: centralized 140/180/240/320 ms tokens and a restrained spring; reusable reduced-motion-aware press scaling for actions, rows, and chips; native Library paging/indicator motion; fixed-region generation state transitions and completion; existing focus/background animation suspension retained.

## 3. Implementation

| Area | Files | Changes |
|---|---|---|
| Generate | `GenerateScreen.tsx`, shared experience DTO, API experience mapper/service/repository | Synced-course browser, course workspace states, Tasks separation, persisted Reviewer-to-Quiz gate |
| Reviewer | `LibraryScreen.tsx` | Semantic reader hierarchy and normalized duplicate-title suppression |
| Generation | `GenerationScreen.tsx`, `GenerationVisual.tsx` | Orb removed, study-field visual added, stable layout regions and status transition |
| Library | `LibraryScreen.tsx` | Native horizontal paging, interpolated rounded tabs, cards, skeleton/error/empty states |
| Today | `DayRingClock.tsx` | 34-point visible handles, 56-point touch geometry, z-order/border repair |
| Motion | `themeTokens.ts`, `primitives.tsx` | Shared restrained timings/spring and reduced-motion-aware press feedback |

## 4. Generate behavior

- Synced courses tested: automated owner-scoped API and mobile course-browser coverage passes.
- Unsynced filtering: the root consumes only persisted owner-scoped `canvas_courses`; it does not query arbitrary Canvas courses.
- Instructional-material filtering: existing Canvas reviewer source service remains the source of truth.
- Announcement exclusion: unchanged existing reviewer-source routing.
- Task/activity separation: course workspace links deadline-bearing/submittable work to Tasks and does not mix assignments into reviewer materials.
- Reviewer availability: unchanged readiness and preparation contracts.
- Quiz dependency behavior: fresh API/mobile regressions prove unavailable without `reviewerId` and reviewer-based submission when present.

## 5. Reviewer physical inspection

| Reviewer | Duplicate headings | Hierarchy | Long-content behavior | Result |
|---|---|---|---|---|
| Accounting | Not physically rerun on changed build | Not physically rerun | Not physically rerun | BLOCKED |
| Japanese / FL100 | Not physically rerun on changed build | Not physically rerun | Not physically rerun | BLOCKED |
| Third distinct Reviewer | Not physically rerun on changed build | Not physically rerun | Not physically rerun | BLOCKED |

The code path is schema-driven and automated rendering/contract checks pass, but B34 does not substitute those checks for required authenticated physical inspection.

## 6. Generation experience

- Rendering approach: procedural SVG plus native-driven wrapper transforms.
- Stable visual position: yes by construction; status is 78 points, visual is 300 points, supporting copy is at least 56 points.
- Status transitions: 100 ms exit plus 180 ms restrained entrance; reduced motion swaps immediately.
- Physical animation quality: BLOCKED on authenticated changed build.
- Queue/background behavior: existing intent admission, recovery store, server polling, Queue link, and artifact open logic were retained.
- Completion behavior: existing artifact routing retained; visual resolves to an accessible completed state.

## 7. Library acceptance

- Tap navigation: automated interaction coverage passes.
- Horizontal swipe: native `pagingEnabled` implementation built successfully; authenticated physical gesture check BLOCKED.
- Indicator animation: position and width interpolate directly from native scroll offset.
- Vertical-scroll interaction: independent vertical ScrollViews inside a horizontal native pager; physical conflict check BLOCKED.
- Loading: structural cards on every page.
- Long titles: wrap naturally with no fixed card height or truncation.
- Empty states: category-specific with a synced-course action; API errors expose retry.

## 8. Today clock acceptance

- Handle diameter: 34 points over a 22-point track.
- Ring overlap: 6 points of visible coverage beyond each track edge, plus border.
- Touch target: 56 points centered on the radial path.
- Drag behavior: existing hold/PanResponder semantics retained; automated ring mapping passes.
- Edge-angle clipping: geometry stays inside the 320-point canvas at all ring angles; physical sweep BLOCKED.

## 9. Motion acceptance

| Interaction | Implementation | Physical result |
|---|---|---|
| Button/card press | shared native spring scale and opacity | BLOCKED on changed authenticated build |
| Library tabs/pages | native paging plus interpolated capsule | BLOCKED |
| Screen/content entrance | existing reduced-motion-aware Flow fade | Existing implementation retained |
| Generation state/completion | fixed regions, status transition, resolving page mark | BLOCKED |
| Reduced motion | system listener plus stable visual/instant status paths | Automated checks pass |

## 10. Automated verification

| Command | Result | Notes |
|---|---|---|
| `npm run typecheck -- --force` | PASS, FRESH | 7/7 workspaces, zero cache hits |
| `npm run lint -- --force` | PASS, FRESH | 7/7; four pre-existing mobile test import-order warnings only |
| `npm test --workspace @stay-focused/mobile` | PASS, FRESH | 456/456 |
| `npm test --workspace @stay-focused/api` | PASS, FRESH | 895 passed, 3 opt-in skipped |
| `npm test --workspace @stay-focused/canvas` | PASS, FRESH | 73/73 |
| `npm test --workspace @stay-focused/shared` | PASS, FRESH | 44/44 |
| `npm run build --workspace @stay-focused/mobile` | PASS, FRESH | Android/iOS/web export complete |
| `npm run build --workspace @stay-focused/db --workspace @stay-focused/api` | PASS, FRESH | isolated production build; root first attempt hit sandbox path traversal only |
| `git diff --check` | PASS | no whitespace errors |

## 11. Physical Android acceptance

- Device: realme RMX3151
- Android: 13
- ADB: authorized
- Changed bundle: loaded locally in Expo Go through ADB reverse.
- Auth boundary: Expo Go uses a separate secure store from the installed signed production app and therefore opened signed out. Public mobile configuration was recovered locally from the installed bundle without printing it, but the private authenticated session was not extracted.
- Signed preview: not built because EAS upload of the dirty working tree requires explicit user approval; the execution policy rejected the upload attempt.
- Generate: BLOCKED on authenticated changed build.
- Reviewer: BLOCKED on authenticated changed build.
- Generation: BLOCKED on authenticated changed build.
- Library: BLOCKED on authenticated changed build.
- Today: BLOCKED on authenticated changed build.
- Motion: BLOCKED on authenticated changed build.
- Overall: PARTIAL.

## 12. Evidence

- Local-only device screenshot: `.local/b34-expo.png` (changed bundle at auth boundary; intentionally not committed as UX acceptance evidence).
- ADB identity output recorded in this report.
- Automated command results recorded above.

## 13. Files changed

- Shared/API: `packages/shared/src/experience.ts`, fixtures, experience repository/mapper/service and tests.
- Mobile design: `themeTokens.ts`, `primitives.tsx`.
- Mobile screens: Generate, Generation, GenerationVisual, Library, DayRingClock and screen/visual tests.
- Mobile client: safe experience error copy and test.
- Documentation: this report plus current-state, sprint, and roadmap reconciliation.

## 14. Git result

- Implementation commit: `b373e81 feat(mobile): overhaul current mobile UX`.
- Documentation commit: the commit containing this report; its hash is reported in the final delivery.
- Final HEAD: the documentation commit containing this report.
- Remaining dirty files: none expected after the documentation commit; verified in the final delivery.
- Unrelated files left untouched: yes; the starting tree was clean.

## 15. Verdict

PARTIAL — B34 improved but has unresolved acceptance items

The implementation and automated gates pass, but the required authenticated physical checks and final screenshots/recording have not run on the changed signed build. B35 should begin only after explicit approval to upload/build a signed preview (or a user-provided authenticated local development session), then execute the complete B34 physical matrix before treating B34 as accepted. After that, keep the requested sequence: B35 Physical UX Acceptance, B36 Generation Quality Acceptance, B37 Full E2E / Demo Acceptance, B38 Capstone & Release Hardening.
