// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Authenticated sessions over any transport.
 *
 * A connection presents an opaque token. The token is matched by exact
 * equality against a typed participant directory; there is no pattern, prefix
 * or heuristic acceptance. A participant-kind credential is required for the
 * player, host and public roles and a dealer-kind credential for the dealer
 * role; a credential of the wrong kind never obtains a projection, whatever
 * participant identity it carries.
 *
 * Entitlement is re-derived from the table before every read or write of
 * presence — on hello, intent, resync, disconnect and every broadcast. A
 * connection whose participant no longer owns its seat, no longer hosts, or
 * no longer belongs to the table is revoked (`role-unavailable`, then closed)
 * before anything is sent to it and before its disconnect can touch presence.
 *
 * Reconnect: a second hello with the same token and a `lastVersion` re-binds
 * the participant, marks the seat connected, and replays the retained
 * projections the connection missed after the authoritative snapshot.
 */
import {
  type AuthorityMessage,
  type ClientMessage,
  type Role,
  type Seat,
  type WireErrorCode,
} from "../../../packages/protocol/src";
import { TableAuthority, type Actor, type HistoryFrame, type SeatBinding, type SeatUpdate } from "./table";

export interface DirectoryEntry {
  readonly participantId: string;
  readonly kind: "participant" | "dealer";
}

export interface ParticipantDirectory {
  lookup(token: string): DirectoryEntry | null;
}

/** Exact-match directory; `Map.get` is the only acceptance test. */
export function staticDirectory(entries: Readonly<Record<string, DirectoryEntry>>): ParticipantDirectory {
  const table = new Map<string, DirectoryEntry>(Object.entries(entries));
  return { lookup: (token) => table.get(token) ?? null };
}

export interface Outbound {
  readonly connectionId: string;
  readonly message: AuthorityMessage;
  /** The transport must close the connection after delivering this message. */
  readonly closeAfter?: boolean;
}

interface Connection {
  readonly connectionId: string;
  readonly sessionId: string;
  readonly participantId: string;
  readonly kind: DirectoryEntry["kind"];
  readonly role: Role;
  readonly tableId: string;
  readonly seat: Seat | null;
}

export interface SessionOptions {
  readonly directory: ParticipantDirectory;
  readonly tables: ReadonlyMap<string, TableAuthority> | Map<string, TableAuthority>;
  /** Deterministic session ids for tests; defaults to a counter. */
  readonly sessionIdFor?: (connectionId: string) => string;
}

function requiredKind(role: Role): DirectoryEntry["kind"] {
  return role === "dealer" ? "dealer" : "participant";
}

export class AuthoritySessions {
  private readonly connections = new Map<string, Connection>();
  private readonly directory: ParticipantDirectory;
  private readonly tables: ReadonlyMap<string, TableAuthority>;
  private readonly sessionIdFor: (connectionId: string) => string;
  private sessionCounter = 0;

  constructor(options: SessionOptions) {
    this.directory = options.directory;
    this.tables = options.tables;
    this.sessionIdFor =
      options.sessionIdFor ??
      (() => {
        this.sessionCounter += 1;
        return `session-${this.sessionCounter}`;
      });
  }

  connectionCount(): number {
    return this.connections.size;
  }

  /** True while `connectionId` is bound and entitled. */
  isBound(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }

  private error(connectionId: string, code: WireErrorCode, detail = "", closeAfter = false): Outbound {
    return { connectionId, message: { type: "error", code, detail: detail.slice(0, 120) }, closeAfter };
  }

  /** Entitlement re-derived from the table's current bindings. */
  private entitled(connection: Connection, table: TableAuthority): boolean {
    if (connection.tableId !== table.tableId) return false;
    if (connection.kind !== requiredKind(connection.role)) return false;
    switch (connection.role) {
      case "player":
        return connection.seat !== null && table.owns(connection.seat, connection.participantId);
      case "host":
        return table.isHost(connection.participantId);
      case "public":
        return true;
      case "dealer":
        return true;
    }
  }

