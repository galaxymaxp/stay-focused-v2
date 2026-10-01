# B40 — Reviewer Smart Selection Learning Tools

Date: 2026-10-01 (Asia/Manila)

**Verdict: PASS — B40 Reviewer Smart Selection Learning Tools acceptance passed.**

**Production-deployed (2026-10-01).** API deployment `dpl_CW3TWB9FjkXAoMvBPRbMntZvqMaR` (READY, aliased to `stay-focused-v2-prototype.vercel.app`) and preview OTA group `ded5f2a6-19a4-4934-99ea-23610409a642` (Android update `01a0f784-06f8-7b87-9527-dde51592b418`, runtime 2.0.1, commit `e52690d`). Both were smoke-tested on the installed preview app. See §18.

B39 was closed before this work by the [B39.2 physical acceptance record](../b39.2/physical-canvas-android-acceptance.md) and is not reopened here. Native Office DOCX/PPTX opening acceptance moves to **B41**.

## 1. Starting state

- Branch: `b25-3-3-ai-first`
- Starting HEAD: `98feb4d` (`docs(ai): close B39.2 physical Android acceptance`), matching the expected HEAD.
- Dirty files at start: none tracked. Untracked: `UI/`, `apps/mobile/.gitignore`, `supabase/`, `tmp/`. All are unrelated to B40 and were left untouched.
- Device: realme RMX3151, Android 13, ADB serial `PB6DWWEIHAUCMZOR`.
- Reviewer used: the existing persisted Reviewer *Firewalls & VPNs — Student Reviewer* (IT Security, CC16), 27 topics, artifact `fa8bf56c-4691-45cb-a8be-7f0866a27f5e`. No Reviewer was generated for B40.

## 2. Audit

- **Reviewer rendering:** `ReviewerReader.tsx` renders each block's explanation, key points and evidence as plain React Native `Text` with tap handlers. Nothing in the Reviewer body is `selectable`.
- **Existing bottom sheet:** tapping a concept already opens the B37 *Study Assist* sheet (`StudyAssistSheet.tsx`), built on the shared `Sheet` primitive. That primitive provides bottom presentation, drag/Done/backdrop dismissal, scrolling and reduced-motion handling.
- **Existing AI service:** `POST /api/experience/study-assist` (`study-assist.ts`). It verifies the bearer token, resolves the owner's Reviewer through `getLibraryArtifact`, reads the canonical record with the user's own Supabase client, and resolves the block's cited original-source blocks (`sourceBlockIds`). It calls OpenAI `gpt-5.4-2026-03-05` at low reasoning effort.
- **Selection capture:**
  - React Native `Text` exposes no selection range to JavaScript.
  - Android `TextInput editable={false}` maps to `isEnabled=false`, which disables selection entirely.
  - Custom items in Android's native selection toolbar would need a native `ActionMode` module and a new APK.
  - `contextMenuHidden` aborts the selection action mode, so it cannot be used either.
- **Approach chosen: Study → bottom sheet.** On the owner's mid-task direction, the interaction is locked to: Reviewer topic tap → existing Study Assist sheet → selectable full concept text → Define / Explain / Example / Test Me / Ask in the same sheet.
- **Reason:**
  - It reuses the accepted sheet and gesture without touching native code.
  - Android's own selection handles and Copy/Share/Select All menu are kept.
  - The exact range is captured through `onSelectionChange` on a surface that is editable but locked (`showSoftInputOnFocus={false}`, `caretHidden`, value held fixed).

## 3. Implementation

