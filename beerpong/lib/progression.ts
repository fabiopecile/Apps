import type { TranslationKey } from './i18n';

export type DailyMetric = 'cupsHit' | 'throws' | 'wins' | 'bounceHits' | 'trackerCups';

export interface DailyChallenge {
  id: string;
  titleKey: TranslationKey;
  metric: DailyMetric;
  target: number;
  coins: number;
}

/** The pool three tasks are drawn from each day. */
const CHALLENGE_POOL: DailyChallenge[] = [
  { id: 'cups-15', titleKey: 'daily.cups15', metric: 'cupsHit', target: 15, coins: 80 },
  { id: 'cups-30', titleKey: 'daily.cups30', metric: 'cupsHit', target: 30, coins: 150 },
  { id: 'throws-40', titleKey: 'daily.throws40', metric: 'throws', target: 40, coins: 70 },
  { id: 'wins-2', titleKey: 'daily.wins2', metric: 'wins', target: 2, coins: 120 },
  { id: 'wins-4', titleKey: 'daily.wins4', metric: 'wins', target: 4, coins: 220 },
  { id: 'bounce-3', titleKey: 'daily.bounce3', metric: 'bounceHits', target: 3, coins: 160 },
  { id: 'bounce-1', titleKey: 'daily.bounce1', metric: 'bounceHits', target: 1, coins: 90 },
  { id: 'tracker-10', titleKey: 'daily.tracker10', metric: 'trackerCups', target: 10, coins: 100 },
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
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  coins: number;
  icon: string;
  progress: (stats: AchievementStats) => { current: number; target: number };
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-blood',
    titleKey: 'achv.first-blood.title',
    descriptionKey: 'achv.first-blood.description',
    coins: 50,
    icon: 'water',
    progress: (s) => ({ current: s.totalCupsHit, target: 1 }),
  },
  {
    id: 'century',
    titleKey: 'achv.century.title',
    descriptionKey: 'achv.century.description',
    coins: 300,
    icon: 'flame',
    progress: (s) => ({ current: s.totalCupsHit, target: 100 }),
  },
  {
    id: 'streak-5',
    titleKey: 'achv.streak-5.title',
    descriptionKey: 'achv.streak-5.description',
    coins: 150,
    icon: 'flash',
    progress: (s) => ({ current: s.bestStreak, target: 5 }),
  },
  {
    id: 'wins-10',
    titleKey: 'achv.wins-10.title',
    descriptionKey: 'achv.wins-10.description',
    coins: 250,
    icon: 'trophy',
    progress: (s) => ({ current: s.arcadeWins, target: 10 }),
  },
  {
    id: 'division-5',
    titleKey: 'achv.division-5.title',
    descriptionKey: 'achv.division-5.description',
    coins: 400,
    icon: 'trending-up',
    progress: (s) => ({ current: 10 - s.bestDivision, target: 5 }),
  },
  {
    id: 'division-1',
    titleKey: 'achv.division-1.title',
    descriptionKey: 'achv.division-1.description',
    coins: 1200,
    icon: 'ribbon',
    progress: (s) => ({ current: 10 - s.bestDivision, target: 9 }),
  },
  {
    id: 'weekend-6',
    titleKey: 'achv.weekend-6.title',
    descriptionKey: 'achv.weekend-6.description',
    coins: 500,
    icon: 'calendar',
    progress: (s) => ({ current: s.weekendBestWins, target: 6 }),
  },
  {
    id: 'collector',
    titleKey: 'achv.collector.title',
    descriptionKey: 'achv.collector.description',
    coins: 200,
    icon: 'color-palette',
    progress: (s) => ({ current: s.ownedSkins, target: 5 }),
  },
  {
    id: 'host',
    titleKey: 'achv.host.title',
    descriptionKey: 'achv.host.description',
    coins: 250,
    icon: 'people',
    progress: (s) => ({ current: s.trackerGames, target: 5 }),
  },
];

export interface SeasonTier {
  level: number;
  xp: number;
  coins: number;
}

export const SEASON_TIERS: SeasonTier[] = Array.from({ length: 10 }, (_, i) => ({
  level: i + 1,
  xp: (i + 1) * 250,
  coins: 100 + i * 60,
}));

export function seasonProgress(xp: number) {
  const reached = SEASON_TIERS.filter((tier) => xp >= tier.xp).length;
  const next = SEASON_TIERS[reached];
  const previousXp = reached > 0 ? SEASON_TIERS[reached - 1].xp : 0;
  const progress = next ? (xp - previousXp) / (next.xp - previousXp) : 1;
  return { reached, next, progress: Math.max(0, Math.min(1, progress)) };
}
