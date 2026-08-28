import { loadProfile, saveProfile, getLeague, maybeResetCupCycle, isCupUnlocked } from './state.js';
import { renderHome, renderCharacterView, renderLeagueView, renderCupView, renderStatsView } from './views.js';
import { playMatch } from './match.js';

class App {
  constructor() {
    this.profile = loadProfile();
    maybeResetCupCycle(this.profile);
    this.stack = ['home'];
    this._cupTimer = null;
    this.bindNav();
    this.updateCoins();
    this.showView('home');
  }

  onProfileChange() {
    saveProfile(this.profile);
    this.updateCoins();
  }

  updateCoins() {
    document.getElementById('coinAmount').textContent = this.profile.coins;
  }

  showView(name, push = true) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.getElementById('view-' + name).classList.add('active');
    if (push) {
      if (this.stack[this.stack.length - 1] !== name) this.stack.push(name);
    }
    document.getElementById('backBtn').style.visibility = (name === 'home') ? 'hidden' : 'visible';
    this.render(name);
  }

  goBack() {
    if (this.stack.length > 1) {
      this.stack.pop();
      const prev = this.stack[this.stack.length - 1];
      this.showView(prev, false);
    } else {
      this.showView('home', false);
    }
  }

  render(name) {
    this.updateCoins();
    if (name === 'home') renderHome(this);
    else if (name === 'character') renderCharacterView(this);
    else if (name === 'league') renderLeagueView(this);
    else if (name === 'cup') renderCupView(this);
    else if (name === 'stats') renderStatsView(this);
  }

  bindNav() {
    document.getElementById('backBtn').addEventListener('click', () => this.goBack());
    document.getElementById('goCharacter').addEventListener('click', () => this.showView('character'));
    document.getElementById('goShop').addEventListener('click', () => this.showView('character'));
    document.getElementById('goLeague').addEventListener('click', () => this.showView('league'));
    document.getElementById('goCup').addEventListener('click', () => this.showView('cup'));
    document.getElementById('goStats').addEventListener('click', () => this.showView('stats'));
    document.getElementById('playLeagueBtn').addEventListener('click', () => this.startMatch('league'));
    document.getElementById('playFromLeagueBtn').addEventListener('click', () => this.startMatch('league'));
    document.getElementById('playCupBtn').addEventListener('click', () => {
      if (isCupUnlocked(this.profile)) this.startMatch('cup');
    });
    document.getElementById('matchendContinue').addEventListener('click', () => {
      this.stack = ['home'];
      this.showView('home', false);
    });
  }

  async startMatch(mode) {
    this.stack.push('match');
    const result = await playMatch(this, mode);
    this.showMatchEnd(result);
  }

  showMatchEnd(result) {
    const { won, youScore, oppScore, progress, mode } = result;
    document.getElementById('matchendResult').textContent = won ? 'SIEG!' : 'NIEDERLAGE';
    document.getElementById('matchendResult').className = 'matchend-result ' + (won ? 'win' : 'lose');
    document.getElementById('matchendScore').textContent = `${youScore} : ${oppScore}`;
    document.getElementById('matchendRewards').innerHTML = `<span class="coin-icon">●</span> +${progress.coinsEarned} Münzen`;

    let leagueMsg = '';
    if (mode === 'league') {
      const league = getLeague(this.profile.leagueIndex);
      if (progress.promoted) leagueMsg = `🏆 Aufstieg in ${league.name}!`;
      else if (progress.relegated) leagueMsg = `⬇️ Abstieg in ${league.name}`;
      else leagueMsg = `${league.name} · ${this.profile.leaguePoints}/${league.threshold} Punkte`;
    } else {
      leagueMsg = won
        ? `Weekend Cup Lauf: ${this.profile.cup.currentRun} Siege in Folge`
        : `Lauf beendet · Bester Lauf: ${this.profile.cup.bestRun}`;
    }
    document.getElementById('matchendLeague').textContent = leagueMsg;
    this.stack = ['home', 'matchend'];
    this.showView('matchend', false);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
