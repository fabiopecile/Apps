import type { TranslationKey } from './i18n';

export type SkinType = 'ball' | 'table';

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
  { id: 'ball-neon', type: 'ball', name: 'Neon Strike', cost: 150, accent: '#39FF14', descriptionKey: 'skin.ball-neon' },
  { id: 'ball-inferno', type: 'ball', name: 'Inferno', cost: 300, accent: '#FF5A1F', descriptionKey: 'skin.ball-inferno' },
  { id: 'ball-cryo', type: 'ball', name: 'Cryo', cost: 300, accent: '#3FD8FF', descriptionKey: 'skin.ball-cryo' },
  { id: 'ball-gold', type: 'ball', name: 'Champion Gold', cost: 750, accent: '#FFD23D', descriptionKey: 'skin.ball-gold' },
  { id: 'table-classic', type: 'table', name: 'Standard Table', cost: 0, accent: '#5C635C', descriptionKey: 'skin.table-classic' },
  { id: 'table-arena', type: 'table', name: 'Neon Arena', cost: 200, accent: '#39FF14', descriptionKey: 'skin.table-arena' },
  { id: 'table-midnight', type: 'table', name: 'Midnight', cost: 400, accent: '#7C4DFF', descriptionKey: 'skin.table-midnight' },
  { id: 'table-champion', type: 'table', name: "Champion's Court", cost: 900, accent: '#FFD23D', descriptionKey: 'skin.table-champion' },
];

export const DEFAULT_BALL_SKIN = 'ball-classic';
export const DEFAULT_TABLE_SKIN = 'table-classic';
