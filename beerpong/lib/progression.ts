export type DailyMetric = 'cupsHit' | 'throws' | 'wins' | 'bounceHits' | 'trackerCups';

export interface DailyChallenge {
  id: string;
  title: string;
  metric: DailyMetric;
  target: number;
  coins: number;
}

/** The pool three tasks are drawn from each day. */
const CHALLENGE_POOL: DailyChallenge[] = [
  { id: 'cups-15', title: '15 Cups versenken', metric: 'cupsHit', target: 15, coins: 80 },
  { id: 'cups-30', title: '30 Cups versenken', metric: 'cupsHit', target: 30, coins: 150 },
  { id: 'throws-40', title: '40 Würfe machen', metric: 'throws', target: 40, coins: 70 },
  { id: 'wins-2', title: '2 Spiele gewinnen', metric: 'wins', target: 2, coins: 120 },
  { id: 'wins-4', title: '4 Spiele gewinnen', metric: 'wins', target: 4, coins: 220 },
  { id: 'bounce-3', title: '3 Bounce-Shots treffen', metric: 'bounceHits', target: 3, coins: 160 },
  { id: 'bounce-1', title: 'Einen Bounce-Shot treffen', metric: 'bounceHits', target: 1, coins: 90 },
  { id: 'tracker-10', title: '10 Cups im Tracker zählen', metric: 'trackerCups', target: 10, coins: 100 },
];

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Same three tasks for everyone on a given day, no server needed. */
export function challengesFor(dateKey: string): DailyChallenge[] {
  const seed = dateKey.split('-').reduce((sum, part) => sum + Number(part), 0);
  const picked: DailyChallenge[] = [];
  for (let i = 0; picked.length < 3 && i < CHALLENGE_POOL.length * 2; i++) {
    const candidate = CHALLENGE_POOL[(seed + i * 3) % CHALLENGE_POOL.length];
    if (!picked.some((c) => c.id === candidate.id)) picked.push(candidate);
  }
  return picked;
}

export interface AchievementStats {
  totalCupsHit: number;
  arcadeWins: number;
  bestStreak: number;
  bestDivision: number;
  weekendBestWins: number;
  ownedSkins: number;
  trackerGames: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  coins: number;
  icon: string;
  progress: (stats: AchievementStats) => { current: number; target: number };
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-blood',
    title: 'Erster Cup',
    description: 'Versenke deinen ersten Cup.',
    coins: 50,
    icon: 'water',
    progress: (s) => ({ current: s.totalCupsHit, target: 1 }),
  },
  {
    id: 'century',
    title: 'Hundert Cups',
    description: 'Versenke insgesamt 100 Cups.',
    coins: 300,
    icon: 'flame',
    progress: (s) => ({ current: s.totalCupsHit, target: 100 }),
  },
  {
    id: 'streak-5',
    title: 'Heiße Serie',
    description: 'Triff fünf Mal in Folge.',
    coins: 150,
    icon: 'flash',
    progress: (s) => ({ current: s.bestStreak, target: 5 }),
  },
  {
    id: 'wins-10',
    title: 'Zehn Siege',
    description: 'Gewinne 10 Arcade-Spiele.',
    coins: 250,
    icon: 'trophy',
    progress: (s) => ({ current: s.arcadeWins, target: 10 }),
  },
  {
    id: 'division-5',
    title: 'Aufsteiger',
    description: 'Erreiche Division 5.',
    coins: 400,
    icon: 'trending-up',
    progress: (s) => ({ current: 10 - s.bestDivision, target: 5 }),
  },
  {
    id: 'division-1',
    title: 'Champion',
    description: 'Erreiche Division 1.',
    coins: 1200,
    icon: 'ribbon',
    progress: (s) => ({ current: 10 - s.bestDivision, target: 9 }),
  },
  {
    id: 'weekend-6',
    title: 'Gold-Wochenende',
    description: 'Hol 6 Siege in einer Weekend League.',
    coins: 500,
    icon: 'calendar',
    progress: (s) => ({ current: s.weekendBestWins, target: 6 }),
  },
  {
    id: 'collector',
    title: 'Sammler',
    description: 'Besitze 5 Skins.',
    coins: 200,
    icon: 'color-palette',
    progress: (s) => ({ current: s.ownedSkins, target: 5 }),
  },
  {
    id: 'host',
    title: 'Gastgeber',
    description: 'Tracke 5 echte Spiele.',
    coins: 250,
    icon: 'people',
    progress: (s) => ({ current: s.trackerGames, target: 5 }),
  },
];

export interface SeasonTier {
  level: number;
  xp: number;
  coins: number;
  label: string;
}

export const SEASON_TIERS: SeasonTier[] = Array.from({ length: 10 }, (_, i) => ({
  level: i + 1,
  xp: (i + 1) * 250,
  coins: 100 + i * 60,
  label: `Stufe ${i + 1}`,
}));

export function seasonProgress(xp: number) {
  const reached = SEASON_TIERS.filter((tier) => xp >= tier.xp).length;
  const next = SEASON_TIERS[reached];
  const previousXp = reached > 0 ? SEASON_TIERS[reached - 1].xp : 0;
  const progress = next ? (xp - previousXp) / (next.xp - previousXp) : 1;
  return { reached, next, progress: Math.max(0, Math.min(1, progress)) };
}
