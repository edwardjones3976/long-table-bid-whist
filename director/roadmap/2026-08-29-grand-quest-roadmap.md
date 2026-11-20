# The Long Table — grand Quest roadmap

**Direction:** native Quest flagship; living social world as the experience; gated WebXR/Horizon companions  
**Planning estimates:** ranges, not commitments  
**Implementation status:** not started

## Stage 1 — The First Deal

**Objective:** prove, on physical Quest 3 hardware, that The Long Table can create one unforgettable seated deal using hands and controllers.

**Estimated shape:** 6–8 weeks after the native toolchain and physical devices are available.

### Product slice

- One seated human plus the robot dealer; one second human connection is added before the stage closes so social presence is tested rather than inferred.
- One original immersive room and one MR `Table Anywhere` mode.
- Own-Meta-character viability spike plus the non-stock fallback representation.
- Deal, hand fan, sort, inspect, bid, preview, cancel, commit, play one trick, gather the book, and score ceremony.
- Seamless switching between optical hands and Touch controllers.
- Controller haptics and strong visual/spatial-audio confirmation for bare hands.
- Seated calibration, adjustable table/card/text scale, left/right parity, one-hand and one-controller paths, captions, reduced effects, and tracking-loss recovery.
- Existing typed rules kernel and projection boundary preserved behind one authority interface.

### Small falsification spikes

1. **Avatar viability:** signed-in user's current Meta avatar/character, hands/controllers, two-user synchronization, current policy/submission requirements, fallback proof.
2. **Embodied card:** 13-card fan, hand grab, controller grab, magnetic preview zone, deliberate commit, sort, deal, tracking-loss recovery, haptics/audio.
3. **Concealed state:** authoritative host plus adversarial clients; no foreign card identity ever reaches another player, spectator, or host.
4. **Comfort:** adults across the target age range complete a 15–30 minute seated flow without required locomotion, accidental commits, or unreadable cards.

### Exit gate

- Physical Quest 3 uncut evidence for hands and controllers.
- No stuck, duplicated, prematurely committed, or foreign cards.
- Input switching without reload or state loss.
- Intended users describe the interaction as a physical/social table, not a floating website.
- Avatar decision recorded with lifecycle evidence and fallback.
- Different-provider interaction review and owner checkpoint.

### Explicit non-goals

No full public game, open matchmaking, playable Horizon World, multi-table event, companion feature expansion, monetization, user music, or store launch.

## Stage 2 — Private Game Night Alpha

**Objective:** let a real human host run a complete private four-player Bid Whist night without developer intervention.

**Estimated shape:** 12–16 weeks after Stage 1 acceptance.

### Product slice

- Complete reviewed Bid Whist rules and selected house-rule manifest.
- Four-human authoritative multiplayer with reconnect, between-hand AI substitute, host transfer, and safe resume.
- Spatial voice with captions, per-person volume, mute, block, report, leave, and clear microphone state.
- AI Dealer modes: quiet expert, standard, and beginner teaching.
- Human Host modes: playing host and non-playing floor host.
- Private invitations, non-guessable table identity, seats/teams, round start/pause/break, announcements, between-hand substitution, and logged moderation.
- Host role contains no concealed-hand field and cannot alter game truth.
- Original/commissioned/verified rights-clean sound package with a composition-and-recording evidence ledger.
- First intended-audience, experienced-player, accessibility, event-host, and cultural advisory sessions.

### Exit gate

- Complete multi-hand four-person hosted event on standalone Quest hardware.
- Injected disconnect, reconnect, AI substitution, host transfer, packet loss, and headset-removal recovery pass.
- No P0/P1 rules, authority, concealed-state, social-safety, comfort, or rights defect.
- Event host can run the night without a developer or hidden admin power.
- Human critique is recorded with kickback items resolved or carried explicitly.

### Explicit non-goals

No public plaza, large persistent world, creator economy, user-uploaded/shared music, spectator access to live concealed state, or companion gameplay.

## Stage 3 — The Long Table House Beta

**Objective:** turn the trustworthy private table into a recurring social destination and event platform.

**Estimated shape:** 12–16 weeks after Stage 2 acceptance.

### Product slice

- Persistent arrival house, practice table, private rooms, featured table, queues, table rotation, teaching tables, club nights, leagues, reunions, and closing ceremony.
- Multi-table Floor Host tools, reports, moderation, reconnect operations, public standings, and role-scoped event controls.
- Public spectators receive only a separate allowlisted public projection.
- WebXR may be reactivated as a rules school, invitation/demo surface, host dashboard, and public match projection only after native milestones remain on schedule and projection isolation passes.
- A Horizon spike tests only social discovery, events, identity continuity, and one-click deep-link handoff into the native app. It contains no playable Bid Whist table and no copied rules engine.
- Store/policy, load, abuse, privacy, recovery, rights, accessibility, performance, and multi-table operational testing.

### Companion kill conditions

