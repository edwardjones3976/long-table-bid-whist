/**
 * The words of the wrist hints (client/src/controls/hints.ts): the control scheme as a player in a
 * headset is told it, seated and standing, for either main hand, and for tracked hands.
 */
import { describe, expect, it } from "vitest";
import { hintLines, type HintInput } from "../../client/src/controls/hints";

const standing: HintInput = { controller: true, seated: false, dominant: "right", locomotion: "smooth", jump: true };
const seated: HintInput = { ...standing, seated: true };

describe("wrist hints", () => {
  it("standing with controllers: grip, trigger, the move stick, the turn stick, the four buttons", () => {
    expect(hintLines(standing)).toEqual([
      "Grip: take what that hand touches",
      "Trigger: press what the ray points at",
      "Left stick: walk. Click it: run",
      "Right stick: turn. Forward, let go: teleport",
      "A: jump    B: cancel",
      "X: menu    Y: hide these hints",
    ]);
  });

  it("gives the move stick to the off hand and jump to the main hand: for a left-handed player the sticks swap, and so do jump and menu", () => {
    const lines = hintLines({ ...standing, dominant: "left" });
    expect(lines).toContain("Right stick: walk. Click it: run");
    expect(lines).toContain("Left stick: turn. Forward, let go: teleport");
    // The walking thumb never has to leave its stick to jump.
    expect(lines).toContain("X: jump    B: cancel");
    expect(lines).toContain("A: menu    Y: hide these hints");
    expect(hintLines({ ...seated, dominant: "left" })).toContain("A: menu    Y: hide these hints");
  });

  it("in Teleport only, the move stick aims a teleport and nothing walks or runs", () => {
    const lines = hintLines({ ...standing, locomotion: "teleport" });
    expect(lines).toContain("Left stick forward, let go: teleport");
    expect(lines.join(" ")).not.toMatch(/walk|run/i);
    // The turn stick's teleport is there in both modes.
    expect(lines).toContain("Right stick: turn. Forward, let go: teleport");
    expect(hintLines({ ...standing, locomotion: "teleport", dominant: "left" })).toContain("Right stick forward, let go: teleport");
  });

  it("leaves jumping out when it is switched off", () => {
    const lines = hintLines({ ...standing, jump: false });
    expect(lines).toContain("B: cancel");
    expect(lines.join(" ")).not.toMatch(/jump/i);
  });

  it("seated: handling cards, turning and recentring, and no walking, running, jumping or teleporting", () => {
    expect(hintLines(seated)).toEqual([
      "Grip: take the card, pile or token you touch",
      "Let go over a drop zone: place it. Elsewhere: it goes back",
      "Trigger: press what the ray points at",
      "Trigger held on a card: carry it from afar",
      "Right stick: turn. Stick click: recentre",
      "B: put back what you carry",
      "X: menu    Y: hide these hints",
    ]);
    for (const input of [seated, { ...seated, locomotion: "teleport" as const }, { ...seated, jump: false }, { ...seated, dominant: "left" as const }]) {
      expect(hintLines(input).join(" ")).not.toMatch(/walk|run|jump|teleport/i);
    }
    expect(hintLines({ ...seated, dominant: "left" })).toContain("Left stick: turn. Stick click: recentre");
  });

  it("tracked hands: only what a pinch can do, seated and standing", () => {
    const hands = { ...standing, controller: false };
    expect(hintLines({ ...hands, seated: true })).toEqual([
      "Pinch at a card, pile or token: take it",
      "Open your fingers over a drop zone: place it",
      "Point and pinch: press what the ray points at",
      "Menu button beside you: settings, leave",
    ]);
    expect(hintLines(hands)).toEqual([
      "Point and pinch: press buttons and chairs",
      "Pinch at a thing you touch: take it",
      "Menu button beside you: settings, leave",
      "Pick up a controller to walk, jump or turn",
    ]);
    // Hands have no sticks or buttons, whatever the settings say.
    for (const seatedNow of [true, false]) {
      for (const dominant of ["left", "right"] as const) {
        const lines = hintLines({ ...hands, seated: seatedNow, dominant, locomotion: "teleport", jump: false });
        expect(lines.join(" ")).not.toMatch(/stick|Grip|Trigger|\b[ABXY]:/);
        expect(lines).toEqual(hintLines({ ...hands, seated: seatedNow }));
      }
    }
  });

  it("keeps every line short enough to read on the wrist, and never more than seven of them", () => {
    for (const controller of [true, false]) {
      for (const isSeated of [true, false]) {
        for (const dominant of ["left", "right"] as const) {
          for (const locomotion of ["smooth", "teleport"] as const) {
            for (const jump of [true, false]) {
              const lines = hintLines({ controller, seated: isSeated, dominant, locomotion, jump });
              expect(lines.length).toBeGreaterThanOrEqual(4);
              expect(lines.length).toBeLessThanOrEqual(7);
              for (const line of lines) expect(line.length, line).toBeLessThanOrEqual(60);
            }
          }
        }
      }
    }
  });
});
