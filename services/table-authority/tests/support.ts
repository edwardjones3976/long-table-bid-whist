// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Test support: a table with named participants and a driver that submits
 * intents exactly the way a connection would, with fresh intent ids and the
 * current expected version.
 */
import { expect } from "vitest";

import type { GameState, Seat } from "../../../packages/rules-core/src";
import type { DealerCueFrame, IntentLane, IntentReceipt, PlayerProjection, TableIntent } from "../../../packages/protocol/src";
import { TableAuthority, type Actor, type HistoryFrame, type SeatBinding, type SeatUpdate } from "../src/table";

export const PARTICIPANTS = {
  south: "p-south",
  west: "p-west",
  north: "p-north",
  east: "p-east",
  host: "p-host",
  spectator: "p-spectator",
  dealer: "robot-dealer",
} as const;

export function human(seat: Seat, connected = true): SeatBinding {
  return { occupant: "human", participantId: PARTICIPANTS[seat], displayName: `${seat} name`, connected };
}

export interface TableSetup {
  seed?: string;
  tableId?: string;
  humans?: Seat[];
  host?: string | null;
  historyRetention?: number;
}

export function createTable(setup: TableSetup = {}): TableAuthority {
  const humans = setup.humans ?? ["south"];
  const seats: Partial<Record<Seat, SeatBinding>> = {};
  (["south", "west", "north", "east"] as Seat[]).forEach((seat) => {
    seats[seat] = humans.includes(seat) ? human(seat) : { occupant: "ai" };
  });
  return new TableAuthority({
    tableId: setup.tableId ?? "table-1",
    seed: setup.seed ?? "authority-seed",
    hostParticipantId: setup.host === undefined ? PARTICIPANTS.host : setup.host,
    seats,
    historyRetention: setup.historyRetention,
  });
}

export function playerActor(seat: Seat): Actor {
  return { role: "player", participantId: PARTICIPANTS[seat], seat };
}

export function hostActor(participantId: string = PARTICIPANTS.host): Actor {
  return { role: "host", participantId, seat: null };
}

export const PUBLIC_ACTOR: Actor = { role: "public", participantId: PARTICIPANTS.spectator, seat: null };

let counter = 0;

export interface SubmitOptions {
  intentId?: string;
  expectedVersion?: number;
}

// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
/** The one preallocated lane an actor's intents consume from, or null for public/dealer. */
export function laneFor(actor: Actor): IntentLane | null {
  if (actor.role === "player") return actor.seat;
  if (actor.role === "host") return "host";
  return null;
}

/** The lane's current `<grant>:<exact-next-counter>` identity, exactly as an entitled connection would form it. */
export function nextIntentId(table: TableAuthority, lane: IntentLane): string {
  const next = table.nextIntentCounter(lane);
  if (next === null) throw new Error(`lane ${lane} has no next counter (incarnation exhausted)`);
  return `${table.laneGrant(lane)}:${next}`;
}

export function submit(
  table: TableAuthority,
  actor: Actor,
  intent: TableIntent,
  options: SubmitOptions = {},
): { receipt: IntentReceipt; frame: HistoryFrame | null; seatUpdate: SeatUpdate | null } {
  const lane = laneFor(actor);
  counter += 1;
  // A public/dealer actor never holds a grant; any identity it submits is
  // refused before lane lookup, so an arbitrary string exercises that path.
  const intentId = options.intentId ?? (lane ? nextIntentId(table, lane) : `unentitled-${counter}`);
  const result = table.submitIntent(actor, {
    tableId: table.tableId,
    intentId,
    expectedVersion: options.expectedVersion ?? table.currentVersion,
    intent,
  });
  if (result.identityViolation) throw new Error(`unexpected identity violation: ${result.identityViolation}`);
  return { receipt: result.receipt, frame: result.frame, seatUpdate: result.seatUpdate };
}
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

/** The seat's own projection as its current owner would receive it. */
export function playerSnapshot(table: TableAuthority, seat: Seat): PlayerProjection {
  const projection = table.snapshot("player", seat, PARTICIPANTS[seat]);
  if (!projection || projection.role !== "player") throw new Error(`no player projection for ${seat}`);
  return projection;
}

/** Commits one legal move for `seat` through preview/confirm or the kitty picks. Returns collected cues. */
export function takeTurn(table: TableAuthority, seat: Seat, prefer: "bid" | "pass" = "bid"): DealerCueFrame[] {
  const cues: DealerCueFrame[] = [];
  const game = table.committedState();
  const actor = playerActor(seat);
  if (game.phase === "kitty") {
    game.hands[seat].slice(0, 6).forEach((card) => {
      const toggled = submit(table, actor, { kind: "toggle-discard", cardId: card.id });
      expect(toggled.receipt.outcome).toBe("accepted");
    });
    const confirmed = submit(table, actor, { kind: "confirm" });
    expect(confirmed.receipt.committed).toBe(true);
    cues.push(...(confirmed.frame?.cues ?? []));
    return cues;
  }
  const choices = playerSnapshot(table, seat).legalChoices;
  const bids = choices.filter((choice) => choice.kind === "bid");
  const pass = choices.find((choice) => choice.kind === "pass");
  const choice =
    game.phase === "auction"
      ? prefer === "pass" && pass
        ? pass
        : bids.length > 0
          ? bids[bids.length - 1]
          : choices[0]
      : choices[0];
  if (!choice) throw new Error(`no choice for ${seat} in ${game.phase}`);
  const first = submit(table, actor, choice.intent);
  expect(first.receipt.outcome).toBe("accepted");
  cues.push(...(first.frame?.cues ?? []));
  if (choice.intent.kind === "preview") {
    const confirmed = submit(table, actor, { kind: "confirm" });
    expect(confirmed.receipt.committed).toBe(true);
    cues.push(...(confirmed.frame?.cues ?? []));
  }
  return cues;
}

/** Drives every human seat until the predicate holds or the hand ends. */
export function driveUntil(
  table: TableAuthority,
  humans: Seat[],
  predicate: (game: GameState) => boolean,
  prefer: "bid" | "pass" = "bid",
): DealerCueFrame[] {
  const cues: DealerCueFrame[] = [];
  let guard = 0;
  while (!predicate(table.committedState())) {
    const game = table.committedState();
    if (game.phase === "summary") break;
    if (!humans.includes(game.turn)) throw new Error(`AI seat ${game.turn} left on turn`);
    cues.push(...takeTurn(table, game.turn, prefer));
    guard += 1;
    if (guard > 400) throw new Error("driver guard exceeded");
  }
  return cues;
}

export function driveHand(table: TableAuthority, humans: Seat[] = ["south"], prefer: "bid" | "pass" = "bid"): DealerCueFrame[] {
  return driveUntil(table, humans, (game) => game.phase === "summary", prefer);
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
