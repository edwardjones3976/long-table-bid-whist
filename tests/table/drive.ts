// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * Test driver for the shared semantic port.
 *
 * Every move it makes is a typed `TableInputEnvelope` carrying a fresh
 * idempotency key, and the moves it chooses come from the XR projection's
 * published `legalChoices`. Driving a hand through this driver therefore
 * exercises exactly the path an XR controller select takes.
 */
import { newTable, type GameState } from "../../src/game";
import { MANIFEST_ID } from "../../src/game/model";
import type {
  TableDispatchReceipt,
  TableInputSource,
  TableIntent,
} from "../../src/table/intent";
import {
  DISCARD_PICK_TARGET,
  createInteractionState,
  dispatchTableInput,
  type TableInteractionState,
} from "../../src/table/interaction";
import {
  buildXrTableProjection,
  type XrBuildIdentity,
  type XrTableProjection,
} from "../../src/table/projection";

export const TEST_IDENTITY: XrBuildIdentity = {
  manifestId: MANIFEST_ID,
  buildShortSha: "t3stsha",
};

export type AuctionPolicy = "bid" | "pass";

export class TablePort {
  state: TableInteractionState;
  /** Whether South opens with the highest legal contract or passes it away. */
  auctionPolicy: AuctionPolicy = "bid";
  private counter = 0;

  constructor(seedOrGame: string | GameState) {
    const game = typeof seedOrGame === "string" ? newTable(seedOrGame) : seedOrGame;
    this.state = createInteractionState(game);
  }

  get game(): GameState {
    return this.state.game;
  }

  projection(): XrTableProjection {
    return buildXrTableProjection(this.state, TEST_IDENTITY);
  }

  send(
    intent: TableIntent,
    options: { inputId?: string; source?: TableInputSource } = {},
  ): TableDispatchReceipt {
    this.counter += 1;
    const result = dispatchTableInput(this.state, {
      inputId: options.inputId ?? `port:${this.counter}`,
      source: options.source ?? "desktop",
      intent,
    });
    this.state = result.state;
    return result.receipt;
  }

  /** Sends the same envelope twice without advancing the counter. */
  sendTwice(intent: TableIntent, inputId: string): [TableDispatchReceipt, TableDispatchReceipt] {
    return [this.send(intent, { inputId }), this.send(intent, { inputId })];
  }
}

/**
 * "bid" takes the highest legal contract so the kitty path gets exercised;
 * "pass" hands the contract to a machine seat instead.
 */
function chooseAuction(projection: XrTableProjection, policy: AuctionPolicy) {
  const pass = projection.legalChoices.find((choice) => choice.kind === "pass");
  if (policy === "pass" && pass) return pass;
  const bids = projection.legalChoices.filter((choice) => choice.kind === "bid");
  return bids.length > 0 ? bids[bids.length - 1] : projection.legalChoices[0];
}

/** Plays one South turn through the port. Returns false when nothing is offered. */
export function takeSouthTurn(port: TablePort): boolean {
  const game = port.game;
  if (game.phase === "kitty") {
    game.hands.south.slice(0, DISCARD_PICK_TARGET).forEach((card) => {
      port.send({ kind: "toggle-discard", cardId: card.id });
    });
    return port.send({ kind: "confirm" }).committed;
  }

  const projection = port.projection();
  const choice =
    game.phase === "auction"
      ? chooseAuction(projection, port.auctionPolicy)
      : projection.legalChoices[0];
  if (!choice) return false;

  const receipt = port.send(choice.intent);
  if (receipt.outcome !== "accepted") return false;
  if (choice.intent.kind !== "preview") return receipt.committed;
  return port.send({ kind: "confirm" }).committed;
}

/** Drives South until the predicate holds or the hand is over. */
export function driveUntil(
  port: TablePort,
  predicate: (game: GameState) => boolean,
  guardLimit = 400,
): boolean {
  let guard = 0;
  while (!predicate(port.game)) {
    if (port.game.phase === "summary") return predicate(port.game);
    if (!takeSouthTurn(port)) return predicate(port.game);
    guard += 1;
    if (guard > guardLimit) throw new Error("port driver guard exceeded");
  }
  return true;
}

export function driveHand(port: TablePort, guardLimit = 400): void {
  driveUntil(port, (game) => game.phase === "summary", guardLimit);
}

/** Finds a seed where South wins the auction, so the kitty path is reachable. */
export function seedWhereSouthBids(prefix = "kitty-seed", attempts = 60): string {
  for (let index = 0; index < attempts; index += 1) {
    const seed = `${prefix}-${index}`;
    const port = new TablePort(seed);
    driveUntil(port, (game) => game.phase !== "auction");
    if (port.game.contract?.bidder === "south") return seed;
  }
  throw new Error("no seed produced a South contract");
}
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
