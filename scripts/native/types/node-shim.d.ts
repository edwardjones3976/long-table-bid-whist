// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Minimal ambient declarations for the Node built-ins the native scripts and
 * the table authority use. The repository's locked dependency set has no
 * `@types/node`, and this packet may not change `package.json`; these
 * declarations cover exactly the surface that is exercised and nothing more.
 */

declare class Buffer extends Uint8Array {
  static alloc(size: number): Buffer;
  static concat(list: readonly Uint8Array[]): Buffer;
  static from(data: string, encoding?: "utf8" | "base64" | "hex"): Buffer;
  static from(data: ArrayBuffer | Uint8Array | readonly number[]): Buffer;
  static byteLength(text: string): number;
  toString(encoding?: "utf8" | "base64" | "hex", start?: number, end?: number): string;
  readUInt16BE(offset: number): number;
  readUInt32BE(offset: number): number;
  writeUInt16BE(value: number, offset: number): number;
  writeUInt32BE(value: number, offset: number): number;
  subarray(start?: number, end?: number): Buffer;
}

interface NodeProcess {
  argv: string[];
  env: Record<string, string | undefined>;
  exitCode: number | undefined;
  platform: string;
  cwd(): string;
  exit(code?: number): never;
  on(event: "SIGINT" | "SIGTERM", listener: () => void): NodeProcess;
  stdout: { write(text: string): boolean };
  stderr: { write(text: string): boolean };
}

declare const process: NodeProcess;

declare module "node:events" {
  export class EventEmitter {
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
    removeAllListeners(event?: string): this;
  }
}

declare module "node:net" {
  import { EventEmitter } from "node:events";
  export class Socket extends EventEmitter {
    write(data: Uint8Array | string, callback?: (error?: Error) => void): boolean;
    end(): this;
    destroy(error?: Error): this;
    setNoDelay(noDelay?: boolean): this;
    readonly destroyed: boolean;
    readonly remoteAddress?: string;
  }
}

declare module "node:http" {
  import { EventEmitter } from "node:events";
  import { Socket } from "node:net";
  export interface IncomingMessage {
    method?: string;
    url?: string;
    headers: Record<string, string | string[] | undefined>;
  }
  export interface ServerResponse {
    writeHead(statusCode: number, headers?: Record<string, string>): this;
    end(data?: string): this;
  }
  export interface AddressInfo {
    address: string;
    family: string;
    port: number;
  }
  export class Server extends EventEmitter {
    listen(port: number, host: string, listeningListener?: () => void): this;
    close(callback?: (error?: Error) => void): this;
    address(): AddressInfo | string | null;
    on(event: "upgrade", listener: (request: IncomingMessage, socket: Socket, head: Buffer) => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
  }
  export function createServer(
    requestListener?: (request: IncomingMessage, response: ServerResponse) => void,
  ): Server;
}

declare module "node:crypto" {
  export interface Hash {
    update(data: string | Uint8Array): Hash;
    digest(encoding: "base64" | "hex"): string;
  }
  export function createHash(algorithm: "sha1" | "sha256"): Hash;
  export function randomBytes(size: number): Buffer;
}

declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function writeFileSync(path: string, data: string, encoding?: "utf8"): void;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function existsSync(path: string): boolean;
  export function readdirSync(path: string): string[];
}

declare module "node:path" {
  export function join(...segments: string[]): string;
  export function resolve(...segments: string[]): string;
  export function dirname(path: string): string;
  export function basename(path: string, suffix?: string): string;
  export function relative(from: string, to: string): string;
  export const sep: string;
}

declare module "node:url" {
  export function fileURLToPath(url: string | URL): string;
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
