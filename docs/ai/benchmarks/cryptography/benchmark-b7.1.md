# B7.1 Reviewer recovery regression — Cryptography

- Source: `Modules/Lecture Presentations/5. Cryptography.pdf` from the frozen `CC16 - CITCS 2N GROUP A.zip` archive
- SHA-256: `ffc2101da495e7b17056a97b761e65191a0c3eb4f09ed4339b400f94565874a4`
- Engine commit: `3d912dde86db4587bae9ed4c754955ade64bedbf`
- Model: `gpt-4o`
- Reviewer pipeline invocations: 1, after complete 55-page extraction/assembly
- Pages: 55/55 assembled (46 native, 9 OCR, 0 missing, 0 duplicate)
- Sections: 28
- Semantic targets: 141/141. The justified increase from B7's 140 is the generic promotion of the flattened three-column objective/formula table into two explicit mapping rows.
- Plan integrity: 1.00, passed
- Coverage: 1.00, passed
- Grounding: 1.00, passed; 0 grounding issues; 0 relationship issues
- Leakage: passed; 0 issues
- Retries: 5
- Fallbacks: 2
- Weak sections: 0
- Assembled reviewer: yes
- Generation duration: 138,242 ms
- Student-use verdict: PASS — definitions, classifications, parameters, mappings, and source-supported relationships remain usable; obvious presentation noise and the isolated OCR label are absent

The engine metadata labels the reviewer `limited` because two sections used extractive fallback. Manual source-only inspection found both fallbacks useful and grounded, and Stage 6 accepted the reviewer without changing any threshold.

## Structured-content audit

- Symmetric single-key content retains same-key use, 40–256-bit key lengths, relative speed, and the VPN bulk-data use stated by the source.
- Symmetric classifications retain separate block/stream categories, block sizes, operating granularity, and the source's RC4/A5 association.
- Asymmetric public-key content retains public/private direction, 512–4096-bit key lengths, relative cost, and the HTTPS use stated by the source.
- The flattened objective/formula table is recovered as two independent mappings: Confidentiality with its public/private formula, and Authentication with its private/public formula.
- The sparse hash visual retains `Input`, `Digest`, `Plaintext Message (data of arbitrary length)`, and `Fixed-Length Hash Value`; it does not invent an arrow absent from extracted evidence.
- Digital-signature content retains integrity/identity, the source's hash/private-key relationship, and DSS.
- Digital-certificate content retains four complete source-backed relationships for issuing, identity verification, public-key provision, and CA validation.

## Section titles

1. Table of Content
2. Introduction to Cryptography
3. Cryptology
4. Plain text
5. Objectives of Cryptography
6. Brief History of Cryptography
7. Definition of Terms
8. Plain Text vs. Clear Text
9. Encryption
10. Symmetric Encryption (Single Key)
11. Symmetric Encryption Classifications
12. Symmetric Encryption Algorithms
13. Asymmetric Encryption (Public Key)
14. Asymmetric Encryption Algorithms
15. Asymmetric Encryption Objective
16. Steganography
17. Hash Functions 1
18. Hash Function
19. Hash Functions 2
20. Limitations of Hashing
21. Password Cracking (Hashing)
22. Activity – Guess My Password
23. Activity – Guess Me
24. Digital Signatures
25. Digital Certificate (Public Key Certificate)
26. Digital Certificates
27. Certificate Authority (CA)
28. PGP (Pretty Good Privacy)
