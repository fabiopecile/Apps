// Data model, catalogs, persistence and progression rules.

export const LEAGUES = [
  { name: 'Liga 10', threshold: 5,  keeperReach: 17, keeperSkill: 0.10, color: '#8d97b0' },
  { name: 'Liga 9',  threshold: 6,  keeperReach: 18, keeperSkill: 0.16, color: '#8d97b0' },
  { name: 'Liga 8',  threshold: 6,  keeperReach: 19, keeperSkill: 0.22, color: '#7fb6ff' },
  { name: 'Liga 7',  threshold: 7,  keeperReach: 20, keeperSkill: 0.28, color: '#7fb6ff' },
  { name: 'Liga 6',  threshold: 7,  keeperReach: 21, keeperSkill: 0.34, color: '#5b9cff' },
  { name: 'Liga 5',  threshold: 8,  keeperReach: 22, keeperSkill: 0.42, color: '#5b9cff' },
  { name: 'Liga 4',  threshold: 8,  keeperReach: 23, keeperSkill: 0.50, color: '#c07bff' },
  { name: 'Liga 3',  threshold: 9,  keeperReach: 24, keeperSkill: 0.58, color: '#c07bff' },
  { name: 'Liga 2',  threshold: 9,  keeperReach: 25, keeperSkill: 0.66, color: '#ffd166' },
  { name: 'Liga 1',  threshold: 10, keeperReach: 26, keeperSkill: 0.74, color: '#ffd166' },
];

export const CUP_UNLOCK_LEAGUE_INDEX = 5; // Liga 5
export const CUP_QUAL_WINS = 10;

