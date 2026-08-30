# Grok authority-safety correction — OpenAI acceptance contract

## Frozen authority

- Assignment: `LT-NATIVE-GROK-AUTHORITY-SAFETY-001`
- Provider: Grok, one isolated writer lease
- Starting commit: `a6742a04a384a88e7342530041a1f0d3ab71db2c`
- Starting tree: `0489b183e70da5751c31e9b80ed40a8b631ba55a`
- Sole parent of the start: `816824ef85037caac11e90e34c090b54a1c3a7a1`
- Work-packet digest:
  `47268f714722a19a783b5ebe47a4137a5abaf4b55f68d1363ff1cb576691ff6e`
- Authority-snapshot digest:
  `051e276acc878ff2a22d6ff69902c5fe0e192922c70f60ab2cb273b9b8f2d22e`
- Budget: `$0`
- Revision policy: one primary attempt; one recovery only for a substantive
  OpenAI kickback or genuinely temporary transport failure

This document fixes the independent QA outcome contract before provider model
execution. It does not authorize OpenAI to write product code, enlarge the
seven-path lease or substitute a provider self-review for exact-candidate QA.

## Red baseline reproduced before dispatch

OpenAI ran the independent real-socket probe at:

`C:\Users\edwar\.codex\qa-probes\lt-coalesced-policy-close.mjs`

- Probe SHA-256:
  `9a92dea171bbd0a5ee09ffec5773e3646de86a46fa33fc7015658da38b71382d`
- Probe size: 254 lines
- Transport: one `node:net` connection and exactly one client `socket.write`
  containing the HTTP upgrade plus three masked, identical, valid player
  hellos
- Wire outcome: one welcome, one `connection already bound` error and exactly
  one policy close with code `1008`
- Process exit: `1`, expected for the rejected baseline
- Reproduced divergence:

```text
actual   = { transportConnections: 0, sessionConnections: 1, seatConnected: true }
expected = { transportConnections: 0, sessionConnections: 0, seatConnected: false }
```

The same unchanged probe must exit `0` on the provider candidate. Passing a
high-level client test, sending the frames in separate writes or asserting only
the close code is insufficient.

Focused command:

```powershell
node .\scripts\native\run-ts.mjs `
  'C:\Users\edwar\.codex\qa-probes\lt-coalesced-policy-close.mjs' `
  --repo 'C:\Users\edwar\.codex\worktrees\long-table-grok-authority-safety'
```

## Gate A — terminal WebSocket dispatch

Acceptance requires all of the following on the exact candidate:

1. The first hello binds and produces one welcome.
2. The second coalesced hello produces the exact closed-schema error and policy
   close.
3. The third already-parsed hello never reaches session dispatch.
4. No buffered or later frame after terminal close can bind, replace a live
   socket, mutate table presence or produce an outbound message.
5. After one event-loop turn, transport connections, session connections and
   South's connected presence converge to `0`, `0` and `false`.
6. Ordinary same-identity replacement and non-terminal schema rejection remain
   green.

Source QA must find an immediate terminal boundary in every path that can call
`finish()`. A check that occurs only after the complete parsed-frame loop is
not sufficient.

## Gate B — bounded, non-reusable processed-intent identity

The provider-owned test remains:

`services/table-authority/tests/idempotency-flood.test.ts`

An acceptable implementation-neutral test seam may expose only:

```ts
idempotencyDiagnostics(): {
  fixedUpperBound: number;
  attackerDependentUnits: number;
}
```

It must not expose stored identities or make the test depend on a particular
Map, Set, sequence, epoch or budget implementation. OpenAI source QA must prove
that `fixedUpperBound` is an immutable code-level constant and that
`attackerDependentUnits` counts every allocation whose size can depend on
submitted identities. A hidden Map, Set, array, string aggregate, fallback
store or transient queue invalidates the diagnostic.

The adversarial test must establish all of these non-vacuously:

- `fixedUpperBound` is a positive safe integer and never changes.
- `attackerDependentUnits` is always between zero and that bound after more
  than `bound + 17` unique rejected, accepted-local and
  accepted-authoritative identities.
- More than `2 * bound + 31` unique `PUBLIC_ACTOR` attempts all return
  `unauthorized-role` and leave attacker-dependent retained units exactly
  unchanged.
