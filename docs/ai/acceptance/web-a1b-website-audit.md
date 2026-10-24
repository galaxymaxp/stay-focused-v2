# WEB-A1b: website source recovery and completed local audit

2026-10-24. Baseline 4d93b19b, overnight/2026-10-15_feedback. Audit in progress;
no completion verdict until required fresh checks finish.

## Approved reference and scope

The actual runner checkout is the authoritative source for this direct owner
request. [Original WEB-A1 source stop](web-a1-website-roadmap-design-audit.md)
is preserved. No alternative product or design is selected.

References: docs/architecture/ADR-019-web-application.md, design/readme.md and
design/guidelines; current implementation
tokens/styles; [Website V1 acceptance](website-v1.md),
[website completion](website-completion-20261008.md),
[PAR1b inventory](../parity-web-mobile-20261018.md),
[UX1 audit](pbr-ux1-queue-actions-audit.md),
[UX2 repair](pbr-ux2-queue-actions-fix.md), and
[UX3 feedback](ux3-card-hover.md). Earlier design prose describing V2 as
scaffolding is historical; current Git implementation and later owner-approved
UX changes take precedence. ADR-019 explicitly records that the approved
neutral black/graphite Figma foundations supersede the older warm/gold bundle;
Inter is the system-font stand-in, with 48px targets, 12px controls and 16px
cards. No separate approved desktop frames exist; desktop derives from the
existing design language under the recorded owner authorization. No fresh Figma
frame comparison or exact desktop-frame match is claimed in this source audit.
The website deliberately excludes native offline study and native haptics.

Acceptance: complete source/roadmap gap inventory, browser evidence at phone,
tablet and desktop sizes, themes/text/motion/keyboard checks, fresh full web
suite and required root/typecheck/lint/build/API/web/Android-export gates,
scoped committed documentation and digest-pinned supersession. Completing an
audit records open product gaps; it does not require implementing unrelated
roadmap features or claiming production parity.

## Source-grounded gap matrix

| Area | Current owning source / evidence | Finding |
| --- | --- | --- |
| Four-tab app shell and responsive design | apps/web/src/components/ui.tsx; apps/web/app/globals.css; website-v1.md | Implemented web shell, themes and responsive presentation; fresh browser result pending |
| Today and schedule | apps/web/src/features/today/today-screen.tsx; schedule.tsx; existing browser harness | Existing browser-native planning/calendar; no redesign required by this audit |
| Account password recovery | apps/web/src/features/auth.tsx:76,145; password-reset.ts | Prior PAR1b forgot-password gap is closed in source; live email remains unverified |
| Library/course actions and Queue | apps/web/src/features/library.tsx; queue.tsx; components/course-options.tsx; course-navigation.tsx | UX2 and UX3 implement the approved action menus, header reflow and bounded feedback; fresh fixtures pending |
| Saved output export | apps/web/src/features/study-export.ts:6,11; shared/study-export | On-demand saved-content exports already exist; PAR1b's earlier missing-export finding is obsolete; no provider request required |
| Material source editing | apps/web/src/features/generate.tsx:623-772 | Current material screen offers saved-source metadata, Reviewer remake and Quiz setup; it lacks mobile's Canvas block selector/exact editable source preview. Existing parity backlog remains open |
| Quiz question flags | apps/web/src/features/quiz-navigation.tsx:12-66 | Current/unanswered/revealed question navigation exists; flag/unflag action is absent. Existing parity backlog remains open |
| Browser push | apps/web/src/features/notification-settings.tsx | Email preference/reminder and automatic Reviewer controls exist; browser push registration is absent. Existing parity backlog remains open |
| Appearance/platform preferences | apps/web/src/features/settings.tsx:55-70 | System/light/dark implemented; native palette/sound/haptic controls have no web equivalent. No unapproved parity expansion |
| Own-source photo capture | apps/web/src/features/own-material.tsx:97 | File picker accepts photos/documents; no explicit camera capture entry. Existing low-priority parity backlog |
| Generation details | apps/web/src/features/queue.tsx:597-620 | Detail dialog is present; its existence alone does not establish complete mobile detail parity |
| Offline study | website-v1.md and PAR1b | Excluded on website by design; not a missing feature in WEB-A1 |

Each implemented finding means source presence, not full authenticated/live
acceptance. This audit neither creates new roadmap work nor promotes deferred
parity gaps to completed features.

## Verification

Fresh check execution is under tmp/overnight/FS8-REPAIR. Typecheck and lint pass;
remaining gate and browser results will be recorded at closure. The synthetic
fixtures use current owning component bodies with explicit hook/auth/network
adapters; they are not authenticated production or physical Android evidence.
Real assistive-technology and live provider acceptance remain NOT RUN.

## Measured contrast correction

The source-token audit found light --muted #74716b on --bg #f7f6f2 at
4.498:1, narrowly below 4.5:1. This is used by small text such as .grade-fact dt,
not only decorative separators. The single light-theme token is darkened to
#706d67; dark theme and layout/behavior are unchanged. Original contrast output
is preserved locally before the corrected measurement. This is a bounded,
evidenced accessibility repair within the owner's readiness request. It is not
a full WCAG certification. The original fresh 583-test web execution predates
this CSS-only edit; post-edit verification is recorded separately below.
