import { act, cleanup, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Card } from "../../shared/cards";
import type { GameId, Reply, Seat, SeatInfo, TableId, TableSummary } from "../../shared/protocol";
import { GAMES } from "../../server/games/index";
import { RuleError } from "../../server/games/game";
import { net } from "../../client/src/net/store";
import { local } from "../../client/src/state/local";
import { describeTable } from "../../client/src/ui/actions";
import { cardLabel } from "../../client/src/ui/cards";
import { boardLines, buttonGrid, confirmButton, fanLayout, wrap } from "../../client/src/tableui/helpers";
import { TablePanelDom } from "../../client/src/tableui/TablePanelDom";
import { useTableActions } from "../../client/src/tableui/useTableActions";

type Answer = (event: string, payload: any) => Reply<Record<string, unknown>>;

/** Stands in for the Socket.IO client under the real net store: records what is sent, lets the test play the server. */
const fake = vi.hoisted(() => {
  const handlers = new Map<string, (payload?: unknown) => void>();
  const sent: { event: string; payload: any }[] = [];
  const state = { answer: ((): unknown => ({ ok: true })) as (event: string, payload: any) => unknown };
  const socket = {
    connected: true,
    on(event: string, handler: (payload?: unknown) => void) {
      handlers.set(event, handler);
      return socket;
    },
    timeout: () => ({
      async emitWithAck(event: string, payload: unknown) {
        sent.push({ event, payload });
        return state.answer(event, payload);
      },
    }),
    volatile: { emit: () => {} },
  };
  return { handlers, sent, state, socket };
});
vi.mock("socket.io-client", () => ({ io: () => fake.socket }));

const ME = "me";
const TABLE_OF: Record<GameId, TableId> = { tonk: "tonk-1", spades: "spades-1", "bid-whist": "bid-whist-1" };
const open = (): SeatInfo => ({ occupant: "open", memberId: null, name: null, ready: false, connected: false });
const bot = (): SeatInfo => ({ occupant: "bot", memberId: null, name: null, ready: false, connected: true });

