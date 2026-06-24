# API reviewer functional timeout validation

This test recreates the Expo Go functional request path without UI rendering:
OCR fixture text -> mobile-shaped authenticated POST -> `/api/reviewer/generate` -> engine pipeline -> API reviewer response.

## Result

- Pass/fail result: PASS
- Generated at: 2026-06-24T16:10:06.779Z
- Completed at: 2026-06-24T16:10:25.262Z
- Client timeout: 120000 ms
- Token source: minted via email/password
- API base URL present: yes
- Request duration: 17955 ms
- HTTP status: 200 OK

## Env diagnostics

- Env file path: `C:\Users\Fely Max Dilinila\OneDrive\Documents\Projects\stay-focused-v2\.env.local`
- Env file exists: yes
- Dotenv load succeeded: yes
- Dotenv loaded keys: API_BASE_URL, email, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_SUPABASE_URL, GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_CLOUD_PROJECT, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_URL, OCR_PROVIDER, OPENAI_API_KEY, password, RUN_OPENAI_SMOKE, SUPABASE_SERVICE_ROLE_KEY
- Process env overrides preserved: yes

## Logical env groups

- API base URL: present (API_BASE_URL)
- Supabase URL: present (EXPO_PUBLIC_SUPABASE_URL)
- Supabase anon key: present (EXPO_PUBLIC_SUPABASE_ANON_KEY)
- test user email: present (email)
- test user password: present (password)
- manual access token: missing

## Request

- Route: `/api/reviewer/generate`
- Source title: OCR Functional Timeout Test
- Fixture: `C:\Users\Fely Max Dilinila\OneDrive\Documents\Projects\stay-focused-v2\packages\engine\scripts\fixtures\ocr-extracted-general-lecture.txt`
- Source characters: 1567

## Reviewer summary

- Title: OCR Functional Timeout Test
- Sections: 5
- Coverage status: passed
- Grounding status: passed
- Leakage status: passed

## Validation failures

- None

## Output files

- JSON: `C:\Users\Fely Max Dilinila\OneDrive\Documents\Projects\stay-focused-v2\docs\ai\api-reviewer-functional-output.json`
- Audit: `C:\Users\Fely Max Dilinila\OneDrive\Documents\Projects\stay-focused-v2\docs\ai\api-reviewer-functional-audit.md`
