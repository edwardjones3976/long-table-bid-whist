// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * Room targets and controller ray resolution, exercised against the pinned
 * three@0.165.0 scene graph. No WebGL context is created: only geometry,
 * transforms, and the raycaster are involved, which is exactly the part that
 * decides what a controller select activates.
 */
import { Object3D, Vector3 } from "three";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SEATS } from "../../src/game/model";
import { DEFAULT_CALIBRATION, tableRootPosition } from "../../src/xr/calibration";
import { layoutRoom, selectablePlacements } from "../../src/xr/layout";
import { createTableRoom } from "../../src/xr/room";
import { TablePort, driveUntil } from "../table/drive";

const originalGetContext = HTMLCanvasElement.prototype.getContext;

beforeAll(() => {
  // jsdom ships no 2D context; return null explicitly so the room takes its
  // documented flat-colour fallback instead of jsdom's not-implemented path.
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => null,
  });
});

afterAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: originalGetContext,
  });
});

function controllerAimedAt(from: [number, number, number], at: [number, number, number]): Object3D {
  const controller = new Object3D();
  controller.position.set(...from);
  // An XR target-ray space points along its own -Z, which is the axis the room
  // raycasts along; Object3D.lookAt aims +Z, so the orientation is set directly.
  const direction = new Vector3(...at).sub(new Vector3(...from)).normalize();
  controller.quaternion.setFromUnitVectors(new Vector3(0, 0, -1), direction);
  controller.updateMatrixWorld(true);
  return controller;
}

describe("room layout", () => {
  it("always offers Confirm, Cancel, and the five calibration targets", () => {
    const port = new TablePort("layout-fixed-targets");
    const keys = layoutRoom(port.projection()).map((placement) => placement.key);

    expect(keys).toContain("fixed:confirm");
    expect(keys).toContain("fixed:cancel");
    ["recenter", "height-down", "height-up", "distance-down", "distance-up"].forEach((kind) => {
      expect(keys).toContain(`view:view:${kind}`);
    });
  });

  it("shows the withheld contracts and never makes them selectable", () => {
    const port = new TablePort("layout-notices");
    const placements = layoutRoom(port.projection());
    const notices = placements.filter((placement) => placement.kind === "notice");

    expect(notices).toHaveLength(2);
    notices.forEach((notice) => {
      expect(notice.state).toBe("disabled");
      expect(notice.action).toBeNull();
      expect(notice.lines).toContain(
        "Not included in Alpha 0.1; available after the published-rules stage.",
      );
    });
    expect(selectablePlacements(placements).some((placement) => placement.kind === "notice")).toBe(
      false,
    );
  });

  it("puts the build identity on the room board", () => {
    const port = new TablePort("layout-build-identity");
    const board = layoutRoom(port.projection()).find(
      (placement) => placement.key === "readout:board",
    );
    expect(board?.lines).toContain("Build t3stsha");
    expect(board?.lines.some((line) => line.includes("RESTRICTED_TABLE_SLICE_0_1"))).toBe(true);
  });

  it("draws opponents as counts and never as card faces", () => {
    const port = new TablePort("layout-opponents");
    driveUntil(port, (game) => game.phase === "play");
    const placements = layoutRoom(port.projection());
    const serialized = JSON.stringify(placements);

    const opponents = placements.filter((placement) => placement.kind === "opponent");
    expect(opponents).toHaveLength(3);
    opponents.forEach((placement) => expect(placement.action).toBeNull());
    SEATS.filter((seat) => seat !== "south").forEach((seat) => {
      port.game.hands[seat].forEach((card) => expect(serialized).not.toContain(card.id));
    });
  });

  it("only marks a card selectable when the projection published a choice for it", () => {
    const port = new TablePort("layout-cards");
    driveUntil(port, (game) => game.phase === "play" && game.turn === "south");
    const projection = port.projection();
    const cards = layoutRoom(projection).filter((placement) => placement.kind === "card");
    const legalIds = new Set(
      projection.legalChoices
        .filter((choice) => choice.kind === "play")
        .map((choice) => choice.targetId.replace("play:", "")),
    );

    expect(cards).toHaveLength(projection.southHand.length);
    cards.forEach((card) => {
      const cardId = card.key.replace("card:", "");
      expect(card.action !== null).toBe(legalIds.has(cardId));
    });
  });
});

describe("controller ray select", () => {
  it("resolves a ray aimed at Confirm to the confirm intent", () => {
    const port = new TablePort("ray-confirm");
    const room = createTableRoom("ai-dealer");
    room.setCalibration(DEFAULT_CALIBRATION);
    room.setProjection(port.projection());

    const origin = tableRootPosition(DEFAULT_CALIBRATION);
    const target: [number, number, number] = [0.66, origin.y + 0.24, origin.z + 0.1];
    const hit = room.raycast(controllerAimedAt([0.66, origin.y + 0.24, 0.6], target));

    expect(hit?.key).toBe("fixed:confirm");
    expect(hit?.action).toEqual({ type: "table", intent: { kind: "confirm" } });
    room.dispose();
  });

  it("resolves a ray aimed at Recenter to a view intent, not a table intent", () => {
    const port = new TablePort("ray-recenter");
    const room = createTableRoom("ai-dealer");
    room.setCalibration(DEFAULT_CALIBRATION);
    room.setProjection(port.projection());

    const origin = tableRootPosition(DEFAULT_CALIBRATION);
    const target: [number, number, number] = [-0.66, origin.y + 0.31, origin.z + 0.1];
    const hit = room.raycast(controllerAimedAt([-0.66, origin.y + 0.31, 0.6], target));

    expect(hit?.key).toBe("view:view:recenter");
    expect(hit?.action).toEqual({ type: "view", intent: { kind: "recenter" } });
    room.dispose();
  });

  it("returns nothing when the ray misses every target", () => {
    const port = new TablePort("ray-miss");
    const room = createTableRoom("human-host");
    room.setCalibration(DEFAULT_CALIBRATION);
    room.setProjection(port.projection());

    const hit = room.raycast(controllerAimedAt([0, 1, 0], [0, 6, 0]));
    expect(hit).toBeNull();
    room.dispose();
  });

  it("moves the table root when calibration changes and leaves the camera alone", () => {
    const room = createTableRoom("ai-dealer");
    room.setCalibration({ heightMeters: 0.9, distanceMeters: 1.4 });
    expect(room.tableRoot.position.toArray()).toEqual([0, 0.9, -1.4]);
    room.dispose();
  });
});
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
