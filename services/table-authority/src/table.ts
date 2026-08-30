// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * The authoritative table.
 *
 * One `TableAuthority` owns one table: the committed `GameState`, the seat
 * bindings, every seat's uncommitted preview, the monotonic table version,
 * the intent-id ledger, the replay record, and a bounded history of the
 * projections emitted at each version.
 *
 * Order of checks for every intent: table identity, event ended, duplicate
 * intent id, role authority, seat binding, stale version, then the rules.
 * Nothing after the role check runs for a role that may not submit the kind.
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

/** Everything emitted at one version. */
export interface HistoryFrame {
  readonly version: number;
  readonly player: Partial<Record<Seat, PlayerProjection>>;
  readonly host: HostProjection;
  readonly public: PublicProjection;
  readonly cues: readonly DealerCueFrame[];
}

export interface SubmitResult {
  readonly receipt: IntentReceipt;
  /** Present only when the table version advanced. */
  readonly frame: HistoryFrame | null;
}

export interface ReplayFrames {
  readonly frames: { version: number; projection: RoleProjection }[];
  readonly truncated: boolean;
}

const DEFAULT_RETENTION = 128;
const INTENT_LEDGER = 512;

function openSeats(): Record<Seat, SeatBinding> {
  return { south: { occupant: "open" }, west: { occupant: "open" }, north: { occupant: "open" }, east: { occupant: "open" } };
}

function emptyUncommitted(): Record<Seat, SeatUncommitted> {
  return { south: EMPTY_UNCOMMITTED, west: EMPTY_UNCOMMITTED, north: EMPTY_UNCOMMITTED, east: EMPTY_UNCOMMITTED };
}

