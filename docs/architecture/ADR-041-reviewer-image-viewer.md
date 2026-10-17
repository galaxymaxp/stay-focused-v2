# ADR-041: Scrollable reviewer image viewer

Date: 2026-10-17
Status: Implemented locally for IM2; rollout and physical acceptance pending.

## Context and decision

Mobile external references and figures used Sheet while snapshots used a separate
full-screen Modal. Always-visible attribution cluttered external thumbnails,
and image responders prevented natural scrolling and dismissal.

Use one ImageViewer native Modal for all three image surfaces. Opening reveals
title/source/attribution details; grounding labels stay visible in both contexts.
External Commons and license links are direct viewer controls with 48-point
targets. Ask and Save retain existing exact targets and guards. Web uses the
same reveal-on-opening pattern within its native dialog.

Scroll image, details and actions together. A bounded image frame retains
ZoomablePage pinch/double-tap/pan. Zoom 1 permits native scroll takeover; zoomed
images retain their responder and disable surrounding vertical scrolling.
Observe raw touches, following the existing sheetDrag Android Modal precedent,
without competing with native scrolling. Dismiss only a downward vertical drag
starting at scroll top and zoom 1, at 120 dp or at least 24 dp and 0.9 dp/ms.
Cancel eligibility on pinch, horizontal intent, upward scrolling or cancellation.
Reduce Motion removes translation/spring and Modal animation. Android back and
the explicit Close control always dismiss. Native Modal isolation prevents
viewer touches from reaching ReviewerReader's right-edge scrubber.

## Consequences

No dependency, native module, API, schema, credential or provider changes.
Native gesture arbitration still requires owner RB5 on Realme. Automated helper,
touch lifecycle, zoom and action tests are local evidence, not physical proof.
Web uses native Esc semantics, explicit Close and bounds-checked backdrop clicks;
dialog and image overflow permit scrolling at every slider zoom.
