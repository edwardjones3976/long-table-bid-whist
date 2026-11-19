/**
 * Keyboard, mouse and (non-VR) gamepad. Everything lands in `desk`, a plain
 * mutable record the player rig reads once a frame: held keys, mouse-look
 * deltas since the last frame, and one-shot requests the rig clears as it
 * handles them. Gamepad actions that only touch the DOM are done here.
 */
import type { RootState } from "@react-three/fiber";
import type { Pose } from "../../../shared/protocol";
import { local } from "../state/local";
import { clickFocused, cycleFocus } from "./activate";
import { deadZone, runLatch } from "./motion";

/** What window.__mansion.rig() answers: the head's place and facing, the feet height, and what the body is doing. */
export interface RigReport {
  x: number;
  z: number;
  ry: number;
  y: number;
  vy: number;
  grounded: boolean;
  running: boolean;
  floating: boolean;
  aiming: boolean;
  aimValid: boolean;
  /** Where the aim lands (the ring or the cross), while aiming. */
  aimX: number;
  aimY: number;
  aimZ: number;
  /** The last frame's time step in seconds, as the body moved by it. */
  dt: number;
}

export const desk = {
  /** KeyboardEvent.code of every key held down. */
  keys: new Set<string>(),
  /** Mouse movement in pixels while captured, since the rig last read it. */
  lookX: 0,
  lookY: 0,
  /** Right mouse button held on the canvas. */
  aim: false,
  /** The mouse is captured by the canvas (pointer lock). */
  locked: false,
  /** A standard-mapping gamepad is connected. */
  padActive: false,
  padX: 0,
  padY: 0,
  padTurn: 0,
  padLook: 0,
  /** Gamepad X held (jump), the left trigger held (aim a teleport), and running since a left-stick click. */
  padJump: false,
  padAim: false,
  padRun: false,
  /** Snap turns asked for: +1 per turn right, -1 per turn left. */
  snap: 0,
  recentre: false,
  /** Press what the centre reticle points at. */
  activate: false,
  cancel: false,
  /** Goes up by one on every cancel (Esc, gamepad B, VR B): the table interface watches it to put carried cards back. */
  cancelCount: 0,
  /** Browser tests only: put the head here on the next frame. */
  warp: null as Pose | null,
  /** My pose this frame, as the room is sent it a few times a second (avatar/pose.ts); set by the rig. The mirror draws me from it. */
  pose: null as Pose | null,
  /** Browser tests only: the live scene, camera and renderer; set by the rig. */
  three: null as (() => RootState) | null,
  /** Browser tests only: where the body is and what it is doing; set by the rig. */
  rig: null as (() => RigReport) | null,
  /** data-testid of the DOM controls the gamepad bumpers step through; set by the rig. */
  focusIds: [] as readonly string[],
};

const typing = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
/** Enter and Space already press a focused button or link. */
const onControl = (target: EventTarget | null): boolean => target instanceof HTMLElement && /^(BUTTON|A)$/.test(target.tagName);

/** Gamepad B: drop focus, clear picked cards, stop a teleport aim and put back carried cards. (VR B only stops an aim and puts back carried cards: controls/Player.tsx.) */
export function cancel(): void {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  if (local.getState().selection.length) local.set({ selection: [] });
  desk.cancel = true;
  desk.cancelCount += 1;
}

export interface DesktopOptions {
  /** Asked on a left click while the mouse is free: false when the click is on in-world interface. */
  mayCapture: () => boolean;
  onCapture: (captured: boolean) => void;
}