/** A repeatable shuffle, so a failing hand can be replayed. */
function shuffler(seed: number) {
  let state = seed;
  return (deck: Card[]): Card[] => {
    const out = [...deck];
    for (let i = out.length - 1; i > 0; i -= 1) {
      state = (state * 1664525 + 1013904223) % 0x100000000;
      const j = Math.floor((state / 0x100000000) * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
}

/**
 * One table of a pretend room server, run by the real rule engine. It answers
 * the socket events the panel sends and pushes "room" and "table" snapshots
 * the way the room server does; the other seats are played by the engine's bots.
 */
function makeWorld(game: GameId, seed = 1) {
  const engine = GAMES[game];
  const tableId = TABLE_OF[game];
  const shuffle = shuffler(seed);
  const world = {
    engine,
    summary: {
      id: tableId,
      game,
      status: "available",
      seats: [open(), open(), open(), open()],
      host: null,
      managerId: null,
      options: engine.checkOptions(undefined),
    } as TableSummary,
    state: null as any,
    revision: 0,
    /** undefined: not at the table; null: its host. */
    place: undefined as Seat | null | undefined,
    /** What a seat that is not mine plays. */
    policy: (view: any): any => engine.chooseAction(view),
    live: () => world.state && world.state.phase !== "hand-over" && world.state.phase !== "game-over",
    sit(place: Seat | null, ready = false) {
      world.place = place;
      if (place === null) world.summary.host = { memberId: ME, name: "Ann", connected: true };
      else world.summary.seats[place] = { occupant: "human", memberId: ME, name: "Ann", ready, connected: true };
      world.summary.managerId = ME;
      if (world.summary.status === "available") world.summary.status = "lobby";
    },
    start() {
      world.state = engine.newMatch(shuffle(engine.deck(world.summary.options)), world.summary.options);
      world.summary.seats = world.summary.seats.map((info) => (info.occupant === "open" ? bot() : info)) as TableSummary["seats"];
      world.summary.status = "playing";
      world.revision = 1;
    },
    /** Bots play until it is my turn or the hand ends; with `all`, my seat is played too. */
    bots(all = false) {
      while (world.live() && (all || world.state.turn !== world.place)) {
        world.state = engine.apply(world.state, world.state.turn, world.policy(engine.viewFor(world.state, world.state.turn)));
        world.revision += 1;
      }
      if (world.state?.phase === "game-over") world.summary.status = "results";
    },
    nextHand() {
      world.state = engine.nextHand(world.state, shuffle(engine.deck(world.summary.options)));
      world.revision += 1;
    },
    push() {
      const at = world.place !== undefined;
      fake.handlers.get("room")!({
        code: "ABCDEFGH",
        you: ME,
        members: [{ id: ME, name: "Ann", connected: true, tableId: at ? tableId : null }],
        tables: [structuredClone(world.summary)],
      });
      if (at) {
        fake.handlers.get("table")!({
          tableId,
          game,
          revision: world.revision,
          you: world.place,
          view: world.state && engine.viewFor(world.state, world.place!),
        });
      }
    },
    answer(event: string, payload: any): Reply<Record<string, unknown>> {
      const done = (extra: Record<string, unknown> = {}): Reply<Record<string, unknown>> => {
        world.push();
        return { ok: true, ...extra };
      };
      switch (event) {
        case "table:sit":
          world.sit(payload.role === "host" ? null : payload.seat);
          return done({ seat: world.place });
        case "table:ready":
          world.summary.seats[world.place as Seat].ready = payload.ready;
          return done();
        case "table:options":
          world.summary.options = engine.checkOptions(payload.options);
          return done();
        case "table:start":
          world.start();
          world.bots();
          return done();
        case "table:action":
          if (payload.expectedRevision !== world.revision) return { ok: false, error: "stale-revision", message: "The table has changed" };
          try {
            if (payload.action.type === "next-hand") world.nextHand();
            else {
              world.state = engine.apply(world.state, world.place as Seat, payload.action);
              world.revision += 1;
            }
          } catch (error) {
            if (error instanceof RuleError) return { ok: false, error: "illegal", message: error.message };
            throw error;
          }
          world.bots();
          return done({ revision: world.revision });
        case "table:reset":
          world.state = null;
          world.revision = 0;
          world.summary.status = "lobby";
          world.summary.seats = world.summary.seats.map((info) => (info.occupant === "bot" ? open() : info)) as TableSummary["seats"];
          return done();
        case "table:stand":
          world.place = undefined;
          world.summary.seats = [open(), open(), open(), open()];
          world.summary.host = null;
          return done();
        default:
          return { ok: false, error: "bad-request", message: `unexpected ${event}` };
      }
    },
  };
  fake.state.answer = world.answer;
  return world;
}

const serve = (world: ReturnType<typeof makeWorld>) => act(() => world.push());
/** Presses a panel button and lets the server's answer and snapshots land. */
const click = (testId: string) => act(async () => void fireEvent.click(screen.getByTestId(testId)));
const sentActions = () => fake.sent.filter((message) => message.event === "table:action").map((message) => message.payload.action);
const handButtons = () => within(screen.getByRole("group", { name: "Your hand" })).getAllByRole("button") as HTMLButtonElement[];
const statusText = () => screen.getByTestId("table-status").textContent ?? "";

beforeAll(() => {
  net.open();
});

beforeEach(() => {
  fake.sent.length = 0;
  local.set({ focusTable: null, selection: [], xrActive: false });
});

afterEach(cleanup);

describe("table panel", () => {
  it("takes a Spades player from the table list through sitting, ready, start, a bid and a played card", async () => {
    const world = makeWorld("spades");
    render(<TablePanelDom />);
    await serve(world);
    expect(screen.getByTestId("table-spades-1").textContent).toBe("Spades Table 1 (Available)");
    await click("table-spades-1");
    expect(screen.getByRole("heading", { name: "Spades Table 1" })).toBeTruthy();
    expect(screen.getByTestId("table-status").getAttribute("aria-live")).toBe("polite");

    await click("sit-0");
    expect(fake.sent[0]).toEqual({ event: "table:sit", payload: { tableId: "spades-1", role: "player", seat: 0 } });
    // A disabled button says why in words.
    expect((screen.getByTestId("start") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Waiting for you to be ready")).toBeTruthy();
    await click("ready");
    await click("start");
    expect(statusText()).toContain("It is your turn.");

    await click("bid-3");
    expect(sentActions().at(-1)).toEqual({ type: "bid", tricks: 3 });
    expect(world.state.phase).toBe("play");

    // Picking a card does not play it: the confirm button names the card first.
    expect((screen.getByTestId("play") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Pick a card from your hand first")).toBeTruthy();
    const card = handButtons().find((button) => !button.disabled)!;
    const cardId = card.dataset.testid!.slice("card-".length);
    await act(() => void fireEvent.click(card));
    expect(card.getAttribute("aria-pressed")).toBe("true");
    expect(sentActions()).toHaveLength(1);
    expect(screen.getByTestId("play").textContent).toBe(`Play ${card.getAttribute("aria-label")}`);
    await click("play");
    expect(sentActions().at(-1)).toEqual({ type: "play", cardId });
    expect(screen.queryByTestId(`card-${cardId}`)).toBeNull();
    expect(screen.getByTestId("table-cards").textContent).toMatch(/On the table|Last trick/);
    expect(local.getState().selection).toEqual([]);

    // Leave and New game ignore a press that comes within half a second of pressing another button (double-press guard).
    await new Promise((resolve) => setTimeout(resolve, 550));
    await click("leave");
    expect(fake.sent.at(-1)!.event).toBe("table:stand");
  });

  it("lets the Bid Whist bid winner name trump and discard exactly six kitty cards", async () => {
    const world = makeWorld("bid-whist", 4);
    world.policy = (view) => (view.phase === "auction" ? { type: "bid", bid: null } : world.engine.chooseAction(view));
    world.sit(2, true);
    world.start();
    world.bots();
    render(<TablePanelDom />);
    await serve(world);
    expect(screen.getByTestId("seat-2").textContent).toMatch(/^▶ You.*Your turn/);

    const bid = screen.getAllByRole("button").find((button) => /^bid-\d-high$/.test(button.dataset.testid ?? "") && !(button as HTMLButtonElement).disabled)!;
    await act(async () => void fireEvent.click(bid));
    expect(world.state.phase).toBe("declare");
    await click("declare-hearts");
    expect(statusText()).toContain("trump is Hearts");

    expect(handButtons()).toHaveLength(18);
    expect(screen.getByText("Pick exactly six cards (0 picked)")).toBeTruthy();
    for (const button of handButtons().slice(0, 7)) await act(() => void fireEvent.click(button));
    // The seventh pick is refused: six is the limit.
    expect(handButtons().filter((button) => button.getAttribute("aria-pressed") === "true")).toHaveLength(6);
    await click("clear");
    expect(handButtons().filter((button) => button.getAttribute("aria-pressed") === "true")).toHaveLength(0);
    const chosen = handButtons().slice(6, 12);
    const chosenIds = chosen.map((button) => button.dataset.testid!.slice("card-".length));
    for (const button of chosen) await act(() => void fireEvent.click(button));
    expect((screen.getByTestId("discard") as HTMLButtonElement).disabled).toBe(false);
    await click("discard");
    expect(sentActions().at(-1)).toEqual({ type: "discard", cardIds: chosenIds });
    expect(world.state.phase).toBe("play");
    expect(handButtons()).toHaveLength(12);
  });

  it("lays down a Tonk meld with one button, then discards a picked card", async () => {
    // Find a deal where the first player can meld after drawing from the stock.
    let world = makeWorld("tonk", 1);
    for (let seed = 1; seed < 400; seed += 1) {
      world = makeWorld("tonk", seed);
      world.start();
      const { state, engine } = world;
      if (state.phase !== "draw") continue;
      const drawn = engine.apply(state, state.turn, { type: "draw", from: "stock" });
      if ((engine.viewFor(drawn, state.turn).legal as { melds: unknown[] }).melds.length) break;
    }
    world.sit(world.state.turn, true);
    render(<TablePanelDom />);
    await serve(world);
    expect(screen.getByTestId("table-cards").textContent).toContain("Stock:");

    await click("draw-stock");
    const meld = screen.getByTestId("meld-0");
    expect(meld.textContent).toMatch(/^Lay down a (set|run): /);
    await click("meld-0");
    expect(sentActions().at(-1)).toMatchObject({ type: "meld" });
    expect(screen.getByTestId("table-cards").textContent).toMatch(/Your (set|run): /);

    const card = handButtons().find((button) => !button.disabled)!;
    await act(() => void fireEvent.click(card));
    expect(screen.getByTestId("discard").textContent).toBe(`Discard the ${card.getAttribute("aria-label")}`);
    await click("discard");
    expect(sentActions().at(-1)).toEqual({ type: "discard", cardId: card.dataset.testid!.slice("card-".length) });
  });

  it("offers the next hand, then shows the winner and a new game to the manager", async () => {
    const world = makeWorld("tonk", 9);
    world.sit(0, true);
    world.start();
    world.bots(true);
    render(<TablePanelDom />);
    await serve(world);
    expect(world.state.phase).toBe("hand-over");
    expect(statusText()).toMatch(/point|void/);
    await click("next-hand");
    expect(sentActions().at(-1)).toEqual({ type: "next-hand" });
    expect(world.state.handNumber).toBe(2);

    for (let hands = 0; hands < 200 && world.state.phase !== "game-over"; hands += 1) {
      world.bots(true);
      if (world.state.phase === "hand-over") world.nextHand();
    }
    await serve(world);
    const results = screen.getByTestId("results");
    expect(results.textContent).toMatch(/Game over.*won the game\./);
    expect(statusText()).toContain("Score (play to");
    expect(screen.getByTestId("leave")).toBeTruthy();
    // Leave and New game ignore a press that comes within half a second of pressing another button (double-press guard).
    await new Promise((resolve) => setTimeout(resolve, 550));
    await click("reset");
    expect(fake.sent.at(-1)!.event).toBe("table:reset");
    expect(screen.queryByTestId("results")).toBeNull();
    expect(screen.getByTestId("unready")).toBeTruthy();
  });

  it("gives the host the house rules and the public table but never a hand", async () => {
    const world = makeWorld("bid-whist");
    render(<TablePanelDom />);
    await serve(world);
    await click("table-bid-whist-1");
    await click("sit-host");
    expect(fake.sent.at(-1)!.payload).toEqual({ tableId: "bid-whist-1", role: "host" });
    expect(statusText()).toContain("You are the host");
    await click("option-minBid");
    expect(fake.sent.at(-1)).toMatchObject({ event: "table:options", payload: { options: { minBid: 4 } } });
    expect(statusText()).toContain("Lowest bid: 4");

    world.summary.seats[1] = { occupant: "human", memberId: "m1", name: "Bo", ready: true, connected: true };
    world.start();
    await serve(world);
    expect(screen.queryByRole("group", { name: "Your hand" })).toBeNull();
    expect(screen.getByTestId("seat-1").textContent).toContain("Bo");
    expect(screen.getByTestId("table-cards").textContent).toContain("Kitty: 6 cards");
    expect(screen.getAllByRole("button").map((button) => button.dataset.testid)).toEqual(["leave"]);
  });

  it("shows the turn clock, strikes and match time as text, and announces my last seconds once", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    try {
      const world = makeWorld("spades");
      world.sit(0, true);
      world.start();
      world.bots();
      render(<TablePanelDom />);
      await serve(world);
      const { room, table } = net.getState();
      const time = (elapsedMs: number, running: boolean) =>
        act(() => fake.handlers.get("room")!({ ...room!, tables: [{ ...room!.tables[0], matchTime: { elapsedMs, running } }] }));
      const clock = (seat: Seat, remainingMs: number, strikes: [number, number, number, number]) =>
        act(() => fake.handlers.get("table")!({ ...table!, clock: { seat, remainingMs, totalMs: 45_000 }, strikes }));
      const alert = () => screen.getByTestId("turn-alert").textContent;

      await time(65_000, true);
      expect(screen.getByTestId("match-time").textContent).toBe("Match time: 1:05");
      // Another seat on the clock: its seconds in its line, its strike after it; nothing of mine.
      await clock(1, 30_000, [0, 1, 0, 0]);
      expect(screen.getByTestId("seat-1").textContent).toMatch(/13 cards, 30 s left, Strike 1 of 3/);
      expect(screen.queryByTestId("turn-clock")).toBeNull();
      await act(() => vi.advanceTimersByTime(2_000));
      expect(screen.getByTestId("seat-1").textContent).toContain("28 s left");
      expect(screen.getByTestId("match-time").textContent).toBe("Match time: 1:07");

      // My clock: counted down from arrival, and in the last ten marked by more than colour, and said once.
      await clock(0, 12_000, [2, 1, 0, 0]);
      expect(screen.getByTestId("turn-clock").textContent).toBe("● Your time: 12 s left");
      expect(screen.getByTestId("turn-clock").className).toBe("turn-clock");
      expect(screen.getByTestId("seat-0").textContent).toContain("Strike 2 of 3");
      expect(alert()).toBe("");
      await act(() => vi.advanceTimersByTime(2_250));
      expect(screen.getByTestId("turn-clock").textContent).toBe("▲ Your time: 10 s left");
      expect(screen.getByTestId("turn-clock").className).toBe("turn-clock hurry");
      expect(alert()).toBe("10 seconds left");
      expect(screen.getByTestId("turn-alert").getAttribute("aria-live")).toBe("assertive");
      await act(() => vi.advanceTimersByTime(3_000));
      expect(screen.getByTestId("turn-clock").textContent).toBe("▲ Your time: 7 s left");
      expect(alert()).toBe("10 seconds left");
      // The visible count is not in a live region, so it is not read out every second.
      expect(screen.getByTestId("turn-clock").closest("[aria-live]")).toBeNull();

      // Game over: the match time stops at its final value.
      await time(600_000, false);
      await act(() => vi.advanceTimersByTime(5_000));
      expect(screen.getByTestId("match-time").textContent).toBe("Match time: 10:00 (final)");
    } finally {
      vi.useRealTimers();
    }
  });

  it("is hidden in VR, where the in-world table takes over", async () => {
    const world = makeWorld("spades");
    world.sit(0);
    const { container } = render(<TablePanelDom />);
    await serve(world);
    expect(screen.getByTestId("table-panel")).toBeTruthy();
    act(() => local.set({ xrActive: true }));
    expect(container.innerHTML).toBe("");
  });
});

describe("useTableActions", () => {
  function atPlay() {
    const world = makeWorld("spades", 3);
    world.policy = (view) => (view.phase === "bidding" ? { type: "bid", tricks: 3 } : world.engine.chooseAction(view));
    world.sit(0, true);
    world.start();
    while (world.state.phase === "bidding") {
      world.state = world.engine.apply(world.state, world.state.turn, { type: "bid", tricks: 3 });
      world.revision += 1;
    }
    world.bots();
    return world;
  }

  it("shows the server's refusal and forgets it when a later press succeeds", async () => {
    const world = makeWorld("spades");
    const hook = renderHook(() => useTableActions("spades-1"));
    await serve(world);
    const sit = hook.result.current.description!.buttons.find((button) => button.id === "sit-1")!;
    fake.state.answer = () => ({ ok: false, error: "seat-taken", message: "That seat was just taken" });
    await act(() => hook.result.current.press(sit));
    expect(hook.result.current.error).toBe("That seat was just taken");

    fake.state.answer = world.answer;
    await act(() => hook.result.current.press(sit));
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.description!.role).toBe("player");
  });

  it("lets a reply that lands after the table moved on neither free a newer press nor show its refusal", async () => {
    const world = atPlay();
    const hook = renderHook(() => useTableActions("spades-1"));
    await serve(world);
    const held = hook.result.current.description!.hand.find((card) => card.selectable)!;
    act(() => hook.result.current.pick(held.card.id));
    const play = hook.result.current.description!.buttons.find((button) => button.id === "play")!;
    const replies: ((reply: unknown) => void)[] = [];
    fake.state.answer = () => new Promise((resolve) => replies.push(resolve));
    const first = hook.result.current.press(play);
    // A snapshot moves the table on while the first reply is on its way, so a second press may go out.
    world.revision += 1;
    await serve(world);
    const second = hook.result.current.press(play);
    expect(replies).toHaveLength(2);

    await act(async () => {
      replies[0]({ ok: false, error: "seat-taken", message: "An old refusal" });
      await first;
    });
    expect(hook.result.current.busy()).toBe(true);
    expect(hook.result.current.error).toBeNull();

    await act(async () => {
      replies[1]({ ok: false, error: "seat-taken", message: "That seat was just taken" });
      await second;
    });
    expect(hook.result.current.busy()).toBe(false);
    expect(hook.result.current.error).toBe("That seat was just taken");
  });

  it("drops the second half of a double press on Leave, which would land on the seat just left", async () => {
    const world = makeWorld("spades");
    world.sit(1, true);
    const hook = renderHook(() => useTableActions("spades-1"));
    await serve(world);
    const leave = hook.result.current.description!.buttons.find((button) => button.id === "leave")!;
    let releaseStand: (reply: unknown) => void = () => {};
    fake.state.answer = (event, payload) => (event === "table:stand" ? new Promise((resolve) => (releaseStand = resolve)) : world.answer(event, payload));
    const sentBefore = fake.sent.length;
    let pressed: Promise<void> = Promise.resolve();
    act(() => void (pressed = hook.result.current.press(leave)));
    // Up at once: the buttons are a visitor's now, with Sit where Leave was.
    const after = hook.result.current.description!;
    expect(after.role).toBe("visitor");
    const sit = after.buttons.find((button) => button.id === "sit-1")!;
    expect(sit.disabled).toBe(false);
    await act(() => hook.result.current.press(sit));
    expect(fake.sent.slice(sentBefore).map((message) => message.event)).toEqual(["table:stand"]);
    await act(async () => {
      releaseStand({ ok: true });
      await pressed;
    });
  });

  it("shows why a Leave was refused, although the table moved on and back by that press", async () => {
    const world = makeWorld("spades");
    world.sit(1, true);
    const hook = renderHook(() => useTableActions("spades-1"));
    await serve(world);
    const leave = hook.result.current.description!.buttons.find((button) => button.id === "leave")!;
    fake.state.answer = (event, payload) =>
      event === "table:stand" ? { ok: false, error: "internal", message: "The server did not answer. Check your connection." } : world.answer(event, payload);
    await act(() => hook.result.current.press(leave));
    expect(hook.result.current.description!.role).toBe("player");
    expect(hook.result.current.error).toBe("The server did not answer. Check your connection.");
    expect(hook.result.current.busy()).toBe(false);
  });

  it("shows a refusal in the panel as an alert", async () => {
    const world = makeWorld("spades");
    render(<TablePanelDom />);
    await serve(world);
    await click("table-spades-1");
    fake.state.answer = () => ({ ok: false, error: "seat-taken", message: "That seat was just taken" });
    await click("sit-1");
    expect(screen.getByRole("alert").textContent).toBe("Problem: That seat was just taken");
  });

  it("keeps the selection when a snapshot repeats and clears it when the revision changes", async () => {
    const world = atPlay();
    const hook = renderHook(() => useTableActions("spades-1"));
    await serve(world);
    const held = hook.result.current.description!.hand.find((card) => card.selectable)!;
    act(() => hook.result.current.pick(held.card.id));
    expect(local.getState().selection).toEqual([held.card.id]);
    await serve(world);
    expect(local.getState().selection).toEqual([held.card.id]);
    world.revision += 1;
    await serve(world);
    expect(local.getState().selection).toEqual([]);
  });

  it("plays a picked card on a second select, and never on the first", async () => {
    const world = atPlay();
    const hook = renderHook(() => useTableActions("spades-1"));
    await serve(world);
    const held = hook.result.current.description!.hand.find((card) => card.selectable)!;
    await act(async () => hook.result.current.activateCard(held.card.id));
    expect(sentActions()).toEqual([]);
    expect(hook.result.current.description!.buttons.find((button) => button.id === "play")!.label).toBe(`Play ${cardLabel(held.card)}`);
    await act(async () => hook.result.current.activateCard(held.card.id));
    expect(sentActions()).toEqual([{ type: "play", cardId: held.card.id }]);
  });
});

describe("table interface helpers", () => {
  it("wraps words without losing any", () => {
    const text = "Bidding: bid how many books above six your side will take.";
    const lines = wrap(text, 20);
    expect(lines.every((line) => line.length <= 20)).toBe(true);
    expect(lines.join(" ")).toBe(text);
  });

  it("names every seat and the dealer on the status board", () => {
    const world = makeWorld("spades");
    world.sit(1);
    world.summary.seats[2] = bot();
    expect(boardLines(world.summary)).toEqual(["Seat 1: Open   Seat 2: Ann", "Seat 3: Bot   Seat 4: Open", "Automatic dealer"]);
    world.summary.host = { memberId: "h", name: "Dee", connected: true };
    expect(boardLines(world.summary)[2]).toBe("Host: Dee");
  });

  it("fans a hand in centred rows and fills button columns", () => {
    expect(fanLayout(3).map((slot) => slot.offset)).toEqual([-1, 0, 1]);
    const kitty = fanLayout(18);
    expect(kitty.filter((slot) => slot.row === 0)).toHaveLength(9);
    expect(kitty.filter((slot) => slot.row === 1)).toHaveLength(9);
    expect(fanLayout(13).map((slot) => slot.row)).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
    expect(fanLayout(0)).toEqual([]);
    expect(buttonGrid(4).columns).toBe(1);
    const auction = buttonGrid(17);
    expect(auction.columns).toBe(3);
    expect(new Set(auction.cells.map((cell) => `${cell.column}:${cell.row}`)).size).toBe(17);
  });

  it("confirms a second select only where one card is played, never for the six-card kitty", () => {
    const engine = GAMES["bid-whist"];
    const options = engine.checkOptions(undefined);
    let state = engine.newMatch(shuffler(7)(engine.deck(options)), options);
    state = engine.apply(state, state.turn, { type: "bid", bid: { level: 4, kind: "high" } });
    while (state.phase === "auction") state = engine.apply(state, state.turn, { type: "bid", bid: null });
    const seat: Seat = state.turn;
    state = engine.apply(state, seat, { type: "declare", trump: "hearts" });
    const human = (n: number): SeatInfo => ({ occupant: "human", memberId: `m${n}`, name: `P${n}`, ready: true, connected: true });
    const summary: TableSummary = {
      id: "bid-whist-1",
      game: "bid-whist",
      status: "playing",
      seats: [human(0), human(1), human(2), human(3)],
      host: null,
      managerId: "m0",
      options,
    };
    const describe = (selection: string[]) =>
      describeTable({
        summary,
        snapshot: { tableId: "bid-whist-1", game: "bid-whist", revision: 1, you: seat, view: engine.viewFor(state, seat) as any },
        meId: `m${seat}`,
        selection,
      });
    const six = describe([]).hand.slice(0, 6).map((held) => held.card.id);
    expect(confirmButton(describe(six))).toBeNull();
    state = engine.apply(state, seat, { type: "discard", cardIds: six });
    const lead = describe([]).hand.find((held) => held.selectable)!.card.id;
    expect(confirmButton(describe([]))).toBeNull();
    expect(confirmButton(describe([lead]))!.id).toBe("play");
  });
});
