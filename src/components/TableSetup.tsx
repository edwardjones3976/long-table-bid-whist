import type { KeyboardEvent } from 'react';
import type { DealerMode } from './gameTypes';
import { GameIcon } from './GameIcon';

export interface TableSetupProps {
  open: boolean;
  mode: DealerMode;
  onModeChange: (mode: DealerMode) => void;
  onStart: () => void;
  rulesName?: string;
  tableName?: string;
  className?: string;
}

export function TableSetup({
  open,
  mode,
  onModeChange,
  onStart,
  rulesName = 'Strict Table',
  tableName = 'THE LONG TABLE',
  className = '',
}: TableSetupProps) {
  if (!open) return null;

  function selectModeFromKeyboard(event: KeyboardEvent<HTMLInputElement>, nextMode: DealerMode) {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    onModeChange(nextMode);
  }

  return (
    <div className={`modal-layer table-setup ${className}`.trim()}>
      <section className="table-setup__panel glass-surface" role="dialog" aria-modal="true" aria-labelledby="table-setup-title">
        <div className="table-setup__mark" aria-hidden="true">
          <GameIcon name="cards" size={31} />
        </div>
        <h1 id="table-setup-title">{tableName}</h1>
        <p className="table-setup__rules">{rulesName}</p>

        <fieldset className="table-setup__modes">
          <legend>Who is running the table?</legend>
          <label className={mode === 'ai' ? 'is-selected' : ''}>
            <input
              type="radio"
              name="dealer-mode"
              value="ai"
              checked={mode === 'ai'}
              onChange={() => onModeChange('ai')}
              onKeyDown={(event) => selectModeFromKeyboard(event, 'ai')}
            />
            <span className="table-setup__mode-icon" aria-hidden="true">
              <GameIcon name="robot" />
            </span>
            <span>
              <strong>AI Dealer</strong>
              <small>Keeps the deal, rules, and pace moving.</small>
            </span>
          </label>
          <label className={mode === 'human' ? 'is-selected' : ''}>
            <input
              type="radio"
              name="dealer-mode"
              value="human"
              checked={mode === 'human'}
              onChange={() => onModeChange('human')}
              onKeyDown={(event) => selectModeFromKeyboard(event, 'human')}
            />
            <span className="table-setup__mode-icon" aria-hidden="true">
              <GameIcon name="host" />
            </span>
            <span>
              <strong>Human Host</strong>
              <small>Welcomes players and manages the room—not hidden cards.</small>
            </span>
          </label>
        </fieldset>

        <p className="table-setup__avatar-note">
          Human seats use each player's Meta avatar on Quest. This browser prototype keeps those
          seats open rather than assigning characters.
        </p>

        <button type="button" className="game-button game-button--primary table-setup__start" onClick={onStart} autoFocus>
          Take your seat
          <GameIcon name="arrow-right" size={20} />
        </button>
      </section>
    </div>
  );
}
