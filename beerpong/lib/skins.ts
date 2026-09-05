export type SkinType = 'ball' | 'table';

export interface Skin {
  id: string;
  type: SkinType;
  name: string;
  cost: number;
  accent: string;
  description: string;
}

export const SKINS: Skin[] = [
  { id: 'ball-classic', type: 'ball', name: 'Classic', cost: 0, accent: '#F5F7F5', description: 'Der Standardball. Immer verfügbar.' },
  { id: 'ball-neon', type: 'ball', name: 'Neon Strike', cost: 150, accent: '#39FF14', description: 'Leuchtet in sattem Neongrün.' },
  { id: 'ball-inferno', type: 'ball', name: 'Inferno', cost: 300, accent: '#FF5A1F', description: 'Feuriger Trail bei jedem Wurf.' },
  { id: 'ball-cryo', type: 'ball', name: 'Cryo', cost: 300, accent: '#3FD8FF', description: 'Eiskalte Flugbahn.' },
  { id: 'ball-gold', type: 'ball', name: 'Champion Gold', cost: 750, accent: '#FFD23D', description: 'Für echte Liga-Champions.' },
  { id: 'table-classic', type: 'table', name: 'Standard Table', cost: 0, accent: '#5C635C', description: 'Der Standardtisch.' },
  { id: 'table-arena', type: 'table', name: 'Neon Arena', cost: 200, accent: '#39FF14', description: 'eSport-Arena-Optik mit Rasterlinien.' },
  { id: 'table-midnight', type: 'table', name: 'Midnight', cost: 400, accent: '#7C4DFF', description: 'Tiefviolette Club-Atmosphäre.' },
  { id: 'table-champion', type: 'table', name: "Champion's Court", cost: 900, accent: '#FFD23D', description: 'Das Finale wartet.' },
];

export const DEFAULT_BALL_SKIN = 'ball-classic';
export const DEFAULT_TABLE_SKIN = 'table-classic';
