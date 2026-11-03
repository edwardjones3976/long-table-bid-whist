<!-- [[Codex | GPT-5.6 | 2026-08-25 | 03:18 UTC | BEGIN]] -->
# Cursor assignment — LT-UI-CURSOR-01

- Repository: `edwardjones3976/long-table-bid-whist`
- Lane: isolated implementation worktree
- Base: exact commit containing the clean restart and tested game engine
- Goal: build the fresh physical room and complete human interaction surface on
  top of `src/game/index.ts` without altering the engine.
- Owned files: `src/App.tsx`, `src/main.tsx`, `src/styles.css`,
  `src/vite-env.d.ts`, `tests/app/App.test.tsx`, and `index.html` only.
- Read-only inputs: `src/game/**`, `docs/prototype-acceptance.md`,
  `docs/visual-spec.md`, `director/intake.md`.
- Forbidden: modifying `src/game/**`, `_restart_archive/**`, `sources/**`,
  provider credentials, commits/pushes, external messages, network calls, and
  every non-owned file.

## Required experience

1. First-person seated physical room composed from original CSS/HTML only:
   long wood-and-felt table, warm contemporary lounge, stable South/West/North/
   East positions, three open Meta-avatar anchors, and an unmistakably robotic
   optional AI dealer. No stock humans or demographic placeholders.
2. Setup with seed, `STRICT_TABLE_V1`, and AI Dealer/Human Host choice.
3. Full human path through auction, declaration, six-card discard, legal card
   preview/confirm, all twelve tricks, scoring summary, and next hand.
4. Opponent cards remain opaque counts/backs; no concealed labels in DOM.
5. Human Host drawer: private invite-code simulation, table mute, pause/resume,
   between-hand AI substitution note, Music Off, and external venue-playback
   guidance. No deal, score, forced-play, upload, stream, or void controls.
6. Accessibility drawer: high contrast, reduced motion, large cards, captions,
   effects/music off, one-click play. Mouse, touch, and keyboard buttons with
   visible focus and textual live status.
7. Responsive desktop/tablet/mobile layout that preserves the physical table.
8. Tests cover fresh setup, start, dealer/host mode, one legal auction commit,
   hidden-card DOM boundary, accessibility controls, and host authority surface.

Run the focused UI test and a production build. Return the Cursor completion
packet with exact files, commands, results, limitations, and status. Cursor may
not self-accept, merge, deploy, publish, or post to Slack.
<!-- [[Codex | GPT-5.6 | 2026-08-25 | 03:18 UTC | END]] -->
