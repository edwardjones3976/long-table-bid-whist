/**
 * Socket.IO front for Bid Whist matches. Each connection gets its own snapshot:
 * a player sees their seat's view, the host sees public state only.
 * shortcut: membership is tied to the socket, so a dropped player becomes a bot at once;
 * session tokens, seat reservation and reconnect come with rooms.
 */
import { createServer, type Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import type { Card } from "../shared/cards";
import { RuleError, type Seat } from "./games/game";
import { GAMES } from "./games/index";
import { Match, type ActionRequest } from "./match";

const SEATS: readonly Seat[] = [0, 1, 2, 3];

interface Table {
  game: string;
  /** Socket that created the table; lets an unjoined table be dropped when it leaves. */
  creator: string;
  match: Match;
  /** socket id -> seat, or null for the non-playing host. */
  members: Map<string, Seat | null>;
}

type Ack = (reply: unknown) => void;

export interface GameServer {
  http: HttpServer;
  io: Server;
  matches: Map<string, Table>;
}

/** `shuffle` is for tests; it is not reachable from any network message. */
export function createGameServer(shuffle?: (deck: Card[]) => Card[]): GameServer {
  const http = createServer();
  const io = new Server(http, { maxHttpBufferSize: 16 * 1024 });
  const matches = new Map<string, Table>();

  function broadcast(matchId: string, table: Table): void {
    const taken = new Set(table.members.values());
    const started = table.match.state !== null;
    for (const [socketId, seat] of table.members) {
      io.to(socketId).emit("snapshot", {
        matchId,
        game: table.game,
        revision: table.match.revision,
        started,
        you: seat,
        seats: SEATS.map((s) => (taken.has(s) ? "human" : started ? "bot" : "open")),
        host: taken.has(null),
        view: table.match.view(seat),
      });
    }
  }

  /** Runs a handler, always answers the ack, and never lets one socket crash the server. */
  function on(socket: Socket, event: string, handler: (payload: any) => unknown): void {
    socket.on(event, (...args: unknown[]) => {
      // The ack is whatever function came last, even with no payload or extra arguments.
      const ack = args.filter((arg) => typeof arg === "function").at(-1);
      const reply = (ack as Ack | undefined) ?? (() => {});
      const payload = typeof args[0] === "object" && args[0] !== null ? args[0] : {};
      try {
        reply(handler(payload));
      } catch (error) {
        if (error instanceof RuleError) return reply({ ok: false, error: "illegal", message: error.message });
        console.error(`${event} failed:`, error instanceof Error ? error.message : "unknown error");
        reply({ ok: false, error: "internal", message: "Server error" });
      }
    });
  }

  const no = (error: string, message: string) => ({ ok: false, error, message });

  io.on("connection", (socket) => {
    function member(matchId: unknown): { table: Table; seat: Seat | null } | null {
      const table = typeof matchId === "string" ? matches.get(matchId) : undefined;
      return table?.members.has(socket.id) ? { table, seat: table.members.get(socket.id)! } : null;
    }

    on(socket, "create", ({ game = "bid-whist", options }: { game?: string; options?: unknown }) => {
      if (typeof game !== "string" || !Object.hasOwn(GAMES, game)) return no("no-such-game", "That game is not offered");
      const matchId = crypto.randomUUID();
      const table: Table = {
        game,
        creator: socket.id,
        match: new Match(GAMES[game], options, shuffle, () => broadcast(matchId, table)),
        members: new Map(),
      };
      matches.set(matchId, table);
      return { ok: true, matchId };
    });

    on(socket, "join", ({ matchId, role }: { matchId?: string; role?: string }) => {
      const table = typeof matchId === "string" ? matches.get(matchId) : undefined;
      if (!table) return no("no-such-match", "That match does not exist");
      if (table.members.has(socket.id)) return no("already-joined", "You are already at this table");
      if (table.match.state) return no("already-started", "That match has already started");
      const taken = new Set(table.members.values());
      let seat: Seat | null;
      if (role === "host") {
        if (taken.has(null)) return no("host-taken", "This table already has a host");
        seat = null;
      } else {
        const free = SEATS.find((s) => !taken.has(s));
        if (free === undefined) return no("match-full", "All four seats are taken");
        seat = free;
      }
      table.members.set(socket.id, seat);
      broadcast(matchId!, table);
      return { ok: true, seat };
    });

    on(socket, "start", ({ matchId }: { matchId?: string }) => {
      const found = member(matchId);
      if (!found) return no("not-a-member", "You are not at that table");
      const seated = [...found.table.members.values()].filter((seat) => seat !== null);
      if (!seated.length) return no("no-players", "Seat at least one player first");
      for (const seat of seated) found.table.match.humans[seat] = true;
      found.table.match.start();
      return { ok: true };
    });

    on(socket, "action", (request: ActionRequest & { matchId?: string }) => {
      const found = member(request.matchId);
      if (!found) return no("not-a-member", "You are not at that table");
      if (found.seat === null) return no("not-a-player", "The host does not play");
      return found.table.match.act(found.seat, request);
    });

    socket.on("disconnect", () => {
      for (const [matchId, table] of matches) {
        if (!table.members.has(socket.id)) {
          if (table.creator === socket.id && table.members.size === 0) matches.delete(matchId);
          continue;
        }
        const seat = table.members.get(socket.id)!;
        table.members.delete(socket.id);
        const players = [...table.members.values()].some((s) => s !== null);
        // An unstarted lobby lives while anyone is in it; a started match ends when its last player goes.
        if (table.members.size === 0 || (table.match.state && !players)) {
          for (const socketId of table.members.keys()) io.to(socketId).emit("closed", { matchId });
          matches.delete(matchId);
          continue;
        }
        try {
          if (seat !== null && table.match.state) table.match.leave(seat);
          broadcast(matchId, table);
        } catch (error) {
          console.error("disconnect failed:", error instanceof Error ? error.message : "unknown error");
        }
      }
    });
  });

  return { http, io, matches };
}
