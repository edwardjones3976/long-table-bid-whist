# Claude foundation-final provider status

## Authority

- Assignment: `LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001`
- Exact starting candidate: `816824ef85037caac11e90e34c090b54a1c3a7a1`
- Exact starting tree: `df89b69458fb90c58e619540bd7069445a23b461`
- Base packet file digest: `sha256:2314ec2d04333ddf97e7b4f7c7096fa7d2947c145377189402e5a035916e86df`
- Canonical work-packet digest: `sha256:9bd9b846a9f8f42a9d149b77ad13c7b57a85fbef605a9a28e8163665ef68c144`
- Budget: `$0`; no credit purchase is authorized.

## Primary authenticated CLI route

Claude Code Fable 5/MAX session
`c59226c5-2582-4236-8930-584c08d8322f`, resumed from
`f0d909ff-0700-4846-b6d0-65f75598d745`, performed provider work and wrote ten
owned TypeScript paths. It then ended with an explicit API 429 session limit
before fixtures, tests, Unreal work, a provider commit or a terminal result
packet.

The CLI terminal response stated a separate `2026-08-30 08:30
America/Los_Angeles` reset for that route. Cowork later displayed 10:10 for the
shared plan state, and the live heartbeat recheck below superseded that with
10:40.

OpenAI did not edit those bytes. It froze them mechanically for provenance:

- Checkpoint commit: `bf277215f296593ff1ac092becba1d65f0453de3`
- Tree: `3e5ee41436e783649da45e200f8443752c51f044`
- Parent: `816824ef85037caac11e90e34c090b54a1c3a7a1`
- Binary-diff object: `2b59ad8721fdc5b263a46397ab33fb884a9ae390`
- Acceptance: none; the checkpoint is incomplete and untested.

## Materially different browser recovery

Claude Code web was checked before dispatch and displayed 100% of its five-hour
limit, so no prompt was sent there and it earned no provider or workload credit.

Authenticated Claude Cowork task
`https://claude.ai/cowork/cse_01J1WZXZMbRcQgYj3nS2dFJb` received exactly one
sanitized archive and the frozen browser transport delta:

- Archive bytes: `303005`
- Archive SHA-256: `b5936893cb0e6c2fc3c1b072e9921dccc90db8c60a8299c682dabf0345c6a849`
- Transport branch: `codex/claude-foundation-web-sandbox`
- Transport head: `2f2a18765e25289ff42cc5740de5d07a7c4d6ea8`
- Transport tree: `5a486cab48e6cc88cf6c04b3da736865bdd0b7e5`

Cowork accepted the prompt but returned no output artifact and no source change.
Its terminal UI state reported that the session/plan usage limit had been
reached and initially displayed `2026-08-30 10:10 America/Los_Angeles` as the
plan reset. The offered purchase route was not used: the exact work packet has
`budget_usd: 0`, and the owner did not authorize a purchase amount.

At `2026-08-30 10:12:56 America/Los_Angeles`, the active heartbeat rechecked the
same preserved Cowork task. Its live banner still reported no usage credits and
now said to wait until 10:40 AM, superseding the earlier 10:10 display. The
prompt composer was present, but usage was not available, so OpenAI sent no
provider message and made no product mutation.

## Continuation rule

The existing Cowork task is planned to resume once at or after `2026-08-30 10:42
America/Los_Angeles`, after the explicit external-state reset. This same-task
continuation is not a retry, new assignment or concurrent provider dispatch. It
adds no workload row, revision
budget, direct-production credit or acceptance. Cowork and CLI must never run
concurrently. If the existing Cowork task cannot resume, this route is terminal
unavailable and OpenAI must not author or transfer the production correction.

One active, one-shot thread heartbeat is bound to this continuation:
`resume-claude-foundation-correction`. After the live reset changed, the same
heartbeat was moved to 10:42 AM local time. It does not create a provider
assignment or provider call; the resumed turn must still verify the current
usage banner before touching Cowork. An earlier rendered suggestion card is not
active and requires no user action.

Downstream Claude XR-test, RobotDealer, integration, Android and physical Quest
gates remain closed until a complete provider-authored foundation candidate is
materialized on the exact local lineage and passes independent OpenAI source,
TypeScript and UE5.7 QA.

## Coordination delivery

After the evidence checkpoint was pushed, one material status reply was posted
to the existing Slack coordination thread. Connector delivery evidence:

