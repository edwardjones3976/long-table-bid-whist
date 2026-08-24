import type { SVGProps } from 'react';

export type GameIconName =
  | 'accessibility'
  | 'add-player'
  | 'arrow-right'
  | 'cards'
  | 'check'
  | 'chevron'
  | 'close'
  | 'host'
  | 'invite'
  | 'menu'
  | 'microphone'
  | 'music'
  | 'pause'
  | 'robot'
  | 'settings'
  | 'speaker';

interface GameIconProps extends SVGProps<SVGSVGElement> {
  name: GameIconName;
  size?: number;
}

export function GameIcon({ name, size = 22, ...props }: GameIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    ...props,
  };

  switch (name) {
    case 'accessibility':
      return (
        <svg {...common}>
          <circle cx="12" cy="4.5" r="2.1" />
          <path d="M4.5 8.5c2.5.8 5 1.2 7.5 1.2s5-.4 7.5-1.2M12 9.8v10M8.1 20l3.9-5 3.9 5" />
        </svg>
      );
    case 'add-player':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.8 19c.5-3.2 2.3-5 5.2-5s4.7 1.8 5.2 5M18 8v6M15 11h6" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...common}>
          <path d="M5 12h13M14 7l5 5-5 5" />
        </svg>
      );
    case 'cards':
      return (
        <svg {...common}>
          <rect x="6.5" y="3.5" width="11" height="17" rx="2" />
          <path d="m10 9 2-2 2 2-2 2-2-2ZM4.5 6.5h-.4A2.1 2.1 0 0 0 2 8.6v9.3A2.1 2.1 0 0 0 4.1 20h.4" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12.5 4.2 4.2L19 7" />
        </svg>
      );
    case 'chevron':
      return (
        <svg {...common}>
          <path d="m7 14 5-5 5 5" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case 'host':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.7 19c.5-3.3 2.3-5 5.3-5s4.8 1.7 5.3 5M17.5 7.2v5.6M14.7 10h5.6" />
        </svg>
      );
    case 'invite':
      return (
        <svg {...common}>
          <circle cx="8.5" cy="8" r="3" />
          <path d="M3 19c.5-3.5 2.3-5.2 5.5-5.2 2.4 0 4 .9 4.9 2.8M18 9v7M14.5 12.5h7" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...common}>
          <path d="M5 7h14M5 12h14M5 17h14" />
        </svg>
      );
    case 'microphone':
      return (
        <svg {...common}>
          <rect x="8.5" y="3" width="7" height="12" rx="3.5" />
          <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
        </svg>
      );
    case 'music':
      return (
        <svg {...common}>
          <path d="M9 18V6l10-2v12" />
          <ellipse cx="6.5" cy="18" rx="2.5" ry="2" />
          <ellipse cx="16.5" cy="16" rx="2.5" ry="2" />
        </svg>
      );
    case 'pause':
      return (
        <svg {...common}>
          <path d="M8 5v14M16 5v14" strokeWidth="3" />
        </svg>
      );
    case 'robot':
      return (
        <svg {...common}>
          <path d="M12 3v3M9.5 3h5" />
          <rect x="4" y="6" width="16" height="13" rx="4" />
          <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
          <path d="M8.5 16h7M2 11v4M22 11v4" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19 13.8a7.7 7.7 0 0 0 0-3.6l2-1.5-2-3.4-2.5 1a7.5 7.5 0 0 0-3.1-1.8L13 2h-4l-.4 2.5a7.5 7.5 0 0 0-3.1 1.8l-2.5-1-2 3.4 2 1.5a7.7 7.7 0 0 0 0 3.6l-2 1.5 2 3.4 2.5-1a7.5 7.5 0 0 0 3.1 1.8L9 22h4l.4-2.5a7.5 7.5 0 0 0 3.1-1.8l2.5 1 2-3.4-2-1.5Z" />
        </svg>
      );
    case 'speaker':
      return (
        <svg {...common}>
          <path d="M4 10v4h4l5 4V6L8 10H4ZM17 9a4.2 4.2 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11" />
        </svg>
      );
  }
}
