// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Deterministic replay.
 *
 * A replay record is the table seed, the manifest identity, and every committed
 * action in order — human and AI alike. Replaying it through `applySeatAction`
 * reconstructs the identical state, so the public digest of the live table and
 * of its replay must agree. The seed inside a record is concealed material; a
 * record is authority evidence and is never sent to a role.
 */
import { publicDigest, stateDigest } from "./digest";
import { applySeatAction, openHand } from "./hand";
import { manifestDigest } from "./manifest";
import { MANIFEST_ID, type GameState, type Seat, type SeatAction, type Team } from "./model";

export interface ReplayEntry {
  seat: Seat;
  action: SeatAction;
}

export interface ReplayRecord {
  manifestId: typeof MANIFEST_ID;
  manifestDigest: string;
  seed: string;
  firstDealer: Seat;
  openingScores: Record<Team, number>;
  entries: ReplayEntry[];
}

export function newReplayRecord(seed: string, firstDealer: Seat = "east"): ReplayRecord {
  return {
    manifestId: MANIFEST_ID,
    manifestDigest: manifestDigest(),
    seed,
    firstDealer,
    openingScores: { "north-south": 0, "east-west": 0 },
    entries: [],
  };
}

export interface ReplayOutcome {
  state: GameState;
  /** Index of the first entry that could not be applied, or -1 when all applied. */
  failedAt: number;
  error: string | null;
  publicDigest: string;
  stateDigest: string;
}

export function replayRecord(record: ReplayRecord): ReplayOutcome {
  let state = openHand({ seed: record.seed, dealer: record.firstDealer, scores: record.openingScores });
  for (let index = 0; index < record.entries.length; index += 1) {
    const entry = record.entries[index];
    const result = applySeatAction(state, entry.seat, entry.action);
    if (result.error) {
      return {
        state,
        failedAt: index,
        error: result.error,
        publicDigest: publicDigest(state),
        stateDigest: stateDigest(state),
      };
    }
    state = result.state;
  }
  return { state, failedAt: -1, error: null, publicDigest: publicDigest(state), stateDigest: stateDigest(state) };
}

/** True when replaying the record reproduces `live` exactly. */
export function replayMatches(record: ReplayRecord, live: GameState): boolean {
  const outcome = replayRecord(record);
  return outcome.failedAt === -1 && outcome.stateDigest === stateDigest(live) && outcome.publicDigest === publicDigest(live);
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
