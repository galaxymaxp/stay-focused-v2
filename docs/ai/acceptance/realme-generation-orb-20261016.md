# Realme generation orb hotfix

User scope: restore the existing 3D generation orb on the installed Realme;
no APK or EAS Build. Source baseline is published preview `079986c`, avoiding
unshipped features on newer main. Implementation commit: `e18dda0`.

The guard used `ExponentGLObjectManager`, but installed expo-gl 57.0.2 loads
`ExpoGL`. The corrected optional probe retains safe fallback for absent GL.

- FRESH PASS: generation/core tests, 23/23 across six files.
- FRESH PASS: mobile TypeScript and focused ESLint; diff hygiene.
- FRESH PASS: JavaScript-only Android OTA group
  `d1b79016-9ed3-4de4-85af-184896cbc25e`, runtime `2.1.0-sdk57`, preview channel.
- FRESH PASS: physical Realme, installed version 2.1.0/code 5. Before capture
  shows the book fallback. After update download and relaunch, generation
  shows the 3D orb, native accessibility reports `Knowledge Core ready`, and
  successive frames show changing liquid shading. Existing session preserved.
- Sampled recent AndroidRuntime/ReactNativeJS logcat: no matching fatal,
  Three WebGL, GL_INVALID or shader-error entries.
- NOT RUN: fresh paid generation or full job lifecycle; screen opened idle
  without submitting work. NOT APPLICABLE: native build or APK installation.

Earlier check attempts: ESLint launched from the repository root could not
find the mobile config; rerun in the mobile workspace passed. Initial test
typecheck exposed the React Native global URL / Node URL type mismatch;
explicit `node:url` import fixed it and fresh final checks passed.

Local evidence: `.local/realme-orb/{before,after,motion}.png`, UI hierarchy,
OTA result and export/upload log. Git source remains on local branch
`fix/realme-generation-orb`; no main push or remote merge was performed.
