<!-- [[OpenAI Director | Codex | 2026-08-31 | 05:31 UTC | BEGIN]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:27 UTC | BEGIN]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:18 UTC | BEGIN]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:15 UTC | BEGIN]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:03 UTC | BEGIN]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 03:16 UTC | BEGIN]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 03:01 UTC | BEGIN]] -->
<!-- [[OpenAI Director | Codex | 2026-08-30 | 18:15 UTC | BEGIN]] -->
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

Current stop: sequence 12 `LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002` completed its
final transport but is terminal OpenAI-rejected. Local candidate `623ca52c`
passed the real-socket convergence probe, `42/42` focused and `208/208` full LF
TypeScript tests, but source QA found terminal authority, UE5.7 compile,
reentrancy/credential, evidence and provenance failures. It is local-only,
unpushed and not an accepted dependency. No XR, RobotDealer, integration,
Android or device gate may consume it, and no fourth provider contact or
delivery retry is permitted. A new explicit Director assignment and authority
decision is required before replacement foundation work. A green browser,
Windows or headless gate never substitutes for physical Quest evidence.

Sequence 16 replacement work is now also terminal. Exact candidate `cb7b49b`
passed the corrected real-socket probe, `52/52` focused and `219/219` full LF
tests, strict typing, fixtures, production build, both UE5.7 targets and
`34/34` Unreal automation. It remains unaccepted because the provider renamed
away one inherited contribution-marker pair and incorrectly declared that
provenance gate green. Sequence 19 then added only four exact comments in one
file and produced sole-parent candidate `4d26680`, tree `1e0db56`. Normalized
inherited marker deletion is zero; 219/219 full LF tests, both UE5.7 targets and
34/34 Unreal automation pass. The native foundation code gate is now locally
`OPENAI_ACCEPTED`.

Sequence 20, `LT-NATIVE-OPENAI-FIRST-DEAL-GAP-001`, independently audited the
unchanged accepted foundation. Its code/authority gate remains green, but First
Deal is not achieved: accepted XR, native table/room presentation, embodied
robot, Android package, two-device concealed-state proof and physical
Quest/human evidence are absent. The audit earns medium/5 overall OpenAI effort
and zero direct production, bringing the useful-work window to 17/20 and 86
points. Stale Claude XR-test and RobotDealer packets remain closed; a new exact
workload-eligible fallback authority is required. Physical Quest and every
human, cultural, accessibility, rights, store and owner gate remain open.

Sequence 21, `LT-NATIVE-GROK-XRTEST-001`, ended
`UNAVAILABLE_PRE_SUBMIT_TRANSPORT`. CLI authentication and two bounded Chrome
transport checks failed before any prompt submission; the exact worktree stayed
clean and no workload point was earned. Production XR bytes remain immutable.
The one-file correction requires a genuinely new fallback assignment before
OpenAI can evaluate mechanical XR composition onto `4d26680`.

Sequence 22, `LT-NATIVE-CLAUDE-XRTEST-002`, ended terminal OpenAI-rejected after
an authenticated Claude result retained both stale assertions, failed the raw
result/protocol boundary, read beyond its sole file and reproduced only 9/10 XR
automation. Sequence 23 Antigravity and sequence 24 GitHub Copilot CLI also
ended terminal protocol/result-rejected; none of their bytes is accepted or an
input to another provider.

Sequence 25 is the first execution of the undispatched sequence-18
`LT-NATIVE-CLAUDE-ROBOT-001`. Accepted foundation `4d26680`, terminal XR QA and
this explicit Director reauthorization open the independent RobotDealer authoring
gate without claiming accepted XR. Claude receives only the exact canonical
public JSON contract and result schema in a new standalone root repository and
writes only `LongTableRobotDealer/**`. The pending assignment earns no credit;
one primary and one objectively temporary pre-result recovery are authorized,
with no source revision.

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

<!-- [[OpenAI Director | Codex | 2026-08-30 | 18:15 UTC | END]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 03:01 UTC | END]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 03:16 UTC | END]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:03 UTC | END]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:15 UTC | END]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:18 UTC | END]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:27 UTC | END]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 05:31 UTC | END]] -->
