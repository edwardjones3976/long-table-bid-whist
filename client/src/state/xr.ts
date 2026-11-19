/**
 * The one XR store (@react-three/xr v6). App renders <XR store={xrStore}>; the
 * HUD calls enterVR(); the controls module reads controllers through the
 * library's hooks inside that tree.
 *
 * Nothing here downloads anything: the library's controller and hand models
 * come from a CDN, so both are off, and controller button layouts are read from
 * this app's own /xr-profiles/ folder (client/public/xr-profiles). Every
 * controller therefore reports the generic "xr-standard" components:
 * xr-standard-trigger, xr-standard-squeeze, xr-standard-thumbstick,
 * a-button and b-button on the right, x-button and y-button on the left.
 */
import { createXRStore } from "@react-three/xr";
import { GRAB_RADIUS } from "../tableui/carry";
import { local } from "./local";

/**
 * The library's cursor is a soft white dot where a pointer meets a thing, 0.1 m across and brighter while a button
 * is down: it would lie over the face of a card that is held. So it is the size of a fingertip, and gone while its
 * pointer has hold of something.
 */
const cursorModel = { size: 0.04, opacity: (pointer: { getPointerCapture(): unknown }): number => (pointer.getPointerCapture() ? 0 : 0.5) };

// A slow, deliberate trigger pull or pinch is still a press: the library's default ignores one held over 0.3 s.
const press = { clickThresholdMs: 2000, cursorModel };

export const xrStore = createXRStore({
  // The HUD's "Enter VR" button is the only way in.
  offerSession: false,
  // The emulator is a large download and loads a remote scene.
  emulate: false,
  baseAssetPath: `${location.origin}/xr-profiles/`,
  defaultControllerProfileId: "mansion-standard",
  // Each controller: a ray (trigger) and a grab sphere about the grip (squeeze). The library keeps one of the two
  // live at a time, the one whose hit is nearer: the grab whenever its sphere touches something that listens, else
  // the ray (tableui/carry.ts). The sphere is a little wider than the library's 0.07 m, because a grip's origin is in
  // the palm and the front of the controller is what a player brings up to a card; of all it touches, the nearest
  // thing is the one taken. The ray is blind nearer than `minDistance`: just past the sphere, so the grab still wins
  // whenever it touches, and not the library's 0.2 m, which left a band where a card answered to neither.
  controller: { model: false, rayPointer: { ...press, minDistance: GRAB_RADIUS + 0.01 }, grabPointer: { ...press, radius: GRAB_RADIUS } },
  // A tracked hand: the same two at the index fingertip, both pressed by a pinch (its sphere is the library's 0.07 m).
  // The library's fingertip "touch" pointer is off: it presses only within 0.03 m, where the grab sphere has always
  // taken over, so it could never fire, and a pinch does the pressing.
  hand: { model: false, rayPointer: { ...press, minDistance: 0.08 }, grabPointer: press, touchPointer: false },
  // A seated card room needs none of these, and asking for them prompts for room-scan permission.
  anchors: false,
  meshDetection: false,
  planeDetection: false,
  hitTest: false,
  domOverlay: false,
  layers: false,
});

xrStore.subscribe((state) => {
  const active = state.session != null;
  if (active !== local.getState().xrActive) local.set({ xrActive: active, vrMenu: false });
});

/** Why VR cannot start here, or null when it can. */
export async function vrBlocker(): Promise<string | null> {
  if (!window.isSecureContext) return "VR needs a secure (https) page";
  if (!navigator.xr) return "This browser has no WebXR";
  try {
    return (await navigator.xr.isSessionSupported("immersive-vr")) ? null : "No VR headset is available to this browser";
  } catch {
    return "This browser blocked the VR check";
  }
}

export async function enterVR(): Promise<string | null> {
  // The button can be pressed before the 3D view has finished starting; wait for it rather than fail.
  // Three seconds at most, so a headset still counts the button press as the reason for the request.
  for (let attempt = 0; ; attempt += 1) {
    try {
      await xrStore.enterVR();
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "VR could not start";
      if (!message.includes("not connected to three")) return message;
      if (attempt === 10) return "The 3D view is not ready yet. Try again in a moment.";
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}
