<!-- [[OpenAI Director | Codex | 2026-08-30 | 05:27 UTC | BEGIN]] -->
# Native program roles and responsibilities

This record separates Grok from Cursor and applies the merged Director PR #76
workload model. Completion runners, LangGraph execution, parallel external
dispatch and host completion runners are permitted capabilities, but activate
only when their recorded gates pass. Regex-based privacy control is prohibited
with no activation path.

| Participant | Native-program responsibility | Production credit | Prohibited authority |
| --- | --- | --- | --- |
| OpenAI Director | Intake, scope freeze, routing, packets, workload enforcement, cross-module QA, synthesis, evidence binding, midpoint/final reports, kickback and owner gates | No; control-plane QA is excluded | No product-code lane, self-approval, fabricated participation, external-account assumption or gate-free completion |
| Claude / FABLE 5 ULTRA/MAX | TypeScript authority, protocol, C++ table/runtime and composition root across all three chunks | 48 new immutable units after accepted code evidence | No edits outside owned paths, self-review, merge/release, spending, credential change or final acceptance |
| Cursor | Native XR hands/controllers, presence, MR/VR environment adapters and their focused tests | 4 new immutable units after accepted code evidence | No edits outside owned paths, cross-lane edits, self-review, merge/deploy/publish, spending or permissions |
| Grok | Session gateway, social/private-room, reconnect, host, voice/safety adapters, and the prospective clean-room HouseCore fallback | 17 capacity units; only canonical accepted packets earn credit | No edits outside owned paths, cross-lane edits, self-review, merge/deploy/publish, credentials, concealed data, or access to the quarantined Antigravity artifact |
| Gemini Antigravity | Historical isolated Long Table House queue/rotation/standings attempt produced from a closed public contract; exact rejected artifact remains quarantined | 0 accepted units for the exhausted assignment | No active repository path, private repository context, task prose, credentials, concealed state, cross-lane edits, review, external writes or acceptance |
| Perplexity | Existing public evidence for platform, comparable products, accessibility, audience, culture and rights | Existing 4 units; no duplicate query | No source/private context, code, vote, review verdict or external write |
| Firecrawl | Primary-source retrieval used to verify research | Tool, never a workforce provider | No vote, authorship or acceptance authority |
| GitHub | Canonical branch, commit, PR, check, review and release evidence | Tool | No substitution for human/device/rights/owner gates |
| Linear | Stage/chunk dependency and acceptance tracking after exact project/team verification | Tool | No use of unrelated team and no issue-as-implementation evidence |
| Slack | Project milestone notices and explicit decisions after isolated destination verification | Tool | No private state, credentials, concealed cards, rights records or provider prompts |
| Human rules council | Bid Whist authenticity, house rules, table rhythm and teaching transfer | Human evidence | No code or concealed-state authority |
| Target-audience/cultural advisors | Hospitality, dignity, comfort, accessibility, specificity and harm review | Human evidence | No advisor speaks for all Black Americans or all ages 30–70 |
| Owner | Product direction, external authority, human acceptance and merge/release decision | Final authority | Acceptance cannot erase failed safety, privacy, rights or platform gates |

## Non-overlapping ownership

- Claude: `packages/rules-core`, `packages/protocol`,
  `services/table-authority`, `Unreal/Source/LongTableProtocol`,
  `Unreal/Source/LongTableTable`, and `Unreal/Source/LongTable`.
- Cursor: `Unreal/Source/LongTableXR`, `Unreal/Content/Input`,
  `Unreal/Content/Presence`, and `Unreal/Content/Environment`.
- Grok: `services/session-gateway`, `Unreal/Source/LongTableSocial`,
  `Unreal/Content/Social`, and prospectively
  `Unreal/Plugins/LongTableHouseCore` under a fresh clean-room fallback packet.
- Antigravity: no active repository writer. Its isolated `LongTableHouseCore`
  candidate and frozen QA copies remain historical evidence only.
- OpenAI: read-only QA of candidate paths plus writes only under
  `director/native-program` and `artifacts/native-program` for findings,
  packets and evidence. Any code correction is kicked back to its owner.

The shared integration contract is frozen before dispatch. Providers may add
tests only within their owned module. They may not alter another provider's
header, schema, fixture, Build.cs, Blueprint, service or test. Integration
failures are findings, not permission to cross-write.

<!-- [[OpenAI Director | Codex | 2026-08-30 | 05:27 UTC | END]] -->
