# Canvas Source Capability Matrix

Last refreshed: 2026-07-05, Asia/Manila.

This matrix records what Stay Focused expects to probe, synchronize, or defer
from Canvas. A successful connection and course list do not prove that every
Canvas endpoint is available for a student, a school, or a course. Institution
permissions, course settings, locked content, hidden grades, missing captions,
and external tools can all reduce what is visible.

Capability status values:

```ts
type CanvasCapabilityStatus =
  | "available"
  | "permission_denied"
  | "not_enabled"
  | "not_supported"
  | "temporarily_failed"
  | "not_tested";
```

The application must not bypass locked or restricted content. External tools
may only expose a launch link. Google Drive and Microsoft files may require
separate integrations. Quiz-question visibility is not guaranteed. Grades may
be hidden. Captions and transcripts may not exist.

## Connection

| Capability | Canvas endpoint or resource family | Expected Phase | Required permission | Reliable or permission-dependent | Native content or external reference | Can become reviewer source | Can become scheduling data | Can become grade-planning data | Known limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Current Canvas profile | `GET /api/v1/users/self/profile` | 5A | Valid personal access token | Reliable after token validation | Native metadata | No | No | No | Profile fields differ by institution. |
| Canvas instance identity | Normalized Canvas base URL and API availability | 5A | Valid HTTPS instance URL | Reliable after safe probe | Native metadata | No | No | No | Host identity is inferred from URL/API response, not a trust certificate beyond HTTPS. |
| Token validity | Profile request with bearer token | 5A | Valid personal access token | Permission-dependent | Native metadata | No | No | No | Tokens can be revoked after validation. |
| API availability | Small authenticated endpoint probes | 5A | Network access and token | Temporarily fragile | Native metadata | No | No | No | Rate limits, downtime, and school network controls can fail probes. |

## Course

| Capability | Canvas endpoint or resource family | Expected Phase | Required permission | Reliable or permission-dependent | Native content or external reference | Can become reviewer source | Can become scheduling data | Can become grade-planning data | Known limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Courses | `GET /api/v1/courses` | 5A | Course enrollment visibility | Permission-dependent | Native metadata | No | Yes | Yes | Course access does not imply module, file, grade, or quiz access. |
| Terms | Course `term` include or enrollment term resources | 5B | Course enrollment visibility | Permission-dependent | Native metadata | No | Yes | Yes | Some schools omit term details. |
| Enrollments | Course enrollments resources | 5A/5B | Enrollment visibility | Permission-dependent | Native metadata | No | Yes | Yes | Students may see only their own enrollment. |
| Teachers | Course users/enrollments resources | 5B | Course people visibility | Permission-dependent | Native metadata | No | No | No | Some courses hide people or teacher details. |
| Sections | Course sections resources | 5B | Section visibility | Permission-dependent | Native metadata | No | Yes | Yes | Section data may be limited for students. |
| Syllabus | Course syllabus body | 5B | Course content visibility | Permission-dependent | Native content | Yes | Yes | No | HTML requires normalization and provenance. |
| Course tabs | Course tabs resources | 5B | Course tab visibility | Permission-dependent | Native metadata and references | Maybe | Maybe | No | Tabs can point to disabled tools or external apps. |

## Learning Structure

| Capability | Canvas endpoint or resource family | Expected Phase | Required permission | Reliable or permission-dependent | Native content or external reference | Can become reviewer source | Can become scheduling data | Can become grade-planning data | Known limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Modules | Course modules resources | 5A/5B | Module visibility | Permission-dependent | Native metadata | Yes | Yes | No | Locked/unpublished modules must remain inaccessible. |
| Module items | Course module items resources | 5B | Module-item visibility | Permission-dependent | Native metadata and references | Yes | Yes | Maybe | Items can point to Pages, files, assignments, quizzes, URLs, or tools. |
| Prerequisites | Module prerequisite metadata | 5B | Module visibility | Permission-dependent | Native metadata | No | Yes | No | Must preserve order and unlock rules. |
| Completion requirements | Module requirement metadata | 5B | Module visibility | Permission-dependent | Native metadata | No | Yes | No | Requirement state may be user-specific. |
| Module progress | Module progress resources | 5B | Student progress visibility | Permission-dependent | Native metadata | No | Yes | Maybe | Progress may be unavailable or delayed. |
| Pages | Course pages resources | 5B/5D | Page visibility | Permission-dependent | Native HTML content | Yes | Maybe | No | Locked/unpublished Pages must not be fetched. |
| External URLs | Module item external URL references | 5B | Module-item visibility | Permission-dependent | External reference | Maybe | Maybe | No | External site access is separate from Canvas access. |
| External tools | LTI/external-tool module item references | 5B | Tool visibility and launch permission | Permission-dependent | External reference | Maybe | Maybe | Maybe | Canvas may expose only a launch link, not tool content. |

