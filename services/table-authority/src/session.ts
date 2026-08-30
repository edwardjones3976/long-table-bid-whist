// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Authenticated sessions over any transport.
 *
 * A connection presents an opaque token. The token is matched by exact
 * equality against a typed participant directory; there is no pattern, prefix
 * or heuristic acceptance. The role a connection asks for is granted only when
 * the table entitles that participant to it: a seat binding for `player`, the
 * host binding for `host`, any directory participant for `public`, and a
 * directory entry of kind `dealer` for `dealer`.
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
import { TableAuthority, type Actor, type HistoryFrame } from "./table";

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
}

interface Connection {
  readonly connectionId: string;
  readonly sessionId: string;
  readonly participantId: string;
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

  private error(connectionId: string, code: WireErrorCode, detail = ""): Outbound[] {
    return [{ connectionId, message: { type: "error", code, detail: detail.slice(0, 120) } }];
  }

  /** Broadcasts a frame to every connection on the table, by role. */
  private broadcast(table: TableAuthority, frame: HistoryFrame): Outbound[] {
    const out: Outbound[] = [];
    for (const connection of this.connections.values()) {
      if (connection.tableId !== table.tableId) continue;
      const projection = TableAuthority.projectionFromFrame(frame, connection.role, connection.seat);
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

  private hello(connectionId: string, message: Extract<ClientMessage, { type: "hello" }>): Outbound[] {
    const entry = this.directory.lookup(message.token);
    if (!entry) return this.error(connectionId, "unauthenticated");
    const table = this.tables.get(message.tableId);
    if (!table) return this.error(connectionId, "unknown-table");

    let seat: Seat | null = null;
    switch (message.role) {
      case "player":
        seat = table.seatOf(entry.participantId);
        if (!seat) return this.error(connectionId, "role-unavailable", "no seat bound to participant");
        break;
      case "host":
        if (!table.isHost(entry.participantId)) return this.error(connectionId, "role-unavailable", "not the table host");
        break;
      case "public":
        if (entry.kind !== "participant") return this.error(connectionId, "role-unavailable");
        break;
      case "dealer":
        if (entry.kind !== "dealer") return this.error(connectionId, "role-unavailable", "not a dealer credential");
        break;
    }

    // A reconnecting participant replaces any earlier connection of the same role.
    const out: Outbound[] = [];
    for (const existing of [...this.connections.values()]) {
      if (existing.participantId === entry.participantId && existing.role === message.role && existing.tableId === table.tableId) {
        this.connections.delete(existing.connectionId);
      }
    }
    const connection: Connection = {
      connectionId,
      sessionId: this.sessionIdFor(connectionId),
      participantId: entry.participantId,
      role: message.role,
      tableId: table.tableId,
      seat,
    };
    this.connections.set(connectionId, connection);

    const presenceFrame = seat ? table.setSeatPresence(seat, true, message.displayName) : null;

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
        projection: table.snapshot(connection.role, seat),
      },
    });
    if (message.lastVersion !== null) {
      const replay = table.replayFrames(connection.role, seat, message.lastVersion);
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
    if (!connection) return this.error(connectionId, "not-welcomed");
    const table = this.tables.get(message.tableId);
    if (!table || table.tableId !== connection.tableId) return this.error(connectionId, "unknown-table");

    const result = table.submitIntent(this.actorFor(connection), {
      tableId: message.tableId,
      intentId: message.intentId,
      expectedVersion: message.expectedVersion,
      intent: message.intent,
    });
    const out: Outbound[] = [{ connectionId, message: { type: "receipt", tableId: table.tableId, receipt: result.receipt } }];
    if (result.frame) out.push(...this.broadcast(table, result.frame));
    return out;
  }

  private resync(connectionId: string, message: Extract<ClientMessage, { type: "resync" }>): Outbound[] {
    const connection = this.connections.get(connectionId);
    if (!connection) return this.error(connectionId, "not-welcomed");
    const table = this.tables.get(message.tableId);
    if (!table || table.tableId !== connection.tableId) return this.error(connectionId, "unknown-table");
    const replay = table.replayFrames(connection.role, connection.seat, message.lastVersion);
    const out: Outbound[] = [
      {
        connectionId,
        message: {
          type: "replay",
          tableId: table.tableId,
          fromVersion: message.lastVersion,
          toVersion: table.currentVersion,
          truncated: replay.truncated,
          frames: replay.frames,
        },
      },
    ];
    const snapshot = table.snapshot(connection.role, connection.seat);
    if (snapshot) {
      out.push({ connectionId, message: { type: "projection", tableId: table.tableId, version: table.currentVersion, projection: snapshot } });
    }
    return out;
  }

  /** Transport closed. A seated player is marked disconnected for everyone else. */
  disconnect(connectionId: string): Outbound[] {
    const connection = this.connections.get(connectionId);
    if (!connection) return [];
    this.connections.delete(connectionId);
    const table = this.tables.get(connection.tableId);
    if (!table || !connection.seat) return [];
    const frame = table.setSeatPresence(connection.seat, false, null);
    return frame ? this.broadcast(table, frame) : [];
  }
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
