<!-- [[Codex | GPT-5.6 | 2026-08-24 | 22:36 UTC | BEGIN]] -->
# Two-hour prototype acceptance matrix

## Acceptance claim

This gate judges a **fully interactive local browser prototype** of one complete
Bid Whist hand in a convincing seated room. It does not certify a production
game, native Quest build, multiplayer security, or a public event service.

Avatar representation is intentionally limited at this stage. The browser
prototype does not integrate the Meta Avatar SDK and therefore renders the
other seat positions open. This gate checks that the candidate does not invent
a baked-in human cast and that it states the limitation truthfully; it does not
judge production Meta-avatar fidelity.

The candidate is accepted only when every `P0` row below is `PASS`, the exact
candidate identity and runtime evidence are recorded, and no critical defect
prevents a hand from reaching its scored summary. A `P1` miss is reported as a
known prototype limitation; it must not be silently described as complete.

Use only these result values: `PASS`, `PARTIAL`, `FAIL`, or `NOT RUN`.

## Candidate and evidence record

| Field | Required evidence |
| --- | --- |
| Candidate | Git SHA and dirty/clean worktree state |
| Runtime | OS, Node version, browser/version, and local URL |
| Start evidence | Exact command, terminal output through ready state, and timestamp |
| Automated evidence | Exact command, exit code, pass/fail counts, and timestamp |
| Manual evidence | Scenario IDs, result, tester, viewport/input, and screenshot or short capture path |
| Determinism evidence | Seed, rules-manifest identity, final score/state digest, and repeated-run comparison |
| Content evidence | Asset ledger or explicit statement that no music/voice recording ships |
| Avatar evidence | Reference-viewport capture showing open seat positions, confirmation that no built-in human cast is rendered, and explicit Meta Avatar SDK status |
| Known limitations | Every `PARTIAL`, `FAIL`, and `NOT RUN`, with owner or disposition |

Evidence must describe the exact running candidate. A screenshot alone does not
prove interaction, deterministic rules, hidden-information isolation, or a
complete hand.

## Runtime and smoke gate

Run from the repository root:

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:4173/`. The development command must remain running and
the page must load without a fatal browser-console error. For a production-mode
check:

```powershell
npm test
npm run build
npm run preview
```

Stop the development server before starting preview because both intentionally
claim port 4173. Open `http://127.0.0.1:4173/` again after `npm run preview`.
If no automated
browser smoke script exists, record a manual smoke capture showing fresh load,
setup, one bid, one card commit, and restart. That gap must be listed as
“manual browser smoke only,” not represented as automated E2E coverage.

## Acceptance matrix

