// Penalty shootout engine: real shootout rules, aiming/power mechanics, AI keeper & AI shooter.
import { getLeague, applyLeagueResult, applyCupResult, SKIN_TONES, COSMETICS } from './state.js';
import { renderCharacter, setPose } from './character.js';

const ZONES = [
  { x: 20, y: 25, key: 'TL' }, { x: 50, y: 18, key: 'TC' }, { x: 80, y: 25, key: 'TR' },
  { x: 20, y: 80, key: 'BL' }, { x: 50, y: 86, key: 'BC' }, { x: 80, y: 80, key: 'BR' },
];

function rand(min, max) { return Math.random() * (max - min) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function randomOpponentProfile() {
  const pickCat = (cat) => pick(COSMETICS[cat]).id;
  return {
    skinTone: Math.floor(rand(0, SKIN_TONES.length)),
    equipped: {
      hair: pickCat('hair'), jersey: pickCat('jersey'), shorts: pickCat('shorts'),
      boots: pickCat('boots'), gloves: pickCat('gloves'), ball: pickCat('ball'),
      celebration: pickCat('celebration'),
    },
  };
}

export function canOutcomeChange(youScore, oppScore, youTaken, oppTaken, totalRounds) {
  const youRemaining = Math.max(0, totalRounds - youTaken);
  const oppRemaining = Math.max(0, totalRounds - oppTaken);
  const youMax = youScore + youRemaining;
  const oppMax = oppScore + oppRemaining;
  return !(youScore > oppMax || oppScore > youMax);
}

export class Match {
  constructor(app, mode) {
    this.app = app;
    this.mode = mode; // 'league' | 'cup'
    this.profile = app.profile;
    this.leagueIndex = mode === 'cup'
      ? Math.min(app.profile.leagueIndex + 1 + app.profile.cup.currentRun, 9)
      : app.profile.leagueIndex;
    this.league = getLeague(this.leagueIndex);
    this.youScore = 0;
    this.oppScore = 0;
    this.youKicks = [];
    this.oppKicks = [];
    this.round = 0;
    this.suddenDeath = false;
    this.firstShooter = Math.random() < 0.5 ? 'you' : 'opp';
    this.oppProfile = randomOpponentProfile();
    this.el = {
      pitch: document.getElementById('pitch'),
      keeper: document.getElementById('keeper'),
      playerRig: document.getElementById('playerRig'),
      ball: document.getElementById('ball'),
      goal: document.getElementById('goal'),
      aimOverlay: document.getElementById('aimOverlay'),
      aimCursor: document.getElementById('aimCursor'),
      powerWrap: document.getElementById('powerMeterWrap'),
      powerFill: document.getElementById('powerFill'),
      turnIndicator: document.getElementById('turnIndicator'),
      resultFlash: document.getElementById('resultFlash'),
      scoreYou: document.getElementById('scoreYou'),
      scoreOpp: document.getElementById('scoreOpp'),
      defendZones: document.getElementById('defendZones'),
      tellIndicator: document.getElementById('tellIndicator'),
      confetti: document.getElementById('confettiLayer'),
      matchCharSvg: document.getElementById('matchCharacterSvg'),
    };
    this.youSvg = this.el.matchCharSvg;
    this.oppSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.oppSvg.setAttribute('viewBox', '0 0 200 260');
    this.oppSvg.setAttribute('class', 'char-svg match-char');
    this._buildDefendZones();
  }

  _buildDefendZones() {
    this.el.defendZones.innerHTML = '';
    ZONES.forEach((z) => {
      const b = document.createElement('button');
      b.className = 'defend-zone';
      b.style.left = z.x + '%';
      b.style.top = z.y + '%';
      b.dataset.x = z.x;
      b.dataset.y = z.y;
      this.el.defendZones.appendChild(b);
    });
  }

  renderScores() {
    const build = (kicks) => kicks.map((k) =>
      `<span class="kdot ${k === true ? 'hit' : k === false ? 'miss' : 'pending'}"></span>`
    ).join('');
    this.el.scoreYou.innerHTML = `<div class="score-num">${this.youScore}</div><div class="kdots">${build(this.youKicks)}</div>`;
    this.el.scoreOpp.innerHTML = `<div class="score-num">${this.oppScore}</div><div class="kdots">${build(this.oppKicks)}</div>`;
  }

  positionActors(shooterSide) {
    if (shooterSide === 'you') {
      renderCharacter(this.youSvg, this.profile, { goalkeeper: false });
      renderCharacter(this.oppSvg, this.oppProfile, { goalkeeper: true });
      this.el.playerRig.innerHTML = ''; this.el.playerRig.appendChild(this.youSvg);
      this.el.keeper.querySelectorAll('svg').forEach((s) => s.remove());
      this.el.keeper.appendChild(this.oppSvg);
      setPose(this.youSvg, 'idle');
      setPose(this.oppSvg, 'idle');
    } else {
      renderCharacter(this.oppSvg, this.oppProfile, { goalkeeper: false });
      renderCharacter(this.youSvg, this.profile, { goalkeeper: true });
      this.el.playerRig.innerHTML = ''; this.el.playerRig.appendChild(this.oppSvg);
      this.el.keeper.querySelectorAll('svg').forEach((s) => s.remove());
      this.el.keeper.appendChild(this.youSvg);
      setPose(this.oppSvg, 'idle');
      setPose(this.youSvg, 'idle');
    }
  }

  goalToPitchPoint(px, py) {
    const goalRect = this.el.goal.getBoundingClientRect();
    const pitchRect = this.el.pitch.getBoundingClientRect();
    return {
      left: goalRect.left - pitchRect.left + (px / 100) * goalRect.width,
      top: goalRect.top - pitchRect.top + (py / 100) * goalRect.height,
    };
  }

  resetBall() {
    const pitchRect = this.el.pitch.getBoundingClientRect();
    this.el.ball.style.transition = 'none';
    this.el.ball.style.left = pitchRect.width / 2 - 8 + 'px';
    this.el.ball.style.top = pitchRect.height - 78 + 'px';
    this.el.ball.style.transform = 'scale(1) rotate(0deg)';
    this.el.ball.style.opacity = '1';
    void this.el.ball.offsetWidth;
  }

  async waitForAimAndPower() {
    return new Promise((resolve) => {
      this.el.aimOverlay.classList.add('active');
      this.el.powerWrap.classList.remove('active');
      let target = null;
      let power = 0;
      let running = false;
      let raf;
      const startPower = () => {
        running = true;
        this.el.powerWrap.classList.add('active');
        const t0 = performance.now();
        const loop = (t) => {
          const v = (Math.sin((t - t0) / 420) + 1) / 2 * 100;
          power = v;
          this.el.powerFill.style.width = v + '%';
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      };
      const onAim = (e) => {
        const rect = this.el.aimOverlay.getBoundingClientRect();
        const cx = (e.clientX !== undefined ? e.clientX : e.touches[0].clientX) - rect.left;
        const cy = (e.clientY !== undefined ? e.clientY : e.touches[0].clientY) - rect.top;
        const px = clamp((cx / rect.width) * 100, 3, 97);
        const py = clamp((cy / rect.height) * 100, 6, 96);
        target = { x: px, y: py };
        this.el.aimCursor.style.left = px + '%';
        this.el.aimCursor.style.top = py + '%';
        this.el.aimCursor.classList.add('show');
        if (!running) startPower();
      };
      const onLock = () => {
        if (!target) return;
        cancelAnimationFrame(raf);
        this.el.aimOverlay.removeEventListener('click', onAim);
        this.el.powerWrap.removeEventListener('click', onLock);
        this.el.aimOverlay.classList.remove('active');
        this.el.powerWrap.classList.remove('active');
        this.el.aimCursor.classList.remove('show');
        resolve({ tx: target.x, ty: target.y, power });
      };
      this.el.aimOverlay.addEventListener('click', onAim);
      this.el.powerWrap.addEventListener('click', onLock);
    });
  }

  async waitForDefend(aiTarget) {
    return new Promise((resolve) => {
      const zones = Array.from(this.el.defendZones.querySelectorAll('.defend-zone'));
      this.el.defendZones.classList.add('active');
      let done = false;
      const tellDelay = 250;
      const tellDuration = Math.max(70, 480 - this.leagueIndex * 42);
      const reactWindow = Math.max(480, 1150 - this.leagueIndex * 70);
      setTimeout(() => {
        if (done) return;
        this.el.tellIndicator.style.left = aiTarget.x + '%';
        this.el.tellIndicator.style.top = aiTarget.y + '%';
        this.el.tellIndicator.classList.add('show');
        setTimeout(() => this.el.tellIndicator.classList.remove('show'), tellDuration);
      }, tellDelay);

      const finish = (pt) => {
        if (done) return;
        done = true;
        zones.forEach((z) => z.removeEventListener('click', onClick));
        this.el.defendZones.classList.remove('active');
        clearTimeout(timer);
        resolve(pt);
      };
      const onClick = (e) => {
        finish({ x: parseFloat(e.currentTarget.dataset.x), y: parseFloat(e.currentTarget.dataset.y) });
      };
      zones.forEach((z) => z.addEventListener('click', onClick));
      const timer = setTimeout(() => finish({ x: 50, y: 55, missed: true }), reactWindow);
    });
  }

  showResult(text, cls) {
    this.el.resultFlash.textContent = text;
    this.el.resultFlash.className = 'result-flash show ' + cls;
    setTimeout(() => { this.el.resultFlash.className = 'result-flash'; }, 900);
  }

  burstConfetti() {
    const colors = ['#2f7dff', '#ffd166', '#ff3b4e', '#39ffb0', '#ffffff'];
    for (let i = 0; i < 40; i++) {
      const d = document.createElement('div');
      d.className = 'confetti-piece';
      d.style.left = rand(10, 90) + '%';
      d.style.background = pick(colors);
      d.style.animationDelay = rand(0, 0.3) + 's';
      d.style.animationDuration = rand(0.9, 1.6) + 's';
      this.el.confetti.appendChild(d);
      setTimeout(() => d.remove(), 2000);
    }
  }

  async animateBallTo(px, py, fromKeeperSpot) {
    const dest = this.goalToPitchPoint(px, py);
    this.el.ball.style.transition = 'left .48s cubic-bezier(.2,.7,.25,1), top .48s cubic-bezier(.2,.7,.25,1), transform .48s ease-out';
    this.el.ball.style.left = dest.left - 8 + 'px';
    this.el.ball.style.top = dest.top - 8 + 'px';
    this.el.ball.style.transform = `scale(${fromKeeperSpot ? 0.7 : 0.55}) rotate(720deg)`;
    await new Promise((r) => setTimeout(r, 480));
  }

  async takeKick(shooterSide) {
    this.positionActors(shooterSide);
    this.resetBall();
    this.el.turnIndicator.textContent = shooterSide === 'you' ? 'Du schießt' : 'Du hältst';
    this.el.turnIndicator.className = 'turn-indicator ' + (shooterSide === 'you' ? 'you' : 'opp');
    await new Promise((r) => setTimeout(r, 500));

    let target, keeperLanding, isPlayerReacting = false;

    if (shooterSide === 'you') {
      const aim = await this.waitForAimAndPower();
      target = { x: aim.tx, y: aim.ty };
      setPose(this.youSvg, 'kick');
      const skillRoll = Math.random() < this.league.keeperSkill;
      const zone = pick(ZONES);
      keeperLanding = skillRoll ? { x: target.x, y: target.y } : { x: zone.x, y: zone.y };
      const diveClass = keeperLanding.x < 40 ? 'dive-l' : keeperLanding.x > 60 ? 'dive-r' : 'dive-c';
      setTimeout(() => setPose(this.oppSvg, diveClass), 90);
      await this.animateBallTo(target.x, target.y, false);
      const reach = this.league.keeperReach + (aim.power > 85 ? 2 : 0);
      const saved = dist(target, keeperLanding) <= reach;
      const nearEdge = target.x < 12 || target.x > 88 || target.y < 10;
      const postMiss = !saved && nearEdge && Math.random() < (0.10 + aim.power / 500);
      this.resolveKick('you', !saved && !postMiss, postMiss);
    } else {
      const zone = pick(ZONES);
      const accuracy = this.league.keeperSkill;
      target = Math.random() < accuracy
        ? { x: clamp(zone.x + rand(-4, 4), 6, 94), y: clamp(zone.y + rand(-4, 4), 8, 92) }
        : { x: rand(15, 85), y: rand(15, 85) };
      const defend = await this.waitForDefend(target);
      setPose(this.oppSvg, 'kick');
      const diveClass = defend.x < 40 ? 'dive-l' : defend.x > 60 ? 'dive-r' : 'dive-c';
      setPose(this.youSvg, diveClass);
      await this.animateBallTo(target.x, target.y, false);
      const reach = defend.missed ? 13 : 25;
      const saved = dist(target, defend) <= reach;
      const nearEdge = target.x < 12 || target.x > 88 || target.y < 10;
      const postMiss = !saved && nearEdge && Math.random() < 0.12;
      this.resolveKick('opp', !saved && !postMiss, postMiss);
    }
    await new Promise((r) => setTimeout(r, 950));
  }

  resolveKick(side, goal, post) {
    if (side === 'you') {
      this.youKicks.push(goal);
      if (goal) {
        this.youScore++;
        setPose(this.youSvg, celebPose(this.profile.equipped.celebration));
        setPose(this.oppSvg, 'sad');
        this.showResult('TOR!', 'goal');
        this.burstConfetti();
      } else {
        setPose(this.youSvg, 'sad');
        setPose(this.oppSvg, 'cheer');
        this.showResult(post ? 'PFOSTEN!' : 'GEHALTEN!', 'miss');
      }
    } else {
      this.oppKicks.push(goal);
      if (goal) {
        this.oppScore++;
        setPose(this.oppSvg, 'cheer');
        setPose(this.youSvg, 'sad');
        this.showResult('GEGENTOR', 'goal-opp');
      } else {
        setPose(this.youSvg, 'cheer');
        setPose(this.oppSvg, 'sad');
        this.showResult(post ? 'PFOSTEN!' : 'GEHALTEN!', 'miss');
        this.burstConfetti();
      }
    }
    this.renderScores();
  }

  async run() {
    this.renderScores();
    const order = [];
    for (let i = 0; i < 5; i++) {
      order.push(this.firstShooter);
      order.push(this.firstShooter === 'you' ? 'opp' : 'you');
    }
    let idx = 0;
    while (idx < order.length) {
      const side = order[idx];
      await this.takeKick(side);
      idx++;
      const youTaken = this.youKicks.length, oppTaken = this.oppKicks.length;
      if (youTaken === oppTaken || idx === order.length) {
        if (!canOutcomeChange(this.youScore, this.oppScore, youTaken, oppTaken, 5)) break;
        if (youTaken === 5 && oppTaken === 5 && this.youScore === this.oppScore) {
          await this.runSuddenDeath();
          break;
        }
      }
    }
    return this.finish();
  }

  async runSuddenDeath() {
    this.suddenDeath = true;
    while (true) {
      const startYou = this.youScore, startOpp = this.oppScore;
      const first = Math.random() < 0.5 ? 'you' : 'opp';
      await this.takeKick(first);
      await this.takeKick(first === 'you' ? 'opp' : 'you');
      if (this.youScore !== this.oppScore) break;
    }
  }

  finish() {
    const won = this.youScore > this.oppScore;
    let progress;
    if (this.mode === 'league') {
      progress = applyLeagueResult(this.profile, won);
    } else {
      applyCupResult(this.profile, won);
      progress = { coinsEarned: won ? 60 + this.leagueIndex * 15 : 15 };
    }
    return { won, youScore: this.youScore, oppScore: this.oppScore, progress, mode: this.mode };
  }
}

function celebPose(id) {
  switch (id) {
    case 'cel_slide': return 'slide';
    case 'cel_point': return 'cheer';
    case 'cel_spin': return 'spin';
    case 'cel_fireworks': return 'fireworks';
    default: return 'cheer';
  }
}

export async function playMatch(app, mode) {
  const match = new Match(app, mode);
  app.showView('match');
  const result = await match.run();
  return result;
}
