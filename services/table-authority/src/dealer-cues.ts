// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Dealer cues are derived from the public difference between two committed
 * states. The robot presenter receives the cue and the public actor it is
 * about; it never receives a card, a legality, or a score computation.
 */
import type { GameState, Seat } from "../../../packages/rules-core/src";
import {
  PROTOCOL_VERSION,
  SEAT_LABELS,
  type DealerCue,
  type DealerCueFrame,
  type HostAnnouncementCue,
} from "../../../packages/protocol/src";

export interface CueContext {
  readonly tableId: string;
  readonly version: number;
  readonly announcement: HostAnnouncementCue | null;
  readonly substitutedSeat: Seat | null;
  readonly eventEnded: boolean;
  /** True for the first frame of a table, which has no earlier state to differ from. */
  readonly opening: boolean;
}

function frame(
  context: CueContext,
  game: GameState,
  cue: DealerCue,
  seat: Seat | null,
  announcement: HostAnnouncementCue | null = null,
): DealerCueFrame {
  return {
    protocolVersion: PROTOCOL_VERSION,
    tableId: context.tableId,
    version: context.version,
    handNumber: game.handNumber,
    phase: game.phase,
    cue,
    seat,
    seatLabel: seat ? SEAT_LABELS[seat] : null,
    announcement,
  };
}

export function deriveDealerCues(before: GameState, after: GameState, context: CueContext): DealerCueFrame[] {
  const cues: DealerCueFrame[] = [];

  if (context.eventEnded) {
    cues.push(frame(context, after, "event-ended", null));
    return cues;
  }
  if (context.announcement) {
    cues.push(frame(context, after, "host-announcement", null, context.announcement));
  }
  if (context.substitutedSeat) {
    cues.push(frame(context, after, "seat-substituted", context.substitutedSeat));
  }
  if (!before.paused && after.paused) cues.push(frame(context, after, "table-paused", null));
  if (before.paused && !after.paused) cues.push(frame(context, after, "table-resumed", null));

  const newHand = context.opening || after.handNumber !== before.handNumber;
  if (newHand) cues.push(frame(context, after, "hand-opens", after.dealer));

  if (after.phase === "auction" && (newHand || after.turn !== before.turn || after.auction.length !== before.auction.length)) {
    cues.push(frame(context, after, "auction-turn", after.turn));
  }
  if (before.phase !== "declaration" && after.phase === "declaration" && after.contract) {
    cues.push(frame(context, after, "contract-set", after.contract.bidder));
  }
  if (before.phase !== "kitty" && after.phase === "kitty" && after.contract) {
    cues.push(frame(context, after, "kitty-taken", after.contract.bidder));
  }
  if (before.phase !== "play" && after.phase === "play" && after.contract) {
    cues.push(frame(context, after, "play-opens", after.contract.bidder));
  }
  if (!newHand) {
    for (let index = before.completedTricks.length; index < after.completedTricks.length; index += 1) {
      cues.push(frame(context, after, "trick-taken", after.completedTricks[index].winner));
    }
  }
  if (before.phase !== "summary" && after.phase === "summary" && after.contract) {
    cues.push(frame(context, after, "hand-scored", after.contract.bidder));
    cues.push(frame(context, after, "next-hand-ready", null));
  }
  return cues;
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
