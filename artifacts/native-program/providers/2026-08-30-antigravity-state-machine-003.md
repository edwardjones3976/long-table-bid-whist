# Antigravity state-machine scaffold evidence

- Assignment: `LT-NATIVE-ANTIGRAVITY-STATE-MACHINE-003`
- Provider/model: Gemini Antigravity / `gemini-3.1-pro-high`
- Exact merged Director request digest: `sha256:e70126a93937cfd4a7a7a8a0d5566583a010efc1291f3fe64778e4e449ce982b`
- Project: `838146d6-6d8e-4770-af16-a3bad5947203`
- Conversation: `77080670-8270-40e5-bb25-7a2ded7eff3a`
- Created: `2026-08-30T23:43:19Z`
- Terminal status: `SUCCESS`
- Duration / turns: `18.7510454` seconds / 1
- Usage: 20,155 input; 2,547 output; 1,558 thinking; 0 cache-read; 22,702 total tokens
- Response UTF-8 bytes / SHA-256: 3,982 / `5e745c62cb132d0094f4b46e9d4811fc3eeb5670ba8cfeaeae92a13bf4f2c253`
- Local transcript SHA-256: `46a6b849e561478628d10f2969e134bae3e3fcc20feed32c606499e6e1f8f158`
- Sandbox base/head: `9b23b75ca78a884b2221b41c65305a1b5a9b0770`
- Sandbox changed files: none

## Transport reconciliation

The first local command stopped before model execution because the explicit
`--effort low` conflicted with model label `gemini-3.1-pro-high`. It returned an
empty conversation ID, duration zero, zero turns and zero tokens. The new
project had nevertheless been created, so the corrected command reused exact
project `838146d6-6d8e-4770-af16-a3bad5947203`, removed only the conflicting
local flag and sent the same canonical request. This is a pre-submit transport
correction, not a second model request or ambiguous paid retry.

The directly recorded user turn canonicalizes to the committed request digest.
No Long Table task text, acceptance criteria, repository data, owner identity,
prior provider output or private context appeared in the request.

## OpenAI QA

The 93-line TypeScript scaffold contains:

- one six-value generic order-state enum;
- one complete legal-transition table;
- one context interface;
- six transition handlers whose business bodies remain explicitly unimplemented;
- one evidence note distinguishing reasoning from executed work.

The provider reported no compiler, command or external execution. Independent
inspection confirms that the sandbox stayed clean and no file, network, Git,
permission or external side effect occurred. The scaffold meets the exact
fixed-vocabulary assignment. It is accepted as subordinate advisory evidence,
not as Long Table product code, review, merge or release authority.

- Overall-effort points: 1
- Direct-production points: 0
- Revision/retry: none after the one real model turn
- Handoff: available to a primary provider for independent adaptation or rejection
