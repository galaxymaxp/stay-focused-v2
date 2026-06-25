# Bare-Label Dedupe Live Validation

Timestamp: 2026-06-25T20:33:47.994Z

Command:

```bash
npm run live-run --workspace @stay-focused/engine -- it-security
```

Env:

- `OPENAI_API_KEY` was present in local env configuration and loaded into the live-run child process.
- Secret values were not printed.

Artifacts:

- `docs\ai\live-output-after-bare-label-dedupe-20260626-043140.txt`
- `docs\ai\live-output-after-bare-label-dedupe-20260626-043140.json`

Summary:

- Coverage: passed, 18/18, score 1.
- Grounding: passed, score 1, 0 issues.
- Leakage: passed, 0 issues.
- Section count: 18.
- Standalone `Social Engineering` count in `Methods of Infiltration`: 1.
- Non-null enrichment count: 0.
- Duplicate Methods key points: none.

Methods of Infiltration key points:

- Social Engineering
- Pretexting
- Tailgating
- Something for something
- Phishing
- Smishing
- Vishing
- Password Cracking
- Brute-force
- Network Sniffing
- Vulnerability Exploitation a) Gather info about the target using a port scanner or social engineering b) Determine learned info from (a) c) Look for vulnerability
- Use a known exploit or a write a new exploit
- Advanced Persistent Threats
- Usually well-funded
- Deploy customized malware

Child fact preservation:

- Pretexting: preserved
- Tailgating: preserved
- Phishing: preserved
- Smishing: preserved
- Vishing: preserved
- Password Cracking: preserved
- Brute-force: preserved
- Network Sniffing: preserved

Before/after target comparison:

- Prior failed live validation: `Methods of Infiltration` had two standalone visible `Social Engineering` key points.
- New live validation: `Methods of Infiltration` has one standalone visible `Social Engineering` key point, while child facts remain preserved.

Search results:

| Search term/group | Hits? | Classification | Notes |
| ----------------- | ----- | -------------- | ----- |
| enrichment | Yes (18 raw, 0 visible) | internal/non-visible field | JSON field names only; all enrichment values are null. |
| Social Engineering | Yes (2 raw, 2 visible) | source-supported visible content | 2 visible hits: one standalone Methods key point and one source-supported mention inside Vulnerability Exploitation. |
| Pretexting | Yes (1 raw, 1 visible) | source-supported visible content | 1 visible hit(s); source-supported and preserved. |
| Tailgating | Yes (1 raw, 1 visible) | source-supported visible content | 1 visible hit(s); source-supported and preserved. |
| Phishing | Yes (3 raw, 3 visible) | source-supported visible content | 3 visible hit(s); source-supported and preserved. |
| Smishing | Yes (1 raw, 1 visible) | source-supported visible content | 1 visible hit(s); source-supported and preserved. |
| Vishing | Yes (1 raw, 1 visible) | source-supported visible content | 1 visible hit(s); source-supported and preserved. |
| Password Cracking | Yes (1 raw, 1 visible) | source-supported visible content | 1 visible hit(s); source-supported and preserved. |
| Brute-force | Yes (1 raw, 1 visible) | source-supported visible content | 1 visible hit(s); source-supported and preserved. |
| Network Sniffing | Yes (1 raw, 1 visible) | source-supported visible content | 1 visible hit(s); source-supported and preserved. |
| ICMP | No | irrelevant/no issue | No hits. |
| SYN | No | irrelevant/no issue | No hits. |
| UDP | No | irrelevant/no issue | No hits. |
| HTTP flood | No | irrelevant/no issue | No hits. |
| Slowloris | No | irrelevant/no issue | No hits. |
| financial loss | No | irrelevant/no issue | No hits. |
| data breach | No | irrelevant/no issue | No hits. |
| retail | No | irrelevant/no issue | No hits. |
| Page | No | irrelevant/no issue | No hits. |
| PAGE | No | irrelevant/no issue | No hits. |
| continued | No | irrelevant/no issue | No hits. |
| header | No | irrelevant/no issue | No hits. |
| footer | No | irrelevant/no issue | No hits. |

Verdict: PASS - bare-label dedupe live validation passed.