  /** Revokes every connection on `table` whose entitlement no longer holds. Runs before any read or write of presence. */
  private revalidate(table: TableAuthority): Outbound[] {
    const out: Outbound[] = [];
    for (const connection of [...this.connections.values()]) {
      if (connection.tableId !== table.tableId) continue;
      if (this.entitled(connection, table)) continue;
      this.connections.delete(connection.connectionId);
      out.push(this.error(connection.connectionId, "role-unavailable", "entitlement revoked", true));
    }
    return out;
  }

  /** Broadcasts an authoritative frame to every entitled connection on the table, by role. */
  private broadcast(table: TableAuthority, frame: HistoryFrame): Outbound[] {
    const out = this.revalidate(table);
    for (const connection of this.connections.values()) {
      if (connection.tableId !== table.tableId) continue;
      const projection = TableAuthority.projectionFromFrame(frame, connection.role, connection.seat, connection.participantId);
      if (projection) {
        out.push({
          connectionId: connection.connectionId,
          message: { type: "projection", tableId: table.tableId, version: frame.version, projection },
        });
      }
      for (const cue of frame.cues) {
        out.push({ connectionId: connection.connectionId, message: { type: "dealer-cue", tableId: table.tableId, frame: cue } });
      }
    }
    return out;
  }

  /** Delivers a player-local change to the one connection that owns the seat. */
  private deliverSeatUpdate(table: TableAuthority, update: SeatUpdate): Outbound[] {
    const out = this.revalidate(table);
    for (const connection of this.connections.values()) {
      if (connection.tableId !== table.tableId || connection.role !== "player") continue;
      if (connection.seat !== update.seat || connection.participantId !== update.participantId) continue;
      out.push({
        connectionId: connection.connectionId,
        message: { type: "projection", tableId: table.tableId, version: update.projection.version, projection: update.projection },
      });
    }
    return out;
  }

  handle(connectionId: string, message: ClientMessage): Outbound[] {
    switch (message.type) {
      case "hello":
        return this.hello(connectionId, message);
      case "intent":
        return this.intent(connectionId, message);
      case "resync":
        return this.resync(connectionId, message);
    }
  }

  /** Seats or re-seats a participant. Existing connections are revoked or re-entitled atomically with the broadcast. */
  bindSeat(tableId: string, seat: Seat, binding: SeatBinding): Outbound[] {
    const table = this.tables.get(tableId);
    if (!table) return [];
    const frame = table.bindSeat(seat, binding);
    return frame ? this.broadcast(table, frame) : this.revalidate(table);
  }

  private hello(connectionId: string, message: Extract<ClientMessage, { type: "hello" }>): Outbound[] {
    const entry = this.directory.lookup(message.token);
    if (!entry) return [this.error(connectionId, "unauthenticated")];
    const table = this.tables.get(message.tableId);
    if (!table) return [this.error(connectionId, "unknown-table")];
    if (entry.kind !== requiredKind(message.role)) {
      return [this.error(connectionId, "role-unavailable", "credential kind does not match role")];
    }

    let seat: Seat | null = null;
    switch (message.role) {
      case "player":
        seat = table.seatOf(entry.participantId);
        if (!seat) return [this.error(connectionId, "role-unavailable", "no seat bound to participant")];
        break;
      case "host":
        if (!table.isHost(entry.participantId)) return [this.error(connectionId, "role-unavailable", "not the table host")];
        break;
      case "public":
      case "dealer":
        break;
    }

    // A reconnecting participant replaces any earlier connection of the same role silently.
    for (const existing of [...this.connections.values()]) {
      if (existing.participantId === entry.participantId && existing.role === message.role && existing.tableId === table.tableId) {
        this.connections.delete(existing.connectionId);
      }
    }
    const connection: Connection = {
      connectionId,
      sessionId: this.sessionIdFor(connectionId),
      participantId: entry.participantId,
      kind: entry.kind,
      role: message.role,
      tableId: table.tableId,
      seat,
    };
    this.connections.set(connectionId, connection);

    const out: Outbound[] = this.revalidate(table);
    const presenceFrame = seat ? table.setSeatPresence(seat, entry.participantId, true, message.displayName) : null;

    out.push({
      connectionId,
      message: {
        type: "welcome",
        protocolVersion: message.protocolVersion,
        sessionId: connection.sessionId,
        role: connection.role,
        seat,
        tableId: table.tableId,
        version: table.currentVersion,
        projection: table.snapshot(connection.role, seat, connection.participantId),
      },
    });
    if (message.lastVersion !== null) {
      const replay = table.replayFrames(connection.role, seat, connection.participantId, message.lastVersion);
      out.push({
        connectionId,
        message: {
          type: "replay",
          tableId: table.tableId,
          fromVersion: message.lastVersion,
          toVersion: table.currentVersion,
          truncated: replay.truncated,
          frames: replay.frames,
        },
      });
    }
    // Everyone else learns the seat is connected again; the joiner already holds the snapshot.
    if (presenceFrame) {
      out.push(...this.broadcast(table, presenceFrame).filter((item) => item.connectionId !== connectionId));
    }
    return out;
  }

