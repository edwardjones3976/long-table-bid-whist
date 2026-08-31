<!-- [[OpenAI Director | Codex | 2026-08-31 | 16:09 UTC | BEGIN]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 15:49 UTC | BEGIN]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 16:10 UTC | BEGIN]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 07:42 UTC | BEGIN]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 07:17 UTC | BEGIN]] -->
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

Sequence 25, the first execution of the undispatched sequence-18
`LT-NATIVE-CLAUDE-ROBOT-001`, is terminal `FAILED`. Its authenticated primary
created thirteen clean-room `LongTableRobotDealer/**` source files and hit a
temporary session limit. The single authorized post-reset recovery returned a
schema-valid failed result after sandbox permission denials prevented the
mandatory provider commit. OpenAI proved the thirteen-file manifest still
exactly matches the frozen primary bytes, but the failed/no-commit packet is
quarantined evidence only and earns medium/5 overall with zero direct
production. At that terminal coding stop, no third coding contact or
normalization was authorized. The owner's later three-contact, no-tool advisory
exchange did not edit, reopen or credit sequence 25 and is now closed.
RobotDealer authoring, composition and every later Chunk A device/human gate
remain closed until a fresh workload-eligible fallback packet produces an
independently acceptable candidate.

Sequence 26 is terminal and closes the fresh Antigravity clean-room RobotDealer
authoring gate. The primary created and resumed one exact suspended, Job-bound
provider process, but its parent-side anonymous-pipe write never completed the
prompt/EOF boundary. The sole materially different Recovery 1 passed the exact
provider-free file-handle, EOF, Job and total failure-receipt proof. It then ran
once from control HEAD `25eb993`, opened and verified the unchanged 9,668-byte
locked read-only prompt handle, and failed closed at `PROMPT_HANDLE_VERIFIED`
while reading guardian readiness.

Recovery 1 created no provider process. Provider identity and resume time are
null, prompt disposition is `NOT_RESUMED`, output and stderr are empty, and no
CLI log, transcript, model request, result or source exists. The guardian's
later `PARENT_EXIT_JOB_EMPTY` record proves active processes `0 -> 0`, provider
identity absent and canonical settings unchanged. The distinct one-shot claim
is consumed. No second recovery, ambiguous resend, normalization or further
Antigravity contact is permitted. Sequence 26 earns zero overall and direct-
production points and has no candidate to freeze into the accepted-base QA
worktree.

The pre-sequence-27 medium/5 RobotDealer projection remains historical
`NO_ELIGIBLE_PROVIDER` evidence and earned no assignment or credit. Actual
sequence 27 is `LT-NATIVE-PERPLEXITY-QUEST-ACCEPTANCE-002`: one owner-authorized,
authenticated-browser, public-only Perplexity research response under the frozen
project-specific transport override, independently checked against ten
Firecrawl-fetched official pages. OpenAI accepted useful acceptance-test design,
rejected one unsupported source-description claim and one internally
contradictory source-count sentence, and awarded medium/5 overall with zero
direct production.

The completed rolling window is now 83 points and every target-plus-five hard
ceiling passes. Fresh sequence 28 `LT-NATIVE-CLAUDE-ROBOT-004` is authorized
pending one primary after its activation commit is pushed and its provider-free
exact-head preflight passes. Its projection leaves Cursor exactly at the 25%
hard ceiling. The distinct packet freezes the public contract, synthetic
fixtures, exact clean base, closed eight-file inventory, one-writer lease,
budget, retry and result-binding evidence. Sequence-25/26 source, prompts,
transcripts, findings, hashes, diffs, sandboxes, worktrees and quarantined bytes
remain prohibited inputs. Before provider contact, installed UE5.7 UHT source
proved the original Blueprint-visible `uint64`/`int8` fields non-viable; the
authority now freezes Blueprint-supported `int64` sequence, `int32` seat/team
and `uint8` counts while retaining the same explicit narrower bounds.

The provider lane uses restricted plus safe mode with only Read, Write, Edit and
Glob in a no-remote synthetic sandbox and does not commit. Bash, PowerShell,
browser, network, MCP, memory and subagents are closed. The launcher validates
the result wrapper/schema/identity and exact authority, Git, inventory, byte,
provenance and descriptor postflight before returning one structured result. A
create-once primary claim precedes process creation; Claude is created suspended
inside a kill-on-close Job, its PID/start identity is durably recorded before
resume, and a closed process-environment allowlist excludes unrelated tokens.
Safe mode ignores user/project/local customizations and no-session-persistence
suppresses the transcript. This route makes no broader canonical-profile
no-write claim, so the earlier Antigravity private-profile/settings gate does
not apply to Sequence 28.
That result plus the exact working-tree bytes is a source-delivery candidate
only. OpenAI must hash and freeze those bytes,
materialize them unchanged at accepted base `4d26680`, run both UE5.7 targets,
all fifteen focused RobotDealer tests and the full LongTable automation suite,
and independently accept or reject before direct-production credit or
integration is legal.

The RobotDealer acceptance gate remains closed until exact result binding,
immutable authority, restricted/safe/no-session-persistence flags, the closed
environment allowlist, atomic claim/process ownership, manifest/path/encoding/
contribution, TypeScript, UE5.7 editor/game builds, all
15 focused tests, full automation and
independent source review are green on one exact candidate. Even that acceptance
would prove only the standalone presentation plugin; composition, visible robot
embodiment, authority integration, Android, Quest, hand/controller, Meta
presence/avatar, two-device privacy, performance, accessibility, human,
cultural, rights, store, merge and release gates remain open.

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
<!-- [[OpenAI Director | Codex | 2026-08-31 | 07:17 UTC | END]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 07:42 UTC | END]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 16:10 UTC | END]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 15:49 UTC | END]] -->
<!-- [[OpenAI Director | Codex | 2026-08-31 | 16:09 UTC | END]] -->
