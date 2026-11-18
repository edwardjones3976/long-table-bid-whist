// @vitest-environment node
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { GAMES } from "../../server/games/index";
import { createGameServer, type GameServer } from "../../server/index";

interface Snap {
  matchId: string;
  game: string;
  revision: number;
  started: boolean;
  you: number | null;
  seats: string[];
  host: boolean;
  view: any;
}

interface Client {
  socket: Socket;
  snaps: Snap[];
}

let server: GameServer;
let clients: Client[] = [];
let nextId = 0;

async function client(): Promise<Client> {
  if (!server) {
    server = createGameServer();
    await new Promise<void>((resolve) => server.http.listen(0, resolve));
  }
  const { port } = server.http.address() as AddressInfo;
  const socket = connect(`http://localhost:${port}`, { transports: ["websocket"], forceNew: true });
  const made: Client = { socket, snaps: [] };
  socket.on("snapshot", (snap: Snap) => made.snaps.push(snap));
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  clients.push(made);
  return made;
}

afterEach(async () => {
  clients.forEach((c) => c.socket.close());
  clients = [];
  await server?.io.close();
  server = undefined as unknown as GameServer;
});

const send = (c: Client, event: string, payload: unknown): Promise<any> => c.socket.emitWithAck(event, payload);
const last = (c: Client): Snap => c.snaps[c.snaps.length - 1];

