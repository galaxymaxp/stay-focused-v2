# Phase 1.4 live visible-grounding audit

Date: 2026-06-21

Live output:

- `docs/ai/live-output-it-security-after-visible-grounding.txt`

Command:

```powershell
# OPENAI_API_KEY was loaded from the ignored root .env.local without printing it.
npm run live-run --workspace @stay-focused/engine -- it-security
```

## Result

| Check | Result |
|---|---|
| Coverage | 18/18, score 1.00 |
| Grounding | Passed, score 1.00 |
| Grounding issues | 0 |
| Phase-1 fabrication failures | 0 |
| Leakage issues | 0 |
| Assembled sections | 18 |
| Non-null enrichment fields | 0 |
| Unsupported default-visible content | None found |

The Phase 1.4 live validation passed. Every assembled card has
`enrichment: null`. The default-visible title, explanation, and key points
passed Stage 5 grounding.

## Section titles

1. Introduction
2. What is IT Security
3. Goal of IT Security
4. Domains of IT Security
5. What is Cybersecurity?
6. What is Cybersecurity all about?
7. Importance of cybersecurity
8. Challenges of Cybersecurity
9. Impact of a Security Breach
10. Types of Attackers
11. Definition of Terms
12. Types of Cybersecurity Threats
13. Types of Malware
14. Symptoms of Malware
15. Methods of Infiltration
16. Methods to Deny Service
17. Blended Attacks
18. Impact Reduction

The prior live output used the generated title `Blended Attacks Example Card`.
Phase 1.4 uses the source-backed planned title `Blended Attacks`.

## Readability

Seventeen list-heavy sections have an empty explanation and preserve their
content through source-extracted key points. Introduction has a short
source-backed explanation. No section is empty: list sections contain between
3 and 19 key points. The result is readable as a compact source-faithful study
outline, though less prose-oriented than the earlier enriched reviewer.

## Historically risky sections

| Section | Result | Notes |
|---|---|---|
| Domains of IT Security | Pass | 11/11 source items; empty explanation; enrichment null |
| Definition of Terms | Pass | Seven source entries preserved; enrichment null |
| Types of Cybersecurity Threats | Pass | Seven source entries preserved; no added definitions or consequences |
| Types of Malware | Pass | 10/10 malware names; no added malware definitions |
| Symptoms of Malware | Pass | 11/11 symptoms; no added diagnostic guidance |
| Methods of Infiltration | Pass | 19/19 entries; no invented scenarios |
| Methods to Deny Service | Pass | 12/12 entries; no ICMP, SYN, UDP, HTTP flood, or Slowloris additions |
| Blended Attacks | Pass | Source title restored; five source entries; no retail or credential-theft scenario |

## Search classification

| Search term/group | Classification | Notes |
|---|---|---|
| `enrichment` | Internal/non-visible field | 18 serialized property-name hits, all values null |
| virus, worm, Trojan, ransomware, spyware, bot, rootkit | Source-supported visible content | Malware names and Blended Attacks wording occur in the source fixture |
| reputation | Source-supported visible content | Appears as `Ruined Reputation` in Impact of a Security Breach |
| phishing | Source-supported visible content | Appears in Methods of Infiltration and Blended Attacks |
| ICMP, SYN, UDP, HTTP flood, Slowloris | No hits | Prior unsupported denial-of-service specifics are absent |
| financial loss, data breach, retail | No hits | Prior unsupported consequence/scenario wording is absent |

## Verification

| Command | Result |
|---|---|
| `npm run typecheck --workspace @stay-focused/engine` | Pass |
| `npm run build --workspace @stay-focused/engine` | Pass |
| `npm run eval --workspace @stay-focused/engine` | Pass, 219/219 |
