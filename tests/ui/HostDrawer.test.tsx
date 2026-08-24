// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HostDrawer } from '../../src/components/HostDrawer';

afterEach(cleanup);

describe('HostDrawer', () => {
  it('opens and closes through named disclosure controls', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<HostDrawer open={false} onOpenChange={onOpenChange} />);

    const trigger = screen.getByRole('button', { name: 'Host' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: 'Host controls' })).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    rerender(<HostDrawer open onOpenChange={onOpenChange} />);
    expect(screen.getByRole('region', { name: 'Host controls' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close Host drawer' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('offers room-management actions while explicitly excluding hidden-card authority', () => {
    const onInvite = vi.fn();
    const onTogglePause = vi.fn();
    const onToggleMute = vi.fn();
    const onAddAI = vi.fn();
    const onToggleMusic = vi.fn();
    render(
      <HostDrawer
        open
        onOpenChange={vi.fn()}
        pausedBetweenHands
        muted
        musicOff
        canAddAI={false}
        onInvite={onInvite}
        onTogglePause={onTogglePause}
        onToggleMute={onToggleMute}
        onAddAI={onAddAI}
        onToggleMusic={onToggleMusic}
      />,
    );

    const pause = screen.getByRole('button', { name: 'Pause Between Hands' });
    const mute = screen.getByRole('button', { name: 'Mute' });
    const music = screen.getByRole('button', { name: 'Music Off' });
    const addAI = screen.getByRole('button', { name: 'Add AI' });
    expect(pause).toHaveAttribute('aria-pressed', 'true');
    expect(mute).toHaveAttribute('aria-pressed', 'true');
    expect(music).toHaveAttribute('aria-pressed', 'true');
    expect(addAI).toBeDisabled();
    expect(
      screen.getByText('The host manages the room, never hidden cards or committed deals.'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /hidden cards|change deal|redeal/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    fireEvent.click(pause);
    fireEvent.click(mute);
    fireEvent.click(music);
    fireEvent.click(addAI);

    expect(onInvite).toHaveBeenCalledOnce();
    expect(onTogglePause).toHaveBeenCalledOnce();
    expect(onToggleMute).toHaveBeenCalledOnce();
    expect(onToggleMusic).toHaveBeenCalledOnce();
    expect(onAddAI).not.toHaveBeenCalled();
  });
});
