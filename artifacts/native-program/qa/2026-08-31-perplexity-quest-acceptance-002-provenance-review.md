# OpenAI provenance review — Perplexity Quest acceptance evidence

## Verdict

`ACCEPT_SEQUENCE_27_OVERALL_EFFORT_ONLY_RESEARCH_PARTIAL_OWNER_TRANSPORT_OVERRIDE_TWO_CLAIMS_REJECTED`

Perplexity completed one authenticated, bounded, public-only research request.
Its exact query matches the precommitted packet, its terminal response is useful,
and Firecrawl independently fetched all ten cited official URLs. The response
earns medium/5 overall-effort points and zero direct-production points.

This verdict does not accept a product byte, package, Quest run, privacy proof,
human result, Store result, First Deal milestone, merge or release. The raw
response remains provider evidence; OpenAI's normalized record is a separate
interpretation and does not silently repair the provider output.

## Frozen authority and transport

- Pre-dispatch control commit: `d753b9df0bfb1965d93f6ecdc29664f4799f6e8a`
- Pre-dispatch control tree: `ceb7fa03ed35832da7eaf1e6e15d2607d0e93646`
- Packet: `director/native-program/packets/LT-NATIVE-PERPLEXITY-QUEST-ACCEPTANCE-002.json`
- Final packet SHA-256: `9ff7fdd9558ca93125615dd542daaef8497786a94658b015e97635728786178f`
- Public-query SHA-256: `0b7014ef88d3a8b95fc47e5df75d732cf75d78c04cffac2e67b6f001c3284347`
- Transport: owner-authorized authenticated Perplexity surface in Chrome
- Conversation: `https://www.perplexity.ai/search/ff3ce4a6-7903-43e5-8a47-8596efcfd9d5`
- Visible terminal marker: `Finished`; visible steps: `4`
- Provider attempts: primary `1`, recovery `0`, revision `0`
- Model identity: `NOT_ESTABLISHED_IN_VISIBLE_SURFACE`
- Usage/cost: `NOT_ESTABLISHED_IN_VISIBLE_SURFACE`
- Repository or private context transmitted: no

The reusable Perplexity workflow normally requires the API Platform or Director
adapter and prohibits a personal browser session. The Director API profile was
checked before activation and remained disabled with an empty credential. The
owner had explicitly directed use of Perplexity, identified the authenticated
Chrome surface as available, directed browser fallback when other formats were
unavailable, and granted standing authority to complete provider actions. That
project-specific owner instruction is the governing transport override for this
assignment only. It does not relax public-only scope, privacy, retry, evidence,
budget, no-code or no-verdict controls.

No failing API submission was made. The exact query was staged in the browser,
read back, hashed, and matched byte-for-byte before a single Enter submission.
The resulting conversation URL changed from the transient `/search/new/...`
route to the terminal `/search/ff3ce4a6-...` route. No ambiguous resend occurred.

## Evidence binding

| Artifact | Bytes | SHA-256 | Result |
| --- | ---: | --- | --- |
| Raw Perplexity main-surface text | 32,431 | `24c4f0b15542c87ed46f6cce83d2b912f33cea8e5fed2b01e209858310706225` | Exact public query, terminal answer and public source labels only; no sidebar/account/history capture |
| Browser receipt | 2,360 | `59ce223ad37562f3b50ae6903ef71144f0893789140212050cb645f8e9e56e3d` | Exact conversation ID, capture time, query match, response digest and ten allowlisted official URLs |
| Firecrawl verification manifest | 6,730 | `5817cffbe3e6d1600444d85fbaf79b273917abc0e4a52e5e1da048256324d739` | Ten of ten official URLs fetched with HTTP 200; provider's conflicting seven-source sentence rejected |
| OpenAI normalized research | 8,866 | `4f5a04e8ff4ec559b084b59c490c588965838c091c11488e2f0c4fd2ed8fcedb` | Accepted test-design implications, two rejected claims and explicit proof limits |

## Independent claim review

`PASS`:

- Epic's current Android requirements page contains the UE 5.7, recommended
  SDK 35 and NDK r27c row. The same page exposes build-tools 35.0.1 and OpenJDK
  21.0.3 for the current Android generation.
- Meta's compositor page contains the layer-overlay commands,
  `CompositorClient` and property-log paths, `adb logcat -s VrApi`, the
  `TW/App/GD/CPU&GPU/LCnt/LM` example, the continued OpenXR log-tag note after
  VrApi deprecation, and the 16 compositor-layer rendering limit.
