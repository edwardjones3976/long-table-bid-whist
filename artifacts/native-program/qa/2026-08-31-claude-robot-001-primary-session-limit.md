<!-- [[OpenAI Director | Codex | 2026-08-31 | 05:56 UTC | BEGIN]] -->
# Claude RobotDealer primary — temporary session-limit stop

## Disposition

`LT-NATIVE-CLAUDE-ROBOT-001` sequence 25 remains non-terminal. The first local
launch was rejected before provider contact because the strict empty MCP
configuration lacked the required `mcpServers` record. Correcting only that
launcher shape initiated the authorized primary; it is not a provider retry and
earned no separate workload row.

Authenticated Claude Code session
`884ec743-eb98-45ee-8d3f-5726e79381f3` then ran `claude-fable-5` at high effort
for 1,057,930 ms, used no web search/fetch and spawned no subagent. It created
thirteen source-only files below the sole writable `LongTableRobotDealer/**`
path. The service returned HTTP 429 session-limit exhaustion before Claude made
the required provider commit or emitted a schema-bound `structured_output`.

The failure is explicit and temporary: the provider says the session allowance
resets at 12:00 AM America/Los_Angeles. One preauthorized transient recovery
remains. It may continue only from this frozen uncommitted working tree after
the reset, under the same assignment, authority digest and contribution
boundary. There is no source-revision packet, alternate implementation input,
normalization, result-only retry, second workload row or direct-production
credit.

## Bound state

- Control activation: `fb72957924eaf7a23fd44444b1b85bd8af2c3068`
- Synthetic authority HEAD: `39087f750c7af361393feb32926ea898f9dccecb`
- Synthetic authority tree: `4085ca20ee26e081e0405d4820f3503c8f595b1c`
- Sandbox: `C:\Users\edwar\.codex\provider-sandboxes\lt-robot-dealer-claude-002-clean`
- Branch: `codex/claude-robot-cleanroom-002`
- Provider commit: absent; HEAD remains the OpenAI authority root
- Working status: exactly one untracked `LongTableRobotDealer/` subtree
- Canonical public contract SHA-256:
  `56299bb63a352560f2a40fc1115db1eb276e87ada719054959b33498aef80c52`
- Result schema SHA-256:
  `ebadc5bc45462ffa63ca5e6b28c09d1ccf86086389324a0c88f704bb14208d9c`
- Sorted working-file manifest SHA-256:
  `3fba90f9e9c782da2363272f8515d80eff0530a57e6e3588df5d84f14e8a1989`
  over 1,995 UTF-8 bytes with one LF after every manifest row
- Generated-artifact scan: empty
- Required-test name scan: all fifteen exact `LongTable.RobotDealer.*` IDs are
  present in the provider test source
- Fresh outer contribution-marker scan: present on every `.h`, `.cpp`, `.cs`
  and `.md` file; `.uplugin` remains tag-free

## Frozen working-file manifest

```text
LongTableRobotDealer/LongTableRobotDealer.uplugin|716|59f542394792d89c7dc045ef70019f6033c9dd3ad7090f9b47cee4faafeb403f
LongTableRobotDealer/README.md|10799|445d412fd5c48c51285ba10b3db10608a962bf0738fbb5eb1d896050b1346155
LongTableRobotDealer/Source/LongTableRobotDealer/LongTableRobotDealer.Build.cs|790|6bb9273acf9b30904d7473985daa1d2e3ef40a780a2c831df5d6cf515b0a6a37
LongTableRobotDealer/Source/LongTableRobotDealer/Private/LongTableRobotDealerComponent.cpp|4702|a6236721a731ed1d85b57f76585ee7d63944a64144f1a9e7fd874e2f66ec12e4
LongTableRobotDealer/Source/LongTableRobotDealer/Private/LongTableRobotDealerCueInterface.cpp|5034|07a20c6890ffac0ddbc52fe477611deca936c3432fa225d338624a6f40bd1bf3
LongTableRobotDealer/Source/LongTableRobotDealer/Private/LongTableRobotDealerModule.cpp|658|f343e4807fc6a976bb14e1523d26addd8f5fa7408c5d69706940daf839104360
LongTableRobotDealer/Source/LongTableRobotDealer/Private/LongTableRobotDealerStateMachine.cpp|5774|3bb3d5bf8305b6ec13c9d97076accb180629e67ac82aba4adda077a3355052e2
LongTableRobotDealer/Source/LongTableRobotDealer/Private/Tests/LongTableRobotDealerTestListener.cpp|400|fefcab0c10ee4475f734fb6d96006561dd142059f1b804b452ec748a5611b1ae
LongTableRobotDealer/Source/LongTableRobotDealer/Private/Tests/LongTableRobotDealerTestListener.h|947|9fe1e840d77c79ebe82dcac9d8c6396e703f5dcc1f24b7aba3c30cd003277676
LongTableRobotDealer/Source/LongTableRobotDealer/Private/Tests/LongTableRobotDealerTests.cpp|84126|fd514e9542b87cd75db29603a87fa23a39af4c16373cd35361784b7accde5c32
LongTableRobotDealer/Source/LongTableRobotDealer/Public/LongTableRobotDealerComponent.h|4397|ef524a44dd9c4a5361b2cbbd088e95ae42e6e63362160d26a8b456d966b31c83
LongTableRobotDealer/Source/LongTableRobotDealer/Public/LongTableRobotDealerCueInterface.h|7787|3846e7e7bf6e65c98b4f7d62a1cb523512a5717f9cae02afc7ca08b887df96cb
LongTableRobotDealer/Source/LongTableRobotDealer/Public/LongTableRobotDealerStateMachine.h|4741|a2a54790cc1689c262fe2b14b5ceb089a5ac87269885724e4d1cb380a6d2c757
```

