// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../../src/App';

afterEach(cleanup);

function startTable(mode: 'AI Dealer' | 'Human Host') {
  const modeControl = screen.getByRole('radio', { name: new RegExp(mode, 'i') });
  fireEvent.click(modeControl);
  expect(modeControl).toBeChecked();

  fireEvent.click(screen.getByRole('button', { name: /take your seat/i }));
}

function scoreTransition(summary: HTMLElement, teamName: string): [number, number] {
  const scoreRow = within(summary).getByText(teamName).closest('div');
  if (!scoreRow) throw new Error(`Missing score row for ${teamName}.`);

  const before = scoreRow.querySelector('dd span');
  const after = scoreRow.querySelector('dd strong');
  expect(before).toBeVisible();
  expect(after).toBeVisible();

  return [Number(before?.textContent), Number(after?.textContent)];
}

describe('App table flows', () => {
  it('completes an AI Dealer hand from 5 High through the terminal score without deadlocking', () => {
    render(<App />);

    startTable('AI Dealer');
    expect(screen.getByText(/AI Dealer table ready/i)).toBeInTheDocument();

    const fiveHigh = screen.getByRole('button', { name: '5 High' });
    expect(fiveHigh).toBeEnabled();
    fireEvent.click(fiveHigh);
    expect(fiveHigh).toHaveAttribute('aria-pressed', 'true');

    const confirmBid = screen.getByRole('button', { name: /confirm bid/i });
    expect(confirmBid).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /cancel bidding/i }));
    expect(fiveHigh).toHaveAttribute('aria-pressed', 'false');
    expect(confirmBid).toBeDisabled();
    expect(screen.getByText(/Bid selection canceled\. Auction unchanged\./i)).toBeVisible();

    fireEvent.click(fiveHigh);
    expect(confirmBid).toBeEnabled();
    fireEvent.click(confirmBid);

    const spades = screen.getByRole('button', { name: 'Spades' });
    expect(spades).toBeEnabled();
    fireEvent.click(spades);

    const discardPicker = screen.getByRole('region', {
      name: 'Choose six cards for the kitty',
    });
    const kittyCandidates = within(discardPicker).getAllByRole('button');
    expect(kittyCandidates).toHaveLength(18);

    kittyCandidates.slice(0, 6).forEach((card) => fireEvent.click(card));
    expect(within(discardPicker).getByText('6 of 6 selected')).toBeVisible();

    const commitDiscard = screen.getByRole('button', { name: 'Return 6/6 to kitty' });
    expect(commitDiscard).toBeEnabled();
    fireEvent.click(commitDiscard);

    let humanTurns = 0;
    while (humanTurns < 12 && !screen.queryByRole('dialog', { name: '5 High' })) {
      const hand = screen.queryByRole('region', { name: 'Your hand' });
      expect(hand, `human turn ${humanTurns + 1} should expose a playable hand`).not.toBeNull();
      if (!hand) throw new Error(`The hand deadlocked before human turn ${humanTurns + 1}.`);

      const legalCards = within(hand).getAllByRole('button', { name: /legal play$/i });
      expect(
        legalCards.length,
        `human turn ${humanTurns + 1} should have at least one legal card`,
      ).toBeGreaterThan(0);

      fireEvent.click(legalCards[0]);
      const playSelected = within(hand).getByRole('button', { name: 'Play selected' });
      expect(playSelected).toBeEnabled();
      fireEvent.click(playSelected);
      humanTurns += 1;
    }

    expect(humanTurns).toBe(12);
    const summary = screen.getByRole('dialog', { name: '5 High' });
    expect(summary).toBeVisible();
    expect(within(summary).getByText(/Contract (?:made|set)/)).toBeVisible();
    expect(within(summary).getByText(/^\d+ books$/)).toBeVisible();
    expect(screen.getByRole('region', { name: 'Hand complete. AI Dealer.' })).toBeVisible();

    const northSouth = scoreTransition(summary, 'North & South');
    const eastWest = scoreTransition(summary, 'East & West');
    expect(northSouth[0]).toBe(0);
    expect(northSouth[1]).not.toBe(northSouth[0]);
    expect(eastWest).toEqual([0, 0]);
    const nextHand = within(summary).getByRole('button', { name: /next hand/i });
    const pauseTable = within(summary).getByRole('button', { name: /pause table/i });
    expect(nextHand).toBeEnabled();
    fireEvent.click(pauseTable);
    expect(within(summary).getByRole('button', { name: /resume table/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(nextHand).toBeDisabled();
    fireEvent.click(within(summary).getByRole('button', { name: /resume table/i }));
    expect(nextHand).toBeEnabled();
  });

  it('uses Human Host presentation without revealing hidden-card or deal-edit powers', () => {
    render(<App />);

    expect(screen.getByRole('radio', { name: /AI Dealer/i })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: /Human Host/i }));
    expect(screen.getByRole('radio', { name: /Human Host/i })).toBeChecked();

    const avatarNote = screen.getByText(/Human seats use each player's Meta avatar on Quest/i);
    expect(avatarNote).toHaveTextContent(
      /browser prototype keeps those seats open rather than assigning characters/i,
    );

    fireEvent.click(screen.getByRole('button', { name: /take your seat/i }));

    const turnPresentation = screen.getByRole('region', { name: /Human Host/i });
    expect(within(turnPresentation).getByText('Human Host')).toBeVisible();
    expect(turnPresentation).toHaveAccessibleName(/Human Host/);
    expect(turnPresentation).not.toHaveAccessibleName(/AI Dealer/);

    const hostControls = screen.getByRole('region', { name: 'Host controls' });
    expect(within(hostControls).getByRole('button', { name: 'Invite' })).toBeEnabled();
    expect(
      within(hostControls).getByRole('button', { name: 'Pause Between Hands' }),
    ).toBeEnabled();
    expect(within(hostControls).getByRole('button', { name: 'Mute' })).toBeEnabled();
    expect(within(hostControls).getByRole('button', { name: 'Add AI' })).toBeDisabled();
    expect(within(hostControls).getByRole('button', { name: 'Music Off' })).toBeEnabled();
    expect(within(hostControls).getAllByRole('button')).toHaveLength(6);
    expect(
      within(hostControls).getByText(
        'The host manages the room, never hidden cards or committed deals.',
      ),
    ).toBeVisible();

    const forbiddenHostPowers = [
      /reveal/i,
      /peek/i,
      /show hidden/i,
      /inspect hidden/i,
      /view (?:the )?(?:kitty|deck|opponent hand)/i,
      /edit (?:the )?deal/i,
      /change (?:the )?deal/i,
      /modify (?:the )?deal/i,
      /redeal/i,
      /deal (?:a )?card/i,
      /stack (?:the )?deck/i,
      /shuffle (?:the )?deck/i,
    ];
    forbiddenHostPowers.forEach((name) => {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    });
  });
});
