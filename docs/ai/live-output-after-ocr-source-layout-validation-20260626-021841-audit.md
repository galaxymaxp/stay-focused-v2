# OCR Source-Layout Live Validation

Timestamp: 2026-06-26 02:18:41 Asia/Manila

Command:

```bash
npm run live-run --workspace @stay-focused/engine -- it-security
```

Env:

- `OPENAI_API_KEY` was present and loaded into the live-run child process.
- Secret values were not printed.

Artifacts:

- `docs/ai/live-output-after-ocr-source-layout-validation-20260626-021841.txt`
- `docs/ai/live-output-after-ocr-source-layout-validation-20260626-021841.json`

Summary:

- Coverage: passed, 18/18 source sections covered, score 1.
- Grounding: passed, score 1, 0 issues.
- Leakage: passed, 0 issues.
- Section count: 18.
- Every item had `enrichment: null`.
- No unsupported visible enrichment was found.
- No page/header/footer/continued OCR noise was found in student-visible output.
- Malware, phishing, botnet, and reputation hits were source-supported.
- ICMP, SYN, UDP, HTTP flood, Slowloris, financial loss, data breach, and retail were absent.

Risk notes:

- `Domains of IT Security`, `Definition of Terms`, `Types of Malware`, `Symptoms of Malware`, `Methods to Deny Service`, and `Blended Attacks` preserved source-derived bullet/list facts.
- `Types of Attackers` and `Methods of Infiltration` contained some long source-derived key points where the flattened source text combines headings with adjacent list items. These were source-supported and not unsupported enrichment or OCR page noise.

Verdict: PASS - OCR source-layout live validation passed.
