/**
 * Pure helpers shared by the in-world table interface and the DOM panel: the
 * words on a status board and seat plate, and where fanned cards and button
 * grids go. No rules here: everything comes from describeTable's result.
 */
import type { TableStatus, TableSummary } from "../../../shared/protocol";
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

/** One seat in words: who, their bid or score, their cards or readiness, and whether they are on turn. */
export function seatLines(seat: SeatDescription): string[] {
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
  return [who, seat.note, cards, seat.isTurn ? (seat.isYou ? "Your turn" : "Their turn") : ""].filter(Boolean);
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
