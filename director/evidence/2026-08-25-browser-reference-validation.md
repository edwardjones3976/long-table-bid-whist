<!-- [[Codex | GPT-5.6 | 2026-08-25 | DIRECTOR-EVIDENCE | BEGIN]] -->
# Browser reference validation — quarantined draft

## Classification

- **Artifact:** quarantined React/Vite interaction-reference draft.
- **Selected candidate:** no.
- **Quest/physical-space proof:** no.
- **Direct-work credit:** zero.
- **Live URL during validation:** `http://127.0.0.1:4173/`.
- **Production build:** passed (`tsc -b` plus Vite build; 33 modules).
- **Browser:** authenticated local Chrome control surface.

## Successful observed flow

An AI Dealer session completed this exact flow without a page reload:

1. Setup displayed a first-person seated room, three open Meta-avatar anchors,
   robot-dealer option, Human Host option, visible `STRICT_TABLE_V1` label,
   Music Off policy, and a deterministic table seed.
2. AI Dealer selected; room entered.
3. South bid `7 No Trump High` through preview and explicit confirmation.
4. South confirmed No Trump declaration.
5. Kitty expanded the South hand from 12 to 18 cards.
6. Six cards were selected and the kitty closed.
7. South confirmed twelve card plays. Non-South actions advanced automatically.
8. The hand reached summary with 7–5 tricks and a displayed score of `-7–0`.

Human Host mode was separately observed with invite-code presentation, mute,
pause/resume, between-hand substitution disabled during auction, Music Off,
and an explicit denied-authority list. Pause changed the visible state to
`Table paused` and exposed a Resume action. Accessibility controls visibly
included high contrast, reduced motion, large cards, captions, Effects Off,
Music Off, and one-click play hypotheses.

These observations show a complete browser interaction loop and a visually
composed table-room hypothesis. They do not prove networking, Meta avatars,
hand/controller interaction, spatial audio, MR placement, headset comfort, or
authoritative event hosting.

## Test evidence

- Game-engine tests: 6/6 pass in the active tree. The initial full suite also
  discovered the same six tests inside the provider worktree because that path
  is not excluded, producing 12 passing engine-test executions rather than 12
  unique tests.
- UI tests: 0/5 pass. Failures include ambiguous queries and accumulated DOM
  from missing test cleanup. The suite does not reach a full hand.
- Production build: pass.
- Full manual semantic-browser hand: pass through summary.
- Next-hand transition: fail.

## Confirmed critical defects

### P0 — impossible level-7 contract

The engine plays 12 tricks but uses target `6 + bid.level`. A level-7 contract
therefore requires 13 tricks. The UI offers level 7, and the observed 7–5 hand
was scored as set even though seven tricks were won. The named rules manifest
must decide whether bid numerals represent total tricks/books or books over six;
implementation may not guess.

### P0 — reconstructable concealed deal

The player/AI view contains the deterministic table seed. Because shuffle and
deal are deterministic and public code, any AI receiving the seed can recreate
all concealed hands. Removing hand arrays from the view is not a sufficient
hidden-information boundary. Seat projections must exclude every deal-recovery
input and use an opaque public hand identifier instead.

### P1 — Next hand does not advance

The live `Next hand` button was clicked after summary. Phase, digest, score,
empty hands, and summary remained unchanged. The UI schedules a commit after a
state update but the callback observes stale pending state.

### P1 — social controls are partly simulated

The invite is static, mute changes a local label, and substitution has no
authoritative action. Block, leave, report, removal policy, reconnection, host
succession, and session state are absent. Pause is an unrestricted local toggle,
not an accepted host/request policy transition.

### P1 — AI pacing is not observable

All non-South actions run synchronously until South's next turn. A user cannot
observe or interrupt individual AI bids, declarations, discards, leads, or
trick resolution; the robot therefore does not yet create a paced live-table
experience.

### P1 — no manifest, replay, or recovery artifact

`STRICT_TABLE_V1` is a label, not a complete versioned manifest. The draft has
no serialized action log, replay executor, conformance vectors, session
recovery, or authoritative event ledger.

### P2 — outside font request

The active CSS imports Google Fonts at runtime. This weakens offline reliability
and is not recorded in the asset/provenance ledger. The selected candidate
should use local system typography until a rights/provenance decision is made.

## Runtime gap

The machine has the complete Node/Vite/Chrome stack needed for this browser
reference. It does not have Unity Hub, a Unity editor, Android SDK/NDK/OpenJDK,
ADB, Android Studio, Meta XR runtime/support, a Quest project, OpenXR packages,
or device evidence. No repository file constitutes a Unity scene, Android
build, WebXR experience, or XR integration.

## Handoff use

Cursor may later inspect only these interaction ideas under an explicit packet:

- four-seat first-person composition;
- open Meta-avatar anchors rather than authored demographic characters;
- visibly non-human robot dealer with captions;
- separate AI Dealer/Human Host setup choice and authority explanation;
- preview/cancel/confirm action pattern;
- persistent contract, phase, score, trick, and hand information;
- accessibility menu hypotheses;
- Music Off and external venue-playback boundary.

No active code should be adopted without provider ownership, rules-authority
correction, and exact-candidate review.

<!-- [[Codex | GPT-5.6 | 2026-08-25 | DIRECTOR-EVIDENCE | END]] -->
