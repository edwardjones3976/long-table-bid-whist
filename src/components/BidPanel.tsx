import { useState, type FormEvent } from 'react';
import { GameIcon } from './GameIcon';

export type BidKind = 'high' | 'low' | 'no-trump';

export interface BidChoice {
  id: string;
  level: 3 | 4 | 5 | 6 | 7;
  kind: BidKind;
  label?: string;
  disabled?: boolean;
}
const DEFAULT_BIDS: BidChoice[] = ([3, 4, 5, 6, 7] as const).flatMap((level) => [
  { id: `${level}-high`, level, kind: 'high' as const },
  { id: `${level}-low`, level, kind: 'low' as const },
  { id: `${level}-no-trump`, level, kind: 'no-trump' as const },
]);

function bidLabel(bid: BidChoice) {
  if (bid.label) return bid.label;
  if (bid.kind === 'no-trump') return `${bid.level} No Trump`;
  return `${bid.level} ${bid.kind === 'high' ? 'High' : 'Low'}`;
}

export interface BidPanelProps {
  bids?: BidChoice[];
  selectedBidId?: string | null;
  onSelect?: (bid: BidChoice) => void;
  onConfirm?: (bid: BidChoice) => void;
  onPass?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

export function BidPanel({
  bids = DEFAULT_BIDS,
  selectedBidId,
  onSelect,
  onConfirm,
  onPass,
  onCancel,
  disabled = false,
  className = '',
}: BidPanelProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const isControlled = selectedBidId !== undefined;
  const activeId = isControlled ? selectedBidId : internalSelectedId;
  const selectedBid = bids.find((bid) => bid.id === activeId) ?? null;

  function selectBid(bid: BidChoice) {
    if (disabled || bid.disabled) return;
    if (!isControlled) setInternalSelectedId(bid.id);
    onSelect?.(bid);
  }

  function submitBid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedBid && !selectedBid.disabled && !disabled) onConfirm?.(selectedBid);
  }

  return (
    <form
      className={`bid-panel glass-surface ${className}`.trim()}
      aria-label="Choose your bid"
      onSubmit={submitBid}
    >
      <div className="bid-panel__header">
        <div>
          <span>Your bid</span>
          <strong aria-live="polite">{selectedBid ? bidLabel(selectedBid) : 'Choose a contract'}</strong>
        </div>
        {onCancel ? (
          <button type="button" className="icon-button" aria-label="Cancel bidding" onClick={onCancel}>
            <GameIcon name="close" />
          </button>
        ) : null}
      </div>

      <div className="bid-panel__choices" role="group" aria-label="Legal bids">
        {bids.map((bid) => (
          <button
            key={bid.id}
            type="button"
            className="bid-panel__choice"
            disabled={disabled || bid.disabled}
            aria-pressed={activeId === bid.id}
            onClick={() => selectBid(bid)}
          >
            <span>{bid.level}</span>
            <small>{bid.kind === 'no-trump' ? 'No Trump' : bid.kind === 'high' ? 'High' : 'Low'}</small>
          </button>
        ))}
      </div>

      <div className="bid-panel__actions">
        <button type="button" className="game-button game-button--quiet" disabled={disabled} onClick={onPass}>
          Pass
        </button>
        <button
          type="submit"
          className="game-button game-button--primary"
          disabled={!selectedBid || selectedBid.disabled || disabled}
        >
          <GameIcon name="check" size={19} />
          Confirm bid
        </button>
      </div>
    </form>
  );
}
