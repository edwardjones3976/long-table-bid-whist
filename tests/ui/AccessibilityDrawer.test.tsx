// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AccessibilityDrawer,
  DEFAULT_ACCESSIBILITY_SETTINGS,
} from '../../src/components/AccessibilityDrawer';

afterEach(cleanup);

describe('AccessibilityDrawer', () => {
  it('opens and closes with explicitly named controls', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <AccessibilityDrawer
        open={false}
        settings={DEFAULT_ACCESSIBILITY_SETTINGS}
        onOpenChange={onOpenChange}
        onSettingsChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Open accessibility settings' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    rerender(
      <AccessibilityDrawer
        open
        settings={DEFAULT_ACCESSIBILITY_SETTINGS}
        onOpenChange={onOpenChange}
        onSettingsChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('region', { name: 'Accessibility settings' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close accessibility settings' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('reports card-size and toggle changes as complete immutable settings values', () => {
    const onSettingsChange = vi.fn();
    render(
      <AccessibilityDrawer
        open
        settings={DEFAULT_ACCESSIBILITY_SETTINGS}
        onOpenChange={vi.fn()}
        onSettingsChange={onSettingsChange}
      />,
    );

    const scale = screen.getByRole('slider', { name: 'Card size' });
    expect(scale).toHaveValue('1');
    expect(screen.getByText('100%')).toBeVisible();
    fireEvent.change(scale, { target: { value: '1.25' } });
    expect(onSettingsChange).toHaveBeenLastCalledWith({
      ...DEFAULT_ACCESSIBILITY_SETTINGS,
      cardScale: 1.25,
    });

    const highContrast = screen.getByRole('checkbox', { name: /High contrast/i });
    expect(highContrast).not.toBeChecked();
    fireEvent.click(highContrast);
    expect(onSettingsChange).toHaveBeenLastCalledWith({
      ...DEFAULT_ACCESSIBILITY_SETTINGS,
      highContrast: true,
    });

    const sound = screen.getByRole('checkbox', { name: /Sound unavailable/i });
    expect(sound).not.toBeChecked();
    expect(sound).toBeDisabled();
    fireEvent.click(sound);
    expect(onSettingsChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ sound: true }),
    );

    const oneClickPlay = screen.getByRole('checkbox', { name: /One-click play/i });
    fireEvent.click(oneClickPlay);
    expect(onSettingsChange).toHaveBeenLastCalledWith({
      ...DEFAULT_ACCESSIBILITY_SETTINGS,
      oneClickPlay: true,
    });
  });
});