export const COSMETICS = {
  hair: [
    { id: 'hair_short',  name: 'Kurzhaar',   price: 0,    rarity: 'common' },
    { id: 'hair_buzz',   name: 'Buzzcut',    price: 100,  rarity: 'common' },
    { id: 'hair_curly',  name: 'Locken',     price: 250,  rarity: 'rare' },
    { id: 'hair_mohawk', name: 'Irokese',    price: 450,  rarity: 'rare' },
    { id: 'hair_long',   name: 'Langhaar',   price: 600,  rarity: 'epic' },
    { id: 'hair_flame',  name: 'Flame',      price: 1500, rarity: 'legendary' },
  ],
  jersey: [
    { id: 'jersey_blue',    name: 'Blau',        price: 0,    rarity: 'common', c1: '#2f7dff', c2: '#1a4fb0' },
    { id: 'jersey_red',     name: 'Rot',         price: 120,  rarity: 'common', c1: '#ff4d5e', c2: '#b0202f' },
    { id: 'jersey_green',   name: 'Grün',        price: 120,  rarity: 'common', c1: '#2fd17a', c2: '#178a4e' },
    { id: 'jersey_black',   name: 'Schwarz',     price: 150,  rarity: 'common', c1: '#3a3f4d', c2: '#15171d' },
    { id: 'jersey_stripes', name: 'Streifen',    price: 350,  rarity: 'rare',   c1: '#2f7dff', c2: '#ffffff' },
    { id: 'jersey_flames',  name: 'Flammen',     price: 700,  rarity: 'epic',   c1: '#ff9a3c', c2: '#ff3b3b' },
    { id: 'jersey_galaxy',  name: 'Galaxy',      price: 1600, rarity: 'legendary', c1: '#7b2ff7', c2: '#00d4ff' },
  ],
  shorts: [
    { id: 'shorts_white', name: 'Weiß',  price: 0,   rarity: 'common', c1: '#eef1f7' },
    { id: 'shorts_black', name: 'Schwarz', price: 100, rarity: 'common', c1: '#22242c' },
    { id: 'shorts_blue',  name: 'Blau',  price: 100, rarity: 'common', c1: '#2f5db0' },
    { id: 'shorts_gold',  name: 'Gold',  price: 500, rarity: 'epic',   c1: '#ffd166' },
  ],
  boots: [
    { id: 'boots_black', name: 'Schwarz', price: 0,    rarity: 'common', c1: '#191b20' },
    { id: 'boots_white', name: 'Weiß',    price: 120,  rarity: 'common', c1: '#eef1f7' },
    { id: 'boots_red',   name: 'Rot',     price: 180,  rarity: 'rare',   c1: '#ff3b4e' },
    { id: 'boots_neon',  name: 'Neon',    price: 450,  rarity: 'epic',   c1: '#39ffb0' },
    { id: 'boots_gold',  name: 'Gold',    price: 1200, rarity: 'legendary', c1: '#ffd166' },
  ],
  gloves: [
    { id: 'gloves_black', name: 'Schwarz', price: 0,   rarity: 'common', c1: '#22242c' },
    { id: 'gloves_blue',  name: 'Blau',    price: 100, rarity: 'common', c1: '#2f7dff' },
    { id: 'gloves_red',   name: 'Rot',     price: 100, rarity: 'common', c1: '#ff4d5e' },
    { id: 'gloves_neon',  name: 'Neon',    price: 400, rarity: 'epic',   c1: '#39ffb0' },
    { id: 'gloves_gold',  name: 'Gold',    price: 1200, rarity: 'legendary', c1: '#ffd166' },
  ],
  ball: [
    { id: 'ball_classic', name: 'Klassik', price: 0,    rarity: 'common', c1: '#f4f6fb', c2: '#1c1e24' },
    { id: 'ball_orange',  name: 'Orange',  price: 150,  rarity: 'common', c1: '#ff9a3c', c2: '#1c1e24' },
    { id: 'ball_camo',    name: 'Camo',    price: 300,  rarity: 'rare',   c1: '#5a6b4b', c2: '#2c3524' },
    { id: 'ball_fire',    name: 'Feuer',   price: 600,  rarity: 'epic',   c1: '#ff5b1f', c2: '#ffd166' },
    { id: 'ball_galaxy',  name: 'Galaxy',  price: 1400, rarity: 'legendary', c1: '#7b2ff7', c2: '#00d4ff' },
  ],
  celebration: [
    { id: 'cel_classic',   name: 'Jubellauf',  price: 0,    rarity: 'common' },
    { id: 'cel_slide',     name: 'Knie-Slide', price: 200,  rarity: 'common' },
    { id: 'cel_point',     name: 'Zum Himmel', price: 300,  rarity: 'rare' },
    { id: 'cel_spin',      name: 'Spin',       price: 600,  rarity: 'epic' },
    { id: 'cel_fireworks', name: 'Feuerwerk',  price: 1500, rarity: 'legendary' },
  ],
};

export const SKIN_TONES = ['#ffdbb0', '#e8ac7e', '#b97a56', '#7a4b32'];

export const CATEGORY_LABELS = {
  hair: 'Frisur', jersey: 'Trikot', shorts: 'Hose', boots: 'Schuhe',
  gloves: 'Handschuhe', ball: 'Ball', celebration: 'Jubel',
};

const STORAGE_KEY = 'elfer_league_profile_v1';

function defaultProfile() {
  return {
    coins: 300,
    skinTone: 0,
    equipped: {
      hair: 'hair_short', jersey: 'jersey_blue', shorts: 'shorts_white',
      boots: 'boots_black', gloves: 'gloves_black', ball: 'ball_classic',
      celebration: 'cel_classic',
    },
    owned: ['hair_short', 'jersey_blue', 'shorts_white', 'boots_black', 'gloves_black', 'ball_classic', 'cel_classic'],
    leagueIndex: 0,
    leaguePoints: 0,
    leagueWins: 0,
    leagueLosses: 0,
    stats: { wins: 0, losses: 0, played: 0, goalsFor: 0, goalsAgainst: 0 },
    cup: { qualWins: 0, bestRun: 0, currentRun: 0, cycleStart: Date.now() },
  };
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultProfile(), parsed, {
      equipped: Object.assign(defaultProfile().equipped, parsed.equipped || {}),
      stats: Object.assign(defaultProfile().stats, parsed.stats || {}),
      cup: Object.assign(defaultProfile().cup, parsed.cup || {}),
    });
  } catch (e) {
    return defaultProfile();
  }
}

