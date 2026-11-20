# Native-size fidelity ledger

- **Accepted concept:** `public/assets/long-table-concept.png`
- **Browser evidence:** `artifacts/screenshots/kitty-selection-1672x941.png`
- **Comparison viewport:** 1672 × 941 CSS pixels
- **Method:** in-app Browser screenshot plus original-resolution `view_image`
  inspection of both files in the same QA pass
- **Candidate state:** Human is winning bidder, `5 High`, Spades declared,
  exactly six kitty cards selected

| Comparison point | Accepted concept | Browser candidate | Result |
| --- | --- | --- | --- |
| Seated composition | First-person camera behind a large oval table | Same camera height, ellipse, rail, and open felt emphasis | pass |
| Human identity | Three stable open seats; no built-in people | Same three open seats; human identity intentionally deferred to Meta avatars | pass |
| Room atmosphere | Warm walnut, deep green felt, brass light, night window, original abstract art | Production layer preserved without tinting or culturally coded bodies | pass |
| UI-safe space | Large uninterrupted felt and upper-wall negative space | Score, turn/dealer, Host, cards, and action stay on distinct edges/planes | pass |
| Score/status hierarchy | Concept reserves upper-left and top-center surfaces | Contract/team/books rail and turn/phase banner remain readable and restrained | pass |
| Host surface | Right-side event-control zone | Invite, between-hand pause, mute, disabled Add AI, and Music Off; no hidden-card authority | pass |
| Card interaction | Felt supports code-native trick/hand presentation | Eighteen-card kitty view remains legible; six selected cards use brass lift/edge and explicit commit | pass |
| AI dealer identity | No character baked into the room | Conditional robot glyph and `AI Dealer` label; no faux-human representation | pass |
| Cultural treatment | Warm gathering energy expressed through room and materials | No assigned demographic cast, dialect, costume, or stereotype added in code/copy | pass |
| Responsive continuity | Desktop is the native reference | 390 × 844 check preserves open room, contract, turn, reachable hand, Host trigger, and tap-safe Pass | pass |

## Copy difference

The accepted background intentionally contains no words. All runtime copy is
code-native and limited to gameplay/role/accessibility language defined in
`docs/visual-spec.md`: table name, contract and scores, current phase, legal
actions, Host controls, Music Off, and the Meta-avatar limitation on setup. No
marketing, casino, currency, collectible, or unlicensed music copy was added.

## Accepted deviations and limitations

- The previous fixed-person composition was intentionally replaced after owner
  direction. The accepted and production assets now both contain open seats.
- The browser prototype does not render Meta avatars; it proves only the open-
  seat fallback and future placement contract.
- The AI dealer is represented by a small non-human robot glyph, not a 3D robot
  body. This keeps Human Host mode from inheriting a baked dealer character.
- The card fan and runtime panels necessarily cover part of the felt during an
  action. They clear or change with phase and remain code-native/interactable.
- Native Quest depth, hands/controllers, passthrough, avatar loading, spatial
  audio, thermals, and frame-rate fidelity remain unverified.
