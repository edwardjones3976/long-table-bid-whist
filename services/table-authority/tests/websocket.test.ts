// @vitest-environment node
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * End-to-end over a real loopback WebSocket: the dependency-free server, the
 * wire dispatcher, the sessions and the table, driven by Node's built-in
 * WebSocket client.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PROTOCOL_VERSION, decodeAuthorityMessage, encodeClientMessage, type AuthorityMessage, type ClientMessage } from "../../../packages/protocol/src";
import { AuthoritySessions, staticDirectory } from "../src/session";
import { FrameParser, acceptKeyFor, encodeFrame, startAuthorityServer, type RunningServer } from "../src/websocket-server";
import { handleClose, handleText } from "../src/wire";
import { PARTICIPANTS, createTable, driveHand } from "./support";

function maskedFrame(opcode: number, payload: Buffer, fin = true): Buffer {
  const mask = Buffer.from([1, 2, 3, 4]);
  const header = Buffer.from([(fin ? 0x80 : 0) | opcode, 0x80 | payload.length]);
  const body = Buffer.alloc(payload.length);
  for (let index = 0; index < payload.length; index += 1) body[index] = payload[index] ^ mask[index % 4];
  return Buffer.concat([header, mask, body]);
}

interface Client {
  socket: WebSocket;
  next: () => Promise<AuthorityMessage>;
  send: (message: ClientMessage) => void;
  closed: Promise<number>;
}

function connectTo(url: string): Promise<Client> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const queue: AuthorityMessage[] = [];
    const waiters: ((message: AuthorityMessage) => void)[] = [];
    const closed = new Promise<number>((done) => socket.addEventListener("close", (event) => done(event.code)));
    socket.addEventListener("message", (event) => {
      const decoded = decodeAuthorityMessage(String(event.data));
      if (!decoded.ok) throw new Error(`authority frame rejected: ${decoded.rejection.code} at ${decoded.rejection.path}`);
      const waiter = waiters.shift();
      if (waiter) waiter(decoded.value);
      else queue.push(decoded.value);
    });
    socket.addEventListener("error", () => reject(new Error("socket error")));
    socket.addEventListener("open", () =>
      resolve({
        socket,
        closed,
        send: (message) => socket.send(encodeClientMessage(message)),
        next: () =>
          new Promise((done, fail) => {
            const queued = queue.shift();
            if (queued) return done(queued);
            const timer = setTimeout(() => fail(new Error("timed out waiting for authority message")), 5000);
            waiters.push((message) => {
              clearTimeout(timer);
              done(message);
            });
          }),
      }),
    );
  });
}

function playerHello(tableId: string, token = "tok-south", displayName = "Ada"): ClientMessage {
  return { type: "hello", protocolVersion: PROTOCOL_VERSION, token, role: "player", tableId, displayName, lastVersion: null };
}

