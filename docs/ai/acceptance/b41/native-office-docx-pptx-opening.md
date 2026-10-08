# B41 — Native Office DOCX/PPTX Opening Acceptance

Date: 2026-10-01 (Asia/Manila)

**Verdict: PASS — exported Draft DOCX and PPTX files open in native Office-compatible apps on the realme, after an export line-break defect found in this milestone was fixed and shipped by preview OTA.**

This closes the gate deferred since B37.1/B39 ("format opening in Word/PowerPoint not fully physically accepted"). B40 was closed in production beforehand ([B40 record](../b40/reviewer-smart-selection-learning-tools.md), §18).

## 1. Scope and starting state

- **Branch:** `b25-3-3-ai-first`, starting at `0ea59d7`. The untracked paths `UI/`, `apps/mobile/.gitignore`, `supabase/` and `tmp/` were left untouched.
- **Device:** realme RMX3151, Android 13, the installed preview app `com.galaxymaxp.stayfocusedv2` (runtime 2.0.1).
- **Artifact:** the existing Draft *Assignment No. 5 / Implementing Firewalls and VPNs — Presentation Draft Template* (CC16 IT Security). Nothing was generated.
- **Export path:** Draft → Export → Word (.docx) or PowerPoint (.pptx) → Android folder picker (Storage Access Framework) → Documents → Allow. The file is written with its OOXML MIME type, and the student opens it from a file manager.

## 2. Device handler audit

- Before B41 the phone had no Word, PowerPoint, WPS, Google Docs or Google Slides. Drive was installed, but Android's handler query returned **zero** activities for the DOCX and PPTX MIME types.
- Tapping the export in realme **My Files** produced "Select a file type" and then a generic chooser (Chrome, ChatGPT, Files by Google, HTML Viewer); `03` shows this. None of these is an Office viewer. ChatGPT was deliberately not used, because it would upload private coursework.
- **Owner decision:** install Google Docs and Google Slides from the Play Store (free, by Google LLC, using the account already on the phone). Installed versions: Docs `1.26.381.05.90`, Slides `1.26.391.02.90`. The apps remain installed.
- After installation the handler query lists `com.google.android.apps.docs.editors.docs` for DOCX. Both files then open directly from My Files with no chooser, through each app's Office-compatible opener (`QuickWordDocumentOpenerActivityAlias`), as **On device** files that are not uploaded to Drive.

## 3. Defect found and fixed: line breaks lost in exported Drafts

Opening the first exports (`04`, `05`) showed each section's lines running together, for example "…VPNs[Company Scenario Title…]Prepared by: [Student Name]Course/Section:…", and bullet lines merged into one paragraph.

- **DOCX cause:** `docxExport.ts` emitted `<w:br/>` directly under `<w:p>`, between runs. In OOXML a break is valid only as run content, so viewers dropped all 93 breaks (stricter Word versions may offer to repair the file). Fixed by emitting the break inside its run.
- **PPTX cause:** `slidesFrom` in `pptxExport.ts` split each block on all whitespace and rejoined it with spaces, which removed every line before the XML was written. Fixed by keeping each source line as its own paragraph; only a line longer than 420 characters is split, at word boundaries.
- **Tests:** two regression tests in `studyExport.test.ts`. Both fail on the old exporters and pass on the fix.
- **Commits:** `28b81af` (the fix) and `74ae2ab` (type fix for the new test fixture). `28b81af` was committed before typecheck had run, which exposed that fixture error; the follow-up commit corrected it rather than rewriting history.
- **Shipped:** preview OTA group `9129850a-bd65-4588-b80b-53cd53d82745`, Android update `01a0f7aa-bf13-7fd7-a888-a838e50033d3`, runtime 2.0.1, commit `74ae2ab`. No API change and no APK.

## 4. Physical acceptance

| Check | Before fix (21:01–21:02) | After fix (21:38–21:39) |
| --- | --- | --- |
| Export saved to Documents | PASS (DOCX 4,650 B, PPTX 28,922 B) | PASS (DOCX 4,652 B, PPTX 29,264 B, saved as "(1)" copies) |
| My Files type icons | Word and PowerPoint icons (`01`) | Same |
| DOCX valid (ZIP, every XML part well-formed) | Yes; 27 paragraphs, 93 breaks all misplaced | Yes; 93 breaks all inside runs, 0 misplaced |
| PPTX valid | Yes; 18 slides, 18 slide-list entries, 71 paragraphs, 0 empty slides | Yes; 18 slides, 135 paragraphs |
| DOCX opens natively | Google Docs, **lines merged** (`04`) | **PASS**: Google Docs; title, slide headings, separate lines and "- " bullet lines (`06`) |
| PPTX opens natively | Google Slides, 18 slides, **lines merged** (`05`) | **PASS**: Google Slides; 18/18 slides, one line per paragraph (`07`) |

Copies pulled to the laptop for validation stayed in a temporary folder and were not committed, because they contain coursework.

## 5. Passive behaviour and safety

- Rechecked at 13:42 UTC:
  - processing jobs 212 (0 new since B40 closed)
  - Canvas sync jobs 476 (0 new)
  - artifacts 71
- One navigation slip during re-export opened a CIT5 assignment page that has a **Generate Draft** button. It was never pressed, and the SQL check confirmed no job was created.
- One earlier mis-tap opened an older Sep-28 PDF read-only in Drive's viewer; it was closed with Back.
- The owner's Messenger chat-head area is masked in every screenshot. No other account's Drive was opened.

## 6. Automated verification

All FRESH:

- mobile: 782/782
- export tests: 7/7
- `turbo typecheck lint --filter=@stay-focused/mobile --force`: 10/10, with only the 4 mobile `import/first` warnings that already existed
- `git diff --check`: clean

## 7. Evidence

[`evidence/`](evidence/), with the chat-head area masked:

- `01` exports in My Files with Word/PowerPoint icons
- `02` "Select a file type" before any Office app was installed
- `03` generic chooser with no Office viewer
- `04`, `05` the line-break defect in Docs and Slides
- `06`, `07` the fixed exports rendering correctly

## 8. Remaining limitations

- Acceptance used Google Docs and Slides. Microsoft Word and PowerPoint were not tested. The fixed DOCX now places breaks where Word requires them, but Word itself was not run.
- Two "(1)" copies and the two pre-fix exports remain in the phone's Documents folder; nothing was deleted from the owner's device.
- PDF export was not part of B41 and was not re-checked for line handling.
- Students without an Office-capable app get Android's generic chooser. The app does not suggest one, and changing that would be a product decision.
