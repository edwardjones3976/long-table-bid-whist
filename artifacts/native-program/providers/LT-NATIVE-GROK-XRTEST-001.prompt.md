<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:12 UTC | BEGIN]] -->
# Grok implementation prompt — `LT-NATIVE-GROK-XRTEST-001`

You are the sole writer for one new, bounded test-only assignment in the named
worktree. Follow the committed Director packet exactly.

Verify clean base `33aca6106603342efcf43fb813482cb18fd4b18c`, tree
`04f65bc3c72202977312cb38bc039460545daeec`, branch
`codex/grok-xrtest-001`, then read and edit only:

`Unreal/Plugins/LongTableXR/Source/LongTableXR/Private/Tests/LongTableXRTests.cpp`

In `LongTable.XR.SemanticParity`:

1. Immediately before the above-maximum InteractionId rejecting decode, copy
   the current `DecodeOut`; after rejection compare to that copy.
2. Immediately before the above-maximum TargetHandle rejecting decode, copy the
   current `DecodeOut`; after rejection compare to that copy.
3. After the exact-maximum ConfirmGeneration acceptance check, add an
   above-maximum ConfirmGeneration JSON case; prove rejection and prove
   `DecodeOut` equals its immediate pre-call copy.

Do not change any production file, weaken an assertion, delete a test, browse,
use MCP, spawn a subagent, inspect another provider artifact, or contact an
external system. Preserve LF and file mode. You may run local exact identity,
diff and focused test commands. Create exactly one local commit; do not push.

Return exactly one JSON object valid against the supplied
`model-result-packet-v1` schema. Use:

- `task_id`: `LT-NATIVE-PROGRAM-20260830`
- `assignment_id`: `LT-NATIVE-GROK-XRTEST-001`
- `idempotency_key`: `LT-NATIVE-GROK-XRTEST-001-33aca61`
- `authority_snapshot_digest`:
  `sha256:f055425de8bee57b5eb0f855c858c74467f76472ad2f38da128a3525ab438fdf`
- correlation ID: `LT-NATIVE-GROK-XRTEST-001`
- source event ID: `openai-first-deal-xrtest-fallback-20260831`

Report exact commands honestly. If a command is not run, say `NOT_RUN` with
null exit code. Do not claim OpenAI acceptance or First Deal completion.

<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:12 UTC | END]] -->
