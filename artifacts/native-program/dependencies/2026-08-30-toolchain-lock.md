<!-- [[OpenAI QA | Codex | 2026-08-30 | 05:42 UTC | BEGIN]] -->
# Native dependency acquisition lock

## Verified host tools

- Unreal Editor: `C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe`
- Engine version: 5.7.4, changelist 51494982.
- Android Studio: installed under `C:\Program Files\Android\Android Studio`.
- Google command-line tools archive:
  `commandlinetools-win-15859902_latest.zip`, SHA-256
  `90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a`,
  matching Google's published Windows checksum on 2026-08-30.
- UE SetupAndroid requested: platform `android-34`, Build Tools `35.0.1`,
  CMake `3.22.1`, NDK `27.2.12479018`.
- UE SetupAndroid result: `Success`; installed platform `android-34`, Build
  Tools `35.0.1`, CMake `3.22.1`, NDK `27.2.12479018` (`r27c`) and ADB
  `37.0.1-15733141`. User-scoped `ANDROID_HOME`, `JAVA_HOME`, `NDKROOT`, and
  `NDK_ROOT` are bound to those verified paths.

## Official Meta archives staged

| Dependency | Official version | Bytes | Local SHA-256 |
| --- | ---: | ---: | --- |
| Unreal Meta XR Integration | 205.0 | 248,994,630 | `3bcdfc161a687dcc5b1659bd94d48d5ea93a63c067214b8831bb870c4d67c389` |
| Meta XR Interaction SDK for Unreal | 203.0.0 | 598,535,508 | `dd5cc3b881d973d7f11dfa00327616be39643501b9ce57e8b4c05d80b2357f41` |

Source URLs:

- `https://securecdn.oculus.com/binaries/download/?id=27823218380622919&fcl=fsan1-2`
- `https://securecdn.oculus.com/binaries/download/?id=27870817725883977&fcl=fsan1-2`

Meta publishes transport metadata and package/version compatibility but no
SHA-256 for these archives; the hashes above are local acquisition digests, not
vendor signatures. Both packages are governed by the Oculus SDK License at
`https://developers.meta.com/horizon/licenses/oculussdk/`.

Archive descriptor inspection confirms `MetaXR/OculusXR.uplugin` version
`1.205.0` and `MetaXRInteraction/OculusInteraction.uplugin` version `1.203.0`,
both declaring EngineVersion `5.7.0` and Win64/Android support. The Interaction
SDK descriptor marks the plugin experimental and requires Enhanced Input,
XRBase, OpenXR Hand Tracking and Niagara; that status is a release-risk gate,
not hidden or normalized away.

Acquisition does not prove plugin extraction, compilation, Meta account/App ID,
avatar entitlement, Quest packaging, installation, device launch, or Store
acceptance. Each remains a later exact-candidate gate.

<!-- [[OpenAI QA | Codex | 2026-08-30 | 05:42 UTC | END]] -->
