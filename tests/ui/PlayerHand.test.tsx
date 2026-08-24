// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerHand } from '../../src/components/PlayerHand';
import type { CardModel } from '../../src/components/gameTypes';

afterEach(cleanup);

const cards: CardModel[] = [
  { id: 'ace-spades', rank: 'A', suit: 'spades' },
  { id: 'king-hearts', rank: 'K', suit: 'hearts' },
  {
    id: 'two-clubs',
    rank: '2',
    suit: 'clubs',
    legal: false,
    reason: 'You must follow hearts.',
  },
];

describe('PlayerHand', () => {
  it('previews on focus, selects on first activation, and commits only after confirmation', () => {
    const onPreview = vi.fn();
    const onSelect = vi.fn();
    const onCommit = vi.fn();
    render(
      <PlayerHand
        cards={cards}
        onPreview={onPreview}
        onSelect={onSelect}
        onCommit={onCommit}
      />,
    );

    const ace = screen.getByRole('button', { name: 'A of spades, legal play' });
    const confirm = screen.getByRole('button', { name: 'Play selected' });
    expect(confirm).toBeDisabled();

    fireEvent.focus(ace);
    expect(onPreview).toHaveBeenCalledWith(cards[0]);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.click(ace);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenLastCalledWith(cards[0]);
    expect(onCommit).not.toHaveBeenCalled();
    expect(confirm).toBeEnabled();
    expect(
      screen.getByRole('button', {
        name: 'A of spades, selected. Activate again to play.',
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(confirm);
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenLastCalledWith(cards[0]);
  });

  it('uses a second activation as an explicit commit', () => {
    const onCommit = vi.fn();
    render(<PlayerHand cards={cards} onCommit={onCommit} />);

    const king = screen.getByRole('button', { name: 'K of hearts, legal play' });
    fireEvent.click(king);
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.click(king);
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenLastCalledWith(cards[1]);
  });

  it('supports arrow, Home, and End navigation with one roving tab stop', () => {
    const onPreview = vi.fn();
    render(<PlayerHand cards={cards} onPreview={onPreview} />);

    const hand = screen.getByRole('region', { name: 'Your hand' });
    const ace = screen.getByRole('button', { name: 'A of spades, legal play' });
    const king = screen.getByRole('button', { name: 'K of hearts, legal play' });
    const two = screen.getByRole('button', {
      name: '2 of clubs, unavailable: You must follow hearts.',
    });

    ace.focus();
    fireEvent.keyDown(hand, { key: 'ArrowRight' });
    expect(king).toHaveFocus();
    expect(king).toHaveAttribute('tabindex', '0');
    expect(ace).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(hand, { key: 'End' });
    expect(two).toHaveFocus();

    fireEvent.keyDown(hand, { key: 'Home' });
    expect(ace).toHaveFocus();

    fireEvent.keyDown(hand, { key: 'ArrowLeft' });
    expect(two).toHaveFocus();
    expect(onPreview).toHaveBeenLastCalledWith(cards[2]);
  });

  it('keeps unavailable cards from being selected or committed and announces why', () => {
    const onSelect = vi.fn();
    const onCommit = vi.fn();
    render(<PlayerHand cards={cards} onSelect={onSelect} onCommit={onCommit} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: '2 of clubs, unavailable: You must follow hearts.',
      }),
    );

    expect(onSelect).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText('You must follow hearts.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play selected' })).toBeDisabled();
  });
});
