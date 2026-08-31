<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:00 UTC | BEGIN]] -->
# First Deal exact-state gap audit — `LT-NATIVE-OPENAI-FIRST-DEAL-GAP-001`

## Verdict

`OPENAI_CHANGES_REQUIRED_FIRST_DEAL_NOT_ACHIEVED`

The accepted native foundation is a valid dependency, not the native **First
Deal** milestone. The exact product candidate is clean commit
`4d26680fb99abacb20ecb18807b7c8833646cfa3`, tree
`1e0db56f1e85d66c93ab64bc3dca8c237947c210`. The exact Director control head
at audit start is clean, pushed commit
`44f36d98d2e2b5e80f2c9981522cd7dcdd8a2365`.

The earlier browser/WebXR Stage 1 remains a reference/kernel harness. It cannot
satisfy the rebaselined native Stage 1 because its acceptance excluded Quest
Android/OpenXR, optical hands, Touch controllers, device comfort/performance,
Meta presence, authoritative hosting and physical-device evidence.

## Requirement audit

| First Deal requirement | Current exact evidence | Disposition |
| --- | --- | --- |
| Deterministic rules, typed intents and role-bound projections | `219/219` full LF tests, both UE5.7 Windows targets and `34/34` Unreal automation passed for `4d26680`; separate player/host/public/dealer closed schemas remain in the accepted foundation | **PROVEN AT CODE GATE** |
| Controller and optical-hand parity | Exact candidate has no `Unreal/Plugins/**`, no native input map and no XR dependency. Cursor candidate `33aca610` is terminal unaccepted after `9/10` focused XR tests | **MISSING** |
| Live modality switching, haptics and tracking-loss recovery | No accepted adapter or device result | **MISSING** |
| 13-card fan, sort, inspect, bid preview/cancel/confirm, play, gather and score ceremony | Service/rules flow exists, but exact candidate has no native card/table presentation | **MISSING NATIVE SURFACE** |
| Original VR room and MR Table Anywhere | Exact candidate ships no `Unreal/Content/**`, map, passthrough, placement or anchor-recovery implementation | **MISSING** |
| Robot dealer | Closed public dealer-cue protocol and thin Blueprint presenter exist; no visible robot, choreography, animation, queue/pause/replay defense or spatial presentation exists | **PARTIAL SEAM ONLY** |
| Human host option | Closed host commands and privacy boundary exist; no native event-host surface exists | **PARTIAL SEAM ONLY** |
| Current Meta-character viability and neutral fallback | No Meta XR/Interaction SDK, presence adapter, pawn or seat representation exists. Owner direction requires the signed-in participant's character when viable and never a stock cast member | **MISSING; VIABILITY GATE OPEN** |
| Second connected human and concealed-state proof | Service-level projections pass; no two-device/two-headset counterfactual evidence exists | **DEVICE PROOF MISSING** |
| Seated calibration, scale/readability, left/right, one-hand/controller, captions and reduced effects | No accepted native surface | **MISSING** |
| Rights-clean audio and external host music boundary | No music/recording is bundled and host music remains external/off | **SAFE BY ABSENCE; SPATIAL CUES MISSING** |
| Android package/install/launch | Host SDK 35, NDK r27c, build-tools 35.0.1 and project JDK are present, but project target remains 32 and no package exists | **MISSING** |
| Physical Quest 3 exit gate | `adb devices -l` returned no connected device at `2026-08-31T04:00Z`; no uncut hands/controllers, MR/VR, haptics, comfort or two-headset evidence exists | **BLOCKING EXTERNAL GATE OPEN** |

## Frozen milestone interpretation

The roadmap and current committee record disagree on one trick versus one
complete deal, and on required MR placement versus optional MR with quiet VR
fallback. Acceptance uses the stricter union until a later explicit Director
supersession:

1. complete one native restricted-rules deal, not merely one trick;
2. prove a complete VR path;
3. prove MR placement and anchor recovery when available, plus quiet VR fallback
   when MR permission, room data, passthrough or anchors are unavailable;
4. prove one seated human plus robot dealer and a second connected human;
5. prove optical hands, Touch controllers and live switching on the unchanged
   candidate;
6. record the Meta-character lifecycle decision and neutral fallback;
7. bind uncut device, privacy, comfort, different-provider review and owner
   checkpoint evidence to the exact candidate.

Stage 2 work remains excluded: no full public game, open matchmaking, playable
Horizon World, multi-table event, monetization, user-music integration or store
launch.

## Smallest legal implementation sequence

1. New one-file Grok fallback repairs only the frozen Cursor XR test oracle and
   adds the missing above-maximum generation coverage; production XR bytes stay
   immutable.
2. OpenAI freezes and tests the exact result, then mechanically composes accepted
   Cursor/Grok XR bytes onto accepted product base `4d26680`.
3. Use only workload-eligible, non-overlapping lanes for robot presentation,
   native table/room composition, Android/XR configuration and device tooling.
4. Freeze one exact combined candidate and run the full code/build/package gate.
5. Stop at the physical Quest/human gate unless unchanged-candidate evidence is
   actually supplied; never infer it from simulator, browser, Windows or CI.

## Workload treatment

This is one real OpenAI medium/5 overall-effort QA assignment and zero direct
production. It derives the milestone requirements, inspects the exact current
candidate and changes the next legal route. It is not filler, implementation
credit or self-acceptance.

<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:00 UTC | END]] -->
