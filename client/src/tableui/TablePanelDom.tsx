/**
 * The table interface as ordinary HTML, outside the canvas: the desktop and
 * accessibility mirror of the in-world table, and what browser tests drive.
 * Hidden in VR. Shows the table I am at, else the one I walked up to or picked.
 * App mounts it only when asked for (the "Text table panel" setting, ?panel=1),
 * while a gamepad is connected (its bumpers step through the panel), or when the
 * 3D view could not start; otherwise the HUD menu shows TablePicker, and picking a
 * table there turns the setting on.
 *
 * The turn clock is text here too: the seat on the clock has its seconds left in its line, my own seconds show
 * under the status (marked ● and, in the last ten, ▲), and a screen reader hears "10 seconds left" once.
 *
 * Test hooks: table-picker, table-<table id>, table-panel, table-title,
 * tables-back, table-status, table-error, results, match-time, turn-clock, turn-alert,
 * table-cards, trick, seat-<n>, card-<card id>, and every action button by its id.
 */
import { TABLES } from "../../../shared/protocol";
import { useStore } from "../net/store";
import { local, useLocal } from "../state/local";
import { useActiveTableId } from "../state/table";
import { cardLabel } from "../ui/cards";
import { useMatchTime, useTurnClock } from "./clock";
import { clockText, HURRY_SECONDS, resultSummary, seatLines, STATUS_WORDS, tableWords } from "./helpers";
import { useTableActions } from "./useTableActions";

/** The six tables to pick from: docked as the text panel, or inside the HUD menu (never both, so test ids stay unique). */
export function TablePicker({ heading = "Card tables", className = "panel" }: { heading?: string; className?: string }) {
  const room = useStore((state) => state.room);
  return (
    <aside className={className} data-testid="table-picker" aria-label="Card tables">
      <h2>{heading}</h2>
      <p>Walk up to a table, or pick one here.</p>
      <div className="buttons">
        {TABLES.map((table) => {
          const status = room?.tables.find((summary) => summary.id === table.id)?.status ?? "available";
          return (
            <button
              key={table.id}
              data-testid={`table-${table.id}`}
              // Picking from a list asks for the text interface: the panel opens with that table's Sit buttons.
              onClick={() => {
                local.setComfort({ textPanel: true });
                local.set({ focusTable: table.id });
              }}
            >
              {table.label} ({STATUS_WORDS[status]})
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export function TablePanelDom() {
  const tableId = useActiveTableId();
  const { description, error, pick, press } = useTableActions(tableId);
  const phase = useStore((state) => state.table?.view?.phase ?? null);
  const xrActive = useLocal((state) => state.xrActive);
  const summary = useStore((state) => state.room?.tables.find((table) => table.id === tableId));
  const elapsed = useMatchTime(summary);
  const clock = useTurnClock();
  if (xrActive) return null;
  if (!description) return <TablePicker />;
  const mine = clock && clock.seat === description.seats.find((seat) => seat.isYou)?.seat ? clock : null;
  const { tableCards } = description;
  const result = resultSummary(description, phase);
  const words = tableWords(tableCards);
  return (
    <aside className="panel" data-testid="table-panel" aria-label={description.title}>
      <h2 data-testid="table-title">{description.title}</h2>
      {description.role === "visitor" && (
        <button data-testid="tables-back" onClick={() => local.set({ focusTable: null })}>
          Back to all tables
        </button>
      )}
      {error && (
        <p className="error" role="alert" data-testid="table-error">
          Problem: {error}
        </p>
      )}
      {result && (
        <section data-testid="results" aria-label="Results">
          <h3>Game over</h3>
          <p>
            <strong>{result.headline}</strong>
          </p>
        </section>
      )}
      <ul data-testid="table-status" aria-live="polite">
        {description.statusLines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
      {elapsed !== null && (
        <p data-testid="match-time">
          Match time: {clockText(elapsed)}
          {summary?.matchTime?.running ? "" : " (final)"}
        </p>
      )}
      {mine && (
        <p data-testid="turn-clock" className={mine.hurry ? "turn-clock hurry" : "turn-clock"}>
          <span aria-hidden="true">{mine.hurry ? "▲" : "●"}</span> Your time: {mine.seconds} s left
        </p>
      )}
      {/* Said once as my last seconds begin, not every second: the count above is not read out. */}
      <p className="sr-only" aria-live="assertive" data-testid="turn-alert">
        {mine?.hurry ? `${Math.min(HURRY_SECONDS, Math.ceil(mine.totalMs / 1000))} seconds left` : ""}
      </p>
      <h3>Seats</h3>
      <ol className="seats">
        {description.seats.map((seat) => (
          <li key={seat.seat} data-testid={`seat-${seat.seat}`}>
            {seat.isTurn ? "▶ " : ""}
            {seatLines(seat, clock?.seat === seat.seat ? clock.seconds : null).join(", ")}
            {seat.team !== null ? ` (team ${seat.team + 1})` : ""}
          </li>
        ))}
      </ol>
      {(words.length > 0 || tableCards.stockCount !== null) && (
        <section data-testid="table-cards" aria-label="Cards on the table">
          <h3>On the table</h3>
          {tableCards.stockCount !== null && (
            <p>
              Stock: {tableCards.stockCount} cards. Discard pile:{" "}
              {tableCards.discardTop ? `${cardLabel(tableCards.discardTop)} on top` : "empty"}.
            </p>
          )}
          {words.map((line, i) => (
            <p key={i} data-testid={i === 0 && tableCards.trick.length ? "trick" : undefined}>
              {line}
            </p>
          ))}
        </section>
      )}
      {description.hand.length > 0 && (
        <>
          <h3>Your hand</h3>
          <div className="hand" role="group" aria-label="Your hand">
            {description.hand.map(({ card, selectable, selected }) => (
              <button
                key={card.id}
                className="card"
                data-testid={`card-${card.id}`}
                aria-label={cardLabel(card)}
                aria-pressed={selected}
                disabled={!selectable}
                onClick={() => pick(card.id)}
              >
                {selected ? "✓ " : ""}
                {cardLabel(card)}
              </button>
            ))}
          </div>
        </>
      )}
      <h3>Actions</h3>
      <div className="buttons">
        {description.buttons.map((button) => (
          <span key={button.id} className="action">
            <button
              data-testid={button.id}
              disabled={button.disabled}
              aria-describedby={button.disabled && button.reason ? `why-${button.id}` : undefined}
              onClick={() => void press(button)}
            >
              {button.label}
            </button>
            {button.disabled && button.reason && <small id={`why-${button.id}`}> {button.reason}</small>}
          </span>
        ))}
      </div>
    </aside>
  );
}
