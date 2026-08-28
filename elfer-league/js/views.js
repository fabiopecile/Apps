import {
  LEAGUES, getLeague, COSMETICS, CATEGORY_LABELS, findItem, ownsItem,
  purchaseItem, equipItem, isCupUnlocked, CUP_UNLOCK_LEAGUE_INDEX, CUP_QUAL_WINS,
  nextWeekendReset,
} from './state.js';
import { renderCharacter, setPose } from './character.js';

function dotsHTML(total, filled) {
  let html = '';
  for (let i = 0; i < total; i++) {
    html += `<span class="dot ${i < filled ? 'filled' : ''}"></span>`;
  }
  return html;
}

export function renderHome(app) {
  const p = app.profile;
  const league = getLeague(p.leagueIndex);
  document.getElementById('homeLeagueName').textContent = league.name;
  document.getElementById('homeLeagueBadge').style.setProperty('--league-color', league.color);
  document.getElementById('homeProgressDots').innerHTML = dotsHTML(league.threshold, p.leaguePoints);
  document.getElementById('homeMiniStats').textContent = `${p.leagueWins}S · ${p.leagueLosses}N`;
  document.getElementById('tileLeagueSub').textContent = league.name;
  document.getElementById('tileStatsSub').textContent = `${p.stats.wins} Siege`;
  const unlocked = isCupUnlocked(p);
  document.getElementById('tileCupSub').textContent = unlocked ? 'Bereit!' : 'Gesperrt';
  document.getElementById('goCup').classList.toggle('locked', !unlocked);
  const svg = document.getElementById('homeCharacterSvg');
  renderCharacter(svg, p, {});
  setPose(svg, 'idle');
}

let activeCategory = 'hair';

export function renderCharacterView(app) {
  const p = app.profile;
  const svg = document.getElementById('characterSvg');
  renderCharacter(svg, p, {});
  setPose(svg, 'idle');

  const tabs = document.getElementById('catTabs');
  tabs.innerHTML = Object.keys(COSMETICS).map((cat) =>
    `<button class="cat-tab ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}">${CATEGORY_LABELS[cat]}</button>`
  ).join('');
  tabs.querySelectorAll('.cat-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderCharacterView(app);
    });
  });

  const scroller = document.getElementById('itemScroller');
  const items = COSMETICS[activeCategory];
  scroller.innerHTML = items.map((item) => {
    const owned = ownsItem(p, item.id);
    const equipped = p.equipped[activeCategory] === item.id;
    const swatch = item.c1 ? `background:${item.c1}${item.c2 ? `; background-image:linear-gradient(135deg,${item.c1},${item.c2})` : ''}` : '';
    return `
      <div class="item-card rarity-${item.rarity} ${equipped ? 'equipped' : ''}" data-id="${item.id}">
        <div class="item-swatch" style="${swatch}">${item.c1 ? '' : '⚡'}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-rarity">${item.rarity}</div>
        ${equipped
          ? '<div class="item-btn equipped-btn">Ausgerüstet</div>'
          : owned
            ? '<button class="item-btn equip-btn">Ausrüsten</button>'
            : `<button class="item-btn buy-btn ${p.coins < item.price ? 'disabled' : ''}"><span class="coin-icon">●</span>${item.price}</button>`}
      </div>`;
  }).join('');

  scroller.querySelectorAll('.item-card').forEach((card) => {
    const id = card.dataset.id;
    const btn = card.querySelector('.equip-btn, .buy-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (btn.classList.contains('buy-btn')) {
        if (purchaseItem(p, activeCategory, id)) {
          equipItem(p, activeCategory, id);
          app.onProfileChange();
          renderCharacterView(app);
        }
      } else {
        equipItem(p, activeCategory, id);
        app.onProfileChange();
        renderCharacterView(app);
      }
    });
  });
}