## Activities

| Capability | Canvas endpoint or resource family | Expected Phase | Required permission | Reliable or permission-dependent | Native content or external reference | Can become reviewer source | Can become scheduling data | Can become grade-planning data | Known limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Assignments | Course assignments resources | 5B/5E | Assignment visibility | Permission-dependent | Native HTML and metadata | Yes | Yes | Yes | Assignment details can have overrides and hidden dates. |
| Assignment groups | Course assignment groups resources | 5A/5E | Assignment group visibility | Permission-dependent | Native metadata | No | No | Yes | Weights/drop rules may be hidden or incomplete. |
| Announcements | Course discussion topics with announcement flag | 5B | Announcement visibility | Permission-dependent | Native HTML content | Yes | Yes | No | Attachments require Phase 5C handling. |
| Discussions | Course discussion topics resources | 5B | Discussion visibility | Permission-dependent | Native HTML content | Yes | Yes | Maybe | Student entries and attachments may require separate permissions. |
| Classic Quiz metadata | Classic quizzes resources | 5B | Quiz visibility | Permission-dependent | Native metadata | Maybe | Yes | Yes | Quiz questions and answers are usually not available. |
| New Quiz metadata | New Quizzes resources | 5B | New Quizzes visibility | Permission-dependent | Native metadata | Maybe | Yes | Yes | Endpoint availability varies by institution. |
| Planner items | `GET /api/v1/planner/items` | 5A/5B | Student planner visibility | Permission-dependent | Native metadata and references | Maybe | Yes | Maybe | Planner omits unsupported or hidden items. |
| Calendar events | Calendar events resources | 5B | Calendar visibility | Permission-dependent | Native metadata | No | Yes | Maybe | Repeating and overridden dates need normalization. |
| Learning-object dates | Learning object dates resources | 5B | Student-specific date visibility | Permission-dependent | Native metadata | No | Yes | Yes | Must preserve effective dates instead of global-only dates. |
| Assignment overrides | Assignment override resources | 5B/5E | Override visibility | Permission-dependent | Native metadata | No | Yes | Yes | Student may not see all override rules. |

## Files And Media

| Capability | Canvas endpoint or resource family | Expected Phase | Required permission | Reliable or permission-dependent | Native content or external reference | Can become reviewer source | Can become scheduling data | Can become grade-planning data | Known limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Canvas files | Course files resources | 5C | File visibility | Permission-dependent | Native file metadata/content | Yes | Maybe | No | Downloads must remain authorized and bounded. |
| Attachments | Assignment, discussion, and announcement attachment resources | 5C | Parent item and attachment visibility | Permission-dependent | Native file metadata/content | Yes | Maybe | Maybe | Attachment visibility follows parent item and file permissions. |
| PDFs | Canvas file download plus parser/OCR registry | 5C | File download visibility | Permission-dependent | Native file content | Yes | No | No | Embedded text and scanned PDFs follow different processing paths. |
| Scanned PDFs | Existing OCR boundary | 5C | File download visibility and OCR configuration | Permission-dependent | Native file content via OCR | Yes | No | No | Page-count/size limits and OCR failures must be reported. |
| PowerPoint | File parser registry | 5C | File download visibility | Permission-dependent | Native file content | Yes | No | No | `.ppt` and `.pptx` parser fidelity may differ. |
| Word | File parser registry | 5C | File download visibility | Permission-dependent | Native file content | Yes | No | No | `.doc` and `.docx` parser fidelity may differ. |
| Images | File parser/OCR registry | 5C | File download visibility and OCR configuration | Permission-dependent | Native file content via OCR when needed | Yes | No | No | OCR quality depends on image clarity. |
| HTML | Pages, syllabus, assignment/discussion bodies | 5C/5D | Parent content visibility | Permission-dependent | Native HTML content | Yes | Maybe | Maybe | Must normalize without unsafe HTML passthrough. |
| Text | File parser registry | 5C | File download visibility | Permission-dependent | Native text content | Yes | No | No | Encoding detection can fail. |
| Spreadsheets | Supported spreadsheet text extraction | 5C | File download visibility | Permission-dependent | Native file content | Maybe | Maybe | Maybe | Only supported text/table extraction is in scope. |
| Media objects | Canvas media resources | 5C | Media visibility | Permission-dependent | Native media metadata/content | Maybe | Maybe | No | Direct media extraction may not be possible. |
| Captions | Media caption resources | 5C | Caption visibility | Permission-dependent | Native caption text | Yes | Maybe | No | Captions may not exist. |
| Transcripts | Captions/transcript resources or future integrations | Future | Transcript visibility | Permission-dependent | Native or external text | Yes | Maybe | No | Transcripts often require non-Canvas integrations. |

