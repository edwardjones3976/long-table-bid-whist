/**
 * My look, saved in this browser like the name and settings are, and shared by the look editor and
 * the net store (which sends it with "room:create" and "room:join", and on each change).
 *
 *   myLook.get() / myLook.set(look) / myLook.subscribe(fn)
 *   useMyLook()   React hook for the current look
 *
 * Saved as { v: LOOK_VERSION, look } under "mansion.look" and read back through cleanLook, so an old,
 * hand-edited or broken entry still gives a valid look. A first visit gets one of the starting looks at
 * random, saved at once so it stays the same across reloads.
 */
import { useSyncExternalStore } from "react";
import { cleanLook, LOOK_VERSION, STARTING_LOOKS, type Look } from "../../../shared/avatar";

const STORAGE_KEY = "mansion.look";

function save(look: Look): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: LOOK_VERSION, look }));
  } catch {
    // Private browsing or a full disk: the look simply lasts for this visit.
  }
}

function load(): Look {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    // Every version so far reads the same way: cleanLook keeps what it knows, field by field.
    if (saved && typeof saved === "object" && "look" in saved) return cleanLook(saved.look);
  } catch {
    // An unreadable entry is treated as a first visit.
  }
  const look = cleanLook(STARTING_LOOKS[Math.floor(Math.random() * STARTING_LOOKS.length)]);
  save(look);
  return look;
}

let current: Look = load();
const listeners = new Set<() => void>();

export const myLook = {
  get: (): Look => current,
  /** Cleans, saves and shares a new look. Sending it to the room is net.setLook's job. */
  set(look: Look): void {
    current = cleanLook(look);
    save(current);
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useMyLook(): Look {
  return useSyncExternalStore(myLook.subscribe, myLook.get);
}
