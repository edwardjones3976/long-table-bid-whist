<!-- [[OpenAI Director | Codex | 2026-08-30 | 05:27 UTC | BEGIN]] -->
# Three large native chunks and release gates

## Architecture boundary

One UE5.7 C++ project uses `LongTableProtocol`, `LongTableTable`,
`LongTableXR`, `LongTableRobotDealer`, `LongTableSocial`, the isolated
`LongTableHouseCore`, and the `LongTable` composition root. Blueprint owns room
composition, materials,
lighting, choreography, animation curves and allowlisted presentation. C++ owns
schemas, authority connection, projection application, intent identity,
permissions, input normalization, commit state machines and tests.

The authority path is:

`hand/controller -> typed Unreal intent -> authenticated WebSocket -> TypeScript table service -> rules-core -> role-bound field-by-field projection -> Unreal presentation`.

`PlayerProjection`, `HostProjection`, and `PublicProjection` are distinct closed
types. Concealed fields are not optional host/public members; they do not exist
in those schemas. House surfaces consume only occupancy, event metadata,
standings and the public feed. The robot receives generic presentation cues.

## Chunk A — Native Foundation / First Deal

- UE5.7.4 C++ project, deterministic build identity, CI, protocol modules and
  golden TypeScript/Unreal fixtures.
- Blank Android/Quest package proof before content growth.
- Controller and hand adapters with the same actions: point, select, grab,
  inspect, preview, cancel, confirm, recenter and menu.
- Seated calibration; dominant hand, reach, scale, contrast, text and
  reduced-motion controls; safe live modality switching.
- MR table placement, Scene/anchor recovery, haptics, spatial audio and VR room.
- 13-card fan, sorting/inspection, bid preview/cancel/confirm, one trick,
  gather/book feedback, robotic dealer cues, Meta presence adapter/fallback.
- Two-device concealed-state proof and counterfactual projection tests.

Code acceptance: TypeScript tests, Unreal headless tests and Windows build pass.
Device acceptance: Android package/install/launch, hands, controllers,
switching, haptics, placement, anchor recovery and two-headset privacy evidence
pass on the unchanged candidate.

Current stop: Claude R1 candidate `816824e` has green local code gates but is
OpenAI-rejected on source review. No XR, RobotDealer, integration, Android or
device gate may treat it as an accepted dependency. First run the exact
`LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001` correction and independent QA; then run
the XR test-only and RobotDealer clean-room fallbacks sequentially. A green
browser, Windows or headless gate never substitutes for physical Quest evidence.

## Chunk B — Private Game Night

- Full strict Bid Whist match, validated house-rules manifest, scoring, replay,
  teaching overlays and deterministic authorized-view AI seats.
- Private invitations/room codes, four seats, authenticated seat binding,
  reconnect, suspend/resume, host transfer, packet-loss recovery and
  between-hand human/AI substitution.
- AI Dealer and Human Host modes. Host may pace, pause between hands, invite,
  mute, moderate, substitute, announce and end an event; host cannot see or
  affect concealed or committed play.
- Voice/safety adapter, mute/block/report, captions and no-audio equivalence.
  Host music remains external/off; no upload, stream, record or rebroadcast.
- Full-match performance, thermal, battery, network, security, permission,
  abuse, accessibility and recovery testing.

Accept only after four physical headsets complete a hosted match and the exact
candidate passes deterministic replay, host/privacy, reconnect, substitution,
voice-safety, suspend/resume, packet-loss and 90-minute soak gates.

## Midpoint milestone

After Chunk B, OpenAI reports exact base/head/digests, actual rolling-20 and
production shares, accepted/rejected provider artifacts, tests, device proof,
cost/time telemetry, authority changes, defects, rights/accessibility/cultural
findings, dissent and the smallest adjustment set. Chunk C starts from the
unchanged accepted head or a recorded new baseline.

## Chunk C — Long Table House

- One application with arrival house and reusable native tables; no WebXR or
  Horizon companion product.
- Concurrent tables, public directory/spectator feed, schedule, invitations,
  queues, rotations, clubs/leagues, standings, continuity, floor-host tools,
  announcements, moderation and opening/closing ceremony.
- Capacity, load shedding, reconnect, failover, observability, incident/audit,
  moderation retention, age/privacy, abuse resistance and safe shutdown.
- Original/cleared asset ledger and lightly FBA-inflected hospitality tested
  with advisors, never inferred as universal by the team.
- Accessibility, comfort, MR/VR and controller/hand equivalence, performance,
  thermal, battery, memory, network and repeat-event soak evidence.

Accept only when a floor host runs a multi-table repeat event without a
developer, non-player payloads stay public-only under counterfactual tests and
current human/device/platform/rights evidence binds to the exact candidate.

## Final five-step QA-to-release cycle

1. Freeze candidate SHA/tree, build identity, Android/server digests, rights
   ledger and provider contribution map.
2. OpenAI runs once the full TypeScript/Unreal/integration/security/privacy/
   static/package/device/performance/soak matrix; one recovery only for a
   temporary infrastructure failure.
3. OpenAI reports cross-module findings and kicks every correction to its owning
   provider. Any change invalidates candidate-bound evidence and creates a new
   exact candidate.
4. Run experienced-player, beginner, age/accessibility, event-host,
   target-audience/cultural and store-policy human gates without private
   transcripts or concealed data.
5. OpenAI issues the Completion Milestone report. The owner accepts the
   unchanged candidate and separately authorizes merge/release, or kicks it
   back. Assignment completion never equals product completion.

## Serious safety stop

Stop on card disclosure; rules/replay divergence; host/robot control of play;
identity/avatar misuse; regex privacy; unlicensed media; fixed stereotyped human
characters; unsafe voice/moderation behavior; credential or paid-dispatch
ambiguity; unrelated mutation; failed exact-SHA binding; or cultural harm.

<!-- [[OpenAI Director | Codex | 2026-08-30 | 05:27 UTC | END]] -->
