import { GameIcon, type GameIconName } from './GameIcon';

interface HostActionProps {
  icon: GameIconName;
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}
function HostAction({ icon, label, pressed, disabled, onClick }: HostActionProps) {
  return (
    <button
      type="button"
      className="host-drawer__action"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <GameIcon name={icon} size={25} />
      <span>{label}</span>
      {pressed ? <span className="host-drawer__active-dot" aria-hidden="true" /> : null}
    </button>
  );
}

export interface HostDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pausedBetweenHands?: boolean;
  muted?: boolean;
  musicOff?: boolean;
  canAddAI?: boolean;
  onInvite?: () => void;
  onTogglePause?: () => void;
  onToggleMute?: () => void;
  onAddAI?: () => void;
  onToggleMusic?: () => void;
  className?: string;
}

export function HostDrawer({
  open,
  onOpenChange,
  pausedBetweenHands = false,
  muted = false,
  musicOff = true,
  canAddAI = true,
  onInvite,
  onTogglePause,
  onToggleMute,
  onAddAI,
  onToggleMusic,
  className = '',
}: HostDrawerProps) {
  return (
    <aside className={`host-drawer${open ? ' is-open' : ''} ${className}`.trim()}>
      {!open ? (
        <button
          type="button"
          className="host-drawer__trigger glass-surface"
          aria-expanded="false"
          aria-controls="host-controls"
          onClick={() => onOpenChange(true)}
        >
          <GameIcon name="host" />
          <span>Host</span>
        </button>
      ) : (
        <section id="host-controls" className="host-drawer__panel glass-surface" aria-label="Host controls">
          <header className="host-drawer__header">
            <h2>Host</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Close Host drawer"
              aria-expanded="true"
              onClick={() => onOpenChange(false)}
            >
              <GameIcon name="chevron" />
            </button>
          </header>
          <div className="host-drawer__rule" />
          <div className="host-drawer__actions">
            <HostAction icon="invite" label="Invite" onClick={onInvite} />
            <HostAction
              icon="pause"
              label="Pause Between Hands"
              pressed={pausedBetweenHands}
              onClick={onTogglePause}
            />
            <HostAction icon="microphone" label="Mute" pressed={muted} onClick={onToggleMute} />
            <HostAction icon="add-player" label="Add AI" disabled={!canAddAI} onClick={onAddAI} />
            <HostAction icon="music" label="Music Off" pressed={musicOff} onClick={onToggleMusic} />
          </div>
          <p className="host-drawer__permission">
            The host manages the room, never hidden cards or committed deals.
          </p>
        </section>
      )}
    </aside>
  );
}
