// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
/**
 * The authoritative table.
 *
 * One `TableAuthority` owns one table: the committed `GameState`, the seat
 * bindings, every seat's player-local (uncommitted) preview state, the
 * monotonic table version, the five intent lanes, the replay record, and a
 * bounded history of the projections emitted at each version.
 *
 * Two kinds of accepted intent exist. Authoritative intents (confirm,
 * next-hand, host powers) advance the shared version and enter history.
 * Player-local intents (preview, toggle-discard, cancel) change only the
 * acting seat's own projection: the shared version, the host and public
 * projections and the replay history are untouched.
 *
 * Intent idempotency follows long-table-intent-idempotency/v2: exactly five
 * preallocated lanes (the four seats plus the host), each holding only its
 * current server-issued grant sessionId and a monotonic highest-consumed
 * counter. An intent identity is `<grant>:<counter>` and a grant is
 * `g:<incarnation-id>:<canonical-grant-counter>`: every grant is scoped to
 * the externally allocated, non-reused incarnation the authority was started
 * under, so two authorities that share an external table id can never honour
 * each other's identities. A counter at or below the high-water is a
 * duplicate that changes no authority state whatsoever; exactly high-water
 * plus one is consumed before any semantic or version evaluation and stays
 * consumed for every accepted, local or rejected outcome; a forward gap, a
 * non-current grant or a malformed identity rejects atomically without
 * advancing. Consuming the maximum counter exhausts the whole table
 * incarnation, and only a distinct incarnation clears that. No submitted-id
 * map, set, receipt cache or probabilistic filter exists; memory never grows
 * with request count.
 *
 * A restart restores the incarnation atomically — id, the five lane records,
 * the grant high-water and exhaustion together — after validating all of it,
 * or it restores nothing.
 *
 * Order of checks for every intent: table identity, public/dealer refusal,
 * lane entitlement, grant and exact counter, then (counter consumed) event
 * ended, intent-kind authority, stale version, then the rules.
 */
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
import {
  ORACLE_AI_SEATS,
  SEATS,
  advanceAiSeats,
  applySeatAction,
  newReplayRecord,
  openHand,
  setPaused,
  type GameState,
  type ReplayRecord,
  type Seat,
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
  type SeatAction,
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
} from "../../../packages/rules-core/src";
import {
  INTENT_AUTHORITY,
  INTENT_COUNTER_MAX,
  INTENT_COUNTER_MIN,
  INTENT_LANES,
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
  LIMITS,
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
  REJECTION_MESSAGES,
  type DealerCueFrame,
  type IntentLane,
  type HostAnnouncementCue,
  type HostProjection,
  type IntentReceipt,
  type PlayerProjection,
  type PublicProjection,
  type RejectionCode,
  type Role,
  type RoleProjection,
  type TableIntent,
} from "../../../packages/protocol/src";
import { deriveDealerCues } from "./dealer-cues";
import {
  buildHostProjection,
  buildPlayerProjection,
  buildPublicProjection,
  type SeatBinding,
  type TableView,
} from "./projections";
import { EMPTY_UNCOMMITTED, routePlayerIntent, type PlayerIntent, type SeatUncommitted } from "./seat-interaction";

export type { SeatBinding } from "./projections";

// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
/** One preallocated intent lane: its current server-issued grant and its monotonic counter high-water. */
export interface IntentLaneState {
  readonly currentGrantSessionId: string;
  readonly highestConsumedCounter: number;
}
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
/** Grant namespace: a grant is `g:<incarnation-id>:<canonical-grant-counter>`. */
export const GRANT_NAMESPACE = "g";
/** Grant counters share the intent counters' canonical positive safe-integer domain and never wrap. */
export const GRANT_COUNTER_MAX = INTENT_COUNTER_MAX;
const COUNTER_DIGITS = String(INTENT_COUNTER_MAX).length;
/**
 * The longest incarnation id whose worst-case `<grant>:<intent-counter>` still
 * fits the existing 64-byte protocol id: the namespace, three dividers, the
 * maximum grant counter and the maximum intent counter are reserved first.
 */
export const INCARNATION_ID_MAX_LENGTH = LIMITS.id - (GRANT_NAMESPACE.length + COUNTER_DIGITS + COUNTER_DIGITS + 3);

/**
 * The complete authority-internal identity state of one incarnation: the
 * externally allocated incarnation id, exactly the five lane records, the
 * grant high-water and the incarnation's exhaustion. Exported only for a
 * restart and for round-trip tests; never part of a projection, cue, log or
 * welcome.
 */
export interface IncarnationState {
  readonly incarnationId: string;
  readonly lanes: Readonly<Record<IntentLane, IntentLaneState>>;
  readonly grantHighWater: number;
  readonly exhausted: boolean;
}

