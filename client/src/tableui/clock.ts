/**
 * The turn clock and the match clock as this browser counts them. The server sends the time left and the time
 * run, not a deadline, so each is counted from when its snapshot arrived (net state tableAt and roomAt) and no
 * clock here has to agree with the server's.
 *
 *   useTurnClock()          the seat on the turn clock and its seconds left, or null
 *   useMatchTime(summary)   how long that table's match has run in ms, or null with no match
 *   useTurnCues()           my last ten seconds: a tick each second, and one buzz in each controller as they begin
 */
import { useEffect, useRef, useState } from "react";
import type { Seat, TableSummary } from "../../../shared/protocol";
import { buzz, cue } from "../controls/feedback";
import { useStore } from "../net/store";
import { xrStore } from "../state/xr";
import { matchElapsed, turnCue, turnLeft } from "./helpers";

/** Date.now(), drawn again four times a second while `on`. */
function useNow(on: boolean): number {
  const [, redraw] = useState(0);
  useEffect(() => {
    if (!on) return;
    const timer = setInterval(() => redraw((n) => n + 1), 250);
    return () => clearInterval(timer);
  }, [on]);
  return Date.now();
}

export function useTurnClock(): { seat: Seat; seconds: number; hurry: boolean; totalMs: number } | null {
  const clock = useStore((state) => state.table?.clock ?? null);
  const at = useStore((state) => state.tableAt);
  const now = useNow(clock !== null);
  return clock && { seat: clock.seat, totalMs: clock.totalMs, ...turnLeft(at + clock.remainingMs - now) };
}

export function useMatchTime(summary: TableSummary | undefined): number | null {
  const roomAt = useStore((state) => state.roomAt);
  const now = useNow(summary?.matchTime?.running === true);
  return matchElapsed(summary?.matchTime, roomAt, now);
}

/** Mounted once, in or out of VR: the cues follow the Sound and Vibration settings (controls/feedback.ts). */
export function useTurnCues(): void {
  const clock = useStore((state) => state.table?.clock ?? null);
  const at = useStore((state) => state.tableAt);
  const mine = useStore((state) => state.table?.you != null && state.table.clock?.seat === state.table.you);
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (!clock || !mine) {
      last.current = null;
      return;
    }
    const check = (): void => {
      const left = turnLeft(at + clock.remainingMs - Date.now()).seconds;
      const told = turnCue(left, last.current);
      last.current = left;
      if (!told) return;
      cue("tick");
      if (told === "buzz") for (const source of xrStore.getState().session?.inputSources ?? []) buzz("tick", source);
    };
    check();
    // Ten checks a second, so a tick is at most a tenth of a second after its second begins.
    const timer = setInterval(check, 100);
    return () => clearInterval(timer);
  }, [clock, at, mine]);
}
