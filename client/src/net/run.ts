/**
 * Carries out a button from ui/actions.ts. Both table interfaces (DOM panel and
 * in-world) call this and nothing else, so a button does the same thing everywhere.
 */
import type { Reply } from "../../../shared/protocol";
import { local } from "../state/local";
import type { ButtonRun, TableButton } from "../ui/actions";
import { net } from "./store";

async function run(what: ButtonRun): Promise<Reply> {
  switch (what.kind) {
    case "select-clear":
      return { ok: true };
    case "options":
      return net.setOptions(what.options);
    case "action":
      return net.act(what.action);
    case "socket":
      switch (what.call) {
        case "sit":
          return net.sit(what.args.tableId, what.args.role, what.args.seat);
        case "stand":
          return net.stand();
        case "ready":
          return net.setReady(true);
        case "unready":
          return net.setReady(false);
        case "start":
          return net.start();
        case "reset":
          return net.resetTable();
      }
  }
}

/**
 * Resolves to the server's reply; a disabled button does nothing. Cards spent by an accepted
 * action are dropped when its snapshot arrives (useTableActions), not here: the reply comes
 * after the snapshot, and by then the player may already have picked their next card.
 */
export async function runButton(button: TableButton): Promise<Reply | null> {
  if (button.disabled) return null;
  if (button.run.kind === "select-clear") local.set({ selection: [] });
  return run(button.run);
}
