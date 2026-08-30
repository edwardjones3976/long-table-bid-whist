// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
/**
 * Adversarial regressions for the processed-intent ledger. Every intent
 * identity the table has processed — committed, player-local or rejected —
 * stays terminal for the table's lifetime: no flood of later identifiers can
 * make an old request re-evaluable, so an old rejected confirm can never
 * consume a preview that was placed later at the same version.
 */
import { describe, expect, it } from "vitest";

import { stateDigest } from "../../../packages/rules-core/src";
import { createTable, hostActor, playerActor, playerSnapshot, submit } from "./support";

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

  it("keeps a rejected intent terminal after 600 rejected and 4200 local ids and never lets it consume a later same-version preview", () => {
    const table = createTable({ seed: "ledger-terminal" });
    const version = table.currentVersion;

    // A confirm with nothing to confirm is rejected and remembered.
    const early = submit(table, playerActor("south"), { kind: "confirm" }, { intentId: "early-rejected" });
    expect(early.receipt.outcome).toBe("rejected");
    expect(early.receipt.code).toBe("nothing-to-confirm");

    for (let index = 0; index < 600; index += 1) {
      expect(submit(table, playerActor("south"), { kind: "confirm" }, { intentId: `later-rejected-${index}` }).receipt.code).toBe("nothing-to-confirm");
    }
    for (let index = 0; index < 4200; index += 1) {
      expect(submit(table, playerActor("south"), { kind: "cancel" }, { intentId: `later-local-${index}` }).receipt.outcome).toBe("accepted");
    }
    expect(table.processedIntentCount()).toBe(1 + 600 + 4200);

    // A preview is now pending at the same shared version.
    const preview = submit(table, playerActor("south"), { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } });
    expect(preview.receipt.outcome).toBe("accepted");
    expect(playerSnapshot(table, "south").previewLabel).toBe("3 High");
    const digest = stateDigest(table.committedState());

    // The old rejected confirm, replayed now, must not become a fresh confirm that commits the preview.
    const replayed = submit(table, playerActor("south"), { kind: "confirm" }, { intentId: "early-rejected" });
    expect(replayed.receipt.outcome).toBe("duplicate");
    expect(replayed.receipt.code).toBe("duplicate-input-id");
    expect(replayed.receipt.committed).toBe(false);
    expect(replayed.frame).toBeNull();
    expect(table.currentVersion).toBe(version);
    expect(stateDigest(table.committedState())).toBe(digest);
    expect(playerSnapshot(table, "south").previewLabel).toBe("3 High");

    // Every other identity from the flood is terminal as well, whatever its first outcome was.
    expect(submit(table, playerActor("south"), { kind: "confirm" }, { intentId: "later-rejected-0" }).receipt.outcome).toBe("duplicate");
    expect(submit(table, playerActor("south"), { kind: "confirm" }, { intentId: "later-local-0" }).receipt.outcome).toBe("duplicate");
    expect(submit(table, playerActor("south"), { kind: "confirm" }, { intentId: "later-local-4199" }).receipt.outcome).toBe("duplicate");
    expect(playerSnapshot(table, "south").previewLabel).toBe("3 High");
    expect(table.processedIntentCount()).toBe(1 + 600 + 4200 + 1);

    // A genuinely fresh confirm still commits the pending preview, so the ledger is not vacuous.
    const fresh = submit(table, playerActor("south"), { kind: "confirm" }, { intentId: "fresh-confirm" });
    expect(fresh.receipt.committed).toBe(true);
    expect(table.currentVersion).toBe(version + 1);
  });

  it("answers a replayed rejected id with the duplicate outcome even when the original cause no longer applies", () => {
    const table = createTable({ seed: "ledger-cause-gone" });
    const stale = submit(table, playerActor("south"), { kind: "preview", selection: { type: "pass" } }, { intentId: "once-stale", expectedVersion: 0 });
    expect(stale.receipt.code).toBe("stale-version");
    // With the correct version supplied, the same identity is still terminal.
    const again = submit(table, playerActor("south"), { kind: "preview", selection: { type: "pass" } }, { intentId: "once-stale" });
    expect(again.receipt.outcome).toBe("duplicate");
    expect(playerSnapshot(table, "south").previewLabel).toBeNull();
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
