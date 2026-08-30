// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
/**
 * Adversarial regression for intent-id ledgers. An intent that advanced
 * authoritative state stays idempotent for the table's lifetime: neither a
 * flood of rejected intents nor a flood of accepted local intents can evict
 * it, so it can never be re-applied.
 */
import { describe, expect, it } from "vitest";

import { stateDigest } from "../../../packages/rules-core/src";
import { createTable, hostActor, playerActor, submit } from "./support";

describe("idempotency under ledger pressure", () => {
  it("keeps a committed intent idempotent after more than 512 rejected and 512 accepted later intent ids", () => {
    const table = createTable({ seed: "ledger-flood" });
    submit(table, playerActor("south"), { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } });
    const committed = submit(table, playerActor("south"), { kind: "confirm" }, { intentId: "the-committed-one" });
    expect(committed.receipt.committed).toBe(true);
    const version = table.currentVersion;
    const digest = stateDigest(table.committedState());

    // 600 rejected intents with fresh ids: a stale version each time.
    for (let index = 0; index < 600; index += 1) {
      const rejected = submit(table, playerActor("south"), { kind: "cancel" }, { intentId: `flood-rejected-${index}`, expectedVersion: 0 });
      expect(rejected.receipt.code).toBe("stale-version");
    }
    // 600 accepted local intents with fresh ids.
    for (let index = 0; index < 600; index += 1) {
      const accepted = submit(table, playerActor("south"), { kind: "cancel" }, { intentId: `flood-accepted-${index}` });
      expect(accepted.receipt.outcome).toBe("accepted");
    }
    // 20 accepted authoritative intents with fresh ids.
    for (let index = 0; index < 20; index += 1) {
      const announced = submit(table, hostActor(), { kind: "host-announce", cue: "welcome" }, { intentId: `flood-authoritative-${index}` });
      expect(announced.receipt.outcome).toBe("accepted");
    }
    expect(table.currentVersion).toBe(version + 20);

    const replayed = submit(table, playerActor("south"), { kind: "confirm" }, { intentId: "the-committed-one" });
    expect(replayed.receipt.outcome).toBe("duplicate");
    expect(replayed.receipt.code).toBe("duplicate-input-id");
    expect(replayed.receipt.committed).toBe(false);
    expect(replayed.frame).toBeNull();
    expect(stateDigest(table.committedState())).toBe(digest);
    expect(table.currentVersion).toBe(version + 20);

    // Authoritative ids replayed from the flood are duplicates too.
    expect(submit(table, hostActor(), { kind: "host-announce", cue: "welcome" }, { intentId: "flood-authoritative-0" }).receipt.outcome).toBe("duplicate");
  });

  it("still answers a recently rejected id as a duplicate while an old rejected id may be evaluated afresh", () => {
    const table = createTable({ seed: "ledger-rejected" });
    submit(table, playerActor("south"), { kind: "confirm" }, { intentId: "early-rejected" });
    for (let index = 0; index < 600; index += 1) {
      submit(table, playerActor("south"), { kind: "confirm" }, { intentId: `later-rejected-${index}` });
    }
    expect(submit(table, playerActor("south"), { kind: "confirm" }, { intentId: "later-rejected-599" }).receipt.outcome).toBe("duplicate");
    // The evicted rejected id changed nothing when first seen; re-evaluating it is a fresh rejection, not a replay.
    const fresh = submit(table, playerActor("south"), { kind: "confirm" }, { intentId: "early-rejected" });
    expect(fresh.receipt.outcome).toBe("rejected");
    expect(fresh.receipt.code).toBe("nothing-to-confirm");
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
