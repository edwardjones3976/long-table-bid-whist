# The Long Table — grand rebaseline evidence packet

**Status:** research packet for committee use; not a product verdict  
**Retrieved:** 2026-08-29  
**Decision informed:** whether the flagship should be a native Quest app, a Meta Horizon World, or a staged hybrid

## Method and boundaries

- Firecrawl was used for four bounded searches covering native Quest development, Horizon Worlds, Quest card-table interaction, and social/event strategy.
- An existing fresh Perplexity research session from 2026-08-24 was reused instead of issuing a duplicate paid query. Perplexity supplies research only and has no vote.
- Official Meta documentation is treated as primary platform evidence. Product pages and research sources supply comparator or accessibility context, not proof of Meta platform behavior.
- No desktop, simulator, or browser result is accepted as physical Quest 3 hand-tracking, controller, haptics, passthrough, comfort, or performance evidence.

## Firecrawl evidence artifacts

- `.firecrawl/long-table-2026-08-29-meta-native.json`
- `.firecrawl/long-table-2026-08-29-horizon-worlds.json`
- `.firecrawl/long-table-2026-08-29-quest-card-ux-competition.json`
- `.firecrawl/long-table-2026-08-29-social-events-strategy.json`

## Perplexity evidence reused

- Session: https://www.perplexity.ai/search/43f77dec-e490-472f-b855-979035133d2e
- Scope: seated social VR/MR Bid Whist for Meta Quest, adults 30–70, controllers/hands, avatars, hosting, hidden information, moderation, accessibility, audio, onboarding, reconnection, cultural restraint, and music rights.
- Freshness: five days old at reuse. Platform claims must still be verified against current official documentation before implementation.

## Findings shared with every committee member

### 1. Native Quest can support the intended embodied interaction

- Meta's current Unity Interaction SDK supports controller and physical-hand interactions including grab, release, snap, poke, ray, pose, and gesture detection. Meta documents OpenXR hand skeleton support and Unity XR/OpenXR setup.
- Meta's Unity SDK family separately exposes spatial audio, haptics, Platform services, Mixed Reality Utility Kit, simulator, and core interaction packages. Meta recommends installing only the SDKs a project needs for long-term development.
- Quest 3 mixed-reality capabilities include color passthrough, scene understanding, and spatial anchors. Meta frames passthrough as a way to reduce first-use friction by keeping users connected to their physical environment.
- The Meta XR Simulator is useful for early OpenXR development but cannot validate optical tracking reliability, controller feel, haptics, passthrough alignment, thermal behavior, battery, or seated comfort.

Primary sources:

- https://developers.meta.com/horizon/documentation/unity/unity-isdk-interaction-sdk-overview/
- https://developers.meta.com/horizon/documentation/unity/unity-isdk-getting-started-unityxr/
- https://developers.meta.com/horizon/documentation/unity/unity-sdks-overview/
- https://developers.meta.com/horizon/documentation/unity/xrsim-intro/
- https://developers.meta.com/horizon/blog/building-mixed-reality-MR-meta-quest-3-connect-developers-presence-platform/

### 2. Horizon Worlds is strong for reach and social discovery, but flagship parity is unproven

- Meta promotes Worlds for in-headset, mobile, and web reach, social play, live events, creator monetization, and rapid iteration.
- The Worlds desktop editor and TypeScript tooling can add interactivity and animations; published worlds can be exposed on mobile and web.
- The collected official material did not establish the exact low-level card manipulation, custom controller haptics, concealed-hand authority, shared-anchor control, avatar integration control, or performance guarantees required for a serious competitive card table.

Primary sources:

- https://developers.meta.com/horizon-worlds/support/
- https://developers.meta.com/horizon-worlds/programs/
- https://developers.meta.com/horizon/blog/worlds/new-tools-incentives-creators-mobile-worlds/
- https://developers.meta.com/horizon/essentials/what-you-can-build/

### 3. The closest tabletop comparator validates tactile cards and MR, not a flat XR panel

- Demeo supports up to four friends around a tabletop. Its hand-tracking/MR update lets players pick up figures, manually play cards, and throw dice.
- Demeo added a dedicated hand-tracking tutorial and help page rather than assuming direct manipulation was self-explanatory.
- This supports a product hypothesis: the first impressive moment should be a believable physical deal and hand fan, with controllers retained for precision, accessibility, and haptic confirmation.

Sources:

- https://www.meta.com/blog/demeo-hand-tracking-mixed-reality-mr/
- https://www.resolutiongames.com/demeo

### 4. Social retention comes from a legible gathering, not endless content production

