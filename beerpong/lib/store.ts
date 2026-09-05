import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_BALL_SKIN, DEFAULT_TABLE_SKIN, SKINS } from './skins';
import { LEAGUE_OPPONENTS } from './opponents';

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