  private actorFor(connection: Connection): Actor {
    return { role: connection.role, participantId: connection.participantId, seat: connection.seat };
  }

  private intent(connectionId: string, message: Extract<ClientMessage, { type: "intent" }>): Outbound[] {
    const connection = this.connections.get(connectionId);
    if (!connection) return [this.error(connectionId, "not-welcomed")];
    const table = this.tables.get(message.tableId);
    if (!table || table.tableId !== connection.tableId) return [this.error(connectionId, "unknown-table")];

    const out = this.revalidate(table);
    if (!this.connections.has(connectionId)) return out;

    const result = table.submitIntent(this.actorFor(connection), {
      tableId: message.tableId,
      intentId: message.intentId,
      expectedVersion: message.expectedVersion,
      intent: message.intent,
    });
    out.push({ connectionId, message: { type: "receipt", tableId: table.tableId, receipt: result.receipt } });
    if (result.frame) out.push(...this.broadcast(table, result.frame));
    if (result.seatUpdate) out.push(...this.deliverSeatUpdate(table, result.seatUpdate));
    return out;
  }

  private resync(connectionId: string, message: Extract<ClientMessage, { type: "resync" }>): Outbound[] {
    const connection = this.connections.get(connectionId);
    if (!connection) return [this.error(connectionId, "not-welcomed")];
    const table = this.tables.get(message.tableId);
    if (!table || table.tableId !== connection.tableId) return [this.error(connectionId, "unknown-table")];

    const out = this.revalidate(table);
    if (!this.connections.has(connectionId)) return out;

    const replay = table.replayFrames(connection.role, connection.seat, connection.participantId, message.lastVersion);
    out.push({
      connectionId,
      message: {
        type: "replay",
        tableId: table.tableId,
        fromVersion: message.lastVersion,
        toVersion: table.currentVersion,
        truncated: replay.truncated,
        frames: replay.frames,
      },
    });
    const snapshot = table.snapshot(connection.role, connection.seat, connection.participantId);
    if (snapshot) {
      out.push({ connectionId, message: { type: "projection", tableId: table.tableId, version: table.currentVersion, projection: snapshot } });
    }
    return out;
  }

  /** Transport closed. Presence changes only when the leaving participant still owns the seat. */
  disconnect(connectionId: string): Outbound[] {
    const connection = this.connections.get(connectionId);
    if (!connection) return [];
    this.connections.delete(connectionId);
    const table = this.tables.get(connection.tableId);
    if (!table) return [];
    const out = this.revalidate(table);
    if (connection.seat && this.entitled(connection, table)) {
      const frame = table.setSeatPresence(connection.seat, connection.participantId, false, null);
      if (frame) out.push(...this.broadcast(table, frame));
    }
    return out;
  }
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