## Exact CLI terminal wrapper

The exact UTF-8 wrapper below, including its final LF, is 2,045 bytes with
SHA-256 `f749669ad260baa58d999ef735ee31e30e72c32716baec302492a6d6b1852f0e`.
The reported `$7.912729` value is Claude CLI list-cost telemetry; OpenAI did not
perform a purchase and has not independently verified it as an account charge.

```json
{"duration_api_ms":1058129,"stop_reason":"stop_sequence","session_id":"884ec743-eb98-45ee-8d3f-5726e79381f3","total_cost_usd":7.912728999999999,"usage":{"input_tokens":340,"cache_creation_input_tokens":95443,"cache_read_input_tokens":191992,"output_tokens":116031,"output_tokens_details":{"thinking_tokens":48270},"server_tool_use":{"web_search_requests":0,"web_fetch_requests":0},"service_tier":"standard","cache_creation":{"ephemeral_1h_input_tokens":95443,"ephemeral_5m_input_tokens":0},"inference_geo":"not_available","iterations":[{"input_tokens":56,"output_tokens":48592,"cache_read_input_tokens":81053,"cache_creation_input_tokens":14390,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":14390},"type":"message"}],"speed":"standard"},"modelUsage":{"claude-haiku-4-5-20251001":{"inputTokens":6837,"outputTokens":18,"cacheReadInputTokens":0,"cacheCreationInputTokens":0,"webSearchRequests":0,"costUSD":0.006927,"contextWindow":200000,"maxOutputTokens":32000,"canonicalModel":"claude-haiku-4-5","provider":"firstParty","costBasis":"list"},"claude-fable-5":{"inputTokens":340,"outputTokens":116031,"cacheReadInputTokens":191992,"cacheCreationInputTokens":95443,"webSearchRequests":0,"costUSD":7.9058019999999996,"contextWindow":1000000,"maxOutputTokens":64000,"canonicalModel":"claude-fable-5","provider":"firstParty","costBasis":"list"}},"permission_denials":[],"terminal_reason":"api_error","fast_mode_state":"off","fast_mode_disabled_reason":"sdk_opt_in_required","subagent_stats":{"spawned":0,"requested":{"background":0,"foreground":0,"unset":0},"started_in_background":0,"max_depth":0,"spawned_by_subagents":0,"completed":0,"failed":0,"killed":{"parent":0,"user":0,"system":0},"refused":{"depth_limit":0,"concurrency_limit":0,"budget":0},"by_type":{}},"is_error":true,"num_turns":20,"subtype":"success","api_error_status":429,"result":"You've hit your session limit · resets 12am (America/Los_Angeles)","type":"result","duration_ms":1057930,"uuid":"aca5dc2c-08d5-4895-a46f-80bec2d4c2a4","queued_turn_count":0}
```

## Recovery and QA boundary

After the reset, the one allowed recovery may read only the immutable authority
files plus its own current `LongTableRobotDealer/**` files, finish or commit
within that same subtree and return the original schema-bound result. OpenAI
must compare the pre-recovery manifest, inspect the exact provider commit and
independently materialize unchanged provider bytes onto accepted foundation
`4d26680` before any compile, test, direct-production or integration claim.

<!-- [[OpenAI Director | Codex | 2026-08-31 | 05:56 UTC | END]] -->
