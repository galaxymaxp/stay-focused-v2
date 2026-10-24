# FS8: correction of unsupported native-text evidence

2026-10-24. **Archive pixel verification PASS; current symptom NOT REPRODUCED
IN SAMPLED CONDITIONS.** This corrects the evidentiary premise behind RT1/EV1;
it does not claim a native rendering repair or certify the unreleased build.

## What the actual archived bytes establish

The original FS7 report claimed text was missing in the first capture and
recovered in the follow-up. EV1 then claimed the opposite ordering: text in
after-resume.png and missing in stable-after-resume.png. Both descriptions are
contradicted by direct inspection of the original PNG pixels.

The immutable archive is at
`C:/Users/Fely Max Dilinila/Documents/Projects/stay-focused-v2-fullsend-20261022-1512/.local/fullsend-20261022-1512`.
The same original file digests recorded by EV1 are freshly confirmed:

| File | SHA256 |
| --- | --- |
| after-resume.png | 486145d3c9d7bb1772a224e3cd682e3686014ed966da1023c5437cf168f5d8b9 |
| stable-after-resume.png | 8b3698a5dcbe96150e14026a1b752acebc88f7fe029d520be63ae129d67fe0df |

Both files are 1080 by 2412. In both, the known visible Generation title,
helper, View Queue label and back arrow have **byte-identical RGBA patches**.
The title has 11,772 neutral light pixels, helper 4,386, View Queue label 1,774.
Thus neither supplied frame supports the asserted loss of these elements.
Opening stable-after-resume.png individually at original resolution also
visually confirms all labels and the arrow. Different whole-file hashes reflect
other image content; they do not imply different text in these regions.

The new reusable `scripts/verify-resume-text-captures.mjs` decodes the actual
PNG bytes, checks dimensions/explicit bounds, hashes RGBA patches and requires
positive visible-pixel counts in both frames. It cannot pass two identical
empty patches. It does not equate UI-tree presence with rendered text. Its
negative tests cover missing text, identical blank patches, dimension mismatch
and invalid bounds/thresholds. Output contains hashes/counts, not private images.

Reproduce with the two original paths, ignored
`tmp/overnight/FS8-REPAIR/device/regions.json` and an explicit local output path.
Fresh actual output: `device/archive-pixel-proof.json`, 4/4 unchanged visible
regions. The script records its limits; this is neither arbitrary OCR nor a
continuous physical-display observation.

## Fresh direct phone observations

Realme RMX3151, installed native 2.3.0/code7. About displayed update prefix
01a16304. No full active update ID, active channel override or embedded-launch
identity is inferred from that prefix. Historical release records correlate it
with a later update, separate from original FS7 and the unreleased candidate.

Normal app navigation was performed on the already online signed-in phone.
Foregrounding can perform the app's normal API synchronization/update checks;
zero device service traffic is not claimed. No generation button, retry,
account/storage/network setting, update action or installation was invoked.
User unlocked the phone and independently replied **"Text stays visible"**
during this run. That reply is an observation during the session, not a
time-synchronized statement for every later cycle.

Ten Home/resume cycles were initiated, with target five-second Home dwell:
seven on the parameter-free Generation route, then three on Today. Nine have
both early and target-55-second PNG/XML samples; cycle 8 was interrupted before
its late sample. The missed sample is retained as NOT COLLECTED. Three extra
Today-to-Generation navigation loops were also recorded before cycle 4.

No text loss is supported by the collected current samples. Seven Generation
late frames have visible expected labels; the two completed Today late frames
are inspected separately. The early baseline and early resume samples may
include Android launcher transition frames, so their coordinate-misaligned
pixel counts do not establish loss. Samples do not rule out transient events
between captures. No claimed ten-of-ten physical acceptance or causal repair.

## Inspection mistake and why the old assertions are corrected

During this run, the batched image previews were initially misread as missing
text in cycle 6. The owned loop was stopped during cycle 8. Opening the exact
cycle-6 PNG individually and inspecting its actual RGBA regions established
that the labels were present; the reproduction claim was promptly retracted.
This inspection error, missed sample and command history remain in events.jsonl.
The same independent byte-level check then disproved EV1's archived-pixel claim.
No unproved preview-tool defect or model failure mechanism is asserted.

Historical reports, PNG/XML files and terminal STOPPED/FAILED records remain
unchanged. This new report supersedes their unsupported captured-text claims.
There is no established native defect to which a speculative timer, remount,
forced redraw, font change, GL disablement or dependency change could be a
justified repair. The concrete correction is to the verification/evidence path.

## Acceptance and release boundary

| Requirement | Result |
| --- | --- |
| Recover original captured evidence and verify custody | PASS: exact original digests retained |
| Resolve claimed first/follow-up pixel contradiction | PASS: actual declared regions are identical and visibly populated in both files |
| Reproducible evidence validation with meaningful negative checks | PASS pending final committed test/log checkpoint |
| Direct current phone reproduction attempt | NOT REPRODUCED in collected samples; 9 complete cycles, 1 interrupted; owner observation recorded |
| Evidence-supported native repair | NOT APPLICABLE: the asserted archived frame failure is disproved; no substantiated native code cause |
| Candidate production/device acceptance | NOT RUN; remains part of the ordinary release workflow |

The supersession resolves an unsupported failure assertion, not a waiver of a
proven defect. Final release still requires its normal fresh gates, exact build
identity and post-rollout physical checks. This repair does not run FULLSEND.
