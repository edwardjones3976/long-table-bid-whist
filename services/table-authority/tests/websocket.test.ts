// @vitest-environment node
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * End-to-end over a real loopback WebSocket: the dependency-free server, the
 * wire dispatcher, the sessions and the table, driven by Node's built-in
 * WebSocket client.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as net from "node:net";

import { PROTOCOL_VERSION, decodeAuthorityMessage, encodeClientMessage, type AuthorityMessage, type ClientMessage } from "../../../packages/protocol/src";
import { AuthoritySessions, staticDirectory } from "../src/session";
import { FrameParser, acceptKeyFor, encodeFrame, startAuthorityServer, type RunningServer } from "../src/websocket-server";
import { handleClose, handleText } from "../src/wire";
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
import { PARTICIPANTS, createTable, driveHand, grantFor, nextIntentId } from "./support";
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]

function maskedFrame(opcode: number, payload: Buffer, fin = true): Buffer {
  const mask = Buffer.from([1, 2, 3, 4]);
  const header = Buffer.from([(fin ? 0x80 : 0) | opcode, 0x80 | payload.length]);
  const body = Buffer.alloc(payload.length);
  for (let index = 0; index < payload.length; index += 1) body[index] = payload[index] ^ mask[index % 4];
  return Buffer.concat([header, mask, body]);
}

// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
/** A masked client text frame of any length (7-bit, 16-bit or 63-bit encoding). */
function maskedTextFrame(text: string): Buffer {
  const payload = Buffer.from(text, "utf8");
  const mask = Buffer.from([5, 6, 7, 8]);
  let header: Buffer;
  if (payload.length < 126) {
    header = Buffer.from([0x81, 0x80 | payload.length]);
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(payload.length, 6);
  }
  const body = Buffer.alloc(payload.length);
  for (let index = 0; index < payload.length; index += 1) body[index] = payload[index] ^ mask[index % 4];
  return Buffer.concat([header, mask, body]);
}

/** `net.connect`, typed against the repository's minimal Node shim. */
const netConnect = (net as unknown as { connect(port: number, host: string, onConnect?: () => void): net.Socket }).connect;

/** Index of the CRLFCRLF that ends the HTTP response head, or -1. */
function headerEndIndex(bytes: Buffer): number {
  for (let index = 0; index + 3 < bytes.length; index += 1) {
    if (bytes[index] === 13 && bytes[index + 1] === 10 && bytes[index + 2] === 13 && bytes[index + 3] === 10) return index;
  }
  return -1;
}

/** Parses the server's unmasked frames out of the bytes following the 101 response. */
function parseServerFrames(bytes: Buffer): { opcode: number; payload: Buffer }[] {
  const frames: { opcode: number; payload: Buffer }[] = [];
  let offset = 0;
  while (offset + 2 <= bytes.length) {
    const opcode = bytes[offset] & 0x0f;
    let length = bytes[offset + 1] & 0x7f;
    let headerEnd = offset + 2;
    if (length === 126) {
      length = bytes.readUInt16BE(offset + 2);
      headerEnd = offset + 4;
    } else if (length === 127) {
      length = bytes.readUInt32BE(offset + 6);
      headerEnd = offset + 10;
    }
    if (headerEnd + length > bytes.length) break;
    frames.push({ opcode, payload: bytes.subarray(headerEnd, headerEnd + length) });
    offset = headerEnd + length;
  }
  return frames;
}
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

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

    // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
    // v2 identity: the welcomed grant plus the exact next counter.
    expect(welcome.sessionId).toBe(table.laneGrant("south"));
    expect(welcome.nextIntentCounter).toBe(1);
    const previewId = `${welcome.sessionId}:${welcome.nextIntentCounter}`;
    player.send({ type: "intent", tableId: table.tableId, intentId: previewId, expectedVersion: welcome.version, intent: { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } } });
    const receipt = await player.next();
    expect(receipt).toMatchObject({ type: "receipt", receipt: { intentId: previewId, outcome: "accepted", committed: false, version: welcome.version } });
    const projection = await player.next();
    expect(projection.type === "projection" && projection.version).toBe(welcome.version);
    expect(projection.type === "projection" && projection.projection.role === "player" && projection.projection.previewLabel).toBe("3 High");

    player.send({ type: "intent", tableId: table.tableId, intentId: previewId, expectedVersion: welcome.version, intent: { kind: "confirm" } });
    const duplicate = await player.next();
    expect(duplicate).toMatchObject({ type: "receipt", receipt: { outcome: "duplicate", committed: false } });

    player.send({ type: "intent", tableId: table.tableId, intentId: `${welcome.sessionId}:2`, expectedVersion: welcome.version, intent: { kind: "confirm" } });
    // [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
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
    const substituteId = nextIntentId(table, "host");
    host.send({ type: "intent", tableId: table.tableId, intentId: substituteId, expectedVersion: table.currentVersion, intent: { kind: "host-substitute", seat: "south" } });
    const hostReceipt = await host.next();
    expect(hostReceipt).toMatchObject({ type: "receipt", receipt: { intentId: substituteId, outcome: "accepted" } });

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

    const bindingId = nextIntentId(table, "south");
    second.send({ type: "intent", tableId: table.tableId, intentId: bindingId, expectedVersion: table.currentVersion, intent: { kind: "preview", selection: { type: "pass" } } });
    expect(await second.next()).toMatchObject({ type: "receipt", receipt: { intentId: bindingId, outcome: "accepted" } });
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

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
/** The next non-cue authority message; every skipped message must be a dealer cue. */
async function nextSkippingCues(client: Client): Promise<AuthorityMessage> {
  for (;;) {
    const message = await client.next();
    if (message.type !== "dealer-cue") return message;
  }
}

