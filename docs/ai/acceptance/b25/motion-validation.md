# B25 motion validation

| Behavior | Implementation | Evidence / limit |
| --- | --- | --- |
| Direct manipulation | Memoized ring responders, 300 ms hold, 15-minute angular snapping, spring scale, 10 ms vibration | Component behavior tests and midnight-boundary test pass; physical feel BLOCKED |
| Orb ambient | Independent native-driven halo breathing, body deformation, color wash/highlight drift and 18-second orbital light motion | Physical RMX3151: 1,177 frames, 0.51% janky, 11/13/13/14 ms p50/p90/p95/p99 |
| Orb touch | Hold compression and brightness, tap pulse, spring release; no job action | Component behavior test and physical touch capture pass |
| Flow | Entry opacity transition | FRESH component render; no measured native frame budget |
| Morph | Shared timings and stack boundaries established; platform route/sheet transitions | Shared-element card-to-reader morph deferred to B26 |
| Reduced motion | Orb ambient transforms and interaction scaling are suppressed; a stable layered state and immediate light feedback remain | Focused reduced-motion test passes; real OS toggle NOT RUN |
| Lifecycle | Orb runs only while active, focused and generating; all ambient and interaction values stop on blur/background/terminal/unmount | Focus/background/unmount tests pass; physical 10-second samples rendered 1 frame off-route and 0 frames backgrounded |

No per-frame network request, invented timer percentage, blur storm or animated layout dimensions. SVG ring updates during a user drag run on JS; this deliberately bounded interaction still needs device profiling. Orb ambient transforms use the native driver. Requests chain after completion rather than overlapping on intervals. Back does not cancel accepted generation.

## B25.2.1 correction

The earlier implementation was not a fully animated orb: its SVG light fields, trails and decorative points were static, while one wrapper alone changed scale, opacity and ±2° rotation. The prior “orb animation” wording described that container motion and overstated the living-object effect seen on device. B25.2.1 replaces it with independently moving visual layers and records the first physical RMX3151 orb profiling. TalkBack, large-font layout, and a real OS reduced-motion toggle remain separate accessibility follow-ups.
