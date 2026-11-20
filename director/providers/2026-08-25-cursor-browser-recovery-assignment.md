<!-- [[Codex | GPT-5.6 | 2026-08-25 | DIRECTOR | BEGIN]] -->
# Cursor acceleration packet — `LT-CURSOR-PRE-01`

## Identity and accounting

- Repository: `edwardjones3976/long-table-bid-whist`
- Provider: authenticated Cursor CLI
- Lane: isolated `provider/cursor-browser-recovery` worktree
- Exact base: the Director commit containing this packet
- Allocation: 8 of Cursor's existing 28 direct-work units; this is a schedule
  acceleration, not a workload transfer
- Purpose: produce the browser half of the paired interaction proof while the
  Unity/OpenXR and rules-authority prerequisites are unresolved

## Owned files

- `src/App.tsx`
- `src/main.tsx`
- `src/styles.css`
- `src/vite-env.d.ts`
- `tests/app/App.test.tsx`
- `index.html`
- `vite.config.ts` only if required to exclude `_provider_worktrees/**` from
  test discovery

All other paths are read-only. Do not change `src/game/**`, `tests/game/**`,
`director/**`, `sources/**`, credentials, Git metadata, or package versions.
Do not commit, push, post externally, install software, or make network calls.

## Required inputs

Read only:

- `director/intake.md`
- `director/research/2026-08-25-perplexity-firecrawl-evidence.md`
- `director/committee/2026-08-25-counter-bias-and-conclusion.md`
- `director/evidence/2026-08-25-browser-reference-validation.md`
- `director/rules/2026-08-25-strict-table-v1-human-review-checklist.md`
- `docs/prototype-acceptance.md`
- `docs/visual-spec.md`
- public exports from `src/game/index.ts`

Do not inspect or reuse `_restart_archive/**` or the Director worktree's
untracked UI draft. Build this surface afresh from the retained notes.

## Required experience

1. A first-person, seated, four-place physical room with a stable long table,
   warm restrained lounge materials, readable cards, three open Meta-avatar
   anchors, and a clearly robotic dealer. Do not create demographic characters.
2. Setup offers `AI Dealer` or `Human Host` and explains the separate authority
   boundaries before the hand begins.
3. One complete setup-to-score human path: auction, declaration, kitty/discard,
   preview/cancel/confirm card play, twelve tricks, score, and a working next
   hand.
4. Opponent cards remain opaque backs/counts. Do not expose the shuffle seed or
   concealed card labels in rendered DOM, logs, captions, status, or AI copy.
5. Until experienced-player review resolves the seven-bid/kitty-book rule, do
   not present level 7 as a selectable contract. Label the table as a
   `STRICT_TABLE_V1 working draft`, not a frozen manifest.
6. Human Host controls include private invite-code simulation, table mute,
   between-hand pause/resume behavior, block, leave, report, constrained remove,
   reconnect status, and between-hand AI substitution. The host cannot inspect
   hands, alter cards/bids/tricks/score, force play, or void a committed hand.
7. Music defaults Off. Bundled audio is absent. Host playback guidance says it
   remains external, private-room, unrecorded, and rights-dependent; do not add
   upload, cache, stream, or recording controls.
8. Accessibility includes high contrast, reduced motion, large cards, captions,
   effects/music off, one-click play, visible focus, a live status region, and
   mouse/touch/keyboard operability.
9. Avoid runtime web fonts, stock images, third-party scripts, and remote assets.

## Acceptance checks

- Fresh-render setup and both dealer/host choices are tested.
- A legal auction action uses preview and confirmation.
- No level-7 control is rendered.
- Opponent card faces, concealed labels, and seed are absent from rendered DOM.
- Host authority boundaries and accessibility controls are tested.
- Next hand advances the visible hand/dealer state.
- UI test file passes exactly once; provider worktrees are not rediscovered.
- Production build succeeds.

Return a completion packet containing the exact base SHA, changed files,
commands and results, limitations, and one of `REVIEW_READY`, `BLOCKED`, or
`FAILED`. Cursor does not self-accept, merge, deploy, or publish.
<!-- [[Codex | GPT-5.6 | 2026-08-25 | DIRECTOR | END]] -->
