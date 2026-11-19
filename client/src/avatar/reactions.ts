/**
 * The automatic reactions at the end of a hand at my own table: the hand's winners applaud or grin, everyone
 * else shrugs or laughs along. Once per hand, only while the comfort setting allows, and never about anyone's
 * cards or mistakes: only who took the hand, which the seat plates and scores already show.
 *
 *   watchHands(seen, table, allowed)   call with each table snapshot; keep `seen`, play `bySeat` when it is not null
 *   handWinners(game, view)            the seats that took the hand, from its public result
 *   reactionsOn(comfort)               the comfort setting (on by default)
 */
import type { View as BidWhistView } from "../../../server/games/bidwhist";
import type { View as SpadesView } from "../../../server/games/spades";
import type { View as TonkView } from "../../../server/games/tonk";
import type { GameId, GameView, Seat, TableSnapshot } from "../../../shared/protocol";
import type { Comfort } from "../state/local";
import type { Act } from "./motion";

export type Reaction = Extract<Act, "clap" | "grin" | "shrug" | "laugh">;

const SEATS: readonly Seat[] = [0, 1, 2, 3];

/** The comfort setting for automatic reactions: Settings, "Reactions at the table". */
export const reactionsOn = (comfort: Pick<Comfort, "reactions">): boolean => comfort.reactions;

/** The seats that took the hand just scored: payouts in tonk, the better team score in spades, the bid made or set in bid whist. */
export function handWinners(game: GameId, view: GameView): Seat[] {
  if (game === "tonk") {
    const result = (view as TonkView).result;
    return result ? SEATS.filter((seat) => (result.points[seat] ?? 0) > 0) : [];
  }
  if (game === "spades") {
    const result = (view as SpadesView).result;
    if (!result || result[0].delta === result[1].delta) return [];
    const team = result[0].delta > result[1].delta ? 0 : 1;
    return [team, team + 2] as Seat[];
  }
  const result = (view as BidWhistView).result;
  if (!result) return [];
  const team = result.made ? result.team : 1 - result.team;
  return [team, team + 2] as Seat[];
}

/**
 * One table snapshot's worth of watching. `seen` is what the last call returned, or null for a table just
 * joined (a hand that ended before I arrived gets no reaction). Returns what to remember, and each seat's
 * reaction when a hand has just ended and reactions are on: winners clap or grin, the rest shrug or laugh,
 * varied by seat and hand so a table does not move as one.
 */
export function watchHands(seen: string | null, table: TableSnapshot, allowed: boolean): { seen: string; bySeat: (Reaction | null)[] | null } {
  const view = table.view;
  const over = !!view && (view.phase === "hand-over" || view.phase === "game-over") && (view as { result?: unknown }).result != null;
  const now = over ? `${table.tableId}:${(view as { handNumber?: number }).handNumber ?? 0}` : "";
  if (seen === null || now === "" || now === seen || !allowed) return { seen: now, bySeat: null };
  const winners = handWinners(table.game, view!);
  const hand = (view as { handNumber?: number }).handNumber ?? 0;
  const bySeat = SEATS.map((seat): Reaction => {
    // Partners (seats 0 and 2, 1 and 3) do different things.
    const odd = ((seat >> 1) + hand) % 2 === 1;
    return winners.includes(seat) ? (odd ? "clap" : "grin") : odd ? "shrug" : "laugh";
  });
  return { seen: now, bySeat };
}
