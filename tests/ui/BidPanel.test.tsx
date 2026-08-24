// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BidPanel, type BidChoice } from '../../src/components/BidPanel';

afterEach(cleanup);

const bids: BidChoice[] = [
  { id: '3-high', level: 3, kind: 'high' },
  { id: '4-low', level: 4, kind: 'low' },
  { id: '5-no-trump', level: 5, kind: 'no-trump' },
];

describe('BidPanel', () => {
  it('selects a bid before allowing it to be confirmed', () => {
    const onSelect = vi.fn();
    const onConfirm = vi.fn();
    render(<BidPanel bids={bids} onSelect={onSelect} onConfirm={onConfirm} />);

    const confirm = screen.getByRole('button', { name: 'Confirm bid' });
    const highBid = screen.getByRole('button', { name: '3 High' });
    expect(confirm).toBeDisabled();
    expect(screen.getByText('Choose a contract')).toBeInTheDocument();

    fireEvent.click(highBid);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenLastCalledWith(bids[0]);
    expect(highBid).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('3 High')).toBeInTheDocument();
    expect(confirm).toBeEnabled();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenLastCalledWith(bids[0]);
  });

  it('passes without selecting or confirming a bid', () => {
    const onPass = vi.fn();
    const onConfirm = vi.fn();
    render(<BidPanel bids={bids} onPass={onPass} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pass' }));

    expect(onPass).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirm bid' })).toBeDisabled();
  });

  it('cancels a preview without confirming it', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <BidPanel
        bids={bids}
        selectedBidId="4-low"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel bidding' }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('prevents disabled panel and bid choices from invoking callbacks', () => {
    const onSelect = vi.fn();
    const onPass = vi.fn();
    const disabledBids: BidChoice[] = [
      { id: '3-high', level: 3, kind: 'high', disabled: true },
      bids[1],
    ];
    const { rerender } = render(
      <BidPanel bids={disabledBids} onSelect={onSelect} onPass={onPass} />,
    );

    const disabledChoice = screen.getByRole('button', { name: '3 High' });
    expect(disabledChoice).toBeDisabled();
    fireEvent.click(disabledChoice);
    expect(onSelect).not.toHaveBeenCalled();

    rerender(<BidPanel bids={bids} disabled onSelect={onSelect} onPass={onPass} />);
    expect(screen.getByRole('button', { name: 'Pass' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }));
    expect(onPass).not.toHaveBeenCalled();
  });
});
