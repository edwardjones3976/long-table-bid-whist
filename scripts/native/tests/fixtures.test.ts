// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Golden fixtures: committed files equal a fresh generation, every value
 * decodes through its closed schema, canonical re-encoding is byte-identical,
 * every rejection example is rejected with the expected code and path, and the
 * manifest's inventories equal the protocol's exact inventories.
 */
import { describe, expect, it } from "vitest";

import {
  AUTHORITY_MESSAGE,
  CLIENT_MESSAGE,
  DEALER_CUES,
  DEALER_CUE_FRAME,
  HOST_PROJECTION,
  INTENT_KINDS,
  INTENT_RECEIPT,
  PLAYER_PROJECTION,
  PUBLIC_PROJECTION,
  REJECTION_CODES,
  SCHEMA_INVENTORIES,
  canonicalJson,
  inventoryViolations,
  matchesInventory,
  type Schema,
} from "../../../packages/protocol/src";
import { buildFixtures, readCommittedFixtures, staleFixtures } from "../generate-fixtures";

const SCHEMAS: Record<string, { schema: Schema<unknown>; label: string }> = {
  "player-projection": { schema: PLAYER_PROJECTION as Schema<unknown>, label: "player" },
  "host-projection": { schema: HOST_PROJECTION as Schema<unknown>, label: "host" },
  "public-projection": { schema: PUBLIC_PROJECTION as Schema<unknown>, label: "public" },
  "client-message": { schema: CLIENT_MESSAGE as Schema<unknown>, label: "client" },
  "authority-message": { schema: AUTHORITY_MESSAGE as Schema<unknown>, label: "authority" },
  "dealer-cue": { schema: DEALER_CUE_FRAME as Schema<unknown>, label: "cue" },
  receipt: { schema: INTENT_RECEIPT as Schema<unknown>, label: "receipt" },
};

interface ProjectionFixture {
  canonical: string;
  value: unknown;
}

interface ListFixture {
  canonical: string[];
}

const committed = readCommittedFixtures();

