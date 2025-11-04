import type { Game } from '@/lib/mock-data';

export interface SwipeCardProps {
  game: Game;
  index: number;
  totalCards: number;
  onSwipe: (direction: 'left' | 'right', gameId: string) => void;
  onTap: (game: Game) => void;
}

export interface CardStackProps {
  games: Game[];
  onSwipe?: (direction: 'left' | 'right', game: Game) => void;
  onCardTap?: (game: Game) => void;
  onStackEmpty?: () => void;
  maxCards?: number;
}

export type SwipeDirection = 'left' | 'right' | null;

export interface GestureState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  rotation: number;
  opacity: number;
}
