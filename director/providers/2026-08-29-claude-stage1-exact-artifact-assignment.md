<!-- [[OpenAI Director | GPT-5.6 | 2026-08-30 | 02:15 UTC | BEGIN]] -->
# `LT-CLAUDE-S1-DEPLOY-003` — Stage 1 exact-artifact Pages packet

## Authority and baseline

- **Repository:** `edwardjones3976/long-table-bid-whist`
- **Clean worktree:** `C:\Users\edwar\.codex\worktrees\long-table-stage1-pages`
- **Branch:** `codex/stage1-exact-artifact`
- **Exact base:** `bb94bbd65c1c551b02b0e99937037a5c14161548`
- **Provider:** Claude Code, sole implementation writer for this packet
- **Budget:** existing authenticated subscription only; `$0` incremental spend
- **Workload policy:** `v1`; `implementation`; `medium`; 5 immutable effort points
- **Required model label:** `FABLE 5 ULTRA/MAX`
- **Provisional workload:** 5 Claude units, credited only for a tested committed handoff

The accepted direct-production ledger before this packet is 45 units: Claude
24, Cursor/Grok 16, Gemini/Antigravity 0, Perplexity 4, and external
OpenAI/Codex 1. Five accepted Claude units would produce 29 of 50 credited
units (58.0%), inside Claude's 60% +/-3-point normal band and below its 65%
hard ceiling. Cursor/Grok receives no assignment because its current 35.6%
share exceeds its 33% hard ceiling. Perplexity receives no assignment because
its current share is already above normal tolerance. Antigravity remains
unavailable from the prior bounded route. Director coordination is excluded
from direct-production credit.

## Objective

Close the code-controlled part of the Stage 1 hosting/build-identity gate:
GitHub Actions must build the exact candidate once, inject the full commit SHA,
record a deterministic content digest, upload the already-built `dist`, and
deploy that same Pages artifact without rebuilding.

## Owned surface

- `.github/workflows/prototype-ci.yml`
- `vite.config.ts` only if a Pages base-path setting is required
- `index.html` for fixed full-SHA metadata
- focused tests or validation scripts directly required to prove this packet

Do not change game rules, table/XR behavior, styles, provider governance outside
this packet, dependencies, music/voice/network behavior, or product labels.

## Required behavior

1. Preserve pull-request CI and its locked install, full test, and production
   build.
2. Build with `VITE_BUILD_SHA` equal to the 40-character `github.sha`.
3. Expose the full SHA through fixed HTML metadata while retaining the existing
   desktop/XR short-SHA display and honest local-development fallback.
4. Support the GitHub Pages project path without breaking local root hosting.
5. Produce a deterministic SHA-256 content manifest/digest for `dist` and place
   the digest in the workflow summary or an uploaded evidence artifact.
6. Upload the already-built `dist` with the supported Pages artifact action.
7. Make the deploy job depend on that build job and deploy the same uploaded
   artifact with no second checkout, install, test, or build.
8. Restrict deployment to the accepted milestone branch and/or explicit manual
   dispatch; pull requests must never deploy.
9. Use least-privilege job permissions and the GitHub Pages environment.
10. Do not add credentials, analytics, accounts, uploads, private data, or a
    fallback service.

## Evidence and completion packet

- Confirm the exact base before editing.
- Run the repository's full test suite and production build with a 40-character
  test SHA.
- Perform a workflow syntax/structural check that proves one build and no
  deploy-time rebuild.
- Inspect the built HTML to prove the injected full-SHA metadata and Pages asset
  paths.
- Commit the bounded changes locally with contribution attribution.
- Return exact head SHA, changed files, commands and results, digest evidence,
  limitations, and `COMPLETE`, `INCOMPLETE`, `UNAVAILABLE`, or
  `SERIOUS_SAFETY_STOP` for this assignment only.

## Prohibitions and retry contract

- No push, deployment, PR mutation, merge, tag, Slack/Linear/GitHub post,
  permission change, physical-Quest claim, or project-completion verdict.
- No reading the dirty primary worktree or unrelated repositories.
- One primary attempt and one recovery attempt. This immutable correction is
  recovery 1 because the Director learned after dispatch that PR76 classifies
  this packet as medium/5 and requires Fable 5 Ultra/Max. A third attempt
  requires materially new information or a genuinely different transport;
  otherwise mark the route unavailable.
- Any ambiguous external dispatch or write stops the route; do not repeat it.

<!-- [[OpenAI Director | GPT-5.6 | 2026-08-30 | 02:15 UTC | END]] -->