export function renderLeagueView(app) {
  const p = app.profile;
  const league = getLeague(p.leagueIndex);
  const ladder = document.getElementById('ladder');
  ladder.innerHTML = LEAGUES.map((l, i) => {
    const state = i === p.leagueIndex ? 'current' : i < p.leagueIndex ? 'cleared' : 'locked';
    return `<div class="ladder-rung ${state}" style="--league-color:${l.color}">
      <span class="ladder-name">${l.name}</span>
      <span class="ladder-mark">${state === 'cleared' ? '✓' : state === 'locked' ? '🔒' : '●'}</span>
    </div>`;
  }).reverse().join('');

  document.getElementById('lpName').textContent = league.name;
  document.getElementById('lpName').style.color = league.color;
  document.getElementById('lpRecord').textContent = `${p.leagueWins} Siege · ${p.leagueLosses} Niederlagen`;
  document.getElementById('lpDots').innerHTML = dotsHTML(league.threshold, p.leaguePoints);
  document.getElementById('lpHint').textContent =
    `Noch ${league.threshold - p.leaguePoints} Sieg(e) bis zum Aufstieg — bei einer Niederlage sinkt dein Punktestand, unter 0 steigst du ab.`;

  const teaser = document.getElementById('leagueCupTeaser');
  const reachedLeague = p.leagueIndex >= CUP_UNLOCK_LEAGUE_INDEX;
  teaser.innerHTML = `
    <div class="cup-teaser-title">🏆 Weekend Cup</div>
    <div class="req-row ${reachedLeague ? 'done' : ''}"><span class="req-check">${reachedLeague ? '✓' : ''}</span> Erreiche ${LEAGUES[CUP_UNLOCK_LEAGUE_INDEX].name}</div>
    <div class="req-row ${p.cup.qualWins >= CUP_QUAL_WINS ? 'done' : ''}"><span class="req-check">${p.cup.qualWins >= CUP_QUAL_WINS ? '✓' : ''}</span> ${p.cup.qualWins}/${CUP_QUAL_WINS} Siege</div>
  `;
}

export function renderCupView(app) {
  const p = app.profile;
  const reqs = document.getElementById('cupReqs');
  const reachedLeague = p.leagueIndex >= CUP_UNLOCK_LEAGUE_INDEX;
  reqs.innerHTML = `
    <div class="req-row ${reachedLeague ? 'done' : ''}"><span class="req-check">${reachedLeague ? '✓' : ''}</span> Erreiche ${LEAGUES[CUP_UNLOCK_LEAGUE_INDEX].name}</div>
    <div class="req-row ${p.cup.qualWins >= CUP_QUAL_WINS ? 'done' : ''}"><span class="req-check">${p.cup.qualWins >= CUP_QUAL_WINS ? '✓' : ''}</span> ${p.cup.qualWins}/${CUP_QUAL_WINS} Siege</div>
  `;
  document.getElementById('cupRun').innerHTML = `
    <div class="cup-run-stat"><span>Aktueller Lauf</span><b>${p.cup.currentRun}</b></div>
    <div class="cup-run-stat"><span>Bester Lauf</span><b>${p.cup.bestRun}</b></div>
  `;
  const btn = document.getElementById('playCupBtn');
  const unlocked = isCupUnlocked(p);
  btn.classList.toggle('disabled', !unlocked);
  btn.textContent = unlocked ? 'JETZT SPIELEN' : 'GESPERRT';

  const tick = () => {
    const diff = nextWeekendReset(p) - Date.now();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const el = document.getElementById('cupCountdown');
    if (el) el.textContent = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  tick();
  clearInterval(app._cupTimer);
  app._cupTimer = setInterval(tick, 1000);
}

export function renderStatsView(app) {
  const p = app.profile;
  const winrate = p.stats.played ? Math.round((p.stats.wins / p.stats.played) * 100) : 0;
  const items = [
    ['Aktuelle Liga', getLeague(p.leagueIndex).name],
    ['Spiele', p.stats.played],
    ['Siege', p.stats.wins],
    ['Niederlagen', p.stats.losses],
    ['Siegquote', winrate + '%'],
    ['Bester Cup-Lauf', p.cup.bestRun],
    ['Münzen', p.coins],
  ];
  document.getElementById('statsGrid').innerHTML = items.map(([label, val]) =>
    `<div class="stat-tile"><div class="stat-val">${val}</div><div class="stat-label">${label}</div></div>`
  ).join('');
}
