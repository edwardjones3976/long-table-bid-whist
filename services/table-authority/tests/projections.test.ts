// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
/**
 * Structural isolation of the role projections: exact key inventories,
 * decodability, counterfactual byte-equivalence for host, public and the
 * player's own projection, and no reachable reference back into the
 * authoritative state. Nothing here scans text for forbidden content; the
 * evidence is the closed structure and the counterfactual construction.
 */
import { describe, expect, it } from "vitest";

import { SEATS, type Card, type GameState, type Seat } from "../../../packages/rules-core/src";
import {
  HOST_PROJECTION,
  HOST_PROJECTION_INVENTORY,
  PLAYER_PROJECTION,
  PLAYER_PROJECTION_INVENTORY,
  PUBLIC_PROJECTION,
  PUBLIC_PROJECTION_INVENTORY,
  canonicalJson,
  inventoryViolations,
  matchesInventory,
} from "../../../packages/protocol/src";
import { buildHostProjection, buildPlayerProjection, buildPublicProjection, type TableView } from "../src/projections";
import { EMPTY_UNCOMMITTED } from "../src/seat-interaction";
import { createTable, driveUntil, human } from "./support";

function replacementCards(tag: string, count: number): Card[] {
  return Array.from({ length: count }, (_, index) => ({ id: `other-${tag}-${index}`, suit: "spades" as const, rank: 2, label: "OTHER", glyph: "!" }));
}

/** Same public facts; every fact the kept seat cannot see replaced by different cards, a different seed and a different private log. */
function concealedCounterfactual(game: GameState, keep: Seat): GameState {
  const variant = structuredClone(game);
  variant.seed = "counterfactual-seed";
  SEATS.filter((seat) => seat !== keep).forEach((seat) => {
    variant.hands[seat] = replacementCards(seat, variant.hands[seat].length);
  });
  variant.kitty = replacementCards("kitty", variant.kitty.length);
  variant.discardPile = replacementCards("discard", variant.discardPile.length);
  variant.events = [{ id: 1, text: "private host record" }];
  return variant;
}

function viewOf(game: GameState, tableId = "table-1"): TableView {
  return {
    tableId,
    version: 7,
    game,
    seats: { south: human("south"), west: human("west"), north: { occupant: "ai" }, east: { occupant: "open" } },
    eventEnded: false,
    lastAnnouncement: null,
  };
}

function midPlayGame(seed: string): GameState {
  const table = createTable({ seed });
  driveUntil(table, ["south"], (game) => game.phase === "play" && game.completedTricks.length >= 1 && game.currentTrick.length >= 1);
  return table.committedState();
}

function reachableObjects(value: unknown, seen = new Set<object>()): Set<object> {
  if (value === null || typeof value !== "object") return seen;
  if (seen.has(value as object)) return seen;
  seen.add(value as object);
  Object.values(value as Record<string, unknown>).forEach((child) => reachableObjects(child, seen));
  return seen;
}

