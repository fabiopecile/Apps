// ---------------------------------------------------------------------------
// Career Pro — a text-based football career simulator
// ---------------------------------------------------------------------------

const screenRoot = document.getElementById('screenRoot');
const progressFill = document.getElementById('progressFill');
const toastEl = document.getElementById('toast');
const modalRoot = document.getElementById('modalRoot');

// ---------- helpers ----------
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const chance = (p) => Math.random() < p;
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function formatValue(k) {
  if (k >= 1000) return `€${(k / 1000).toFixed(1)}M`;
  return `€${Math.round(k)}K`;
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

function setProgress(pct) {
  progressFill.style.width = `${pct}%`;
}

// ---------- global state ----------
let game = {
  screen: 'country',
  country: null,
  lastName: '',
  number: 10,
  foot: 'Right',
  position: 'ST',
  player: null,
};

function resetGame() {
  game = {
    screen: 'country',
    country: null,
    lastName: '',
    number: 10,
    foot: 'Right',
    position: 'ST',
    player: null,
  };
  renderCountryScreen();
}

// ---------------------------------------------------------------------------
// SCREEN 1 — Country select
// ---------------------------------------------------------------------------
function renderCountryScreen() {
  game.screen = 'country';
  setProgress(20);
  screenRoot.innerHTML = `
    <div class="screen">
      <h1 class="screen-title">Nationality</h1>
      <input type="text" id="countrySearch" class="search-box" placeholder="Search country" autocomplete="off" />
      <div class="country-list" id="countryList"></div>
      <div class="btn-row">
        <button class="btn btn-secondary" disabled>Back</button>
        <button class="btn btn-primary" id="countryContinue" ${game.country ? '' : 'disabled'}>Continue</button>
      </div>
    </div>
  `;
  const search = document.getElementById('countrySearch');
  const listEl = document.getElementById('countryList');
  const continueBtn = document.getElementById('countryContinue');

  function paintList(filter) {
    const f = (filter || '').trim().toLowerCase();
    const items = COUNTRIES.filter((c) => c.name.toLowerCase().includes(f));
    listEl.innerHTML = items.map((c) => `
      <div class="country-item ${game.country && game.country.code === c.code ? 'selected' : ''}" data-code="${c.code}">
        <span class="flag">${c.flag}</span><span class="name">${escapeHtml(c.name)}</span>
      </div>
    `).join('') || `<div style="padding:20px;color:var(--text-dim);grid-column:1/-1;">No countries found</div>`;
  }

  listEl.addEventListener('click', (e) => {
    const item = e.target.closest('.country-item');
    if (!item) return;
    const code = item.dataset.code;
    game.country = COUNTRIES.find((c) => c.code === code);
    continueBtn.disabled = false;
    paintList(search.value);
  });

  search.addEventListener('input', () => paintList(search.value));

  continueBtn.addEventListener('click', () => {
    if (!game.country) return;
    renderJerseyScreen();
  });

  paintList('');
}

// ---------------------------------------------------------------------------
// SCREEN 2 — Jersey setup
// ---------------------------------------------------------------------------
function renderJerseyScreen() {
  game.screen = 'jersey';
  setProgress(50);
  screenRoot.innerHTML = `
    <div class="screen">
      <h1 class="screen-title">Your shirt</h1>
      <div class="jersey-wrap">
        <svg viewBox="0 0 200 220">
          <path d="M40 20 L75 5 Q100 25 125 5 L160 20 L190 55 L165 78 L155 68 L155 210 Q100 220 45 210 L45 68 L35 78 L10 55 Z"
                fill="#1d2027" stroke="#3ddc97" stroke-width="3" />
          <path d="M75 5 Q100 25 125 5 L118 16 Q100 30 82 16 Z" fill="#0b0c10" />
          <text id="jerseyName" x="100" y="80" text-anchor="middle" fill="#f5f6f7" font-size="17" class="jersey-name">LAST NAME</text>
          <text id="jerseyNumber" x="100" y="150" text-anchor="middle" fill="#f5f6f7" font-size="62" class="jersey-number">10</text>
        </svg>
      </div>

      <div>
        <span class="field-label">Last name</span>
        <input type="text" id="lastNameInput" class="text-input" placeholder="LAST NAME" maxlength="16" value="${escapeHtml(game.lastName)}" />
      </div>
      <div class="field-row">
        <div>
          <span class="field-label">Number</span>
          <input type="number" id="numberInput" class="text-input" min="1" max="99" value="${game.number}" />
        </div>
        <div>
          <span class="field-label">Preferred foot</span>
          <div class="toggle-row" id="footToggle">
            <div class="toggle-opt ${game.foot === 'Left' ? 'active' : ''}" data-foot="Left">Left</div>
            <div class="toggle-opt ${game.foot === 'Right' ? 'active' : ''}" data-foot="Right">Right</div>
          </div>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-secondary" id="jerseyBack">Back</button>
        <button class="btn btn-primary" id="jerseyContinue">Continue</button>
      </div>
    </div>
  `;

  const nameInput = document.getElementById('lastNameInput');
  const numberInput = document.getElementById('numberInput');
  const jerseyName = document.getElementById('jerseyName');
  const jerseyNumber = document.getElementById('jerseyNumber');
  const footToggle = document.getElementById('footToggle');

  nameInput.addEventListener('input', () => {
    game.lastName = nameInput.value;
    jerseyName.textContent = (nameInput.value || 'LAST NAME').toUpperCase();
  });
  numberInput.addEventListener('input', () => {
    let n = parseInt(numberInput.value, 10);
    if (Number.isNaN(n)) n = 10;
    n = clamp(n, 1, 99);
    game.number = n;
    jerseyNumber.textContent = n;
  });
  footToggle.addEventListener('click', (e) => {
    const opt = e.target.closest('.toggle-opt');
    if (!opt) return;
    game.foot = opt.dataset.foot;
    footToggle.querySelectorAll('.toggle-opt').forEach((o) => o.classList.toggle('active', o.dataset.foot === game.foot));
  });

  document.getElementById('jerseyBack').addEventListener('click', renderCountryScreen);
  document.getElementById('jerseyContinue').addEventListener('click', () => {
    if (!game.lastName.trim()) { nameInput.focus(); return; }
    renderPositionScreen();
  });
}

// ---------------------------------------------------------------------------
// SCREEN 3 — Position select
// ---------------------------------------------------------------------------
function renderPositionScreen() {
  game.screen = 'position';
  setProgress(80);
  screenRoot.innerHTML = `
    <div class="screen">
      <h1 class="screen-title">Position</h1>
      <div class="pitch" id="pitch">
        <div class="box-top"></div>
        <div class="box-bottom"></div>
        ${POSITIONS.map((p) => `
          <div class="pos-pill ${game.position === p.code ? 'selected' : ''}" style="top:${p.top}%;left:${p.left}%;" data-code="${p.code}">${p.code}</div>
        `).join('')}
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" id="posBack">Back</button>
        <button class="btn btn-primary" id="posConfirm">Confirm identity</button>
      </div>
    </div>
  `;
  const pitch = document.getElementById('pitch');
  pitch.addEventListener('click', (e) => {
    const pill = e.target.closest('.pos-pill');
    if (!pill) return;
    game.position = pill.dataset.code;
    pitch.querySelectorAll('.pos-pill').forEach((p) => p.classList.toggle('selected', p.dataset.code === game.position));
  });
  document.getElementById('posBack').addEventListener('click', renderJerseyScreen);
  document.getElementById('posConfirm').addEventListener('click', startCareer);
}

// ---------------------------------------------------------------------------
// Career engine
// ---------------------------------------------------------------------------
function computeValue(ovr, age) {
  let base = Math.pow(1.11, ovr - 60) * 250;
  if (age <= 21) base *= 2.2;
  else if (age <= 24) base *= 1.6;
  else if (age <= 28) base *= 1.2;
  else if (age <= 31) base *= 0.7;
  else if (age <= 34) base *= 0.35;
  else base *= 0.12;
  return Math.max(20, Math.round(base));
}

function tierForOvr(ovr) {
  return CLUB_TIERS.find((t) => ovr >= t.minOvr) || CLUB_TIERS[CLUB_TIERS.length - 1];
}

function ovrChipClass(ovr) {
  if (ovr >= 80) return 'o-gold';
  if (ovr >= 70) return 'o-blue';
  return 'o-grey';
}

function crestInitials(name) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function startCareer() {
  const potential = randInt(66, 92);
  const ovr = clamp(potential - randInt(14, 22), 47, 68);
  const startTier = CLUB_TIERS[CLUB_TIERS.length - 1];
  const club = { name: pick(startTier.clubs), tier: startTier.id };
  game.player = {
    age: 18,
    ovr,
    potential,
    club,
    seasons: [],
    intl: { started: false, apps: 0, goals: 0, ast: 0 },
    trophies: [],
    injuryRecoveryBonus: 0,
    pendingEvent: null,
    retired: false,
  };
  renderCareerScreen();
}

function progressOvr(ovr, age, potential, recoveryBonus) {
  let delta;
  if (age <= 20) delta = randInt(1, 4);
  else if (age <= 24) delta = randInt(0, 3);
  else if (age <= 28) delta = randInt(-1, 2);
  else if (age <= 31) delta = randInt(-2, 1);
  else if (age <= 34) delta = randInt(-4, -1);
  else delta = randInt(-7, -3);
  let next = ovr + delta + (recoveryBonus || 0);
  next = clamp(next, 40, potential);
  return next;
}

function computeSeasonStats(ovr, position, clubTier, injurySeverity) {
  const posDef = POSITIONS.find((p) => p.code === position);
  const tierAvgOvr = CLUB_TIERS[clubTier - 1].minOvr + 4;
  const diff = ovr - tierAvgOvr;
  const appsChance = clamp(0.55 + diff * 0.01, 0.3, 0.95);
  let apps = Math.round(38 * appsChance * randFloat(0.75, 1.05));
  if (injurySeverity) apps = Math.round(apps * clamp(1 - injurySeverity / 14, 0.15, 0.9));
  apps = clamp(apps, 0, 38);
  const form = randFloat(0.7, 1.3);
  const strength = ovr / 80;
  let goals = Math.round(apps * posDef.goal * strength * form * 0.5 * randFloat(0.6, 1.15));
  let ast = Math.round(apps * posDef.ast * strength * form * 0.4 * randFloat(0.6, 1.15));
  return { apps, goals: Math.max(0, goals), ast: Math.max(0, ast) };
}

function computeIntlStats(ovr, position) {
  const posDef = POSITIONS.find((p) => p.code === position);
  const apps = randInt(2, 9);
  const goals = Math.round(apps * posDef.goal * (ovr / 85) * 0.4 * randFloat(0.4, 1.1));
  const ast = Math.round(apps * posDef.ast * (ovr / 85) * 0.35 * randFloat(0.4, 1.1));
  return { apps, goals: Math.max(0, goals), ast: Math.max(0, ast) };
}

function rollTrophies(clubTier, age) {
  const t = CLUB_TIERS[clubTier - 1].trophies;
  const won = [];
  if (t.continental && chance(t.continental)) won.push({ icon: '🏆', label: t.continentalName, age });
  if (chance(t.league)) won.push({ icon: '🏆', label: 'League title', age });
  if (chance(t.cup)) won.push({ icon: '🥈', label: 'Domestic cup', age });
  return won;
}

function rollEvent(p) {
  const age = p.age;
  if (age >= 41) return { type: 'retire_forced' };
  if (age >= 32 && chance(0.1 + (age - 32) * 0.05)) {
    return { type: 'decision' };
  }
  const injuryChance = 0.06 + Math.max(0, age - 28) * 0.012;
  if (chance(injuryChance)) {
    return { type: 'injury', name: pick(INJURY_TYPES), severity: randInt(3, 10) };
  }
  const transferChance = p.club.tier > 1 ? 0.16 : 0.08;
  if (chance(transferChance)) {
    const currentTier = p.club.tier;
    const upgrade = p.ovr >= CLUB_TIERS[Math.max(0, currentTier - 2)].minOvr && currentTier > 1;
    const targetTierId = clamp(currentTier + (upgrade ? -1 : (chance(0.3) ? 1 : 0)), 1, 5);
    const tierData = CLUB_TIERS[targetTierId - 1];
    let clubName = pick(tierData.clubs);
    let tries = 0;
    while (clubName === p.club.name && tries < 5) { clubName = pick(tierData.clubs); tries += 1; }
    return { type: 'transfer', club: { name: clubName, tier: targetTierId } };
  }
  return null;
}

function finalizeSeason(row, opts = {}) {
  const p = game.player;
  const stats = computeSeasonStats(p.ovr, game.position, p.club.tier, opts.injurySeverity);
  row.apps = stats.apps;
  row.goals = stats.goals;
  row.ast = stats.ast;
  row.ovr = p.ovr;
  row.clubName = p.club.name;
  row.tier = p.club.tier;
  row.pending = false;

  const trophies = rollTrophies(p.club.tier, p.age);
  trophies.forEach((tr) => {
    p.trophies.push(tr);
    showToast(`${tr.icon} Won the ${tr.label}!`);
  });

  const callUpThreshold = 74;
  if (!p.intl.started && p.ovr >= callUpThreshold && chance(0.4)) {
    p.intl.started = true;
  }
  if (p.intl.started && chance(0.85)) {
    const intlStats = computeIntlStats(p.ovr, game.position);
    p.intl.apps += intlStats.apps;
    p.intl.goals += intlStats.goals;
    p.intl.ast += intlStats.ast;
  }

  const recoveryBonus = p.injuryRecoveryBonus;
  p.injuryRecoveryBonus = 0;
  p.ovr = progressOvr(p.ovr, p.age, p.potential, recoveryBonus);

  if (p.age >= 41 || (p.ovr <= 48 && p.age >= 30)) {
    p.retired = true;
  }
}

function advanceSeason() {
  const p = game.player;
  if (p.retired) return;
  p.age += 1;
  const row = { age: p.age, clubName: p.club.name, tier: p.club.tier, ovr: p.ovr, apps: null, goals: null, ast: null, pending: true };
  p.seasons.push(row);

  const event = rollEvent(p);
  if (event) {
    p.pendingEvent = event;
  } else {
    finalizeSeason(row);
  }
  renderCareerScreen();
}

function resolveEvent(action, data) {
  const p = game.player;
  const row = p.seasons[p.seasons.length - 1];
  const ev = p.pendingEvent;
  p.pendingEvent = null;

  if (ev.type === 'retire_forced') {
    p.seasons.pop();
    p.retired = true;
    renderCareerScreen();
    return;
  }

  if (ev.type === 'decision') {
    if (action === 'retire') {
      p.seasons.pop();
      p.retired = true;
      renderCareerScreen();
      return;
    }
    if (action === 'explore') {
      const tierData = CLUB_TIERS[clamp(p.club.tier, 1, 5) - 1];
      let clubName = pick(tierData.clubs);
      let tries = 0;
      while (clubName === p.club.name && tries < 5) { clubName = pick(tierData.clubs); tries += 1; }
      p.club = { name: clubName, tier: tierData.id };
      showToast(`Signed for ${clubName}`);
    }
    finalizeSeason(row);
    renderCareerScreen();
    return;
  }

  if (ev.type === 'injury') {
    p.injuryRecoveryBonus = Math.round(ev.severity * 0.6);
    finalizeSeason(row, { injurySeverity: ev.severity });
    renderCareerScreen();
    return;
  }

  if (ev.type === 'transfer') {
    if (action === 'accept') {
      p.club = ev.club;
      showToast(`Transferred to ${ev.club.name}`);
    }
    finalizeSeason(row);
    renderCareerScreen();
  }
}

// ---------------------------------------------------------------------------
// SCREEN 4 — Career
// ---------------------------------------------------------------------------
function renderIdentityCard() {
  const p = game.player;
  const badgeClass = p.ovr >= 80 ? 'ovr-b1' : p.ovr >= 70 ? 'ovr-b2' : 'ovr-b3';
  return `
    <div class="identity-card">
      <div class="ovr-badge ${badgeClass}">
        <div class="lbl">OVR</div>
        <div class="val">${p.ovr}</div>
      </div>
      <div class="identity-mid">
        <div class="identity-tags">
          <span class="tag">${game.country.flag} ${game.country.code.slice(0, 3).toUpperCase()}</span>
          <span class="tag">#${game.number} ${game.position}</span>
        </div>
        <div class="identity-club">${escapeHtml(p.club.name)}</div>
      </div>
      <div class="identity-right">
        AGE <span class="big">${p.age}</span><br/>
        VALUE <span class="big">${formatValue(computeValue(p.ovr, p.age))}</span>
      </div>
    </div>
  `;
}

function renderHistoryRow(row) {
  return `
    <div class="history-row">
      <span class="age-chip">${row.age}</span>
      <div class="club-cell">
        <span class="crest">${crestInitials(row.clubName)}</span>
        <span class="cname">${escapeHtml(row.clubName)}</span>
      </div>
      <span class="ovr-chip ${ovrChipClass(row.ovr)}">${row.ovr}</span>
      <span class="stat-cell">${row.pending ? '–' : row.apps}</span>
      <span class="stat-cell">${row.pending ? '–' : row.goals}</span>
      <span class="stat-cell">${row.pending ? '–' : row.ast}</span>
    </div>
  `;
}

function renderIntlRow() {
  const p = game.player;
  if (!p.intl.apps) return '';
  return `
    <div class="history-row intl">
      <span class="age-chip">${game.country.flag}</span>
      <div class="club-cell">
        <span class="crest">${game.country.flag}</span>
        <span class="cname">${escapeHtml(game.country.name)}</span>
      </div>
      <span class="ovr-chip"></span>
      <span class="stat-cell">${p.intl.apps}</span>
      <span class="stat-cell">${p.intl.goals}</span>
      <span class="stat-cell">${p.intl.ast}</span>
    </div>
  `;
}

function renderBottomAction() {
  const p = game.player;
  const ev = p.pendingEvent;

  if (ev) {
    if (ev.type === 'retire_forced') {
      return `
        <div class="panel">
          <h2>Time to hang up the boots</h2>
          <p>At ${p.age}, your body can't keep up with professional football anymore.</p>
          <button class="btn btn-primary btn-block" id="seeSummaryBtn">See career summary</button>
        </div>
      `;
    }
    if (ev.type === 'injury') {
      return `
        <div class="panel">
          <h2>${escapeHtml(ev.name)}</h2>
          <p>Your recovery will keep you out of rhythm during this period.</p>
          <div class="panel-image">🩼</div>
          <div class="penalty-strip" id="injuryBtn">
            <span>Start recovery</span><span>-${ev.severity} OVR</span>
          </div>
        </div>
      `;
    }
    if (ev.type === 'transfer') {
      return `
        <div class="panel">
          <h2>Transfer interest</h2>
          <p>${escapeHtml(ev.club.name)} (${CLUB_TIERS[ev.club.tier - 1].label}) want to sign you.</p>
          <div class="choice-list">
            <div class="choice-item" data-action="accept">
              <div><div class="ct">Join ${escapeHtml(ev.club.name)}</div><div class="cs">${CLUB_TIERS[ev.club.tier - 1].label} · ${formatValue(computeValue(p.ovr, p.age) * 1.2)}</div></div>
              <div>✅</div>
            </div>
            <div class="choice-item" data-action="decline">
              <div><div class="ct">Stay at ${escapeHtml(p.club.name)}</div><div class="cs">Continue your current spell</div></div>
              <div>🛡️</div>
            </div>
          </div>
        </div>
      `;
    }
    if (ev.type === 'decision') {
      return `
        <div class="panel">
          <h2>Career decision</h2>
          <p>You're ${p.age} now. What's next for your career?</p>
          <div class="choice-list">
            <div class="choice-item" data-action="stay">
              <div><div class="ct">Sign a new contract</div><div class="cs">Stay at ${escapeHtml(p.club.name)}</div></div><div>📝</div>
            </div>
            <div class="choice-item" data-action="explore">
              <div><div class="ct">Search for a new challenge</div><div class="cs">Look for a different club</div></div><div>🔎</div>
            </div>
            <div class="choice-item" data-action="retire">
              <div><div class="ct">Retire from professional football</div><div class="cs">End your career now</div></div><div>🏁</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  if (p.retired) {
    const totals = careerTotals();
    return `
      <div class="panel end-panel">
        <h2>Your career has come to an end</h2>
        <div class="stat-grid">
          <div><div class="sv">${totals.apps}</div><div class="sl">Apps</div></div>
          <div><div class="sv">${totals.goals}</div><div class="sl">Goals</div></div>
          <div><div class="sv">${totals.ast}</div><div class="sl">Ast</div></div>
          <div><div class="sv">${p.trophies.length}</div><div class="sl">Trophies</div></div>
        </div>
        <div class="trophy-row">${p.trophies.length ? p.trophies.map((t) => t.icon).join(' ') : '<span class="empty">No silverware this career</span>'}</div>
        <div class="btn-row">
          <button class="btn btn-secondary" id="viewSummaryBtn">View summary</button>
          <button class="btn btn-accent" id="playAgainBtn">Play again</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="btn-row" style="margin-top:0;">
      <button class="btn btn-primary btn-block" id="simulateBtn">Simulate season</button>
    </div>
  `;
}

function careerTotals() {
  const p = game.player;
  const club = p.seasons.reduce((acc, s) => ({
    apps: acc.apps + (s.apps || 0), goals: acc.goals + (s.goals || 0), ast: acc.ast + (s.ast || 0),
  }), { apps: 0, goals: 0, ast: 0 });
  return {
    apps: club.apps + p.intl.apps,
    goals: club.goals + p.intl.goals,
    ast: club.ast + p.intl.ast,
    clubApps: club.apps, clubGoals: club.goals, clubAst: club.ast,
  };
}

function renderCareerScreen() {
  game.screen = 'career';
  setProgress(100);
  const p = game.player;
  screenRoot.innerHTML = `
    <div class="screen">
      ${renderIdentityCard()}
      <div class="history-wrap">
        <div class="history-head"><span>Age</span><span>Club</span><span>Ovr</span><span>Ap</span><span>G</span><span>A</span></div>
        <div class="history-body" id="historyBody">
          ${p.seasons.map(renderHistoryRow).join('')}
          ${renderIntlRow()}
        </div>
      </div>
      <div id="bottomAction">${renderBottomAction()}</div>
    </div>
  `;

  const historyBody = document.getElementById('historyBody');
  historyBody.scrollTop = historyBody.scrollHeight;

  const simulateBtn = document.getElementById('simulateBtn');
  if (simulateBtn) simulateBtn.addEventListener('click', advanceSeason);

  const injuryBtn = document.getElementById('injuryBtn');
  if (injuryBtn) injuryBtn.addEventListener('click', () => resolveEvent('start'));

  const seeSummaryBtn = document.getElementById('seeSummaryBtn');
  if (seeSummaryBtn) seeSummaryBtn.addEventListener('click', () => resolveEvent('ack'));

  document.querySelectorAll('.choice-item').forEach((item) => {
    item.addEventListener('click', () => resolveEvent(item.dataset.action));
  });

  const viewSummaryBtn = document.getElementById('viewSummaryBtn');
  if (viewSummaryBtn) viewSummaryBtn.addEventListener('click', openSummaryModal);

  const playAgainBtn = document.getElementById('playAgainBtn');
  if (playAgainBtn) playAgainBtn.addEventListener('click', resetGame);
}

// ---------------------------------------------------------------------------
// Summary modal
// ---------------------------------------------------------------------------
function openSummaryModal() {
  const p = game.player;
  const totals = careerTotals();
  const peak = p.seasons.reduce((best, s) => (s.ovr > best.ovr ? s : best), p.seasons[0] || { ovr: p.ovr, age: p.age });
  const bestScoring = p.seasons.reduce((best, s) => ((s.goals || 0) > (best.goals || 0) ? s : best), p.seasons[0] || { goals: 0, age: p.age });
  const clubsPlayed = new Set(p.seasons.map((s) => s.clubName)).size;

  modalRoot.innerHTML = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-sheet">
        <h2>Career summary</h2>
        <div class="summary-line"><span class="l">Seasons played</span><span class="v">${p.seasons.length}</span></div>
        <div class="summary-line"><span class="l">Clubs represented</span><span class="v">${clubsPlayed}</span></div>
        <div class="summary-line"><span class="l">Peak rating</span><span class="v">${peak.ovr} OVR (age ${peak.age})</span></div>
        <div class="summary-line"><span class="l">Best scoring season</span><span class="v">${bestScoring.goals || 0} goals (age ${bestScoring.age})</span></div>
        <div class="summary-line"><span class="l">Club appearances</span><span class="v">${totals.clubApps}</span></div>
        <div class="summary-line"><span class="l">${escapeHtml(game.country.name)} caps</span><span class="v">${p.intl.apps} (${p.intl.goals}g, ${p.intl.ast}a)</span></div>
        <h2 style="margin-top:18px;">Trophies (${p.trophies.length})</h2>
        ${p.trophies.length ? p.trophies.map((t) => `
          <div class="trophy-list-item"><span>${t.icon}</span><span>${escapeHtml(t.label)} — age ${t.age}</span></div>
        `).join('') : '<p>No silverware this career.</p>'}
        <button class="btn btn-primary btn-block" id="closeSummary" style="margin-top:16px;">Close</button>
      </div>
    </div>
  `;
  document.getElementById('closeSummary').addEventListener('click', closeSummaryModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') closeSummaryModal();
  });
}

function closeSummaryModal() {
  modalRoot.innerHTML = '';
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
renderCountryScreen();
