# B25 motion validation

| Behavior | Implementation | Evidence / limit |
| --- | --- | --- |
| Direct manipulation | Memoized ring responders, 300 ms hold, 15-minute angular snapping, spring scale, 10 ms vibration | Component behavior tests and midnight-boundary test pass; physical feel BLOCKED |
| Orb ambient | Static layered SVG light fields; native-driven breathing opacity/scale | Isolated web render inspected; native FPS NOT RUN |
| Orb touch | Compression and bounded 12-point parallax, spring return | Source inspected; physical touch NOT RUN |
| Flow | Entry opacity transition | FRESH component render; no measured native frame budget |
| Morph | Shared timings and stack boundaries established; platform route/sheet transitions | Shared-element card-to-reader morph deferred to B26 |
| Reduced motion | Fades replace navigation movement; orb ambient/parallax and handle scaling suppressed | Policy tests pass; real OS toggle NOT RUN |
| Lifecycle | Orb stops when hidden/backgrounded/terminal; clock pauses off-screen; GET polling stops in background and terminal generation | Code reviewed; force-stop/relaunch validation BLOCKED |

No per-frame network request, invented timer percentage, blur storm or animated layout dimensions. SVG ring updates during a user drag run on JS; this deliberately bounded interaction still needs device profiling. Ambient transforms use the native driver. Requests chain after completion rather than overlapping on intervals. Back does not cancel accepted generation.

Physical realme remained locked. Do not interpret a clean bundle, mocked behavior tests or browser screenshots as physical performance evidence. Required follow-up: both themes; hold/drag near midnight; haptic intensity; TalkBack; large font; orb touch; rapid back/forward; background/resume; confirmed admission followed by force-stop and Queue/result recovery.
