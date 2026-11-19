/**
 * The words of the wrist hints (Hands.tsx draws them): the few controls that matter right now, said the same
 * way as the Controls list in the menu. Pure, so the wording can be tested.
 */
export interface HintInput {
  /** A controller is in the left hand; false means tracked hands, which have no sticks or buttons. */
  controller: boolean;
  /** Seated at a card table: no walking, running, jumping or teleporting. */
  seated: boolean;
  /** The main hand: its stick turns, the other hand's stick moves. */
  dominant: "left" | "right";
  /** "smooth" is Walk and teleport; "teleport" is Teleport only. */
  locomotion: "smooth" | "teleport";
  /** Jumping is switched on in the comfort settings. */
  jump: boolean;
}

export function hintLines({ controller, seated, dominant, locomotion, jump }: HintInput): string[] {
  if (!controller) {
    // A pinch is a tracked hand's grip and trigger at once.
    return seated
      ? ["Pinch at a card, pile or token: take it", "Open your fingers over a drop zone: place it", "Point and pinch: press what the ray points at", "Menu button beside you: settings, leave"]
      : ["Point and pinch: press buttons and chairs", "Pinch at a thing you touch: take it", "Menu button beside you: settings, leave", "Pick up a controller to walk, jump or turn"];
  }
  const move = dominant === "right" ? "Left" : "Right";
  const turn = dominant === "right" ? "Right" : "Left";
  // Jump is the main hand's lower face button and the menu the other hand's (controls/Player.tsx).
  const jumpKey = dominant === "right" ? "A" : "X";
  const menuKey = dominant === "right" ? "X" : "A";
  if (seated) {
    return [
      "Grip: take the card, pile or token you touch",
      "Let go over a drop zone: place it. Elsewhere: it goes back",
      "Trigger: press what the ray points at",
      "Trigger held on a card: carry it from afar",
      `${turn} stick: turn. Stick click: recentre`,
      "B: put back what you carry",
      `${menuKey}: menu    Y: hide these hints`,
    ];
  }
  return [
    "Grip: take what that hand touches",
    "Trigger: press what the ray points at",
    locomotion === "smooth" ? `${move} stick: walk. Click it: run` : `${move} stick forward, let go: teleport`,
    `${turn} stick: turn. Forward, let go: teleport`,
    jump ? `${jumpKey}: jump    B: cancel` : "B: cancel",
    `${menuKey}: menu    Y: hide these hints`,
  ];
}
