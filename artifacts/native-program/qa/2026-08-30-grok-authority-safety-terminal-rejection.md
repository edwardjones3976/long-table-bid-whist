# Grok authority-safety recovery — terminal OpenAI rejection

## Disposition

`LT-NATIVE-GROK-AUTHORITY-SAFETY-001` is terminal `OPENAI_CHANGES_REQUIRED_RECOVERY_AND_DELIVERY_EXHAUSTED`.

It earns medium/5 overall-effort points once, zero direct-production points,
no accepted-outcome digest and no candidate. The exact product worktree remains
clean at `a6742a04a384a88e7342530041a1f0d3ab71db2c`, tree
`0489b183e70da5751c31e9b80ed40a8b631ba55a`.

## Authenticated recovery

- Conversation: `7c188d2d-1a1e-4628-86e1-e761277fb211`
- Model/surface: Grok 4.6 Build Beta in Chrome
- Provider run reference: `grok-web-build-20260830-authority-safety-primary`
- Primary ended on a temporary usage limit with no complete candidate.
- Owner-retried recovery produced source text but no valid candidate.
- The final third action was delivery-only after new digest/schema evidence;
  it was not a coding retry and no fourth contact is permitted.
- After the owner reported extended Grok limits and personally retried the
  request, OpenAI read the authenticated response at browser request
  `fdc0c47b-70a6-4fbd-96de-d6af669c54ca`. It reproduced the same three code
  blocks byte-for-byte: the same 37,659-byte ZIP, manifest SHA
  `183244a339a8ff69a92f95ef022e75d24a7472dfa6f015123ef99d99095c0d44`
  and result SHA
  `49415af52682c62c63e29170c645f12a9800bf9c7181127fa9903ad696d2f4ff`.
  This owner-triggered recheck supplied no new candidate bytes and does not
  reopen the exhausted Grok coding or delivery route.

## First recovery delivery failures

- Browser patch bytes: `46825`, SHA-256
  `f1ac15be548b962c8e2b5d78d8a071037ea444a25a6178bd9b3c2e4a3c29e608`.
- Provider-declared patch SHA-256:
  `5659b323f27350f7f3fbb79b3cc5fa64780c9d19cb5a490999ff7ad45a4c9fa7`.
- The patch had collapsed non-contiguous hunks, false Git index metadata and
  no final LF; ordinary apply and `--recount` both failed.
- First result bytes: `5409`, SHA-256
  `750d5581134a980aad1db2ac5f67fffdd072428a6e722a0017178edfca655336`.
- That result omitted eight required top-level fields, added eleven forbidden
  fields, flattened correlation and used invalid status `completed`.

## Final delivery-only failures

- Inline ZIP actual bytes: `37659`, SHA-256
  `b36d3a8fef0900694832cf7ec1ef69331a85428f3a41b1d9153605449e40e68a`.
- Manifest/result-declared ZIP SHA-256:
  `0603e536fda97bca87424b193edc0ad4c0421e47b3aebb437714a8079b1bd41d`.
- Archive listing exposed exactly the seven leased paths, but extraction
  failed with a bad CRC for `table.ts` and decompression failure for
  `websocket.test.ts`; only four partial TypeScript files were produced.
- Two partial files disagreed with their own declared hashes and no Unreal
  replacement was extractable.
- Final manifest bytes: `1571`, SHA-256
  `183244a339a8ff69a92f95ef022e75d24a7472dfa6f015123ef99d99095c0d44`.
- Final result bytes: `4745`, SHA-256
  `49415af52682c62c63e29170c645f12a9800bf9c7181127fa9903ad696d2f4ff`.
- Final result again failed the frozen schema: eight required identity/outcome
  fields were missing, `packet_type` was forbidden, correlation held forbidden
  nested fields, artifacts was an object instead of an array, and check and
  acceptance items used the wrong shapes.

## Independent source findings

The provider text was sufficient for a fail-fast source review without
materialization. It contained three P1 Gate B failures:

1. `host-transfer` changed host authority before recording the intent, so the
   old host ceased to be “entitled” and the accepted transfer ID was forgotten.
2. `attackerDependentUnits` returned zero while a submitted-ID `Set` grew to
   8192 entries; the diagnostic and tests hid attacker-shaped allocations.
3. The overflow Bloom filter had false positives and correlated hashes, so a
   genuinely fresh player ID could be classified as duplicate and progress
   could collapse under pressure.

The deeper authority review proved the seven-path Gate B inconsistent: exact
lifetime membership for arbitrary unbounded strings cannot use fixed memory
without forgetting old IDs, rejecting fresh IDs, probabilistic collisions or
an exhaustible hard stop. The next route therefore freezes a server-issued
role-grant plus monotonic-counter v2 contract instead of weakening acceptance
to fit the rejected Bloom design.

No provider bytes were copied into a product worktree and no expensive build or
automation gate was run after the provenance and source gates failed.