- Message timestamp: `1788093523.556419`
- Message link:
  `https://edgeengine.slack.com/archives/C0BSH9SPPUH/p1788093523556419?thread_ts=1788068481.517609&cid=C0BSH9SPPUH`

The reply records the exact control commit, checkpoint, reset time, zero-budget
rule, unchanged workload, closed downstream gates, and the superseding Grok and
Antigravity dispositions. It makes no device, human, rights, store, release or
completion claim.

## Terminal provider result and materialization

After the plan reset, the preserved Cowork task resumed without a duplicate
prompt and reached the authenticated terminal state `Claude finished the
response`. It returned `LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001.zip`:

- Archive bytes: `83935`
- Archive SHA-256:
  `ae5a01386fc3e09f31fbcae41849f09639e8b0987ae23cc49be7610e9123241b`
- Result-packet SHA-256:
  `f8c3248f22e91ba055091a9a90a85dc8d1433741e222ddf2dae004b833362dd7`
- Result contract: valid `model-result-packet-v1`, status `SUCCEEDED`
- Declared changed files: `11`; every digest matched and every path was owned
- Unsafe, missing, extra or out-of-lease archive entries: `0`

The bundled `PROVIDER.patch` did not apply to exact packet base `816824e`; it
was a delta from Claude's preserved partial checkpoint. OpenAI did not author a
repair. It mechanically composed the ten provider-authored checkpoint files
from `bf27721` and the eleven digest-verified final overlay files onto exact base
`816824e`, producing one 18-owned-path sole-parent candidate:

- Candidate: `a6742a04a384a88e7342530041a1f0d3ab71db2c`
- Tree: `0489b183e70da5751c31e9b80ed40a8b631ba55a`
- Sole parent: `816824ef85037caac11e90e34c090b54a1c3a7a1`
- Worktree status at QA start and finish: clean

The one-shot continuation heartbeat
`resume-claude-foundation-correction` was deleted after successful resume and
artifact materialization.

## Independent OpenAI QA and rejection

Executable evidence was strong but not sufficient for acceptance:

- Focused adversarial TypeScript: `45/45` passed.
- Full repository suite under CI-equivalent LF checkout: `193/193` passed.
- Strict native typecheck, fixture-current (`11` files), project build and
  production Vite build: passed.
- UE5.7 `LongTableEditor Win64 Development`: passed.
- UE5.7 `LongTable Win64 Development`: passed.
- Complete Unreal automation: not run after fail-fast source QA found blocking
  defects; no automation pass is inferred.

Three independent, non-writing OpenAI source lanes then rejected the candidate:

1. **P1 — coalesced post-close dispatch.**
   `services/table-authority/src/websocket-server.ts` continues its parsed-frame
   loop after `finish()` policy-closes and disconnects the socket. A real
   loopback write containing three masked hello frames reproduced a dead server
   socket with a resurrected session binding and false connected presence:
   `{"sessionConnections":1,"serverConnections":0,"connected":true,"version":4}`.
2. **P1 — Unreal multi-listener reentrancy.**
   `LongTableAuthorityClient` checks `ContextGeneration` only after an entire
   multicast broadcast. If listener one calls `Configure`, later listeners can
   receive the old Ready/projection event while the public client state already
   exposes the new context. The one-listener regression cannot detect this.
3. **P2 — authenticated unbounded heap growth.**
   The processed-intent correction retains every authoritative, local and
   rejected ID in a table-lifetime `Map`. An unauthorized public participant
   can submit unlimited unique IDs; no static memory bound, actor budget or
   lifecycle guard exists. The regression intentionally retains 4,801 entries.

The protocol/replay/fixture/privacy lane reported no findings and confirmed the
regex/blacklist/substring/scanning/redaction prohibition remained intact. The
foundation packet has no revision budget, so its terminal result earns one
medium/5 overall-effort record and zero direct-production credit. The candidate
is not integrated, merged, deployed or accepted.

## Sequential fallback disposition

The owner's instruction to fix and complete everything authorizes a new useful
fallback, not another Claude attempt. `LT-NATIVE-GROK-AUTHORITY-SAFETY-001`
starts from exact rejected candidate `a6742a0` and transfers a sequential lease
for only seven defect and regression paths to under-target Grok. Claude is
terminal and no longer has a writer lease. OpenAI remains the sole acceptance
authority.
