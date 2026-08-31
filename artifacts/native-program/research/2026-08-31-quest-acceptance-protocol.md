# Quest acceptance protocol — normalized Perplexity and Firecrawl evidence

- Assignment: `LT-NATIVE-PERPLEXITY-QUEST-ACCEPTANCE-002`
- Public-query SHA-256: `0b7014ef88d3a8b95fc47e5df75d732cf75d78c04cffac2e67b6f001c3284347`
- Perplexity conversation: `https://www.perplexity.ai/search/ff3ce4a6-7903-43e5-8a47-8596efcfd9d5`
- Captured: `2026-08-31T16:33:21.656Z`
- Perplexity raw response SHA-256: `24c4f0b15542c87ed46f6cce83d2b912f33cea8e5fed2b01e209858310706225`
- Firecrawl: all 10 unique cited official URLs returned HTTP 200 in the final paced pass
- Authority: research and test-design evidence only; no code, product verdict,
  device pass, security certification, Store approval, or direct-production credit

## OpenAI normalization verdict

`ACCEPT_USEFUL_RESEARCH_WITH_TWO_CLAIMS_REJECTED`

The response is useful and unusually careful about the difference between an
officially documented observable and a project-defined acceptance procedure.
It may inform the unchanged-package physical Quest gate. It cannot itself close
that gate.

Firecrawl verified nine substantive claim groups. It fetched the tenth source,
Meta's native code-sample catalog, but found none of the claimed `Perfetto`,
`ADB`, or `performance` catalog terms. The M2 claim is rejected and must not be
used. This does not affect the other nine independently supported claim groups.

The raw response also says the protocol uses seven official primary sources,
while the immediately following M1–M3, E1, K1 and A1–A5 table, the browser
receipt and Firecrawl manifest contain ten unique official URLs. The "seven"
count is rejected as an internal provider contradiction; the raw text remains
unchanged and the normalized source count is ten.

## Evidence-backed protocol

| Gate | Officially supported observable | Evidence to retain | Boundary |
| --- | --- | --- | --- |
| Exact test article | Android `apksigner verify --verbose --print-certs` verifies an APK signature and reports signer details | One project-chosen SHA-256 for the exact APK, size, full apksigner output, signer certificate data, package/version dump from each headset | The hash algorithm and unchanged-package rule are Director requirements, not an official Quest certification rule; an AAB or installed splits require separate identity disclosure |
| Android/UE baseline | Epic's current table shows UE 5.7 with recommended SDK 35 and NDK r27c; its page lists build-tools 35.0.1 and OpenJDK 21.0.3 for the current Android generation | Engine/SDK/NDK/build-tools/JDK versions and exact package build log | This is Android toolchain compatibility, not Quest product acceptance |
| Install and package presence | Meta says ADB drivers are required for ADB with Android-based Quest devices; Android documents general `dumpsys` | Exact command actually used, device serial alias, exit status, installed app tile video, `adb shell dumpsys package <packageName>` | The cited pages do not establish a canonical install command, stable Quest package schema, launch-time threshold, or AAB split-equivalence proof |
| Cold launch, relaunch, forensics | Android documents `adb bugreport`; Meta documents `adb logcat -s VrApi` as an OpenXR runtime-statistics stream | Uncut cold-launch/relaunch video, timestamps, raw logs, pre/post bugreports, package dump, explicit ready-state definition | No official source defines a universal Quest cold-start/relaunch pass threshold or generic UE crash filter |
| Controllers, hands, live switching | OpenXR provides the API/runtime boundary | Uncut controller-only and hand-only runs plus one continuous controller → hands → controller transition; predeclared actions and visible outcomes; tracking-loss and recovery cases | Official sources in this packet do not define Quest/UE coverage, latency, pose, debounce, simultaneous-input, or safety thresholds; this is a project-defined black-box test |
| Haptics and spatial cues | No qualifying Quest-specific measurement method was established | Synchronized run ledger, controller side/event, tester attestation, and redundant visible/audio cue evidence | Subjective evidence only; amplitude, waveform, latency, localization error, SPL, and pipeline correctness remain not established |
| MR placement and VR fallback | Meta documents compositor-layer overlays, layer/property logs, `CompositorClient`, and `VrApi` fields | Normal and overlay video, raw compositor logs, physical table reference, MR → fallback → optional return continuity | These tools show submitted layers/transforms; they do not prove semantic table recognition, durable anchor recovery, drift accuracy, or required fallback policy |
| Performance | Meta documents `TW`, `App`, `GD`, `CPU&GPU`, `LCnt`, `LM`, continued `VrApi` tag output for OpenXR apps, and a 16 compositor-layer rendering limit | Raw VrApi and compositor logs for every scenario; preserve originals before derived tables | No official Quest 3/3S frame-time percentile, thermal, memory, draw-call, battery, duration, or refresh-rate acceptance threshold was established; `LCnt` is not draw calls |
| Battery and diagnostics | Android documents batterystats reset/dump and bugreport procedures | Start/end battery percentage, duration, raw batterystats, bugreport, charger state, identical workload description | General Android evidence, not Quest battery-life certification |
| Accessibility and ages 30–70 | Android recommends manual, automated, accessibility-service, and user testing; TalkBack is documented for Android UI | Test Android-visible UI where applicable; separately run anonymized, consented seated human sessions across intended age bands with task outcomes, pause/exit discovery, reach/readability, and discomfort observations | TalkBack does not establish immersive Unreal/OpenXR accessibility; no official sample size, age-band threshold, comfort scale, or population-wide claim exists |
| Two-headset concealed state | Android/Meta diagnostics can bind observations to devices and runs | Synchronized H1/H2 video, external truth ledger, role reversal, reveal checkpoints, reconnect/relaunch, modality changes, fallback, package evidence, logs and bugreports | The strongest valid claim is "no wrong-player exposure was observed in the retained scenarios"; this is not universal secrecy, cryptographic proof, server-authority proof, or security certification |

