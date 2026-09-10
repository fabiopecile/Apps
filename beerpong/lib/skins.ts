import type { TranslationKey } from './i18n';

export type SkinType = 'ball' | 'table';

/**
 * What a skin costs, in coins.
 *
 * Priced against what a day of play actually earns — the daily tasks are worth
 * 70 to 220 each and there are several — so roughly 400 a day. At the old
 * prices the whole shop was cleared inside two days and there was nothing left
 * to play towards; the cheapest is now a day and a half, and the two champion
 * pieces are a fortnight each. Deliberately steep at the top: something has to
 * be worth having.
 */
export interface Skin {
  id: string;
  type: SkinType;
  name: string;
  cost: number;
  accent: string;
  descriptionKey: TranslationKey;
}

export const SKINS: Skin[] = [
  { id: 'ball-classic', type: 'ball', name: 'Classic', cost: 0, accent: '#F5F7F5', descriptionKey: 'skin.ball-classic' },
  { id: 'ball-neon', type: 'ball', name: 'Neon Strike', cost: 600, accent: '#39FF14', descriptionKey: 'skin.ball-neon' },
  { id: 'ball-inferno', type: 'ball', name: 'Inferno', cost: 1400, accent: '#FF5A1F', descriptionKey: 'skin.ball-inferno' },
  { id: 'ball-cryo', type: 'ball', name: 'Cryo', cost: 1400, accent: '#3FD8FF', descriptionKey: 'skin.ball-cryo' },
  { id: 'ball-gold', type: 'ball', name: 'Champion Gold', cost: 4000, accent: '#FFD23D', descriptionKey: 'skin.ball-gold' },
  { id: 'table-classic', type: 'table', name: 'Standard Table', cost: 0, accent: '#5C635C', descriptionKey: 'skin.table-classic' },
  { id: 'table-arena', type: 'table', name: 'Neon Arena', cost: 800, accent: '#39FF14', descriptionKey: 'skin.table-arena' },
  { id: 'table-midnight', type: 'table', name: 'Midnight', cost: 1800, accent: '#7C4DFF', descriptionKey: 'skin.table-midnight' },
  { id: 'table-champion', type: 'table', name: "Champion's Court", cost: 5000, accent: '#FFD23D', descriptionKey: 'skin.table-champion' },
];

export const DEFAULT_BALL_SKIN = 'ball-classic';
export const DEFAULT_TABLE_SKIN = 'table-classic';
