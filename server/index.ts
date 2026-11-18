/**
 * Socket.IO front for the room protocol in shared/protocol.ts. Binds each room
 * member to one live socket; the room and table rules live in rooms.ts.
 */
import { createReadStream, stat } from "node:fs";
import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { Server, type Socket } from "socket.io";
import type { Card } from "../shared/cards";
import type { Joined } from "../shared/protocol";
import { RuleError } from "./games/game";
import { Refusal, Rooms } from "./rooms";

type Ack = (reply: unknown) => void;

export interface GameServerOptions {
  shuffle?: (deck: Card[]) => Card[];
  /** How long a dropped member keeps their place; defaults to SEAT_HOLD_MS. */
  holdMs?: number;
  /** Acknowledged events allowed per socket: a burst, refilled per second. */
  rateLimit?: { burst: number; perSecond: number };
}

export interface GameServer {
  http: HttpServer;
  io: Server;
  rooms: Rooms;
}

function allowedOrigins(): string[] {
  const fromEnv = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
  const dev = process.env.NODE_ENV === "production" ? [] : ["http://localhost:5173", "https://localhost:5173"];
  return [...fromEnv, ...dev];
}

/** `options` are for tests; none of them is reachable from any network message. */
export function createGameServer(options: GameServerOptions = {}): GameServer {
  const { burst, perSecond } = options.rateLimit ?? { burst: 60, perSecond: 20 };
  const origins = allowedOrigins();
  const http = createServer();
  const io = new Server(http, {
    maxHttpBufferSize: 16 * 1024,
    cors: { origin: origins },
    // CORS headers do not stop a cross-site WebSocket, so the Origin is checked on every handshake.
    // Requests with no Origin header come from non-browser clients, which CORS never covered.
    allowRequest: (req, done) => {
      const origin = req.headers.origin;
      let same = false;
      try {
        same = origin !== undefined && new URL(origin).host === req.headers.host;
      } catch {
        // an unparseable Origin is refused
      }
      done(null, origin === undefined || same || origins.includes(origin));
    },
  });

  /** memberId -> the one socket that speaks for that member. */
  const sockets = new Map<string, Socket>();
  const rooms = new Rooms((memberId, event, payload) => sockets.get(memberId)?.emit(event, payload), options);
  http.on("close", () => rooms.close());

  const no = (error: string, message: string) => ({ ok: false, error, message });

  io.on("connection", (socket) => {
    let tokens = burst;
    let refilled = Date.now();
    const me = (): string | undefined => socket.data.memberId;

    /** Runs a handler, always answers the ack, and never lets one socket crash the server. */
    function on(event: string, handler: (payload: any) => object | void): void {
      socket.on(event, (...args: unknown[]) => {
        // The ack is whatever function came last, even with no payload or extra arguments.
        const ack = args.filter((arg) => typeof arg === "function").at(-1);
        const reply = (ack as Ack | undefined) ?? (() => {});
        const payload = typeof args[0] === "object" && args[0] !== null ? args[0] : {};
        const now = Date.now();
        tokens = Math.min(burst, tokens + ((now - refilled) / 1000) * perSecond);
        refilled = now;
        if (tokens < 1) return reply(no("rate-limited", "Too many requests; slow down"));
        tokens -= 1;
        try {
          reply(handler(payload) ?? { ok: true });
        } catch (error) {
          if (error instanceof Refusal) return reply(no(error.code, error.message));
          if (error instanceof RuleError) return reply(no("illegal", error.message));
          console.error(`${event} failed:`, error instanceof Error ? error.message : "unknown error");
          reply(no("internal", "Server error"));
        }
      });
    }

    function bind(joined: Joined): object {
      const old = sockets.get(joined.memberId);
      if (old && old !== socket) {
        old.data.memberId = undefined;
        old.disconnect(true);
      }
      sockets.set(joined.memberId, socket);
      socket.data.memberId = joined.memberId;
      rooms.connected(joined.memberId);
      return { ok: true, ...joined };
    }

    function free(): void {
      if (me() !== undefined) throw new Refusal("bad-request", "Leave your current room first");
    }

    on("room:create", ({ name }) => (free(), bind(rooms.create(name))));
    on("room:join", ({ code, name }) => (free(), bind(rooms.join(code, name))));
    on("room:resume", ({ token }) => {
      const joined = rooms.resume(token);
      if (me() !== joined.memberId) free();
      return bind(joined);
    });
    on("room:leave", () => {
      const memberId = me();
      rooms.leave(memberId);
      sockets.delete(memberId!);
      socket.data.memberId = undefined;
    });
    on("table:sit", (payload) => ({ ok: true, ...rooms.sit(me(), payload) }));
    on("table:stand", () => rooms.stand(me()));
    on("table:ready", ({ ready }) => rooms.ready(me(), ready));
    on("table:options", ({ options: houseRules }) => rooms.options(me(), houseRules));
    on("table:start", () => rooms.start(me()));
    on("table:action", (request) => rooms.action(me(), request));
    on("table:reset", () => rooms.reset(me()));

    socket.on("pose", (payload: unknown) => {
      if (typeof payload === "object" && payload !== null) rooms.pose(me(), payload);
    });

    socket.on("disconnect", () => {
      const memberId = me();
      // A socket that was replaced by a resume no longer speaks for its member.
      if (memberId === undefined || sockets.get(memberId) !== socket) return;
      sockets.delete(memberId);
      rooms.disconnected(memberId);
    });
  });

  return { http, io, rooms };
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
};

/**
 * A request listener that serves the built client from `root`; anything that is
 * not a file there gets index.html so client-side routes load. Add it after
 * createGameServer: Socket.IO answers its own paths and this leaves them alone.
 */
export function serveStatic(root: string): (req: IncomingMessage, res: ServerResponse) => void {
  const base = resolve(root);
  return (req, res) => {
    if (req.url?.startsWith("/socket.io/")) return;
    const end = (status: number) => res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" }).end(`${status}`);
    if (req.method !== "GET" && req.method !== "HEAD") return void end(405);
    let file: string;
    try {
      file = resolve(base, `.${decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname)}`);
    } catch {
      return void end(400);
    }
    if (file.includes("\0") || (file !== base && !file.startsWith(base + sep))) return void end(403);
    stat(file, (error, stats) => {
      const target = !error && stats.isFile() ? file : join(base, "index.html");
      const stream = createReadStream(target);
      stream.once("error", () => (res.headersSent ? res.destroy() : end(404)));
      stream.once("open", () => {
        res.writeHead(200, {
          "Content-Type": CONTENT_TYPES[extname(target).toLowerCase()] ?? "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
        });
        if (req.method === "HEAD") {
          stream.destroy();
          res.end();
        } else {
          // pipe() does not close the file when the client aborts.
          res.once("close", () => stream.destroy());
          stream.pipe(res);
        }
      });
    });
  };
}
