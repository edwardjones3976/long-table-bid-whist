// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * Structural isolation of the XR projection.
 *
 * Per director/privacy-control-policy.md the boundary is a typed allowlisted
 * data-transfer object, so these tests check the complete serialized structure
 * and a counterfactual: replacing every concealed card with a different one must
 * leave the projection byte-identical.
 */
import { describe, expect, it } from "vitest";

import { SEATS, type Card, type GameState, type Seat } from "../../src/game/model";
import { createInteractionState } from "../../src/table/interaction";
import {
  XR_OPPONENT_KEYS,
  XR_PROJECTION_KEYS,
  XR_SOUTH_CARD_KEYS,
  buildXrTableProjection,
} from "../../src/table/projection";
import { TEST_IDENTITY, TablePort, driveUntil } from "./drive";

const GHOST_LABEL = "GHOSTCARD";

function ghostCards(seat: string, count: number): Card[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `ghost-${seat}-${index}`,
    suit: "spades" as const,
    rank: 2,
    label: GHOST_LABEL,
    glyph: "!",
  }));
}

/**
 * Same public facts, entirely different concealed facts: a different seed, a
 * different card in every hand South cannot see, a different kitty, a different
 * discard pile, and a different private event log.
 */
function concealedCounterfactual(game: GameState): GameState {
  const variant = structuredClone(game);
  variant.seed = "counterfactual-seed";
  SEATS.filter((seat) => seat !== "south").forEach((seat: Seat) => {
    variant.hands[seat] = ghostCards(seat, variant.hands[seat].length);
  });
  variant.kitty = ghostCards("kitty", variant.kitty.length);
  variant.discardPile = ghostCards("discard", variant.discardPile.length);
  variant.events = [{ id: 1, text: `private host record ${GHOST_LABEL}` }];
  return variant;
}

function reachableObjects(value: unknown, seen = new Set<object>()): Set<object> {
  if (value === null || typeof value !== "object") return seen;
  if (seen.has(value as object)) return seen;
  seen.add(value as object);
  Object.values(value as Record<string, unknown>).forEach((child) =>
    reachableObjects(child, seen),
  );
  return seen;
}

function projectionAt(game: GameState) {
  return buildXrTableProjection(createInteractionState(game), TEST_IDENTITY);
}

describe("XR projection — counterfactual concealed state", () => {
  it("is unchanged when every concealed card is replaced", () => {
    const port = new TablePort("counterfactual-play");
    driveUntil(port, (game) => game.phase === "play" && game.completedTricks.length >= 1);

    const actual = projectionAt(port.game);
    const counterfactual = projectionAt(concealedCounterfactual(port.game));

    expect(counterfactual).toEqual(actual);
    expect(JSON.stringify(counterfactual)).not.toContain(GHOST_LABEL);
    expect(JSON.stringify(counterfactual)).not.toContain("counterfactual-seed");
  });

  it("is unchanged across the kitty phase where the concealed kitty was taken", () => {
    const port = new TablePort("counterfactual-auction");
    const actual = projectionAt(port.game);
    const counterfactual = projectionAt(concealedCounterfactual(port.game));

    expect(counterfactual).toEqual(actual);
  });

  it("still changes when South's own hand changes, so the check is not vacuous", () => {
    const port = new TablePort("counterfactual-control");
    driveUntil(port, (game) => game.phase === "play" && game.turn === "south");

    const mutated = structuredClone(port.game);
    mutated.hands.south = ghostCards("south", mutated.hands.south.length);

    expect(projectionAt(mutated)).not.toEqual(projectionAt(port.game));
  });
});

describe("XR projection — closed structure", () => {
  it("publishes exactly the allowlisted fields and nothing else", () => {
    const port = new TablePort("closed-structure");
    driveUntil(port, (game) => game.phase === "play");
    const projection = port.projection();

    expect(Object.keys(projection).sort()).toEqual([...XR_PROJECTION_KEYS].sort());
    projection.southHand.forEach((card) => {
      expect(Object.keys(card).sort()).toEqual([...XR_SOUTH_CARD_KEYS].sort());
    });
    projection.opponents.forEach((opponent) => {
      expect(Object.keys(opponent).sort()).toEqual([...XR_OPPONENT_KEYS].sort());
    });
  });

  it("gives opponents a count and no card identity", () => {
    const port = new TablePort("opponent-counts");
    driveUntil(port, (game) => game.phase === "play");
    const projection = port.projection();
    const serialized = JSON.stringify(projection);

    expect(projection.opponents).toHaveLength(3);
    projection.opponents.forEach((opponent) => {
      expect(opponent.cardCount).toBe(port.game.hands[opponent.seat].length);
    });

    SEATS.filter((seat) => seat !== "south").forEach((seat) => {
      port.game.hands[seat].forEach((card) => {
        expect(serialized).not.toContain(card.id);
      });
    });
    port.game.kitty.forEach((card) => expect(serialized).not.toContain(card.id));
    port.game.discardPile.forEach((card) => expect(serialized).not.toContain(card.id));
    expect(serialized).not.toContain(port.game.seed);
  });

  it("retains no reference back into the authoritative state", () => {
    const port = new TablePort("no-root-reference");
    driveUntil(port, (game) => game.phase === "play" && game.turn === "south");
    const state = port.state;
    const projection = buildXrTableProjection(state, TEST_IDENTITY);
    const reachable = reachableObjects(projection);

    const forbidden: object[] = [
      state,
      state.game,
      state.game.hands,
      state.game.kitty,
      state.game.events,
      state.game.discardPile,
      state.game.scores,
      state.game.tricksWon,
      state.processedInputIds,
      state.discardIds,
      ...SEATS.map((seat) => state.game.hands[seat]),
      ...SEATS.flatMap((seat) => state.game.hands[seat]),
    ];

    forbidden.forEach((candidate) => {
      expect(reachable.has(candidate)).toBe(false);
    });
  });

  it("carries the build identity and the withheld-contract notices", () => {
    const port = new TablePort("identity-and-notices");
    const projection = port.projection();

    expect(projection.buildShortSha).toBe(TEST_IDENTITY.buildShortSha);
    expect(projection.manifestId).toBe("RESTRICTED_TABLE_SLICE_0_1");
    expect(projection.disabledNotices.map((notice) => notice.id).sort()).toEqual([
      "level-7",
      "no-trump",
    ]);
    projection.disabledNotices.forEach((notice) => {
      expect(notice.explanation).toBe(
        "Not included in Alpha 0.1; available after the published-rules stage.",
      );
    });
    expect(
      projection.legalChoices.every(
        (choice) => choice.kind !== "bid" || /^[3-6] (High|Low)$/.test(choice.label),
      ),
    ).toBe(true);
  });
});
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
