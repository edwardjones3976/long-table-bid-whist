# VR Toolchain Pin — The Long Table (Codex decision D-04)

**Status:** Decided (owner, 2026-11-20) · **Verified:** 2026-11-20 against live official pages · **Re-verify by:** 2026-12-20, and before the first Unity project is created

This record pins the engine, XR packages and Android build settings for the Quest
build of The Long Table. Every version below was found on an official Unity or Meta
page on 2026-11-20 and then independently re-opened by a second reviewer who also
checked for anything newer. Nothing here comes from memory.

The Kotlin rules engine in `app/src/main/java/com/example/engine/` stays the
reference implementation; this toolchain is for the Unity presentation adapter and
the C# port (Codex §10.2).

---

## 1. Decision

| Layer | Pin | Why this one |
| --- | --- | --- |
| **Unity Editor** | **6000.3.29f1** (Unity 6.3 LTS) | Current LTS stream, supported until **December 2027**; newest 6000.3 patch (released 2026-11-19). Unity 6.0 LTS support ended October 2026. Unity 6.7 LTS is "coming soon" (public beta 6000.7.0b10) — it is the planned migration target once it ships. |
| **XR plug-in** | `com.unity.xr.openxr` **1.19.0** | Latest released (2026-10-16); the 1.19 manual states compatibility with "6000.0 LTS+" and Unity's 6000.3 package table lists 1.19.0 as released for 6.3. Meta's own docs say all new projects should use Unity's OpenXR Plugin; the OculusXR plug-in is deprecated. **Fallback 1.18.0** if the spike finds 1.19.0 features gated to Unity 6.7 (see §4). |
| **Quest extensions** | `com.unity.xr.meta-openxr` **2.7.0** | Latest released (2026-10-16); Unity's manual: "the recommended path for building Meta Quest" apps. Requires OpenXR Plugin ≥ 1.18.0, AR Foundation ≥ 6.6.0, XR Core Utils ≥ 2.6.0, XR Plugin Management ≥ 4.7.0, XR Composition Layers ≥ 2.4.0 (registry manifest). Provides passthrough (AR Foundation camera), boundary visibility, Scene/planes (needs user Space Setup), colocation discovery. |
| **Interaction** | `com.unity.xr.interaction.toolkit` **3.7.0** | Latest released (2026-10-16); requires Unity 6000.0+. Ships XR Origin (stationary and room-scale), the XR Interaction Simulator (mouse/keyboard incl. simulated hands), the Hands Interaction Demo and `XR Origin Hands` rig, and the new `XRHandsConfigurationManager`. Depends on Input System. |
| **Hand tracking** | `com.unity.xr.hands` **1.10.0** (confirm released in spike) | XRI 3.7.0 recommends ≥ 1.10.0-pre.1; the 1.10 manual states OpenXR is the only provider that supports hand tracking. |
| **Transitive XR pins** | `com.unity.xr.management` 4.7.0 · `com.unity.xr.arfoundation` 6.6.0 · `com.unity.xr.core-utils` 2.6.0 · `com.unity.xr.compositionlayers` 2.4.0 | Floors declared by `com.unity.xr.meta-openxr@2.7.0`; pinned explicitly so the manifest is reproducible. |
| **Spatial audio** | `com.meta.xr.sdk.audio` **209.0.0** (Meta XR Audio SDK) | The supported replacement for the end-of-life Oculus Spatializer (no support beyond v47). Requires Unity ≥ 6000.0.66f2; "Fixed Unity 6.4 compatibility issues". Registry manifest declares **no dependencies**, so it is expected to install without the Meta XR Core SDK (spike item §4). |
| **Android target** | `targetSdkVersion` **34** · `minSdkVersion` **32** · `compileSdkVersion` **34** | Meta: apps created on/after 2026-03-01 must target Android 14 (API 34), enforced at binary upload; min may stay 32; recommended 32/34/34 for Quest 2, Quest Pro and the Quest 3 family. All Horizon OS releases since v76 (April 2025) run Android 14. |
| **Binary** | ARM64 only · IL2CPP · Vulkan · APK signature scheme v2 · OpenXR loader from the Khronos SDK | Store rules VRC.Quest.Packaging.6 (64-bit only), .2 (sig v2), .4 (Khronos OpenXR loader — Unity's OpenXR Plugin satisfies this). Vulkan is Meta's recommended API and required for Depth API/occlusion, ETFR and subpasses; GLES is legacy. |
| **Devices** | Quest 3, Quest 3S, Quest 2, Quest Pro | Unity 6.3 lists all four as supported. Quest 2 / Quest Pro accept new submissions **through December 2027** but are frozen at Horizon OS v2.13 / Meta VR OS SDK v213 — do not depend on OS features newer than v213 on those devices. MR room placement (passthrough + Scene) is a Quest 3 family feature. Quest 1 is closed. |
| **Bundled Android toolchain** (comes with 6000.3.29f1) | OpenJDK 17 (17.0.21+9) · NDK r27c (27.2.12479018) · SDK Build-tools 36.0.0 · cmdline-tools 21.0 · Platform-tools 37.0.1 · Gradle 9.3.1 · Android Gradle Plugin 9.1.1 · CMake 3.22.1 | From the Unity 6.3 manual's "Supported dependency versions" and "Unity and Gradle version compatibility" tables for 6000.3.26f1+/28f1+. Use the bundled toolchain; do not install a separate JDK/NDK. |

### `Packages/manifest.json` (for the future Unity project)

```json
{
  "dependencies": {
    "com.unity.xr.openxr": "1.19.0",
    "com.unity.xr.meta-openxr": "2.7.0",
    "com.unity.xr.interaction.toolkit": "3.7.0",
    "com.unity.xr.hands": "1.10.0",
    "com.unity.xr.management": "4.7.0",
    "com.unity.xr.arfoundation": "6.6.0",
    "com.unity.xr.core-utils": "2.6.0",
    "com.unity.xr.compositionlayers": "2.4.0",
    "com.meta.xr.sdk.audio": "209.0.0"
  },
  "scopedRegistries": [
    {
      "name": "Meta XR",
      "url": "https://npm.developer.oculus.com",
      "scopes": ["com.meta.xr"]
    }
  ]
}
```

`com.unity.inputsystem` is pulled in by XRI; let the Package Manager resolve it and
record the resolved version after the spike. Project Settings: XR Plug-in Management
→ OpenXR for Android and Standalone, Meta Quest feature group enabled; Player →
Scripting Backend IL2CPP, Target Architectures ARM64 only, Graphics API Vulkan,
Minimum API 32, Target API 34; Audio → Spatializer and Ambisonic plug-in "Meta XR Audio".

---

## 2. Rationale and alternatives rejected

- **LTS over Unity's "Update" releases.** Unity's own guidance nominally prefers
  Update releases (currently 6000.6.10f1) "for new and mid-cycle productions", but
  each Update release is supported only until the next one ships. The Long Table
  wants a toolchain that stays patched while the rules engine, accessibility and
  community review proceed over months; 6.3 LTS is patched weekly and has a
  published support end date. We accept being behind on engine features.
- **Unity OpenXR + Unity OpenXR: Meta over the Meta XR Core SDK as the base.**
  Portability (OpenXR), Unity's stated recommendation for Quest, and a smaller
  surface for the concealed-information boundary review. Meta's SDKs are added only
  where a required capability has no Unity OpenXR equivalent (today: spatial audio).
- **Not pinning the Editor's "verified" package defaults.** Unity 6000.3 marks
  `com.unity.xr.openxr` 1.16.1 and `com.unity.xr.management` 4.6.1 as the
  Editor-verified versions, but `com.unity.xr.meta-openxr` 2.7.0 requires OpenXR
  ≥ 1.18.0 and Management ≥ 4.7.0, so the explicit pins above are needed anyway.

---

## 3. Inconsistencies found in the official documentation

Recorded so nobody re-litigates them from a single stale page:

1. **OpenXR 1.19.0 and Unity 6.7.** The 1.19.0 changelog marks some entries
   "Requires Unity 6.7 or newer", while the 1.19 manual states "6000.0 LTS+" and the
   Unity 6000.3 package table lists 1.19.0 as released for 6.3. Reading: the
   package installs on 6.3; specific new features are gated. Spike item.
2. **Meta OpenXR install page is stale.** It says "To use Unity OpenXR: Meta 2.6 …
   OpenXR Plug-in 1.17.0 or newer, AR Foundation 6.6.0-pre.2 or newer", but the
   2.6.1 changelog and the 2.7.0 registry manifest state OpenXR ≥ 1.18.0 and AR
   Foundation ≥ 6.6.0. The registry manifest is authoritative here.
3. **Meta's "XR Plugin Management for Meta VR" page lags Unity**, still recommending
   OpenXR Plugin 1.15.1 and "Unity 6.1 or later". Follow Unity's package pages for
   versions; follow Meta's page only for the "use OpenXR, OculusXR is deprecated"
   direction.
4. **Meta XR Audio SDK and the Core SDK.** Meta's SDK overview (2025-06-23) says the
   Core SDK "must be installed to access the functionality of any of the other Meta
   XR SDKs", but the Audio SDK's registry manifest declares no dependencies and its
   setup page lists none. Treat "works without Core SDK" as an inference until the
   spike confirms it.
5. **Target API level.** Unity's "Prepare Your App for Publishing" page still says
   Target API "Automatic (highest installed)" and min API 29; Meta's manifest page
   and the March-2026 enforcement make 34/32 the binding values. Set them explicitly.
6. **Meta XR Audio SDK dates** differ by a day across sources (download page Nov 9,
   registry and Asset Store Nov 10, 2026). Immaterial.
7. **XRI 3.6.1 date** is 2026-08-24 on the 3.7 changelog and 2026-09-08 on the 3.6
   changelog; the recommended XR Hands version is 1.6.1 on the sample page but
   1.10.0-pre.1 in the 3.7.0 changelog. We follow the newer changelog.

---

## 4. Compatibility spike (gate G1 — run before any gameplay code)

A one-day, throwaway Unity project. Each line is pass/fail with the exact version
observed; a failure reopens this record rather than being worked around.

- [ ] Unity Hub installs **6000.3.29f1** with Android Build Support (OpenJDK, SDK & NDK tools).
- [ ] The manifest above resolves with no version conflicts; record the resolved `com.unity.inputsystem` version.
- [ ] `com.unity.xr.openxr` **1.19.0** compiles and builds on 6000.3.29f1; note any Inspector/feature marked "requires 6.7". If it does not build, drop to **1.18.0** and record why.
- [ ] `com.unity.xr.meta-openxr` **2.7.0** enables the Meta Quest feature group; a blank scene with XR Origin runs on a Quest 3 and a Quest 2 (if available).
- [ ] `com.meta.xr.sdk.audio` **209.0.0** installs from the Meta scoped registry **without** `com.meta.xr.sdk.core`, "Meta XR Audio" appears as spatializer, and one spatialized AudioSource plays on device.
- [ ] XRI **3.7.0** XR Interaction Simulator drives a seated (Device tracking origin) rig in the Editor with simulated hands; the Hands Interaction Demo imports with `com.unity.xr.hands` **1.10.0**.
- [ ] Hand tracking and both-controller input work in the same build (Codex §7.6 parity).
- [ ] Release APK: ARM64 only, IL2CPP, Vulkan, API 32/34, signature scheme v2; `aapt dump badging` shows `targetSdkVersion:'34'` and no 32-bit libs.
- [ ] Upload to an App Lab / release-channel test build passes Meta's binary checks (API 34 enforcement, 64-bit, OpenXR loader).
- [ ] Passthrough + boundary-visibility suppression on Quest 3 (MR table placement); confirm graceful absence on Quest 2.
- [ ] Record Horizon OS build numbers of the test devices.

---

## 5. Upgrade policy

- Re-verify this table **monthly** and before every milestone build; update pins only
  through a PR that cites the official page and date, as this one does.
- Patch within the 6000.3 LTS stream freely; move to **Unity 6.7 LTS** once released
  and once XRI / OpenXR / Meta OpenXR publish releases that list it as supported.
- Never adopt a `-pre` / `-exp` package in a release build.
- Keep Quest 2 / Quest Pro support until the December 2027 submission deadline is
  reconsidered; avoid any OS feature newer than SDK v213 on those devices.

---

## 6. Sources (all accessed 2026-11-20)

**Unity Editor**
- https://unity.com/releases/unity-6 — "Unity 6.3 LTS is now available … supported with two-year LTS until December 2027 … Coming soon – Unity 6.7 LTS"
- https://unity.com/releases/unity-6/support — "Unity 6.0 LTS is supported through October 2026 … Update releases are the preferred choice for new and mid-cycle productions"
- https://unity.com/releases/editor/whats-new/6000.3.29f1 — "Released on Nov 19, 2026 … Updated OpenJDK from 17.0.18+8 to 17.0.21+9"
- https://services.api.unity.com/unity/editor/release/v1/releases?version=6000.3&limit=10&order=RELEASE_DATE_DESC — 6000.3.29f1, stream LTS, 2026-11-19
- https://docs.unity.com/en-us/engine/6000.3/manual/platform-specific/android/getting-started/sdksetup/supported-dependency-versions — Build-tools 36.0.0, cmdline-tools 21.0, Platform-tools 37.0.1, NDK r27c, OpenJDK 17
- https://docs.unity.com/en-us/engine/6000.3/manual/platform-specific/android/introducing/gradle-overview/version-compatibility — 6000.3.26f1+: Gradle 9.3.1, AGP 9.1.1

**OpenXR Plugin**
- https://docs.unity3d.com/Packages/com.unity.xr.openxr@1.19/manual/index.html — "compatible with … 6000.0 LTS+"
- https://docs.unity3d.com/Packages/com.unity.xr.openxr@1.19/changelog/CHANGELOG.html — "[1.19.0] - 2026-10-16"; some entries "Requires Unity 6.7 or newer"
- https://docs.unity3d.com/Packages/com.unity.xr.openxr@1.18/changelog/CHANGELOG.html — "[1.18.0] - 2026-08-04 … minimum supported editor version to 6000.0 … Added a Quest 3S option"
- https://docs.unity.com/en-us/engine/6000.3/manual/packages-list/packages-all/pack-safe/com-unity-xr-openxr — 1.16.1 verified for 6000.3; 1.19.0 listed released

**Unity OpenXR: Meta**
- https://docs.unity3d.com/Packages/com.unity.xr.meta-openxr@2.7/manual/index.html — "Unity OpenXR: Meta | 2.7.0"
- https://docs.unity3d.com/Packages/com.unity.xr.meta-openxr@2.7/changelog/CHANGELOG.html — "[2.7.0] - 2026-10-16"; 2.6.1: OpenXR min 1.18.0, AR Foundation min 6.6.0, XR Core Utils min 2.6.0
- https://packages.unity.com/com.unity.xr.meta-openxr — dist-tags latest 2.7.0; dependencies openxr 1.18.0, arfoundation 6.6.0, core-utils 2.6.0, management 4.7.0, compositionlayers 2.4.0
- https://docs.unity.com/en-us/engine/current/manual/xr/support/support-packages — "The Oculus package is deprecated in Unity 6.5 and newer. The Unity OpenXR: Meta package is now the recommended path"
- https://docs.unity.com/en-us/engine/6000.3/manual/xr/support/support-packages — "Unity supports development for Meta Quest 2, 3, 3S, and Quest Pro"
- https://developers.meta.com/horizon/documentation/unity/unity-project-setup — "set XR Plugin to OpenXR … The OculusXR plugin is deprecated" (updated 2026-10-19)

**XR Interaction Toolkit / XR Hands**
- https://docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.7/manual/index.html — "3.7.0 … compatible with … 6000.0 and later"
- https://docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.7/changelog/CHANGELOG.html — "[3.7.0] - 2026-10-16"; XR Hands recommended 1.10.0-pre.1+; `XRHandsConfigurationManager`
- https://docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.7/manual/xr-interaction-simulator.html — simulator with tracked-hand simulation
- https://docs.unity3d.com/Packages/com.unity.xr.hands@1.10/manual/index.html — "XR Hands | 1.10.0 … OpenXR package is the only plug-in provider that supports hand tracking"

**Meta XR Audio SDK**
- https://npm.developer.oculus.com/com.meta.xr.sdk.audio — latest 209.0.0; unity 6000.0 / 66f2; no dependencies; published 2026-11-10
- https://developers.meta.com/vr/downloads/package/meta-xr-audio-sdk/ — "Version 209.0 … Updated the minimum supported Unity version to 6000.0.66f2"
- https://developers.meta.com/horizon/documentation/unity/audio-osp-unity/ — Oculus Spatializer "end-of-life … no further support beyond v47"
- https://developers.meta.com/horizon/documentation/unity/unity-sdks-overview/ — Core SDK "must be installed …" (2025-06-23; see §3.4)

**Quest / Horizon Store requirements**
- https://developers.meta.com/horizon/resources/publish-mobile-manifest/ — HzOS 76+ = Android 14; recommended 32/34/34; apps created since 2026-03-01 must target 34 (updated 2026-10-15)
- https://developers.meta.com/horizon/blog/meta-quest-apps-android-14-march-1/ — API 34 "enforced during binary upload"
- https://developers.meta.com/horizon/resources/publish-quest-req/ — Packaging.2 (sig v2), Packaging.6 (64-bit only)
- https://developers.meta.com/horizon/resources/vrc-quest-packaging-4/ — OpenXR loader from the Khronos OpenXR SDK
- https://developers.meta.com/horizon/documentation/unity/po-advanced-gpu-pipelines/ — "Vulkan is the required graphics API for Meta VR development"
- https://developers.meta.com/horizon/resources/quest-2-quest-pro-legacy-support/ — Horizon OS v2.13 / SDK v213 final for Quest 2 / Pro; submissions through December 2027 (updated 2026-11-02)
- https://developers.meta.com/horizon/blog/changes-coming-quest-1-2023-meta/ — Quest 1 closed to new apps 2024-01-31
- https://developers.meta.com/vr/release-notes/ — Meta XR SDK 209.0, Nov 9, 2026, "Requires Unity 6000.0.66f2 or later"
