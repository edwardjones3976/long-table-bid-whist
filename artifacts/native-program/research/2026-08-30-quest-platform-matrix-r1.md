# Quest platform matrix R1 — UE5.7 Android correction and local readiness

## Authority correction

This R1 supersedes only the Android-toolchain row in
`2026-08-30-quest-platform-matrix.md`. The earlier matrix froze Meta guidance
for NDK `25.1.8937393` because exact Epic UE5.7 evidence was then unavailable.
Epic's current UE5.7 Android requirements page is now authoritative for the
engine build used by this project:

- UE `5.7`: Android SDK `35` recommended and minimum for compilation;
- NDK `r27c`;
- build-tools `35.0.1`;
- OpenJDK `21.0.3` generation;
- Android Studio Koala `2024.1.2 Patch 1` generation.

Primary source:
`https://dev.epicgames.com/documentation/unreal-engine/android-development-requirements-for-unreal-engine?lang=en-US`

Meta's current Unreal hand-tracking and Interaction SDK guidance remains the
platform authority for hands/controller behavior. It supports multimodal hands
and controllers, recommends Interaction SDK, and permits built-in Unreal
OpenXR as a reduced-feature fallback:

- `https://developers.meta.com/horizon/documentation/unreal/unreal-hand-tracking-overview/`
- `https://developers.meta.com/horizon/documentation/unreal/unreal-isdk-getting-started/`
- `https://developers.meta.com/horizon/documentation/unreal/unreal-controllers-overview/`

## Current local host evidence

Observed at `2026-08-30T18:17-07:00` through `18:24-07:00`:

- Android SDK root:
  `C:\Users\edwar\AppData\Local\Android\Sdk`
- Installed platform: `android-35`
- `android-35\android.jar` bytes: `27092450`
- `android-35\android.jar` SHA-256:
  `4566663c3876e022b4fa4ced8c8697c4ab1688267f090114fd92d027b32e619b`
- Installed NDK: `27.2.12479018` (`r27c`)
- Installed build-tools: `35.0.1`
- Portable project-specific JDK:
  `C:\Users\edwar\.codex\dependencies\long-table-openjdk21\PFiles64\Microsoft\jdk-21.0.12.101-hotspot`
- JDK runtime: Microsoft OpenJDK `21.0.12.1` LTS
- `java.exe` SHA-256:
  `1f41cc782de7ddd8824376568f9011413d710cf225047906106d2a01a0e3f7a9`
- Authenticated Winget package: `Microsoft.OpenJDK.21` version `21.0.12.101`
- Downloaded MSI SHA-256:
  `3a3f7e1a9fd9edd1fcc0545ffbe7dc87787a8417dc1bf303e41c7a697c8490c1`

The SDK 35 platform was installed once through the existing Android command
line manager. The packaged JDK had no user-scope installer, so it was downloaded
once from Microsoft's Winget source and administratively extracted to the
project-specific dependency directory. Global `JAVA_HOME`, Android Studio, and
the system Java installation were not changed.

## Unreal and project state

- UE `5.7.4` includes built-in `OpenXR`, `OpenXRHandTracking`, and `XRBase`
  engine plugins.
- No engine-level Meta XR/Oculus XR or Interaction SDK plugin is installed.
- `Unreal/LongTable.uproject` enables no XR plugin; it lists only disabled
  `AndroidFileServer`.
- The current project config still has `TargetSDKVersion=32`; it is not yet
  aligned to the UE5.7 SDK 35 package gate.
- No Quest device is visible to `adb devices -l`.

The installed Turnkey automation is not counted as a green verifier. A bounded
`VerifySdk` invocation selected no platform, and `ListPlatforms` then threw a
`NullReferenceException` while AutomationTool still returned exit `0`. Both are
recorded as `NOT_VERIFIED`, not passed.

## Corrected gate state

- **Host SDK/NDK/JDK acquisition:** ready for an explicit per-process build
  configuration.
- **Project Android/XR configuration:** not implemented and not accepted.
- **Meta XR / Interaction SDK integration:** missing.
- **Blank Android package:** not built.
- **Quest install/launch/relaunch:** not run; no connected device.
- **Hands/controllers, switching, haptics, MR/VR, placement and recovery:** not
  run on device.
- **Two-headset concealed-state proof:** not run.

This correction removes the false NDK `25.1` blocker. It does not create a
package, device result, product change, store verdict, or milestone claim.