- A legitimate South player can still preview and commit immediately after the
  public flood; rejecting everything cannot pass.
- An identity whose first result was rejected, accepted-local or
  accepted-authoritative remains duplicate after pressure beyond the bound.
- Replaying each old identity as `confirm` cannot consume a later pending
  preview, change authoritative version or digest, or emit a frame.
- A genuinely fresh confirm immediately afterward commits that same preview.

A finite black-box run alone cannot prove lifetime non-reuse or complete
accounting. OpenAI must pair the executable test with a source audit of the
exact candidate.

Focused command:

```powershell
npx.cmd vitest run `
  services/table-authority/tests/idempotency-flood.test.ts `
  --configLoader runner
```

## Gate C — Unreal context-epoch reentrancy

Required automation name:

`LongTable.Table.Client.ContextEpochReentrancyStopsSiblingProjection`

The test must bind two listeners in a known order and exercise this exact
observable sequence:

1. Context A is configured, disconnected, version `-1`, unwelcomed, epoch `G`.
2. `Connect()` reaches `AwaitingWelcome` under A.
3. An A welcome atomically commits A and reaches `Ready`.
4. Old projection fanout begins under epoch `G`.
5. Listener one observes the A projection and synchronously calls
   `Configure(B)`.
6. When `Configure(B)` returns, the public client exposes B as disconnected,
   version `-1`, empty session, unwelcomed and epoch greater than `G`.
7. The old epoch-G fanout terminates before listener two.
8. Listener two receives zero old projection callbacks and never observes an A
   event while the client exposes B.
9. Final state remains the clean B context with no A intent in flight.

OpenAI source QA must verify that every context-bound event is guarded by the
epoch that produced it. A generation check only after an Unreal multicast
`Broadcast(...)` returns is too late. The guard must cover player, host, public,
Ready, receipt, dealer-cue, wire-error and rejection callbacks wherever a
listener can synchronously reconfigure. Old transport continuations must stay
detached after `Configure`.

Focused command:

```powershell
pwsh .\scripts\native\run-unreal-automation.ps1 `
  -Filter LongTable.Table.Client.ContextEpochReentrancyStopsSiblingProjection
```

## Exact-candidate completion matrix

OpenAI accepts only one clean candidate whose sole parent is the frozen start
and whose changed paths are exactly within the packet's seven-path allowlist.
The following run once on that exact SHA:

```powershell
# Independent red-to-green probe
node .\scripts\native\run-ts.mjs `
  'C:\Users\edwar\.codex\qa-probes\lt-coalesced-policy-close.mjs' `
  --repo (Get-Location).Path

# Provider-owned focused regressions
npx.cmd vitest run `
  services/table-authority/tests/idempotency-flood.test.ts `
  services/table-authority/tests/websocket.test.ts `
  --configLoader runner

# Complete TypeScript and browser gates
npm.cmd test
npx.cmd tsc -p scripts/native/tsconfig.native.json
node .\scripts\native\run-ts.mjs `
  .\scripts\native\generate-fixtures.ts --check
npm.cmd run build

# UE5.7 compile and automation gates
pwsh .\scripts\native\build-unreal.ps1 -Target LongTableEditor
pwsh .\scripts\native\build-unreal.ps1 -Target LongTable
pwsh .\scripts\native\run-unreal-automation.ps1 -Filter LongTable.Protocol
pwsh .\scripts\native\run-unreal-automation.ps1 -Filter LongTable.Table
pwsh .\scripts\native\run-unreal-automation.ps1 -Filter LongTable
```

OpenAI also performs a source/security/privacy review on the same immutable
candidate. Any code change invalidates all candidate-bound evidence. No
executable privacy control may use regex, blacklist, keyword, substring,
scanning or redaction, and no concealed member may enter host, public or dealer
output shapes.

## Fail-closed disposition

The correction remains `PENDING_PROVIDER_DISPATCH` until authenticated Grok
model execution produces one correlated result packet and one exact candidate.
It remains `OPENAI_CHANGES_REQUIRED` if any gate is absent, stale, run against a
different SHA, vacuous, self-reported only or unable to prove its complete
assertion set. Foundation acceptance does not claim Android, physical Quest,
Meta SDK, avatar, human, cultural, rights, store, release or whole-product
completion.
