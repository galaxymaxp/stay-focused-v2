# Flattened-Source Readability Live Validation

Timestamp: 2026-06-26 02:43:00 Asia/Manila

Command:

```bash
npm run live-run --workspace @stay-focused/engine -- it-security
```

Env:

- `OPENAI_API_KEY` was present and loaded into the live-run child process.
- Secret values were not printed.

Artifacts:

- `docs/ai/live-output-after-flattened-readability-split-20260626-024300.txt`
- `docs/ai/live-output-after-flattened-readability-split-20260626-024300.json`

Summary:

- Coverage: passed, 18/18 source sections covered, score 1.
- Grounding: passed, score 1, 0 issues.
- Leakage: passed, 0 issues.
- Section count: 18.
- Every item had `enrichment: null`.
- No unsupported visible outside knowledge was found.
- No page/header/footer/continued OCR noise was found in student-visible output.
- ICMP, SYN, UDP, HTTP flood, Slowloris, financial loss, data breach, and retail were absent.

Rough-section comparison:

- `Types of Attackers`: improved from long merged points such as `Trusted Partners Outsiders Organized Attackers` and `White hats Amateurs Attacks Concepts & Techniques` to separate source-derived points for `Trusted Partners`, `Outsiders`, `Organized Attackers`, `White hats`, `Amateurs`, and `Attacks Concepts & Techniques`.
- `Methods of Infiltration`: improved from long merged points containing later method headings to separated source-derived method points such as `Social Engineering`, `Password Cracking`, `Vulnerability Exploitation ...`, and `Advanced Persistent Threats`.

Remaining readability note:

- `Methods of Infiltration` still contains a source-supported nested duplicate label: `Social Engineering` appears once as a method heading and once as a listed sub-item under another method. This is not unsupported content or OCR/page noise.
- `Vulnerability Exploitation` remains a longer source-derived point because its source includes lettered substeps in one flattened span.

Verdict: PASS - flattened-source readability live validation passed.
