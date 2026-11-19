/**
 * What both table interfaces (the DOM panel and the in-world one) need from the
 * stores, so they always agree:
 *
 *   useActiveTableId()            the table I am at, else the table I am standing at or picked
 *   useTableDescription(tableId)  describeTable() for that table, recomputed when anything changes
 *   pickCard(description, id)     toggle a card of my hand in the shared selection
 *   describeNow(tableId, picks)   describeTable() from the stores as they are this instant, with these cards picked
 *   runButton(button)             (net/run.ts) carry out a description button
 */
import { useMemo } from "react";
import type { TableId } from "../../../shared/protocol";
import { myTable, net, useStore } from "../net/store";
import { describeTable, toggleSelection, type TableDescription } from "../ui/actions";
import { local, useLocal } from "./local";

// Cards picked against an older table state may no longer be legal, so they are dropped the moment
// the table changes. Done here, once, and not in an effect of each interface: the DOM panel and the
// in-world table render separately, and the slower one's effect would wipe a card picked since.
let shown = "";
net.subscribe(() => {
  const table = net.getState().table;
  const now = table ? `${table.tableId}:${table.revision}` : "";
  if (now === shown) return;
  shown = now;
  if (local.getState().selection.length) local.set({ selection: [] });
});

export function useActiveTableId(): TableId | null {
  const mine = useStore((state) => myTable(state)?.id ?? null);
  const focus = useLocal((state) => state.focusTable);
  return mine ?? focus;
}

export function useTableDescription(tableId: TableId | null): TableDescription | null {
  const room = useStore((state) => state.room);
  const snapshot = useStore((state) => state.table);
  const mine = useStore((state) => myTable(state)?.id ?? null);
  const selection = useLocal((state) => state.selection);
  return useMemo(() => {
    const summary = room?.tables.find((table) => table.id === tableId);
    if (!room || !summary) return null;
    return describeTable({ summary, snapshot, meId: room.you, selection, elsewhere: mine !== null && mine !== tableId });
  }, [room, snapshot, mine, selection, tableId]);
}

/**
 * The table as it would be described with `selection` picked, read from the stores right now.
 * For a card dropped on the table: the button to press must be the one for that card, and the
 * rendered description only knows the cards picked before the drop.
 */
export function describeNow(tableId: TableId, selection: readonly string[]): TableDescription | null {
  const { room, table } = net.getState();
  const summary = room?.tables.find((entry) => entry.id === tableId);
  if (!room || !summary) return null;
  const mine = myTable(net.getState())?.id ?? null;
  return describeTable({ summary, snapshot: table, meId: room.you, selection, elsewhere: mine !== null && mine !== tableId });
}

export function pickCard(description: TableDescription, cardId: string): void {
  if (!description.hand.some((held) => held.card.id === cardId && held.selectable)) return;
  local.set({ selection: toggleSelection(local.getState().selection, cardId, description.selectionLimit) });
}
