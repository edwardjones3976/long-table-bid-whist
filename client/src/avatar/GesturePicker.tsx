/**
 * The desktop and phone gesture picker: a small panel of the gestures, numbered 1 to 7.
 *
 *   {picking && <GesturePicker onClose={...} />}   the HUD opens it with the G key or the Menu's Gestures button
 *
 * A number key plays that gesture while it is open, as does pressing its button; Escape closes it. After each
 * gesture the buttons wait out a short cooldown (avatar/gestures.ts), and the panel says so. It stays open for
 * another, and the player sees their own gesture in the foyer mirror.
 */
import { useEffect, useRef, type CSSProperties } from "react";
import { GESTURES } from "../../../shared/avatar";
import { playGesture, useGestureReady } from "./gestures";

/** Looks unavailable without losing keyboard focus, as a disabled button would. */
const WAITING: CSSProperties = { borderStyle: "dashed", color: "var(--muted)" };

const typing = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

export function GesturePicker({ onClose }: { onClose: () => void }) {
  const ready = useGestureReady();
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => first.current?.focus(), []);
  useEffect(() => {
    const keys = (event: KeyboardEvent): void => {
      if (typing(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      const gesture = GESTURES[Number(event.key) - 1];
      if (event.key === "Escape") onClose();
      else if (gesture && /^[1-9]$/.test(event.key)) {
        event.preventDefault();
        void playGesture(gesture.id);
      }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [onClose]);

  return (
    <div className="hud-menu" role="dialog" aria-label="Gestures" data-testid="gestures">
      <div className="buttons">
        {GESTURES.map(({ id, label }, i) => (
          <button
            key={id}
            ref={i === 0 ? first : undefined}
            data-testid={`gesture-${id}`}
            aria-keyshortcuts={String(i + 1)}
            aria-disabled={!ready || undefined}
            style={ready ? undefined : WAITING}
            onClick={() => void playGesture(id)}
          >
            {i + 1} {label}
          </button>
        ))}
        <button onClick={onClose}>Close</button>
      </div>
      <p aria-live="polite">{ready ? "Press 1 to 7, or choose one. G or Escape closes this." : "Playing. Ready again in a moment."}</p>
    </div>
  );
}