export function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function getLeague(index) {
  return LEAGUES[Math.max(0, Math.min(LEAGUES.length - 1, index))];
}

export function isCupUnlocked(profile) {
  return profile.leagueIndex >= CUP_UNLOCK_LEAGUE_INDEX && profile.cup.qualWins >= CUP_QUAL_WINS;
}

export function findItem(category, id) {
  return COSMETICS[category].find((i) => i.id === id);
}

export function ownsItem(profile, id) {
  return profile.owned.includes(id);
}

export function purchaseItem(profile, category, id) {
  const item = findItem(category, id);
  if (!item || ownsItem(profile, id) || profile.coins < item.price) return false;
  profile.coins -= item.price;
  profile.owned.push(id);
  saveProfile(profile);
  return true;
}

export function equipItem(profile, category, id) {
  if (!ownsItem(profile, id)) return false;
  profile.equipped[category] = id;
  saveProfile(profile);
  return true;
}

// Returns { promoted, relegated, coinsEarned }
export function applyLeagueResult(profile, won) {
  const league = getLeague(profile.leagueIndex);
  let promoted = false, relegated = false;
  const coinsEarned = won ? 40 + profile.leagueIndex * 12 : 12;
  profile.coins += coinsEarned;
  profile.stats.played += 1;

  if (won) {
    profile.stats.wins += 1;
    profile.leagueWins += 1;
    profile.leaguePoints += 1;
    if (profile.leagueIndex >= CUP_UNLOCK_LEAGUE_INDEX) {
      profile.cup.qualWins = Math.min(CUP_QUAL_WINS, profile.cup.qualWins + 1);
    }
    if (profile.leaguePoints >= league.threshold) {
      if (profile.leagueIndex < LEAGUES.length - 1) {
        profile.leagueIndex += 1;
        promoted = true;
      }
      profile.leaguePoints = 0;
      profile.leagueWins = 0;
      profile.leagueLosses = 0;
    }
  } else {
    profile.stats.losses += 1;
    profile.leagueLosses += 1;
    profile.leaguePoints -= 1;
    if (profile.leaguePoints < 0) {
      if (profile.leagueIndex > 0) {
        profile.leagueIndex -= 1;
        relegated = true;
        profile.leaguePoints = Math.max(0, getLeague(profile.leagueIndex).threshold - 2);
      } else {
        profile.leaguePoints = 0;
      }
      profile.leagueWins = 0;
      profile.leagueLosses = 0;
    }
  }
  saveProfile(profile);
  return { promoted, relegated, coinsEarned };
}

export function applyCupResult(profile, won) {
  if (won) {
    profile.cup.currentRun += 1;
    profile.cup.bestRun = Math.max(profile.cup.bestRun, profile.cup.currentRun);
  } else {
    profile.cup.currentRun = 0;
  }
  saveProfile(profile);
}

export function nextWeekendReset(profile) {
  // Countdown to next Monday 00:00 local time, cosmetic season reset.
  const now = new Date();
  const next = new Date(now);
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const daysUntilMonday = (8 - day) % 7 || 7;
  next.setDate(now.getDate() + daysUntilMonday);
  next.setHours(0, 0, 0, 0);
  return next.getTime();
}

export function maybeResetCupCycle(profile) {
  const reset = nextWeekendReset(profile) - 7 * 24 * 3600 * 1000;
  if (profile.cup.cycleStart < reset) {
    profile.cup.qualWins = 0;
    profile.cup.cycleStart = Date.now();
    saveProfile(profile);
  }
}
