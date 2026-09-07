import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_BALL_SKIN, DEFAULT_TABLE_SKIN, SKINS } from './skins';
import { LEAGUE_OPPONENTS } from './opponents';
import { todayKey, type DailyMetric } from './progression';
import type { Language } from './languages';
import type { TranslationKey } from './i18n';
import {
  createBracket,
  championOf,
  propagate,
  type Tournament,
} from './tournament';
import {
  ENTRY_DIVISION,
  TOP_DIVISION,
  WEEKEND_MATCHES,
  getDivision,
  weekendTierFor,
  type AiDifficulty,
} from './competition';

export interface HouseRules {
  reRacks: boolean;
  island: boolean;
  redemption: boolean;
}

interface CameraState {
  score: number;
  streak: number;
  bestStreak: number;
  totalCupsHit: number;
  gamesPlayed: number;
}

export type TeamIndex = 0 | 1;

export interface TrackerTeam {
  name: string;
  cupsLeft: number;
  hits: number;
  throws: number;
  streak: number;
  bestStreak: number;
  reRacksLeft: number;
}

interface TrackerSnapshot {
  teams: [TrackerTeam, TrackerTeam];
  activeTeam: TeamIndex;
  winner: TeamIndex | null;
}

export interface TrackerState {
  teams: [TrackerTeam, TrackerTeam];
  activeTeam: TeamIndex;
  startCups: number;
  winner: TeamIndex | null;
  startedAt: number;
  finishedAt: number | null;
  /** Recent states so a miscount can be taken back — parties are noisy. */
  history: TrackerSnapshot[];
}

interface ArcadeState {
  totalCupsHit: number;
  totalThrows: number;
  careerXP: number;
  wins: number;
  losses: number;
  defeatedOpponentIds: string[];
  equippedBall: string;
  equippedTable: string;
}

interface RivalsState {
  division: number;
  bestDivision: number;
  divisionWins: number;
  divisionLosses: number;
  wins: number;
  losses: number;
}

interface WeekendState {
  active: boolean;
  played: number;
  wins: number;
  bestWins: number;
  runsCompleted: number;
}

export interface RivalsOutcome {
  won: boolean;
  promoted: boolean;
  relegated: boolean;
  division: number;
  previousDivision: number;
  divisionWins: number;
  winsToPromote: number;
  coins: number;
}

export interface WeekendOutcome {
  won: boolean;
  played: number;
  wins: number;
  finished: boolean;
  coins: number;
  tierKey?: TranslationKey;
}

export interface DailyProgress {
  date: string;
  cupsHit: number;
  throws: number;
  wins: number;
  bounceHits: number;
  trackerCups: number;
  claimed: string[];
}

interface BeerpongStore {
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  soundEnabled: boolean;
  hapticsEnabled: boolean;
  toggleSound: () => void;
  toggleHaptics: () => void;

  language: Language;
  setLanguage: (language: Language) => void;

  /** False until the intro has been seen once. */
  onboardingDone: boolean;
  completeOnboarding: () => void;

  /** Local reminder flag for the (not yet purchasable) Pro tier. */
  proNotifyRequested: boolean;
  setProNotifyRequested: (value: boolean) => void;

  houseRules: HouseRules;
  toggleHouseRule: (key: keyof HouseRules) => void;

  camera: CameraState;
  cameraHit: () => void;
  cameraMiss: () => void;
  cameraResetGame: () => void;

  tournament: Tournament | null;
  tournamentStart: (teams: string[]) => void;
  tournamentReportWinner: (matchId: string, winner: string) => void;
  tournamentReset: () => void;

  tracker: TrackerState;
  /** The active team sank a cup on the other team's rack. */
  trackerHit: () => void;
  /** The active team missed — ends their streak and passes the turn. */
  trackerMiss: () => void;
  trackerSwitchTeam: () => void;
  trackerUndo: () => void;
  trackerSetTeamName: (team: TeamIndex, name: string) => void;
  trackerReRack: (team: TeamIndex) => void;
  trackerNewGame: (startCups?: number) => void;

