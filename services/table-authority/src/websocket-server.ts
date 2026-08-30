// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Dependency-free RFC 6455 server on `node:http`.
 *
 * The locked dependency set has no WebSocket server package and this packet
 * may not add one, so the handshake and framing are implemented here: text
 * frames only, client masking required, ping answered with pong, close echoed,
 * fragmented messages reassembled, and a 1 MiB message ceiling. TLS
 * termination and internet exposure are deployment concerns outside this
 * assignment; the server binds loopback by default.
 */
import { createHash, randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { Socket } from "node:net";

const HANDSHAKE_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const MAX_MESSAGE_BYTES = 1024 * 1024;

const OPCODE_CONTINUATION = 0x0;
const OPCODE_TEXT = 0x1;
const OPCODE_BINARY = 0x2;
const OPCODE_CLOSE = 0x8;
const OPCODE_PING = 0x9;
const OPCODE_PONG = 0xa;

export interface SocketHandlers {
  onText(connectionId: string, text: string): OutboundFrame[];
  onClose(connectionId: string): OutboundFrame[];
}

export interface OutboundFrame {
  readonly connectionId: string;
  readonly text: string;
}

export interface ServerOptions {
  readonly host?: string;
  readonly port?: number;
  readonly handlers: SocketHandlers;
  readonly log?: (line: string) => void;
}

export interface RunningServer {
  readonly host: string;
  readonly port: number;
  readonly url: string;
  connectionCount(): number;
  close(): Promise<void>;
}

export function encodeFrame(opcode: number, payload: Buffer): Buffer {
  const length = payload.length;
  let header: Buffer;
  if (length < 126) {
    header = Buffer.from([0x80 | opcode, length]);
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(length, 6);
  }
  return Buffer.concat([header, payload]);
}

export function encodeTextFrame(text: string): Buffer {
  return encodeFrame(OPCODE_TEXT, Buffer.from(text, "utf8"));
}

export function encodeCloseFrame(code: number): Buffer {
  const payload = Buffer.alloc(2);
  payload.writeUInt16BE(code, 0);
  return encodeFrame(OPCODE_CLOSE, payload);
}

export interface ParsedFrame {
  readonly opcode: number;
  readonly payload: Buffer;
}

export type ParseFailure = "unmasked-client-frame" | "message-too-large" | "unknown-opcode";

/** Incremental frame parser for one connection. */
export class FrameParser {
  private buffer: Buffer = Buffer.alloc(0);
  private fragments: Buffer[] = [];
  private fragmentOpcode = 0;
  private fragmentBytes = 0;

  /** Appends bytes and returns every complete message, or a failure. */
  push(chunk: Buffer): { frames: ParsedFrame[]; failure: ParseFailure | null } {
    this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);
    const frames: ParsedFrame[] = [];
    for (;;) {
      if (this.buffer.length < 2) break;
      const first = this.buffer[0];
      const second = this.buffer[1];
      const fin = (first & 0x80) !== 0;
      const opcode = first & 0x0f;
      const masked = (second & 0x80) !== 0;
      let length = second & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (this.buffer.length < 4) break;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (this.buffer.length < 10) break;
        const high = this.buffer.readUInt32BE(2);
        const low = this.buffer.readUInt32BE(6);
        if (high !== 0) return { frames, failure: "message-too-large" };
        length = low;
        offset = 10;
      }
      if (!masked) return { frames, failure: "unmasked-client-frame" };
      if (length > MAX_MESSAGE_BYTES) return { frames, failure: "message-too-large" };
      if (this.buffer.length < offset + 4 + length) break;
      const mask = this.buffer.subarray(offset, offset + 4);
      offset += 4;
      const payload = Buffer.alloc(length);
      for (let index = 0; index < length; index += 1) {
        payload[index] = this.buffer[offset + index] ^ mask[index % 4];
      }
      this.buffer = this.buffer.subarray(offset + length);

      if (opcode === OPCODE_CONTINUATION) {
        this.fragments.push(payload);
        this.fragmentBytes += payload.length;
        if (this.fragmentBytes > MAX_MESSAGE_BYTES) return { frames, failure: "message-too-large" };
        if (fin) {
          frames.push({ opcode: this.fragmentOpcode, payload: Buffer.concat(this.fragments) });
          this.fragments = [];
          this.fragmentBytes = 0;
        }
      } else if (opcode === OPCODE_TEXT || opcode === OPCODE_BINARY) {
        if (fin) frames.push({ opcode, payload });
        else {
          this.fragmentOpcode = opcode;
          this.fragments = [payload];
          this.fragmentBytes = payload.length;
        }
      } else if (opcode === OPCODE_CLOSE || opcode === OPCODE_PING || opcode === OPCODE_PONG) {
        frames.push({ opcode, payload });
      } else {
        return { frames, failure: "unknown-opcode" };
      }
    }
    return { frames, failure: null };
  }
}

