// Static game data: clubs, nations, kit colors, drills.

export const NATIONS = [
  { code: 'ENG', flag: '🏴' }, { code: 'ESP', flag: '🇪🇸' }, { code: 'BRA', flag: '🇧🇷' },
  { code: 'GER', flag: '🇩🇪' }, { code: 'FRA', flag: '🇫🇷' }, { code: 'ARG', flag: '🇦🇷' },
  { code: 'ITA', flag: '🇮🇹' }, { code: 'NED', flag: '🇳🇱' }, { code: 'POR', flag: '🇵🇹' },
  { code: 'JPN', flag: '🇯🇵' },
];

export const POSITIONS = [
  { id: 'ST', name: 'Striker', primary: 'shooting' },
  { id: 'W', name: 'Winger', primary: 'pace' },
  { id: 'AM', name: 'Attacking Mid', primary: 'passing' },
  { id: 'CM', name: 'Central Mid', primary: 'passing' },
  { id: 'CB', name: 'Centre Back', primary: 'defending' },
];

// Kit colors as [primary, secondary]
const KITS = [
  ['#d7263d', '#ffffff'], ['#1b998b', '#0b1f26'], ['#2e5eaa', '#ffd23f'],
  ['#f46036', '#282b28'], ['#5b2a86', '#ffffff'], ['#0f8b8d', '#f4f1de'],
  ['#c1121f', '#003049'], ['#606c38', '#fefae0'], ['#3a0ca3', '#f72585'],
  ['#e07a5f', '#3d405b'], ['#2b9348', '#eeef20'], ['#023047', '#fb8500'],
  ['#7b2cbf', '#e0aaff'], ['#9e2a2b', '#e09f3e'], ['#264653', '#e9c46a'],
  ['#08415c', '#cc2936'], ['#4a4e69', '#f2e9e4'], ['#3d5a80', '#ee6c4d'],
  ['#6a994e', '#f2e8cf'], ['#582f0e', '#dda15e'],
];

const CLUB_PREFIXES = [
  'North', 'South', 'East', 'West', 'Royal', 'United', 'Athletic', 'Real', 'Port',
  'Central', 'Lake', 'River', 'Vale', 'Hill', 'Green', 'Iron', 'Old', 'New', 'Union', 'Star',
];
const CLUB_ROOTS = [
  'bridge', 'ford', 'field', 'gate', 'wood', 'ham', 'moor', 'castle', 'haven', 'stone',
  'brook', 'minster', 'chester', 'ton', 'wick', 'burgh', 'dale', 'shire', 'mouth', 'port',
];
const CLUB_SUFFIXES = ['Town', 'City', 'United', 'Rovers', 'Athletic', 'Albion', 'Wanderers', 'FC'];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function makeClubName(rand) {
  const prefix = CLUB_PREFIXES[Math.floor(rand() * CLUB_PREFIXES.length)];
  const root = CLUB_ROOTS[Math.floor(rand() * CLUB_ROOTS.length)];
  const suffix = CLUB_SUFFIXES[Math.floor(rand() * CLUB_SUFFIXES.length)];
  return `${prefix}${root} ${suffix}`;
}

// 6 divisions, 8 clubs each. Division index 5 = lowest (start), 0 = top league.
export const DIVISION_NAMES = [
  'Apex Premier League', 'Championship Elite', 'National League One',
  'Regional Division Two', 'County League', 'Sunday Amateur League',
];

function makeAbbr(name, usedCodes) {
  const words = name.split(' ');
  const candidates = [];
  if (words.length >= 2) candidates.push(words.map((w) => w[0]).join('').toUpperCase().slice(0, 3));
  candidates.push(words[0].slice(0, 3).toUpperCase());
  candidates.push((words[0][0] + words[0].slice(-2)).toUpperCase());
  for (const c of candidates) {
    if (c.length === 3 && !usedCodes.has(c)) { usedCodes.add(c); return c; }
  }
  const base = words[0].slice(0, 2).toUpperCase();
  let i = 1;
  let code = base + i;
  while (usedCodes.has(code)) { i++; code = base + i; }
  usedCodes.add(code);
  return code;
}

