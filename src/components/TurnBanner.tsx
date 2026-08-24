import type { DealerMode } from './gameTypes';
import { GameIcon } from './GameIcon';

export interface TurnBannerProps {
  currentActor: string;
  isLocalTurn?: boolean;
  mode: DealerMode;
  seatLabel?: string;
  phaseLabel?: string;
  className?: string;
}

export function TurnBanner({
  currentActor,
  isLocalTurn = false,
  mode,
  seatLabel = 'N',
  phaseLabel,
  className = '',
}: TurnBannerProps) {
  const handComplete = phaseLabel?.trim().toLowerCase() === 'hand complete';
  const turnText = handComplete ? 'Hand complete' : isLocalTurn ? 'Your turn' : `${currentActor}'s turn`;

  return (
    <section
      className={`turn-banner ${isLocalTurn ? 'is-local' : ''} ${className}`.trim()}
      aria-live="polite"
      aria-label={`${turnText}. ${mode === 'ai' ? 'AI Dealer' : 'Human Host'}.`}
    >
      <div className="turn-banner__seat" aria-hidden="true">
        {seatLabel}
      </div>
      <div className="turn-banner__mode">
        {mode === 'ai' ? <GameIcon name="robot" size={18} /> : null}
        {mode === 'ai' ? 'AI Dealer' : 'Human Host'}
      </div>
      <div className="turn-banner__message">
        <strong>{turnText}</strong>
        {phaseLabel && !handComplete ? <span>{phaseLabel}</span> : null}
      </div>
      <span className="turn-banner__pointer" aria-hidden="true" />
    </section>
  );
}
