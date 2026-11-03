<!-- [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]] -->
# `@long-table/protocol`

Closed wire schemas for the authority boundary:

`hand/controller -> typed Unreal intent -> authenticated WebSocket -> TypeScript table service -> rules-core -> role-bound projection -> Unreal presentation`

## What is here

| Module | Contents |
| --- | --- |
| `schema.ts` | Closed-schema kit: unknown, missing, mistyped or out-of-range members reject the whole payload. Decoding constructs a new value field by field. |
| `vocabulary.ts` | Every enumerated string on the wire, plus bounded lengths. |
| `views.ts` | Component views (`ContractView`, `PublicTrickCard`, `SeatOccupancyView`, `PlayerCardView`, …). |
| `intents.ts` | `TableIntent` (preview / toggle-discard / cancel / confirm / next-hand and the host session powers) with the role allowed to submit each kind. |
| `receipts.ts` | `IntentReceipt` and the closed rejection vocabulary. The first thirteen codes are imported from the browser oracle so the messages cannot drift. |
| `dealer.ts` | `DealerCueFrame`: the allowlisted cue vocabulary the robot presenter consumes. |
| `projections.ts` | `PlayerProjection`, `HostProjection`, `PublicProjection` (three distinct closed types over one public core) and the authority-internal `AiSeatView`. |
| `wire.ts` | `ClientMessage` / `AuthorityMessage` envelopes and canonical encode/decode. |
| `invariants.ts` | Compile-time and runtime assertions that no non-player type declares a concealed member. |

## Rules of the boundary

- Concealed members (`hand`, `legalChoices`, preview and discard state) exist only on `PlayerProjection` and only for the projection's own seat. They are not optional members of the host, public, dealer, receipt or wire-error types; they are absent from those types entirely.
- Nothing is redacted. There is no regex, keyword list or text filter in this package; `director/privacy-control-policy.md` prohibits them. A payload is either constructed from the allowlist or it does not exist.
- `AiSeatView` is the oracle `PlayerView` (own hand plus public history) and never leaves the authority process.
- The same schemas, in the same field order, are mirrored by `Unreal/Source/LongTableProtocol`; `fixtures/protocol/*.json` are the shared golden values.
<!-- [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]] -->
