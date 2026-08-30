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
| Claude / FABLE 5 ULTRA/MAX | TypeScript authority, protocol, C++ table/runtime and composition root across all three chunks | 48 scope-forecast units only; each accepted packet earns only its immutable canonical points | No edits outside owned paths, self-review, merge/release, spending, credential change or final acceptance |
| Cursor | Native XR hands/controllers, signed-in-presence adapter/fallback, MR/VR environment adapters and focused integration tests | 4 scope-forecast units only; current broad packet is medium/5 and remains pending | No edits outside owned paths, cross-lane edits, self-review, merge/deploy/publish, spending or permissions |
| Grok | Clean-room HouseCore, session gateway, social/private-room, reconnect, host and voice-off/safety adapters | 17 scope-forecast units only; actual canonical packets earn credit after OpenAI acceptance | No edits outside owned paths, cross-lane edits, self-review, merge/deploy/publish, credentials, concealed data, or access to the quarantined Antigravity HouseCore artifact |
| Gemini Antigravity | Historical rejected HouseCore attempt plus a separately prestaged public-synthetic robot-dealer presentation plugin | Historical assignment zero; new packet earns only its immutable canonical points after OpenAI acceptance and later Cursor integration | No private repository context, credentials, concealed state, cross-lane edits, self-review, merge, external writes or acceptance |
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
- Antigravity: `Unreal/Plugins/LongTableRobotDealer` only through the accepted
  source-only artifact produced in its isolated public-synthetic sandbox. Its
  old `LongTableHouseCore` candidate and frozen QA copies remain quarantined
  historical evidence and are never an input to the new lane.
- OpenAI: read-only QA of candidate paths plus writes only under
  `director/native-program` and `artifacts/native-program` for findings,
  packets and evidence. Any code correction is kicked back to its owner.

The shared integration contract is frozen before dispatch. Providers may add
tests only within their owned module. They may not alter another provider's
header, schema, fixture, Build.cs, Blueprint, service or test. Integration
failures are findings, not permission to cross-write.

For Claude R1, the one-writer lease also carries forward the exact engine and
auxiliary paths listed in `LT-NATIVE-CLAUDE-001-R1.json`: `Unreal/LongTable.uproject`,
`Unreal/Config/**`, the two direct `Unreal/Source/*.Target.cs` files,
`fixtures/protocol/**`, `scripts/native/**`, and `.github/workflows/native-ci.yml`.
No later provider may edit those accepted dependencies.

<!-- [[OpenAI Director | Codex | 2026-08-30 | 05:27 UTC | END]] -->