| File | Purpose |
| --- | --- |
| `packages/shared/src/study-tools.ts` | One contract for every action: action and modifier unions, labels in fixed order, limits, grounding labels and copy, the block "surface" text shared by client and server, selection normalization and verification, session cache keys, result validation. |
| `packages/shared/src/index.ts` | Export. |
| `packages/shared/src/experience.ts` | Four distinct product error codes: selection too large, question too long, answer too long, follow-up limit. |
| `apps/api/src/lib/study-tools.ts` | Request parsing and server limits; selection verification against the owner's block; bounded context building; per-mode prompts and strict JSON schemas; grounding handling; source-only Test Me; safe provider-error mapping; a per-user burst guard. |
| `apps/api/app/api/experience/study-tools/route.ts` | Authenticated route reusing the Study Assist ownership and canonical-record path. It logs sizes only. |
| `apps/api/src/lib/study-assist.ts` | Extracted the shared `referencedSourceBlocks` provenance helper; Study Assist behaviour is unchanged. |
| `apps/api/src/lib/experience/errors.ts` | Student-facing copy for the new codes. |
| `apps/mobile/src/services/studyTools.ts` | A session per sheet: reuses identical results (including offline), shares duplicate in-flight requests, and maps each failure to distinct copy without signing the student out. |
| `apps/mobile/src/features/reviewer/SmartSelectionPanel.tsx` | Selectable surface with the tapped passage preselected, retained selected quote, five fixed actions, results, grounding badge, refinement chips, Test Me and Ask flows, compact loading. |
| `apps/mobile/src/features/reviewer/StudyAssistSheet.tsx` | Hosts the panel above the B37 quick assists, which are hidden while a learning action is open. |
| `apps/mobile/src/design/primitives.tsx` | `Sheet` accepts an optional `scrollRef` so a focused field can be scrolled clear of the keyboard. |
| Tests | `study-tools.test.ts` and `study-tools/route.test.ts` (API), `SmartSelectionPanel.test.ts` (mobile). The `StudyAssistSheet.test.ts` tile selector was narrowed to the B37 tiles; no assertion changed. |

## 4. Learning-action architecture

- **Endpoint:** a single route, `POST /api/experience/study-tools`.
- **Actions:** `define | explain | example | test | ask`, always shown in that order.
- **Modifiers:**
  - Define: `plain_words`, `in_context`, `key_traits`, `compare`
  - Explain: `simpler`, `deeper`, `analogy`, `why_it_matters`
  - Example: `real_world`, `step_by_step`, `another`, `counterexample`
  - Test Me: `check`, `another`, `harder`, `apply`, `explain_answer`, `choices`
  - Ask: none
  - The server rejects any modifier that doesn't belong to the action.
- **Request fields:**
  - Reviewer, section and block IDs, plus the block content hash and prompt version.
  - The selected text.
  - Optional fields: the Ask or Test Me question, the student's answer, the previous result (so a refinement differs from it), and up to two earlier Ask turns.
  - The server rejects any other field.
- **Context construction:**
  - The server resolves the owner's Reviewer and canonical record itself, and verifies that the selection really is text from that block (after whitespace and bullet normalization). Text from elsewhere is rejected, so the tool cannot be used as a free chatbot.
  - The context contains only:
    - the selected block (budget 6,000 characters)
    - nearby blocks in the same section (3,000)
    - the block's cited original-source excerpts, ranked by overlap with the selection (5,000)
  - The whole Reviewer, whole source and full chat history are never sent.
  - Measured on the device: 859–1,047 characters of context, with `sourceExcerpts: 1`.
- **Model:** `gpt-5.4-2026-03-05` at `reasoningEffort: low`. This is the model already accepted for B37 Study Assist; the project has no cheaper validated production model. It can be overridden server-side with `STUDY_TOOLS_MODEL`.
- **Input limits (enforced on the server; the app also checks them first):**
  - selection: 2,000 normalized characters, and the raw selection is rejected above 4,000
  - Ask question: 1,200
  - Test Me answer: 1,200
  - previous result: 2,400
  - request body: 48 KiB
- **Output limits:**
  - Provider ceilings: Define 900, Explain 1,100, Example 1,000, Ask 1,200, question 700, choices 800, check 800, explain answer 1,000 tokens.
  - An over-long result fails validation; it is never silently truncated.
- **Follow-up limit:** the first question plus two follow-ups. After that the app shows **New question**, and the server rejects a third follow-up.

## 5. Grounding

| State | Result | Evidence |
| --- | --- | --- |
| From your material | PASS | Define "Stateless", Explain, Ask turn 1 (`05`, `13`, `36`) |
| Source + general knowledge | PASS | Define → Compare and Ask (`10`, `11` shows the tap-to-explain text) |
| General knowledge | PASS | Ask follow-up "How do later firewalls fix this?" fell back automatically, with no prompt to the student. Automated tests also cover it. |
| Test Me source-only | PASS | Every question, check, Harder, Apply it and Explain answer came from the lesson. The server labels Test Me as material and returns the truthful insufficient state instead of outside knowledge. |

## 6. Define

| Action | Result | Notes |
| --- | --- | --- |
| Default | PASS | 50-word definition of "Stateless", From your material |
| Plain words | PASS | Genuinely simpler ("looks at one packet at a time… does not remember"), not just shorter |
| In context | PASS | Ties "stateless" to first-generation firewalls and this lesson's FTP case |
| Key traits | PASS | Five concise bullets |
| Compare | PASS | Stateless vs stateful inspection; correctly labelled Source + general knowledge |

