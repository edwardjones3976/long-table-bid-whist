<!-- [[Codex | GPT-5.6 | 2026-08-25 | RESEARCH | BEGIN]] -->
# Evidence packet — Perplexity plus Firecrawl

## Status and provenance

- **Purpose:** evidence first, before committee debate or implementation delegation.
- **Perplexity:** authenticated Pro session in the user's Chrome profile; public research only; no repository content, credentials, private paths, Slack data, or code were sent.
- **Perplexity session:** [research answer](https://www.perplexity.ai/search/43f77dec-e490-472f-b855-979035133d2e).
- **Firecrawl:** four independent, bounded searches with extracted source content. Search IDs:
  - Meta/platform evidence: `01a036f5-936a-75fd-b817-11413de4b2c6`
  - older-adult evidence: `01a036f5-974b-7142-a0b5-b8838093ab01`
  - music-rights evidence: `01a036f5-a11a-722e-bcb6-be70455de729`
  - comparable-products evidence: `01a036f5-9c37-7426-99f5-8595cdfd9d42`
- **Research boundary:** these sources inform design; none authorizes implementation, product claims, external publication, or legal conclusions.

The earlier Perplexity CLI packet marked `UNAVAILABLE` remains historically accurate for that failed CLI attempt. This Chrome session is the successful replacement evidence.

## Convergent findings

### 1. Build a seated table, not a traversable social world

Perplexity recommended a seated-first four-player private table with no artificial locomotion. Firecrawl independently found older-adult studies and reviews emphasizing the importance of lower physical demand, understandable interaction, manageable sensory load, and ongoing conversation. The design implication is a stable horizon, a locally adjustable table, close readable cards, and no reason to stand, bend, walk, or repeatedly turn.

Evidence:

- [Older adults' experiences and perceptions of immersive VR](https://pmc.ncbi.nlm.nih.gov/articles/PMC9768659/) (2022) documents both positive seated experiences and barriers including discomfort, disorientation, nausea, headset weight, anxiety, tracking problems, and confusing sound sources.
- [Key stakeholders' experiences and perceptions of VR](https://games.jmir.org/2022/4/e37228) (2022) supports bringing interaction to the person, reducing overload, keeping important objects visible, and providing clear feedback and assistance.
- [Social VR activities should support ongoing conversation](https://dl.acm.org/doi/fullHtml/10.1145/3677386.3682089) supports conversation as an activity in its own right rather than background noise around tasks.
- [A systematic review of older-adult participation in VR design](https://www.sciencedirect.com/science/article/pii/S2451958825002908) reinforces involving older adults in the design process rather than treating age as a single capability profile.

### 2. Controllers are the reliable baseline; hands are an equal convenience path

Perplexity recommended controller-first interaction with hand tracking as a convenience layer. Firecrawl verified Meta's own warning that hand tracking relies on headset cameras and has tracking challenges. Every consequential action therefore needs a low-fatigue, confirmable controller path; hands can support card pickup, menu selection, and expressive gestures without becoming the only way to bid or play.

Evidence:

- [Meta Hands Best Practices](https://developers.meta.com/horizon/design/hands-best-practices/) identifies camera tracking constraints and recommends early experimentation and deliberate interaction design.
- [Meta Horizon glossary](https://developers.meta.com/horizon/documentation/unity/glossary/) describes user-created Meta Avatars as persistent identity representations, supporting the decision not to add demographic player characters.

### 3. Local comfort can vary while the game state remains canonical

Comparable tabletop products support the pattern of a compact shared logical board with a locally placed or adjusted physical presentation. The table position, tilt, scale, card fan, and eye-level information can be personal comfort settings; bids, cards, tricks, and score remain a single authoritative game state.

Evidence:

- [Demeo hand tracking and MR](https://www.meta.com/blog/demeo-hand-tracking-mixed-reality-mr/) (2024-07-19) demonstrates a tabletop experience using hands and mixed reality.
- [Demeo](https://www.resolutiongames.com/demeo) demonstrates a four-player tabletop-centered social product.
- [Meta Group Presence](https://developers.meta.com/horizon/documentation/unity/ps-group-presence-overview/) provides destination, joinability, and session concepts suitable for future private-room entry.

### 4. Private hosting is a product role, not gameplay authority

Walkabout's private-room/host pattern and Meta's Group Presence model support a simple event flow: invite, join, seat, calibrate, play, and reconnect. They do not justify giving a host access to concealed cards or mutable game outcomes. A Human Host may manage invitations, seating, pacing, mute/remove, accessibility help, and between-hand substitution. The robot AI Dealer may deal, prompt legal flow, explain rules, and keep time. Neither may inspect or alter hidden information beyond the same legal projection available to the acting seat.

Evidence:

- [Walkabout Mini Golf resources](https://www.mightycoconut.com/wmg-resources) describes rooms of up to eight and the room creator as host.
- [Meta Group Presence](https://developers.meta.com/horizon/documentation/unity/ps-group-presence-overview/) describes destinations, joinable status, and session IDs.
- [Meta Code of Conduct for Virtual Experiences](https://www.meta.com/legal/quest/code-of-conduct-for-virtual-experiences/) supports explicit safety, dignity, authenticity, voice, and privacy expectations.

### 5. Spatial voice should serve conversation, not spectacle

Seat-positioned voices can make partners and opponents legible, but card play requires intelligibility. Use moderate spatial separation, a center-focused mix, captions for system speech, independent voice/effects/music controls, mute/block/leave/report controls, and no important rule state conveyed only by sound.

Evidence:

- [Meta modern VR design patterns](https://developers.meta.com/horizon/blog/lessons-from-the-frontlines-modern-vr-design-patterns/) states that spatialized audio can increase presence and that not all audio needs spatialization.
- [Bigscreen](https://www.bigscreenvr.com/software/) demonstrates spatial voice and public/private room patterns in a social VR product.

### 6. Cultural specificity belongs in hospitality and behavior—not caricature

Bid Whist's connection to Black American social culture is substantive, but the product should not manufacture a cast or reduce culture to decorative shorthand. Participants use their own Meta avatars. The room can express warmth through a serious long table, lived-in materials, deliberate pacing, welcoming host language, table etiquette, restrained color and light, and rights-clean original ambience. Cultural advisors and experienced players must judge the result; the research cannot certify authenticity by itself.

Evidence:

- [NPR, “Rise and Fly: The Story of Bid Whist”](https://www.npr.org/2005/12/26/5069913/rise-and-fly-the-story-of-bid-whist) (2005-12-26) describes the game's partnership play and African American cultural association.
- Meta's avatar documentation supports users' own persistent identities rather than assigned demographic characters.

### 7. Audio format never establishes music rights

Perplexity and Firecrawl converged on the legal boundary: a composition and a recording are separate works. MP3, WAV, OGG, streaming, upload, or “old” does not establish clearance. Bundled ambience must be original with signed provenance, CC0 with provenance, verified public-domain composition **and** recording, or separately licensed for the intended use. Host-provided music must remain an external/private-room feature with the host responsible for rights; the product should not ingest, redistribute, record, cache, normalize, or advertise clearance merely because playback is technically possible.

Evidence:

- [U.S. Copyright Office Circular 56A](https://www.copyright.gov/circs/circ56a.pdf) explains that musical compositions and sound recordings are separate works.
- [Copyright Office guidance for musicians](https://www.copyright.gov/engage/musicians/) repeats the two-work distinction.
- [CC0 1.0 Universal deed](https://creativecommons.org/publicdomain/zero/1.0/deed.en) describes the public-domain dedication and its jurisdictional limitation.
- [Meta Music Guidelines](https://www.meta.com/legal/quest/music-terms/) places responsibility for clearing posted music and other intellectual property on the user; this is not a product-side safe harbor.

## Concrete MVP decisions supported by the evidence

1. Four seated players, one stable table, one rules manifest, one complete deal-to-score hand.
2. User-created Meta avatars only; robot form only for the optional AI Dealer.
3. AI Dealer and Human Host are selectable, separate roles with an explicit permission matrix.
4. No artificial locomotion; local table height, distance, tilt, card scale, and text scale.
5. Controller-complete interaction, hand-tracking parity for common actions, and preview/confirm for consequential bids and plays.
6. Private invite/session model; no public lobby in the first milestone.
7. Native mute, block, leave, report, pause, and host remove controls; system prompts captioned.
8. Reconnection and AI substitution are designed as authoritative state transitions, not UI tricks.
9. No bundled copyrighted music in the prototype. Music defaults off. Rights-clean ambience requires a provenance ledger before inclusion.
10. Host music, if later allowed, stays external to the game stream and is clearly labeled as host-controlled and rights-dependent.

## Claims not established by this evidence

- The exact correct Bid Whist house rules for every audience.
- That a browser prototype proves Quest comfort, Meta Avatar integration, hand/controller parity, spatial voice, privacy, or networking.
- That a room name alone is secure access control.
- That host-provided music is legally cleared.
- That the room is culturally authentic without human review by experienced players and cultural advisors.
- That the target group is homogeneous; settings and human testing must cover ability, familiarity, and preference differences within ages 30–70.

## Committee questions

1. Should the first validated artifact be a browser interaction/rules proof, a Quest-native room slice, or a deliberately paired two-stage proof?
2. Which rules manifest is the named default, and which rule variations are explicitly deferred?
3. What exact powers belong to AI Dealer, Human Host, players, and the authoritative game service?
4. Which controls are required before any live social test?
5. What constitutes enough cultural and accessibility evidence to move beyond internal prototype status?
6. Which audio policy is enforceable in code and operations, not merely described in prose?

<!-- [[Codex | GPT-5.6 | 2026-08-25 | RESEARCH | END]] -->
