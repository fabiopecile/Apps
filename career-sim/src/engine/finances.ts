import type { Player } from '../types';

export function weeklyIncome(player: Player): number {
  const wage = player.weeklyWage;
  const sponsorIncome = player.sponsors.reduce((s, sp) => s + sp.weeklyIncome, 0);
  const investmentIncome = player.investments.reduce(
    (s, inv) => s + inv.weeklyReturn,
    0,
  );
  return wage + sponsorIncome + investmentIncome;
}

export function weeklyExpenses(player: Player): number {
  // Lifestyle upkeep scales gently with number of owned high-tier assets.
  const upkeep = player.assets.reduce((s, a) => s + a.value * 0.0004, 0);
  return Math.round(upkeep);
}
