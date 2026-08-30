// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * The authoritative table.
 *
 * One `TableAuthority` owns one table: the committed `GameState`, the seat
 * bindings, every seat's player-local (uncommitted) preview state, the
 * monotonic table version, the processed-intent ledger, the replay record, and
 * a bounded history of the projections emitted at each version.
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
 * counter. An intent identity is `<grant>:<counter>`. A counter at or below
 * the high-water is a duplicate with no mutation; exactly high-water plus one
 * is consumed before any semantic or version evaluation and stays consumed
 * for every accepted, local or rejected outcome; a forward gap, a non-current
 * grant or a malformed identity rejects atomically without advancing.
 * Consuming the maximum counter exhausts the whole table incarnation. No
 * submitted-id map, set, receipt cache or probabilistic filter exists; memory
 * never grows with request count.
 *
 * Order of checks for every intent: table identity, public/dealer refusal,
 * lane entitlement, grant and exact counter, then (counter consumed) event
 * ended, intent-kind authority, stale version, then the rules.
 */
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
} from "../../../packages/rules-core/src";
import {
  INTENT_AUTHORITY,
  INTENT_COUNTER_MAX,
  INTENT_COUNTER_MIN,
  INTENT_LANES,
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

export interface TableOptions {
  readonly tableId: string;
  readonly seed: string;
  readonly hostParticipantId: string | null;
  readonly seats?: Partial<Record<Seat, SeatBinding>>;
  readonly firstDealer?: Seat;
  /** Versions of projection history retained for reconnect replay. */
  readonly historyRetention?: number;
  // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
  /**
   * Atomic restoration of a resumed incarnation: all five lane records and the
   * grant high-water together, or neither. A restored lane whose counter
   * high-water already reached the maximum restores the incarnation exhausted.
   */
  readonly restoredLanes?: Readonly<Record<IntentLane, IntentLaneState>>;
  readonly restoredGrantHighWater?: number;
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
    if (options.restoredLanes) {
      if (options.restoredGrantHighWater === undefined) {
        throw new Error("restoredLanes requires restoredGrantHighWater: lanes, grants and high-waters restore atomically or not at all");
      }
      this.grantHighWater = options.restoredGrantHighWater;
      this.lanes = { ...options.restoredLanes };
    } else {
      const issued = {} as Record<IntentLane, IntentLaneState>;
      INTENT_LANES.forEach((lane) => {
        issued[lane] = { currentGrantSessionId: this.issueGrant(), highestConsumedCounter: 0 };
      });
      this.lanes = issued;
    }
    this.exhausted = INTENT_LANES.some((lane) => this.lanes[lane].highestConsumedCounter >= INTENT_COUNTER_MAX);
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
    this.grantHighWater += 1;
    return `grant-${this.grantHighWater}`;
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
      const receipt = this.receipt(submission, "duplicate", "duplicate-input-id", false);
      if (seat) this.locals = { ...this.locals, [seat]: { ...this.locals[seat], lastReceipt: receipt } };
      return { receipt, identityViolation: null, frame: null, seatUpdate: null };
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

    const result = applySeatAction(this.game, actingSeat, outcome.commit);
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
