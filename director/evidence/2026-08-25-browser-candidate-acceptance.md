<!-- [[Codex | GPT-5.6 | 2026-08-25 | DIRECTOR | BEGIN]] -->
# Browser candidate acceptance — `LT-CURSOR-PRE-01`

## Exact identity

- Repository: `edwardjones3976/long-table-bid-whist`
- Worktree: `_provider_worktrees/cursor-browser-recovery`
- Branch: `provider/cursor-browser-recovery`
- Accepted candidate: `edfc044f54959462c659541bd78564ea4e79869e`
- Cursor implementation commit: `1248a0a6391b5f7f044f49a220122b0c7a26d5d5`
- Cursor kickback commit: `5332c66a9d6cf07a90d6841a9320686eaac8e72c`
- OpenAI acceptance correction: `edfc044f54959462c659541bd78564ea4e79869e`
- Worktree state at evidence capture: clean; Git emitted only an inaccessible
  global-ignore warning.

## Provider history

Cursor's first recovery candidate passed its initial tests and build. Independent
review found pause available during auction and inert Block/Report/Leave
controls. The first kickback fixed those issues but its first focused run failed
2 of 11 tests before passing 11/11, 17/17 full, and build. Claude and Gemini
Chrome review produced `CHANGES_REQUIRED_BROWSER_PROOF`.

Cursor's second kickback added conditional drawer rendering, leave
confirmation, an observable local block marker, honest local-only report copy,
the pause explanation, and a visual remove-to-AI handoff. Its first focused run
failed 2 of 13 selector assertions, then passed 13/13, 19/19 full, and build.

Independent OpenAI review found the AI-seat marker disappeared on the very next
hand and that the block notice called a visual marker a mute. Those two narrow
issues were corrected with regression coverage before the final exact candidate
was frozen.

## Independent automated proof

Run against the final content:

- `npm.cmd test -- tests/app/App.test.tsx`: 13/13 passed.
- `npm.cmd test`: 19/19 passed across two files.
- `npm.cmd run build`: passed; 33 modules transformed.
- `git diff --check`: passed; only line-ending notices.

The UI tests cover both setup modes, authority explanations, bid
preview/cancel/confirm, no level-7 control, concealed-card/seed DOM hygiene,
closed-drawer isolation, host and accessibility controls, summary-only pause,
block/report/leave behavior, remove-to-AI continuity into the next hand, and
visible hand/dealer advance.

## Chrome manual proof

The production build was served locally and exercised in Chrome.

Observed:

- AI Dealer setup explained rules ownership and produced a clearly robotic
  dealer at a four-place table.
- Human Host setup disclosed the no-hand-inspection/no-state-mutation boundary.
- North, West, and East exposed open avatar anchors only; no demographic
  characters were added.
- Opponent cards remained backs/counts. No level-7 button or internal seed was
  present in the accessibility snapshot.
- A 3 High action showed preview, Cancel removed it, and Confirm committed it;
  the resulting hand remained playable.
- A closed Host or Accessibility drawer was absent from the accessibility tree.
- Pause was disabled during auction, linked by `aria-describedby`, and visibly
  explained as summary-only.
- Block visibly marked West and explicitly stated that the local marker changes
  no game state and sends nothing externally.
- Report stated it was recorded locally only and was not filed or sent.
- Leave presented Confirm leave and Cancel; Cancel retained the active hand.
- Accessibility exposed high contrast, reduced motion, large cards, captions,
  effects/music off, and one-click play. High contrast toggled to pressed and
  Tab moved focus to Reduced motion.
- The Host drawer's Close button is the reliable route before opening the
  Accessibility drawer because the side panel covers the top-right trigger at
  this desktop viewport. This is non-blocking but should be reconsidered in the
  spatial UI.

Screenshots were rendered in the Director's Chrome evidence session. The
browser connector did not persist a repository image file, so no image artifact
is claimed here.

## Acceptance boundary

`ACCEPTED_BROWSER_PROOF` for the isolated browser workstream only.

This is not acceptance of:

- the unreviewed `STRICT_TABLE_V1` rules manifest or level-7 legality;
- a server-authoritative hidden-information boundary;
- production moderation, invites, networking, reconnect, or event hosting;
- Meta Avatar SDK integration;
- Quest Android, OpenXR, controller, hand-input, comfort, performance, or
  device proof;
- licensed or bundled music; the prototype ships no recordings and keeps host
  playback external, private-room, unrecorded, and rights-dependent;
- cultural authenticity or usability for the target audience without human
  testing.

Do not merge or publish this branch on the strength of this packet alone.

<!-- [[Codex | GPT-5.6 | 2026-08-25 | DIRECTOR | END]] -->
