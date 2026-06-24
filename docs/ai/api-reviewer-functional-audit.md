# API reviewer functional timeout validation

This test recreates the Expo Go functional request path without UI rendering:
OCR fixture text -> mobile-shaped authenticated POST -> `/api/reviewer/generate` -> engine pipeline -> API reviewer response.

## Result

- Status: FAIL
- Generated at: 2026-06-24T14:50:32.100Z
- Completed at: 2026-06-24T14:50:32.104Z
- Client timeout: 120000 ms
- Request duration: not started
- API base URL source: missing
- Supabase token present: no
- Response status: No response

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
- missing_supabase_access_token: Set SUPABASE_ACCESS_TOKEN to a valid Supabase user access token.

## Output files

- JSON: `C:\Users\Fely Max Dilinila\OneDrive\Documents\Projects\stay-focused-v2\docs\ai\api-reviewer-functional-output.json`
- Audit: `C:\Users\Fely Max Dilinila\OneDrive\Documents\Projects\stay-focused-v2\docs\ai\api-reviewer-functional-audit.md`
