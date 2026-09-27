# B37 Reviewer Study Assist — on-demand AI and offline cache

Date: 2026-09-27. This feature is distinct from the earlier B37 artifact-convergence milestone.

## Starting state

- Authoritative checkout: `Documents/Projects/b25-3-3-work`.
- Branch `b25-3-3-ai-first`; starting HEAD `4b004fe`; clean working tree.
- Connected, authorized realme RMX3151, Android 13; existing signed package `com.galaxymaxp.stayfocusedv2` and authenticated session.
- Existing EAS project `2b3a9db6-3712-4ed0-8365-17d9936562dd`, active `preview` channel, runtime `2.0.0`.
- Existing Vercel project `stay-focused-v2-prototype`, root `apps/api`, verified owner `galaxymaxp's projects`.

## Existing architecture traced

Canonical Reviewers are `generated_artifacts` plus their current `generated_artifact_versions.payload`, linked to immutable `source_versions`. The engine output has sections/items, stable section/item IDs, `sourceCore.explanation`, `keyPoints`, optional evidence and `sourceBlockIds`. The Experience mapper projects these into `ReviewerReaderModel.sections[].blocks[]`; provenance IDs stay server-side. `ReviewerReaderScreen` renders local find, section scrubbing, and the existing Quiz sheet.

Mobile already uses owner-scoped `expo-sqlite` (`stay-focused-library.db`) through `localLibrary`, with cloud-authoritative body hydration and offline reading. Explicit logout purges the owner's rows. Protected Experience routes use verified Supabase bearer identities, safe error normalization and private/no-store responses. Server OpenAI infrastructure already supports structured output. The existing `Sheet`, `Action`, `Copy`, `Notice`, and `Surface` primitives provide motion, Android/back/dismiss handling, theme, and Reduce Motion behavior.

No Reviewer schema, generation prompt, planning, coverage, grounding, or Quiz generation prompt/schema was changed.

## Flow and interface

```text
Canonical explanation or key point tap
  → existing contextual Sheet, selected concept and four actions
  → explicit assist selection
  → owner-scoped device cache lookup
  → authenticated generation only on a miss
  → validate response and persist in SQLite
  → display AI-labelled result
  → reuse offline, including after app relaunch
```

Reviewer titles, section headings, source labels, timestamps and navigation controls are not assist triggers. A key-point tap selects its natural parent concept block. The sheet shows Summarize, Explain simply, Analogy, Example. Loading and result state live inside the sheet, so result updates do not rerender the whole Reviewer. Dismissal does not cancel shared generation or prevent successful persistence. No provider work runs during render, screen open, or scrolling; fingerprint computation occurs only for a selected block and its changed canonical model.

## AI context and grounding

The phone posts only Reviewer/section/block IDs, assist type, canonical fingerprint, and prompt version. The API resolves owned canonical content and exact referenced original-source excerpts. It never accepts client-supplied source text or assistance as facts. Context is Reviewer title, parent heading, selected explanation/key points/evidence, and referenced source excerpts. Other sections and the full document are excluded. Excerpts over 18,000 characters, unavailable provenance, and oversized canonical selections fail safely before provider use rather than silently truncating qualifiers.

| Assist | Instruction | Outside illustration | Canonical mutation |
|---|---|---|---|
| Summarize | Shorten, preserve terminology and essential meaning; no verbatim repetition | No | No |
| Explain simply | Simpler vocabulary and short sentences; preserve qualifications | No unsupported facts | No |
| Analogy | One compact comparison with correspondence/limits | Illustrative only | No |
| Example | One realistic concrete example, prefer a suitable source example | Illustrative only; never attributed to the lecture | No |

Original-source evidence is explicitly the factual authority. Supplied content is treated as untrusted study data. UI labels are AI summary, AI explanation, AI analogy, AI example. The existing server OpenAI adapter uses `gpt-5.4-2026-03-05`, a 1,200-output-token budget, a 45-second timeout, and zero automatic provider retries for this feature. Existing generation callers retain their previous defaults. Output must be one JSON text field, nonempty, at most 2,400 characters, without control characters. The prompt targets at most 150 words. Validation is structural, not a formal guarantee of semantic correctness.

## Persistence, invalidation and cost

Forward-only local SQLite migration adds `study_assists` to the existing database. No new database library, state system, server table, or Supabase migration.

