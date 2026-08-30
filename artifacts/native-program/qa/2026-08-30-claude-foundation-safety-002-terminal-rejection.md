# Claude foundation-safety v2 — terminal OpenAI rejection

## Disposition

`LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002` is terminal
`OPENAI_CHANGES_REQUIRED_FINAL_TRANSPORT_EXHAUSTED`.

The assignment earns medium/5 overall-effort points once and zero accepted
direct-production points. The mechanically materialized candidate is local-only
at `623ca52c5679b5348630f86eb88ecd48c9db82a1`, tree
`746fc5ac7234fa49adaa728262e95745aee52755`, with sole parent
`a6742a04a384a88e7342530041a1f0d3ab71db2c`. It is rejected, unpushed and
ineligible for a product pull request or downstream dependency use.

## Authenticated final transport and materialization

- Surface: Claude Code in Chrome, Fable 5 High, fresh sanitized repository task.
- Session: `session_01ByWs7G3pnpWQFyLrfAPNQx`.
- Provider commit: `0eeb716e9df7da5e36d22894c381fa6ae4317b3f`.
- Provider tree: `a1aa2dd716cc5a06d688f6ed42165debed69e410`.
- Provider sole parent: `64a9c978cbe5a81e92756f9ddf6085ad6a9ee7e5`.
- Provider result SHA-256:
  `6e845927d8f332b089dc0dc2c580737b3d9d8ba32936a177c2131005d3d76d61`.
- The provider result validated against Director's frozen result schema and
  declared `SUCCEEDED`, 15 checks and 10 acceptance items.
- The provider changed exactly all 35 leased paths with no unleased path or
  mode change. OpenAI restored those 35 exact blobs onto clean product base
  `a6742a0`, verified zero blob mismatches, and committed only the mechanical
  candidate. Claude is the author and OpenAI is the committer.

No rejected Grok implementation artifact was used. No OpenAI-authored product
correction was added.

## Independent OpenAI executable gates

- Real-socket coalesced policy-close convergence probe: `PASS`.
- Focused authority/session suite after one dependency-only recovery: 4 files,
  42/42 tests passed.
- Full CI-equivalent LF TypeScript suite on the exact detached candidate:
  25 files, 208/208 tests passed.
- The first focused launch failed before test collection because the fresh
  worktree had no local `node_modules`. The product and dependency lock files
  matched the known dependency tree exactly, so the single permitted recovery
  used a directory junction and changed no candidate byte.
- Strict typing, fixture-current, production build, Unreal target builds and
  Unreal automation are `NOT_RUN`: independent source review found terminal P1
  failures first, so later expensive gates could not cure acceptance.

## Terminal TypeScript findings

1. Fresh authority instances reset grant high-water and reissue `grant-1`
   through `grant-5` without an incarnation component. An old grant/counter
   identity can therefore become fresh after a restart using the same external
   table ID. Restoration validation is also asymmetric and does not prove
   restored-grant/high-water consistency.
2. The duplicate path writes the duplicate receipt to player-local
   `lastReceipt`; projection code exposes it as feedback. An at-or-below-high-
   water retry therefore mutates player-visible state despite the frozen
   no-mutation duplicate rule.
3. Required executable proof is incomplete: engine rejection is absent from
   the all-rejected-outcomes test, and dropped preview/confirm identities are
   not resent across a real disconnect/reconnect boundary.

## Terminal Unreal findings

1. The guarded delegate helper calls `GetInvocationList()` on a UE 5.7 dynamic
   multicast delegate. That API is not public, so the candidate cannot compile.
2. Same-context `Configure` replaces the transport without advancing the
   context generation, allowing an old dispatch to remain apparently current.
3. Reentrant callbacks can continue old `Connect`, `SendHello` or resync work
   on the replacement transport; in the hello path this can send old
   credentials through the new transport.
4. Schema-decode failure retains a raw context-bound `OnWireError.Broadcast`,
   so old-context sibling delivery is not stopped after reconfiguration.
5. `IntentIdentity` rejection leaves the client counter ahead of authority and
   can create a permanent forward-gap rejection loop.
6. Table-incarnation exhaustion is documented as terminal, but grant rotation
   clears it and the added test expects issuance to resume.
7. The two-listener test is non-vacuous but does not prove same-context
   replacement, old-caller stop, or absence of stale credential/sends.

## Terminal provenance finding

The candidate removes eight pre-existing contribution-marker lines despite the
frozen preserve-marker rule: a BEGIN/END pair in
`LongTableCommitMachine.cpp`, a pair in `table.ts`, and two pairs in
`idempotency-flood.test.ts`. It also changes `credentials.test.ts` without a
new `LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002` marker.

## Verified positives and terminal limits

The source has exactly five fixed lanes; canonical arithmetic/string counter
parsing without regex; early public/dealer rejection; role-specific closed
welcome construction; no grant/counter projection, cue or log leakage; and no
regex, blacklist, scanning, sanitizing or redaction privacy control. Fixture
inventories and canonical encodings match, and public/dealer fixtures expose no
concealed player fields.

Those positives and the green TypeScript tests do not override the compile,
identity, reentrancy, duplicate-mutation, evidence and provenance failures. The
frozen packet permits no fourth provider contact or delivery retry. XR-test,
RobotDealer, integration, Android and physical-Quest work remain closed until a
new explicit Director assignment and authority decision replaces the rejected
foundation route.