export function generateWorld() {
  const rand = seededRandom(1337);
  const divisions = [];
  const usedNames = new Set();
  const usedCodes = new Set();
  for (let d = 0; d < DIVISION_NAMES.length; d++) {
    const clubs = [];
    for (let c = 0; c < 8; c++) {
      let name;
      do { name = makeClubName(rand); } while (usedNames.has(name));
      usedNames.add(name);
      const abbr = makeAbbr(name, usedCodes);
      const kit = KITS[(d * 8 + c) % KITS.length];
      const strength = 20 + (DIVISION_NAMES.length - 1 - d) * 12 + Math.floor(rand() * 8);
      clubs.push({ id: `d${d}c${c}`, name, abbr, kit, strength, division: d, points: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 });
    }
    divisions.push({ name: DIVISION_NAMES[d], clubs });
  }
  return divisions;
}

export function makeFixtures(clubIds) {
  // simple round robin, single leg
  const ids = [...clubIds];
  if (ids.length % 2 === 1) ids.push(null);
  const n = ids.length;
  const rounds = [];
  const fixed = ids[0];
  let rest = ids.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    const home = [fixed, ...rest].slice(0, n / 2);
    const away = [fixed, ...rest].slice(n / 2).reverse();
    for (let i = 0; i < n / 2; i++) {
      if (home[i] !== null && away[i] !== null) round.push([home[i], away[i]]);
    }
    rounds.push(round);
    rest.push(rest.shift());
  }
  return rounds;
}

export const DRILLS = [
  { id: 'shooting', name: 'Shooting Practice', stat: 'shooting', desc: 'Time your strike into the target zone.', energyCost: 15 },
  { id: 'passing', name: 'Passing Drill', stat: 'passing', desc: 'Thread the pass through the gap.', energyCost: 12 },
  { id: 'pace', name: 'Sprint Ladder', stat: 'pace', desc: 'Hit the beat to explode off the line.', energyCost: 15 },
  { id: 'dribbling', name: 'Cone Weave', stat: 'dribbling', desc: 'Cut inside at the right moment.', energyCost: 12 },
  { id: 'defending', name: 'Tackling Drill', stat: 'defending', desc: 'Time the tackle to win the ball.', energyCost: 12 },
  { id: 'physical', name: 'Gym Session', stat: 'physical', desc: 'Grind the rep range for gains.', energyCost: 18 },
];

export const STAT_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];

export const FAME_TIERS = [
  { min: 0, name: 'Nobody', wageBonus: 1 },
  { min: 10, name: 'Local Talent', wageBonus: 1.1 },
  { min: 25, name: 'Rising Star', wageBonus: 1.3 },
  { min: 45, name: 'Fan Favourite', wageBonus: 1.6 },
  { min: 65, name: 'Star Player', wageBonus: 2.1 },
  { min: 85, name: 'Superstar', wageBonus: 2.8 },
  { min: 97, name: 'Legend', wageBonus: 3.6 },
];

export function fameTier(fame) {
  let tier = FAME_TIERS[0];
  for (const t of FAME_TIERS) if (fame >= t.min) tier = t;
  return tier;
}

export const SHOP_ITEMS = [
  { id: 'boots1', name: 'Trainer Boots', desc: '+1 to all stats (permanent)', price: 500, type: 'stat_all', value: 1 },
  { id: 'boots2', name: 'Pro Boots', desc: '+3 Shooting (permanent)', price: 1200, type: 'stat', stat: 'shooting', value: 3 },
  { id: 'boots3', name: 'Speed Boots', desc: '+3 Pace (permanent)', price: 1200, type: 'stat', stat: 'pace', value: 3 },
  { id: 'energy1', name: 'Energy Drink', desc: 'Restore 40 energy instantly', price: 80, type: 'energy', value: 40 },
  { id: 'energy2', name: 'Recovery Shake', desc: 'Restore 100 energy instantly', price: 180, type: 'energy', value: 100 },
];
