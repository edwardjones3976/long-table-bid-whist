// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * Seated calibration.
 *
 * Height and distance are stepped and clamped in integer centimetres so the
 * published step sizes stay exact — 0.05 m and 0.10 m — instead of drifting
 * through repeated floating-point addition.
 *
 * Calibration is held for the browser page, not for a single XR session, so
 * leaving and re-entering the room keeps the seated pose the player set.
 *
 * The calibration is applied by moving the table root. The camera is owned by
 * the headset pose and is never written to.
 */
export type XrViewIntentKind =
  | "recenter"
  | "height-down"
  | "height-up"
  | "distance-down"
  | "distance-up";

export interface XrViewIntent {
  kind: XrViewIntentKind;
}

export interface XrCalibration {
  /** Table surface height above the floor, in metres. */
  heightMeters: number;
  /** Table centre distance forward of the seated origin, in metres. */
  distanceMeters: number;
}

export const HEIGHT_MIN_METERS = 0.55;
export const HEIGHT_MAX_METERS = 1.0;
export const HEIGHT_STEP_METERS = 0.05;

export const DISTANCE_MIN_METERS = 0.8;
export const DISTANCE_MAX_METERS = 1.6;
export const DISTANCE_STEP_METERS = 0.1;

export const DEFAULT_CALIBRATION: XrCalibration = {
  heightMeters: 0.75,
  distanceMeters: 1.2,
};

const HEIGHT_MIN_CM = Math.round(HEIGHT_MIN_METERS * 100);
const HEIGHT_MAX_CM = Math.round(HEIGHT_MAX_METERS * 100);
const HEIGHT_STEP_CM = Math.round(HEIGHT_STEP_METERS * 100);
const DISTANCE_MIN_CM = Math.round(DISTANCE_MIN_METERS * 100);
const DISTANCE_MAX_CM = Math.round(DISTANCE_MAX_METERS * 100);
const DISTANCE_STEP_CM = Math.round(DISTANCE_STEP_METERS * 100);

function clampCm(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function stepCm(currentMeters: number, deltaCm: number, min: number, max: number): number {
  return clampCm(Math.round(currentMeters * 100) + deltaCm, min, max) / 100;
}

/** Pure calibration transition. Returns a new calibration; never mutates the input. */
export function applyViewIntent(current: XrCalibration, intent: XrViewIntent): XrCalibration {
  switch (intent.kind) {
    case "recenter":
      return { ...DEFAULT_CALIBRATION };
    case "height-down":
      return {
        ...current,
        heightMeters: stepCm(current.heightMeters, -HEIGHT_STEP_CM, HEIGHT_MIN_CM, HEIGHT_MAX_CM),
      };
    case "height-up":
      return {
        ...current,
        heightMeters: stepCm(current.heightMeters, HEIGHT_STEP_CM, HEIGHT_MIN_CM, HEIGHT_MAX_CM),
      };
    case "distance-down":
      return {
        ...current,
        distanceMeters: stepCm(
          current.distanceMeters,
          -DISTANCE_STEP_CM,
          DISTANCE_MIN_CM,
          DISTANCE_MAX_CM,
        ),
      };
    case "distance-up":
      return {
        ...current,
        distanceMeters: stepCm(
          current.distanceMeters,
          DISTANCE_STEP_CM,
          DISTANCE_MIN_CM,
          DISTANCE_MAX_CM,
        ),
      };
  }
}

/**
 * Table root placement for a calibration. The table is pushed forward along -Z
 * and lifted to the calibrated height; the camera is untouched.
 */
export function tableRootPosition(calibration: XrCalibration): {
  x: number;
  y: number;
  z: number;
} {
  return { x: 0, y: calibration.heightMeters, z: -calibration.distanceMeters };
}

let pageCalibration: XrCalibration = { ...DEFAULT_CALIBRATION };

/** Page-scoped calibration, preserved across XR sessions within this page load. */
export function readPageCalibration(): XrCalibration {
  return { ...pageCalibration };
}

export function updatePageCalibration(intent: XrViewIntent): XrCalibration {
  pageCalibration = applyViewIntent(pageCalibration, intent);
  return { ...pageCalibration };
}
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]
