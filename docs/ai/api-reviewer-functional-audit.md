# API reviewer functional timeout validation

This test recreates the Expo Go functional request path without UI rendering:
OCR fixture text -> mobile-shaped authenticated POST -> `/api/reviewer/generate` -> engine pipeline -> API reviewer response.

## Result

- Pass/fail result: FAIL
- Generated at: 2026-06-24T14:50:32.100Z
- Completed at: 2026-06-24T14:50:32.104Z
- Client timeout: 120000 ms
- Token source: missing
- API base URL present: no
- Request duration: not started
- HTTP status: No response

## Request

- Route: `/api/reviewer/generate`
- Source title: OCR Functional Timeout Test
- Fixture: `C:\Users\Fely Max Dilinila\OneDrive\Documents\Projects\stay-focused-v2\packages\engine\scripts\fixtures\ocr-extracted-general-lecture.txt`
- Source characters: 1567

## Reviewer summary

- Title: unavailable
- Sections: unavailable
- Coverage status: unavailable
- Grounding status: unavailable
- Leakage status: unavailable

## Validation failures

- missing_api_base_url: Set API_BASE_URL or EXPO_PUBLIC_API_BASE_URL.
- missing_supabase_sign_in_env: Missing required Supabase sign-in env vars: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, TEST_SUPABASE_EMAIL, TEST_SUPABASE_PASSWORD.

## Output files

- JSON: `C:\Users\Fely Max Dilinila\OneDrive\Documents\Projects\stay-focused-v2\docs\ai\api-reviewer-functional-output.json`
- Audit: `C:\Users\Fely Max Dilinila\OneDrive\Documents\Projects\stay-focused-v2\docs\ai\api-reviewer-functional-audit.md`