  arcade: ArcadeState;
  coins: number;
  ownedSkinIds: string[];
  arcadeRecordThrow: (hit: boolean) => void;
  arcadeRecordMatch: (opponentId: string, won: boolean) => void;
  buySkin: (skinId: string) => boolean;
  equipSkin: (skinId: string) => void;

  currentOpponentId: string;
  setCurrentOpponentId: (id: string) => void;

  aiDifficulty: AiDifficulty;
  setAiDifficulty: (difficulty: AiDifficulty) => void;

  rivals: RivalsState;
  recordRivalsMatch: (won: boolean) => RivalsOutcome;

  daily: DailyProgress;
  /** Counts one unit toward a daily objective, rolling the day over first. */
  trackDaily: (metric: DailyMetric, amount?: number) => void;
  claimDaily: (challengeId: string, coins: number) => void;

  claimedAchievements: string[];
  claimAchievement: (achievementId: string, coins: number) => void;

  claimedSeasonTiers: number[];
  claimSeasonTier: (level: number, coins: number) => void;

  weekend: WeekendState;
  startWeekendRun: () => void;
  recordWeekendMatch: (won: boolean) => WeekendOutcome;
  resetWeekendRun: () => void;
}

export const DEFAULT_START_CUPS = 10;
const MAX_HISTORY = 30;

function makeTeam(name: string, cups: number): TrackerTeam {
  return {
    name,
    cupsLeft: cups,
    hits: 0,
    throws: 0,
    streak: 0,
    bestStreak: 0,
    reRacksLeft: 2,
  };
}

function makeTracker(startCups: number, names?: [string, string]): TrackerState {
  return {
    teams: [
      makeTeam(names?.[0] || 'Team 1', startCups),
      makeTeam(names?.[1] || 'Team 2', startCups),
    ],
    activeTeam: 0,
    startCups,
    winner: null,
    startedAt: Date.now(),
    finishedAt: null,
    history: [],
  };
}

function cloneTeams(teams: [TrackerTeam, TrackerTeam]): [TrackerTeam, TrackerTeam] {
  return [{ ...teams[0] }, { ...teams[1] }];
}

function pushHistory(tracker: TrackerState): TrackerSnapshot[] {
  const next = [
    ...tracker.history,
    { teams: cloneTeams(tracker.teams), activeTeam: tracker.activeTeam, winner: tracker.winner },
  ];
  return next.slice(-MAX_HISTORY);
}

