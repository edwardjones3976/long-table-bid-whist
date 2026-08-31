# Claude foundation replacement 003 — primary transport evidence

- Assignment: `LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003`
- Provider/model: Claude Code `2.1.251`, `claude-fable-5`, effort `max`
- Authenticated run/session: `eb37d2e5-253f-456b-b2cb-63d40a367fbc`
- CLI result UUID: `7b160530-90ab-445f-a365-d9b4b19bdf4d`
- Exact seed: `623ca52c5679b5348630f86eb88ecd48c9db82a1`
- Exact seed tree: `746fc5ac7234fa49adaa728262e95745aee52755`
- Packet SHA-256: `85ba252916b6496045e64285a9da1d9cca4de34821bbc333f113f572694f9a80`
- Activation evidence SHA-256: `029dd1098c9189ef8c637e6e55d5ce7a9bcfea871483f9efd125bcc6e8601108`
- Transport: local print-mode CLI with Safe Mode, nonpersistent session, Chrome disabled, strict empty MCP configuration, skills disabled, no resume/fallback/subagent/network tools, and a bounded local tool allowlist
- Duration: `1,233,469` provider API milliseconds; `91` internal turns
- Provider-reported usage: `590` input, `374,823` cache-create input, `1,338,747` cache-read input, `135,545` output including `114,109` thinking tokens
- Provider-reported list-cost equivalent: `$15.623547`; this ran through the authenticated Claude Max subscription and is not evidence of an incremental API charge
- Terminal result: HTTP `429`, `You've hit your session limit`, reset stated as `7pm America/Los_Angeles`
- Web search/fetch: `0` / `0`
- External effects: none

The provider process ended with exit code `1` before a commit or
`model-result-packet-v1` object. The worktree remained at the exact seed and
contained one provider-authored, in-lease modification only:

- `services/table-authority/src/table.ts`
- `76` added and `15` removed lines
- binary diff SHA-256: `3de9147d2e0d115b2d028ec6825391970b961c8960849e74da3cd6616f455feb`
- `git diff --check`: clean

No prohibited path, path mode, remote ref, push, merge, browser, connector,
MCP, physical device, Slack, Linear, PR, issue, deployment, publication,
credential, permission, purchase, or license was changed.

The partial change is quarantined provider evidence, not a product candidate,
accepted outcome, workload credit, or milestone proof. The immutable packet
permits one transient recovery. Because the failure is an explicit time-gated
provider session limit, the same assignment may continue the exact partial only
after `2026-08-30T19:00:00-07:00`. There is no send before that reset and no
parallel or duplicate Claude dispatch.
