# B39 preview API configuration acceptance

## Starting state

- Branch `b25-3-3-ai-first`, starting HEAD `752922a` (B38 acceptance).
- Starting untracked paths: `apps/mobile/.gitignore` and `tmp/`. Neither was modified or staged.
- B38's corrected Android update restored authenticated course loading without a new sign-in. Its historical acceptance record was read and left unchanged.

## Root cause

The preview build profile in `apps/mobile/eas.json` held the public API base address, but the first B38 `eas update` did not select an EAS environment. Expo does not inherit a build profile's `env` block when publishing an update. The EAS preview environment also lacked `EXPO_PUBLIC_API_BASE_URL`; the corrected B38 update relied on a manual shell value. This made OTA publishing easy to repeat incorrectly.

At runtime, `getApiBaseUrl()` returned `undefined`; `useExperienceClient()` changed that to an empty string. `experienceRequest()` combined `!baseUrl` and `!accessToken` into one `sign_in_required` error, whose message was “Please sign in again.” The hook displayed it without checking the intact Supabase session. The failure was local, before any HTTP response. `AuthProvider` did not sign the user out.

## Repair

`apiBaseUrlResolution.ts` is the canonical validation boundary for the mobile API address. It rejects missing, blank, malformed, credential-bearing, path-bearing, and non-HTTP(S) values. It supplies a typed `ApiConfigurationError` and a safe student message that contains no URL, token, or environment value. Experience requests validate the address before checking the token or calling `fetch`; configuration, 401 authentication, 403 authorization, network, server, and domain responses remain distinct. Canvas, task, OCR, reviewer, Library, and processing API helpers use the same validator before requests. Screen guards that formerly combined absent address with missing token now show an app configuration error. Local Library data and the auth session remain available.

The EAS preview environment now contains the same public API address as the existing preview build profile. The two existing public Supabase variables were confirmed present there. `npm.cmd run update:preview --workspace @stay-focused/mobile -- --message "Describe the change"` runs a preflight which reads the API variable from EAS preview, requires a plain HTTPS base URL, and checks it matches the preview build profile. If the value is missing, invalid, or mismatched, the command exits before `eas update`. On success it publishes Android to branch/channel `preview` with `--environment preview`. The preflight reports only the variable name and validation result. `docs/dev/mobile-device-runbook.md` records the sole supported preview OTA command.

## Verification

| Check | Result |
| --- | --- |
| Focused runtime/UI tests | FRESH PASS: 63/63 after final code correction |
| Mobile tests | FRESH PASS: 753/753 |
| Preflight tests | FRESH PASS: 2/2; missing, blank, malformed, non-HTTPS, and mismatched inputs block |
| Mobile typecheck | FRESH PASS |
| Mobile lint | FRESH PASS: 0 errors, 4 existing warnings in untouched test files; first sandbox attempt was blocked by parent-directory read permissions |
| Android export | FRESH PASS: 3,422 modules |
| `git diff --check` | FRESH PASS |
| EAS preview preflight | FRESH PASS: API configuration present, valid, and matching build profile; no value printed |

The first preflight intentionally blocked while the EAS preview variable was absent. After the public build-profile address was added to EAS preview, the guard passed. The installed CLI's `env:get` positional argument and `NAME=value` output were verified and handled without exposing the value.

## Negative configuration gate

An isolated test supplies missing configuration to the canonical validator and `experienceRequest`; no broken OTA was published.

| Check | Result |
| --- | --- |
| Configuration error displayed | PASS: Generate and Tasks render “App configuration error” |
| “Please sign in again” absent | PASS in missing-configuration UI test |
| Session retained | PASS by code path: API errors do not invoke `AuthProvider` session mutation; valid-session token input remains unchanged in test |
| Canvas state retained | PASS by code path: no reconnect or credential deletion on configuration error |
| API request prevented | PASS: fetch mock called zero times |
| Sign-out prevented | PASS by code path: no `signOut` call or destructive recovery in the request/hook paths |

## Physical Android acceptance

Device: realme RMX3151, Android 13, serial `PB6DWWEIHAUCMZOR`. The final Android preview update was observed in Expo download logs, then the app was force-stopped and relaunched to activate it. A subsequent update check reported no newer update.

| Check | Result |
| --- | --- |
| Existing session restored | PASS: signed-in Today view and account sheet; no sign-in prompt |
| Canvas connection retained | PASS: Canvas courses displayed the connected school and synced course states |
| Generate loaded | PASS: authenticated course list included CIT17 |
| Tasks loaded | PASS: course groups and existing due/completed counts |
| Library loaded | PASS: saved Reviewer, Quiz, and Draft counts remained visible |
| Today loaded | PASS: existing schedule and task card |
| CIT17 instructional PDFs | PASS: three PDFs under Lecture Presentations |
| Passive jobs created | ZERO: read-only Supabase count stayed 468, zero active, newest job unchanged at 2026-09-30 13:07:16 UTC |
| Force-stop/relaunch | PASS: signed-in Today and persisted Generate/Library data returned |

No manual Canvas synchronization was run for B39.

## EAS update and verdict

- First B39 OTA `01a0f2a0-6ef3-74f7-8eee-fdb7768f63c0` passed the initial device matrix and was superseded after a final response-classification correction.
- Final preview update group: `caa79a72-da8b-4135-904b-cfeed30bb4bc`.
- Final Android update: `01a0f2ae-79d7-732a-9ba4-c492f2af3545`.
- Branch/channel/environment: `preview` / `preview` / `preview`; Android runtime `2.0.1`.
- Preflight executed and detected valid API configuration. No configuration value was logged in this record.
- Implementation commit: `76f977c`.

**PASS — preview API configuration is explicit and future EAS updates are guarded.** Next: keep the guarded preview command as the release path and cover any future mobile API client with the same canonical validator.