describe("dropped-receipt replay over a loopback WebSocket", () => {
  it("applies a preview and a confirm exactly once each when their receipts are lost and the frames resent, then advances", async () => {
    const table = createTable({ seed: "socket-replay", humans: ["south"], incarnationId: "socket-replay" });
    const sessions = new AuthoritySessions({
      directory: staticDirectory({
        "tok-south": { participantId: PARTICIPANTS.south, kind: "participant" },
        "tok-host": { participantId: PARTICIPANTS.host, kind: "participant" },
      }),
      tables: new Map([[table.tableId, table]]),
    });
    const server = await startAuthorityServer({
      handlers: {
        onText: (id, text) => handleText(sessions, id, text),
        onClose: (id) => handleClose(sessions, id),
      },
    });
    try {
      const player = await connectTo(server.url);
      const host = await connectTo(server.url);
      player.send(playerHello(table.tableId));
      const welcome = await player.next();
      if (welcome.type !== "welcome" || welcome.role !== "player") throw new Error("expected a player welcome");
      host.send({ type: "hello", protocolVersion: PROTOCOL_VERSION, token: "tok-host", role: "host", tableId: table.tableId, displayName: "", lastVersion: null });
      expect((await host.next()).type).toBe("welcome");
      expect(welcome.sessionId).toBe(grantFor("socket-replay", 1));
      expect(welcome.nextIntentCounter).toBe(1);

      // Preview: applied once. Its receipt is "lost" and the identical frame is resent.
      const previewId = `${welcome.sessionId}:1`;
      const previewFrame: ClientMessage = {
        type: "intent",
        tableId: table.tableId,
        intentId: previewId,
        expectedVersion: welcome.version,
        intent: { kind: "preview", selection: { type: "bid", bid: { level: 3, mode: "high" } } },
      };
      player.send(previewFrame);
      expect(await player.next()).toMatchObject({ type: "receipt", receipt: { intentId: previewId, outcome: "accepted", committed: false, version: welcome.version } });
      const previewed = await player.next();
      expect(previewed.type === "projection" && previewed.projection.role === "player" && previewed.projection.previewLabel).toBe("3 High");
      const revision = table.seatRevision("south");
      const projectionText = JSON.stringify(table.snapshot("player", "south", PARTICIPANTS.south));

      player.send(previewFrame);
      expect(await player.next()).toMatchObject({ type: "receipt", receipt: { intentId: previewId, outcome: "duplicate", code: "duplicate-input-id", committed: false } });
      expect(table.seatRevision("south")).toBe(revision);
      expect(JSON.stringify(table.snapshot("player", "south", PARTICIPANTS.south))).toBe(projectionText);
      expect(table.intentLaneState("south").highestConsumedCounter).toBe(1);

      // Confirm: committed once. Its receipt is "lost" too. The very next frame
      // the player receives is the confirm receipt, so the duplicate preview
      // emitted no projection.
      const confirmId = `${welcome.sessionId}:2`;
      const confirmFrame: ClientMessage = { type: "intent", tableId: table.tableId, intentId: confirmId, expectedVersion: welcome.version, intent: { kind: "confirm" } };
      player.send(confirmFrame);
      expect(await player.next()).toMatchObject({ type: "receipt", receipt: { intentId: confirmId, outcome: "accepted", committed: true, version: welcome.version + 1 } });
      const committed = await player.next();
      expect(committed.type === "projection" && committed.version).toBe(welcome.version + 1);
      const hostFrame = await host.next();
      expect(hostFrame.type === "projection" && hostFrame.projection.role === "host" && hostFrame.version).toBe(welcome.version + 1);
      const version = table.currentVersion;
      const replay = JSON.stringify(table.exportReplay());
      const digest = JSON.stringify(table.committedState());

      player.send(confirmFrame);
      expect(await nextSkippingCues(player)).toMatchObject({ type: "receipt", receipt: { intentId: confirmId, outcome: "duplicate", committed: false } });
      expect(table.currentVersion).toBe(version);
      expect(JSON.stringify(table.exportReplay())).toBe(replay);
      expect(JSON.stringify(table.committedState())).toBe(digest);
      expect(table.intentLaneState("south").highestConsumedCounter).toBe(2);

      // Then the lane advances: a forward gap is refused without consumption,
      // and the exact next counter applies once.
      player.send({ type: "intent", tableId: table.tableId, intentId: `${welcome.sessionId}:4`, expectedVersion: table.currentVersion, intent: { kind: "cancel" } });
      expect(await nextSkippingCues(player)).toEqual({ type: "error", code: "intent-identity", detail: "intent identity is not the lane's current grant and exact next counter" });
      expect(table.intentLaneState("south").highestConsumedCounter).toBe(2);
      const cancelId = `${welcome.sessionId}:3`;
      player.send({ type: "intent", tableId: table.tableId, intentId: cancelId, expectedVersion: table.currentVersion, intent: { kind: "cancel" } });
      expect(await nextSkippingCues(player)).toMatchObject({ type: "receipt", receipt: { intentId: cancelId, outcome: "accepted", committed: false } });
      expect((await nextSkippingCues(player)).type).toBe("projection");
      expect(table.intentLaneState("south").highestConsumedCounter).toBe(3);
      expect(table.currentVersion).toBe(version);
      player.socket.close();
      host.socket.close();
    } finally {
      await server.close();
    }
  });
});
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]

// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
describe("terminal dispatch within one coalesced write", () => {
  it("stops the parsed-frame loop at the policy close: one welcome, one policy error and close, then transport/session/presence 0/0/false", async () => {
    const table = createTable({ seed: "socket-coalesced", humans: ["south"] });
    const sessions = new AuthoritySessions({
      directory: staticDirectory({ "tok-south": { participantId: PARTICIPANTS.south, kind: "participant" } }),
      tables: new Map([[table.tableId, table]]),
    });
    const server = await startAuthorityServer({
      handlers: {
        onText: (id, text) => handleText(sessions, id, text),
        onClose: (id) => handleClose(sessions, id),
      },
    });
    try {
      const hello = encodeClientMessage(playerHello(table.tableId));
      const upgrade = [
        "GET / HTTP/1.1",
        `Host: 127.0.0.1:${server.port}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==",
        "Sec-WebSocket-Version: 13",
        "\r\n",
      ].join("\r\n");
      // One TCP write carrying the upgrade plus three masked hellos. The first
      // hello binds and is welcomed; the second is refused and policy-closed;
      // the third must never be dispatched — were it processed after the
      // finish, it would bind a fresh session and resurrect the seat presence.
      const oneWrite = Buffer.concat([
        Buffer.from(upgrade, "utf8"),
        maskedTextFrame(hello),
        maskedTextFrame(hello),
        maskedTextFrame(hello),
      ]);

      const received: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        const socket = netConnect(server.port, server.host, () => {
          socket.write(oneWrite);
        });
        const timer = setTimeout(() => reject(new Error("coalesced probe timed out")), 5000);
        socket.on("data", (chunk: Buffer) => received.push(chunk));
        socket.on("error", (error: Error) => reject(error));
        socket.on("close", () => {
          clearTimeout(timer);
          resolve();
        });
      });

      const bytes = Buffer.concat(received);
      const headerEnd = headerEndIndex(bytes);
      expect(headerEnd).toBeGreaterThan(0);
      expect(bytes.subarray(0, headerEnd).toString("utf8")).toContain("101 Switching Protocols");
      const frames = parseServerFrames(bytes.subarray(headerEnd + 4));

      // Exactly one welcome, one policy error, one 1008 close — and nothing after.
      const texts = frames.filter((frame) => frame.opcode === 0x1).map((frame) => frame.payload.toString("utf8"));
      expect(texts).toHaveLength(2);
      const first = decodeAuthorityMessage(texts[0]);
      expect(first.ok && first.value.type).toBe("welcome");
      const second = decodeAuthorityMessage(texts[1]);
      expect(second.ok && second.value).toEqual({ type: "error", code: "role-unavailable", detail: "connection already bound" });
      const closes = frames.filter((frame) => frame.opcode === 0x8);
      expect(closes).toHaveLength(1);
      expect(closes[0].payload.readUInt16BE(0)).toBe(1008);

      // Final state after the policy close: no transport connection, no bound
      // session, and the seat's presence retired — never resurrected by the
      // third hello.
      expect(server.connectionCount()).toBe(0);
      expect(sessions.connectionCount()).toBe(0);
      const binding = table.seatBinding("south");
      expect(binding.occupant === "human" && binding.connected).toBe(false);
    } finally {
      await server.close();
    }
  });
});
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
