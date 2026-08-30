# Grok authority-safety fallback status

## Authority

- Assignment: `LT-NATIVE-GROK-AUTHORITY-SAFETY-001`
- Provider: authenticated Grok coding surface
- Size / canonical points if terminal: `medium / 5`
- Exact starting candidate:
  `a6742a04a384a88e7342530041a1f0d3ab71db2c`
- Exact starting tree: `0489b183e70da5751c31e9b80ed40a8b631ba55a`
- Raw packet SHA-256:
  `4dc2923a48df2bdbe452c8576f9c6bce84c998782a148e109521483337aed0c1`
- Canonical work-packet digest:
  `47268f714722a19a783b5ebe47a4137a5abaf4b55f68d1363ff1cb576691ff6e`
- Authority snapshot digest:
  `051e276acc878ff2a22d6ff69902c5fe0e192922c70f60ab2cb273b9b8f2d22e`
- Budget: `$0`; no purchase or ambiguous repeat is authorized.
- Sanitized input archive bytes: `230128`
- Sanitized input archive SHA-256:
  `126dd95b8628638d89b12ce25173dcede2fc0f54652f3235d23aedf01fa73d4c`

## Why this is a new assignment

Claude's terminal foundation-final candidate passed its executable TypeScript
and Windows compile gates but independent OpenAI source QA reproduced three new
safety defects: post-policy-close frame dispatch, authenticated unbounded
processed-intent memory, and cross-context multi-listener Unreal callbacks.
Those findings did not exist when the final Claude packet was dispatched.

Claude has no revision budget. This assignment is therefore an owner-authorized
sequential fallback to under-target Grok—not a Claude retry, HouseCore retry,
concurrent writer, denominator filler or OpenAI-authored production fix.

## Exact lease

Grok may edit only:

- `services/table-authority/src/table.ts`
- `services/table-authority/src/websocket-server.ts`
- `services/table-authority/tests/idempotency-flood.test.ts`
- `services/table-authority/tests/websocket.test.ts`
- `Unreal/Source/LongTableTable/Public/LongTableAuthorityClient.h`
- `Unreal/Source/LongTableTable/Private/LongTableAuthorityClient.cpp`
- `Unreal/Source/LongTableTable/Private/Tests/LongTableTableTests.cpp`

The packet requires real coalesced-frame loopback evidence, a statically bounded
non-reuse design that an unauthorized spectator cannot exhaust, and a
two-listener Unreal reentrancy regression. Structural privacy controls remain
closed schemas; regex, blacklist, keyword, substring, scanning and redaction
controls are prohibited.

## Current state

The packet and sanitized input are schema-valid. Chrome file upload was blocked
before any provider prompt because the ChatGPT Chrome extension lacks local-file
URL access. The materially different local Grok Build CLI is installed and the
exact isolated provider worktree is ready, but its account was not yet
authenticated. `grok login --oauth` opened the official xAI consent page at the
final **Allow** action. The requested scopes were profile and email, offline
access, xAI API access, and Grok.com conversation/workspace read-write access.
OpenAI did not grant that permission. At `2026-08-30T18:33:17Z` the CLI exited
`1` after its ten-minute authorization-code timeout, before authentication,
prompt submission or model execution. One materially temporary OAuth recovery
is available, but owner confirmation is still required at the permission
action boundary before it is started.

Before dispatch, OpenAI froze the implementation-independent acceptance
contract in
`artifacts/native-program/qa/2026-08-30-grok-authority-safety-acceptance.md`.
Its real `node:net` probe sends the upgrade and three masked hellos in exactly
one TCP write. On the rejected starting candidate it exits `1` and reproduces
the ghost state exactly: transport connections `0`, session connections `1`
and South connected `true`. Acceptance requires the unchanged probe to converge
to `0`, `0`, `false`, plus the fixed-bound/non-reuse intent test and the ordered
two-listener Unreal context-epoch test described there.

The exact one-shot CLI prompt is staged outside the provider worktree at
`C:\Users\edwar\.codex\provider-sandboxes\LT-NATIVE-GROK-AUTHORITY-SAFETY-001-CLI-PROMPT.md`.
It is 180 lines, has SHA-256
`7b4ef19300d0428a8b8c995132911bc39a3a7fd86b84b03ddbaf9d0afa229b36`,
uses planned run reference `4a8eb506-d9be-426e-b5d2-fc98fe529bc6`, disables
web/MCP/subagent access, and restricts edits to the seven leased paths. It has
not been submitted to Grok.

No provider prompt, model execution, output, candidate, workload point,
production credit, integration or acceptance is claimed yet. The queued XR-test
and RobotDealer leases remain closed until this foundation fallback is
independently accepted by OpenAI. The existing Slack checkpoint reply was
updated in place at message timestamp `1788093523.556419`; no duplicate notice
was posted.
