/**
 * Pure helpers shared by the in-world table interface and the DOM panel: the
 * words on a status board and seat plate, and where fanned cards and button
 * grids go. No rules here: everything comes from describeTable's result.
 */
import { MAX_STRIKES, type TableStatus, type TableSummary } from "../../../shared/protocol";
import { cardLabel } from "../ui/cards";
import type { SeatDescription, TableButton, TableCards, TableDescription } from "../ui/actions";

export const STATUS_WORDS: Record<TableStatus, string> = {
  available: "Available",
  lobby: "In lobby",
  playing: "In play",
  results: "Results",
};

/** Greedy word wrap; canvas text is not wrapped for us. */
export function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && line.length + 1 + word.length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

/** Who is in each seat and who deals, for the board anyone in the room can read. */
export function boardLines(summary: TableSummary): string[] {
  const seat = (n: number): string => {
    const info = summary.seats[n];
    return `Seat ${n + 1}: ${info.occupant === "open" ? "Open" : info.occupant === "bot" ? "Bot" : (info.name ?? "Player")}`;
  };
  return [
    `${seat(0)}   ${seat(1)}`,
    `${seat(2)}   ${seat(3)}`,
    summary.host ? `Host: ${summary.host.name}` : "Automatic dealer",
  ];
}

/** The last seconds of a turn, which look and sound different. */
export const HURRY_SECONDS = 10;

/** A running time as m:ss, or h:mm:ss from an hour on. */
export function clockText(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const ss = String(total % 60).padStart(2, "0");
  return minutes < 60 ? `${minutes}:${ss}` : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${ss}`;
}

/** Whole seconds left on a turn, rounded up so it reads 0 only once time is out, and whether they are the last ten. */
export function turnLeft(ms: number): { seconds: number; hurry: boolean } {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return { seconds, hurry: seconds <= HURRY_SECONDS };
}

/**
 * What my turn clock asks for when it shows `left` seconds (null: I am not on the clock) and showed `last` at the
 * check before: a tick as each of the last ten seconds begins, and a buzz with the first of them.
 */
export function turnCue(left: number | null, last: number | null): "tick" | "buzz" | null {
  if (left === null || left < 1 || left > HURRY_SECONDS || left === last) return null;
  return last === null || last > HURRY_SECONDS ? "buzz" : "tick";
}

/** How long a match has run: counted on from when the room snapshot arrived while it runs; null with no match. */
export function matchElapsed(time: TableSummary["matchTime"], roomAt: number, now: number): number | null {
  if (!time) return null;
  return time.elapsedMs + (time.running ? Math.max(0, now - roomAt) : 0);
}

/** "Strike 1 of 3" once a seat has run out of time in this match; "" before. */
export const strikeText = (strikes: number): string => (strikes > 0 ? `Strike ${strikes} of ${MAX_STRIKES}` : "");

/**
 * One seat in words: who, their bid or score, their cards or readiness, whether they are on turn, the seconds
 * `left` while they are on the turn clock, and their strikes.
 */
export function seatLines(seat: SeatDescription, left: number | null = null): string[] {
  const who =
    seat.occupant === "open"
      ? "Open seat"
      : `${seat.name}${seat.occupant === "bot" && !seat.name.startsWith("Bot") ? " (bot)" : ""}${
          seat.occupant === "human" && !seat.connected ? " (away)" : ""
        }`;
  const cards =
    seat.cardCount !== null
      ? `${seat.cardCount} ${seat.cardCount === 1 ? "card" : "cards"}`
      : seat.occupant === "human"
        ? seat.ready
          ? "Ready"
          : "Not ready"
        : "";
  const turn = seat.isTurn ? (seat.isYou ? "Your turn" : "Their turn") : "";
  return [who, seat.note, cards, turn, left === null ? "" : `${left} s left`, strikeText(seat.strikes)].filter(Boolean);
}

const owned = (name: string): string => (name === "You" ? "Your" : `${name}'s`);

/** The public cards in words, for people who cannot see or make out the card meshes. */
export function tableWords(cards: TableCards): string[] {
  const lines: string[] = [];
  if (cards.trick.length) lines.push(`On the table: ${cards.trick.map((play) => `${play.name}: ${cardLabel(play.card)}`).join("; ")}.`);
  if (cards.lastTrick) {
    lines.push(`Last trick went to ${cards.lastTrick.winnerName}: ${cards.lastTrick.plays.map((play) => cardLabel(play.card)).join(", ")}.`);
  }
  for (const meld of cards.melds) lines.push(`${owned(meld.name)} ${meld.kind}: ${meld.cards.map(cardLabel).join(", ")}.`);
  for (const shown of cards.revealed) lines.push(`${shown.name} showed: ${shown.cards.map(cardLabel).join(", ")}.`);
  if (cards.kittyCount) lines.push(`Kitty: ${cards.kittyCount} cards face down.`);
  return lines;
}

/** The winner and the score explanation once the game is over, else null. */
export function resultSummary(description: TableDescription, phase: string | null): { headline: string; lines: string[] } | null {
  if (phase !== "game-over") return null;
  const headline = description.statusLines.find((line) => line.endsWith("won the game.")) ?? "The game is over.";
  return {
    headline,
    lines: description.statusLines.filter((line) => line !== headline && !line.startsWith("House rules")),
  };
}

/** The button a second select on an already picked card presses: only where exactly one card is played or discarded. */
export function confirmButton(description: TableDescription): TableButton | null {
  if (description.selectionLimit !== 1) return null;
  return description.buttons.find((button) => (button.id === "play" || button.id === "discard") && !button.disabled) ?? null;
}

/** Rows of a hand fan: `offset` counts card widths from the middle of the row; row 0 is the back row. */
export function fanLayout(count: number, perRow = 9): { row: number; offset: number }[] {
  const rows = Math.ceil(count / perRow);
  const per = Math.ceil(count / Math.max(rows, 1));
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / per);
    const inRow = Math.min(per, count - row * per);
    return { row, offset: (i % per) - (inRow - 1) / 2 };
  });
}

/** Buttons fill columns top to bottom, at most three columns. */
export function buttonGrid(count: number, perColumn = 6): { columns: number; cells: { column: number; row: number }[] } {
  const columns = Math.max(1, Math.min(3, Math.ceil(count / perColumn)));
  const rows = Math.ceil(count / columns);
  return { columns, cells: Array.from({ length: count }, (_, i) => ({ column: Math.floor(i / rows), row: i % rows })) };
}
