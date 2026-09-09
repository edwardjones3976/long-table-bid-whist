// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_CALIBRATION,
  DISTANCE_MAX_METERS,
  DISTANCE_MIN_METERS,
  DISTANCE_STEP_METERS,
  HEIGHT_MAX_METERS,
  HEIGHT_MIN_METERS,
  HEIGHT_STEP_METERS,
  applyViewIntent,
  readPageCalibration,
  tableRootPosition,
  updatePageCalibration,
  type XrCalibration,
  type XrViewIntentKind,
} from "../../src/xr/calibration";

function repeat(
  start: XrCalibration,
  kind: XrViewIntentKind,
  times: number,
): XrCalibration {
  let current = start;
  for (let index = 0; index < times; index += 1) current = applyViewIntent(current, { kind });
  return current;
}

beforeEach(() => {
  updatePageCalibration({ kind: "recenter" });
});

describe("seated calibration bounds", () => {
  it("starts inside the recorded bounds", () => {
    expect(DEFAULT_CALIBRATION.heightMeters).toBeGreaterThanOrEqual(HEIGHT_MIN_METERS);
    expect(DEFAULT_CALIBRATION.heightMeters).toBeLessThanOrEqual(HEIGHT_MAX_METERS);
    expect(DEFAULT_CALIBRATION.distanceMeters).toBeGreaterThanOrEqual(DISTANCE_MIN_METERS);
    expect(DEFAULT_CALIBRATION.distanceMeters).toBeLessThanOrEqual(DISTANCE_MAX_METERS);
  });

  it("steps height by exactly the published step with no float drift", () => {
    const up = applyViewIntent(DEFAULT_CALIBRATION, { kind: "height-up" });
    // Exact, not near: 0.75 + 0.05 stepped in whole centimetres.
    expect(up.heightMeters).toBe(0.8);
    expect(HEIGHT_STEP_METERS).toBe(0.05);

    const raised = repeat(DEFAULT_CALIBRATION, "height-up", 5);
    expect(raised.heightMeters).toBe(HEIGHT_MAX_METERS);

    const lowered = repeat(DEFAULT_CALIBRATION, "height-down", 4);
    expect(lowered.heightMeters).toBe(HEIGHT_MIN_METERS);
  });

  it("steps distance by exactly the published step with no float drift", () => {
    const near = repeat(DEFAULT_CALIBRATION, "distance-down", 4);
    expect(near.distanceMeters).toBe(DISTANCE_MIN_METERS);

    const far = repeat(DEFAULT_CALIBRATION, "distance-up", 4);
    expect(far.distanceMeters).toBe(DISTANCE_MAX_METERS);
    expect(DISTANCE_STEP_METERS).toBe(0.1);
    expect(repeat(DEFAULT_CALIBRATION, "distance-up", 1).distanceMeters).toBe(1.3);
  });

  it("clamps at both ends instead of running past the bounds", () => {
    const overRaised = repeat(DEFAULT_CALIBRATION, "height-up", 40);
    const overLowered = repeat(DEFAULT_CALIBRATION, "height-down", 40);
    const overFar = repeat(DEFAULT_CALIBRATION, "distance-up", 40);
    const overNear = repeat(DEFAULT_CALIBRATION, "distance-down", 40);

    expect(overRaised.heightMeters).toBe(HEIGHT_MAX_METERS);
    expect(overLowered.heightMeters).toBe(HEIGHT_MIN_METERS);
    expect(overFar.distanceMeters).toBe(DISTANCE_MAX_METERS);
    expect(overNear.distanceMeters).toBe(DISTANCE_MIN_METERS);
  });

  it("recenters to the default pose", () => {
    const wandered = applyViewIntent(
      repeat(DEFAULT_CALIBRATION, "height-up", 3),
      { kind: "distance-down" },
    );
    expect(applyViewIntent(wandered, { kind: "recenter" })).toEqual(DEFAULT_CALIBRATION);
  });

  it("never mutates the calibration it is handed", () => {
    const start: XrCalibration = { ...DEFAULT_CALIBRATION };
    applyViewIntent(start, { kind: "height-up" });
    applyViewIntent(start, { kind: "distance-up" });
    expect(start).toEqual(DEFAULT_CALIBRATION);
  });

  it("moves the table root and leaves the camera to the headset", () => {
    const position = tableRootPosition({ heightMeters: 0.8, distanceMeters: 1.1 });
    expect(position).toEqual({ x: 0, y: 0.8, z: -1.1 });
  });
});

describe("page-lifetime calibration", () => {
  it("keeps the seated pose across sessions within one page load", () => {
    updatePageCalibration({ kind: "height-up" });
    updatePageCalibration({ kind: "distance-down" });

    // Reading is what a newly entered session does; the pose must survive.
    const afterFirstSession = readPageCalibration();
    expect(afterFirstSession.heightMeters).toBe(0.8);
    expect(afterFirstSession.distanceMeters).toBe(1.1);
    expect(readPageCalibration()).toEqual(afterFirstSession);
  });

  it("hands out copies so a caller cannot edit the stored pose", () => {
    const first = readPageCalibration();
    first.heightMeters = 99;
    expect(readPageCalibration().heightMeters).toBe(DEFAULT_CALIBRATION.heightMeters);
  });

  it("clamps page updates to the recorded bounds too", () => {
    for (let index = 0; index < 40; index += 1) updatePageCalibration({ kind: "height-up" });
    for (let index = 0; index < 40; index += 1) updatePageCalibration({ kind: "distance-down" });

    const stored = readPageCalibration();
    expect(stored.heightMeters).toBe(HEIGHT_MAX_METERS);
    expect(stored.distanceMeters).toBe(DISTANCE_MIN_METERS);
  });
});
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
