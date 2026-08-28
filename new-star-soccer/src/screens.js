import { NATIONS, POSITIONS, DRILLS, STAT_KEYS, SHOP_ITEMS, fameTier, makeFixtures } from './data.js';
import {
  newGame, saveGame, loadGame, hasSave, deleteSave, addLog,
  currentClub, nextFixture, opponentOf, playerStrength, overallRating,
  applyLeagueResult, standings, endOfSeasonCheck, advanceSeason, computeWage,
} from './state.js';
import { drawPitch, drawKitAvatar, drawBall, drawTimingBar } from './render.js';

let state = null;
let root = null;

export function mount(rootEl) {
  root = rootEl;
  if (hasSave()) {
    state = loadGame();
    showHub();
  } else {
    showStart();
  }
}

function setHtml(html) {
  root.innerHTML = html;
}

function $(sel) { return root.querySelector(sel); }
function $all(sel) { return root.querySelectorAll(sel); }

// ---------- START / CREATE ----------

function showStart() {
  setHtml(`
    <div class="logo">⭐ STAR<br>STRIKER<br>CAREER ⚽</div>
    <div class="card">
      <p class="center-text muted">Rise from Sunday League nobody to global superstar.</p>
    </div>
    <div class="btn-row">
      <button class="btn" id="newCareer">New Career</button>
      ${hasSave() ? '<button class="btn secondary" id="continueCareer">Continue</button>' : ''}
    </div>
  `);
  $('#newCareer').onclick = () => showCreate();
  if (hasSave()) $('#continueCareer').onclick = () => { state = loadGame(); showHub(); };
}

function showCreate() {
  setHtml(`
    <h2 class="title-font" style="font-size:16px;color:#ffd23f;">Create Player</h2>
    <div class="card">
      <label>Name</label>
      <input id="pname" maxlength="18" placeholder="e.g. Alex Rivers" />
      <label>Nation</label>
      <select id="pnation">${NATIONS.map((n) => `<option value="${n.code}">${n.flag} ${n.code}</option>`).join('')}</select>
      <label>Position</label>
      <select id="pposition">${POSITIONS.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
    </div>
    <div class="btn-row">
      <button class="btn" id="startBtn">Start Career (Div 6, Sunday League)</button>
      <button class="btn secondary" id="backBtn">Back</button>
    </div>
  `);
  $('#backBtn').onclick = () => showStart();
  $('#startBtn').onclick = () => {
    const name = $('#pname').value.trim() || 'Alex Rivers';
    const nation = $('#pnation').value;
    const position = $('#pposition').value;
    const tmp = newGame({ name, nation, position, clubId: 'd5c0' });
    state = tmp;
    saveGame(state);
    showHub();
  };
}

// ---------- HUB ----------

function statBarsHtml(stats) {
  return STAT_KEYS.map((k) => `
    <div class="statbar-row">
      <div class="statbar-label">${k}</div>
      <div class="statbar-track"><div class="statbar-fill" style="width:${stats[k]}%"></div></div>
      <div class="statbar-value">${stats[k]}</div>
    </div>`).join('');
}