describe("frame parser", () => {
  it("parses masked text frames, reassembles fragments, and answers pings", () => {
    const parser = new FrameParser();
    const one = parser.push(maskedFrame(0x1, Buffer.from("hello", "utf8")));
    expect(one.failure).toBeNull();
    expect(one.frames.map((frame) => frame.payload.toString("utf8"))).toEqual(["hello"]);

    const head = maskedFrame(0x1, Buffer.from("ab", "utf8"), false);
    const tail = maskedFrame(0x0, Buffer.from("cd", "utf8"), true);
    const split = parser.push(head.subarray(0, 3));
    expect(split.frames).toEqual([]);
    const rest = parser.push(Buffer.concat([head.subarray(3), tail]));
    expect(rest.frames.map((frame) => frame.payload.toString("utf8"))).toEqual(["abcd"]);

    const ping = parser.push(maskedFrame(0x9, Buffer.from("p", "utf8")));
    expect(ping.frames[0].opcode).toBe(0x9);
  });

  it("fails closed on an unmasked client frame", () => {
    const parser = new FrameParser();
    expect(parser.push(encodeFrame(0x1, Buffer.from("x", "utf8"))).failure).toBe("unmasked-client-frame");
  });

  it("computes the RFC 6455 accept key", () => {
    expect(acceptKeyFor("dGhlIHNhbXBsZSBub25jZQ==")).toBe("s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
  });
});

describe("authority over a loopback WebSocket", () => {
  const table = createTable({ seed: "socket", humans: ["south"] });
  const sessions = new AuthoritySessions({
    directory: staticDirectory({
      "tok-south": { participantId: PARTICIPANTS.south, kind: "participant" },
      "tok-host": { participantId: PARTICIPANTS.host, kind: "participant" },
      "tok-newcomer": { participantId: "p-newcomer", kind: "participant" },
    }),
    tables: new Map([[table.tableId, table]]),
  });
  let server: RunningServer;

  beforeAll(async () => {
    server = await startAuthorityServer({
      handlers: {
        onText: (id, text) => handleText(sessions, id, text),
        onClose: (id) => handleClose(sessions, id),
      },
    });
  });

  afterAll(async () => {
    await server.close();
  });

  const connect = () => connectTo(server.url);

  it("welcomes, applies intents, broadcasts commits to the host, and cleans up on close", async () => {
    const player = await connect();
    const host = await connect();

    player.send(playerHello(table.tableId));
    const welcome = await player.next();
    expect(welcome.type).toBe("welcome");
    if (welcome.type !== "welcome") return;
    expect(welcome.seat).toBe("south");

    host.send({ type: "hello", protocolVersion: PROTOCOL_VERSION, token: "tok-host", role: "host", tableId: table.tableId, displayName: "", lastVersion: null });
    const hostWelcome = await host.next();
    expect(hostWelcome.type === "welcome" && hostWelcome.role === "host" && hostWelcome.projection.role).toBe("host");
    expect(hostWelcome.type === "welcome" && hostWelcome.role === "host" && hostWelcome.projection.seats.find((seat) => seat.seat === "south")?.displayName).toBe("Ada");

    player.send({ type: "intent", tableId: table.tableId, intentId: "ws-1", expectedVersion: welcome.version, intent: { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } } });
    const receipt = await player.next();
    expect(receipt).toMatchObject({ type: "receipt", receipt: { intentId: "ws-1", outcome: "accepted", committed: false, version: welcome.version } });
    const projection = await player.next();
    expect(projection.type === "projection" && projection.version).toBe(welcome.version);
    expect(projection.type === "projection" && projection.projection.role === "player" && projection.projection.previewLabel).toBe("3 High");

    player.send({ type: "intent", tableId: table.tableId, intentId: "ws-1", expectedVersion: welcome.version, intent: { kind: "confirm" } });
    const duplicate = await player.next();
    expect(duplicate).toMatchObject({ type: "receipt", receipt: { outcome: "duplicate", committed: false } });

    player.send({ type: "intent", tableId: table.tableId, intentId: "ws-2", expectedVersion: welcome.version, intent: { kind: "confirm" } });
    const committed = await player.next();
    expect(committed).toMatchObject({ type: "receipt", receipt: { outcome: "accepted", committed: true, version: welcome.version + 1 } });
    // The preview reached nobody else; the commit reaches the host as a host projection.
    const hostProjection = await host.next();
    expect(hostProjection.type === "projection" && hostProjection.version).toBe(welcome.version + 1);
    expect(hostProjection.type === "projection" && hostProjection.projection.role).toBe("host");

    expect(server.connectionCount()).toBe(2);
    player.socket.close();
    await new Promise((resolve) => setTimeout(resolve, 200));
    for (;;) {
      const next = await host.next();
      if (next.type === "projection") {
        expect(next.projection.seats.find((seat) => seat.seat === "south")?.connected).toBe(false);
        break;
      }
    }
    expect(server.connectionCount()).toBe(1);
    host.socket.close();
  });

  it("closes a player's socket with a policy code when the host substitutes that seat", async () => {
    const player = await connect();
    const host = await connect();
    player.send(playerHello(table.tableId));
    expect((await player.next()).type).toBe("welcome");
    host.send({ type: "hello", protocolVersion: PROTOCOL_VERSION, token: "tok-host", role: "host", tableId: table.tableId, displayName: "", lastVersion: null });
    expect((await host.next()).type).toBe("welcome");

    // Bring the table between hands through the authority itself; sockets receive nothing for table-level drives.
    driveHand(table, ["south"]);
    host.send({ type: "intent", tableId: table.tableId, intentId: "ws-substitute", expectedVersion: table.currentVersion, intent: { kind: "host-substitute", seat: "south" } });
    const hostReceipt = await host.next();
    expect(hostReceipt).toMatchObject({ type: "receipt", receipt: { intentId: "ws-substitute", outcome: "accepted" } });

    const revoked = await player.next();
    expect(revoked).toEqual({ type: "error", code: "role-unavailable", detail: "entitlement revoked" });
    expect(await player.closed).toBe(1008);
    expect(server.connectionCount()).toBe(1);
    host.socket.close();
  });

  it("answers a non-closed frame with schema-rejected and keeps the connection", async () => {
    const client = await connect();
    client.socket.send(JSON.stringify({ type: "hello", token: "tok-south", role: "player", tableId: table.tableId, displayName: "", lastVersion: null, protocolVersion: PROTOCOL_VERSION, hand: [] }));
    const error = await client.next();
    expect(error).toEqual({ type: "error", code: "schema-rejected", detail: "unknown-field at client.hand" });
    client.socket.close();
  });
});

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | BEGIN]]
describe("connection binding and replacement over a loopback WebSocket", () => {
  const table = createTable({ seed: "socket-binding", humans: ["south"] });
  const sessions = new AuthoritySessions({
    directory: staticDirectory({
      "tok-south": { participantId: PARTICIPANTS.south, kind: "participant" },
      "tok-host": { participantId: PARTICIPANTS.host, kind: "participant" },
    }),
    tables: new Map([[table.tableId, table]]),
  });
  let server: RunningServer;

  beforeAll(async () => {
    server = await startAuthorityServer({
      handlers: {
        onText: (id, text) => handleText(sessions, id, text),
        onClose: (id) => handleClose(sessions, id),
      },
    });
  });

  afterAll(async () => {
    await server.close();
  });

  const connect = () => connectTo(server.url);

  it("closes the replaced raw socket with a policy code when the same identity reconnects on a new socket, keeping presence", async () => {
    const host = await connect();
    host.send({ type: "hello", protocolVersion: PROTOCOL_VERSION, token: "tok-host", role: "host", tableId: table.tableId, displayName: "", lastVersion: null });
    expect((await host.next()).type).toBe("welcome");

    const first = await connect();
    first.send(playerHello(table.tableId));
    expect((await first.next()).type).toBe("welcome");
    // The host sees the seat connect once.
    const connectedFrame = await host.next();
    expect(connectedFrame.type === "projection" && connectedFrame.projection.seats.find((seat) => seat.seat === "south")?.connected).toBe(true);
    const version = table.currentVersion;

    const second = await connect();
    second.send(playerHello(table.tableId));
    const replaced = await first.next();
    expect(replaced).toEqual({ type: "error", code: "role-unavailable", detail: "replaced by a newer connection" });
    expect(await first.closed).toBe(1008);
    const welcome = await second.next();
    expect(welcome.type === "welcome" && welcome.role === "player" && welcome.seat).toBe("south");

    // The replaced socket's close retired nothing: presence stayed with the new socket and no flap reached the host.
    await new Promise((resolve) => setTimeout(resolve, 200));
    const binding = table.seatBinding("south");
    expect(binding.occupant === "human" && binding.connected).toBe(true);
    expect(table.currentVersion).toBe(version);
    expect(server.connectionCount()).toBe(2);

    second.send({ type: "intent", tableId: table.tableId, intentId: "binding-1", expectedVersion: table.currentVersion, intent: { kind: "preview", selection: { type: "pass" } } });
    expect(await second.next()).toMatchObject({ type: "receipt", receipt: { intentId: "binding-1", outcome: "accepted" } });
    second.socket.close();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const after = table.seatBinding("south");
    expect(after.occupant === "human" && after.connected).toBe(false);
    host.socket.close();
  });

  it("rejects a second hello on an already bound socket and policy-closes it without ghost presence", async () => {
    const client = await connect();
    client.send(playerHello(table.tableId));
    expect((await client.next()).type).toBe("welcome");
    const binding = table.seatBinding("south");
    expect(binding.occupant === "human" && binding.connected).toBe(true);

    client.send(playerHello(table.tableId));
    const refused = await client.next();
    expect(refused).toEqual({ type: "error", code: "role-unavailable", detail: "connection already bound" });
    expect(await client.closed).toBe(1008);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const after = table.seatBinding("south");
    expect(after.occupant === "human" && after.connected).toBe(false);
    expect(sessions.connectionCount()).toBe(0);
    expect(server.connectionCount()).toBe(0);
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-FINAL-001 | END]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
