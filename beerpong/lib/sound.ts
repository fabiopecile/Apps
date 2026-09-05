import { Audio } from 'expo-av';

export type SoundKey = 'cupHit' | 'victory' | 'tap' | 'whoosh' | 'streak';

const SOURCES: Record<SoundKey, number> = {
  cupHit: require('../assets/sounds/cup_hit.wav'),
  victory: require('../assets/sounds/victory.wav'),
  tap: require('../assets/sounds/tap.wav'),
  whoosh: require('../assets/sounds/whoosh.wav'),
  streak: require('../assets/sounds/streak.wav'),
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
          const { sound } = await Audio.Sound.createAsync(SOURCES[key]);
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
