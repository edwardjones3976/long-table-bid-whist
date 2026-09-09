// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Robot dealer cues.
 *
 * The dealer is a presenter. It receives a cue from this closed list plus the
 * public actor the cue is about, and nothing else: no hand, no kitty, no
 * legality, no score arithmetic. A cue frame carries no card member at all.
 */
import * as s from "./schema";
import {
  HOST_ANNOUNCEMENT_CUES,
  LIMITS,
  PHASES,
  PROTOCOL_VERSION,
  SEATS,
  type HostAnnouncementCue,
  type Phase,
  type ProtocolVersion,
  type Seat,
} from "./vocabulary";

export const DEALER_CUES = [
  "hand-opens",
  "auction-turn",
  "contract-set",
  "kitty-taken",
  "play-opens",
  "trick-taken",
  "hand-scored",
  "table-paused",
  "table-resumed",
  "seat-substituted",
  "host-announcement",
  "next-hand-ready",
  "event-ended",
] as const;
export type DealerCue = (typeof DEALER_CUES)[number];

export interface DealerCueFrame {
  protocolVersion: ProtocolVersion;
  tableId: string;
  version: number;
  handNumber: number;
  phase: Phase;
  cue: DealerCue;
  /** The public actor the cue concerns (bidder, trick winner, substituted seat). */
  seat: Seat | null;
  seatLabel: string | null;
  announcement: HostAnnouncementCue | null;
}

export const DEALER_CUE_FRAME = s.object<DealerCueFrame>({
  protocolVersion: s.literal(PROTOCOL_VERSION),
  tableId: s.string({ maxLength: LIMITS.id }),
  version: s.int({ min: 0, max: LIMITS.maxVersion }),
  handNumber: s.int({ min: 1, max: LIMITS.maxVersion }),
  phase: s.enumOf(PHASES),
  cue: s.enumOf(DEALER_CUES),
  seat: s.nullable(s.enumOf(SEATS)),
  seatLabel: s.nullable(s.string({ maxLength: LIMITS.label })),
  announcement: s.nullable(s.enumOf(HOST_ANNOUNCEMENT_CUES)),
});

export const DEALER_CUE_FRAME_KEYS = DEALER_CUE_FRAME.keys;
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