| ID | Pri. | Requirement | Pass condition | Evidence |
| --- | --- | --- | --- | --- |
| RUN-01 | P0 | Install and start | A clean checkout installs and reaches the room at port 4173 using the documented commands. | Command, exit/ready output, URL |
| RUN-02 | P0 | Test and build | `npm test` and `npm run build` both exit 0. | Command output and counts |
| RUN-03 | P0 | Fresh-load smoke | The root route renders setup and interactive controls without stale local state or a fatal console error. | M01 capture and console check |
| GAME-01 | P0 | Playable full hand | From setup, one player can complete bidding, contract declaration, kitty/discard when applicable, every trick, book count, scoring, and hand summary; `Next hand` or `New table` is then available. | M02 capture plus final state |
| GAME-02 | P0 | Legal interaction | Only the current actor can commit; bid order, minimum bid, follow-suit, discard count, and card ownership are enforced. Illegal choices remain understandable but cannot mutate state. | M03–M05 and focused tests |
| GAME-03 | P0 | Commitment safety | Bid and card selection use preview/confirm or a clearly separate commit action; cancel leaves state unchanged and double activation cannot play twice. | M03 and M04 |
| GAME-04 | P0 | Strict Table declaration | Setup visibly identifies the one supported, versioned rules manifest. The manifest determines deck/deal, bid modes, trump/no-trump ranking, kitty, books, scoring, and hand end. | Manifest ID and rules tests |
| RULE-01 | P0 | Seeded determinism | Same seed, manifest, and action sequence produce the same deal, events, score, and final digest in at least two independent runs. | M06 plus automated equality test |
| RULE-02 | P0 | Rule coverage | Focused tests cover shuffle/deal uniqueness, bid ordering/forced dealer, high/low/no-trump, joker behavior, kitty/discard, follow-suit, trick winner, books, scoring, and hand end for the implemented manifest. | `npm test -- --run tests/game` output |
| RULE-03 | P1 | Replay | Recorded public actions reduce to the same final public state and digest without consulting wall-clock time or UI state. | Replay test and digest |
| AI-01 | P0 | Hidden-information input boundary | Each AI player receives only its own hand, legal actions, public contract/trick/history, and a deterministic decision seed—not opponents’ concealed cards or the root match state. | API/type review plus isolation test |
| AI-02 | P0 | No rendered leak | Opponents’ card faces/labels are absent from visible UI, DOM text, accessibility tree, logs, and error messages until legitimately revealed. | M07 inspection |
| AI-03 | P0 | Complete AI turns | AI opponents bid and play legal cards without deadlock; a human can finish the full hand without developer intervention. | M02 and timeout/deadlock check |
| AI-04 | P1 | Counterfactual isolation | Swapping two unseen opponents’ concealed cards while preserving the acting AI’s view cannot change that AI’s deterministic decision. | Unit test with captured AI input |
| ROLE-01 | P0 | AI dealer boundary | AI Dealer may announce, teach, pace, and animate. The rules engine—not the dealer—owns shuffle, deal, legality, trick result, and score. | M08 plus code/test evidence |
| ROLE-02 | P0 | Human host boundary | Human Host may expose invite simulation, mute, AI substitution, announcements/music-off policy, and a between-hands pause request. Host UI exposes no card-face, deal-edit, score-edit, forced-play, or unilateral committed-hand void control. | M09 plus DOM/control inspection |
| ROLE-03 | P0 | Stable permissions | Choosing AI Dealer versus Human Host changes presentation/host controls only; the same seed and player actions retain the same authoritative game result. | M08 comparison |
| AVATAR-01 | P0 | No built-in human cast | The room renders three stable opponent seat positions without pre-rendered or stock human occupants. No demographic character or culturally coded body is used as a placeholder. | M10 captures plus room-asset/DOM inspection |
| AVATAR-02 | P0 | Avatar integration truthfulness | The evidence record states that this browser candidate has no Meta Avatar SDK integration and that its open seats are intentional. It makes no claim that participant-owned avatars are already rendered. | Candidate record plus M01/M10 |
| AVATAR-03 | P0 | AI dealer embodiment | If the AI Dealer has a visible body, it is unmistakably a non-human robot and not a faux-human demographic stand-in. A text-only dealer mode also passes. | M08 visual/control inspection |
| CULTURE-01 | P0 | Environmental cultural direction | Foundational Black American influence is light and environmental—warm hospitality, social energy, materials, and original or documented rights-clean ambience—with no body, costume, dialect, gesture, or stereotype used as an authenticity signal. | M10 visual/copy inspection plus content evidence |
| ROOM-01 | P0 | Physical-room read | The initial view is first-person and seated, with felt table, three stable open opponent seat positions, a legible hand, center trick, and restrained floating score/status/host surfaces. It reads as a gathering, not a dashboard or casino screen. | M10 at reference viewport |
| ROOM-02 | P0 | Spatial continuity | Cards commit onto the felt, trick collection remains centered, player/partner/team positions stay stable, and animation does not obscure the next required action. | M02 capture |
| ROOM-03 | P1 | Comfort motion | Parallax is at most subtle, no interaction forces a camera/head turn, and reduced motion removes parallax and nonessential movement. | M11 capture |
| A11Y-01 | P0 | Mouse/touch path | Setup, bid, discard, play, host controls, summary, and restart work without drag-only or voice-only input. | M02 on pointer/touch |
| A11Y-02 | P0 | Keyboard path | A visible focus indicator reaches all actionable controls in logical order; select/preview/commit, cancel, drawers, and restart work without a mouse. | M12 keyboard-only run |
| A11Y-03 | P0 | Perception controls | Card scale, high contrast, reduced motion, sound/music state, captions, and one-click play controls are exposed and have visible state. Suit meaning is not color-only. | M11 plus settings capture |
| A11Y-04 | P0 | Status semantics | Turn, phase, error reason, selected card, contract, trick result, and score are readable text or announced status; the prototype remains playable with audio off. | Accessibility-tree inspection |
| AUDIO-01 | P0 | Rights-clean bundle | Every shipped recording has composition and recording authority in an asset ledger; alternatively, the candidate ships no recording and states that fact. “Old,” “jazz,” “blues,” or a safe file extension is not clearance. | Ledger/hash or no-recording declaration |
| AUDIO-02 | P0 | Safe host behavior | Host music defaults off. The prototype neither uploads, catalogs, streams, records, nor rebroadcasts host music. Any host-music message directs physical venues to external playback and identifies virtual transmission as deferred. | M09 plus network/control inspection |
| AUDIO-03 | P0 | Independent mute | Music/sound can be disabled without hiding game state or blocking play; no essential command is audio-only. | M11 with audio off |
| RESP-01 | P0 | Desktop | At 1672×941 and ≥1180px, room, hand, center trick, score, status, and host surface remain usable without page-level horizontal scrolling. | M10 captures |
| RESP-02 | P0 | Tablet | At 760–1179px, the host surface collapses to an operable button/drawer and the hand remains selectable. | M10 at 1024×768 |
| RESP-03 | P0 | Mobile | Below 760px, score/status stack, controls use an accessible compact surface, and every card/control remains reachable without overlap that blocks play. | M10 at 390×844 |
| RESP-04 | P1 | Resize continuity | Resizing or rotating during a hand does not reset the seed, rules state, selection, score, or current turn. | M10 mid-hand resize |