- Meta's social-play guidance emphasizes frictionless entry, spaces where newcomers can observe before participating, community mentorship, user-generated activity, and competitive/social features.
- For this project, the analogous pattern is an arrival lounge or observation rail, a practice table, hosted club nights, teaching tables, and visible public ceremony around private authoritative matches.
- A private table still needs mute, block, report, leave, host-transfer, reconnect, and role-scoped moderation. Private must not mean unmoderated or technically opaque.

Primary source:

- https://developers.meta.com/horizon/blog/how-vr-studios-can-boost-retention-and-revenue-through-social-play/

### 5. Adults 30–70 need seated-first multimodal design

Perplexity's evidence synthesis, supported by Meta guidance and older-adult VR research, identified headset weight, discomfort, disorientation, tracking problems, nausea, confusing sound sources, sensory overload, and unclear interactions as material barriers. The resulting baseline is:

- no required locomotion;
- adjustable table height, distance, tilt, card scale, and text scale;
- all actions available through hands and controllers, with one-controller and one-hand paths where possible;
- large high-contrast cards with color-independent suit cues;
- redundant visual, audio, and controller-haptic feedback;
- captions, per-person voice controls, reduced-motion/low-stimulation mode, and a visible leave/pause control;
- a short solo first-deal tutorial before social exposure;
- tracking-loss recovery that returns an uncommitted card safely rather than committing or duplicating it.

Sources:

- https://developers.meta.com/horizon/design/hands-best-practices/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC9768659/
- https://games.jmir.org/2022/4/e37228

### 6. Identity, hosting, concealed state, and music need structural boundaries

- Human participants should use their own supported Meta character/avatar representation. The game adds no demographic stock cast. The AI dealer is clearly robotic.
- AI Dealer and Human Host are separate operational roles. A host may seat, invite, pause, announce, moderate, and transfer host authority, but cannot see concealed hands or change shuffle, bids, cards, tricks, or score.
- Concealed information must be structurally separated: each client receives only its own hand plus an allowlisted public projection. CSS hiding, client-side secrecy, and regex/blacklist privacy filtering are not acceptable boundaries.
- Shipped music must have documented composition and recording rights: commissioned/original, verified CC0, verified public-domain composition plus recording, or an explicit interactive-game license. A file format does not clear rights.
- Host music remains external and private. The product does not ingest, upload, record, cache, synchronize, stream, analyze, or rebroadcast it.

Sources:

- https://developers.meta.com/horizon/documentation/unity/ps-group-presence-overview/
- https://www.meta.com/legal/quest/code-of-conduct-for-virtual-experiences/
- https://www.copyright.gov/engage/musicians/
- https://www.meta.com/legal/quest/music-terms/

## Material contradictions and unknowns

1. Perplexity's earlier MVP recommendation was controller-first with hands optional. The owner's current direction requires controller/hand-tracking-focused capability. The committee must decide whether the correct resolution is co-equal multimodal input or a hands-first emotional hero with controller reliability parity.
2. Native gives the most interaction and privacy control, but it carries the greatest engineering, store, device-test, and live-service burden.
3. Horizon Worlds may be the fastest social acquisition surface, but official parity evidence for this exact card-table requirement is missing.
4. Meta Avatar support must be confirmed against the current SDK lifecycle, policy, entitlement, and submission requirements before it becomes a production dependency.
5. The current WebXR prototype proves typed rules and XR intent plumbing, not embodied presence. It may remain valuable as a tutorial, host console, spectator-safe public view, and instant demo.

## Neutral decision question

Which product shape can deliver a mind-blowing, trustworthy, accessible, hostable Bid Whist gathering on Quest 3 without dividing the team across three incomplete products?

Options:

- **A — Native Quest flagship:** native app is the product; WebXR is retired or internal only.
- **B — Horizon World flagship:** build the game and events inside Worlds; native work is avoided.
- **C — Staged hybrid:** native Quest flagship, Horizon clubhouse/discovery surface only after a parity spike, and WebXR companion/tutorial/host/spectator surfaces.

Evaluation weights:

| Criterion | Weight |
| --- | ---: |
| Embodied hand/controller delight | 25 |
| Social presence and event hosting | 20 |
| Competitive integrity and concealed-state control | 15 |
| Accessibility and comfort for ages 30–70 | 10 |
| Discovery and low-friction entry | 10 |
| Delivery feasibility and testability | 10 |
| Safety, moderation, privacy, and rights | 10 |

## Committee evidence rule

Every position must distinguish confirmed fact, inference, hypothesis, and unknown. Provider consensus cannot replace physical Quest 3 testing, experienced Bid Whist review, target-audience accessibility testing, event-host testing, cultural review, or owner acceptance.
