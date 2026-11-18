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
  const latest = useRef(description);
  const lastPress = useRef({ at: 0, id: "" });
  latest.current = description;

  // (Picked cards are dropped on the same change, in state/table.ts.)
  useEffect(() => {
    setError(null);
    // The table has moved on, so a press made now is a new one even if the last reply is still on its way.
    pending.current = false;
  }, [tableId, revision]);

  const press = useCallback(async (button: TableButton): Promise<void> => {
    // One request at a time: a double press must not send the action twice.
    if (button.disabled || pending.current) return;
    // A new snapshot re-lays the buttons: the second half of a double press on another button must not land on Leave or New game.
    const last = lastPress.current;
    const now = performance.now();
    lastPress.current = { at: now, id: button.id };
    if (isDestructive(button) && last.id !== button.id && now - last.at < RELAY_GUARD_MS) return;
    pending.current = true;
    const reply = await runButton(button);
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

  return { description, error, pick, activateCard, press };
}
