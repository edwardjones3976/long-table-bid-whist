// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Digests. `publicDigest` is the oracle's and covers only public facts; it is
 * the value replay evidence compares. `stateDigest` covers the whole
 * authoritative state including concealed hands and is authority-internal.
 */
import type { GameState } from "./model";

export { publicDigest } from "../../../src/game/engine";

/** 32-bit FNV-1a, rendered as eight hex digits. */
export function fnv1a(text: string): string {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return (value >>> 0).toString(16).padStart(8, "0");
}

/** Whole-state digest. Never send this to a role; it is derived from concealed state. */
export function stateDigest(state: GameState): string {
  return fnv1a(JSON.stringify(state));
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
