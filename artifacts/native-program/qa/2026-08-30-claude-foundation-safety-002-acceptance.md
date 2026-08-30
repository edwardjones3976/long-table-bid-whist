# Claude foundation-safety v2 — OpenAI acceptance contract

## Frozen candidate

- Assignment: `LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002`
- Provider: Claude, sole authorized recovery of the sequential medium/5
  assignment after OpenAI's pre-write Director control stop
- Start: `a6742a04a384a88e7342530041a1f0d3ab71db2c`
- Start tree: `0489b183e70da5751c31e9b80ed40a8b631ba55a`
- Authority digest: the exact value in the bound work packet; OpenAI recomputes
  the RFC 8785 digest of `{"authority_snapshot":[...]}` before dispatch.
- Budget: `$0`; the stopped primary made no provider write and this dispatch
  consumes the assignment's sole recovery. No further same-transport provider
  retry or revision is authorized.

The provider may read the exact `a6742a0` source and the frozen v2 contract. It
must not read any Grok or other rejected-provider implementation artifact.
Its writable allowlist is exactly `provider_writable_paths` in that contract;
no phrase such as “corresponding tests” or “affected fixtures” expands it.

## Gate A — terminal WebSocket dispatch

The exact-candidate matrix below runs the unchanged independent probe once.

It must exit zero after one write containing upgrade plus three masked hellos,
with one welcome, one policy error/close and final transport/session/presence
`0/0/false`. Every finish path terminates the current parsed-frame loop.

## Gate B — bounded exact role-grant identity

Source QA must prove exactly five preallocated lanes and no request-count-
dependent identity collection. Player/host intent IDs use the current
server-issued role-grant `sessionId` and exact next canonical counter. Public
and dealer cannot allocate or consume a lane. Probabilistic filters fail.

Required executable cases:

1. exact-next applies once; lower/equal duplicates; gap does not advance;
2. maximum exhaustion fails closed without wrap;
3. local, authoritative, stale, wrong-phase and engine-rejected outcomes all
   consume their exact counter before later semantic reevaluation;
4. public/dealer floods leave all five lane bytes unchanged, followed by a
   successful South preview and confirm;
5. dropped preview and confirm receipts reconnect under the same grant,
   retry once without a second mutation, then advance the next counter;
6. socket replacement detaches the old socket without presence resurrection;
7. seat rebind, substitution and host transfer rotate only the affected grant,
   never revive an old grant and preserve independent player/host lanes;
8. role welcomes reveal only the recipient grant; public/dealer have null
   counters and no projection, cue or log contains grant state.

After one lane consumes counter `9007199254740991`, every entitled welcome
uses `nextIntentCounter: null`, the entire table incarnation rejects every new
intent without mutation, and only a new externally non-reused table incarnation
may resume. Clamping, wrapping, grant rotation, or advertising the maximum again
fails this gate.

## Gate C — Unreal context epoch

`LongTable.Table.Client.ContextEpochReentrancyStopsSiblingProjection` binds two
listeners in order. Listener one reconfigures A to B; listener two receives no
old projection while the public client exposes B. Every context-bound event
uses a per-listener generation guard that compiles on UE5.7.

UE5.7 copies a dynamic multicast's full invocation list before ordinary
`Broadcast()`, so a generation check after broadcast, delegate clearing,
`GetAllObjects()`, casts or engine-header changes fail source review. Preserve
the reflected `BlueprintAssignable` API through a compile-safe guarded snapshot
adapter that invokes one copied binding at a time and checks generation before
the next, or record and test an explicitly authorized public API migration.

The Unreal client also accepts only coherent protocol-v2 welcomes, never rolls
a grant/counter backward, preserves an in-flight retry only under the same
authenticated grant and discards it on context/grant change.

## Exact-candidate matrix

Run from the exact frozen product-candidate worktree, never from this Director
control worktree. First record `git rev-parse HEAD`, its tree, sole parent, clean
status and changed-path allowlist. Bind `$CandidateSha` to that verified
40-character HEAD, then run the fail-fast focused gate followed by the full
matrix once:

```powershell
$CandidateSha = (git rev-parse HEAD).Trim()
if ($CandidateSha -notmatch '^[0-9a-f]{40}$') { throw 'candidate SHA is not exact' }

node .\scripts\native\run-ts.mjs `
  'C:\Users\edwar\.codex\qa-probes\lt-coalesced-policy-close.mjs' `
  --repo (Get-Location).Path
npx.cmd vitest run services/table-authority/tests/idempotency-flood.test.ts services/table-authority/tests/session.test.ts services/table-authority/tests/rebinding.test.ts services/table-authority/tests/websocket.test.ts --configLoader runner
npm.cmd test
npx.cmd tsc -p scripts/native/tsconfig.native.json
node .\scripts\native\run-ts.mjs .\scripts\native\generate-fixtures.ts --check
npm.cmd run build
pwsh .\scripts\native\build-unreal.ps1 -Target LongTableEditor -Platform Win64 -Configuration Development -BuildSha $CandidateSha
pwsh .\scripts\native\build-unreal.ps1 -Target LongTable -Platform Win64 -Configuration Development -BuildSha $CandidateSha
pwsh .\scripts\native\run-unreal-automation.ps1 -Filter LongTable
```

The focused Vitest command is a fail-fast screen; if it fails, stop without
running the duplicate full-suite work. The single `LongTable` automation run is
the complete prefix gate and avoids overwriting evidence with two redundant
subset runs.

OpenAI then performs one exact-source security/privacy review. Any code change
invalidates all candidate-bound evidence. No concealed field may enter a host,
public or dealer shape, and no regex/blacklist/scanning/redaction mechanism may
serve as the privacy boundary.

The result remains `OPENAI_CHANGES_REQUIRED` if any identity, provenance,
build, test, schema, privacy or result-packet gate is absent or stale. A green
foundation does not prove Android, physical Quest, Meta SDK, avatar, human,
cultural, rights, store, release or whole-product completion.
