// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * The rules model is the browser oracle's model, re-exported unchanged. The
 * oracle (`src/game`) stays the reference for every value here; rules-core adds
 * seat-generic transitions around it rather than a second copy of the truth.
 */
export {
  ALPHA_EXCLUSION_NOTICE,
  MANIFEST_BID_LEVELS,
  MANIFEST_CONTRACT_MODES,
  MANIFEST_DISABLED_NOTICES,
  MANIFEST_ID,
  SEATS,
  SUITS,
  isManifestLegalBid,
  isManifestLegalLevel,
  isManifestLegalMode,
  nextSeat,
  teamFor,
} from "../../../src/game/model";

export type {
  ActionResult,
  AuctionEntry,
  Bid,
  Card,
  CompletedTrick,
  Contract,
  ContractMode,
  GameEvent,
  GameState,
  HumanAction,
  ManifestDisabledNotice,
  Phase,
  PlayedCard,
  PlayerView,
  Seat,
  Suit,
  Team,
} from "../../../src/game/model";

import type { HumanAction } from "../../../src/game/model";

/** A committed action by any seat. Same shape as the oracle's `HumanAction`. */
export type SeatAction = HumanAction;
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
