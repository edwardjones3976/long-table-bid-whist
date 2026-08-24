import type { CSSProperties, ReactNode } from 'react';

export type CardSuit = 'clubs' | 'diamonds' | 'hearts' | 'spades' | 'joker';

export interface CardModel {
  id: string;
  rank: string;
  suit: CardSuit;
  faceDown?: boolean;
  legal?: boolean;
  disabled?: boolean;
  reason?: string;
}
export type TableSeat = 'north' | 'east' | 'south' | 'west';

export interface TrickCard {
  card: CardModel;
  seat: TableSeat;
  playerName?: string;
}

export type DealerMode = 'ai' | 'human';

export interface StyledSlotProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}