## Concrete manual scenarios

### M01 — Fresh start and identity

1. Start the candidate with `npm run dev` and open a fresh private window.
2. Confirm the root route shows the room and Strict Table setup, not a blank,
   marketing, or developer screen.
3. Record SHA, URL, browser, console state, visible manifest name, and seed if
   exposed.
4. Record that Meta Avatar SDK integration is absent and the other seat
   positions are intentionally open; do not describe them as missing cast art.

### M02 — Complete one normal hand

1. Select AI Dealer, take the South seat, and start the declared Strict Table.
2. Bid or pass through a legal completed auction; allow all AI turns to finish.
3. Complete the winner’s contract/kitty/discard step when the rules require it.
4. Play every human turn through the final trick without reload or developer
   control.
5. Confirm all cards are accounted for, every trick has one card per seat, the
   summary identifies contract result/books/score, and restart is available.

### M03 — Illegal bid and safe commitment

1. Select a bid without confirming, cancel it, and verify the auction is
   unchanged.
2. Attempt a bid below/equal to the current legal threshold and an out-of-turn
   action.
3. Verify neither action mutates the event log, turn, or score and the reason is
   readable.

### M04 — Follow-suit and double-commit

1. Reach a trick where the human holds both the led suit and an off-suit card.
2. Attempt the off-suit card and verify it cannot commit.
3. Commit a legal card, immediately double-click/press confirm twice, and verify
   exactly one card/event is produced.

### M05 — Contract-specific branch

Run at least one automated or manual case for each supported contract family:
high, low, no-trump high, and no-trump low. Confirm rank direction, joker
treatment, kitty/book treatment, and score match the displayed manifest.

### M06 — Deterministic repeat

1. Record seed, manifest ID, deliberate human choices, event count, final score,
   and state digest for a completed hand.
2. Restart from the same seed and replay the same choices.
3. Compare the initial hands, AI actions, trick winners, summary, and digest.
   Every value must match.

### M07 — Concealed-information inspection

1. Before reveal, search rendered DOM text, accessibility tree, and console for
   the known rank/suit of an opponent card from deterministic test evidence.