## 7. Explain

| Action | Result | Notes |
| --- | --- | --- |
| Default | PASS | Sentence "Each packet is treated in isolation", three short paragraphs |
| Simpler | PASS | 113 words; rebuilt from a "guard who forgets everyone" image, with secondary detail dropped |
| Deeper | PASS | 223 words; header fields, why state is needed, rule rigidity, FTP implications |
| Analogy | PASS | Exactly one analogy, mapped point by point, with its limit stated |
| Why it matters | PASS | Problem addressed and concrete consequence (FTP), no filler |

## 8. Example

| Action | Result | Notes |
| --- | --- | --- |
| Default | PASS | Used the material's own FTP example, as instructed |
| Real world | PASS | An employee uploading over FTP through a packet filter |
| Step-by-step | PASS | Adapted to a recognition sequence, because the concept is not a process |
| Another | PASS | Genuinely different (the envelope-checking guard), though more illustrative than technical |
| Counterexample | PASS | A connection-aware (stateful) firewall, naming the missing defining feature |

## 9. Test Me

- **Question:** "What is another name for first-generation firewalls?"; on a passage selection, "What does it mean that first-generation firewalls are stateless?"
- **Answer submission:** the field opens the keyboard (unlike the selection surface) and Check Answer stays disabled until something is typed.
- **Evaluation:** "packet filters" was graded **Correct** despite different wording. Choosing a wrong multiple-choice option gave **Try again**, with source-faithful feedback.
- **Harder:** "Why can packet filter firewalls have difficulty handling FTP connections, and how is that difficulty related to them being stateless?"
- **Apply it:** a scenario question about an FTP session opening a random port.
- **Explain answer:** cited the notes directly. *Need choices?* produced four plausible options, one of them correct.
- **Outside knowledge leakage:** none observed.
- **Result:** PASS

## 10. Ask

- **Normal question:** "What could I confuse this with?" → 162 words, Source + general knowledge.
- **Context size:** 859 characters (a 261-character selection plus the block, nearby content and one cited source excerpt).
- **Output size:** 147–223 words across four answers.
- **Over-limit handling:** a synthetic 1,201-character string showed "Your question is too long…", disabled Ask, and sent no request (28 POSTs before and after). The server limit is covered by automated tests.
- **Follow-up behaviour:** turns sent `followUps: 0`, then `1`, then `2`; the counter read "2 follow-ups left", then "1 follow-up left"; after the third turn **New question** replaced the input.
- **Grounding:** the three turns were labelled From your material, General knowledge, and Source + general knowledge respectively.
- **Result:** PASS

## 11. Physical Android acceptance

- **Selection integration:** Study → bottom sheet, via the existing topic tap.
- **Term selected:** "Stateless", by native long-press; Android handles, Copy/Share/Select All, no keyboard (`mInputShown=false`).
- **Sentence selected:** "Each packet is treated in isolation", by dragging the handle; the sheet did not move.
- **Passage selected:** the full 261-character explanation (preselected from the tap) and the phrase "Packet filter firewalls".
- **Bottom sheet:** opens over the Reviewer, scrolls, and shows compact skeleton loading inside the sheet (`06`). Change selection restores the previous range.
- **Dismissal:** Done and swipe-down both close the sheet; the Reviewer stays as it was.
- **Offline behaviour:**
  - With Wi-Fi off and the API tunnel removed, Library and the Reviewer opened from device storage ("Showing the copy saved on this device…").
  - Explain showed "You're offline. Reconnect to use this learning tool."
  - After reconnecting, Try again succeeded.
- **Reduced Motion:**
  - "Remove animations" was turned on in system Settings (animation scales 1/1/1 → 0/0/0), and the sheet then opened and closed with no slide.
  - The first try exposed a defect: focusing the field could clear the preselection. It was fixed (§16), then passed 3/3.
  - The setting was restored to Off (scales 1/1/1).
- **Navigation regression:** search ("stateful", "treated in isolation") and the right-edge topic scrubber ("14 / 27") work.
- **Result:** PASS

## 12. Passive and regression behaviour

Measured against the 09:40 UTC baseline (owner aggregates via SQL), then re-checked at 10:45 UTC:

