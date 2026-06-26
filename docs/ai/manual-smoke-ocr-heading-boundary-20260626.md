# Manual Smoke: OCR Heading Boundary Reviewer Flow

Date/time: 2026-06-26 21:00 +08:00 (Asia/Manila)

Commit tested: `808586c fix(engine): detect OCR heading boundaries`

## Local Setup

- Branch: `main`
- API command: `npm run dev --workspace apps/api -- --hostname 0.0.0.0 --port 3000`
- API base used by phone: `http://192.168.1.111:3000`
- Metro URL used by Expo Go: `exp://192.168.1.111:8081`
- Phone: physical iPhone on the same Wi-Fi network as the laptop

## Initial Network Error And Resolution

The first phone attempt loaded the app in Expo Go but failed before the reviewer
generation request reached the API. The app displayed a `network_error` with the
message that `EXPO_PUBLIC_API_BASE_URL`, host, and port should be checked.

Laptop and phone reachability were then verified separately:

- Laptop `localhost` health check returned `{"status":"ok","version":"2.0.0"}`.
- Laptop LAN health check returned `{"status":"ok","version":"2.0.0"}`.
- Phone Safari could reach `http://192.168.1.111:3000/api/health` and showed the
  same status/version response.

Expo was restarted with the LAN API base set to
`EXPO_PUBLIC_API_BASE_URL=http://192.168.1.111:3000`. After that restart, the
phone generation reached the API and completed successfully.

## Final Phone Result

- Reviewer preview appeared on the physical iPhone.
- Generation reached the API successfully.
- API response status was `200`.
- OCR heading-boundary split worked.
- No duplicate standalone `Social Engineering` section/key point was visible.
- Child facts were preserved.
- Coverage, Source, and Clean badges showed `Passed`.
- No weird merged or duplicate content was visible.

## Visible Sections And Key Points

### Social Engineering

- `Pretexting uses a fabricated scenario to obtain access.`
- `Tailgating follows an authorized person into a restricted area.`
- `Phishing uses deceptive messages to obtain information.`
- `Smishing uses text messages.`
- `Vishing uses voice calls.`

### Password Cracking

- `Brute-force tries many password combinations.`
- `Network Sniffing captures traffic.`

### Impact Reduction

- `Backups`
- `Access control`
- `User awareness`

## API Log Evidence

- `POST /api/reviewer/generate 200`
- `reviewer_generation.end` reported `outcome: 'success'`
- `reviewer.coverage.completed` reported `detectedSectionCount=3`,
  `coveredCount=3`, `missingSectionTitles=[]`, `duplicateGroups=[]`,
  `coverageScore=1`, and `status='passed'`

## Verdict

PASS - Physical-device OCR heading-boundary reviewer smoke passed.
