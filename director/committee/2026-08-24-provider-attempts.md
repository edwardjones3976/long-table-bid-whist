# Provider participation and availability — LT-REB-20260824

## Actual participation

| Provider | Assignment | Result | Authenticated model output | Incremental cost | Credited production |
| --- | --- | --- | --- | ---: | ---: |
| OpenAI Participant/Director | `LT-COM-OPENAI-01` | Independent position frozen; Director workflow active | yes | $0 | control plane excluded |
| External OpenAI/Codex | accelerated prototype | Owner-authorized implementation, integration, testing, and documentation | yes | $0 | 100% of completed direct production |
| Claude Code 2.1.239 | `LT-COM-CLAUDE-01` | `UNAVAILABLE`: installed subscription/OAuth profile had an expired access token | no | $0 | 0% |
| Cursor Agent 2026.08.11 | `LT-COM-CURSOR-01` | `UNAVAILABLE`: installed CLI required login or a configured API key | no | $0 | 0% |
| Gemini/Antigravity | `LT-MECH-AGY-01` | `UNAVAILABLE`: neither `agy` nor a Gemini CLI/Interactions adapter was installed | no | $0 | 0% |
| Perplexity CLI 2026.07.30 | `LT-RES-PPLX-01` | `UNAVAILABLE`: official CLI existed but had no approved API credential | no | $0 | 0% |

## Attempt evidence and retry decisions

- Every repository-provider launch was preceded by verification of repository
  `edwardjones3976/long-table-bid-whist`, Windows worktree, WSL path, `main`,
  base SHA `c9613093af704fdd3e4bedf87bdf375e15d03f00`, remote, and dirty state.
- Claude's first invocation stopped locally because a zero value is not valid
  for its budget guard. The one allowed minimal-fix retry occurred only after a
  sanitized authentication check confirmed subscription/OAuth rather than API-
  key billing. That retry returned HTTP 401 for an expired OAuth token before a
  model response. No further retry or reauthentication was attempted.
- Cursor returned an authentication-required error before a model response. No
  login flow, API-key request, or duplicate dispatch was initiated.
- WSL was checked through an approved read-only capability probe. `agy` and
  `gemini` were absent. No software was installed.
- The fresh Perplexity evidence packet at
  `director/research/perplexity/2026-08-24-webxr-prototype-attempt.md` already
  records the official-CLI authentication failure. It was reused instead of
  issuing a duplicate request with the same expected failure.
- Browser sessions were not substituted for provider APIs or CLIs. No provider
  position, vote, rebuttal, verdict, usage, or cost is inferred from an install
  check or failed authentication.

## Workload accounting

The canonical direct-production targets remain Claude 60%, Cursor 28%,
Gemini/Antigravity 7%, Perplexity 4%, and separately authorized external
OpenAI/Codex 1%. For this accelerated prototype cycle the actual completed
direct production is `0/0/0/0/100`, a `+99 percentage-point` OpenAI/Codex
deviation. This is an owner-directed exception and provider-availability fact,
not a change to the target or a reason to manufacture compensating work.
