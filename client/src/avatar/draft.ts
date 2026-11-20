/**
 * The look being edited in VR: a draft with Undo and Redo, and Before to show the saved look. While it is open,
 * the VR look panel (avatar/VrLook.tsx) shows, and the mirror (world/Mirror.tsx) shows the draft.
 *
 *   lookDraft.open(saved) / close()      start from the saved look (a draft already open is kept) / throw the draft away
 *   lookDraft.change(look) / undo()      a new draft step (at most UNDO_STEPS kept; it clears Redo) / back one step
 *   lookDraft.redo()                     forward again one step that Undo took back
 *   lookDraft.before(on)                 show the saved look instead of the draft while on
 *   lookDraft.get()                      { saved, past, future, draft, before } or null while closed
 *   useLookDraft()                       React hook for the same
 *   shownLook(state)                     the look to draw: the saved one while Before is on
 *   stepOption(field, id, dir)           the option before or after `id`, wrapping round (previous / next)
 */
import { useSyncExternalStore } from "react";
import { CATALOG, type Field, type Look } from "../../../shared/avatar";

export const UNDO_STEPS = 50;

export interface Draft {
  saved: Look;
  past: readonly Look[];
  /** Steps Undo took back, the next one first. */
  future: readonly Look[];
  draft: Look;
  before: boolean;
}

let state: Draft | null = null;
const listeners = new Set<() => void>();
function set(next: Draft | null): void {
  state = next;
  listeners.forEach((listener) => listener());
}
const same = (a: Look, b: Look): boolean => JSON.stringify(a) === JSON.stringify(b);

export const lookDraft = {
  get: (): Draft | null => state,
  // Pressing "Your look" again while editing (from the VR menu, or the mirror's plaque) must not throw the edits away.
  open: (saved: Look): void => void (state ?? set({ saved, past: [], future: [], draft: saved, before: false })),
  close: (): void => set(null),
  change(look: Look): void {
    if (state && !same(look, state.draft)) set({ ...state, past: [...state.past, state.draft].slice(-UNDO_STEPS), future: [], draft: look, before: false });
  },
  undo(): void {
    if (state?.past.length) set({ ...state, past: state.past.slice(0, -1), future: [state.draft, ...state.future], draft: state.past[state.past.length - 1], before: false });
  },
  redo(): void {
    if (state?.future.length) set({ ...state, past: [...state.past, state.draft].slice(-UNDO_STEPS), future: state.future.slice(1), draft: state.future[0], before: false });
  },
  before(on: boolean): void {
    if (state && state.before !== on) set({ ...state, before: on });
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useLookDraft(): Draft | null {
  return useSyncExternalStore(lookDraft.subscribe, lookDraft.get);
}

export const shownLook = (draft: Draft): Look => (draft.before ? draft.saved : draft.draft);

export function stepOption(field: Field, id: string, dir: 1 | -1): string {
  const options = CATALOG[field];
  const at = options.findIndex((option) => option.id === id);
  return options[(at + dir + options.length) % options.length].id;
}
