<!-- [[OpenAI Director | Codex | 2026-08-31 | 05:16 UTC | BEGIN]] -->
# GitHub Copilot XR-test sequence 24 — terminal rejection

## Verdict

Assignment LT-NATIVE-GITHUB-COPILOT-XRTEST-005 is terminal
OPENAI_CHANGES_REQUIRED_RAW_RESULT_FAILED. The provider authored a correct,
one-file working-tree diff under the frozen tool boundary, but its raw final
assistant payload was a Markdown-fenced JSON document. The normalized inner
object validates; the raw payload does not satisfy the immutable requirement
for exactly one unfenced model-result-packet-v1 object. No revision, delivery
retry, direct-production credit, candidate commit or composition is permitted.

## Authority and attempts

- Control authority before dispatch:
  667b53375d1cf6508429043ad82de2a75afc2254
- Packet:
  director/native-program/packets/LT-NATIVE-GITHUB-COPILOT-XRTEST-005.json
- Packet SHA-256:
  e709539c967e47ae59e8920aa64c6147aa3e7f5ac45106faf0bcb6343e0747ae
- Product base:
  33aca6106603342efcf43fb813482cb18fd4b18c
- Product tree:
  04f65bc3c72202977312cb38bc039460545daeec
- Product starting blob:
  a17ff010bfae135be5f27796fcdd34b76f1601c7
- Primary: local pre-submit failure because model auto rejects an explicit
  reasoning-effort flag; session 940c3c1c-7027-43d8-9920-b42c0caf3f71
  recorded only session start/shutdown and zero assistant/model messages.
- Recovery: one allowed pre-result configuration recovery removed only that
  incompatible flag and reached one GitHub Copilot CLI run.
- Recovery session:
  9319868b-5d1f-49a0-9ee5-d1433be0c3fc
- Copilot CLI version: 1.0.82
- Service-level provider: GitHub Copilot CLI
- Auto-routed model: claude-haiku-4.5, vendor Anthropic
- Premium request accounting: 0.33
- Internal model calls: 12
- Assignment/workload executions: one terminal provider run

The service-level provider identity and 1% target were frozen before dispatch.
The underlying auto route is recorded transparently; it does not reopen or
normalize terminal Claude sequence 22 and earns no direct-production credit.

## Tool and scope proof

The provider session recorded eleven tool calls: six view calls and five edit
calls. Every call targeted only:

Unreal/Plugins/LongTableXR/Source/LongTableXR/Private/Tests/LongTableXRTests.cpp

No shell, Git, URL, web, MCP, remote, subagent, temporary-directory or other
file action occurred. Session shutdown recorded exactly one modified file,
twelve added lines and two removed lines.

- Events JSONL SHA-256:
  4a56d9774546477a0e5a8b06a371f2c59110c9894a06abeb029320707b57f761
- Workspace record SHA-256:
  36a54c0d6365862467afdeb7f7a386d61800542f7677ab943d56cef024461b35
- Exact binary diff SHA-256:
  aa90aa9a47a3b54fb627f4ccc806bf1a3069263d74570a9afb7ae0d8e54ffdac
- Working-tree blob:
  7ddd45b3d956468a61b8a34a2f43be1370287932
- Mode: 100644
- Line endings: LF
- BOM: absent
- Working-tree byte length: 31,049

The diff independently adds the required fresh outer provider marker pair,
snapshots DecodeOut immediately before above-maximum InteractionId and
TargetHandle rejections, and adds above-maximum ConfirmGeneration rejection
plus unchanged immediate-state coverage. No existing assertion is removed.

## Result protocol

- Raw final assistant content SHA-256:
  a59bb49a3b7cfec0e52ff42c570331fc5230ad7931c110ab055c3b5fdf53e57a
- Raw result: FAIL — it begins with a JSON Markdown fence and ends with a
  matching fence.
- Extracted inner object SHA-256:
  f666f7dc082b78cd3e845b0c6ba19409af7e39c7e795166ccfac47d21ccce485
- Extracted inner object: PASS against model-result-packet-v1.
- Disposition: normalization cannot cure an immutable raw-result failure.

## OpenAI QA disposition

OpenAI inspected the exact diff, mode, line endings, tool trace, model route and
result envelope. It did not alter or mechanically commit the provider bytes and
did not spend additional build/test actions after the mandatory raw-result gate
failed. The dirty provider worktree is retained unchanged as frozen evidence.

This result does not prove an accepted XR plugin, combined native product,
Android package, Quest-device run, two-headset privacy, human playtest, rights
review, cultural review, store readiness or First Deal completion.

<!-- [[OpenAI Director | Codex | 2026-08-31 | 05:16 UTC | END]] -->
