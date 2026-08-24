import { GameIcon } from './GameIcon';

export type HandResult = 'made' | 'set' | 'push';

export interface HandSummaryProps {
  open: boolean;
  result: HandResult;
  contract: string;
  books: number;
  northSouthBefore: number;
  northSouthAfter: number;
  eastWestBefore: number;
  eastWestAfter: number;
  pausedBetweenHands?: boolean;
  onTogglePause?: () => void;
  onNextHand: () => void;
  onNewTable: () => void;
  className?: string;
}

const RESULT_COPY: Record<HandResult, string> = {
  made: 'Contract made',
  set: 'Contract set',
  push: 'Hand complete',
};

export function HandSummary({
  open,
  result,
  contract,
  books,
  northSouthBefore,
  northSouthAfter,
  eastWestBefore,
  eastWestAfter,
  pausedBetweenHands = false,
  onTogglePause,
  onNextHand,
  onNewTable,
  className = '',
}: HandSummaryProps) {
  if (!open) return null;

  return (
    <div className={`modal-layer hand-summary ${className}`.trim()}>
      <section className="hand-summary__panel glass-surface" role="dialog" aria-modal="true" aria-labelledby="hand-summary-title">
        <span className={`hand-summary__result hand-summary__result--${result}`}>
          {result === 'made' ? <GameIcon name="check" size={18} /> : null}
          {RESULT_COPY[result]}
        </span>
        <h2 id="hand-summary-title">{contract}</h2>
        <p>{books} books</p>

        <dl className="hand-summary__scores">
          <div>
            <dt>North & South</dt>
            <dd>
              <span>{northSouthBefore}</span>
              <GameIcon name="arrow-right" size={17} />
              <strong>{northSouthAfter}</strong>
            </dd>
          </div>
          <div>
            <dt>East & West</dt>
            <dd>
              <span>{eastWestBefore}</span>
              <GameIcon name="arrow-right" size={17} />
              <strong>{eastWestAfter}</strong>
            </dd>
          </div>
        </dl>

        {onTogglePause ? (
          <button
            type="button"
            className="game-button game-button--quiet hand-summary__pause"
            aria-pressed={pausedBetweenHands}
            onClick={onTogglePause}
          >
            {pausedBetweenHands ? 'Resume table' : 'Pause table'}
          </button>
        ) : null}

        <div className="hand-summary__actions">
          <button type="button" className="game-button game-button--quiet" onClick={onNewTable}>
            New table
          </button>
          <button
            type="button"
            className="game-button game-button--primary"
            disabled={pausedBetweenHands}
            onClick={onNextHand}
            autoFocus
          >
            Next hand
            <GameIcon name="arrow-right" size={19} />
          </button>
        </div>
      </section>
    </div>
  );
}
