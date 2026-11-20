# The Long Table — project rollout packet

This packet follows the `director-orchestrator@a1896d7bf6b91508596947ab56137528182b3cc0` project-rollout template. It records the present analysis/debate boundary and does not activate a runtime or copy credentials from another deployment.

## Project and deployment identity

- **Project ID/name:** `long-table` / The Long Table — Bid Whist
- **Repository/ref/worktree:** `edwardjones3976/long-table-bid-whist`; frozen browser candidate `ddb8244763a2e6e68499adc53ff0be96e5a2cccb`; candidate worktree `<local path removed>`
- **Deployment intent:** `analysis_only` for the grand rebaseline committee; existing GitHub Pages candidate is separate evidence
- **Concurrent with other active Director deployments:** `unknown`
- **Deployment profile:** `pending`; the observed local health surface does not expose the exact ignored profile identity
- **Compose namespace:** `pending`
- **State namespace:** `pending`
- **Ports and volumes:** observed health at `127.0.0.1:38080`; exact project-specific port/volume binding remains `pending`

## Allowlists and execution boundaries

- **Project allowlist:** `long-table` observed; exact deployed allowlist digest pending
- **Repository allowlist:** `edwardjones3976/long-table-bid-whist`
- **Starting-ref allowlist:** `main` plus the frozen candidate branch only when explicitly approved; exact deployed list pending
- **Data classification:** `mixed`; public product research plus private operational/provider records
- **External effects:** current committee is analysis/documentation only; GitHub/Slack updates require their existing scoped project routes and current gates
- **Paid execution:** disabled in the observed Director health surface; no gate override
- **Automerge/deployment/publication:** disabled

## Slack isolation

- **Workspace ID:** `pending`
- **Slack owner-user allowlist reference:** `pending`; never copied from another profile
- **Runtime channel allowlist:** existing project thread channel `<chat channel removed>` is known, but dedicated-channel verification is pending
- **Dedicated Slack app display name:** `pending`
- **Slack app ID:** `pending`
- **Slack bot user ID:** `pending`
- **Slack app manifest SHA-256:** `pending`
- **Installation status:** `pending`
- **Socket Mode status:** `pending`
- **Dedicated project channel ID:** `pending`
- **Bot membership:** `pending`
- **App-token secret reference:** `SLACK_APP_TOKEN` in the ignored deployment profile
- **Bot-token secret reference:** `SLACK_BOT_TOKEN` in the ignored deployment profile
- **Concurrent-deployment collision check:** `pending`

Missing or unverified isolation permits analysis-only shaping but blocks Slack gateway activation. No credential, app identity, state namespace, or channel is borrowed from Edge Engine, Project Uppercut, or another deployment.

## Provider and workflow readiness

- **Providers enabled:** observed health reports OpenAI Director, Claude, Cursor, Gemini, Grok, Perplexity, and Slack configured; exact deployment/commit binding unavailable
- **Budget and timeout:** paid Director runs disabled; individual owner-requested CLI debate calls followed bounded one-position/one-rebuttal scopes
- **n8n/workflow identity:** `pending`
- **Callback and internal-secret status:** health reports Claude callback and internal auth configured; exact references pending
- **Usage-monitor status:** disabled

## Activation evidence

- **Profile collision check:** pending
- **Slack app/channel verification:** pending
- **Off-channel event rejection:** pending
- **Non-owner event rejection:** pending
- **Replayed event handling:** pending
- **Cross-deployment isolation:** pending
- **Paid-disabled health check:** `GET http://127.0.0.1:38080/health` returned `ok=true`, `paid_runs_enabled=false`, `live_provider_dispatch=false`
- **Slack intake dry run:** pending
- **n8n route check:** pending
- **Provider checks:** current committee provider sessions are recorded in `director/committee/2026-08-29-grand-rebaseline-independent-positions.md`
- **Restart/recovery check:** not applicable to analysis-only committee
- **Exact configuration identity:** pending; health did not expose a deployed commit/digest

## Communication fallback

Each Slack delivery gets one primary attempt, one plausibly transient recovery, and a third attempt only with new information or a materially different transport. An ambiguous side effect is reconciled before any retry. Until isolation is verified, durable local committee artifacts and the existing GitHub Issue #2 are the communication fallback.

## Rollback

- **Stop command or action:** no project runtime was activated by this packet
- **Configuration rollback:** no configuration changed
- **State restore:** no project runtime state changed
- **Slack rollback:** no gateway/app activation occurred
- **Evidence retained:** Firecrawl research artifacts, Perplexity session URL, provider session/run IDs, committee records, GitHub Issue #2, and exact candidate SHA

## Disposition

- **Current state:** `analysis_only`
- **Blocking fields:** dedicated Slack app/channel/profile/state identities; collision evidence; exact deployed configuration identity; provider/worker activation gates
- **Next responsible party:** Director and owner
- **Next bounded action:** approve the reshaped native-first product direction before any implementation assignment
