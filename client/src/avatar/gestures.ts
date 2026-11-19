/**
 * Playing my own gestures: one at a time with a short cooldown, sent to the room, and kept for my mirror image.
 *
 *   playGesture(kind)       sends it unless the cooldown is running; true if the room took it
 *   useGestureReady()       React hook: false while the cooldown runs, so gesture buttons can wait
 *   myGestures              my recent gestures as Played entries, for actNow (the server never sends mine back)
 *
 * The cooldown keeps every button within the server's limit of 3 gestures in 4 seconds: one every
 * GESTURE_COOLDOWN_MS spreads 4 over 6 seconds, so the first may arrive up to 2 seconds late and still not count.
 */
import { useSyncExternalStore } from "react";
import type { GestureId } from "../../../shared/avatar";
import { net } from "../net/store";
import type { Played } from "./motion";

export const GESTURE_COOLDOWN_MS = 2000;
/** The member id my mirror image plays under while I am not in a room. */
export const ME = "me";

export const myGestures: Played[] = [];
let cooling = false;
const listeners = new Set<() => void>();
const tell = (): void => listeners.forEach((listener) => listener());

export async function playGesture(kind: GestureId): Promise<boolean> {
  if (cooling) return false;
  cooling = true;
  tell();
  setTimeout(() => {
    cooling = false;
    tell();
  }, GESTURE_COOLDOWN_MS);
  const reply = await net.gesture(kind);
  if (!reply.ok) return false;
  const at = Date.now();
  myGestures.splice(0, myGestures.length, ...myGestures.filter((played) => at - played.at < 3000), { memberId: ME, kind, at });
  return true;
}

export function useGestureReady(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => !cooling,
  );
}
