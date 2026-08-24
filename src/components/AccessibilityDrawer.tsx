import { GameIcon } from './GameIcon';

export interface AccessibilitySettings {
  cardScale: number;
  highContrast: boolean;
  reducedMotion: boolean;
  sound: boolean;
  captions: boolean;
  oneClickPlay: boolean;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  cardScale: 1,
  highContrast: false,
  reducedMotion: false,
  sound: false,
  captions: true,
  oneClickPlay: false,
};

export interface AccessibilityDrawerProps {
  open: boolean;
  settings: AccessibilitySettings;
  onOpenChange: (open: boolean) => void;
  onSettingsChange: (settings: AccessibilitySettings) => void;
  className?: string;
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ label, description, checked, disabled = false, onChange }: ToggleRowProps) {
  return (
    <label className="accessibility-drawer__toggle">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          if (!disabled) onChange(event.target.checked);
        }}
      />
      <span className="toggle-switch" aria-hidden="true" />
    </label>
  );
}

export function AccessibilityDrawer({
  open,
  settings,
  onOpenChange,
  onSettingsChange,
  className = '',
}: AccessibilityDrawerProps) {
  function update<K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) {
    onSettingsChange({ ...settings, [key]: value });
  }

  return (
    <aside className={`accessibility-drawer${open ? ' is-open' : ''} ${className}`.trim()}>
      {!open ? (
        <button
          type="button"
          className="accessibility-drawer__trigger icon-button glass-surface"
          aria-label="Open accessibility settings"
          aria-expanded="false"
          aria-controls="accessibility-controls"
          onClick={() => onOpenChange(true)}
        >
          <GameIcon name="accessibility" />
        </button>
      ) : (
        <section
          id="accessibility-controls"
          className="accessibility-drawer__panel glass-surface"
          aria-label="Accessibility settings"
        >
          <header className="accessibility-drawer__header">
            <div>
              <h2>Accessibility</h2>
              <p>Set the table for how you play.</p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Close accessibility settings"
              onClick={() => onOpenChange(false)}
            >
              <GameIcon name="close" />
            </button>
          </header>

          <label className="accessibility-drawer__scale">
            <span>
              <strong>Card size</strong>
              <output>{Math.round(settings.cardScale * 100)}%</output>
            </span>
            <input
              type="range"
              aria-label="Card size"
              min="0.8"
              max="1.3"
              step="0.05"
              value={settings.cardScale}
              onChange={(event) => update('cardScale', Number(event.target.value))}
            />
          </label>

          <div className="accessibility-drawer__toggles">
            <ToggleRow
              label="High contrast"
              description="Stronger card and control edges"
              checked={settings.highContrast}
              onChange={(value) => update('highContrast', value)}
            />
            <ToggleRow
              label="Reduced motion"
              description="Stops parallax and table animation"
              checked={settings.reducedMotion}
              onChange={(value) => update('reducedMotion', value)}
            />
            <ToggleRow
              label="Sound unavailable"
              description="No audio ships in this browser prototype"
              checked={settings.sound}
              disabled
              onChange={(value) => update('sound', value)}
            />
            <ToggleRow
              label="Captions"
              description="Show spoken table cues"
              checked={settings.captions}
              onChange={(value) => update('captions', value)}
            />
            <ToggleRow
              label="One-click play"
              description="Play a legal card in one action"
              checked={settings.oneClickPlay}
              onChange={(value) => update('oneClickPlay', value)}
            />
          </div>
        </section>
      )}
    </aside>
  );
}