- **Canvas sync triggered:** no. 476 jobs before and after; 0 created since the baseline; 0 active.
- **Reviewer regenerated:** no. 212 processing jobs before and after; 0 created since the baseline.
- **Library artifact changed:** no. 71 artifacts and 71 versions before and after; the Reviewer still has its single 2026-09-26 version, and `updated_at` is unchanged.
- **Search, section navigator, offline Reviewer:** PASS.

## 13. Automated verification

All FRESH.

| Command or test | Result | Notes |
| --- | --- | --- |
| `npm run test --workspace @stay-focused/shared` | PASS | 50/50 |
| `npm run test --workspace @stay-focused/api` | PASS | 1,198 passed, 3 pre-existing skips; includes 103 study-tools and study-assist lib tests and 8 route tests |
| `npm run test --workspace @stay-focused/mobile` | PASS | 778/778; includes 14 Smart Selection interaction tests |
| `npx turbo typecheck --force` | PASS | 7/7 |
| `npx turbo lint --force` | PASS | 7/7; the 4 pre-existing mobile `import/first` warnings only |
| `git diff --check` | PASS | |

An interim run had 7 existing Study Assist tests failing, because their tile selector also matched the new action pills. The selector was narrowed to the B37 tiles; no assertions were weakened.

## 14. Security and cost

| Check | Result | Notes |
| --- | --- | --- |
| Ownership | PASS | Bearer verification, owner-scoped `getLibraryArtifact`, a user-JWT canonical read, a content-hash check, and selection verification against the owner's block. Tests cover other-owner, deleted, unsupported and forged-field cases. |
| Source exposure | PASS | Only cited source blocks of the selected block, within budget. Responses never contain provenance IDs or scores. |
| Secret leakage | PASS | The request log records only action, modifier, model, character counts, excerpt count and follow-up count. The API log had 0 lines containing course content and 0 failed requests. Provider error text is never returned. |
| Selection limit | PASS | 2,000 normalized characters, enforced by the server and checked first in the app |
| Ask limit | PASS | 1,200 characters; on-device block plus server 422 |
| Context bound | PASS | 6,000 / 3,000 / 5,000 character budgets; 859–1,047 characters observed |
| Output bound | PASS | Per-mode token ceilings; over-long results fail validation |
| Lazy refinement generation | PASS | Only the default result generates; a refinement generates when tapped. Re-tapping Analogy made no new request (10 before, 10 after). |

## 15. Evidence

All screenshots are in [`evidence/`](evidence/). Captures after 18:00 local time have the owner's floating Messenger chat-head area masked.

- **Selection and sheet:**
  - `02` the topic tap opens the sheet with the tapped passage preselected
  - `03`, `04`, `12`, `18` native selection
  - `31` a preselected passage
- **Define:** `05`, `06` (loading), `07`–`10`, `11` (badge detail)
- **Explain:** `13`–`17`
- **Example:** `19`–`23`
- **Test Me:** `24`–`29`, `32`–`34`
- **Ask:** `35`–`38`
- **Offline and Reduced Motion:** `39`, `40`, `41`
- **Regression:** `01` search, `30` swipe dismissal, `42` scrubber

## 16. Defects found and fixed during acceptance

1. **Preselection race under Reduce Motion.**
   - **Defect:** focusing the field could report a collapsed cursor after the preselection was applied, which cleared it.
   - **Fix:** collapsed reports count only after the student touches the text, and the range is re-applied once after layout. Regression test added.
2. **Keyboard covering the Ask and answer fields.**
   - **Cause:** Android `Modal` windows don't resize for the keyboard.
   - **Fix:** a focused field gets temporary room below it and is scrolled to the top of the sheet through the new optional `Sheet` `scrollRef`. Input height is capped at 150.
3. **Selection colour and selected-state contrast.**
   - **Defect:** the first selection highlight (`blueSoft`) was nearly invisible in dark mode, and the selected refinement chips and choices were unreadable.
   - **Fix:** the highlight now uses the existing search highlight token (`findActive`); selected chips and choices use an accent outline.

## 17. Test environment and remaining limitations

*Updated by §18: production deployment and the preview OTA are now done.*

- **Environment:**
  - Acceptance ran against a **local API**: `next dev` on the laptop, with server variables from `C:\Projects\stay-focused-v2\.env.local` loaded into the process only (owner-authorized; values never read or printed). It used the production Supabase project, read-only, and the real OpenAI provider.
  - The phone ran a **locally built, coinstalled debug client** (`com.galaxymaxp.stayfocusedv2.b40debug`) over USB `adb reverse`. It was uninstalled afterwards; the installed preview app and its data were never touched.
  - No production deployment, EAS build or OTA update was made.
  - **Shipping B40 still needs a production API deployment and a preview update** (B40 adds no native module, so an OTA is sufficient).