function emptyReceipts(): Record<Seat, IntentReceipt | null> {
  return { south: null, west: null, north: null, east: null };
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
  private uncommitted: Record<Seat, SeatUncommitted> = emptyUncommitted();
  private lastReceipts: Record<Seat, IntentReceipt | null> = emptyReceipts();
  private readonly ledger = new Map<string, IntentReceipt>();
  private readonly ledgerOrder: string[] = [];
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

  /** The most recently emitted frame, including the opening frame's cues. */
  lastFrame(): HistoryFrame | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  get ended(): boolean {
    return this.eventEnded;
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
    return SEATS.find((seat) => {
      const binding = this.seats[seat];
      return binding.occupant === "human" && binding.participantId === participantId;
    }) ?? null;
  }

  seatBinding(seat: Seat): SeatBinding {
    return this.seats[seat];
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

  private pushFrame(before: GameState, transition: Transition): HistoryFrame {
    this.version += 1;
    this.game = transition.game;
    if (transition.eventEnded) this.eventEnded = true;
    if (transition.announcement) this.lastAnnouncement = transition.announcement;
    const view = this.view();
    const player: Partial<Record<Seat, PlayerProjection>> = {};
    SEATS.forEach((seat) => {
      if (this.seats[seat].occupant === "human") {
        player[seat] = buildPlayerProjection(view, seat, this.uncommitted[seat], this.lastReceipts[seat]);
      }
    });
    const frame: HistoryFrame = {
      version: this.version,
      player,
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
   * an open or AI seat. Returns the frame when the table changed.
   */
  bindSeat(seat: Seat, binding: SeatBinding): HistoryFrame | null {
    if (this.eventEnded) return null;
    const current = this.seats[seat];
    const handIdle = this.game.phase === "summary" || this.game.auction.length === 0;
    if (!handIdle && current.occupant !== "open") return null;
    if (current.occupant === "human" && binding.occupant !== "human") return null;
    this.seats = { ...this.seats, [seat]: binding };
    this.uncommitted = { ...this.uncommitted, [seat]: EMPTY_UNCOMMITTED };
    const before = this.game;
    return this.pushFrame(before, { game: this.runAiSeats(this.game) });
  }

  /** Marks a human seat connected or disconnected; a change is a public fact. */
  setSeatPresence(seat: Seat, connected: boolean, displayName: string | null): HistoryFrame | null {
    const current = this.seats[seat];
    if (current.occupant !== "human") return null;
    const nextName = displayName && displayName.length > 0 ? displayName : current.displayName;
    if (current.connected === connected && current.displayName === nextName) return null;
    this.seats = { ...this.seats, [seat]: { ...current, connected, displayName: nextName } };
    return this.pushFrame(this.game, { game: this.game });
  }

  snapshot(role: Role, seat: Seat | null): RoleProjection | null {
    const view = this.view();
    switch (role) {
      case "player":
        if (!seat || this.seats[seat].occupant !== "human") return null;
        return buildPlayerProjection(view, seat, this.uncommitted[seat], this.lastReceipts[seat]);
      case "host":
        return buildHostProjection(view);
      case "public":
        return buildPublicProjection(view);
      case "dealer":
        return null;
    }
  }

  /** Projections for `role` after `lastVersion`, oldest first, within retention. */
  replayFrames(role: Role, seat: Seat | null, lastVersion: number): ReplayFrames {
    const wanted = this.history.filter((frame) => frame.version > lastVersion);
    const oldestRetained = this.history.length > 0 ? this.history[0].version : this.version + 1;
    const truncated = lastVersion + 1 < oldestRetained;
    const frames: { version: number; projection: RoleProjection }[] = [];
    for (const frame of wanted) {
      const projection = TableAuthority.projectionFromFrame(frame, role, seat);
      if (projection) frames.push({ version: frame.version, projection });
    }
    return { frames, truncated };
  }

  static projectionFromFrame(frame: HistoryFrame, role: Role, seat: Seat | null): RoleProjection | null {
    switch (role) {
      case "player":
        return seat ? (frame.player[seat] ?? null) : null;
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

  private remember(seat: Seat | null, receipt: IntentReceipt): void {
    this.ledger.set(receipt.intentId, receipt);
    this.ledgerOrder.push(receipt.intentId);
    if (this.ledgerOrder.length > INTENT_LEDGER) {
      const evicted = this.ledgerOrder.shift();
      if (evicted !== undefined) this.ledger.delete(evicted);
    }
    if (seat) this.lastReceipts = { ...this.lastReceipts, [seat]: receipt };
  }

  submitIntent(actor: Actor, submission: IntentSubmission): SubmitResult {
    const seat = actor.role === "player" ? actor.seat : null;
    const rejected = (code: RejectionCode): SubmitResult => {
      const receipt = this.receipt(submission, "rejected", code, false);
      this.remember(seat, receipt);
      return { receipt, frame: null };
    };

    if (submission.tableId !== this.tableId) return rejected("unknown-table");

    // Idempotency first: a replayed intent id is answered from the ledger and
    // never re-evaluated, whatever the version has become since.
    if (this.ledger.has(submission.intentId)) {
      const receipt = this.receipt(submission, "duplicate", "duplicate-input-id", false);
      if (seat) this.lastReceipts = { ...this.lastReceipts, [seat]: receipt };
      return { receipt, frame: null };
    }

    if (this.eventEnded) return rejected("event-ended");

    const allowed = INTENT_AUTHORITY[submission.intent.kind];
    if (!allowed.includes(actor.role)) return rejected("unauthorized-role");
    if (actor.role === "host" && !this.isHost(actor.participantId)) return rejected("unauthorized-role");
    if (actor.role === "player") {
      if (!seat || this.seatOf(actor.participantId) !== seat) return rejected("seat-not-bound");
    }

    if (submission.expectedVersion !== this.version) return rejected("stale-version");

    const intent = submission.intent;
    switch (intent.kind) {
      case "preview":
      case "toggle-discard":
      case "cancel":
      case "confirm":
      case "next-hand":
        return this.handlePlayerIntent(actor, seat, submission, intent);
      case "host-pause":
        if (this.game.phase !== "summary") return rejected("not-between-hands");
        if (this.game.paused) return rejected("wrong-phase");
        return this.accept(seat, submission, { game: setPaused(this.game, true) });
      case "host-resume":
        if (!this.game.paused) return rejected("wrong-phase");
        return this.accept(seat, submission, { game: this.runAiSeats(setPaused(this.game, false)) });
      case "host-announce":
        return this.accept(seat, submission, { game: this.game, announcement: intent.cue });
      case "host-substitute": {
        if (this.game.phase !== "summary") return rejected("not-between-hands");
        if (this.seats[intent.seat].occupant !== "human") return rejected("seat-not-substitutable");
        this.seats = { ...this.seats, [intent.seat]: { occupant: "ai" } };
        this.uncommitted = { ...this.uncommitted, [intent.seat]: EMPTY_UNCOMMITTED };
        return this.accept(seat, submission, { game: this.game, substitutedSeat: intent.seat });
      }
      case "host-transfer": {
        if (this.seatOf(intent.participantId) === null) return rejected("unknown-participant");
        this.hostParticipantId = intent.participantId;
        return this.accept(seat, submission, { game: this.game });
      }
      case "host-end-event":
        return this.accept(seat, submission, { game: this.game, eventEnded: true });
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
    if (actor.role === "host" && intent.kind !== "next-hand") {
      const receipt = this.receipt(submission, "rejected", "unauthorized-role", false);
      this.remember(null, receipt);
      return { receipt, frame: null };
    }
    const current = seat ? this.uncommitted[seat] : EMPTY_UNCOMMITTED;
    const outcome = routePlayerIntent(this.game, actingSeat, current, intent);
    if ("code" in outcome) {
      const receipt = this.receipt(submission, "rejected", outcome.code, false);
      this.remember(seat, receipt);
      return { receipt, frame: null };
    }

    if (!outcome.commit) {
      if (seat) this.uncommitted = { ...this.uncommitted, [seat]: outcome.uncommitted };
      return this.accept(seat, submission, { game: this.game });
    }

    const result = applySeatAction(this.game, actingSeat, outcome.commit);
    if (result.error) {
      const receipt = this.receipt(submission, "rejected", "engine-rejected", false);
      this.remember(seat, receipt);
      return { receipt, frame: null };
    }
    this.replay.entries.push({ seat: actingSeat, action: outcome.commit });
    // A commit invalidates every seat's pointing state; the table has moved on.
    this.uncommitted = emptyUncommitted();
    return this.accept(seat, submission, { game: this.runAiSeats(result.state) }, true);
  }

  private accept(seat: Seat | null, submission: IntentSubmission, transition: Transition, committed = false): SubmitResult {
    const before = this.game;
    // The receipt is remembered before the frame is built so the seat's own
    // projection reflects an accepted (feedback-free) last receipt.
    const provisional = this.receipt(submission, "accepted", null, committed);
    this.remember(seat, provisional);
    const frame = this.pushFrame(before, transition);
    const receipt: IntentReceipt = { ...provisional, version: this.version };
    this.ledger.set(receipt.intentId, receipt);
    if (seat) this.lastReceipts = { ...this.lastReceipts, [seat]: receipt };
    return { receipt, frame };
  }
}

export { ORACLE_AI_SEATS };
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