- Meta's ADB-driver page states that its drivers are required when using ADB
  with Android-based Quest devices.
- Khronos hosts the official OpenXR 1.1 API reference. The provider correctly
  refuses to turn this API reference into Quest-specific controller, hand,
  haptic or spatial-audio acceptance thresholds.
- Android documents apksigner certificate output, general dumpsys syntax,
  adb bugreport, batterystats reset/dump, TalkBack/manual testing and user
  testing.

`REJECT_TWO_CLAIMS`:

- Firecrawl fetched Meta's native Code Samples catalog, but the retrieved page
  contained none of the provider's claimed `Perfetto`, `ADB` or `performance`
  catalog terms. The M2 source description is not accepted and cannot support
  thermal or profiling claims.
- The raw response says it uses seven official primary sources, while its own
  M1–M3, E1, K1 and A1–A5 table, the browser receipt and the Firecrawl manifest
  contain ten unique official URLs. The numeric seven-source sentence is
  rejected as an internal contradiction; the verified ten-source set remains.

`BOUNDARY_ACCEPTED`:

- Artifact hashing, uncut videos, run ledgers, participant sheets, synchronized
  two-headset capture and truth-ledger procedures are sensible Director test
  requirements. They are not official Meta/Epic/Khronos/Android certification
  methods. The provider repeatedly labels them project-defined and marks absent
  official thresholds `NOT ESTABLISHED`.
- Compositor-layer diagnostics can show submitted layers and transforms; they
  cannot prove semantic table detection, durable anchor recovery or physical
  drift accuracy.
- A clean observed two-headset matrix supports only "no wrong-player exposure
  was observed in the retained scenarios." Structural service tests and threat
  review remain necessary; universal secrecy is not established.

## Workload accounting

The immutable assignment size is medium/5. A real terminal provider execution
occurred, so sequence 27 enters the overall-effort ledger once. Perplexity
authored no product code and receives zero direct-production points.

Sequence 26 earned zero and never entered the window. Sequence 27 rolls out the
oldest credited row, sequence 2 `LT-NATIVE-ANTIGRAVITY-001` long/8, and adds
Perplexity medium/5:

| Provider | Points | Share | Normal band | Hard ceiling | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Claude | 30 | 36.1446% | 33–39% | 41% | normal pass |
| Cursor | 20 | 24.0964% | 17–23% | 25% | above normal by 1.0964; hard pass |
| Grok | 18 | 21.6867% | 17–23% | 25% | normal pass |
| OpenAI | 5 | 6.0241% | 5–11% | 13% | normal pass; QA only |
| Antigravity | 4 | 4.8193% | 8–14% | 16% | below normal; hard pass; route closed |
| Perplexity | 5 | 6.0241% | 1–7% | 9% | normal pass; research only |
| GitHub Copilot CLI | 1 | 1.2048% | 0–4% | 6% | normal pass |

Total: 83. Every target-plus-five ceiling passes. This is not mislabeled as
full normal-band compliance because Cursor and Antigravity miss normal.

## Next legal coding route

The historical phrase "sequence-27 medium RobotDealer fallback" was a denied
projection after sequence 26, not a credited assignment. Actual sequence 27 is
this Perplexity research assignment.

After sequence 27 closes, a fresh sequence 28 Claude medium/5 assignment would
roll out sequence 3 Claude long/8. The prospective window is 80 points:
Claude 27/80 = 33.75%, Cursor 20/80 = 25%, Grok 18/80 = 22.5%, OpenAI 5/80 =
6.25%, Antigravity 4/80 = 5%, Perplexity 5/80 = 6.25%, and GitHub Copilot CLI
1/80 = 1.25%. Every hard ceiling passes; Cursor is exactly at its 25% hard
ceiling and must not be rounded below it.

Claude is therefore workload-eligible for one fresh, clean-room, medium/5
RobotDealer assignment after the ledger update is committed. It is not a retry
of sequence 25 and may receive only the frozen public contract, synthetic
fixtures and fresh authority—not sequence-25/26 source, transcripts, findings,
quarantined bytes or other provider implementation. OpenAI remains QA-only.

The First Deal remains unachieved. XR, RobotDealer, native card/table/room
presentation, Android package, physical Quest, second-human/two-headset,
performance, accessibility, cultural, rights and owner gates are still open.
