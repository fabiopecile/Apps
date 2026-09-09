import { Audio } from 'expo-av';

export type SoundKey =
  | 'cupHit'
  | 'rimOut'
  | 'miss'
  | 'victory'
  | 'defeat'
  | 'tap'
  | 'whoosh'
  | 'streak'
  | 'coin';

const SOURCES: Record<SoundKey, number> = {
  cupHit: require('../assets/sounds/cup_hit.wav'),
  rimOut: require('../assets/sounds/rim_out.wav'),
  miss: require('../assets/sounds/miss.wav'),
  victory: require('../assets/sounds/victory.wav'),
  defeat: require('../assets/sounds/defeat.wav'),
  tap: require('../assets/sounds/tap.wav'),
  whoosh: require('../assets/sounds/whoosh.wav'),
  streak: require('../assets/sounds/streak.wav'),
  coin: require('../assets/sounds/coin.wav'),
};

/**
 * Per-sound trim. The files are normalised individually, so this is where the
 * mix is balanced: taps play constantly and must sit far back, a sunk cup is
 * the loudest thing in the app.
 */
const LEVELS: Record<SoundKey, number> = {
  cupHit: 1.0,
  rimOut: 0.75,
  miss: 0.6,
  victory: 0.9,
  defeat: 0.7,
  tap: 0.35,
  whoosh: 0.5,
  streak: 0.8,
  coin: 0.7,
};

const pool = new Map<SoundKey, Audio.Sound>();
let audioModeSet = false;
let loadPromise: Promise<void> | null = null;

async function ensureLoaded() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    if (!audioModeSet) {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
      } catch {
        // Non-fatal: continue without custom audio mode (e.g. unsupported on web).
      }
      audioModeSet = true;
    }
    await Promise.all(
      (Object.keys(SOURCES) as SoundKey[]).map(async (key) => {
        try {
          const { sound } = await Audio.Sound.createAsync(SOURCES[key], {
            volume: LEVELS[key],
          });
          pool.set(key, sound);
        } catch {
          // Missing/broken asset shouldn't crash the app.
        }
      })
    );
  })();
  return loadPromise;
}

export async function preloadSounds() {
  await ensureLoaded();
}

export async function playSound(key: SoundKey) {
  await ensureLoaded();
  const sound = pool.get(key);
  if (!sound) return;
  try {
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // Ignore playback errors (e.g. autoplay restrictions on web before user gesture).
  }
}