## Required unchanged-candidate scenario set

1. Seated VR with Touch controllers through one complete restricted deal.
2. Seated VR with optical hands through the same deal actions.
3. Continuous live controller/hand/controller switching without reload, state
   loss, unintended intent, duplicate card, stuck grab, or premature commit.
4. Tracking loss during transient selection/grab/preview and deterministic
   recovery without an authority mutation.
5. Haptics plus redundant visual/spatial cue confirmation, with bare-hand
   fallback that does not depend on vibration.
6. MR passthrough/table placement and an anchor-recovery attempt, clearly
   separated from what compositor logs can actually prove.
7. Deliberate MR-denied/unavailable path into a complete, usable VR fallback.
8. Sustained workload with raw runtime, layer, battery and diagnostic evidence.
9. Two-headset role-reversed concealment observations at deal, turn, reveal,
   reconnect/relaunch, input transition, fallback and scoring checkpoints.
10. A 15–30 minute intended-user seated session with accessibility, comfort,
    table-feel and cultural critique retained separately from automated gates.

## Sources retained

1. [Epic — Android Development Requirements for Unreal Engine](https://dev.epicgames.com/documentation/unreal-engine/android-development-requirements-for-unreal-engine)
2. [Meta — Compositor layers](https://developers.meta.com/horizon/documentation/spatial-sdk/os-compositor-layers/)
3. [Meta — Code Samples](https://developers.meta.com/horizon/code-samples/native/) — page verified; specific M2 catalog claim rejected
4. [Meta — Oculus ADB Drivers](https://developers.meta.com/horizon/downloads/package/oculus-adb-drivers/)
5. [Khronos — OpenXR API Reference Pages](https://registry.khronos.org/OpenXR/specs/1.1/man/html/openxr.html)
6. [Android — apksigner](https://developer.android.com/tools/apksigner)
7. [Android — dumpsys](https://developer.android.com/tools/dumpsys)
8. [Android — Capture and read bug reports](https://developer.android.com/studio/debug/bug-report)
9. [Android — Batterystats and Battery Historian](https://developer.android.com/topic/performance/power/setup-battery-historian)
10. [Android — Test your app's accessibility](https://developer.android.com/guide/topics/ui/accessibility/testing)

The raw response is preserved unchanged. This normalized record is OpenAI's
independent interpretation; it does not rewrite or silently correct Perplexity.
