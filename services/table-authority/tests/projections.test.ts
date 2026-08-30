// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Structural isolation of the role projections: closed keys, decodability,
 * counterfactual byte-equivalence for host and public, and no reachable
 * reference back into the authoritative state.
 */
import { describe, expect, it } from "vitest";

import { SEATS, type Card, type GameState, type Seat } from "../../../packages/rules-core/src";
import {
  HOST_PROJECTION,
  HOST_PROJECTION_KEYS,
  PLAYER_PROJECTION,
  PLAYER_PROJECTION_KEYS,
  PUBLIC_PROJECTION,
  PUBLIC_PROJECTION_KEYS,
  canonicalJson,
  concealedKeyViolations,
} from "../../../packages/protocol/src";
import { buildHostProjection, buildPlayerProjection, buildPublicProjection, type TableView } from "../src/projections";
import { EMPTY_UNCOMMITTED } from "../src/seat-interaction";
import { createTable, driveUntil, human } from "./support";

const GHOST = "GHOSTCARD";

function ghostCards(tag: string, count: number): Card[] {
  return Array.from({ length: count }, (_, index) => ({ id: `ghost-${tag}-${index}`, suit: "spades" as const, rank: 2, label: GHOST, glyph: "!" }));
}

/** Same public facts; every fact South cannot see replaced. */
function concealedCounterfactual(game: GameState, keep: Seat): GameState {
  const variant = structuredClone(game);
  variant.seed = "counterfactual-seed";
  SEATS.filter((seat) => seat !== keep).forEach((seat) => {
    variant.hands[seat] = ghostCards(seat, variant.hands[seat].length);
  });
  variant.kitty = ghostCards("kitty", variant.kitty.length);
  variant.discardPile = ghostCards("discard", variant.discardPile.length);
  variant.events = [{ id: 1, text: `private host record ${GHOST}` }];
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

describe("role projections — closed structure", () => {
  it("publish exactly the allowlisted keys and decode through their schemas", () => {
    const view = viewOf(midPlayGame("closed-keys"));
    const player = buildPlayerProjection(view, "south", EMPTY_UNCOMMITTED, null);
    const host = buildHostProjection(view);
    const pub = buildPublicProjection(view);
    expect(Object.keys(player).sort()).toEqual([...PLAYER_PROJECTION_KEYS].sort());
    expect(Object.keys(host).sort()).toEqual([...HOST_PROJECTION_KEYS].sort());
    expect(Object.keys(pub).sort()).toEqual([...PUBLIC_PROJECTION_KEYS].sort());
    expect(PLAYER_PROJECTION.decode(player, "player").ok).toBe(true);
    expect(HOST_PROJECTION.decode(host, "host").ok).toBe(true);
    expect(PUBLIC_PROJECTION.decode(pub, "public").ok).toBe(true);
    expect(concealedKeyViolations()).toEqual([]);
  });

  it("declare no concealed member on host and public, and reject one if injected", () => {
    expect(HOST_PROJECTION_KEYS).not.toContain("hand");
    expect(HOST_PROJECTION_KEYS).not.toContain("legalChoices");
    expect(PUBLIC_PROJECTION_KEYS).not.toContain("hand");
    const view = viewOf(midPlayGame("inject"));
    const host = buildHostProjection(view) as unknown as Record<string, unknown>;
    const injected = { ...host, hand: [] };
    const result = HOST_PROJECTION.decode(injected, "host");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rejection).toEqual({ code: "unknown-field", path: "host.hand" });
  });

  it("give every seat a card count and never a concealed card identity", () => {
    const game = midPlayGame("card-counts");
    const view = viewOf(game);
    const host = JSON.stringify(buildHostProjection(view));
    const pub = JSON.stringify(buildPublicProjection(view));
    const south = JSON.stringify(buildPlayerProjection(view, "south", EMPTY_UNCOMMITTED, null));
    SEATS.forEach((seat) => {
      game.hands[seat].forEach((card) => {
        expect(host).not.toContain(card.id);
        expect(pub).not.toContain(card.id);
        if (seat !== "south") expect(south).not.toContain(card.id);
      });
    });
    game.kitty.forEach((card) => expect(host + pub + south).not.toContain(card.id));
    game.discardPile.forEach((card) => expect(host + pub + south).not.toContain(card.id));
    expect(host + pub + south).not.toContain(game.seed);
    const occupancy = buildPublicProjection(view).seats;
    expect(occupancy.map((seat) => seat.cardCount)).toEqual(SEATS.map((seat) => game.hands[seat].length));
    expect(occupancy.map((seat) => seat.occupant)).toEqual(["human", "human", "ai", "open"]);
  });

  it("retain no reference back into the authoritative state", () => {
    const game = midPlayGame("no-reference");
    const view = viewOf(game);
    const projections = [
      buildPlayerProjection(view, "south", EMPTY_UNCOMMITTED, null),
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
  it("leaves host and public projections byte-identical when every concealed fact changes", () => {
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
      // South's own projection sees only South's hand, so it is unchanged as well.
      expect(canonicalJson(PLAYER_PROJECTION, buildPlayerProjection(counterfactual, "south", EMPTY_UNCOMMITTED, null))).toBe(
        canonicalJson(PLAYER_PROJECTION, buildPlayerProjection(actual, "south", EMPTY_UNCOMMITTED, null)),
      );
      expect(JSON.stringify(buildHostProjection(counterfactual))).not.toContain(GHOST);
      expect(JSON.stringify(buildHostProjection(counterfactual))).not.toContain("counterfactual-seed");
    }
  });

  it("is not vacuous: West's own projection changes when West's hand changes", () => {
    const game = midPlayGame("cf-control");
    const actual = viewOf(game);
    const counterfactual = viewOf(concealedCounterfactual(game, "south"));
    expect(canonicalJson(PLAYER_PROJECTION, buildPlayerProjection(counterfactual, "west", EMPTY_UNCOMMITTED, null))).not.toBe(
      canonicalJson(PLAYER_PROJECTION, buildPlayerProjection(actual, "west", EMPTY_UNCOMMITTED, null)),
    );
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
