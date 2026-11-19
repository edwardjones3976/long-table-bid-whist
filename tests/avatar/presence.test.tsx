/**
 * The presence layer: the gesture picker (avatar/GesturePicker.tsx, opened from the HUD), the comfort switches
 * (state/local.ts, world/Avatars.tsx), the VR look panel's Previous and Next with its draft (avatar/draft.ts,
 * through the desktop editor's own choose), and the pose a VR player sends (avatar/pose.ts).
 */
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG, FIELDS, GESTURES, SET_FIELDS, STARTING_LOOKS, type Field, type Look } from "../../shared/avatar";
import { lookDraft, shownLook, stepOption } from "../../client/src/avatar/draft";
import { GESTURE_COOLDOWN_MS } from "../../client/src/avatar/gestures";
import { bodyYaw, HEAD_LEAD, poseToSend } from "../../client/src/avatar/pose";
import { reactionsOn } from "../../client/src/avatar/reactions";
import { Hud } from "../../client/src/hud/Hud";
import { choose } from "../../client/src/hud/look/LookEditor";
import { net } from "../../client/src/net/store";
import { local } from "../../client/src/state/local";
import { detailFor } from "../../client/src/world/Avatars";

const stored = new Map<string, string>();

beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value) });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("gesture picker", () => {
  const press = (key: string, code = `Digit${key}`) => act(() => void fireEvent.keyDown(window, { key, code }));

  it("opens with G or the Menu, plays gestures by number key 1 to 7, and waits out the cooldown", async () => {
    vi.useFakeTimers();
    const sent = vi.spyOn(net, "gesture").mockResolvedValue({ ok: true });
    render(<Hud tables={false} />);
    expect(screen.queryByRole("dialog", { name: "Gestures" })).toBeNull();
    press("g", "KeyG");
    const picker = screen.getByRole("dialog", { name: "Gestures" });
    expect(within(picker).getAllByRole("button").map((button) => button.textContent)).toEqual([...GESTURES.map(({ label }, i) => `${i + 1} ${label}`), "Close"]);

    press("1");
    expect(sent).toHaveBeenLastCalledWith("wave");
    // Within the cooldown nothing more goes, by key or by button, and the buttons say they are waiting.
    press("2");
    fireEvent.click(within(picker).getByRole("button", { name: "3 Laugh" }));
    expect(sent).toHaveBeenCalledTimes(1);
    expect(within(picker).getByRole("button", { name: "2 Clap" }).getAttribute("aria-disabled")).toBe("true");
    await act(async () => void vi.advanceTimersByTime(GESTURE_COOLDOWN_MS));
    expect(within(picker).getByRole("button", { name: "2 Clap" }).getAttribute("aria-disabled")).toBeNull();

    press("7");
    expect(sent).toHaveBeenLastCalledWith("shake");
    await act(async () => void vi.advanceTimersByTime(GESTURE_COOLDOWN_MS));
    press("8");
    expect(sent).toHaveBeenCalledTimes(2);

    press("Escape", "Escape");
    expect(screen.queryByRole("dialog", { name: "Gestures" })).toBeNull();
    // The Menu's button opens it too, and G closes it again.
    fireEvent.click(screen.getByTestId("hud-menu"));
    fireEvent.click(screen.getByTestId("hud-gestures"));
    expect(screen.getByRole("dialog", { name: "Gestures" })).toBeTruthy();
    press("g", "KeyG");
    expect(screen.queryByRole("dialog", { name: "Gestures" })).toBeNull();
  });

  it("never sends at a rate the server refuses: one gesture per cooldown is under 3 in 4 seconds, with 2 s to spare for a slow network", () => {
    // Four sends span three cooldowns; the server counts arrivals within 4 s.
    expect(3 * GESTURE_COOLDOWN_MS - 4000).toBeGreaterThanOrEqual(2000);
  });
});

describe("comfort switches", () => {
  it("are in Settings, saved with the other settings, and kept after a reload", async () => {
    render(<Hud tables={false} />);
    fireEvent.click(screen.getByTestId("settings-toggle"));
    expect(local.getState().comfort).toMatchObject({ simpleShapes: false, hideGestures: false, reactions: true });
    fireEvent.click(screen.getByLabelText("Show others as simple shapes"));
    fireEvent.click(screen.getByLabelText("Hide gestures"));
    fireEvent.click(screen.getByLabelText("Reactions at the table"));
    expect(local.getState().comfort).toMatchObject({ simpleShapes: true, hideGestures: true, reactions: false });
    expect(reactionsOn(local.getState().comfort)).toBe(false);

    vi.resetModules();
    const reloaded = await import("../../client/src/state/local");
    expect(reloaded.local.getState().comfort).toMatchObject({ simpleShapes: true, hideGestures: true, reactions: false });
    local.setComfort({ simpleShapes: false, hideGestures: false, reactions: true });
  });

  it("simple shapes draws everyone simple at any distance; without it the detail goes by distance, steady near the line", () => {
    for (const distance of [1, 8, 30]) expect(detailFor(distance, "near", true)).toBe("simple");
    expect(detailFor(3, "simple", false)).toBe("near");
    expect(detailFor(20, "simple", false)).toBe("far");
    expect(detailFor(8, "simple", false)).toBe("near");
    expect(detailFor(8, "far", false)).toBe("far");
    expect(detailFor(8, "near", false)).toBe("near");
  });
});