/**
 * Exactly one of: a fresh incarnation under an explicit, externally allocated,
 * non-reused id, or the atomic restoration of a previously exported one. A
 * fresh authority has no implicit incarnation.
 */
export type IncarnationBundle =
  | { readonly kind: "new"; readonly incarnationId: string }
  | { readonly kind: "restore"; readonly state: IncarnationState };

/** The rules-engine commit call. Production leaves the seam unset and calls `applySeatAction` directly. */
export type CommitEngine = (game: GameState, seat: Seat, action: SeatAction) => ReturnType<typeof applySeatAction>;

/**
 * An incarnation id is externally allocated and never reused. Here it is only
 * checked for form: nonempty, colon-free, and bounded so that the worst-case
 * `<grant>:<intent-counter>` still fits the 64-byte protocol id. The form is a
 * closed positive alphabet — printable ASCII without the grant divider — so
 * the character count is the byte count.
 */
export function isValidIncarnationId(incarnationId: string): boolean {
  if (typeof incarnationId !== "string") return false;
  if (incarnationId.length < 1 || incarnationId.length > INCARNATION_ID_MAX_LENGTH) return false;
  for (let index = 0; index < incarnationId.length; index += 1) {
    const code = incarnationId.charCodeAt(index);
    if (code < 0x21 || code > 0x7e || code === 0x3a) return false;
  }
  return true;
}

/** A canonical positive safe integer in exact decimal form; arithmetic and exact string equality, no pattern matching. */
function parseCanonicalCounter(text: string, max: number): number | null {
  const value = Number(text);
  if (!Number.isSafeInteger(value) || Object.is(value, -0)) return null;
  if (value < 1 || value > max) return null;
  if (String(value) !== text) return null;
  return value;
}

/** Splits `g:<incarnation-id>:<canonical-grant-counter>`; anything else is not a grant of any incarnation. */
function parseGrant(grant: string): { incarnationId: string; counter: number } | null {
  if (typeof grant !== "string") return null;
  const first = grant.indexOf(":");
  const last = grant.lastIndexOf(":");
  if (first <= 0 || last === first || last === grant.length - 1) return null;
  if (grant.slice(0, first) !== GRANT_NAMESPACE) return null;
  const incarnationId = grant.slice(first + 1, last);
  if (!isValidIncarnationId(incarnationId)) return null;
  const counter = parseCanonicalCounter(grant.slice(last + 1), GRANT_COUNTER_MAX);
  return counter === null ? null : { incarnationId, counter };
}

function isCanonicalNonNegativeInteger(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && !Object.is(value, -0) && value >= 0 && value <= max;
}

function rejectRestore(reason: string): never {
  throw new Error(`incarnation restore rejected (${reason}): the incarnation id, the five lane records, the grant high-water and the exhaustion restore atomically or not at all`);
}

/**
 * Validates an exported incarnation in full before any usable state exists:
 * a closed state shape, a well-formed incarnation id, exactly the five lane
 * records with closed shapes, every grant in the `g` namespace and belonging to
 * this incarnation, unique canonical grant counters whose maximum equals the
 * grant high-water, counters within the canonical domain, and exhaustion that
 * is true whenever any lane reached the maximum (true exhaustion may outlive
 * the lane that caused it, since a later rotation retires that lane record).
 */
function restoreIncarnation(state: IncarnationState): IncarnationState {
  if (typeof state !== "object" || state === null) rejectRestore("state is not an object");
  if (Object.keys(state).sort().join(",") !== "exhausted,grantHighWater,incarnationId,lanes") rejectRestore("state shape is not closed");
  if (!isValidIncarnationId(state.incarnationId)) rejectRestore("incarnation id is malformed");
  if (!isCanonicalNonNegativeInteger(state.grantHighWater, GRANT_COUNTER_MAX) || state.grantHighWater < 1) rejectRestore("grant high-water is not canonical");
  if (typeof state.exhausted !== "boolean") rejectRestore("exhaustion is not a boolean");
  if (typeof state.lanes !== "object" || state.lanes === null) rejectRestore("lanes is not an object");
  if (Object.keys(state.lanes).sort().join(",") !== [...INTENT_LANES].sort().join(",")) rejectRestore("lane inventory is not exactly the five lanes");

  const lanes = {} as Record<IntentLane, IntentLaneState>;
  const grantCounters = new Set<number>();
  let highestGrant = 0;
  let anyLaneAtMaximum = false;
  for (const lane of INTENT_LANES) {
    const record: IntentLaneState = state.lanes[lane];
    if (typeof record !== "object" || record === null) rejectRestore(`lane ${lane} is not a record`);
    if (Object.keys(record).sort().join(",") !== "currentGrantSessionId,highestConsumedCounter") rejectRestore(`lane ${lane} shape is not closed`);
    const grant = parseGrant(record.currentGrantSessionId);
    if (!grant) rejectRestore(`lane ${lane} grant is not a canonical grant`);
    if (grant.incarnationId !== state.incarnationId) rejectRestore(`lane ${lane} grant belongs to another incarnation`);
    if (grantCounters.has(grant.counter)) rejectRestore(`lane ${lane} grant duplicates another lane's grant`);
    grantCounters.add(grant.counter);
    if (grant.counter > highestGrant) highestGrant = grant.counter;
    if (!isCanonicalNonNegativeInteger(record.highestConsumedCounter, INTENT_COUNTER_MAX)) rejectRestore(`lane ${lane} counter is outside the canonical domain`);
    if (record.highestConsumedCounter >= INTENT_COUNTER_MAX) anyLaneAtMaximum = true;
    lanes[lane] = { currentGrantSessionId: record.currentGrantSessionId, highestConsumedCounter: record.highestConsumedCounter };
  }
  if (highestGrant !== state.grantHighWater) rejectRestore("grant high-water does not equal the highest current grant");
  if (anyLaneAtMaximum && !state.exhausted) rejectRestore("a lane consumed the maximum counter but exhaustion is false");
  return { incarnationId: state.incarnationId, lanes, grantHighWater: state.grantHighWater, exhausted: state.exhausted };
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]

