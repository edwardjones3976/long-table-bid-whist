import { forwardRef, type ButtonHTMLAttributes, type CSSProperties } from 'react';
import type { CardModel, CardSuit } from './gameTypes';

const SUIT_SYMBOL: Record<CardSuit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
  joker: '★',
};

const SUIT_NAME: Record<CardSuit, string> = {
  clubs: 'clubs',
  diamonds: 'diamonds',
  hearts: 'hearts',
  spades: 'spades',
  joker: 'joker',
};

export interface PlayingCardProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onSelect'> {
  card: CardModel;
  selected?: boolean;
  justPlayed?: boolean;
  compact?: boolean;
  cardStyle?: CSSProperties;
  onPreview?: (card: CardModel) => void;
  onActivate?: (card: CardModel) => void;
  onCommit?: (card: CardModel) => void;
}

export const PlayingCard = forwardRef<HTMLButtonElement, PlayingCardProps>(
  function PlayingCard(
    {
      card,
      selected = false,
      justPlayed = false,
      compact = false,
      cardStyle,
      className = '',
      onPreview,
      onActivate,
      onCommit,
      onDoubleClick,
      disabled,
      ...buttonProps
    },
    ref,
  ) {
    const isRed = card.suit === 'diamonds' || card.suit === 'hearts';
    const isDisabled = disabled || card.disabled;
    const isLegal = card.legal !== false && !isDisabled;
    const label = card.faceDown
      ? 'Face-down card'
      : `${card.rank === 'T' ? '10' : card.rank} of ${SUIT_NAME[card.suit]}`;
    const stateLabel = !isLegal
      ? `${label}, unavailable${card.reason ? `: ${card.reason}` : ''}`
      : selected
        ? `${label}, selected. Activate again to play.`
        : `${label}${isLegal ? ', legal play' : ''}`;

    return (
      <button
        {...buttonProps}
        ref={ref}
        type="button"
        className={`playing-card${card.faceDown ? ' playing-card--back' : ''}${
          isRed ? ' playing-card--red' : ''
        }${selected ? ' is-selected' : ''}${isLegal ? ' is-legal' : ' is-illegal'}${
          justPlayed ? ' is-just-played' : ''
        }${compact ? ' playing-card--compact' : ''} ${className}`.trim()}
        style={{ ...cardStyle, ...buttonProps.style }}
        aria-label={stateLabel}
        aria-pressed={selected}
        aria-disabled={!isLegal}
        data-card-id={card.id}
        data-suit={card.suit}
        onFocus={() => onPreview?.(card)}
        onClick={() => {
          if (isLegal) onActivate?.(card);
          else onPreview?.(card);
        }}
        onDoubleClick={(event) => {
          onDoubleClick?.(event);
          if (isLegal) onCommit?.(card);
        }}
      >
        {card.faceDown ? (
          <span className="playing-card__back-pattern" aria-hidden="true">
            <span>LT</span>
          </span>
        ) : (
          <>
            <span className="playing-card__corner playing-card__corner--top" aria-hidden="true">
              <strong>{card.rank}</strong>
              <span>{SUIT_SYMBOL[card.suit]}</span>
            </span>
            <span className="playing-card__pip" aria-hidden="true">
              {SUIT_SYMBOL[card.suit]}
            </span>
            <span className="playing-card__corner playing-card__corner--bottom" aria-hidden="true">
              <strong>{card.rank}</strong>
              <span>{SUIT_SYMBOL[card.suit]}</span>
            </span>
          </>
        )}
      </button>
    );
  },
);
