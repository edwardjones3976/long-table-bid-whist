// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayingCard } from '../../src/components/PlayingCard';
import type { CardModel } from '../../src/components/gameTypes';

afterEach(cleanup);

describe('PlayingCard', () => {
  it('exposes the full card identity and interaction state to assistive technology', () => {
    const card: CardModel = { id: 'ten-hearts', rank: 'T', suit: 'hearts' };
    const { rerender } = render(<PlayingCard card={card} />);

    const availableCard = screen.getByRole('button', {
      name: '10 of hearts, legal play',
    });
    expect(availableCard).toHaveAttribute('aria-pressed', 'false');
    expect(availableCard).toHaveAttribute('aria-disabled', 'false');

    rerender(<PlayingCard card={card} selected />);

    expect(
      screen.getByRole('button', {
        name: '10 of hearts, selected. Activate again to play.',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('labels hidden and unavailable cards without exposing decorative card marks', () => {
    const unavailable: CardModel = {
      id: 'two-clubs',
      rank: '2',
      suit: 'clubs',
      legal: false,
      reason: 'Follow suit.',
    };
    const { rerender } = render(<PlayingCard card={unavailable} />);

    expect(
      screen.getByRole('button', {
        name: '2 of clubs, unavailable: Follow suit.',
      }),
    ).toHaveAttribute('aria-disabled', 'true');

    rerender(
      <PlayingCard card={{ id: 'hidden', rank: 'A', suit: 'spades', faceDown: true }} />,
    );

    expect(screen.getByRole('button', { name: 'Face-down card, legal play' })).toBeVisible();
  });

  it('separates preview, activation, and deliberate double-click commit callbacks', () => {
    const card: CardModel = { id: 'ace-spades', rank: 'A', suit: 'spades' };
    const onPreview = vi.fn();
    const onActivate = vi.fn();
    const onCommit = vi.fn();
    render(
      <PlayingCard
        card={card}
        onPreview={onPreview}
        onActivate={onActivate}
        onCommit={onCommit}
      />,
    );

    const cardButton = screen.getByRole('button', { name: 'A of spades, legal play' });
    fireEvent.focus(cardButton);
    expect(onPreview).toHaveBeenCalledOnce();
    expect(onPreview).toHaveBeenLastCalledWith(card);

    fireEvent.click(cardButton);
    expect(onActivate).toHaveBeenCalledOnce();
    expect(onActivate).toHaveBeenLastCalledWith(card);
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.doubleClick(cardButton);
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenLastCalledWith(card);
  });
});
