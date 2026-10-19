# ADR: Shared local study export builders

Status: Accepted (WX1, 2026-10-19)

Reviewer and saved Draft exports use the pure builders in
`@stay-focused/shared/study-export`. Both apps consume the same layout, PDF,
DOCX and PPTX implementations, format policy, filename logic and MIME map.
Reviewer supports PDF; Draft supports PDF, Word and PowerPoint. The website
also retains its existing Reviewer text download.

Files are generated locally from saved artifacts without a provider request.
The website disables Draft export until edits are saved and uses the confirmed
save response. Mobile retains its native folder permission/write adapter.

A separate source subpath keeps pdf-lib and fflate out of the main shared
entry. The website loads this subpath dynamically when export is requested.
Builder contract tests live beside the shared implementation; app tests cover
download and native save adapters. This prevents format drift between apps.