describe("VR look panel", () => {
  const singles = FIELDS.filter((field) => !(field in SET_FIELDS));

  it("walks every option of every one-choice field with Next, and back again with Previous", () => {
    for (const field of singles) {
      for (const dir of [1, -1] as const) {
        let look: Look = STARTING_LOOKS[0];
        const seen: string[] = [];
        for (const _ of CATALOG[field]) {
          const result = choose(look, field, stepOption(field, look[field] as string, dir));
          if (!("look" in result)) throw new Error(`${field} refused a step`);
          look = result.look;
          seen.push(look[field] as string);
        }
        expect(new Set(seen).size, field).toBe(CATALOG[field].length);
        expect(look[field], field).toBe(STARTING_LOOKS[0][field]);
      }
    }
  });

  it("steps round the ends", () => {
    const ids = CATALOG.hair.map((option) => option.id);
    expect(stepOption("hair", ids[ids.length - 1], 1)).toBe(ids[0]);
    expect(stepOption("hair", ids[0], -1)).toBe(ids[ids.length - 1]);
  });

  it("keeps a draft with Undo and Before, and leaves the saved look alone until Save", () => {
    const saved = STARTING_LOOKS[0];
    lookDraft.open(saved);
    const field: Field = "hairColor";
    const changed = choose(saved, field, stepOption(field, saved.hairColor, 1));
    if (!("look" in changed)) throw new Error("refused");
    lookDraft.change(changed.look);
    expect(lookDraft.get()?.draft).toEqual(changed.look);
    lookDraft.before(true);
    expect(shownLook(lookDraft.get()!)).toEqual(saved);
    lookDraft.before(false);
    expect(shownLook(lookDraft.get()!)).toEqual(changed.look);
    lookDraft.undo();
    expect(lookDraft.get()?.draft).toEqual(saved);
    lookDraft.close();
    expect(lookDraft.get()).toBeNull();
  });

  it("keeps the edits when Your look is pressed again while the panel is open", () => {
    lookDraft.open(STARTING_LOOKS[0]);
    lookDraft.change(STARTING_LOOKS[1]);
    lookDraft.open(STARTING_LOOKS[0]);
    expect(lookDraft.get()).toMatchObject({ draft: STARTING_LOOKS[1], past: [STARTING_LOOKS[0]] });
    lookDraft.close();
  });
});

describe("the pose sent to the room", () => {
  const feet = { x: 2, y: 0.3, z: -4 };

  it("on a desktop or phone carries no head and no hands", () => {
    const pose = poseToSend(feet, 0.5);
    expect(pose).toEqual({ x: 2, z: -4, ry: 0.5, y: 0.3 });
    expect(JSON.parse(JSON.stringify(pose))).not.toHaveProperty("head");
  });

  it("in VR carries the head turned from the body and both hands from the feet point, in the body's own frame", () => {
    // Facing -x (ry = pi/2): a hand half a metre ahead and a metre up is straight in front, at z -0.5.
    const pose = poseToSend(feet, Math.PI / 2, {
      headYaw: Math.PI / 2 + 0.4,
      pitch: -0.3,
      hands: [{ x: feet.x - 0.5, y: feet.y + 1, z: feet.z }, null],
    });
    expect(pose.head?.yaw).toBeCloseTo(0.4);
    expect(pose.head?.pitch).toBeCloseTo(-0.3);
    expect(pose.hands?.[0]?.x).toBeCloseTo(0);
    expect(pose.hands?.[0]?.y).toBeCloseTo(1);
    expect(pose.hands?.[0]?.z).toBeCloseTo(-0.5);
    expect(pose.hands?.[1]).toBeNull();
  });

  it("keeps head and hands within the limits the server allows", () => {
    const pose = poseToSend(feet, 0, { headYaw: 3, pitch: -2, hands: [{ x: 9, y: -1, z: -9 }, { x: 0, y: 9, z: 0 }] });
    expect(pose.head).toEqual({ pitch: -1.2, yaw: 1.2 });
    expect(pose.hands).toEqual([
      { x: 1.2, y: 0, z: -1.2 },
      { x: -1.2, y: 2.4, z: 1.2 },
    ]);
  });

  it("turns the body after the head only once the head is well away", () => {
    expect(bodyYaw(null, 1)).toBe(1);
    expect(bodyYaw(0, HEAD_LEAD - 0.1)).toBe(0);
    expect(bodyYaw(0, 1)).toBeCloseTo(1 - HEAD_LEAD);
    expect(bodyYaw(0, -1)).toBeCloseTo(-1 + HEAD_LEAD);
    // Across the back of the circle the short way round is taken.
    expect(bodyYaw(3, -3)).toBe(3);
  });
});
