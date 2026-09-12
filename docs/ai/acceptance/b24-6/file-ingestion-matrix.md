# File ingestion and export parity

V1 evidence is traced in [the pre-implementation audit](v1-task-maker-parity.md). Support below describes actual extraction paths, not package presence.

| Format | V1 | V2 before | B24.6 | Limits / evidence |
|---|---|---|---|---|
| Native PDF | Canvas native extraction | Hybrid PDF extraction | Reused | Existing private Storage, hash and PDF safety checks; real PDF instruction fixture exercises native text without OCR calls |
| Scanned PDF | Separate manual authenticated PDF OCR | Page-accounted OCR | Reused | Existing 40-total-page Canvas cap and explicit page-integrity failures; deterministic OCR provider fixture, not a new live OCR run |
| PNG/JPEG | Unsupported in Canvas dispatcher | Image OCR | Reused | Same owned Storage/OCR boundary; deterministic provider fixtures for both image types |
| DOCX | ZIP/XML text, lossy structure | Unsupported | Added | Bounded XML extraction preserves body order, heading levels, direct numbered/bullet lists, table cells and empty fields; tested through private Storage |
| DOC | No reliable parser | Unsupported | Unsupported | Explicit legacy-format capability/error; convert externally to a supported format |
| PPTX | Filename-sorted XML slides and interleaved notes | Unsupported | Added | Presentation relationships define slide order, title/body association, body levels, tables and placeholders; footer/date/slide-number placeholders excluded |
| PPT | No reliable parser | Unsupported | Unsupported | Separate from PPTX |
| Plain/Markdown text | TXT/MD/CSV UTF-8 | TXT/Markdown | Reused TXT/Markdown | Existing safe normalization; V1 CSV extraction is not restored in this slice |
| Canvas page/body | HTML extraction | HTML normalization | Reused | Assignment body is highest authority; owned linked pages and module pages are resolved from synchronized data |

Office files enter the existing Canvas security/size/download/preparation path. Previously synchronized Office rows classified as unsupported are re-evaluated against the current security policy when prepared; changing a MIME allowlist does not bypass locked, dangerous or oversized-file checks.

Office parsing expands only required XML parts: 20 MB archive ceiling (the existing Canvas admission cap also applies), 2000 entries, 4 MB per relevant part, 12 MB total relevant XML, and a 120000-character extraction ceiling before the stricter Canvas preview limit. It rejects duplicate/traversing archive names, active content/embedded objects, DTD/entities, malformed XML, missing required parts and unsafe slide relationships. It never executes Office content, extracts to disk or follows external relationships.

This is content/structure extraction, not a Word/PowerPoint rendering engine. Complex style inheritance, custom multilevel numbering/restart rules, equations, charts, SmartArt, drawing-only instructions, layout-master semantics and embedded media are not fully interpreted. Office images are not OCRed. PPTX speaker notes are intentionally omitted. PDF/OCR preserves extracted textual structure, not original page layout. Unrecognized or conflicting template structures may require a clearer supported template and fail validation rather than publish guessed structure.

V1’s real downloadable outputs were HTML/TXT/CSS/JS; its “PDF” path produced printable HTML. V1 did not provide reliable binary DOCX/PPTX/PDF generation. All Activity export/rendering remains deferred to a post-UI phase. V1 automatic refinement is also deferred; B24.6 provides manual editing and safe separate-draft regeneration.
