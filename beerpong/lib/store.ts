import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_BALL_SKIN, DEFAULT_TABLE_SKIN, SKINS } from './skins';
import { LEAGUE_OPPONENTS } from './opponents';
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
  tierName?: string;
}

interface BeerpongStore {
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  soundEnabled: boolean;
  hapticsEnabled: boolean;
  toggleSound: () => void;
  toggleHaptics: () => void;

  houseRules: HouseRules;
  toggleHouseRule: (key: keyof HouseRules) => void;

  camera: CameraState;
  cameraHit: () => void;
  cameraMiss: () => void;
  cameraResetGame: () => void;

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

  weekend: WeekendState;
  startWeekendRun: () => void;
  recordWeekendMatch: (won: boolean) => WeekendOutcome;
  resetWeekendRun: () => void;
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

        return { won, played, wins, finished, coins, tierName: tier?.name };
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
        houseRules: state.houseRules,
        camera: state.camera,
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
