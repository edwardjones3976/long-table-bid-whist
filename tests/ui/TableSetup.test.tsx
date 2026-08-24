// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TableSetup } from '../../src/components/TableSetup';

afterEach(cleanup);

describe('TableSetup', () => {
  it('does not render a setup dialog when closed', () => {
    render(
      <TableSetup
        open={false}
        mode="ai"
        onModeChange={vi.fn()}
        onStart={vi.fn()}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lets the player choose AI dealer or human host before starting the table', () => {
    const onModeChange = vi.fn();
    const onStart = vi.fn();
    const { rerender } = render(
      <TableSetup
        open
        mode="ai"
        rulesName="Strict Table v1"
        tableName="THE LONG TABLE"
        onModeChange={onModeChange}
        onStart={onStart}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'THE LONG TABLE' })).toBeVisible();
    expect(screen.getByText('Strict Table v1')).toBeVisible();
    const aiDealer = screen.getByRole('radio', { name: /AI Dealer/i });
    const humanHost = screen.getByRole('radio', { name: /Human Host/i });
    expect(aiDealer).toBeChecked();
    expect(humanHost).not.toBeChecked();

    fireEvent.click(humanHost);
    expect(onModeChange).toHaveBeenCalledOnce();
    expect(onModeChange).toHaveBeenLastCalledWith('human');

    fireEvent.keyDown(aiDealer, { key: 'Enter' });
    expect(onModeChange).toHaveBeenLastCalledWith('ai');

    fireEvent.keyDown(humanHost, { key: ' ' });
    expect(onModeChange).toHaveBeenLastCalledWith('human');

    rerender(
      <TableSetup
        open
        mode="human"
        rulesName="Strict Table v1"
        tableName="THE LONG TABLE"
        onModeChange={onModeChange}
        onStart={onStart}
      />,
    );
    expect(screen.getByRole('radio', { name: /Human Host/i })).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Take your seat' }));
    expect(onStart).toHaveBeenCalledOnce();
  });
});
