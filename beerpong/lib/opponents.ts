export interface Opponent {
  id: string;
  name: string;
  nickname: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  accuracy: number; // 0-1, chance the opponent sinks a cup
  color: string;
}

export const LEAGUE_OPPONENTS: Opponent[] = [
  { id: 'op-1', name: 'Jonas "Rookie" Berg', nickname: 'Rookie', difficulty: 1, accuracy: 0.32, color: '#39FF14' },
  { id: 'op-2', name: 'Lena "Sharpshot" Voss', nickname: 'Sharpshot', difficulty: 2, accuracy: 0.4, color: '#3FD8FF' },
  { id: 'op-3', name: 'Milo "Steady" Krause', nickname: 'Steady', difficulty: 2, accuracy: 0.44, color: '#FFC94A' },
  { id: 'op-4', name: 'Aylin "Blitz" Demir', nickname: 'Blitz', difficulty: 3, accuracy: 0.5, color: '#FF5A1F' },
  { id: 'op-5', name: 'Theo "Ice" Falk', nickname: 'Ice', difficulty: 3, accuracy: 0.54, color: '#7C4DFF' },
  { id: 'op-6', name: 'Nora "Reaper" Sund', nickname: 'Reaper', difficulty: 4, accuracy: 0.6, color: '#FF3B4E' },
  { id: 'op-7', name: 'Kian "Legend" Otto', nickname: 'Legend', difficulty: 5, accuracy: 0.68, color: '#FFD23D' },
];
