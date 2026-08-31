<!-- [[OpenAI Director | Codex | 2026-08-31 | 16:08 UTC | BEGIN]] -->
# Sequence 27 RobotDealer fallback workload gate

## Verdict

`NO_ELIGIBLE_PROVIDER`

Sequence 26 is terminal zero-credit because its primary never completed the
prompt boundary and its sole recovery failed before provider-process creation.
It therefore does not enter or roll the credited assignment window. A fresh
medium/5 fallback would still begin from the complete rolling 20 after
sequence 25, roll out sequence 2 Antigravity long/8, and add five points for
the prospective provider.

The post-rollout, pre-candidate base is Claude 30, Cursor 20, Grok 18, OpenAI
5, Antigravity 4, Perplexity 0 and GitHub Copilot CLI 1: 78 points. Every
medium candidate has denominator 83.

| Prospective provider | Medium/5 share | Normal band | Hard ceiling | Gate |
| --- | ---: | ---: | ---: | --- |
| Claude | 35/83 = 42.1687% | 33–39% | 41% | Blocked: 1.1687 percentage points above hard |
| Cursor | 25/83 = 30.1205% | 17–23% | 25% | Blocked: 5.1205 percentage points above hard |
| Grok | 23/83 = 27.7108% | 17–23% | 25% | Blocked: 2.7108 percentage points above hard |
| GitHub Copilot CLI | 6/83 = 7.2289% | 0–4% | 6% | Blocked: 1.2289 percentage points above hard |
| Gemini Antigravity | 9/83 = 10.8434% | 8–14% | 16% | Workload-pass, but its sole recovery failed and the route/lease are closed |
| OpenAI | 10/83 = 12.0482% | 5–11% | 13% | Workload-pass, but OpenAI is QA-only and owns no product-code lane |
| Perplexity | 5/83 = 6.0241% | 1–7% | 9% | Workload-pass, but Perplexity is research-only and code is prohibited |

No additional coding provider is admitted by the configured ledger. An
unlisted provider has neither a target nor assignment authority and therefore
fails closed. Even a hypothetical zero-percent target would yield 5/83 =
6.0241%, above a target-plus-five hard ceiling.

Claude has no active RobotDealer lease and no retry; Cursor's correction route
is terminal; Grok has no current writer lease and its prior routes are closed;
GitHub Copilot CLI has no current lease or retry; Antigravity's failed sole
recovery closes sequence 26. A fresh fallback packet is prohibited until the
credited workload state changes or the owner explicitly changes the governing
target/cap policy. OpenAI remains QA-only and cannot author the missing product
code to bypass this gate.
<!-- [[OpenAI Director | Codex | 2026-08-31 | 16:08 UTC | END]] -->