Any companion is removed if it:

- compiles or reimplements rules adjudication;
- can receive concealed cards;
- creates a second matchmaking pool or competing host workflow;
- requires a second music/privacy authority model;
- consumes work while two consecutive native milestones slip;
- cannot prove a one-click handoff or measurable host/acquisition value.

### Exit gate

- A real community host runs a multi-table event with no developer intervention.
- Intended players want to schedule and attend another event.
- Current exact-candidate CI, security, privacy, rights, device, accessibility, cultural, and human-test evidence is green.
- Completion milestone report, kickback resolution, and explicit owner acceptance.

## Competitive strategy

### Positioning

The Long Table is not “VR cards” and not a casino skin. It is the most trustworthy, tactile, hostable digital Bid Whist night—a place where the gathering matters as much as the score.

### Wedge

- Start with private host-led tables: family, friends, clubs, reunions, teaching nights, and community events.
- Treat the host as the acquisition unit: one good host brings three players and creates the next date.
- Make the first 30 seconds trailer-worthy: table appears, friends sit as themselves, robot deals, hands fan.
- Retention loop: invitation → short practice deal → hosted night → closing ceremony → next event.
- Discovery surfaces are earned only after the native table proves repeat attendance.

### Differentiation

- Bid Whist specificity and rules trust rather than generic card-room breadth.
- Co-equal optical hands and Touch controllers.
- Both authored VR hospitality and MR `Table Anywhere`.
- Personal Meta identity without demographic casting.
- AI Dealer or Human Host, built for real events.
- Multigenerational comfort/accessibility from the first vertical slice.
- Cultural warmth without performance or caricature.

### Monetization hypotheses to test later

- Premium native app with free rules/demo companion.
- Host or club features only after complete private-game validation.
- Original room/theme packs only if they preserve readability, cultural restraint, and competitive trust.
- No advertising, pay-to-win, casino mechanics, or user music marketplace in the three stages.

## Meta development guide

1. Use Unity/OpenXR and the smallest required Meta XR package set: Core, Interaction SDK, Audio, Haptics, Platform, MRUK, and Simulator where justified.
2. Keep rules/state/projection logic platform-neutral and deterministic; presentation clients submit typed intents.
3. Build hands and controllers through one action vocabulary and one test matrix.
4. Use simulator/desktop for fast logic and layout loops only; standalone Quest is authoritative for interaction, performance, comfort, haptics, passthrough, and social acceptance.
5. Select a real-time transport/voice stack only after a bounded comparison; keep the rules authority independent of card animation.
6. Treat avatars, entitlements, Group Presence, invites/deep links, moderation, privacy disclosures, and store requirements as early spikes rather than launch paperwork.
7. Maintain one-writer boundaries, exact-candidate evidence, and different-provider review for every reviewable implementation.

## Roles and workload

Planning, research evaluation, moderation, debate, synthesis, and reporting earn **zero direct-production credit**. They still count as overall effort.

For the next rolling direct-production normalization window, use the PR #76 split manually while recording that runtime enforcement is not merged:

| Lane | Target | Next accepted direct-production allocation |
| --- | ---: | ---: |
| Claude | 60% | 36 units |
| Cursor | 14% | 0 units until the current overage normalizes |
| Grok | 14% | 14 units |
| Gemini/Antigravity | 7% | 7 units |
| Perplexity | 4% | 0 units; reuse current accepted research |
| External OpenAI/Codex | 1% | 0 units; Director work is excluded |

Starting from the accepted 45-unit ledger (Claude 24, Cursor 16, Perplexity 4, external OpenAI 1), adding 36 Claude, 14 Grok, and 7 Antigravity units yields 102 total units and approximately: Claude 58.8%, Cursor 15.7%, Grok 13.7%, Antigravity 6.9%, Perplexity 3.9%, external OpenAI 1.0%—inside the ±3 point operating tolerance.

Responsibilities:

- **Claude:** native architecture, rules authority integration, embodied interaction implementation, hard reliability work.
- **Cursor:** overall-effort secretary/evidence/architecture continuity only until direct-production share normalizes; no nominal production credit.
- **Grok:** isolated device-test tooling, adversarial interaction/state fixtures, competitive/event mechanics artifacts; a different provider reviews adopted work.
- **Antigravity:** public/synthetic mechanical interaction and accessibility fixtures only; Claude or Cursor independently verifies and integrates or rejects them.
- **Perplexity/Firecrawl:** public evidence only; Perplexity does not vote. Reuse the current packet before any new paid query.
- **OpenAI:** Director/control plane—plan, moderate, route, synthesize, gate, report, and preserve dissent; no direct-production credit.

Before every assignment, project the rolling last-20 allocation. Normal tolerance is ±3 points and the hard ceiling is target +5. One primary attempt, one temporary recovery, and a third attempt only with new information or a materially different transport. After three failures, mark the route unavailable and use the configured fallback without duplicating ambiguous paid work.
