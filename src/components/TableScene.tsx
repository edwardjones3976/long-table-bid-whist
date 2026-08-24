import { useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { PlayingCard } from './PlayingCard';
import type { TrickCard } from './gameTypes';

export interface TableSceneProps {
  scoreRail?: ReactNode;
  turnBanner?: ReactNode;
  centerTrick?: TrickCard[];
  playerHand?: ReactNode;
  actionRail?: ReactNode;
  rightDrawer?: ReactNode;
  utilityControls?: ReactNode;
  overlays?: ReactNode;
  backgroundSrc?: string;
  phase?: string;
  reducedMotion?: boolean;
  highContrast?: boolean;
  className?: string;
  children?: ReactNode;
}
export function TableScene({
  scoreRail,
  turnBanner,
  centerTrick = [],
  playerHand,
  actionRail,
  rightDrawer,
  utilityControls,
  overlays,
  backgroundSrc = '/assets/long-table-room.png',
  phase = 'playing',
  reducedMotion = false,
  highContrast = false,
  className = '',
  children,
}: TableSceneProps) {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (reducedMotion || event.pointerType === 'touch') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    setParallax({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
  }

  const sceneStyle = {
    '--parallax-x': `${parallax.x * -6}px`,
    '--parallax-y': `${parallax.y * -4}px`,
  } as CSSProperties;

  return (
    <main
      className={`table-scene${reducedMotion ? ' is-reduced-motion' : ''}${
        highContrast ? ' is-high-contrast' : ''
      } ${className}`.trim()}
      style={sceneStyle}
      data-phase={phase}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setParallax({ x: 0, y: 0 })}
    >
      <div className="table-scene__room" aria-hidden="true">
        <img src={backgroundSrc} alt="" draggable={false} />
      </div>
      <div className="table-scene__vignette" aria-hidden="true" />

      {scoreRail ? <div className="table-scene__score">{scoreRail}</div> : null}
      {turnBanner ? <div className="table-scene__turn">{turnBanner}</div> : null}
      {utilityControls ? <div className="table-scene__utilities">{utilityControls}</div> : null}

      <section className="table-scene__trick" aria-label="Current trick">
        {centerTrick.map(({ card, seat, playerName }, index) => (
          <div
            key={`${card.id}-${seat}`}
            className="table-scene__trick-card"
            data-seat={seat}
            style={{ '--play-order': index } as CSSProperties}
          >
            <PlayingCard card={card} compact tabIndex={-1} disabled aria-hidden="true" />
            <span className="sr-only">{playerName ? `${playerName} played ` : ''}{card.rank} of {card.suit}</span>
          </div>
        ))}
      </section>

      {children}
      {playerHand ? <div className="table-scene__hand">{playerHand}</div> : null}
      {actionRail ? <div className="table-scene__actions">{actionRail}</div> : null}
      {rightDrawer ? <div className="table-scene__drawer">{rightDrawer}</div> : null}
      {overlays ? <div className="table-scene__overlays">{overlays}</div> : null}
    </main>
  );
}
