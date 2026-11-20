# The Long Table — Director conclusion

## Status: `RESHAPED`

The current WebXR candidate is a useful rules/interaction laboratory. It is not the product the owner described. The product is now reshaped as:

> **A native Quest flagship that feels like a living social world: arrive as yourself, sit at a believable table, and play Bid Whist with people you care about using your hands or controllers.**

The technology decision is native-first. The product decision is world-scale hospitality. These are not the same thing.

## Ruling

Adopt **C-narrow: a native Quest flagship with strictly gated companion surfaces**.

1. **Native Quest app is the sole flagship and sole authoritative game.**
2. **The existing WebXR build freezes as a reference/kernel harness.** It may later become a tutorial, host console, no-headset demo, or public spectator projection only if it has zero gameplay adjudication, zero concealed data, and a hard attention cap.
3. **A Horizon World is not approved as a game.** After the private-game-night alpha succeeds, a bounded spike may test discovery, events, identity continuity, and a one-click handoff into the native app. Failure drops the World; success may justify a clubhouse/front porch, not a second card table.
4. **Grok's A dissent becomes a scope guard.** If companions displace native milestones, duplicate rules, receive concealed state, split matchmaking, or create a second host workflow, the plan collapses to A immediately.

## Why B is rejected

Worlds offers social reach, live-event visibility, TypeScript tooling, mobile/web entry, and creator infrastructure. Current official evidence does not establish the fine-grained hand/controller interaction, custom haptics, concealed-state authority, host-role guarantees, shared-anchor control, or performance needed by this table. A flagship cannot be built on unproven parity.

## Product pillars

1. **The table is the interface.** Reach, lift, fan, sort, inspect, bid, preview, commit, and gather—not ray-clicking flat panels.
2. **Hands create wonder; controllers create certainty.** Both are first-class and switchable without restarting or changing rules.
3. **Authored physicality, deterministic truth.** Cards can flutter and snap; physics never decides legality, ownership, or score.
4. **Presence without casting.** Human players use their own supported Meta character/avatar. No demographic stock cast is created.
5. **A hostable house night.** Private games, teaching tables, club nights, leagues, reunions, and multi-table events are first-class workflows.
6. **Robot steward, not cultural impersonator.** The dealer is warm, legible, mechanical, and never performs a human cultural identity. The rules engine—not generative behavior—owns the game.
7. **Comfort and dignity before spectacle.** Seated, calm, readable, multimodal, and useful to adults 30–70. The “mind-blowing” quality comes from presence and tactile magic.

## Signature moments

- **Table Anywhere:** in MR, felt, brass, cards, and robot steward settle onto the player's real table.
- **The House:** in VR, the player enters a warm arrival room, sees event tables, and joins friends at a private table.
- **The first deal:** the robot shuffles and deals; controllers feel restrained haptic beats while bare hands see responsive card contact.
- **The hand fan:** two-hand natural fan, one-hand assisted fan, automatic sort, tilt-to-read, and structural privacy.
- **The bid:** a physical bid plaque/dial with preview and deliberate commit; optional voice shortcut never becomes the sole input.
- **The trick:** cards snap to the center with spatial sound and haptic/visual confirmation; the book gathers to the correct team.
- **The featured table:** a human host runs a public ceremony around a private authoritative match while spectators receive public state only.

## Architecture boundary

```text
Authoritative game service
├── deterministic Bid Whist rules, scoring, shuffle, seats, teams
├── concealed-hand ownership and structural per-role projections
├── AI-dealer state machine and human-host permissions
└── reconnect, event, audit, and moderation state

Native Quest client
├── Unity/OpenXR + Meta XR Interaction SDK
├── hands/controllers + haptics + spatial audio
├── avatar bridge behind a fallback interface
├── immersive Long Table House
└── mixed-reality Table Anywhere

Gated companions
├── WebXR tutorial/demo/host/public spectator projection
└── Horizon clubhouse/discovery/deep-link surface after a pass gate
```

The existing TypeScript rules kernel, typed intents, preview/cancel/confirm path, idempotent input IDs, rejection vocabulary, and structural projection rules are preserved as assets. Native presentation does not reimplement game truth in physics or UI code.

## Critical platform gate: Meta Avatars

Firecrawl verified the current official Meta package page on 2026-08-29: Meta Avatars SDK `40.0.1` is the final release and is at End-of-Feature status. Meta says existing integrations and backend services continue to operate and developers may keep building and submitting apps, but no further SDK versions, features, or APIs are planned.

Therefore:

- own-Meta-character support is a **viability spike**, not an assumed dependency;
- the avatar bridge must have a fallback representation (tracked hands/controllers, nameplate, neutral seat presence) that adds no stock demographic cast;
- failure or unacceptable lifecycle risk triggers an owner decision between the fallback, a supported successor, or a deeper Horizon identity strategy before production environments expand.

Official source: https://developers.meta.com/horizon/downloads/package/meta-avatars-sdk/

## Safety, privacy, culture, and music

- Concealed state is enforced with typed, structurally allowlisted projections. Regex/blacklist privacy controls are prohibited.
- Voice recording is off by default; mute, block, report, leave, per-person volume, host transfer, and clear microphone state are baseline.
- Human hosts cannot see concealed cards or alter shuffle, bids, tricks, or score.
- The spirit of the game lives lightly in hospitality, room materials, pacing, table seriousness, and social energy—not bodies, dialect, costume, caricature, canned gestures, or invented rituals.
- Cultural acceptance requires compensated human advisors from the intended community; providers cannot approve authenticity.
- Shipped music requires documented composition and recording rights. Host music remains external/private and is never ingested, recorded, cached, synchronized, streamed, analyzed, or rebroadcast.

## Counter-bias check

The committee was structurally biased toward C because it sounds like it preserves every option. Grok's A case exposed the actual risk: a hybrid can be three unfinished products with two front doors and more leakage surfaces. The ruling keeps C only because its companions have hard kill conditions and no authority. If those boundaries cannot be enforced in work logs, module dependencies, and projection schemas, the ruling automatically becomes A.

## Not done and not implied

No native app, World, multiplayer service, avatar integration, physical-hand prototype, store submission, cultural acceptance, rights clearance, deployment, merge, or owner acceptance was completed by this committee. The current browser PR remains a frozen draft candidate, not the new flagship implementation.
