# Cursor assignment — Stage 1 WebXR interaction spine

- **Assignment ID:** `LT-S1-XR-001`
- **Recorded at:** `2026-08-26T02:38:25Z`
- **Repository:** `edwardjones3976/long-table-bid-whist`
- **Remote:** `https://github.com/edwardjones3976/long-table-bid-whist.git`
- **Windows worktree:** `<local path removed>`
- **WSL worktree:** `<local path removed>`
- **Starting ref / base SHA:** `milestone/accepted-webxr-prototype@34de519fbe00110eadac911b55efd3b4475a5b35`
- **Branch:** `codex/cursor-stage1-xr`
- **Lane:** isolated implementation
- **Handoff:** OpenAI Director through the Long Table Slack Stage 1 thread and GitHub draft PR #1
- **Slack thread:** <chat link removed>

## Write scope

- `src/game/model.ts` only where the restricted manifest identifier or shared action types require it
- a new interaction/projection module under `src/game/`
- `src/game/index.ts`
- `src/xr/session.ts`
- `src/App.tsx`
- focused tests under `tests/game/`, `tests/xr/`, and `tests/app/`
- `package.json` and `package-lock.json` only to pin `three` and `@types/three` at `0.165.0`

Do not edit `sources/`, provider governance, Stage 2/3 implementation, host music, multiplayer, voice, Meta Avatars, deployment credentials, or unrelated presentation work.

## Required behavior

1. Rename the active rules slice to `RESTRICTED_TABLE_SLICE_0_1`; levels 3–6 High/Low remain the only legal bids and Level 7/No-Trump remain visibly unavailable.
2. Route desktop and XR through one typed preview/cancel/confirm intent controller with idempotent input IDs.
3. Construct the XR projection field-by-field. It must contain South's card views and public/count data only; it must never retain or serialize `GameState`, seed, other hands, kitty contents, discard identities, private events, or host records.
4. Replace the static XR room with the smallest Three.js scene that supports either Quest Touch controller, targeting-ray hover/select, typed target intents, Confirm and Cancel, and in-session calibration controls.
5. Preserve committed game state across XR exit/re-entry, clear uncommitted preview, make lifecycle cleanup/idempotent end explicit, and expose closed error codes.
6. Keep the desktop fallback working and label the robot `AI Dealer — Table Guide`; host controls remain local non-network demonstration only.

## Acceptance checks

- interaction reducer tests cover preview, cancel, confirm, illegal actions, seventh discard rejection, duplicate IDs, and double confirm;
- projection tests assert an exact key allowlist and counterfactual concealed-card isolation;
- XR tests cover options, calibration bounds, controller event identity, cleanup, and idempotent end where practical without a headset;
- existing complete-hand and browser tests remain green;
- `npm test` and `npm run build` pass;
- Cursor returns a verifiable commit and the required completion packet;
- stop before push, PR update, review, merge, deployment, or any Quest-ready claim.