export const useBeerpongStore = create<BeerpongStore>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      soundEnabled: true,
      hapticsEnabled: true,
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled })),

      language: 'de',
      setLanguage: (language) => set({ language }),

      onboardingDone: false,
      completeOnboarding: () => set({ onboardingDone: true }),

      proNotifyRequested: false,
      setProNotifyRequested: (value) => set({ proNotifyRequested: value }),

      houseRules: { reRacks: true, island: true, redemption: false },
      toggleHouseRule: (key) =>
        set((s) => ({ houseRules: { ...s.houseRules, [key]: !s.houseRules[key] } })),

      camera: {
        score: 0,
        streak: 0,
        bestStreak: 0,
        totalCupsHit: 0,
        gamesPlayed: 0,
      },
      cameraHit: () =>
        set((s) => {
          const streak = s.camera.streak + 1;
          return {
            camera: {
              ...s.camera,
              score: s.camera.score + 1,
              streak,
              bestStreak: Math.max(s.camera.bestStreak, streak),
              totalCupsHit: s.camera.totalCupsHit + 1,
            },
          };
        }),
      cameraMiss: () => set((s) => ({ camera: { ...s.camera, streak: 0 } })),
      cameraResetGame: () =>
        set((s) => ({
          camera: {
            ...s.camera,
            score: 0,
            streak: 0,
            gamesPlayed: s.camera.gamesPlayed + 1,
          },
        })),

      tournament: null,

      tournamentStart: (teams) =>
        set({
          tournament: {
            teams,
            matches: createBracket(teams),
            champion: null,
            createdAt: Date.now(),
          },
        }),

      tournamentReportWinner: (matchId, winner) =>
        set((state) => {
          if (!state.tournament) return {};
          const updated = state.tournament.matches.map((m) =>
            m.id === matchId ? { ...m, winner } : m
          );
          const matches = propagate(updated);
          return {
            tournament: { ...state.tournament, matches, champion: championOf(matches) },
          };
        }),

      tournamentReset: () => set({ tournament: null }),

      tracker: makeTracker(DEFAULT_START_CUPS),

      trackerHit: () =>
        set((s) => {
          const t = s.tracker;
          if (t.winner != null) return {};
          const shooter = t.activeTeam;
          const target: TeamIndex = shooter === 0 ? 1 : 0;
          const teams = cloneTeams(t.teams);
          const streak = teams[shooter].streak + 1;

          teams[shooter] = {
            ...teams[shooter],
            hits: teams[shooter].hits + 1,
            throws: teams[shooter].throws + 1,
            streak,
            bestStreak: Math.max(teams[shooter].bestStreak, streak),
          };
          teams[target] = {
            ...teams[target],
            cupsLeft: Math.max(0, teams[target].cupsLeft - 1),
          };

          const winner: TeamIndex | null = teams[target].cupsLeft === 0 ? shooter : null;

          return {
            tracker: {
              ...t,
              teams,
              winner,
              finishedAt: winner != null ? Date.now() : null,
              history: pushHistory(t),
            },
            camera: {
              ...s.camera,
              totalCupsHit: s.camera.totalCupsHit + 1,
              bestStreak: Math.max(s.camera.bestStreak, streak),
              gamesPlayed: s.camera.gamesPlayed + (winner != null ? 1 : 0),
            },
          };
        }),

      trackerMiss: () =>
        set((s) => {
          const t = s.tracker;
          if (t.winner != null) return {};
          const shooter = t.activeTeam;
          const teams = cloneTeams(t.teams);
          teams[shooter] = {
            ...teams[shooter],
            throws: teams[shooter].throws + 1,
            streak: 0,
          };
          return {
            tracker: {
              ...t,
              teams,
              activeTeam: (shooter === 0 ? 1 : 0) as TeamIndex,
              history: pushHistory(t),
            },
          };
        }),

      trackerSwitchTeam: () =>
        set((s) => ({
          tracker: {
            ...s.tracker,
            activeTeam: (s.tracker.activeTeam === 0 ? 1 : 0) as TeamIndex,
            history: pushHistory(s.tracker),
          },
        })),

      trackerUndo: () =>
        set((s) => {
          const previous = s.tracker.history[s.tracker.history.length - 1];
          if (!previous) return {};
          return {
            tracker: {
              ...s.tracker,
              teams: cloneTeams(previous.teams),
              activeTeam: previous.activeTeam,
              winner: previous.winner,
              finishedAt: previous.winner != null ? s.tracker.finishedAt : null,
              history: s.tracker.history.slice(0, -1),
            },
          };
        }),

      trackerSetTeamName: (team, name) =>
        set((s) => {
          const teams = cloneTeams(s.tracker.teams);
          teams[team] = { ...teams[team], name };
          return { tracker: { ...s.tracker, teams } };
        }),

      trackerReRack: (team) =>
        set((s) => {
          const teams = cloneTeams(s.tracker.teams);
          if (teams[team].reRacksLeft <= 0) return {};
          teams[team] = { ...teams[team], reRacksLeft: teams[team].reRacksLeft - 1 };
          return { tracker: { ...s.tracker, teams, history: pushHistory(s.tracker) } };
        }),

      trackerNewGame: (startCups) =>
        set((s) => ({
          tracker: makeTracker(startCups ?? s.tracker.startCups, [
            s.tracker.teams[0].name,
            s.tracker.teams[1].name,
          ]),
        })),

      arcade: {
        totalCupsHit: 0,
        totalThrows: 0,
        careerXP: 0,
        wins: 0,
        losses: 0,
        defeatedOpponentIds: [],
        equippedBall: DEFAULT_BALL_SKIN,
        equippedTable: DEFAULT_TABLE_SKIN,
      },
      coins: 100,
      ownedSkinIds: [DEFAULT_BALL_SKIN, DEFAULT_TABLE_SKIN],

      arcadeRecordThrow: (hit) =>
        set((s) => ({
          arcade: {
            ...s.arcade,
            totalThrows: s.arcade.totalThrows + 1,
            totalCupsHit: s.arcade.totalCupsHit + (hit ? 1 : 0),
            careerXP: s.arcade.careerXP + (hit ? 15 : 2),
          },
          coins: s.coins + (hit ? 10 : 2),
        })),

      arcadeRecordMatch: (opponentId, won) =>
        set((s) => ({
          arcade: {
            ...s.arcade,
            wins: s.arcade.wins + (won ? 1 : 0),
            losses: s.arcade.losses + (won ? 0 : 1),
            defeatedOpponentIds:
              won && !s.arcade.defeatedOpponentIds.includes(opponentId)
                ? [...s.arcade.defeatedOpponentIds, opponentId]
                : s.arcade.defeatedOpponentIds,
          },
          coins: s.coins + (won ? 75 : 20),
        })),

      buySkin: (skinId) => {
        const skin = SKINS.find((s) => s.id === skinId);
        if (!skin) return false;
        const state = get();
        if (state.ownedSkinIds.includes(skinId)) return true;
        if (state.coins < skin.cost) return false;
        set((s) => ({
          coins: s.coins - skin.cost,
          ownedSkinIds: [...s.ownedSkinIds, skinId],
        }));
        return true;
      },

      equipSkin: (skinId) => {
        const skin = SKINS.find((s) => s.id === skinId);
        if (!skin) return;
        set((s) => ({
          arcade: {
            ...s.arcade,
            equippedBall: skin.type === 'ball' ? skinId : s.arcade.equippedBall,
            equippedTable: skin.type === 'table' ? skinId : s.arcade.equippedTable,
          },
        }));
      },

      currentOpponentId: LEAGUE_OPPONENTS[0].id,
      setCurrentOpponentId: (id) => set({ currentOpponentId: id }),

      aiDifficulty: 'medium',
      setAiDifficulty: (difficulty) => set({ aiDifficulty: difficulty }),

      rivals: {
        division: ENTRY_DIVISION,
        bestDivision: ENTRY_DIVISION,
        divisionWins: 0,
        divisionLosses: 0,
        wins: 0,
        losses: 0,
      },

      recordRivalsMatch: (won) => {
        const previous = get().rivals;
        const division = getDivision(previous.division);
        const divisionWins = previous.divisionWins + (won ? 1 : 0);
        const divisionLosses = previous.divisionLosses + (won ? 0 : 1);

        const promoted = divisionWins >= division.winsToPromote && previous.division > TOP_DIVISION;
        const relegated =
          !promoted &&
          divisionLosses >= division.lossesToRelegate &&
          previous.division < ENTRY_DIVISION;

        const nextDivision = promoted
          ? previous.division - 1
          : relegated
            ? previous.division + 1
            : previous.division;
        const coins =
          (won ? division.winCoins : Math.round(division.winCoins / 3)) +
          (promoted ? division.promotionCoins : 0);

        set((s) => ({
          rivals: {
            division: nextDivision,
            // Divisions count down, so the best run is the lowest number.
            bestDivision: Math.min(s.rivals.bestDivision, nextDivision),
            divisionWins: promoted || relegated ? 0 : divisionWins,
            divisionLosses: promoted || relegated ? 0 : divisionLosses,
            wins: s.rivals.wins + (won ? 1 : 0),
            losses: s.rivals.losses + (won ? 0 : 1),
          },
          coins: s.coins + coins,
          arcade: { ...s.arcade, careerXP: s.arcade.careerXP + (won ? 60 : 15) },
        }));

        return {
          won,
          promoted,
          relegated,
          division: nextDivision,
          previousDivision: previous.division,
          divisionWins: promoted || relegated ? 0 : divisionWins,
          winsToPromote: getDivision(nextDivision).winsToPromote,
          coins,
        };
      },

      daily: {
        date: todayKey(),
        cupsHit: 0,
        throws: 0,
        wins: 0,
        bounceHits: 0,
        trackerCups: 0,
        claimed: [],
      },

      trackDaily: (metric, amount = 1) =>
        set((s) => {
          const today = todayKey();
          const base =
            s.daily.date === today
              ? s.daily
              : {
                  date: today,
                  cupsHit: 0,
                  throws: 0,
                  wins: 0,
                  bounceHits: 0,
                  trackerCups: 0,
                  claimed: [],
                };
          return { daily: { ...base, [metric]: base[metric] + amount } };
        }),

      claimDaily: (challengeId, coins) =>
        set((s) => {
          if (s.daily.claimed.includes(challengeId)) return {};
          return {
            daily: { ...s.daily, claimed: [...s.daily.claimed, challengeId] },
            coins: s.coins + coins,
          };
        }),

      claimedAchievements: [],
      claimAchievement: (achievementId, coins) =>
        set((s) => {
          if (s.claimedAchievements.includes(achievementId)) return {};
          return {
            claimedAchievements: [...s.claimedAchievements, achievementId],
            coins: s.coins + coins,
          };
        }),

      claimedSeasonTiers: [],
      claimSeasonTier: (level, coins) =>
        set((s) => {
          if (s.claimedSeasonTiers.includes(level)) return {};
          return {
            claimedSeasonTiers: [...s.claimedSeasonTiers, level],
            coins: s.coins + coins,
          };
        }),

      weekend: { active: false, played: 0, wins: 0, bestWins: 0, runsCompleted: 0 },

      startWeekendRun: () =>
        set((s) => ({ weekend: { ...s.weekend, active: true, played: 0, wins: 0 } })),

      recordWeekendMatch: (won) => {
        const previous = get().weekend;
        const played = previous.played + 1;
        const wins = previous.wins + (won ? 1 : 0);
        const finished = played >= WEEKEND_MATCHES;
        const tier = finished ? weekendTierFor(wins) : undefined;
        const coins = (won ? 60 : 15) + (tier ? tier.coins : 0);

        set((s) => ({
          weekend: {
            active: !finished,
            played,
            wins,
            bestWins: Math.max(s.weekend.bestWins, wins),
            runsCompleted: s.weekend.runsCompleted + (finished ? 1 : 0),
          },
          coins: s.coins + coins,
          arcade: { ...s.arcade, careerXP: s.arcade.careerXP + (won ? 80 : 20) },
        }));

        return { won, played, wins, finished, coins, tierKey: tier?.nameKey };
      },

      resetWeekendRun: () =>
        set((s) => ({ weekend: { ...s.weekend, active: false, played: 0, wins: 0 } })),
    }),
    {
      name: 'beerpong-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        soundEnabled: state.soundEnabled,
        hapticsEnabled: state.hapticsEnabled,
        language: state.language,
        onboardingDone: state.onboardingDone,
        proNotifyRequested: state.proNotifyRequested,
        houseRules: state.houseRules,
        camera: state.camera,
        tracker: state.tracker,
        tournament: state.tournament,
        daily: state.daily,
        claimedAchievements: state.claimedAchievements,
        claimedSeasonTiers: state.claimedSeasonTiers,
        arcade: state.arcade,
        coins: state.coins,
        ownedSkinIds: state.ownedSkinIds,
        currentOpponentId: state.currentOpponentId,
        aiDifficulty: state.aiDifficulty,
        rivals: state.rivals,
        weekend: state.weekend,
      }),
    }
  )
);

export function selectCareerLevel(careerXP: number) {
  return Math.floor(careerXP / 200) + 1;
}

export function selectCareerProgress(careerXP: number) {
  const level = selectCareerLevel(careerXP);
  const levelStart = (level - 1) * 200;
  const progress = (careerXP - levelStart) / 200;
  return { level, progress: Math.max(0, Math.min(1, progress)) };
}

export function selectCombinedStats(store: BeerpongStore) {
  return {
    totalCupsHit: store.camera.totalCupsHit + store.arcade.totalCupsHit,
    totalWins: store.arcade.wins,
    totalLosses: store.arcade.losses,
    bestStreak: store.camera.bestStreak,
    gamesPlayed: store.camera.gamesPlayed + store.arcade.wins + store.arcade.losses,
  };
}
