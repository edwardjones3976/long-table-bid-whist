<!-- [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]] -->
# `@long-table/table-authority`

The authoritative table service. Unreal sends typed intents; the service runs
`rules-core`; every connection receives only the projection its role is
entitled to.

## Modules

| Module | Responsibility |
| --- | --- |
| `table.ts` | `TableAuthority`: committed state, seat bindings, per-seat uncommitted preview, monotonic version, intent-id ledger, replay record, bounded projection history. |
| `seat-interaction.ts` | Preview / toggle-discard / cancel / confirm for any seat (the browser oracle's controller generalised). Only `confirm` and `next-hand` reach the rules kernel. |
| `projections.ts` | Field-by-field construction of `PlayerProjection`, `HostProjection`, `PublicProjection`. Host and public builders never read a hand, the kitty, the discard pile, the seed or the event log. |
| `dealer-cues.ts` | Derives allowlisted robot-dealer cues from the public difference between two committed states. |
| `session.ts` | Token → participant directory (exact match), role entitlement, reconnect, replay, disconnect presence. |
| `wire.ts` | Closed-schema decode of client frames and canonical encode of authority frames. |
| `websocket-server.ts` | Dependency-free RFC 6455 server on `node:http` (loopback by default). |
| `main.ts` | Local harness that seats a table from a typed room file. |

## Boundary guarantees (all tested)

- **Preview / cancel / confirm**: pointing never changes committed state; a confirm with no pending preview is `nothing-to-confirm`.
- **Idempotency**: a repeated `intentId` is answered `duplicate` from the ledger and never re-evaluated, even after the version moved.
- **Stale version**: `expectedVersion` must equal the table version or the intent is rejected `stale-version`; the receipt carries the current version so the client resyncs.
- **Role authority**: a host connection cannot preview, toggle, confirm, or otherwise act on play; a player cannot issue host intents; public and dealer connections can submit nothing.
- **Host powers**: pause between hands, resume, announce from a fixed cue list, substitute a seat with AI between hands, transfer hosting, end the event, call the next hand. None reads or changes a card, bid, trick or score.
- **AI seats** decide from `AiSeatView` (own hand + public history). A counterfactual replacing every other concealed card leaves the decision unchanged.
- **Reconnect / replay**: a new hello with the same token re-binds the seat, returns an authoritative snapshot, and replays the retained projections after `lastVersion`.
- **Counterfactual isolation**: with every concealed card, the kitty, the discard pile, the seed and the event log replaced, the serialized host and public projections are byte-identical.
- **Replay record**: seed plus every committed action (human and AI) reconstructs the identical state. The record contains the seed and is authority-internal evidence only.

## Out of scope here

Invitations, room codes, account binding, voice, moderation transport and
matchmaking belong to `services/session-gateway` (Grok). This service exposes
typed `bindSeat` / directory inputs for that lane and nothing more.
<!-- [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]] -->
