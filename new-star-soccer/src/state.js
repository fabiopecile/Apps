import { generateWorld, makeFixtures, STAT_KEYS, fameTier } from './data.js';

const SAVE_KEY = 'nss_clone_save_v1';

export function newGame({ name, nation, position, clubId }) {
  const world = generateWorld();
  const club = findClub(world, clubId);
  const stats = {};
  for (const k of STAT_KEYS) stats[k] = 15 + Math.floor(Math.random() * 6);
  const state = {
    player: {
      name, nation, position, stats,
      energy: 100, maxEnergy: 100,
      money: 200, fame: 0, morale: 80,
      goals: 0, assists: 0, appearances: 0,
      wage: 60, contractMatchesLeft: 15,
    },
    clubId,
    world,
    season: 1,
    fixtures: [],
    fixtureIndex: 0,
    log: [`Welcome to ${club.name}! Your journey begins.`],
    ownedItems: [],
  };
  setupSeasonFixtures(state);
  return state;
}

function setupSeasonFixtures(state) {
  const club = findClub(state.world, state.clubId);
  const division = state.world[club.division];
  for (const c of division.clubs) Object.assign(c, { points: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 });
  const rounds = makeFixtures(division.clubs.map((c) => c.id));
  const flat = [];
  for (const round of rounds) for (const [h, a] of round) if (h === state.clubId || a === state.clubId) flat.push({ home: h, away: a, played: false });
  state.fixtures = flat;
  state.fixtureIndex = 0;
}

export function findClub(world, clubId) {
  for (const div of world) for (const c of div.clubs) if (c.id === clubId) return c;
  return null;
}

export function currentClub(state) {
  return findClub(state.world, state.clubId);
}

export function nextFixture(state) {
  return state.fixtures[state.fixtureIndex] || null;
}

export function opponentOf(state, fixture) {
  const oppId = fixture.home === state.clubId ? fixture.away : fixture.home;
  return findClub(state.world, oppId);
}

export function overallRating(stats) {
  const sum = STAT_KEYS.reduce((s, k) => s + stats[k], 0);
  return Math.round(sum / STAT_KEYS.length);
}

export function playerStrength(state) {
  return overallRating(state.player.stats);
}

export function saveGame(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function addLog(state, msg) {
  state.log.unshift(msg);
  state.log = state.log.slice(0, 30);
}

export function computeWage(state) {
  const base = 40 + playerStrength(state) * 3;
  const tier = fameTier(state.player.fame);
  return Math.round(base * tier.wageBonus);
}

export function applyLeagueResult(state, club, opp, myGoals, oppGoals) {
  club.played++; opp.played++;
  club.gf += myGoals; club.ga += oppGoals;
  opp.gf += oppGoals; opp.ga += myGoals;
  if (myGoals > oppGoals) { club.won++; club.points += 3; opp.lost++; }
  else if (myGoals < oppGoals) { opp.won++; opp.points += 3; club.lost++; }
  else { club.drawn++; opp.drawn++; club.points += 1; opp.points += 1; }
}

export function standings(state) {
  const club = currentClub(state);
  const division = state.world[club.division];
  return [...division.clubs].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}

export function endOfSeasonCheck(state) {
  const remaining = state.fixtures.slice(state.fixtureIndex).length;
  return remaining === 0;
}

export function advanceSeason(state) {
  const table = standings(state);
  const myIndex = table.findIndex((c) => c.id === state.clubId);
  const club = currentClub(state);
  let promoted = false, relegated = false;
  if (myIndex < 2 && club.division > 0) { club.division -= 1; promoted = true; }
  else if (myIndex >= table.length - 2 && club.division < state.world.length - 1) { club.division += 1; relegated = true; }
  state.season += 1;
  setupSeasonFixtures(state);
  state.player.contractMatchesLeft = Math.max(state.player.contractMatchesLeft, 15);
  return { promoted, relegated, position: myIndex + 1 };
}