describe("role projections — exact inventories", () => {
  it("publish exactly the declared inventory for each role and decode through their schemas", () => {
    expect(inventoryViolations()).toEqual([]);
    const view = viewOf(midPlayGame("closed-keys"));
    const player = buildPlayerProjection(view, "south", EMPTY_UNCOMMITTED, 0, null);
    const host = buildHostProjection(view);
    const pub = buildPublicProjection(view);
    expect(Object.keys(player)).toEqual([...PLAYER_PROJECTION_INVENTORY]);
    expect(Object.keys(host)).toEqual([...HOST_PROJECTION_INVENTORY]);
    expect(Object.keys(pub)).toEqual([...PUBLIC_PROJECTION_INVENTORY]);
    expect(matchesInventory("PlayerProjection", player)).toBe(true);
    expect(matchesInventory("HostProjection", host)).toBe(true);
    expect(matchesInventory("PublicProjection", pub)).toBe(true);
    expect(PLAYER_PROJECTION.decode(player, "player").ok).toBe(true);
    expect(HOST_PROJECTION.decode(host, "host").ok).toBe(true);
    expect(PUBLIC_PROJECTION.decode(pub, "public").ok).toBe(true);
  });

  it("host and public inventories are the public core plus role fields and nothing else", () => {
    expect([...HOST_PROJECTION_INVENTORY]).toEqual(["role", ...PUBLIC_PROJECTION_INVENTORY.slice(1), "betweenHands", "hostControls", "lastAnnouncement"]);
    expect(PUBLIC_PROJECTION_INVENTORY.length).toBe(24);
    expect(HOST_PROJECTION_INVENTORY.length).toBe(27);
    expect(PLAYER_PROJECTION_INVENTORY.length).toBe(34);
  });

  it("rejects a member injected into a host or public projection", () => {
    const view = viewOf(midPlayGame("inject"));
    const host = buildHostProjection(view) as unknown as Record<string, unknown>;
    const pub = buildPublicProjection(view) as unknown as Record<string, unknown>;
    const injectedHost = HOST_PROJECTION.decode({ ...host, hand: [] }, "host");
    expect(injectedHost.ok).toBe(false);
    if (!injectedHost.ok) expect(injectedHost.rejection).toEqual({ code: "unknown-field", path: "host.hand" });
    const injectedPublic = PUBLIC_PROJECTION.decode({ ...pub, legalChoices: [] }, "public");
    expect(injectedPublic.ok).toBe(false);
    if (!injectedPublic.ok) expect(injectedPublic.rejection).toEqual({ code: "unknown-field", path: "public.legalChoices" });
  });

  it("gives every seat a card count built from the hand length alone", () => {
    const game = midPlayGame("card-counts");
    const view = viewOf(game);
    const occupancy = buildPublicProjection(view).seats;
    expect(occupancy.map((seat) => seat.cardCount)).toEqual(SEATS.map((seat) => game.hands[seat].length));
    expect(occupancy.map((seat) => seat.occupant)).toEqual(["human", "human", "ai", "open"]);
    expect(occupancy.map((seat) => Object.keys(seat))).toEqual(
      SEATS.map(() => ["seat", "seatLabel", "occupant", "displayName", "connected", "cardCount"]),
    );
  });

  it("retain no reference back into the authoritative state", () => {
    const game = midPlayGame("no-reference");
    const view = viewOf(game);
    const projections = [
      buildPlayerProjection(view, "south", EMPTY_UNCOMMITTED, 0, null),
      buildHostProjection(view),
      buildPublicProjection(view),
    ];
    const forbidden: object[] = [
      game,
      game.hands,
      game.kitty,
      game.events,
      game.discardPile,
      game.scores,
      game.tricksWon,
      game.auction,
      game.currentTrick,
      game.completedTricks,
      ...SEATS.map((seat) => game.hands[seat]),
      ...SEATS.flatMap((seat) => game.hands[seat]),
      ...game.currentTrick.map((played) => played.card),
    ];
    projections.forEach((projection) => {
      const reachable = reachableObjects(projection);
      forbidden.forEach((candidate) => expect(reachable.has(candidate)).toBe(false));
    });
  });
});

describe("role projections — counterfactual concealed state", () => {
  it("leaves host, public and the seat's own projection byte-identical when every concealed fact changes", () => {
    for (const seed of ["cf-a", "cf-b", "cf-c"]) {
      const game = midPlayGame(seed);
      const actual = viewOf(game);
      const counterfactual = viewOf(concealedCounterfactual(game, "south"));

      expect(canonicalJson(HOST_PROJECTION, buildHostProjection(counterfactual))).toBe(
        canonicalJson(HOST_PROJECTION, buildHostProjection(actual)),
      );
      expect(canonicalJson(PUBLIC_PROJECTION, buildPublicProjection(counterfactual))).toBe(
        canonicalJson(PUBLIC_PROJECTION, buildPublicProjection(actual)),
      );
      expect(canonicalJson(PLAYER_PROJECTION, buildPlayerProjection(counterfactual, "south", EMPTY_UNCOMMITTED, 0, null))).toBe(
        canonicalJson(PLAYER_PROJECTION, buildPlayerProjection(actual, "south", EMPTY_UNCOMMITTED, 0, null)),
      );
    }
  });

  it("is not vacuous: West's own projection changes when West's hand changes", () => {
    const game = midPlayGame("cf-control");
    const actual = viewOf(game);
    const counterfactual = viewOf(concealedCounterfactual(game, "south"));
    expect(canonicalJson(PLAYER_PROJECTION, buildPlayerProjection(counterfactual, "west", EMPTY_UNCOMMITTED, 0, null))).not.toBe(
      canonicalJson(PLAYER_PROJECTION, buildPlayerProjection(actual, "west", EMPTY_UNCOMMITTED, 0, null)),
    );
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
