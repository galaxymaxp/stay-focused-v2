# ADR-050: Public Android release checks

Date: 2026-10-19. Status: accepted for UC1/UC2 local implementation.

The private source repository remains private. Android release metadata and APKs
come from the public `galaxymaxp/stay-focused-releases` repository. UC0's release
is historical evidence; this unattended run makes no remote verification claim.

`GET /api/app/latest-release` is public like health and contains no user data.
The API validates GitHub's response, reads tag `v<version>+<code>`, body lines
`versionCode:`, `runtime:` and optional `minSupported:`, and selects the first
APK asset. Invalid metadata/URLs never become a mobile gate. Notes exclude the
machine metadata lines and are displayed as plain text. APK/release links must
use HTTPS under this public repository's GitHub releases path.

The server fetch is bounded to five seconds, including reading the response
body. Each process caches its last valid release for ten minutes, coalesces
concurrent refreshes, and backs off ten minutes after failure. Errors serve
stale metadata, or 204 if none exists. Responses use
`Cache-Control: public, max-age=300`. Process memory is ephemeral and is not
shared across instances; this is the deliberately scoped UC1 cache, not a
global guarantee on GitHub request volume.

Mobile reads the existing expo-constants Android versionCode and app version,
and expo-updates runtimeVersion, updateId and isEmbeddedLaunch. No dependency,
native module, build number or runtime changes are needed. A newer code only
offers a native update if runtimes differ or either runtime is missing. Same
runtime builds continue through the existing OTA mechanism. A valid
minSupported code takes precedence over that comparison.

One device-wide store persists the last attempt, successful check time, validated
result, successful-result flag and dismissed versionCode through the existing
sessionStore pattern. These values contain only public release metadata.
Launch/foreground checks share the existing AppLifecycle listener. Automatic
metadata requests run at most every twelve hours, including failed attempts;
manual Settings checks bypass that throttle. A lightweight bounded public-health
probe confirms API reachability first, matching the existing reviewer-image
reachability pattern. Known offline sessions make no request. Missing API
configuration, 204 and errors remain silent.

Today shows one optional line with Download and dismissal for that exact code.
Below the minimum supported code, the existing Sheet disables Done, backdrop,
Android back and drag dismissal. It appears only with a successful validated
release result and current online reachability; hydration alone never establishes
online state. A cached successful result can be reused within twelve hours after
a fresh health probe. Backgrounding hides the sheet and invalidates in-flight
checks; offline session state hides it immediately. While it is visible, health
is checked every ten seconds with a five-second bound, releasing the sheet on
failure so offline Library remains usable. Metadata errors clear the successful
result flag; failed probes clear online state. Neither can introduce a required
update gate. No banner competes with the sheet.

Settings About shows installed version/code, short OTA ID or built-in, manual
check, last successful check time and the available release's plain notes.
Up-to-date feedback is shown only after a successful manual metadata response.

UC3 publishing automation remains separate work.
API deployment, mobile OTA and physical acceptance remain owner steps. Health's
existing hardcoded version `2.1.0` is intentionally outside UC1.

## UC2: Public download page (2026-10-19)

`/download` is outside the signed-in route group and uses the public theme
provider without initializing auth or private caches. A client-only request to
`/api/app/latest-release` uses the existing same-origin API rewrite, no bearer
token, a ten-second timeout, and UC1's shared `isLatestRelease` validator. The
API remains the only GitHub metadata collector; builds do not fetch releases.
204, HTTP/network/JSON failures and invalid metadata show only the public
All versions destination, without an invented version or APK URL.

The page has one primary Download APK action, a UTC publication date, plain
notes clamped to three lines with an accessible expansion control, and three
Android installation steps. QR is generated locally from that exact APK URL
using pinned `qrcode-generator` 2.0.4 (MIT, zero runtime dependencies, bundled
TypeScript declarations). It is imported only by client code; no QR web
service, HTML injection or external image request is used. SVG modules use
black on white in both themes with a four-module quiet zone. Oversized QR
input omits the QR while keeping the download action available.

`/release` redirects to `/download`, removing stale private-repository links.
The shared sign-in/sign-up screen and existing account menu link to download.
Mobile About uses React Native Share, with the existing validated website
origin from reviewer sharing (`EXPO_PUBLIC_WEBSITE_URL`, default
`https://stay-focused-ten.vercel.app`) now centralized in `publicWebsite.ts`.
Invalid website configuration falls back to the public releases/latest page.
No native dependency, runtime or build-number change is required.

The showcase already has an Android CTA in its own styles. UC2 changes its
destination to the same website `/download` in a separate ignored local clone
and `download-link` branch. Its push/PR and all rollout/device checks remain
owner steps; nothing is published by this run.
