// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
import { describe, expect, it } from "vitest";

import { MANIFEST_BID_LEVELS, MANIFEST_CONTRACT_MODES, MANIFEST_ID } from "../../../src/game/model";
import { RULES_MANIFEST, createDeck, manifestDigest } from "../src";

describe("rules manifest", () => {
  it("records the oracle's active manifest without widening it", () => {
    expect(RULES_MANIFEST.id).toBe(MANIFEST_ID);
    expect(RULES_MANIFEST.id).toBe("RESTRICTED_TABLE_SLICE_0_1");
    expect(RULES_MANIFEST.bidLevels).toEqual(MANIFEST_BID_LEVELS);
    expect(RULES_MANIFEST.bidLevels).toEqual([3, 4, 5, 6]);
    expect(RULES_MANIFEST.contractModes).toEqual(MANIFEST_CONTRACT_MODES);
    expect(RULES_MANIFEST.contractModes).toEqual(["high", "low"]);
    expect(RULES_MANIFEST.deckSize).toBe(createDeck().length);
    expect(RULES_MANIFEST.cardsPerSeat * 4 + RULES_MANIFEST.kittySize).toBe(RULES_MANIFEST.deckSize);
  });

  it("has a stable digest", () => {
    expect(manifestDigest()).toMatch(/^[0-9a-f]{8}$/);
    expect(manifestDigest()).toBe(manifestDigest());
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