describe("golden protocol fixtures", () => {
  it("are committed and current", () => {
    expect(staleFixtures()).toEqual([]);
    expect(Object.keys(buildFixtures()).sort()).toEqual(Object.keys(committed).sort());
  });

  it("decode and re-encode byte-identically", () => {
    const player = committed["player-projection.json"] as ProjectionFixture;
    const host = committed["host-projection.json"] as ProjectionFixture;
    const pub = committed["public-projection.json"] as ProjectionFixture;
    for (const [fixture, schema, name] of [
      [player, PLAYER_PROJECTION, "PlayerProjection"],
      [host, HOST_PROJECTION, "HostProjection"],
      [pub, PUBLIC_PROJECTION, "PublicProjection"],
    ] as const) {
      const decoded = (schema as Schema<unknown>).decode(fixture.value, "fixture");
      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        expect(canonicalJson(schema as Schema<unknown>, decoded.value)).toBe(fixture.canonical);
        expect(matchesInventory(name, decoded.value as object)).toBe(true);
      }
    }
    const cues = committed["dealer-cues.json"] as ListFixture & { frames: unknown[] };
    cues.frames.forEach((frame, index) => {
      const decoded = DEALER_CUE_FRAME.decode(frame, "cue");
      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        expect(canonicalJson(DEALER_CUE_FRAME, decoded.value)).toBe(cues.canonical[index]);
        expect(DEALER_CUES).toContain(decoded.value.cue);
        expect(matchesInventory("DealerCueFrame", decoded.value)).toBe(true);
      }
    });
    const clients = committed["client-messages.json"] as ListFixture & { messages: unknown[] };
    clients.messages.forEach((message, index) => {
      const decoded = CLIENT_MESSAGE.decode(message, "client");
      expect(decoded.ok).toBe(true);
      if (decoded.ok) expect(canonicalJson(CLIENT_MESSAGE, decoded.value)).toBe(clients.canonical[index]);
    });
    const authority = committed["authority-messages.json"] as ListFixture & { messages: unknown[] };
    authority.messages.forEach((message, index) => {
      const decoded = AUTHORITY_MESSAGE.decode(message, "authority");
      expect(decoded.ok).toBe(true);
      if (decoded.ok) expect(canonicalJson(AUTHORITY_MESSAGE, decoded.value)).toBe(authority.canonical[index]);
    });
    const receipts = committed["receipts.json"] as Record<string, ProjectionFixture>;
    Object.values(receipts).forEach((fixture) => {
      const decoded = INTENT_RECEIPT.decode(fixture.value, "receipt");
      expect(decoded.ok).toBe(true);
      if (decoded.ok) expect(canonicalJson(INTENT_RECEIPT, decoded.value)).toBe(fixture.canonical);
    });
  });

  it("cover every intent kind and pin the rejection vocabulary", () => {
    const clients = committed["client-messages.json"] as { messages: { type: string; intent?: { kind: string } }[] };
    const kinds = new Set(clients.messages.filter((m) => m.type === "intent").map((m) => m.intent?.kind));
    INTENT_KINDS.forEach((kind) => expect(kinds.has(kind), `no example for ${kind}`).toBe(true));
    const receipts = committed["receipts.json"] as Record<string, ProjectionFixture>;
    const codes = Object.values(receipts).map((fixture) => (fixture.value as { code: string | null }).code);
    ["bid-outside-manifest", "unauthorized-role", "nothing-to-confirm", "not-between-hands", "duplicate-input-id", "stale-version", null].forEach(
      (code) => expect(codes).toContain(code),
    );
    const manifest = committed["manifest.json"] as { vocabulary: { rejectionCodes: string[] } };
    expect(manifest.vocabulary.rejectionCodes).toEqual([...REJECTION_CODES]);
  });

  it("reject every counterexample with the expected code and path", () => {
    const rejections = committed["rejections.json"] as { name: string; schema: string; payload: unknown; code: string; path: string }[];
    expect(rejections.length).toBeGreaterThan(10);
    rejections.forEach((example) => {
      const target = SCHEMAS[example.schema];
      expect(target, example.schema).toBeDefined();
      const result = target.schema.decode(example.payload, target.label);
      expect(result.ok, example.name).toBe(false);
      if (!result.ok) expect(result.rejection, example.name).toEqual({ code: example.code, path: example.path });
    });
  });

  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
  it("publish the exact schema inventories the Unreal mirror is checked against", () => {
    expect(inventoryViolations()).toEqual([]);
    const manifest = committed["manifest.json"] as { inventories: Record<string, string[]> };
    for (const { name, inventory } of SCHEMA_INVENTORIES) {
      expect(manifest.inventories[name], name).toEqual([...inventory]);
    }
    expect(Object.keys(manifest.inventories).sort()).toEqual(SCHEMA_INVENTORIES.map((entry) => entry.name).sort());
    expect("concealedKeys" in (committed["manifest.json"] as object)).toBe(false);
  });

  it("keep host and public byte-identical under the concealed counterfactual", () => {
    const pair = committed["counterfactual.json"] as { host: { actual: unknown; counterfactual: unknown }; public: { actual: unknown; counterfactual: unknown } };
    const host = canonicalJson(HOST_PROJECTION as Schema<unknown>, pair.host.actual);
    expect(canonicalJson(HOST_PROJECTION as Schema<unknown>, pair.host.counterfactual)).toBe(host);
    const pub = canonicalJson(PUBLIC_PROJECTION as Schema<unknown>, pair.public.actual);
    expect(canonicalJson(PUBLIC_PROJECTION as Schema<unknown>, pair.public.counterfactual)).toBe(pub);
    expect(matchesInventory("HostProjection", pair.host.actual as object)).toBe(true);
    expect(matchesInventory("PublicProjection", pair.public.actual as object)).toBe(true);
  });
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