export interface TableOptions {
  readonly tableId: string;
  readonly seed: string;
  readonly hostParticipantId: string | null;
  readonly seats?: Partial<Record<Seat, SeatBinding>>;
  readonly firstDealer?: Seat;
  /** Versions of projection history retained for reconnect replay. */
  readonly historyRetention?: number;
  // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
  /**
   * The one incarnation bundle this authority runs under: new, with an
   * explicit external id, or restored atomically — incarnation id, all five
   * lane records, grant high-water and exhaustion together, validated in full
   * before any usable state exists — or neither.
   */
  readonly incarnation: IncarnationBundle;
  /** Executable engine-rejection seam for tests; absent in production. */
  readonly commitEngine?: CommitEngine;
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
  // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
}

/** Who is asking. Derived by the session layer from the authenticated connection. */
export interface Actor {
  readonly role: Role;
  readonly participantId: string | null;
  readonly seat: Seat | null;
}

export interface IntentSubmission {
  readonly tableId: string;
  readonly intentId: string;
  readonly expectedVersion: number;
  readonly intent: TableIntent;
}

/** Everything emitted at one authoritative version. */
export interface HistoryFrame {
  readonly version: number;
  readonly player: Partial<Record<Seat, PlayerProjection>>;
  /** The participant each player projection was built for; replay never crosses owners. */
  readonly playerOwner: Partial<Record<Seat, string>>;
  readonly host: HostProjection;
  readonly public: PublicProjection;
  readonly cues: readonly DealerCueFrame[];
}

/** A player-local change for exactly one seat and the participant who owns it. */
export interface SeatUpdate {
  readonly seat: Seat;
  readonly participantId: string;
  readonly projection: PlayerProjection;
}

// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
/**
 * A protocol-level identity rejection, answered as a wire error rather than a
 * receipt: a malformed identity, a non-current grant or a forward counter gap
 * (`intent-identity`), or any new intent on an exhausted table incarnation
 * (`intent-exhausted`). Neither consumes a counter nor mutates any lane.
 */
export type IdentityViolation = "intent-identity" | "intent-exhausted";

export type SubmitResult =
  | {
      readonly receipt: IntentReceipt;
      readonly identityViolation: null;
      /** Present only when the shared table version advanced. */
      readonly frame: HistoryFrame | null;
      /** Present only for an accepted player-local intent. */
      readonly seatUpdate: SeatUpdate | null;
    }
  | {
      readonly receipt: null;
      readonly identityViolation: IdentityViolation;
      readonly frame: null;
      readonly seatUpdate: null;
    };
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

export interface ReplayFrames {
  readonly frames: { version: number; projection: RoleProjection }[];
  readonly truncated: boolean;
}

const DEFAULT_RETENTION = 128;

interface SeatLocal {
  readonly uncommitted: SeatUncommitted;
  /** Increments on every player-local change, so a client can order same-version projections. */
  readonly revision: number;
  readonly lastReceipt: IntentReceipt | null;
}

function freshLocal(revision = 0): SeatLocal {
  return { uncommitted: EMPTY_UNCOMMITTED, revision, lastReceipt: null };
}

function openSeats(): Record<Seat, SeatBinding> {
  return { south: { occupant: "open" }, west: { occupant: "open" }, north: { occupant: "open" }, east: { occupant: "open" } };
}

function emptyLocals(): Record<Seat, SeatLocal> {
  return { south: freshLocal(), west: freshLocal(), north: freshLocal(), east: freshLocal() };
}

// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
/**
 * Splits `<grant>:<counter>` and accepts only a canonical positive decimal
 * counter within the safe-integer domain: no leading zero, sign, fraction,
 * exponent or spacing, and no wrap past the maximum. Validation is arithmetic
 * and exact string equality of the canonical form; no pattern matching.
 */
function parseIntentIdentity(intentId: string): { grant: string; counter: number } | null {
  const divider = intentId.lastIndexOf(":");
  if (divider <= 0 || divider === intentId.length - 1) return null;
  const grant = intentId.slice(0, divider);
  const text = intentId.slice(divider + 1);
  const counter = Number(text);
  if (!Number.isSafeInteger(counter)) return null;
  if (counter < INTENT_COUNTER_MIN || counter > INTENT_COUNTER_MAX) return null;
  if (String(counter) !== text) return null;
  return { grant, counter };
}
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

interface Transition {
  readonly game: GameState;
  readonly announcement?: HostAnnouncementCue;
  readonly substitutedSeat?: Seat;
  readonly eventEnded?: boolean;
  readonly opening?: boolean;
}

export class TableAuthority {
  readonly tableId: string;
  private game: GameState;
  private version = 0;
  private seats: Record<Seat, SeatBinding>;
  private hostParticipantId: string | null;
  private locals: Record<Seat, SeatLocal> = emptyLocals();
  // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
  /**
   * Exactly five preallocated intent lane records — never more, never fewer,
   * never growing with request count. Each holds only the lane's current
   * server-issued grant and its monotonic highest-consumed counter; a counter
   * at or below the high-water is answered `duplicate` without re-evaluation,
   * so an old request can never turn into a fresh one that consumes a later
   * preview.
   */
  private lanes: Record<IntentLane, IntentLaneState>;
  /** Monotonic grant sequence; a retired grant can never become current again. */
  private grantHighWater = 0;
  /** Set the moment any lane consumes the maximum counter; never cleared for this incarnation. */
  private exhausted = false;
  // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
  /** The externally allocated, non-reused incarnation every grant of this authority is scoped to. Never projected. */
  private readonly incarnationId: string;
  /** Test-only rules-engine seam; null in production, where `applySeatAction` is called directly. */
  private readonly commitEngine: CommitEngine | null;
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
  private readonly history: HistoryFrame[] = [];
  private readonly retention: number;
  private readonly replay: ReplayRecord;
  private eventEnded = false;
  private lastAnnouncement: HostAnnouncementCue | null = null;

  constructor(options: TableOptions) {
    this.tableId = options.tableId;
    this.hostParticipantId = options.hostParticipantId;
    this.retention = options.historyRetention ?? DEFAULT_RETENTION;
    this.seats = { ...openSeats(), ...(options.seats ?? {}) };
    // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
    // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
    // Exactly one incarnation bundle, validated in full before any usable
    // state exists. There is no implicit incarnation: no id is derived from
    // the table, the seed, the process or a clock.
    const incarnation = options.incarnation;
    if (!incarnation || (incarnation.kind !== "new" && incarnation.kind !== "restore")) {
      throw new Error("incarnation bundle required: a fresh authority needs an explicit external incarnation id or an atomic restore");
    }
    this.commitEngine = options.commitEngine ?? null;
    if (incarnation.kind === "new") {
      if (!isValidIncarnationId(incarnation.incarnationId)) {
        throw new Error(`incarnation id rejected: it must be 1..${INCARNATION_ID_MAX_LENGTH} printable ASCII characters with no colon`);
      }
      this.incarnationId = incarnation.incarnationId;
      this.grantHighWater = 0;
      const issued = {} as Record<IntentLane, IntentLaneState>;
      INTENT_LANES.forEach((lane) => {
        issued[lane] = { currentGrantSessionId: this.issueGrant(), highestConsumedCounter: 0 };
      });
      this.lanes = issued;
      this.exhausted = false;
    } else {
      const restored = restoreIncarnation(incarnation.state);
      this.incarnationId = restored.incarnationId;
      this.grantHighWater = restored.grantHighWater;
      this.lanes = { ...restored.lanes };
      this.exhausted = restored.exhausted;
    }
    // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
    // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
    const dealer = options.firstDealer ?? "east";
    this.replay = newReplayRecord(options.seed, dealer);
    const opened = openHand({ seed: options.seed, dealer });
    this.game = this.runAiSeats(opened);
    this.pushFrame(opened, { game: this.game, opening: true });
  }

  get currentVersion(): number {
    return this.version;
  }

  get ended(): boolean {
    return this.eventEnded;
  }