## Grades And Performance

| Capability | Canvas endpoint or resource family | Expected Phase | Required permission | Reliable or permission-dependent | Native content or external reference | Can become reviewer source | Can become scheduling data | Can become grade-planning data | Known limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Visible course grades | Course/enrollment grade fields | 5E | Grade visibility | Permission-dependent | Native grade metadata | No | No | Yes | Grades may be hidden or delayed. |
| Assignment scores | Submission and assignment resources | 5E | Submission/grade visibility | Permission-dependent | Native grade metadata | No | No | Yes | Displayed grades may differ from raw scores. |
| Submissions | Submission resources | 5E | Submission visibility | Permission-dependent | Native metadata/content | Maybe | Yes | Yes | Submitted content is separate from reviewer sources. |
| Attempts | Submission attempt metadata | 5E | Submission visibility | Permission-dependent | Native metadata | No | No | Yes | Attempt semantics differ by assignment type. |
| Missing status | Submission metadata | 5E | Submission visibility | Permission-dependent | Native metadata | No | Yes | Yes | Hidden status cannot be inferred as false. |
| Late status | Submission metadata | 5E | Submission visibility | Permission-dependent | Native metadata | No | Yes | Yes | Late policy data may be hidden. |
| Excused status | Submission metadata | 5E | Submission visibility | Permission-dependent | Native metadata | No | Yes | Yes | Excused assignments must be handled separately. |
| Grading periods | Grading periods resources | 5E | Course grading-period visibility | Permission-dependent | Native metadata | No | No | Yes | Some courses do not use grading periods. |
| Assignment-group weights | Assignment group metadata | 5E | Assignment group visibility | Permission-dependent | Native metadata | No | No | Yes | Missing weights require manual assumptions. |
| Drop rules | Assignment group rules | 5E | Assignment group visibility | Permission-dependent | Native metadata | No | No | Yes | Drop calculations can be institution-specific. |
| Rubrics | Assignment rubric resources | 5E | Rubric visibility | Permission-dependent | Native content and metadata | Maybe | No | Yes | Rubric assessments may be hidden. |
| Comments | Submission comments resources | 5E/Future | Submission feedback visibility | Permission-dependent | Native content | Maybe | No | Maybe | Instructor feedback can be sensitive and should not enter prompts by default. |
| Learning outcomes | Outcome resources | 5E/Future | Outcome visibility | Permission-dependent | Native metadata | Maybe | Maybe | Yes | Outcomes may be disabled or hidden. |
| What-If Grades | Canvas What-If behavior/resources | Future | Institution support and grade visibility | Permission-dependent | Native grade calculation | No | No | Yes | Optional verification only; not all Canvas instances support it through API. |

## Communication And Activity

| Capability | Canvas endpoint or resource family | Expected Phase | Required permission | Reliable or permission-dependent | Native content or external reference | Can become reviewer source | Can become scheduling data | Can become grade-planning data | Known limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Conversations | Conversations resources | Future | Inbox visibility | Permission-dependent | Native message content | Maybe | Maybe | No | Inbox access can be restricted and sensitive. |
| Inbox messages | Conversations resources | Future | Inbox visibility | Permission-dependent | Native message content | Maybe | Maybe | No | Must avoid broad prompt inclusion by default. |
| Recent history | History/recent activity resources | Future | Activity visibility | Permission-dependent | Native metadata | Maybe | Maybe | No | Recent activity can be incomplete or disabled. |
| Viewed items | History/resources and local app events | Future | Activity visibility | Permission-dependent | Native metadata | Maybe | Maybe | No | Canvas may not expose reliable viewed-item history. |
| Interaction estimates | Derived from app and Canvas activity | Future | Activity visibility | Permission-dependent | Derived metadata | No | Maybe | No | Estimates must be labeled as estimates, not facts. |