export function acceptKeyFor(clientKey: string): string {
  return createHash("sha1").update(clientKey + HANDSHAKE_GUID).digest("base64");
}

function headerValue(request: IncomingMessage, name: string): string | null {
  const value = request.headers[name];
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return null;
}

export function startAuthorityServer(options: ServerOptions): Promise<RunningServer> {
  const host = options.host ?? "127.0.0.1";
  const log = options.log ?? (() => undefined);
  const sockets = new Map<string, Socket>();

  const server: Server = createServer((_request, response) => {
    response.writeHead(426, { "Content-Type": "text/plain" });
    response.end("The Long Table authority speaks WebSocket only.");
  });

  const deliver = (frames: readonly OutboundFrame[]) => {
    for (const frame of frames) {
      const target = sockets.get(frame.connectionId);
      if (target && !target.destroyed) target.write(encodeTextFrame(frame.text));
    }
  };

  server.on("upgrade", (request: IncomingMessage, socket: Socket, head: Buffer) => {
    const upgrade = headerValue(request, "upgrade");
    const key = headerValue(request, "sec-websocket-key");
    if (!upgrade || upgrade.toLowerCase() !== "websocket" || !key) {
      socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    socket.setNoDelay(true);
    socket.write(
      [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${acceptKeyFor(key)}`,
        "\r\n",
      ].join("\r\n"),
    );

    const connectionId = randomBytes(8).toString("hex");
    sockets.set(connectionId, socket);
    const parser = new FrameParser();
    let closed = false;

    const finish = () => {
      if (closed) return;
      closed = true;
      sockets.delete(connectionId);
      deliver(options.handlers.onClose(connectionId));
      if (!socket.destroyed) socket.end();
    };

    const consume = (chunk: Buffer) => {
      const { frames, failure } = parser.push(chunk);
      for (const frame of frames) {
        if (frame.opcode === OPCODE_TEXT) {
          deliver(options.handlers.onText(connectionId, frame.payload.toString("utf8")));
        } else if (frame.opcode === OPCODE_PING) {
          socket.write(encodeFrame(OPCODE_PONG, frame.payload));
        } else if (frame.opcode === OPCODE_CLOSE) {
          socket.write(encodeCloseFrame(1000));
          finish();
          return;
        }
        // Binary frames and pongs carry nothing the authority accepts.
      }
      if (failure) {
        log(`connection ${connectionId} closed: ${failure}`);
        socket.write(encodeCloseFrame(failure === "message-too-large" ? 1009 : 1002));
        finish();
      }
    };

    if (head.length > 0) consume(head);
    socket.on("data", consume);
    socket.on("close", finish);
    socket.on("error", finish);
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(options.port ?? 0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : (options.port ?? 0);
      log(`authority listening on ws://${host}:${port}`);
      resolve({
        host,
        port,
        url: `ws://${host}:${port}`,
        connectionCount: () => sockets.size,
        close: () =>
          new Promise<void>((done) => {
            for (const socket of sockets.values()) socket.destroy();
            sockets.clear();
            server.close(() => done());
          }),
      });
    });
  });
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