  /** The most recently emitted authoritative frame, including the opening frame's cues. */
  lastFrame(): HistoryFrame | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
  /** A fresh, never-current grant sessionId; strictly newer than every grant issued before it. */
  private issueGrant(): string {
    // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
    // `g:<incarnation-id>:<canonical-grant-counter>`: scoped to this
    // incarnation, monotonic, and never wrapping past the canonical maximum.
    if (this.grantHighWater >= GRANT_COUNTER_MAX) {
      throw new Error("grant counter exhausted: grants never wrap; only a distinct external incarnation can continue");
    }
    this.grantHighWater += 1;
    return `${GRANT_NAMESPACE}:${this.incarnationId}:${this.grantHighWater}`;
    // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
  }

  /** Retires the lane's current grant and issues a strictly newer one; the counter domain restarts with the grant. */
  private rotateLane(lane: IntentLane): void {
    this.lanes = { ...this.lanes, [lane]: { currentGrantSessionId: this.issueGrant(), highestConsumedCounter: 0 } };
  }

  /** The complete lane inventory: exactly the five preallocated records, copied. */
  intentLanes(): Readonly<Record<IntentLane, IntentLaneState>> {
    return { ...this.lanes };
  }

  intentLaneState(lane: IntentLane): IntentLaneState {
    return this.lanes[lane];
  }

  /** The lane's current server-issued grant sessionId. */
  laneGrant(lane: IntentLane): string {
    return this.lanes[lane].currentGrantSessionId;
  }

  /** The lane's exact next counter, or null once this table incarnation is exhausted. */
  nextIntentCounter(lane: IntentLane): number | null {
    if (this.exhausted) return null;
    const highWater = this.lanes[lane].highestConsumedCounter;
    return highWater < INTENT_COUNTER_MAX ? highWater + 1 : null;
  }

