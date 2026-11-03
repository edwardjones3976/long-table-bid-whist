<!-- [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]] -->
# `@long-table/rules-core`

The deterministic Bid Whist authority for the native program, organised as
small modules and generalised to any acting seat.

## Relationship to the browser oracle

`src/game` (the accepted WebXR candidate) remains the rules oracle and is not
modified by this package. rules-core **wraps** it:

- `model.ts` re-exports the oracle model, manifest constants and seat helpers.
- `deck.ts` re-exports the oracle deck and seeded shuffle; the deal order is the oracle's.
- `hand.ts` reuses the oracle's `legalBids` / `legalCards` and expresses the
  transitions (bid, forced dealer, declaration, kitty, follow-suit play, trick
  power, scoring) for an arbitrary acting seat with no automation attached.
- `automation.ts` drives AI seats with the oracle's decision functions from the
  oracle's own `PlayerView` (own hand + public history only).
- `digest.ts` re-exports the oracle's `publicDigest`.

`tests/conformance.test.ts` replays the oracle and rules-core side by side over
many seeds and two hands and requires **identical full states after every
step**, so the seat-generic transitions cannot drift from the oracle's truth.

## What changed for the native table

| Oracle | rules-core |
| --- | --- |
| South is the only human; AI advancement is folded into every action. | `applySeatAction(state, seat, action)` for any seat; `advanceAiSeats(state, isAi)` is explicit and returns the actions it committed. |
| `newTable` deals and immediately runs AI. | `openHand` deals only. |
| `legalHumanActions` for South. | `legalSeatActions(state, seat)`; between hands every seat may call the next hand. |
| No replay record. | `ReplayRecord` (seed + every committed action) and `replayMatches`. |

The active manifest is unchanged: `RESTRICTED_TABLE_SLICE_0_1`, levels 3–6 in
High or Low, 54 cards, six-card kitty, twelve tricks, `6 + level` target. Level
7 and No Trump remain withheld with the single published exclusion notice.
<!-- [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]] -->