- Primary key: owner + serialized `[reviewerId, sectionId, blockId, assistType, canonicalContentHash, assistPromptVersion]`.
- Result stores those fields, text, and `createdAt`; exact canonical context is stored separately to detect fingerprint collisions/corruption.
- The inexpensive 64-bit non-cryptographic fingerprint is an invalidation aid, never an authorization token. Cache reads also require byte-identical canonical context.
- Title, source identity, generation timestamp, parent heading, explanation, key points and evidence participate in invalidation. `study-assist-v1` versions the prompt semantics.
- Successful entries survive normal relaunches. Different types are independent. Corrupt entries are discarded as misses. Old versions are bypassed, not shown as current.
- A shared service holds one in-flight promise per owner/content/type/version, covering the cache read through persistence. Twelve simultaneous consumers produce one provider call in regression coverage.
- Cache hit happens before any auth/network request. No bulk generation, preload, render request, scrolling request, or automatic retry.
- Explicit logout and confirmed Reviewer deletion purge matching assistance. A pending response cannot repopulate cache after its canonical local row was removed.
- If storage cannot open, generation is refused before spending. Successful output is displayed only after persistence succeeds.
- Server logs contain action/version/context-size metadata only, not prompts, source text, tokens, or results.

## Offline and failures

| Scenario | Behavior |
|---|---|
| Canonical Reviewer offline | Existing saved body stays readable |
| Cached assist offline | Reads SQLite; no HTTP request |
| Uncached assist offline | “Connect to the internet once to generate this explanation. After that, it will be available offline.” |
| Expired session | Safe sign-in message; cached content still opens |
| Changed or removed block | Safe conflict/not-found message; no replacement of canonical text |
| Provider/malformed output | Safe error; no bad cache entry; explicit action can retry |
| Timeout | Bounded client/server deadlines; no automatic retry loop |
| Cache corruption | Invalid row removed; cache miss handled normally |

## Quiz isolation

Study Assist output has no field in any canonical Reviewer/source/artifact DTO and is stored only in the separate device table. Quiz intent contains only persisted Reviewer identity and Quiz settings. Server Quiz assembly reads canonical `sourceCore` fields; the local cache cannot enter that server path. Regressions prove unchanged Reviewer serialization and stored body after all four assists, identical Quiz intent before/after, and Quiz context exclusion even with hostile assist/enrichment fields and a fake cache table present. Quiz prompt/schema/behavior is otherwise unchanged.

## Automated verification

Final verification and deployment/phone results will be recorded after acceptance completes.

| Check | Status so far |
|---|---|
| Mobile suite | FRESH PASS, 677 tests (starting baseline 645) |
| API suite | FRESH PASS, 946 tests and 3 opt-in skips before the added Quiz isolation regression |
| Quiz security/isolation | FRESH PASS, 31 tests including the added regression |
| Shared suite | FRESH PASS, 44 tests |
| Provider contract | FRESH PASS, 19 tests |
| Forced repository typecheck | FRESH PASS, 7/7, no cache |
| Forced repository lint | FRESH PASS, 7/7, 0 errors, same four existing import-order warnings |

First attempts: mobile initially failed to import the scrubber test because its new dependency needed an Expo config mock; API had one case-sensitive test expectation. Both were corrected. Sandboxed lint and API build hit ancestor-directory EPERM errors; reruns use the necessary filesystem access, without weakening checks. The first sandboxed Vercel read failed network access; an authorized network-enabled read verified the existing project.

## Physical acceptance and delivery

Pending: publish API, publish EAS preview, apply update, all four live assists, cache/relaunch, offline cached/uncached, Reviewer integrity and Quiz UI.

## Limitations

- Device-local caching intentionally does not synchronize assistance across devices. Explicit logout/delete removes it.
- In-flight deduplication is process-local. An app/process death after provider completion but before successful persistence can lose that response; a subsequent explicit request can incur another call. There is no claim of cross-device/serverless exactly-once generation.
- The web development preview does not have the app's SQLite store and reports storage unavailable for Study Assist, consistent with the existing local Library web adapter.
- Missing/oversized source references fail safely; this milestone does not repair older canonical Reviewer provenance or redesign canonical quality.

## Verdict

Pending physical acceptance.
