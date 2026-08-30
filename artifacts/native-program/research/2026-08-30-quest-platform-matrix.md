# Quest 3 / Quest 3S native platform evidence

- Retrieval date: 2026-08-30
- Retrieval route: Firecrawl against official Meta and Epic public pages
- Scope: Unreal Engine 5.7.4, Quest 3/3S, controller/hand input, mixed reality, Android packaging, device diagnostics and performance
- Perplexity disposition: `LT-NATIVE-PERPLEXITY-QUEST-PLATFORM-001` stopped before submission because the configured credential was present but empty. No request reached Perplexity, no provider output exists and no workload credit is earned.
- Authority: evidence only. This record does not prove a package, physical device, two-headset session, store acceptance, music rights or human acceptance.

## Decision matrix

| Area | Official evidence | Native-program decision | Confidence / gap |
| --- | --- | --- | --- |
| Unreal integration | Meta's UE5 integration package is SDK 205.0, released/updated 2026-07-22, and targets UE 5.7.4. It supports mobile-deferred dynamic resolution. Deprecated Mixed Reality Capture was removed. | Freeze UE 5.7.4 with Meta XR SDK 205.0 as the current target pair. Do not depend on deprecated MRC. | High for the stated pair. A real project build remains required. |
| Android toolchain | Meta's 2026-04-17 quick-start page states NDK 25.1.8937393 for UE 5.5+, minimum API 32, Quest Store target API 34, and the Android Studio bundled JDK under `jbr`. | Preflight and package against those exact Meta values; fail closed if the installed toolchain differs. | High for Meta's page. Epic's current Turnkey page redirects to UE 5.8, so an exact independent Epic UE 5.7 value is **NOT ESTABLISHED**. |
| Controllers and hands | Meta's Unreal input page supports controllers and hands, including hands alone or with controllers. | Controller and hand interaction are both first-class, not optional polish. | High at feature level; product mappings and device behavior remain unproven. |
| Live multimodal switching | Meta's 2026-08-11 multimodal page supports simultaneous hands/controllers on Quest 2/Pro/3/3S with Meta XR v74+, OpenXR backend and UE 5.5+. It exposes `Controllers And Hands` and a runtime enable call. | Implement one transactional input state machine with equivalent controller/hand intents and cancel-before-switch behavior. | High for availability. Meta lists imperfect in-hand signals, pause/fallback delay, Link pose limits and incompatibilities with IOBT/FBS, FMM and some other features; every transition needs physical-device tests. |
| Passthrough, Scene API and shared anchors | Meta's Shared Scene sample combines passthrough, Scene API and Shared Spatial Anchors on Quest 2/3/3S. The sample is UE 5.4 and uses a LAN null subsystem without authentication. Cloud-saved anchors are suggested as an extension. | Treat the sample as a capability reference only. Product rooms require authenticated networking, explicit fallback to VR and independent persistence/recovery tests. | Medium. Production authentication and anchor persistence are **NOT ESTABLISHED** by the sample. |
| Meta avatars | Meta's Unreal Meta Avatars page is retired and says the Meta Avatars SDK was never released for Unreal, Unreal support is not planned, and final release was 40.0.1. | Do not promise the individual's Meta avatar in the UE milestone. Keep an optional future adapter seam and ship a deterministic fallback: tracked hands/controllers, seat marker and nameplate. | High. A supported native Unreal Meta-avatar path is **NOT ESTABLISHED**. |
| Install and launch | Meta's ADB page requires the USB driver, developer mode and the headset's Allow prompt; it documents `adb devices`, initial USB before Wi-Fi, `adb install` and `adb install -r`. | The unchanged package must be enumerated, installed, launched and relaunched on Quest 3/3S with exact package identity recorded. | High for procedure; no device is currently connected. |
| Logs and crash evidence | Meta's logcat page documents `adb logcat`, tag filters, bugreport and `ndk-stack`, while noting crash-diagnostic limitations. | Capture bounded filtered logs plus a bugreport/stack artifact on failure. Do not infer a clean launch from packaging alone. | High for available diagnostics. |
| Performance | Meta's 2026-04-14 Unreal performance page gives an interactive target of 72 FPS. For Quest 3/3S it lists about 200–300 draw calls for busy shaders, 400–600 for medium, 700–1000 for light, and 1.3M–1.8M triangles. | Gate First Deal at sustained 72 FPS with on-device evidence and treat the ranges as budgets, not automatic passes. | High for published guidance; actual scene timing remains **NOT ESTABLISHED**. |
| Haptics, spatial audio, accessibility and two-headset concealed state | The bounded ten-page official retrieval did not establish exact UE 5.7.4 implementation/version constraints for all four areas. | Preserve typed adapter seams and explicit test gates. Do not claim completion until each has direct official evidence plus unchanged-candidate execution evidence. | **NOT ESTABLISHED** in this packet. |

## Official source set

1. [Meta XR SDK for Unreal Engine 5 integration](https://developers.meta.com/horizon/downloads/package/unreal-engine-5-integration-github/)
2. [Install Android tooling for Unreal](https://developers.meta.com/horizon/documentation/unreal/unreal-quick-start-install-android/)
3. [Unreal input](https://developers.meta.com/horizon/documentation/unreal/unreal-input/)
4. [Unreal multimodal input](https://developers.meta.com/horizon/documentation/unreal/unreal-multimodal/)
5. [Shared Scene sample](https://developers.meta.com/horizon/documentation/unreal/unreal-sample-shared-scene/)
6. [ADB troubleshooting and install](https://developers.meta.com/horizon/documentation/unreal/ts-adb/)
7. [Logcat diagnostics](https://developers.meta.com/horizon/documentation/unreal/ts-logcat/)
8. [Unreal Android performance and debugging](https://developers.meta.com/horizon/documentation/unreal/unreal-debug-android/)
9. [Epic Turnkey Android setup](https://dev.epicgames.com/documentation/en-us/unreal-engine/set-up-android-sdk-ndk-and-android-studio-using-turnkey-for-unreal-engine)
10. [Meta Avatars Unreal app configuration](https://developers.meta.com/horizon/documentation/unreal/meta-avatars-app-config/)

## Bound conclusions

1. Native UE 5.7.4 is the target, with Meta XR SDK 205.0 and OpenXR-backed multimodal input.
2. First Deal must make controller and hand input behaviorally equivalent and support safe live switching.
3. Mixed reality is progressive enhancement; an intentional VR fallback is mandatory.
4. Meta-avatar integration cannot be a milestone acceptance criterion on the current official Unreal evidence. The fallback identity surface is mandatory.
5. Device, package, performance, anchor recovery, multiplayer concealment and human-event claims remain red until reproduced on unchanged candidate bytes.