2. Confirm the UI contains only an opaque card back/seat count.
3. Inspect one captured AI decision input and verify it contains only that
   player’s hand plus public state.

This proves the prototype’s logical boundary. Because the current build is a
local browser application, it does **not** prove production network secrecy.

### M08 — Dealer mode equivalence

Complete or replay the same seed/actions once with AI Dealer and once with Human
Host. Announcements and available host controls may differ; cards, legality,
trick winners, and score must not. If AI Dealer has a visible body, confirm it
is clearly a non-human robot; a text-only dealer is acceptable.

### M09 — Host permissions and music

1. Open Human Host controls before, during, and after a hand.
2. Exercise invite simulation, mute, AI substitution where safe, Music Off, and
   between-hands pause.
3. Verify no concealed-card or authoritative score/deal control appears and no
   upload/file picker, audio stream, recording, or third-party request occurs.
4. Verify disruptive table changes are deferred or disabled during a committed
   hand.

### M10 — Room and responsive sweep

Capture fresh load and an in-progress trick at 1672×941, 1024×768, and 390×844.
At each size, play one card and open the host/accessibility surface. Record any
clipping, overlap, unreachable control, unexpected scroll, or loss of table
context. Confirm that opponent seat positions remain stable and open, no
reference-image person or stock demographic character is rendered, and the
environment carries the intended warmth without using a body or stereotype as
the cultural signal.

### M11 — Accessibility preferences

During a hand, enable high contrast, the largest card scale, reduced motion,
captions, and audio/music off. Play the next trick. Confirm preferences remain
active, state does not reset, suits remain distinguishable, and all feedback is
available visually.

### M12 — Keyboard-only critical path

Reload, put the pointer aside, and use only keyboard controls to enter a table,
bid, select/cancel/commit a legal card, open and close each drawer, reach the
summary or continue an already seeded hand, and restart. Record focus order and
any keyboard trap.

## Explicitly out of scope for this two-hour gate

- Native Quest APK, headset performance certification, hand tracking,
  controllers, haptics, passthrough MR placement, boundary testing, and spatial
  audio certification.
- Meta Avatar SDK integration, account/avatar entitlement, runtime avatar
  loading, personalization fidelity, lip sync, full-body inverse kinematics,
  and production avatar performance. In the target Meta runtime, each occupied
  human seat must use that participant's own Meta avatar; this browser gate
  intentionally proves only the open-seat fallback and no-built-in-cast rule.
- Real multiplayer, accounts, invite delivery, voice chat, reconnect, host
  succession, moderation backend, spectators, public matchmaking, ranked play,
  tournaments, prizes, telemetry, persistence, or cloud deployment.
- Security claims that require a server-authoritative process or adversarial
  client testing. The browser prototype proves API and UI redaction intent only.
- More than one versioned Strict Table preset, arbitrary house-rule toggles,
  manual renege adjudication, full-game/match scoring, campaign/progression, and
  comprehensive AI skill tuning.
- Shared virtual host-music upload, decoding, transmission, retention,
  rebroadcast, or rights adjudication; third-party music, likenesses, archival
  media, branded decks, and unverified cultural assets.
- Production cultural validation. The room can demonstrate the accepted
  environmental direction, but experienced Foundational Black American Bid
  Whist players and compensated advisors must validate rules, language, pacing,
  and ambience before an MVP or authenticity claim. Their culture must not be
  represented by assigning demographic bodies or stereotypes to table seats.

## Decision line

Record one conclusion:

```text
Candidate: <SHA>
Verdict: ACCEPT | CHANGES_REQUIRED | SERIOUS_SAFETY_STOP
P0: <passed>/<total>; P1: <passed>/<total>
Automated: <commands and result>
Manual: <scenario IDs and result>
Known limitations: <explicit list>
Reviewer/date: <identity and timestamp>
```

`ACCEPT` means the local browser prototype is ready for human critique under the
limitations above. It is not a production-release, cultural-approval, rights-
clearance, network-security, or native-XR verdict.
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 22:36 UTC | END]] -->
