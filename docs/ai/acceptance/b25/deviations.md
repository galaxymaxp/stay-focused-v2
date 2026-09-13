# B25 visual comparison and deviations

Compared the actual React Native screen components compiled through React Native Web with the approved UI showcase. Each isolated frame is 390 x 844 CSS pixels. API/auth/router/persistence adapters are replaced only in a temporary visual harness outside the app; fixture content comes from contract/component tests. No fake data or bypass route was added to production. These captures omit the real native tab navigator and device safe areas. Today uses its empty-data state. This is component visual evidence, not authenticated end-to-end evidence or pixel-perfect certification.

Local captures: `C:/Users/Public/stay-focused-b25/{today,generate,material-sheet,generation,queue,tasks,library}.png`. Temporary harness: `%TEMP%/b25-visual`; builder: `%TEMP%/b25-visual-build.cjs`. Captures and harness are not committed, following the repository rule excluding validation output.

| Area | Match | Deviation | Reason |
| --- | --- | --- | --- |
| Today | Prominent day ring, center time, Up Next then Later | Empty-data render has no invented colored schedule, decorative artwork or avatar; fallback controls below | Actual DTO supplies timed segments; accessibility and truthful data |
| Generate | Course selector, rounded modules, file rows in Canvas order | Immediate action sheet; no duplicate Modules/Materials control or generated course data | Backend order is authority; actions must be visible after selection |
| Generation | Sparse full screen, status above orb, reassurance, Queue CTA | Simpler layered orb with fewer light trails; no bottom tabs | Bounded native animation foundation; Markdown overrides image tabs |
| Queue | Neutral grouped cards, status and saved-output entry | Larger explicit controls, separate queued/completed/attention states, no guessed ETA | Backend states and accessibility; no fabricated estimates |
| Tasks | Now/Next/Later, compact rounded rows | Groups remain visible, add/manage actions remain; no invented course icons or completion circle | Preserve real editing/completion and backend grouping |
| Library | Categories, compact saved-artifact cards | Filters wrap at narrow width; no invented completion bars/thumbnails | Native text/touch sizing and actual metadata |
| Dark mode | Black/graphite, white text, localized accents | Stronger secondary text; less decorative glow | Readability and native rendering cost |
| Light mode | Warm off-white, translucent cards, opaque elevated sheet | Stronger text/action contrast; subtler shadows | Accessible controls and clear foreground content |

Visual feedback applied: converted large task/Library action cards to whole-row links; moved material actions into a modal sheet; moved status above orb; made the light sheet opaque to keep background text from bleeding through; added safe bottom handling. The second app showcase describes deeper Reviewer/Quiz/Activity views: their full visual treatment remains B26. Basic functional routes exist now; no deep-screen fidelity claim is made.

## B26 scope

- Reviewer: premium reader hierarchy, source controls and capability-aware Quiz me entry.
- Quiz: configuration, answer-selection polish, resume position and richer accessible transitions.
- Results/weak areas: source-linked remediation and coherent review flow.
- Activity Maker: richer assignment context and draft workflow.
- Draft editor: section/slide structure controls, speaker notes, conflict recovery UI and keyboard ergonomics.
- Shared-element reader transitions, task/queue state choreography and richer orb lighting after physical profiling.

## Blocking acceptance work

Unlock/sign in to the physical Expo preview and complete the device matrix; verify the intended hosted B24.6/B24.7 migration and API deployment before claiming live Quiz/Activity availability. No new backend rollout is bundled into B25.