  /** True once any lane consumed the maximum counter; only a new externally non-reused incarnation may resume. */
  get incarnationExhausted(): boolean {
    return this.exhausted;
  }
  // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
  /**
   * Authority-internal complete identity state — incarnation id, exactly the
   * five lane records, grant high-water and exhaustion — as a deep copy for a
   * restart's atomic restore and for round-trip tests. It is never part of a
   * projection, a dealer cue, a log line or any role's welcome.
   */
  exportIncarnation(): IncarnationState {
    return structuredClone({
      incarnationId: this.incarnationId,
      lanes: this.lanes,
      grantHighWater: this.grantHighWater,
      exhausted: this.exhausted,
    });
  }
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]

  hostOf(): string | null {
    return this.hostParticipantId;
  }

  isHost(participantId: string | null): boolean {
    return participantId !== null && this.hostParticipantId === participantId;
  }

  /** The human seat bound to `participantId`, if any. */
  seatOf(participantId: string | null): Seat | null {
    if (participantId === null) return null;
    return SEATS.find((seat) => this.owns(seat, participantId)) ?? null;
  }

  /** True when `seat` is a human seat currently bound to `participantId`. */
  owns(seat: Seat, participantId: string | null): boolean {
    const binding = this.seats[seat];
    return participantId !== null && binding.occupant === "human" && binding.participantId === participantId;
  }

  seatBinding(seat: Seat): SeatBinding {
    return this.seats[seat];
  }

  /** The current player-local revision of a seat. */
  seatRevision(seat: Seat): number {
    return this.locals[seat].revision;
  }

  private isAi(seat: Seat): boolean {
    return this.seats[seat].occupant === "ai";
  }

  private view(): TableView {
    return {
      tableId: this.tableId,
      version: this.version,
      game: this.game,
      seats: this.seats,
      eventEnded: this.eventEnded,
      lastAnnouncement: this.lastAnnouncement,
    };
  }

  /** Advances AI seats from `state`, recording their actions in the replay record. */
  private runAiSeats(state: GameState): GameState {
    const advanced = advanceAiSeats(state, (seat) => this.isAi(seat));
    this.replay.entries.push(...advanced.actions);
    return advanced.state;
  }

  private setLocal(seat: Seat, uncommitted: SeatUncommitted, lastReceipt: IntentReceipt | null): void {
    const current = this.locals[seat];
    this.locals = { ...this.locals, [seat]: { uncommitted, revision: current.revision + 1, lastReceipt } };
  }

  private clearLocals(): void {
    SEATS.forEach((seat) => {
      const current = this.locals[seat];
      this.locals = { ...this.locals, [seat]: { ...current, uncommitted: EMPTY_UNCOMMITTED, revision: current.revision + 1 } };
    });
  }

  private playerProjection(seat: Seat): PlayerProjection {
    const local = this.locals[seat];
    return buildPlayerProjection(this.view(), seat, local.uncommitted, local.revision, local.lastReceipt);
  }

  private pushFrame(before: GameState, transition: Transition): HistoryFrame {
    this.version += 1;
    this.game = transition.game;
    if (transition.eventEnded) this.eventEnded = true;
    if (transition.announcement) this.lastAnnouncement = transition.announcement;
    const player: Partial<Record<Seat, PlayerProjection>> = {};
    const playerOwner: Partial<Record<Seat, string>> = {};
    SEATS.forEach((seat) => {
      const binding = this.seats[seat];
      if (binding.occupant === "human") {
        player[seat] = this.playerProjection(seat);
        playerOwner[seat] = binding.participantId;
      }
    });
    const view = this.view();
    const frame: HistoryFrame = {
      version: this.version,
      player,
      playerOwner,
      host: buildHostProjection(view),
      public: buildPublicProjection(view),
      cues: deriveDealerCues(before, this.game, {
        tableId: this.tableId,
        version: this.version,
        announcement: transition.announcement ?? null,
        substitutedSeat: transition.substitutedSeat ?? null,
        eventEnded: this.eventEnded,
        opening: transition.opening ?? false,
      }),
    };
    this.history.push(frame);
    if (this.history.length > this.retention) this.history.splice(0, this.history.length - this.retention);
    return frame;
  }

  /**
   * Seats a human. Allowed while the hand has not started or between hands, on
   * an open or AI seat, or to re-seat a human seat with a different occupant
   * between hands. A rebound seat starts with no player-local state.
   */
  bindSeat(seat: Seat, binding: SeatBinding): HistoryFrame | null {
    if (this.eventEnded) return null;
    const current = this.seats[seat];
    const handIdle = this.game.phase === "summary" || this.game.auction.length === 0;
    if (!handIdle && current.occupant !== "open") return null;
    if (current.occupant === "human" && binding.occupant !== "human") return null;
    this.seats = { ...this.seats, [seat]: binding };
    this.locals = { ...this.locals, [seat]: freshLocal(this.locals[seat].revision + 1) };
    // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
    // Rebinding rotates only this seat's grant: the previous occupant's grant
    // retires, a later human occupant receives a strictly newer one, and no
    // other lane changes. Presence changes never rotate a grant.
    this.rotateLane(seat);
    // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
    const before = this.game;
    return this.pushFrame(before, { game: this.runAiSeats(this.game) });
  }

  /** Marks a human seat connected or disconnected. Only the seat's current owner may change its presence. */
  setSeatPresence(seat: Seat, participantId: string, connected: boolean, displayName: string | null): HistoryFrame | null {
    const current = this.seats[seat];
    if (current.occupant !== "human" || current.participantId !== participantId) return null;
    const nextName = displayName && displayName.length > 0 ? displayName : current.displayName;
    if (current.connected === connected && current.displayName === nextName) return null;
    this.seats = { ...this.seats, [seat]: { ...current, connected, displayName: nextName } };
    return this.pushFrame(this.game, { game: this.game });
  }

  /** A fresh projection for `role`. A player projection is built only for the seat's current owner. */
  snapshot(role: Role, seat: Seat | null, participantId: string | null): RoleProjection | null {
    switch (role) {
      case "player":
        if (!seat || !this.owns(seat, participantId)) return null;
        return this.playerProjection(seat);
      case "host":
        return buildHostProjection(this.view());
      case "public":
        return buildPublicProjection(this.view());
      case "dealer":
        return null;
    }
  }

  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
  /** Projections for `role` after `lastVersion`, oldest first, within retention; player frames only for their owner. */
  replayFrames(role: Role, seat: Seat | null, participantId: string | null, lastVersion: number): ReplayFrames {
    // Current ownership is required before any frame is read: a participant who
    // no longer holds the seat gets nothing, not even frames built for them earlier.
    if (role === "player" && (!seat || !this.owns(seat, participantId))) return { frames: [], truncated: false };
    const wanted = this.history.filter((frame) => frame.version > lastVersion);
    const oldestRetained = this.history.length > 0 ? this.history[0].version : this.version + 1;
    const truncated = lastVersion + 1 < oldestRetained;
    const frames: { version: number; projection: RoleProjection }[] = [];
    for (const frame of wanted) {
      const projection = TableAuthority.projectionFromFrame(frame, role, seat, participantId);
      if (projection) frames.push({ version: frame.version, projection });
    }
    return { frames, truncated };
  }

  static projectionFromFrame(frame: HistoryFrame, role: Role, seat: Seat | null, participantId: string | null): RoleProjection | null {
    switch (role) {
      case "player":
        if (!seat || participantId === null || frame.playerOwner[seat] !== participantId) return null;
        return frame.player[seat] ?? null;
      case "host":
        return frame.host;
      case "public":
        return frame.public;
      case "dealer":
        return null;
    }
  }
  // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]

  /** Authority-internal evidence. Contains the seed; never send it to a role. */
  exportReplay(): ReplayRecord {
    return structuredClone(this.replay);
  }

  /** Test access to committed state. Not reachable from any projection. */
  committedState(): GameState {
    return structuredClone(this.game);
  }

  private receipt(
    submission: IntentSubmission,
    outcome: IntentReceipt["outcome"],
    code: RejectionCode | null,
    committed: boolean,
  ): IntentReceipt {
    return {
      intentId: submission.intentId,
      intentKind: submission.intent.kind,
      outcome,
      code,
      message: code ? REJECTION_MESSAGES[code] : "",
      committed,
      version: this.version,
    };
  }

  private rejected(seat: Seat | null, submission: IntentSubmission, code: RejectionCode): SubmitResult {
    const receipt = this.receipt(submission, "rejected", code, false);
    if (seat) this.locals = { ...this.locals, [seat]: { ...this.locals[seat], lastReceipt: receipt } };
    return { receipt, identityViolation: null, frame: null, seatUpdate: null };
  }

  // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
  private identityRejected(violation: IdentityViolation): SubmitResult {
    return { receipt: null, identityViolation: violation, frame: null, seatUpdate: null };
  }

  submitIntent(actor: Actor, submission: IntentSubmission): SubmitResult {
    const seat = actor.role === "player" ? actor.seat : null;

    // Table identity, then role/seat/host entitlement, re-derived from the
    // current bindings. Public and dealer intent attempts are refused before
    // any lane lookup; an unentitled actor never reaches a lane either, so
    // none of these rejections consumes a counter.
    if (submission.tableId !== this.tableId) return this.rejected(seat, submission, "unknown-table");
    if (actor.role === "public" || actor.role === "dealer") return this.rejected(null, submission, "unauthorized-role");
    if (actor.role === "host" && !this.isHost(actor.participantId)) return this.rejected(null, submission, "unauthorized-role");
    if (actor.role === "player" && (!seat || !this.owns(seat, actor.participantId))) {
      return this.rejected(seat, submission, "seat-not-bound");
    }

    // Exactly one of the five preallocated role lanes.
    const lane: IntentLane = actor.role === "player" && seat ? seat : "host";
    const laneState = this.lanes[lane];

    // The identity must carry the lane's current server-issued grant and a
    // canonical safe-integer counter. Anything else rejects without mutation.
    const identity = parseIntentIdentity(submission.intentId);
    if (!identity || identity.grant !== laneState.currentGrantSessionId) {
      return this.identityRejected("intent-identity");
    }

    // At or below the high-water: a duplicate, answered with no mutation and
    // no re-evaluation, whatever the original outcome was.
    if (identity.counter <= laneState.highestConsumedCounter) {
      // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
      // The receipt is formed from the identity alone. No lane byte, seat
      // local, last receipt, feedback, revision, version, history, replay
      // entry, game state or presence changes: the player projection after a
      // duplicate is byte-identical to the projection before it.
      return { receipt: this.receipt(submission, "duplicate", "duplicate-input-id", false), identityViolation: null, frame: null, seatUpdate: null };
      // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
    }

    // Every new intent on an exhausted incarnation rejects without mutation;
    // grant rotation cannot bypass this, and only a new externally non-reused
    // incarnation may resume.
    if (this.exhausted) return this.identityRejected("intent-exhausted");

    // A forward gap rejects atomically without advancing.
    if (identity.counter !== laneState.highestConsumedCounter + 1) {
      return this.identityRejected("intent-identity");
    }

    // Reserve the exact-next counter now, before any semantic or version
    // evaluation. It stays consumed for every outcome below — accepted,
    // player-local or rejected. Consuming the maximum counter atomically
    // exhausts the entire table incarnation.
    this.lanes = { ...this.lanes, [lane]: { ...laneState, highestConsumedCounter: identity.counter } };
    if (identity.counter >= INTENT_COUNTER_MAX) this.exhausted = true;

    if (this.eventEnded) return this.rejected(seat, submission, "event-ended");
    const allowed = INTENT_AUTHORITY[submission.intent.kind];
    if (!allowed.includes(actor.role)) return this.rejected(seat, submission, "unauthorized-role");
    if (submission.expectedVersion !== this.version) return this.rejected(seat, submission, "stale-version");
    // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

    const intent = submission.intent;
    switch (intent.kind) {
      case "preview":
      case "toggle-discard":
      case "cancel":
      case "confirm":
      case "next-hand":
        return this.handlePlayerIntent(actor, seat, submission, intent);
      case "host-pause":
        if (this.game.phase !== "summary") return this.rejected(seat, submission, "not-between-hands");
        if (this.game.paused) return this.rejected(seat, submission, "wrong-phase");
        return this.acceptAuthoritative(seat, submission, { game: setPaused(this.game, true) }, false);
      case "host-resume":
        if (!this.game.paused) return this.rejected(seat, submission, "wrong-phase");
        return this.acceptAuthoritative(seat, submission, { game: this.runAiSeats(setPaused(this.game, false)) }, false);
      case "host-announce":
        return this.acceptAuthoritative(seat, submission, { game: this.game, announcement: intent.cue }, false);
      case "host-substitute": {
        if (this.game.phase !== "summary") return this.rejected(seat, submission, "not-between-hands");
        if (this.seats[intent.seat].occupant !== "human") return this.rejected(seat, submission, "seat-not-substitutable");
        this.seats = { ...this.seats, [intent.seat]: { occupant: "ai" } };
        this.locals = { ...this.locals, [intent.seat]: freshLocal(this.locals[intent.seat].revision + 1) };
        // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
        // Human-to-AI substitution retires that seat's grant atomically with
        // the substitution itself; a later human occupant receives a strictly
        // newer grant when the seat rebinds.
        this.rotateLane(intent.seat);
        // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
        return this.acceptAuthoritative(seat, submission, { game: this.game, substitutedSeat: intent.seat }, false);
      }
      case "host-transfer": {
        if (this.seatOf(intent.participantId) === null) return this.rejected(seat, submission, "unknown-participant");
        this.hostParticipantId = intent.participantId;
        // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
        // The transfer consumed its counter under the old host grant above;
        // the host lane now rotates atomically with the transfer, so the new
        // host receives a strictly newer grant and the old one is retired.
        this.rotateLane("host");
        // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
        return this.acceptAuthoritative(seat, submission, { game: this.game }, false);
      }
      case "host-end-event":
        return this.acceptAuthoritative(seat, submission, { game: this.game, eventEnded: true }, false);
    }
  }

  private handlePlayerIntent(
    actor: Actor,
    seat: Seat | null,
    submission: IntentSubmission,
    intent: PlayerIntent,
  ): SubmitResult {
    // A host may call the next hand (pacing) without holding a seat.
    const actingSeat: Seat = seat ?? "south";
    if (actor.role === "host" && intent.kind !== "next-hand") return this.rejected(null, submission, "unauthorized-role");
    const current = seat ? this.locals[seat].uncommitted : EMPTY_UNCOMMITTED;
    const outcome = routePlayerIntent(this.game, actingSeat, current, intent);
    if ("code" in outcome) return this.rejected(seat, submission, outcome.code);

    if (!outcome.commit) {
      if (!seat) return this.rejected(null, submission, "unauthorized-role");
      return this.acceptLocal(seat, submission, outcome.uncommitted);
    }

    // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
    // The counter was consumed above, so an engine rejection is as terminal
    // for its identity as any other outcome. The seam exists only so a test
    // can make the engine refuse; production calls the rules kernel directly.
    const result = this.commitEngine
      ? this.commitEngine(this.game, actingSeat, outcome.commit)
      : applySeatAction(this.game, actingSeat, outcome.commit);
    // [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
    if (result.error) return this.rejected(seat, submission, "engine-rejected");
    this.replay.entries.push({ seat: actingSeat, action: outcome.commit });
    // A commit invalidates every seat's pointing state; the table has moved on.
    this.clearLocals();
    return this.acceptAuthoritative(seat, submission, { game: this.runAiSeats(result.state) }, true);
  }

  /** Accepts a player-local change: no shared version, no history, no host/public change. */
  private acceptLocal(seat: Seat, submission: IntentSubmission, uncommitted: SeatUncommitted): SubmitResult {
    const receipt = this.receipt(submission, "accepted", null, false);
    this.setLocal(seat, uncommitted, receipt);
    const binding = this.seats[seat];
    if (binding.occupant !== "human") return { receipt, identityViolation: null, frame: null, seatUpdate: null };
    return {
      receipt,
      identityViolation: null,
      frame: null,
      seatUpdate: { seat, participantId: binding.participantId, projection: this.playerProjection(seat) },
    };
  }

  /** Accepts an authoritative change: the version advances and a frame enters history. The lane consumed the counter before evaluation. */
  private acceptAuthoritative(seat: Seat | null, submission: IntentSubmission, transition: Transition, committed: boolean): SubmitResult {
    const before = this.game;
    // The receipt is remembered before the frame is built so the seat's own
    // projection reflects an accepted (feedback-free) last receipt.
    const provisional = this.receipt(submission, "accepted", null, committed);
    if (seat) this.locals = { ...this.locals, [seat]: { ...this.locals[seat], lastReceipt: provisional } };
    const frame = this.pushFrame(before, transition);
    const receipt: IntentReceipt = { ...provisional, version: this.version };
    if (seat) this.locals = { ...this.locals, [seat]: { ...this.locals[seat], lastReceipt: receipt } };
    return { receipt, identityViolation: null, frame, seatUpdate: null };
  }
}

export { ORACLE_AI_SEATS };
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
