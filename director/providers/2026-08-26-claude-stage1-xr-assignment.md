<!-- [[OpenAI Director | GPT-5.6 | 2026-08-26 | 03:02 UTC | BEGIN]] -->
# Claude assignment — clean-room Stage 1 WebXR candidate

- **Assignment ID:** `LT-CLAUDE-S1-XR-002`
- **Repository:** `edwardjones3976/long-table-bid-whist`
- **Remote:** `https://github.com/edwardjones3976/long-table-bid-whist.git`
- **Windows worktree:** `<local path removed>`
- **Starting ref / base SHA:** `milestone/accepted-webxr-prototype@34de519fbe00110eadac911b55efd3b4475a5b35`
- **Branch:** `codex/claude-stage1-xr`
- **Lane:** isolated clean-room implementation
- **Handoff:** OpenAI Director via GitHub draft PR #1 and the Director-owned Slack Stage 1 thread
- **Slack thread:** <chat link removed>

## Isolation rule

The failed Cursor worktree is quarantined. Claude may not read, diff, import,
copy, or cherry-pick `_provider_worktrees/cursor-stage1-xr`. It must work only
from the exact clean base, the repository's own files, and the owner-supplied
Stage 1 requirements. This preserves a later Cursor independent-review lane.

## Scope and acceptance

Implement the bounded `RESTRICTED_TABLE_SLICE_0_1` candidate: one shared typed
preview/cancel/confirm controller for desktop and XR, a field-by-field
South/public projection with no root/private object references, pinned Three.js
controller ray/select targets, Confirm/Cancel, page-lifetime calibration,
closed lifecycle errors and exactly-once cleanup, honest build identity, and
focused automated tests including a full hand through the port.

No Stage 2/3 rules, multiplayer, Meta Avatars, voice, host music path,
credentials, deployment, push, merge, external post, or physical-Quest claim is
in scope. Claude must commit locally and return exact files, SHA, tests/build,
limitations, and a `COMPLETE`, `CHANGES_REQUIRED`, `SERIOUS_SAFETY_STOP`, or
`UNAVAILABLE` status.
<!-- [[OpenAI Director | GPT-5.6 | 2026-08-26 | 03:02 UTC | END]] -->
