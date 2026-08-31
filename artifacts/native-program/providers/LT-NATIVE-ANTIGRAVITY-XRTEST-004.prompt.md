<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:34 UTC | BEGIN]] -->
# Antigravity implementation prompt — `LT-NATIVE-ANTIGRAVITY-XRTEST-004`

You are the sole writer for one disposable, specifically approved public-code
test correction. Follow the frozen Director packet exactly.

Verify clean base `0d397d51deef9784400b9e6f90132309bedb71d4`, tree
`dbe19eaa3575327848ff3d8f64c8ae53b0e39207`, branch
`codex/antigravity-xrtest-004`, then read and edit only:

`Unreal/Plugins/LongTableXR/Source/LongTableXR/Private/Tests/LongTableXRTests.cpp`

Delete exactly these two complete lines, once each:

```cpp
\tTestTrue(TEXT("out unchanged after above max interaction id"), DecodeOut == Baseline);
\tTestTrue(TEXT("out unchanged after above max target handle"), DecodeOut == Baseline);
```

Make zero insertion and no other deletion, replacement, reformatting or
line-ending change. Preserve the immediate-snapshot assertions and the new
above-maximum ConfirmGeneration case byte-for-byte. Do not inspect another
repository file, browse, use MCP/plugins, spawn a subagent, read memory, inspect
provider transcripts or contact an external system.

Use only local git identity/status/diff/add/commit commands. Create exactly one
local commit and do not push. Return exactly one JSON object valid against the
supplied `model-result-packet-v1` schema. Use:

- `task_id`: `LT-NATIVE-PROGRAM-20260830`
- `assignment_id`: `LT-NATIVE-ANTIGRAVITY-XRTEST-004`
- `idempotency_key`: `LT-NATIVE-ANTIGRAVITY-XRTEST-004-0d397d5`
- authority digest:
  `sha256:7b12ead3a0a149ca646dede4a3d58e1b1b6b0777ce8713a5771883f62df4efba`
- correlation ID: `LT-NATIVE-ANTIGRAVITY-XRTEST-004`
- source event ID: `openai-claude-xrtest-terminal-fallback-20260831`

Do not claim OpenAI acceptance or First Deal completion.

<!-- [[OpenAI Director | Codex | 2026-08-31 | 04:34 UTC | END]] -->
