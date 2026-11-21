/**
 * What a table interface needs to let a person act: the table described in
 * words and buttons, the shared card selection, and a way to press a button
 * that reports the server's refusal. Used by both the DOM panel and the
 * in-world table so they behave the same.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { TableId } from "../../../shared/protocol";
import { runButton } from "../net/run";
import { useStore } from "../net/store";
import { pickCard, useTableDescription } from "../state/table";
import type { TableButton, TableDescription } from "../ui/actions";
import { confirmButton } from "./helpers";

export interface TableActions {
  description: TableDescription | null;
  /** The server's last refusal, in its own words; null once something succeeds or the table moves on. */
  error: string | null;
  /** Toggle a card of my hand in the selection. */
  pick: (cardId: string) => void;
  /** As pick, but selecting an already picked single card plays or discards it. */
  activateCard: (cardId: string) => void;
  press: (button: TableButton) => Promise<void>;
  /** True while a pressed button is still waiting for the server's answer: a second move made now would be dropped. */
  busy: () => boolean;
}

const RELAY_GUARD_MS = 500;

/** Buttons that cannot be undone for the match: giving up the seat, wiping the results. */
function isDestructive(button: TableButton): boolean {
  return button.run.kind === "socket" && (button.run.call === "stand" || button.run.call === "reset");
}

export function useTableActions(tableId: TableId | null): TableActions {
  const description = useTableDescription(tableId);
  const revision = useStore((state) => (state.table?.tableId === tableId ? state.table.revision : null));
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  /** Goes up on every press and every table change: only the reply to the latest press, made since the last change, settles `pending` and the message. */
  const generation = useRef(0);
  const latest = useRef(description);
  const lastPress = useRef({ at: 0, id: "", destructive: false });
  latest.current = description;

  // (Picked cards are dropped on the same change, in state/table.ts.)
  useEffect(() => {
    setError(null);
    // The table has moved on, so a press made now is a new one even if the last reply is still on its way.
    pending.current = false;
    generation.current += 1;
  }, [tableId, revision]);

  const press = useCallback(async (button: TableButton): Promise<void> => {
    // One request at a time: a double press must not send the action twice.
    if (button.disabled || pending.current) return;
    // A new snapshot re-lays the buttons: the second half of a double press on another button must not land on Leave or
    // New game. Leave re-lays them on the spot (I am a visitor at once), so right after it no other button is taken either:
    // the second half of a double press on Leave must not land on the seat just left.
    const last = lastPress.current;
    const now = performance.now();
    const destructive = isDestructive(button);
    lastPress.current = { at: now, id: button.id, destructive };
    if ((destructive || last.destructive) && last.id !== button.id && now - last.at < RELAY_GUARD_MS) return;
    pending.current = true;
    const mine = ++generation.current;
    const reply = await runButton(button);
    // A reply that lands after the table moved on must not free a newer press still waiting, nor show an old refusal.
    // Except a refused Leave: the table moved on by that press itself (and back, on the refusal), and the refusal is why
    // I am still seated, so it is shown unless a newer press is already waiting.
    if (generation.current !== mine) {
      if (destructive && button.run.kind === "socket" && button.run.call === "stand" && reply && !reply.ok && !pending.current) setError(reply.message);
      return;
    }
    pending.current = false;
    // A stale revision needs no message: the newer snapshot shows what changed.
    setError(reply && !reply.ok && reply.error !== "stale-revision" ? reply.message : null);
  }, []);

  const pick = useCallback((cardId: string): void => {
    if (latest.current) pickCard(latest.current, cardId);
  }, []);

  const activateCard = useCallback(
    (cardId: string): void => {
      const now = latest.current;
      if (!now) return;
      const confirm = confirmButton(now);
      if (confirm && now.hand.some((held) => held.card.id === cardId && held.selected)) void press(confirm);
      else pickCard(now, cardId);
    },
    [press],
  );

  const busy = useCallback((): boolean => pending.current, []);

  return { description, error, pick, activateCard, press, busy };
}