function showHub() {
  const club = currentClub(state);
  const p = state.player;
  const tier = fameTier(p.fame);
  const fixture = nextFixture(state);
  const opp = fixture ? opponentOf(state, fixture) : null;

  setHtml(`
    <div class="top-bar">
      <span class="pill">💰 ${p.money}</span>
      <span class="pill">⭐ ${tier.name}</span>
      <span class="pill">⚡ ${p.energy}/${p.maxEnergy}</span>
    </div>
    <div class="card">
      <canvas id="avatarCanvas" width="200" height="140" style="display:block;margin:0 auto;background:#12213a;border-radius:8px;"></canvas>
      <h2 style="text-align:center;margin-top:8px;">${p.name}</h2>
      <p class="center-text muted">${club.name} · ${state.world[club.division].name}</p>
      <p class="center-text muted">OVR ${overallRating(p.stats)} · Season ${state.season}</p>
      ${statBarsHtml(p.stats)}
    </div>
    <div class="card">
      ${opp ? `<p class="center-text">Next match vs <b>${opp.name}</b></p>` : '<p class="center-text">Season complete!</p>'}
      <div class="btn-row">
        <button class="btn" id="matchBtn" ${opp ? '' : 'disabled'}>${opp ? '⚽ Play Match' : 'No fixture'}</button>
      </div>
    </div>
    <div class="nav-grid">
      <button class="btn secondary" id="trainBtn">🏋️ Training</button>
      <button class="btn secondary" id="tableBtn">📊 Table</button>
      <button class="btn secondary" id="contractBtn">📄 Contract</button>
      <button class="btn secondary" id="shopBtn">🛒 Shop</button>
    </div>
    <div class="card">
      <button class="btn secondary" id="restBtn">😴 Rest (+50 Energy)</button>
    </div>
    <div class="card">
      <h3 style="font-size:13px;">Career News</h3>
      <div class="log-list">${state.log.map((l) => `<div>• ${l}</div>`).join('')}</div>
    </div>
    <div class="btn-row">
      <button class="btn danger" id="resetBtn">Delete Save &amp; Restart</button>
    </div>
  `);

  const canvas = $('#avatarCanvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#12213a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawKitAvatar(ctx, canvas.width / 2, canvas.height / 2 + 20, 1.6, club.kit);

  $('#trainBtn').onclick = () => showTrainingMenu();
  $('#tableBtn').onclick = () => showTable();
  $('#contractBtn').onclick = () => showContract();
  $('#shopBtn').onclick = () => showShop();
  $('#restBtn').onclick = () => {
    p.energy = Math.min(p.maxEnergy, p.energy + 50);
    saveGame(state);
    showHub();
  };
  if (opp) $('#matchBtn').onclick = () => showMatchPreview();
  $('#resetBtn').onclick = () => {
    if (confirm('Delete your save and start a new career?')) { deleteSave(); state = null; showStart(); }
  };
}

// ---------- TRAINING ----------

function showTrainingMenu() {
  setHtml(`
    <h2 class="title-font" style="font-size:15px;color:#ffd23f;">Training Ground</h2>
    <div class="card">
      <p class="muted">Energy: ${state.player.energy}/${state.player.maxEnergy}</p>
      <div class="btn-row">
        ${DRILLS.map((d) => `<button class="btn secondary" data-drill="${d.id}">${d.name} (-${d.energyCost}⚡)</button>`).join('')}
      </div>
    </div>
    <div class="btn-row"><button class="btn" id="backBtn">Back to Hub</button></div>
  `);
  $('#backBtn').onclick = () => showHub();
  $all('[data-drill]').forEach((btn) => {
    btn.onclick = () => {
      const drill = DRILLS.find((d) => d.id === btn.dataset.drill);
      if (state.player.energy < drill.energyCost) { alert('Not enough energy! Rest up first.'); return; }
      showDrillGame(drill);
    };
  });
}

function showDrillGame(drill) {
  setHtml(`
    <h2 class="title-font" style="font-size:14px;color:#ffd23f;">${drill.name}</h2>
    <div class="card">
      <p class="center-text muted">${drill.desc}</p>
      <canvas id="barCanvas" class="bar-canvas" width="360" height="60"></canvas>
      <div class="btn-row"><button class="btn" id="stopBtn">STOP!</button></div>
      <div class="quality-flash" id="result"></div>
    </div>
  `);
  state.player.energy -= drill.energyCost;

  const canvas = $('#barCanvas');
  const ctx = canvas.getContext('2d');
  const stat = state.player.stats[drill.stat];
  const halfWidth = clamp(0.16 - stat / 700, 0.06, 0.2);
  const center = 0.3 + Math.random() * 0.4;
  const target = { t0: center - halfWidth, t1: center + halfWidth };
  const speed = 1.6 + Math.random() * 0.5;
  let start = performance.now();
  let stopped = false;
  let raf;

  function frame(now) {
    if (stopped) return;
    const t = (now - start) / 1000;
    const pos = Math.abs(((t * speed) % 2) - 1);
    drawTimingBar(ctx, canvas.width, canvas.height, pos, target);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  $('#stopBtn').onclick = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    const t = (performance.now() - start) / 1000;
    const pos = Math.abs(((t * speed) % 2) - 1);
    const quality = judge(pos, target);
    let gain = 0;
    if (quality === 'perfect') gain = 2;
    else if (quality === 'good') gain = 1;
    state.player.stats[drill.stat] = Math.min(99, state.player.stats[drill.stat] + gain);
    $('#result').className = `quality-flash quality-${quality}`;
    $('#result').textContent = quality === 'perfect' ? `PERFECT! +2 ${drill.stat}` : quality === 'good' ? `GOOD! +1 ${drill.stat}` : 'MISS! +0';
    saveGame(state);
    setTimeout(() => showTrainingMenu(), 1200);
  };
}

function judge(pos, target) {
  if (pos < target.t0 || pos > target.t1) return 'miss';
  const center = (target.t0 + target.t1) / 2;
  const halfWidth = (target.t1 - target.t0) / 2;
  const dist = Math.abs(pos - center) / halfWidth;
  return dist < 0.4 ? 'perfect' : 'good';
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ---------- MATCH ----------

function showMatchPreview() {
  const fixture = nextFixture(state);
  const opp = opponentOf(state, fixture);
  const club = currentClub(state);
  const isHome = fixture.home === state.clubId;
  setHtml(`
    <h2 class="title-font" style="font-size:14px;color:#ffd23f;">Match Day</h2>
    <div class="card">
      <canvas id="pitchCanvas" class="pitch-canvas" width="360" height="220"></canvas>
      <p class="center-text" style="margin-top:8px;">${isHome ? club.name + ' (H)' : opp.name + ' (H)'}<br>vs<br>${isHome ? opp.name : club.name + ' (A)'}</p>
      <p class="center-text muted">${state.world[club.division].name}</p>
    </div>
    <div class="btn-row">
      <button class="btn" id="kickoffBtn">Kick Off</button>
      <button class="btn secondary" id="backBtn">Back to Hub</button>
    </div>
  `);
  const canvas = $('#pitchCanvas');
  const ctx = canvas.getContext('2d');
  drawPitch(ctx, canvas.width, canvas.height);
  drawKitAvatar(ctx, canvas.width * 0.3, canvas.height * 0.6, 1.2, club.kit);
  drawKitAvatar(ctx, canvas.width * 0.7, canvas.height * 0.4, 1.2, opp.kit);
  drawBall(ctx, canvas.width / 2, canvas.height / 2, 8);

  $('#backBtn').onclick = () => showHub();
  $('#kickoffBtn').onclick = () => runMatch(fixture, opp);
}

function runMatch(fixture, opp) {
  const club = currentClub(state);
  const myStrength = playerStrength(state) + Math.floor(opp.strength * 0.15);
  const diff = myStrength - opp.strength;

  const moments = buildMoments(diff);
  const matchState = {
    momentIndex: 0, moments, myGoals: 0, oppGoals: 0,
    commentary: [], rating: 6.0, contributions: 0,
  };

  // Simulate a couple of ambient team goals independent of player, weighted by strength diff.
  simulateAmbientGoals(matchState, diff);

  renderMatchMoment(fixture, opp, matchState);
}

function buildMoments(diff) {
  const pos = state.player.position;
  const attackWeight = pos === 'CB' ? 0.3 : pos === 'CM' || pos === 'AM' ? 0.55 : 0.75;
  const moments = [];
  const count = 5;
  for (let i = 0; i < count; i++) {
    moments.push(Math.random() < attackWeight ? 'attack' : 'defend');
  }
  return moments;
}

function simulateAmbientGoals(matchState, diff) {
  const base = 1 + Math.random();
  const favor = clamp(0.5 + diff / 100, 0.15, 0.85);
  const totalGoals = Math.round(base + Math.random() * 1.5);
  for (let i = 0; i < totalGoals; i++) {
    if (Math.random() < favor) matchState.myGoals++; else matchState.oppGoals++;
  }
}

function renderMatchMoment(fixture, opp, matchState) {
  const club = currentClub(state);
  if (matchState.momentIndex >= matchState.moments.length) {
    return finishMatch(fixture, opp, matchState);
  }
  const type = matchState.moments[matchState.momentIndex];
  const stat = type === 'attack' ? (state.player.position === 'CB' ? 'passing' : 'shooting') : 'defending';

  setHtml(`
    <h2 class="title-font" style="font-size:13px;color:#ffd23f;">${club.name} ${matchState.myGoals} - ${matchState.oppGoals} ${opp.name}</h2>
    <div class="card">
      <p class="commentary">${type === 'attack' ? '⚡ You break forward — time your strike!' : '🛡️ Opponent is attacking — time your tackle!'}</p>
      <canvas id="barCanvas" class="bar-canvas" width="360" height="60"></canvas>
      <div class="btn-row"><button class="btn" id="stopBtn">${type === 'attack' ? 'SHOOT!' : 'TACKLE!'}</button></div>
      <div class="quality-flash" id="result"></div>
    </div>
  `);

  const canvas = $('#barCanvas');
  const ctx = canvas.getContext('2d');
  const statVal = state.player.stats[stat];
  const halfWidth = clamp(0.15 - statVal / 800, 0.05, 0.2);
  const center = 0.25 + Math.random() * 0.5;
  const target = { t0: center - halfWidth, t1: center + halfWidth };
  const speed = 1.9 + Math.random() * 0.6;
  let start = performance.now();
  let stopped = false;
  let raf;

  function frame(now) {
    if (stopped) return;
    const t = (now - start) / 1000;
    const pos = Math.abs(((t * speed) % 2) - 1);
    drawTimingBar(ctx, canvas.width, canvas.height, pos, target);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  $('#stopBtn').onclick = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    const t = (performance.now() - start) / 1000;
    const pos = Math.abs(((t * speed) % 2) - 1);
    const quality = judge(pos, target);
    resolveMoment(type, quality, matchState);
    $('#result').className = `quality-flash quality-${quality}`;
    $('#result').textContent = describeQuality(type, quality);
    matchState.momentIndex++;
    saveGame(state);
    setTimeout(() => renderMatchMoment(fixture, opp, matchState), 1100);
  };
}

function describeQuality(type, quality) {
  if (type === 'attack') {
    if (quality === 'perfect') return 'GOAL!! ⚽🔥';
    if (quality === 'good') return 'Good chance... saved.';
    return 'Miskick — miss.';
  }
  if (quality === 'perfect') return 'Perfect tackle! Ball won.';
  if (quality === 'good') return 'Tackle wins it, bit scrappy.';
  return "Beaten! They're through...";
}

function resolveMoment(type, quality, matchState) {
  matchState.contributions++;
  if (type === 'attack') {
    if (quality === 'perfect') { matchState.myGoals++; state.player.goals++; matchState.rating += 1.2; }
    else if (quality === 'good') { matchState.rating += 0.2; }
    else { matchState.rating -= 0.3; }
  } else {
    if (quality === 'perfect') { matchState.rating += 0.8; }
    else if (quality === 'good') { matchState.rating += 0.1; }
    else { matchState.oppGoals++; matchState.rating -= 0.4; }
  }
}

function finishMatch(fixture, opp, matchState) {
  const club = currentClub(state);
  const p = state.player;
  applyLeagueResult(state, club, opp, matchState.myGoals, matchState.oppGoals);
  state.fixtureIndex++;

  const rating = clamp(Math.round(matchState.rating * 10) / 10, 3, 10);
  const result = matchState.myGoals > matchState.oppGoals ? 'win' : matchState.myGoals < matchState.oppGoals ? 'loss' : 'draw';
  p.appearances++;

  const wage = computeWage(state);
  p.money += wage;
  const goalBonus = p.goals > 0 ? 0 : 0;
  const fameGain = clamp(Math.round((rating - 5) * 2 + (result === 'win' ? 3 : result === 'draw' ? 1 : 0)), -2, 12);
  p.fame = clamp(p.fame + fameGain, 0, 100);
  p.energy = clamp(p.energy - 20, 0, p.maxEnergy);
  p.contractMatchesLeft = Math.max(0, p.contractMatchesLeft - 1);

  addLog(state, `${result === 'win' ? 'Won' : result === 'loss' ? 'Lost' : 'Drew'} vs ${opp.name} ${matchState.myGoals}-${matchState.oppGoals}. Rating ${rating}.`);
  saveGame(state);

  const seasonOver = endOfSeasonCheck(state);
  let seasonHtml = '';
  let seasonInfo = null;
  if (seasonOver) {
    seasonInfo = advanceSeason(state);
    seasonHtml = `<p class="center-text">${seasonInfo.promoted ? '🎉 Promoted!' : seasonInfo.relegated ? '⬇️ Relegated.' : 'Season complete.'} Finished P${seasonInfo.position}.</p>`;
    saveGame(state);
  }

  setHtml(`
    <h2 class="title-font" style="font-size:14px;color:#ffd23f;text-align:center;">FULL TIME</h2>
    <div class="card">
      <div class="big-score">${club.abbr} ${matchState.myGoals} - ${matchState.oppGoals} ${opp.abbr}</div>
      <p class="center-text">Match Rating: <b>${rating}</b></p>
      <p class="center-text muted">Wage earned: 💰${wage} · Fame ${fameGain >= 0 ? '+' : ''}${fameGain}</p>
      ${seasonHtml}
    </div>
    <div class="btn-row"><button class="btn" id="continueBtn">Continue</button></div>
  `);
  $('#continueBtn').onclick = () => showHub();
}

// ---------- TABLE ----------

function showTable() {
  const club = currentClub(state);
  const rows = standings(state);
  setHtml(`
    <h2 class="title-font" style="font-size:14px;color:#ffd23f;">${state.world[club.division].name}</h2>
    <div class="card table-wrap">
      <table>
        <thead><tr><th>#</th><th class="name">Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
        <tbody>
          ${rows.map((c, i) => `
            <tr class="${c.id === state.clubId ? 'me' : ''}">
              <td>${i + 1}</td><td class="name">${c.name}</td><td>${c.played}</td><td>${c.won}</td><td>${c.drawn}</td><td>${c.lost}</td><td>${c.gf - c.ga}</td><td>${c.points}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="btn-row"><button class="btn" id="backBtn">Back to Hub</button></div>
  `);
  $('#backBtn').onclick = () => showHub();
}

// ---------- CONTRACT ----------

function showContract() {
  const p = state.player;
  const club = currentClub(state);
  const tier = fameTier(p.fame);
  const canOffer = p.contractMatchesLeft <= 5;

  const offers = [];
  if (canOffer) {
    const div = club.division;
    const pool = [];
    if (div > 0) pool.push(...state.world[div - 1].clubs);
    pool.push(...state.world[div].clubs.filter((c) => c.id !== state.clubId));
    for (let i = 0; i < 3 && pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      offers.push(pool.splice(idx, 1)[0]);
    }
  }

  setHtml(`
    <h2 class="title-font" style="font-size:14px;color:#ffd23f;">Contract</h2>
    <div class="card">
      <p>Club: <b>${club.name}</b></p>
      <p>Wage: 💰${p.wage}/match</p>
      <p>Matches left on deal: ${p.contractMatchesLeft}</p>
      <p>Fame tier: ${tier.name}</p>
      <div class="btn-row"><button class="btn" id="renewBtn">Renew Contract (💰${computeWage(state)}/match)</button></div>
    </div>
    ${canOffer ? `
    <div class="card">
      <h3 style="font-size:13px;">Transfer Offers</h3>
      ${offers.map((c) => `
        <div class="shop-item">
          <span>${c.name} <span class="muted">(${state.world[c.division].name})</span></span>
          <button class="btn secondary" style="width:auto;" data-club="${c.id}">Sign</button>
        </div>`).join('')}
    </div>` : '<div class="card"><p class="muted center-text">Transfer offers appear when your contract is close to expiring.</p></div>'}
    <div class="btn-row"><button class="btn secondary" id="backBtn">Back to Hub</button></div>
  `);
  $('#backBtn').onclick = () => showHub();
  $('#renewBtn').onclick = () => {
    p.wage = computeWage(state);
    p.contractMatchesLeft = 15;
    addLog(state, `Renewed contract with ${club.name} at 💰${p.wage}/match.`);
    saveGame(state);
    showContract();
  };
  $all('[data-club]').forEach((btn) => {
    btn.onclick = () => {
      const newClub = offers.find((c) => c.id === btn.dataset.club);
      state.clubId = newClub.id;
      p.wage = computeWage(state);
      p.contractMatchesLeft = 15;
      addLog(state, `Transferred to ${newClub.name}!`);
      rebuildFixturesForNewClub();
      saveGame(state);
      showHub();
    };
  });
}

function rebuildFixturesForNewClub() {
  // Re-run season setup for the new club's division so fixtures are valid.
  const club = currentClub(state);
  const division = state.world[club.division];
  for (const c of division.clubs) Object.assign(c, { points: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 });
  const rounds = makeFixtures(division.clubs.map((c) => c.id));
  const flat = [];
  for (const round of rounds) for (const [h, a] of round) if (h === state.clubId || a === state.clubId) flat.push({ home: h, away: a, played: false });
  state.fixtures = flat;
  state.fixtureIndex = 0;
}

// ---------- SHOP ----------

function showShop() {
  const p = state.player;
  setHtml(`
    <h2 class="title-font" style="font-size:14px;color:#ffd23f;">Shop</h2>
    <div class="card">
      <p class="muted">Money: 💰${p.money}</p>
      ${SHOP_ITEMS.map((item) => `
        <div class="shop-item">
          <span><b>${item.name}</b><br><span class="muted">${item.desc}</span></span>
          <div>
            <div class="price">💰${item.price}</div>
            <button class="btn secondary" style="width:auto;margin-top:4px;" data-item="${item.id}">Buy</button>
          </div>
        </div>`).join('')}
    </div>
    <div class="btn-row"><button class="btn" id="backBtn">Back to Hub</button></div>
  `);
  $('#backBtn').onclick = () => showHub();
  $all('[data-item]').forEach((btn) => {
    btn.onclick = () => {
      const item = SHOP_ITEMS.find((i) => i.id === btn.dataset.item);
      if (p.money < item.price) { alert('Not enough money!'); return; }
      p.money -= item.price;
      if (item.type === 'stat_all') for (const k of STAT_KEYS) p.stats[k] = Math.min(99, p.stats[k] + item.value);
      else if (item.type === 'stat') p.stats[item.stat] = Math.min(99, p.stats[item.stat] + item.value);
      else if (item.type === 'energy') p.energy = Math.min(p.maxEnergy, p.energy + item.value);
      addLog(state, `Bought ${item.name}.`);
      saveGame(state);
      showShop();
    };
  });
}
