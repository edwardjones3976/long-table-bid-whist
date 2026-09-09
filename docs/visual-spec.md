<!-- [[Codex | GPT-5.6 | 2026-08-24 | 22:22 UTC | BEGIN]] -->
# The Long Table — prototype visual specification

## Accepted concept

- Primary composition reference: `public/assets/long-table-concept.png`
  (1672 × 941). It contains three open seats and establishes the accepted
  layout, lighting, material palette, and mood.
- Room reference: `public/assets/long-table-room.png` (1672 × 941). It is the
  open-seat production backdrop used by the browser candidate.
- View: first-person, seated, 16:9, one fixed table with three stable opponent
  seat positions and no built-in human occupants.
- Product idea: a warm evening gathering with a serious card game inside it.

## Avatar and cultural direction

- The product has no built-in human cast. Every occupied human seat uses that
  participant's own Meta avatar at runtime; no stock demographic character or
  culturally coded body substitutes for the participant.
- The local browser prototype does not integrate the Meta Avatar SDK. It
  intentionally renders the other seat positions open, with stable seat
  anchors for future runtime avatar placement. Open seats are the truthful
  prototype state, not a request to invent placeholder people.
- The AI dealer may be visibly embodied as an unmistakably non-human robot. A
  text-only dealer also remains valid. It must not masquerade as a human
  cultural representative.
- Foundational Black American spirit is expressed lightly through warm
  hospitality, lively social energy, the cadence of a serious social card
  game, tactile wood/felt/brass, and original or documented rights-clean
  ambience.
- Cultural specificity is never assigned through skin, hair, age, body type,
  clothing, dialect caricature, gesture, or stereotype.

## Allowed first-viewport copy

- `THE LONG TABLE`
- `Your bid`
- contract values such as `3 High`
- `North & South`, `East & West`
- `AI Dealer` or `Human Host`
- `Your turn`
- `Host`
- `Invite`, `Pause Between Hands`, `Mute`, `Add AI`, `Music Off`
- game-action labels required by the current state: `Pass`, legal bids,
  `Confirm bid`, `Play card`, `Cancel`, `Next hand`, `New table`

No marketing headline, feature copy, currency, rank, store, collectible, or
casino language belongs on the play screen.

## Design tokens

| Token | Value |
| --- | --- |
| Background | `#090806` |
| Felt | `#263d2c` |
| Panel | `rgba(11, 10, 8, 0.91)` |
| Panel border | `rgba(208, 169, 93, 0.42)` |
| Text | `#f7f0df` |
| Muted text | `#c7bead` |
| Brass accent | `#d5a64b` |
| Oxblood | `#7f2727` |
| Success | `#80b889` |
| Warning | `#d5a64b` |
| Danger | `#d06a64` |
| Card face | `#f5efe3` |
| Card black | `#171614` |
| Card red | `#9d2424` |
| Radius small / panel | `10px / 18px` |
| Shadow | `0 14px 45px rgba(0, 0, 0, 0.42)` |

Typography uses `Inter`, `Segoe UI`, and system sans fallbacks. Title and score
figures use restrained tracking; every control has an explicit 14–17px size,
600 weight, and 1.2–1.35 line height. Cards prioritize rank/suit legibility.

## Container model

- Full-bleed open-seat room layer with a subtle edge vignette; never bake human
  players into the environment image or tint the felt with a colored overlay.
- Open table canvas, not a card-grid dashboard.
- Three floating surfaces only: score rail upper left, turn/dealer status above
  the table, and host drawer at right.
- Player hand is an overlapping curved fan at the bottom. Center trick is laid
  directly on the felt.
- State-dependent bid/play controls live along the bottom action rail.

## Components and states

- `TableScene`: responsive background, pointer parallax, center trick, seat
  markers/avatar anchors, phase transitions. Browser mode leaves non-local
  avatar anchors open.
- `PlayingCard`: face/back, selected, legal, disabled, just-played variants.
- `PlayerHand`: keyboard roving focus, click/tap preview, second action to
  commit, legal-play filtering, card-scale control.
- `ScoreRail`: manifest summary, contract, team scores, books.
- `TurnBanner`: current actor, phase, AI dealer/human host mode.
- `BidPanel`: pass and 3–7 high/low/no-trump choices with explicit confirmation.
- `HostDrawer`: invite simulation, between-hand pause, mute, AI substitution,
  music-off policy, and permissions explanation. No concealed-card controls.
- `AccessibilityDrawer`: card scale, high contrast, reduced motion, sound,
  captions, one-click play mode.
- `TableSetup`: Strict Table preset and AI Dealer/Human Host choice.
- `HandSummary`: contract result, book count, score transition, next hand.

## Interaction and motion

- One core action: select/preview/commit. Pointer, touch, keyboard, and a
  single-switch-style `Play selected` button reach the same transition.
- Card hover rises 12–18px; selected rises 28–36px with a brass edge.
- Center card commits in 220–320ms. Book collection is restrained and never
  forces head movement.
- Pointer parallax is at most 6px and disabled by `prefers-reduced-motion` or
  the in-game Reduced Motion control.
- Illegal cards remain readable but cannot be committed; the reason is voiced
  through an `aria-live` status line.

## Responsive behavior

- Native comparison viewport: 1672 × 941.
- Desktop ≥1180px preserves all three floating surfaces.
- Tablet 760–1179px collapses the host drawer to a button and narrows the hand.
- Mobile <760px uses the same room, stacks score/status at top, keeps a large
  scrollable/fanned hand, and opens controls as bottom sheets.

## Asset treatment

- Neither `long-table-room.png` nor `long-table-concept.png` contains or supplies
  human characters. Both deliberately show the same three open seat positions.
- A browser or production room layer under this rule contains the table,
  materials, lighting, and open seat positions only, with no baked-in human
  bodies. It may use a neutral edge vignette and bottom readability fade.
- `long-table-concept.png` remains a composition QA reference and is not
  rendered as the game UI.
- The current browser prototype has no Meta Avatar SDK integration and
  intentionally displays open seats. The future Meta build composes each
  participant's own avatar at their occupied human seat at runtime.
- Any embodied AI dealer is a separate, clearly non-human robot asset; it is
  not part of the human seating system.
- Cards, labels, scores, controls, focus states, game state, and hit areas are
  code-native and remain interactive.
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 22:22 UTC | END]] -->