/** Listens on the canvas and the window. Returns the function that stops listening. */
export function attachDesktop(canvas: HTMLCanvasElement, options: DesktopOptions): () => void {
  const stop = new AbortController();
  const signal = stop.signal;
  // Whether focus was last moved by Tab rather than a pointer. Not ":focus-visible": Chromium already counts the Space
  // keydown itself as keyboard use, so a button the mouse left focused matches it by the time this handler asks.
  let tabbed = false;
  window.addEventListener("keydown", (event) => void (event.key === "Tab" && (tabbed = true)), { signal, capture: true });
  window.addEventListener("pointerdown", () => void (tabbed = false), { signal, capture: true });

  window.addEventListener(
    "keydown",
    (event) => {
      if (typing(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      const { code } = event;
      const control = onControl(event.target);
      // Space presses only a button reached by the keyboard (Tab); one left focused by a mouse click is jumped over.
      const pressSpace = control && tabbed;
      // Arrows and Space would scroll the page, and Space would press a button the mouse left focused.
      if ((code.startsWith("Arrow") && !control) || (code === "Space" && !pressSpace)) event.preventDefault();
      if (event.repeat) return;
      if (code === "KeyQ") desk.snap -= 1;
      else if (code === "KeyE") desk.snap += 1;
      else if (code === "KeyR") desk.recentre = true;
      else if (code === "KeyF" || (code === "Enter" && !control)) desk.activate = true;
      else if (code === "Escape") {
        // Stops a teleport aim and puts carried cards back. Focus and picked cards are left alone: Esc also closes the menu.
        desk.cancel = true;
        desk.cancelCount += 1;
      }
      // Space on a button reached by Tab presses that button; it is not also a jump.
      else if (code !== "Space" || !pressSpace) desk.keys.add(code);
    },
    { signal },
  );
  window.addEventListener("keyup", (event) => desk.keys.delete(event.code), { signal });
  // A key released while another window has focus never sends keyup: forget held keys, and end an aim without teleporting.
  window.addEventListener(
    "blur",
    () => {
      desk.keys.clear();
      desk.aim = false;
      desk.cancel = true;
    },
    { signal },
  );

  canvas.addEventListener(
    "click",
    () => {
      if (desk.locked) desk.activate = true;
      // Browsers refuse to capture again within about a second of Esc; the next click works.
      else if (options.mayCapture()) void Promise.resolve(canvas.requestPointerLock()).catch(() => {});
    },
    { signal },
  );
  canvas.addEventListener("contextmenu", (event) => event.preventDefault(), { signal });
  canvas.addEventListener(
    "mousedown",
    (event) => {
      if (event.button === 2) desk.aim = true;
    },
    { signal },
  );
  window.addEventListener(
    "mouseup",
    (event) => {
      if (event.button === 2) desk.aim = false;
    },
    { signal },
  );
  document.addEventListener(
    "mousemove",
    (event) => {
      if (!desk.locked) return;
      desk.lookX += event.movementX;
      desk.lookY += event.movementY;
    },
    { signal },
  );
  document.addEventListener(
    "pointerlockchange",
    () => {
      desk.locked = document.pointerLockElement === canvas;
      // Esc frees a captured mouse without the page ever seeing the key, so it stops an aim from here.
      if (!desk.locked) desk.cancel = true;
      options.onCapture(desk.locked);
    },
    { signal },
  );

  return () => {
    stop.abort();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    desk.keys.clear();
    desk.aim = desk.locked = false;
    options.onCapture(false);
  };
}

let pads = 0;
if (typeof window !== "undefined") {
  window.addEventListener("gamepadconnected", () => pads++);
  window.addEventListener("gamepaddisconnected", () => (pads = Math.max(0, pads - 1)));
}

/** Standard mapping, pressed once: 0 south (A), 1 east (B), 4 and 5 bumpers, 9 Start, 10 left-stick click. Held: 2 west (X), 6 left trigger. */
const WATCHED = [0, 1, 4, 5, 9, 10] as const;
let wasDown = 0;

/** Reads the first standard-mapping gamepad into `desk`; call once a frame outside VR. */
export function pollGamepad(): void {
  desk.padX = desk.padY = desk.padTurn = desk.padLook = 0;
  desk.padActive = desk.padJump = desk.padAim = false;
  if (!pads) {
    desk.padRun = false;
    return;
  }
  const all = navigator.getGamepads();
  for (let i = 0; i < all.length; i++) {
    const pad = all[i];
    if (!pad || pad.mapping !== "standard") continue;
    desk.padActive = true;
    desk.padX = deadZone(pad.axes[0] ?? 0);
    desk.padY = deadZone(pad.axes[1] ?? 0);
    desk.padTurn = pad.axes[2] ?? 0;
    desk.padLook = deadZone(pad.axes[3] ?? 0);
    desk.padJump = pad.buttons[2]?.pressed === true;
    // Half way down, so a finger resting on the trigger does not aim.
    desk.padAim = (pad.buttons[6]?.value ?? 0) > 0.5;
    let down = 0;
    for (const index of WATCHED) if (pad.buttons[index]?.pressed) down |= 1 << index;
    const pressed = down & ~wasDown;
    wasDown = down;
    desk.padRun = runLatch(desk.padRun, (pressed & (1 << 10)) !== 0, desk.padX !== 0 || desk.padY !== 0);
    if (pressed & (1 << 0) && !clickFocused()) desk.activate = true;
    if (pressed & (1 << 1)) cancel();
    if (pressed & (1 << 4)) cycleFocus(desk.focusIds, -1);
    if (pressed & (1 << 5)) cycleFocus(desk.focusIds, 1);
    if (pressed & (1 << 9)) document.querySelector<HTMLElement>('[data-testid="hud-menu"]')?.click();
    return;
  }
}
