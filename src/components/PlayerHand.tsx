import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { GameIcon } from './GameIcon';
import { PlayingCard } from './PlayingCard';
import type { CardModel } from './gameTypes';

export interface PlayerHandProps {
  cards: CardModel[];
  selectedCardId?: string | null;
  onSelect?: (card: CardModel) => void;
  onCommit?: (card: CardModel) => void;
  onPreview?: (card: CardModel) => void;
  disabled?: boolean;
  cardScale?: number;
  oneClickPlay?: boolean;
  showCommitButton?: boolean;
  commitLabel?: string;
  className?: string;
  ariaLabel?: string;
}

export function PlayerHand({
  cards,
  selectedCardId,
  onSelect,
  onCommit,
  onPreview,
  disabled = false,
  cardScale = 1,
  oneClickPlay = false,
  showCommitButton = true,
  commitLabel = 'Play selected',
  className = '',
  ariaLabel = 'Your hand',
}: PlayerHandProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [status, setStatus] = useState('Use left and right arrows to move through your hand.');
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isControlled = selectedCardId !== undefined;
  const activeSelectedId = isControlled ? selectedCardId : internalSelectedId;
  const selectedCard = useMemo(
    () => cards.find((card) => card.id === activeSelectedId) ?? null,
    [activeSelectedId, cards],
  );

  useEffect(() => {
    if (focusIndex >= cards.length) setFocusIndex(Math.max(0, cards.length - 1));
  }, [cards.length, focusIndex]);

  function setSelected(card: CardModel) {
    if (!isControlled) setInternalSelectedId(card.id);
    onSelect?.(card);
  }

  function cardIsPlayable(card: CardModel) {
    return !disabled && !card.disabled && card.legal !== false;
  }

  function explainUnavailable(card: CardModel) {
    const message = card.reason ?? 'That card is not legal for this trick.';
    setStatus(message);
  }

  function activateCard(card: CardModel) {
    if (!cardIsPlayable(card)) {
      explainUnavailable(card);
      return;
    }

    if (oneClickPlay) {
      setSelected(card);
      setStatus(`${card.rank} of ${card.suit} played.`);
      onCommit?.(card);
      return;
    }

    if (activeSelectedId === card.id) {
      setStatus(`${card.rank} of ${card.suit} played.`);
      onCommit?.(card);
      return;
    }

    setSelected(card);
    setStatus(`${card.rank} of ${card.suit} selected. Activate it again or use Play selected.`);
  }

  function commitSelected() {
    if (!selectedCard) {
      setStatus('Select a card first.');
      return;
    }
    if (!cardIsPlayable(selectedCard)) {
      explainUnavailable(selectedCard);
      return;
    }
    setStatus(`${selectedCard.rank} of ${selectedCard.suit} played.`);
    onCommit?.(selectedCard);
  }

  function focusCard(index: number) {
    if (!cards.length) return;
    const wrapped = (index + cards.length) % cards.length;
    setFocusIndex(wrapped);
    cardRefs.current[wrapped]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!cards.length) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      focusCard(focusIndex + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusCard(focusIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusCard(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusCard(cards.length - 1);
    }
  }

  const handStyle = {
    '--card-scale': Math.min(1.35, Math.max(0.75, cardScale)),
    '--hand-count': cards.length,
  } as CSSProperties;

  return (
    <section
      className={`player-hand ${className}`.trim()}
      style={handStyle}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      <div className="player-hand__cards" role="group" aria-label={`${cards.length} cards`}>
        {cards.map((card, index) => {
          const midpoint = (cards.length - 1) / 2;
          const offset = index - midpoint;
          const rotation = Math.max(-13, Math.min(13, offset * 1.9));
          const curve = Math.abs(offset) * Math.abs(offset) * 0.72;
          const cardStyle = {
            '--card-index': index,
            '--card-offset': offset,
            '--card-rotation': `${rotation}deg`,
            '--card-curve': `${curve}px`,
          } as CSSProperties;

          return (
            <PlayingCard
              key={card.id}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              card={card}
              selected={activeSelectedId === card.id}
              cardStyle={cardStyle}
              tabIndex={index === focusIndex ? 0 : -1}
              onPreview={(previewedCard) => {
                setFocusIndex(index);
                onPreview?.(previewedCard);
                if (!cardIsPlayable(previewedCard) && previewedCard.reason) {
                  setStatus(previewedCard.reason);
                }
              }}
              onActivate={activateCard}
            />
          );
        })}
      </div>

      {showCommitButton && !oneClickPlay ? (
        <button
          type="button"
          className="game-button game-button--primary player-hand__commit"
          disabled={!selectedCard || !cardIsPlayable(selectedCard)}
          onClick={commitSelected}
        >
          <GameIcon name="cards" size={20} />
          {commitLabel}
        </button>
      ) : null}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {status}
      </p>
    </section>
  );
}
