// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * The authoritative table.
 *
 * One `TableAuthority` owns one table: the committed `GameState`, the seat
 * bindings, every seat's player-local (uncommitted) preview state, the
 * monotonic table version, the intent-id ledgers, the replay record, and a
 * bounded history of the projections emitted at each version.
 *
 * Two kinds of accepted intent exist. Authoritative intents (confirm,
 * next-hand, host powers) advance the shared version, enter history and are
 * remembered forever. Player-local intents (preview, toggle-discard, cancel)
 * change only the acting seat's own projection: the shared version, the host
 * and public projections and the replay history are untouched.
 *
 * Order of checks for every intent: table identity, duplicate intent id,
 * event ended, role authority, seat ownership, stale version, then the rules.
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
  REJECTION_MESSAGES,
  type DealerCueFrame,
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

export interface TableOptions {
  readonly tableId: string;
  readonly seed: string;
  readonly hostParticipantId: string | null;
  readonly seats?: Partial<Record<Seat, SeatBinding>>;
  readonly firstDealer?: Seat;
  /** Versions of projection history retained for reconnect replay. */
  readonly historyRetention?: number;
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

export interface SubmitResult {
  readonly receipt: IntentReceipt;
  /** Present only when the shared table version advanced. */
  readonly frame: HistoryFrame | null;
  /** Present only for an accepted player-local intent. */
  readonly seatUpdate: SeatUpdate | null;
}

export interface ReplayFrames {
  readonly frames: { version: number; projection: RoleProjection }[];
  readonly truncated: boolean;
}

const DEFAULT_RETENTION = 128;
/** Accepted player-local intents remembered for duplicate suppression. Their re-application is harmless. */
const LOCAL_LEDGER = 4096;
/** Rejected intents remembered for duplicate suppression. They changed nothing, so eviction is harmless. */
const REJECTED_LEDGER = 512;

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

/** Insertion-ordered ledger with a capacity; the oldest entry is evicted first. */
class BoundedLedger {
  private readonly entries = new Map<string, IntentReceipt>();
  private readonly order: string[] = [];
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(intentId: string): IntentReceipt | undefined {
    return this.entries.get(intentId);
  }

  set(intentId: string, receipt: IntentReceipt): void {
    if (!this.entries.has(intentId)) this.order.push(intentId);
    this.entries.set(intentId, receipt);
    while (this.order.length > this.capacity) {
      const evicted = this.order.shift();
      if (evicted !== undefined) this.entries.delete(evicted);
    }
  }
}

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
  /** Intents that advanced authoritative state. Unbounded for the table's lifetime: they can never become reusable. */
  private readonly authoritativeLedger = new Map<string, IntentReceipt>();
  private readonly localLedger = new BoundedLedger(LOCAL_LEDGER);
  private readonly rejectedLedger = new BoundedLedger(REJECTED_LEDGER);
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

  private findReceipt(intentId: string): IntentReceipt | undefined {
    return this.authoritativeLedger.get(intentId) ?? this.localLedger.get(intentId) ?? this.rejectedLedger.get(intentId);
  }

  private rejected(seat: Seat | null, submission: IntentSubmission, code: RejectionCode): SubmitResult {
    const receipt = this.receipt(submission, "rejected", code, false);
    this.rejectedLedger.set(receipt.intentId, receipt);
    if (seat) this.locals = { ...this.locals, [seat]: { ...this.locals[seat], lastReceipt: receipt } };
    return { receipt, frame: null, seatUpdate: null };
  }

  submitIntent(actor: Actor, submission: IntentSubmission): SubmitResult {
    const seat = actor.role === "player" ? actor.seat : null;

    if (submission.tableId !== this.tableId) return this.rejected(seat, submission, "unknown-table");

    // Idempotency first: a replayed intent id is answered from the ledgers and
    // never re-evaluated, whatever the version has become since.
    if (this.findReceipt(submission.intentId)) {
      const receipt = this.receipt(submission, "duplicate", "duplicate-input-id", false);
      if (seat) this.locals = { ...this.locals, [seat]: { ...this.locals[seat], lastReceipt: receipt } };
      return { receipt, frame: null, seatUpdate: null };
    }

    if (this.eventEnded) return this.rejected(seat, submission, "event-ended");

    const allowed = INTENT_AUTHORITY[submission.intent.kind];
    if (!allowed.includes(actor.role)) return this.rejected(seat, submission, "unauthorized-role");
    if (actor.role === "host" && !this.isHost(actor.participantId)) return this.rejected(seat, submission, "unauthorized-role");
    if (actor.role === "player" && (!seat || !this.owns(seat, actor.participantId))) {
      return this.rejected(seat, submission, "seat-not-bound");
    }

    if (submission.expectedVersion !== this.version) return this.rejected(seat, submission, "stale-version");

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
        return this.acceptAuthoritative(seat, submission, { game: this.game, substitutedSeat: intent.seat }, false);
      }
      case "host-transfer": {
        if (this.seatOf(intent.participantId) === null) return this.rejected(seat, submission, "unknown-participant");
        this.hostParticipantId = intent.participantId;
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
    this.localLedger.set(receipt.intentId, receipt);
    this.setLocal(seat, uncommitted, receipt);
    const binding = this.seats[seat];
    if (binding.occupant !== "human") return { receipt, frame: null, seatUpdate: null };
    return {
      receipt,
      frame: null,
      seatUpdate: { seat, participantId: binding.participantId, projection: this.playerProjection(seat) },
    };
  }

  /** Accepts an authoritative change: the version advances, a frame enters history, the id is remembered forever. */
  private acceptAuthoritative(seat: Seat | null, submission: IntentSubmission, transition: Transition, committed: boolean): SubmitResult {
    const before = this.game;
    // The receipt is remembered before the frame is built so the seat's own
    // projection reflects an accepted (feedback-free) last receipt.
    const provisional = this.receipt(submission, "accepted", null, committed);
    if (seat) this.locals = { ...this.locals, [seat]: { ...this.locals[seat], lastReceipt: provisional } };
    const frame = this.pushFrame(before, transition);
    const receipt: IntentReceipt = { ...provisional, version: this.version };
    this.authoritativeLedger.set(receipt.intentId, receipt);
    if (seat) this.locals = { ...this.locals, [seat]: { ...this.locals[seat], lastReceipt: receipt } };
    return { receipt, frame, seatUpdate: null };
  }
}

export { ORACLE_AI_SEATS };
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
