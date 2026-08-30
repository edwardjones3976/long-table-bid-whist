// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Declarative record of the one active rules manifest. Values are read from the
 * oracle constants where they exist, so this record cannot disagree with the
 * behaviour the conformance suite pins.
 */
import { fnv1a } from "./digest";
import {
  ALPHA_EXCLUSION_NOTICE,
  MANIFEST_BID_LEVELS,
  MANIFEST_CONTRACT_MODES,
  MANIFEST_ID,
  type Bid,
  type ContractMode,
} from "./model";

export interface RulesManifest {
  readonly id: typeof MANIFEST_ID;
  readonly deckSize: number;
  readonly jokers: "big-and-little";
  readonly cardsPerSeat: number;
  readonly kittySize: number;
  readonly discardCount: number;
  readonly tricksPerHand: number;
  readonly bidLevels: readonly Bid["level"][];
  readonly contractModes: readonly ContractMode[];
  /** Tricks required = 6 + level. */
  readonly contractTarget: "six-plus-level";
  /** Making scores +level for the declaring partnership; a set scores -level. */
  readonly scoring: "level-made-or-set";
  readonly forcedDealerAfterThreePasses: true;
  readonly openingLead: "bidder-after-kitty";
  readonly exclusionNotice: typeof ALPHA_EXCLUSION_NOTICE;
}

export const RULES_MANIFEST: RulesManifest = {
  id: MANIFEST_ID,
  deckSize: 54,
  jokers: "big-and-little",
  cardsPerSeat: 12,
  kittySize: 6,
  discardCount: 6,
  tricksPerHand: 12,
  bidLevels: MANIFEST_BID_LEVELS,
  contractModes: MANIFEST_CONTRACT_MODES,
  contractTarget: "six-plus-level",
  scoring: "level-made-or-set",
  forcedDealerAfterThreePasses: true,
  openingLead: "bidder-after-kitty",
  exclusionNotice: ALPHA_EXCLUSION_NOTICE,
};

/** Stable identity of the manifest record, recorded with every replay export. */
export function manifestDigest(manifest: RulesManifest = RULES_MANIFEST): string {
  return fnv1a(JSON.stringify(manifest));
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