async function until(condition: () => boolean): Promise<void> {
  for (let i = 0; i < 5000; i += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error("Timed out waiting for the table");
}

const serverRevision = (matchId: string) => server.matches.get(matchId)!.match.revision;
const settled = (all: Client[], matchId: string) =>
  until(() => all.every((c) => last(c)?.revision === serverRevision(matchId)));

/** A table with `humans` seated players and, optionally, a host; not yet started. */
async function table(humans: number, withHost = false, game = "bid-whist") {
  const players: Client[] = [];
  for (let i = 0; i < humans; i += 1) players.push(await client());
  const { matchId } = await send(players[0], "create", { game });
  for (const player of players) expect(await send(player, "join", { matchId })).toMatchObject({ ok: true });
  const host = withHost ? await client() : null;
  if (host) expect(await send(host, "join", { matchId, role: "host" })).toEqual({ ok: true, seat: null });
  const all = host ? [...players, host] : players;
  return { matchId, players, host, all };
}

const act = (c: Client, matchId: string, action: unknown, expectedRevision = last(c).revision) =>
  send(c, "action", { matchId, actionId: `t${(nextId += 1)}`, expectedRevision, action });

function choose(view: any): unknown {
  if (view.phase === "auction") {
    return { type: "bid", bid: view.legal.mustBid || view.auction.length === 0 ? view.legal.bids[0] : null };
  }
  if (view.phase === "declare") {
    return view.contract.noTrump ? { type: "declare", direction: "high" } : { type: "declare", trump: "spades" };
  }
  if (view.phase === "kitty") return { type: "discard", cardIds: view.hand.slice(0, 6).map((c: any) => c.id) };
  return { type: "play", cardId: view.legal.cardIds[0] };
}

/** Humans act from what their own snapshot tells them, until the game is over. */
async function playGame(matchId: string, players: Client[], all: Client[], game = "bid-whist"): Promise<void> {
  for (let guard = 0; guard < 20000; guard += 1) {
    const view = last(players[0]).view;
    if (view.phase === "game-over") return;
    const actor = view.phase === "hand-over" ? players[0] : players.find((p) => last(p).view.legal)!;
    const action = view.phase === "hand-over" ? { type: "next-hand" } : GAMES[game].chooseAction(last(actor).view);
    expect(await act(actor, matchId, action)).toMatchObject({ ok: true });
    await settled(all, matchId);
  }
  throw new Error("Game did not finish");
}

const CARD = /"((?:clubs|diamonds|hearts|spades)-\d+|joker-(?:little|big))"/g;
const cardIds = (value: unknown): string[] => [...JSON.stringify(value ?? null).matchAll(CARD)].map((m) => m[1]);

/** Checks every snapshot every client ever received. */
function expectNothingLeaked(all: Client[]): void {
  const heldAt = new Map<number, Set<string>>();
  let checked = 0;
  for (const c of all) {
    for (const snap of c.snaps) {
      if (!snap.view) continue;
      checked += 1;
      const { hand, trick, lastTrick, legal, ...rest } = snap.view;
      // Card faces appear only in the viewer's hand and in cards played face up.
      expect(cardIds(rest)).toEqual([]);
      if (snap.you === null) {
        expect(hand).toBeNull();
        expect(legal).toBeNull();
        continue;
      }
      const mine = cardIds(hand);
      expect(mine).toHaveLength(rest.handCounts[snap.you]);
      expect(cardIds(legal).every((id) => mine.includes(id))).toBe(true);
      // No two seats may hold the same card at the same revision.
      const held = heldAt.get(snap.revision) ?? new Set<string>();
      heldAt.set(snap.revision, held);
      for (const id of [...mine, ...cardIds(trick)]) {
        if (mine.includes(id)) {
          expect(held.has(id)).toBe(false);
          held.add(id);
        }
      }
    }
  }
  expect(checked).toBeGreaterThan(0);
}

/** For any game: while a hand is live, nobody's snapshot contains a card from someone else's hand. */
function expectHandsPrivate(all: Client[]): void {
  const byRevision = new Map<number, Snap[]>();
  for (const c of all) {
    for (const snap of c.snaps) {
      if (!snap.view || snap.view.phase === "hand-over" || snap.view.phase === "game-over") continue;
      byRevision.set(snap.revision, [...(byRevision.get(snap.revision) ?? []), snap]);
    }
  }
  let compared = 0;
  for (const snaps of byRevision.values()) {
    for (const owner of snaps) {
      if (owner.you === null) {
        expect(owner.view.hand).toBeNull();
        expect(owner.view.legal).toBeNull();
        continue;
      }
      const held = new Set(cardIds(owner.view.hand));
      for (const other of snaps) {
        if (other === owner) continue;
        expect(cardIds(other).filter((id) => held.has(id))).toEqual([]);
        compared += 1;
      }
    }
  }
  expect(compared).toBeGreaterThan(0);
}

describe("joining", () => {
  it("seats four players and a host and turns everyone else away", async () => {
    const { matchId, players, host, all } = await table(4, true);
    const extra = await client();
    expect(await send(extra, "join", { matchId })).toMatchObject({ ok: false, error: "match-full" });
    expect(await send(extra, "join", { matchId, role: "host" })).toMatchObject({ ok: false, error: "host-taken" });
    expect(await send(extra, "join", { matchId: "nope" })).toMatchObject({ ok: false, error: "no-such-match" });
    expect(await send(extra, "start", { matchId })).toMatchObject({ ok: false, error: "not-a-member" });
    expect(await send(players[0], "join", { matchId })).toMatchObject({ ok: false, error: "already-joined" });

    expect(await send(host!, "start", { matchId })).toEqual({ ok: true });
    await settled(all, matchId);
    expect(players.map((p) => last(p).you)).toEqual([0, 1, 2, 3]);
    for (const p of players) expect(last(p).view.hand).toHaveLength(12);
    expect(last(host!)).toMatchObject({ you: null, host: true, seats: ["human", "human", "human", "human"] });
    expect(last(host!).view.hand).toBeNull();
    expect(await send(extra, "join", { matchId })).toMatchObject({ ok: false, error: "already-started" });
    expect(await send(host!, "start", { matchId })).toMatchObject({ ok: false, error: "illegal" });
  });

  it("rejects invalid house rules and a start with nobody seated", async () => {
    const c = await client();
    expect(await send(c, "create", { game: "poker" })).toMatchObject({ ok: false, error: "no-such-game" });
    expect(await send(c, "create", { game: "toString" })).toMatchObject({ ok: false, error: "no-such-game" });
    expect(await send(c, "create", { options: { minBid: 9 } })).toMatchObject({ ok: false, error: "illegal" });
    const { matchId } = await send(c, "create", {});
    expect(await send(c, "join", { matchId, role: "host" })).toMatchObject({ ok: true });
    expect(await send(c, "start", { matchId })).toMatchObject({ ok: false, error: "no-players" });
  });
});

describe("table lifetime", () => {
  it("drops a table nobody joined when its creator leaves", async () => {
    const creator = await client();
    await send(creator, "create", {});
    await send(creator, "create", {});
    expect(server.matches.size).toBe(2);
    creator.socket.close();
    await until(() => server.matches.size === 0);
  });

  it("keeps a lobby open for the host when the only player drops before the start", async () => {
    const { matchId, players, host } = await table(1, true);
    players[0].socket.close();
    await until(() => last(host!).seats[0] === "open");
    expect(server.matches.has(matchId)).toBe(true);
    const late = await client();
    expect(await send(late, "join", { matchId })).toEqual({ ok: true, seat: 0 });
  });

  it("tells the host when a started match ends because its last player left", async () => {
    const { matchId, players, host, all } = await table(1, true);
    await send(players[0], "start", { matchId });
    await settled(all, matchId);
    const closed = new Promise((resolve) => host!.socket.once("closed", resolve));
    players[0].socket.close();
    expect(await closed).toEqual({ matchId });
    expect(server.matches.has(matchId)).toBe(false);
  });

  it("answers an event sent with no payload or with extra arguments", async () => {
    const c = await client();
    const reply = (...args: unknown[]) =>
      new Promise((resolve) => c.socket.emit("create", ...args, resolve));
    expect(await reply()).toMatchObject({ ok: true });
    expect(await reply({}, "extra")).toMatchObject({ ok: true });
    expect(await reply("text")).toMatchObject({ ok: true });
  });
});

describe("actions", () => {
  it("applies a repeat once and rejects reused ids, stale revisions and out-of-turn play", async () => {
    const { matchId, players, host, all } = await table(4, true);
    await send(players[0], "start", { matchId });
    await settled(all, matchId);
    const outsider = await client();
    const start = serverRevision(matchId);
    const replies: unknown[] = [];
    const keep = <T>(reply: T): T => (replies.push(reply), reply);

    // Seat 1 opens. The same request sent twice lands once.
    const request = { matchId, actionId: "open", expectedRevision: start, action: choose(last(players[1]).view) };
    const [first, second] = await Promise.all([send(players[1], "action", request), send(players[1], "action", request)]);
    expect(keep(first)).toEqual({ ok: true, revision: start + 1 });
    expect(keep(second)).toEqual({ ok: true, revision: start + 1, duplicate: true });
    expect(serverRevision(matchId)).toBe(start + 1);
    await settled(all, matchId);
    expect(last(players[0]).view.auction).toHaveLength(1);

    const pass = { type: "bid", bid: null };
    const rejected = [
      [await send(players[1], "action", { ...request, action: pass }), "action-id-reused"],
      [await act(players[2], matchId, pass, start), "stale-revision"],
      [await act(players[0], matchId, pass), "illegal"],
      [await act(players[2], matchId, { type: "play", cardId: last(players[2]).view.hand[0].id }), "illegal"],
      [await send(players[2], "action", { matchId, actionId: "", expectedRevision: start + 1, action: pass }), "bad-request"],
      [await send(players[2], "action", { matchId, actionId: "x", expectedRevision: "1", action: pass }), "bad-request"],
      [await send(players[2], "action", null), "not-a-member"],
      [await act(players[2], matchId, { type: "bid", bid: null, pad: "x".repeat(3000) }), "bad-request"],
      [await act(host!, matchId, pass), "not-a-player"],
      [await send(outsider, "action", { matchId, actionId: "x", expectedRevision: start + 1, action: pass }), "not-a-member"],
    ] as const;
    for (const [reply, error] of rejected) expect(keep(reply)).toMatchObject({ ok: false, error });
    expect(serverRevision(matchId)).toBe(start + 1);

    // Two seats act on the same revision at once: only the seat on turn gets through.
    const race = await Promise.all([act(players[3], matchId, pass), act(players[2], matchId, pass)]);
    race.forEach(keep);
    expect(race.map((r) => r.ok)).toEqual([false, true]);
    expect(serverRevision(matchId)).toBe(start + 2);

    expect(cardIds(replies)).toEqual([]);
    await settled(all, matchId);
    expectNothingLeaked(all);
  });
});

describe("full games", () => {
  it("plays four humans and a watching host to a winner with nothing leaked", async () => {
    const { matchId, players, host, all } = await table(4, true);
    await send(players[0], "start", { matchId });
    await settled(all, matchId);
    await playGame(matchId, players, all);
    for (const c of all) {
      expect(last(c).view.winner).not.toBeNull();
      expect(last(c).view.scores).toEqual(last(host!).view.scores);
    }
    expectNothingLeaked(all);
  });

  it("fills empty seats with bots and plays one human through a whole game", async () => {
    const { matchId, players, all } = await table(1);
    await send(players[0], "start", { matchId });
    await settled(all, matchId);
    expect(last(players[0]).seats).toEqual(["human", "bot", "bot", "bot"]);
    await playGame(matchId, players, all);
    expect(last(players[0]).view.winner).not.toBeNull();
    expectNothingLeaked(all);
  });

  for (const game of Object.keys(GAMES)) {
    it(`${game}: four humans and a host play to the end and no hand is ever visible to another`, async () => {
      const { matchId, players, all } = await table(4, true, game);
      await send(players[0], "start", { matchId });
      await settled(all, matchId);
      for (const c of all) expect(last(c)).toMatchObject({ game, started: true });
      await playGame(matchId, players, all, game);
      expectHandsPrivate(all);
    }, 120_000); // a whole game over real sockets, one round trip per move

    it(`${game}: one human and three bots play to the end`, async () => {
      const { matchId, players, all } = await table(1, false, game);
      await send(players[0], "start", { matchId });
      await settled(all, matchId);
      await playGame(matchId, players, all, game);
      expect(last(players[0]).view.phase).toBe("game-over");
    }, 120_000);
  }

  it("hands a departed player's seat to a bot so the others can go on", async () => {
    const { matchId, players, all } = await table(4);
    await send(players[0], "start", { matchId });
    await settled(all, matchId);
    players[1].socket.close(); // seat 1 is on turn
    await until(() => last(players[0]).seats[1] === "bot" && last(players[0]).view.turn === 2);
    expect(last(players[0]).view.auction).toHaveLength(1);
    expect(await act(players[2], matchId, { type: "bid", bid: null })).toMatchObject({ ok: true });
  });
});
