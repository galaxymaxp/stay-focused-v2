# B25.3.3 physical acceptance checkpoint

Date: 2026-09-16. Device: realme RMX3151, Android 13, connected via ADB.

The migrated mobile bundle was loaded using isolated Metro against https://stay-focused-v2-prototype.vercel.app (deployment dpl_9yAtq2sy2YYRfYjoqytHCL6aWUa4). Reload requires direct user sign-in. No authentication bypass or credential extraction was attempted.

The clean branch uses the committed session store; the user's original dirty tree contains an unrelated newer secure-session format. That work remains untouched and is not included in this migration. An initially visible cached screen was not counted as new-code acceptance.

| Flow | Status |
|---|---|
| Reviewer material -> generation -> Library -> content | BLOCKED on sign-in |
| Quiz five questions -> Library -> secrecy -> attempt -> score -> reopen | BLOCKED on sign-in |
| Activity assignment -> generation -> open content | BLOCKED on sign-in and selected assignment |

B25 remains PARTIAL. B26 may not begin. Continue after direct sign-in and assignment selection; no need to repeat the already approved material-transfer permission.
