# Quest interaction and two-device public evidence packet

- Provider: Perplexity
- Assignment ID: `LT-NATIVE-PERPLEXITY-QUEST-INTERACTION-EVIDENCE-002`
- Provider request ID: `fd4478d4-0734-4370-9b1b-ec7921da5143`
- API surface: official Perplexity Search API, `POST /search`
- Query digest: `sha256:63331b9a6f0542040948642fe1adfe914e51107afcd7bd75b45254819100328f`
- Scope: four unresolved public evidence areas only—feedback/haptics, spatial audio, seated accessibility/modality switching, and two-headset concealed-state validation
- Freshness window: prefer official pages updated within 18 months of 2026-08-30
- Retrieved at: `2026-08-31T01:44:43.9548016Z`
- Attempts: one provider request; no provider retry, revision, browser transport or polling
- Status: **INCOMPLETE**

The exact public query and limits are frozen in
`director/native-program/packets/LT-NATIVE-PERPLEXITY-QUEST-INTERACTION-EVIDENCE-002.json`.
Perplexity received no repository name, path, URL, source, SHA, credential,
provider output, Slack content, user data or decision authority.

## Findings

### Controller and hand-tracking switching

**Claim:** Meta's current VRC requires an application that advertises hand
tracking to respect switching between hands and controllers. The same VRC
requires submitted metadata to match supported play and input modes.

- Supporting source: [Meta Quest VRC guidelines](https://developers.meta.com/horizon/resources/publish-quest-req/)
- Independent verification: Firecrawl HTTP 200, scrape
  `01a0557e-a8ae-7690-b589-db72a32b6fd0`
- Confidence: high
- Caveat: this is a behavioral acceptance requirement, not proof that any
  current candidate implements transactional cancellation or preserves state.

**Claim:** Meta's Unreal OpenXR guidance requires the Epic OpenXR Hand Tracking
plugin and describes separate motion-controller components for hands and
controllers, with visibility toggled from hand-tracking state.

- Supporting source: [Choosing an OpenXR Backend](https://developers.meta.com/horizon/documentation/unreal/unreal-openxr/)
- Independent verification: Firecrawl HTTP 200, scrape
  `01a0557e-c856-758d-9c45-1e1b505334e9`
- Confidence: high for the documented setup; not evidence that the project has
  installed or enabled the required platform/plugin components.

### Accessibility and seated use

**Claim:** Meta's VRC recommends that applications remain playable without
audio, combine visual/audio/haptic feedback where possible, support one-hand or
one-controller use, avoid color-only distinctions, support view rotation, and
provide fixed-position access when both sitting and standing are supported.

- Supporting source: [Meta Quest VRC guidelines](https://developers.meta.com/horizon/resources/publish-quest-req/)
- Independent verification: Firecrawl scrape
  `01a0557e-a8ae-7690-b589-db72a32b6fd0`
- Confidence: high
- Caveat: the returned official pages do not establish exact thresholds for
  reach, interaction scale, text scale or reduced motion. Those remain
  project-level acceptance criteria and require physical human validation.

### Spatial audio and haptic feedback

**Claim:** Meta's current VRC recommends 3D audio spatialization but does not
make it mandatory. Its accessibility guidance recommends haptic feedback as one
possible feedback channel.

- Supporting source: [Meta Quest VRC guidelines](https://developers.meta.com/horizon/resources/publish-quest-req/)
- Independent verification: Firecrawl scrape
  `01a0557e-a8ae-7690-b589-db72a32b6fd0`
- Confidence: high for the VRC wording
- Contradiction/gap: neither Perplexity nor the verified pages established a
  controlling UE5.7 haptics API, a hand-only haptic substitute, a controlling
  Unreal spatial-audio integration path, or objective pass thresholds. These
  are **NOT ESTABLISHED** and cannot be converted into implementation claims.

### On-device performance

Perplexity returned Meta's Unreal performance-analysis page and current VRC
performance requirements. Firecrawl confirmed the official page resolves with
HTTP 200, but the targeted extraction returned no direct text for the four
requested gaps. Earlier project evidence may be reused only under its own
digest; this packet makes no new performance pass claim.

- Source: [Testing and Performance Analysis](https://developers.meta.com/horizon/documentation/unreal/unreal-debug-android/)
- Firecrawl scrape: `01a0557e-8e02-758c-86e8-a1fcb0fc5bff`
- Confidence: page identity high; requested-gap evidence absent

### Two-headset concealed-state validation

Perplexity found an official Meta multi-user mixed-reality overview, but no
official source in the bounded result defined a two-headset procedure that
proves each client receives only its own concealed card state across reconnect
and role changes. This is **NOT ESTABLISHED** as a platform-supplied test.

The product must therefore retain its own closed-schema, counterfactual
projection and two-device evidence contract. That conclusion is OpenAI's
inference from missing official evidence, not a Perplexity verdict.

## Source matrix

| URL | Publisher/type | Use | Verification |
|---|---|---|---|
| https://developers.meta.com/horizon/resources/publish-quest-req/ | Meta official requirements | Direct switching, accessibility, audio and tracking requirements | Firecrawl HTTP 200; accepted |
| https://developers.meta.com/horizon/documentation/unreal/unreal-openxr/ | Meta official Unreal documentation | Direct OpenXR hand/controller setup | Firecrawl HTTP 200; accepted |
| https://developers.meta.com/horizon/documentation/unreal/unreal-debug-android/ | Meta official Unreal documentation | Performance page identity only | Firecrawl HTTP 200; no targeted extract |
| https://developers.meta.com/horizon/documentation/unreal/unreal-engine/ | Meta official documentation hub | Discovery only | Not used for a claim |
| https://developers.meta.com/horizon/release-notes/ | Meta official release notes | XR Operator discovery only | Not used for a claim |
| https://developers.meta.com/horizon/documentation/unreal/unreal-reference/ | Meta legacy-reference hub | Discovery only | Not used for a claim |
| https://developers.meta.com/horizon/documentation/unreal/ | Meta official documentation hub | Discovery only | Not used for a claim |
| https://developers.meta.com/horizon/blog/building-mixed-reality-MR-meta-quest-3-connect-developers-presence-platform/ | Meta official blog | Multi-user discovery only | Not used for concealment proof |
| https://developers.meta.com/horizon/blog/start-developing-Meta-Quest-3-tips-performance-mixed-reality/ | Meta official blog | Performance-tool discovery only | Not used for a claim |
| https://www.strayspark.studio/blog/vr-game-development-meta-quest-ue5-2026 | Third-party tutorial | Prohibited by exact query | Excluded completely |

## Unavailable evidence

- Exact UE5.7 haptics API and controller-to-hand feedback-equivalence contract
- Exact supported spatial-audio plugin/API path and measurable device threshold
- Official thresholds for reach, interaction scale, text scale and reduced motion
- Platform-provided concealed-state or two-headset reconnect/role-change test
- Evidence that any current project candidate implements or passes these items

## Usage and authority

- Provider results: 10
- Accepted official discovery results: 9
- Excluded results: 1 third-party tutorial
- Provider-reported cost: unavailable; packet ceiling `$0.25`
- Provider retries/revisions: 0
- Firecrawl: one pre-fetch unsupported-ZDR failure and one successful recovery;
  15 credits used across three public official pages
- Overall-effort credit: medium / 5 once
- Direct-production credit: 0

Perplexity did not vote, review code, choose a product direction, write a
repository, contact Slack or issue an acceptance verdict. OpenAI independently
filtered and verified the evidence. The incomplete areas remain fail-closed.