- **Native selection toolbar:**
  - The toolbar inside the sheet also shows Cut. Cut and paste are reverted immediately because the field's value is fixed, but the menu items still appear.
  - The Reviewer body itself is still not natively selectable.
  - Custom toolbar actions would need a native module.
- **Rate limiting:** the burst guard (20 requests per user per minute) is per server instance, not a durable quota.
- **Latency:** responses took about 4.5–12 seconds against the local API.
- **Quick assists:** the B37 quick assists remain below the selection surface; consolidating them with the B40 actions is a product decision for later.

## 18. Production closure (2026-10-01)

The owner explicitly authorized the production deployment and the preview OTA.

### Quick-assist / selection-action cleanup

Commits `3bcbc8a` and `e52690d`:

- The sheet now opens with **nothing selected** and shows the four B37 quick assists as whole-topic actions.
- Selecting text **replaces** that area with Define · Explain · Example · Test Me · Ask. Clearing the selection brings the quick assists back, so the two sets never show together.
- This supersedes the earlier automatic preselection of the tapped passage (§11), which would otherwise have hidden the quick assists every time the sheet opened.
- Change selection still restores the previous range. Grounding, limits, Test Me rules and sheet state are unchanged.

### Defect found on the device and fixed (`e52690d`)

- **Defect:** swapping the tall quick-assist grid for the one-row action set shrank the sheet in the middle of a long-press. The text slid about 140 px under the finger, and Android stretched the selection across several lines (it captured "recognize whether … Stateless" instead of "Stateless").
- **Fix:** the sheet content keeps the tallest height it has reached while open. Regression test added.
- **Re-verified on the phone:** the sheet's title edge stayed at y=527 before selection, after selection and after clearing it.

### Deployment identifiers

| Item | Value |
| --- | --- |
| API deployment | `dpl_CW3TWB9FjkXAoMvBPRbMntZvqMaR`; target production; READY; alias `https://stay-focused-v2-prototype.vercel.app` |
| API checks | `/api/health` 200; `OPTIONS /api/experience/study-tools` 204; anonymous POST 401 `sign_in_required` |
| Preview OTA, superseded | group `38e21a1d-baf4-40cc-9331-d0a4b10e5a51` / Android `01a0f77d-3b6a-72c7-a339-3383d2bb7a16`, commit `3bcbc8a` (before the sheet-height fix) |
| Preview OTA, current | group `ded5f2a6-19a4-4934-99ea-23610409a642` / Android `01a0f784-06f8-7b87-9527-dde51592b418`, runtime 2.0.1, branch `preview`, commit `e52690d` |

Both OTAs were published with `npm.cmd run update:preview`, and the EAS preview API-address preflight passed. No new APK was built, because B40 adds no native code.

### On-device smoke test (installed preview app `com.galaxymaxp.stayfocusedv2`)

Reviewer: *Firewalls & VPNs — Student Reviewer*, topic 14.

| Check | Result |
| --- | --- |
| OTA running | PASS. The new sheet appeared (selectable surface, no preselection), and the sheet-height fix was confirmed by the stable title edge. |
| No selection → whole-topic quick assists only | PASS (`production/p1`) |
| Selecting "Stateless" → five actions, quick assists hidden | PASS (`production/p2`) |
| Selection action, source-grounded: **Define** | PASS. 42 words, **From your material** (`production/p3`) |
| Selection action, source-only: **Test Me** | PASS. "What does it mean that a first-generation firewall is stateless?" (`production/p4`) |
| Clearing the selection → quick assists return | PASS (`production/p5`) |
| Production logs | Two `/api/experience/study-tools` requests, both 200 (`define`, `test`), `selectionCharacters: 9`, `contextCharacters: 859`, `sourceExcerpts: 1`. 0 lines of course content; 0 bearer tokens or JWTs. |
| Passive effects (12:56 UTC) | Canvas jobs 476 (0 new), processing jobs 212 (0 new), artifacts 71, Reviewer still on its single 2026-09-26 version |

### Verification

All FRESH:

- mobile: 780/780
- shared: 50/50
- typecheck and lint: 14/14, with the 4 mobile warnings that already existed
- `git diff --check`: clean

The API code was unchanged after the earlier full run (1,198 passed).

**Result: B40 is production-deployed and closed.** Next: B41 native Office DOCX/PPTX opening acceptance.
