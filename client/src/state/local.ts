/**
 * Things that are this browser's own business, not server state: the look,
 * comfort settings, where the player's body is, and what they have picked.
 *
 *   local.getState() / local.set(partial) / local.setComfort(partial) / local.subscribe(fn)
 *   useLocal((s) => s.theme)   React hook; re-renders only when the selected value changes
 *
 * Who writes what:
 *   theme, comfort   the HUD settings panel (persisted to localStorage)
 *   seated           App: the pose of my seat (or the host corner) while I am at a table, else null.
 *                    The controls module moves the rig there and blocks walking while it is set.
 *   playerPose       the controls module, a few times a second: where my body is. The net layer
 *                    sends it to the server and App uses it to notice the table I am standing at.
 *   xrActive         state/xr.ts: true while an immersive session is running.
 *   vrMenu           whether the in-VR menu (tableui/VrMenu.tsx) is open: toggled by the X button (controls)
 *                    or the menu's own button; state/xr.ts closes it when the session ends.
 *   focusTable       the table whose panel is shown when I am not seated: set by App when I walk
 *                    within reach of a table, or by a table picker.
 *   selection        card ids picked in my hand for the next action (see ui/actions.ts).
 */
import { useSyncExternalStore } from "react";
import type { Pose, TableId } from "../../../shared/protocol";

export type Theme = "golden" | "july4" | "newyear";

export interface Comfort {
  /** The VR movement mode: "smooth" is Walk and teleport (the off-hand stick walks), "teleport" is Teleport only. */
  locomotion: "teleport" | "smooth";
  snapTurn: boolean;
  snapDegrees: number;
  /** Darken the edges of the view while moving. */
  vignette: boolean;
  dominantHand: "right" | "left";
  reducedMotion: boolean;
  /** Multiplier for DOM and in-world interface size, 0.8 to 1.6. */
  uiScale: number;
  music: boolean;
  /** 0 to 1. */
  musicVolume: number;
  /** Show the HTML text table panel beside the 3D view (App also shows it when the 3D view fails, or with ?panel=1). */
  textPanel: boolean;
  /** Allow jumping (never while seated). */
  jump: boolean;
  /** Controller vibration on hover, grab, place and landing (controls/feedback.ts). */
  haptics: boolean;
  /** Short synthesized sounds for the same moments. */
  sounds: boolean;
  /** Draw the other people as simple shapes, for comfort or a slow device (world/Avatars.tsx). */
  simpleShapes: boolean;
  /** Do not play the other people's gestures. */
  hideGestures: boolean;
  /** The others' automatic end-of-hand reactions at my table (avatar/reactions.ts). */
  reactions: boolean;
}

export interface LocalState {
  theme: Theme;
  comfort: Comfort;
  seated: Pose | null;
  playerPose: Pose | null;
  xrActive: boolean;
  vrMenu: boolean;
  focusTable: TableId | null;
  selection: string[];
}

const STORAGE_KEY = "mansion.settings";

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export const DEFAULT_COMFORT: Comfort = {
  locomotion: "smooth",
  snapTurn: true,
  snapDegrees: 30,
  vignette: true,
  dominantHand: "right",
  reducedMotion: false,
  uiScale: 1,
  music: true,
  musicVolume: 0.5,
  textPanel: false,
  jump: true,
  haptics: true,
  sounds: true,
  simpleShapes: false,
  hideGestures: false,
  reactions: true,
};

function load(): Pick<LocalState, "theme" | "comfort"> {
  const fresh = { theme: "golden" as Theme, comfort: { ...DEFAULT_COMFORT, reducedMotion: prefersReducedMotion() } };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return fresh;
    const comfort = { ...fresh.comfort };
    // Only keep saved values of the right type, so an old or hand-edited entry cannot break the app.
    // A save from before walking became the default (it has no "jump" entry) holds the old teleport default, chosen or not: let it go once.
    const old = typeof saved.comfort?.jump !== "boolean";
    for (const key of Object.keys(comfort) as (keyof Comfort)[]) {
      if (old && key === "locomotion") continue;
      if (typeof saved.comfort?.[key] === typeof comfort[key]) (comfort as Record<string, unknown>)[key] = saved.comfort[key];
    }
    const theme: Theme = saved.theme === "golden" || saved.theme === "july4" || saved.theme === "newyear" ? saved.theme : "golden";
    return { theme, comfort };
  } catch {
    return fresh;
  }
}

let state: LocalState = {
  ...load(),
  seated: null,
  playerPose: null,
  xrActive: false,
  vrMenu: false,
  focusTable: null,
  selection: [],
};
const listeners = new Set<() => void>();

function set(partial: Partial<LocalState>): void {
  const saved = partial.theme !== undefined || partial.comfort !== undefined;
  state = { ...state, ...partial };
  if (saved) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: state.theme, comfort: state.comfort }));
    } catch {
      // Private browsing or a full disk: the settings simply last for this visit.
    }
  }
  for (const listener of listeners) listener();
}

export const local = {
  getState: (): LocalState => state,
  set,
  setComfort: (partial: Partial<Comfort>): void => set({ comfort: { ...state.comfort, ...partial } }),
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useLocal<T>(selector: (state: LocalState) => T): T {
  return useSyncExternalStore(local.subscribe, () => selector(state));
}
